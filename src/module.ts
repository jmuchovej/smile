// biome-ignore assist/source/organizeImports: Must be first to ensure zod extensions are loaded
import "./database/zod";
import {
  addVitePlugin,
  createResolver,
  defineNuxtModule,
  addRouteMiddleware,
  addComponentsDir,
  addImportsDir,
  addServerPlugin,
  useNuxt,
  addLayout,
} from "@nuxt/kit";

import { defu } from "defu";
import type { Nuxt } from "nuxt/schema";
import { loadSmileConfig } from "./config";
import {
  generateInternalRoutes,
  generateExperimentRoutes,
  mkNitroRoute,
} from "./router";
import { createSmileBuildConfig, type SmileBuildConfig } from "./types/build-config";
import { useLogger } from "./runtime/internal";
import { registerModule } from "./utils";
import { SmileTemplates } from "./templates";
import { getValidatedTable } from "./database/zod";
import {
  blockSchema,
  participantSchema,
  sessionSchema,
  trialSchema,
} from "./database/schemas";
import type { SmileTable } from "./database/types";
import type { NitroConfig } from "nitropack";
import { basename, join, parse, relative } from "pathe";
import { existsSync } from "node:fs";
import { glob } from "tinyglobby";
import { kebabCase } from "scule";

export type * from "./config";
export {
  defineExperiment,
  defineSmileConfig,
  defineStimuli,
} from "./config";

export * from "./types";

// biome-ignore lint/suspicious/noEmptyInterface: currently there aren't any Smile-specific options, but kept here for posterity
export interface SmileModuleOptions {}

export default defineNuxtModule<SmileModuleOptions>({
  meta: {
    name: "smilelab",
    configKey: "smile",
    compatibility: {
      nuxt: ">=4.0.1",
    },
    docs: "https://smile.gureckislab.org/getting-started/",
  },
  defaults: {},
  async setup(_options: SmileModuleOptions, nuxt: Nuxt) {
    const logger = useLogger("module");
    const resolver = createResolver(import.meta.url);
    const { resolve, resolvePath } = resolver;
    nuxt.options.alias["#smile"] = resolve("./runtime");

    nuxt.options.pages = nuxt.options.pages || {};
    nuxt.options.pages = true;

    nuxt.options.ssr = false;

    nuxt.options.router = defu(nuxt.options.router || {}, {
      options: { hashMode: true },
    });
    nuxt.options.router.options.hashMode = true;

    await registerModule(nuxt, "@nuxt/icon", "icon", {
      cssLayer: "components",
    });
    await registerModule(nuxt, "@nuxtjs/mdc", "mdc", {});

    if (nuxt.options.builder === "@nuxt/vite-builder") {
      const tailwindcss = (await import("@tailwindcss/vite")).default;
      addVitePlugin(tailwindcss());
    } else {
      nuxt.options.postcss.plugins["@tailwindcss/postcss"] = {};
    }

    await registerModule(nuxt, "shadcn-nuxt", "shadcn", {
      prefix: "UI",
      componentDir: resolve("runtime", "components", "uikit"),
    });

    nuxt.options.nitro = defu(nuxt.options.nitro, {
      experimental: {
        database: true,
      },
      sessionConfig: {
        name: "smile-session",
        password:
          process.env.SMILE_SESSION_SECRET ||
          "smile-session-secret-at-least-32-characters-long",
        cookie: {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        },
      },
    });
    nuxt.options.appConfig = defu(nuxt.options.appConfig, { smile: {} });
    nuxt.options.runtimeConfig = defu(nuxt.options.runtimeConfig, {
      smile: {},
      public: {
        smile: {},
      },
    });

    logger.debug(`Loading \`smile.config.ts\`...`);
    const { activeExperiment, experiments } = await loadSmileConfig(nuxt);
    const versions = Object.keys(experiments) as string[];
    logger.debug(`Loaded ${versions.length} experiments.`);

    nuxt.options.appConfig.smile = defu(nuxt.options.appConfig.smile, {
      activeExperiment,
      availableExperiments: versions,
    });

    nuxt.options.runtimeConfig.smile = defu(nuxt.options.runtimeConfig.smile, {
      activeExperiment,
      experiments,
      session: {
        secret:
          process.env.SMILE_SESSION_SECRET ||
          "smile-session-secret-at-least-32-characters-long",
      },
    });

    const buildConfig = createSmileBuildConfig(experiments, resolver);

    await devtools(buildConfig);
    initializeDatabase(buildConfig);
    initializeMDXProcessor(buildConfig);
    await generateInternalRoutes(buildConfig);
    await generateExperimentRoutes(buildConfig);
    // const timelines = await initializeTimelines(buildConfig);

    addRouteMiddleware({
      name: "smile-timeline",
      path: resolve("./runtime/middleware/timeline"),
      global: true,
    });

    addComponentsDir({
      path: resolve("./runtime/app/components"),
      prefix: "Smile",
      pathPrefix: false,
      watch: true,
    });

    addImportsDir(resolve("./runtime/app/composables"));

    const layoutBasePath = resolve("./runtime/app/layouts");
    const templatePaths: string[] = [];
    const layouts = await glob(["**/*.vue"], {
      dot: false,
      onlyFiles: true,
      absolute: true,
      ignore: ["**/*.DS_Store"],
      cwd: layoutBasePath,
    });
    for (const layout of layouts) {
      const { name } = parse(layout);
      const filename = join("smile/layouts", layout.replace(layoutBasePath, ""));
      addLayout(
        {
          src: layout,
          filename,
          write: true,
        },
        `smile-${kebabCase(basename(name))}`
      );
      templatePaths.push(filename);
    }

    nuxt.options.alias["#smile:components"] =
      SmileTemplates.mdxComponents(buildConfig).dst;

    // Check if user has defined app.vue, if not create one with SmileLayout
    nuxt.hook("app:resolve", async (app) => {
      const userAppPath = resolve(join(nuxt.options.srcDir, "app.vue"));

      if (!existsSync(userAppPath)) {
        // User hasn't defined app.vue, create one for them
        logger.info("No app.vue found, creating one with SmileLayout wrapper");
        const appTemplate = SmileTemplates.appVue(buildConfig);
        app.mainComponent = appTemplate.dst;
      } else {
        // User has app.vue, remind them to use SmileLayout
        logger.info(
          "User app.vue detected. Ensure it includes <SmileLayout> wrapper for full functionality"
        );
      }
    });
  },
});

function initializeDatabase(config: SmileBuildConfig) {
  const logger = useLogger("database");

  const nuxt = useNuxt();
  const {
    resolver: { resolve },
    experiments,
  } = config;

  nuxt.options.alias["#smile/database"] = SmileTemplates.database(config).dst;

  const tables: Record<string, SmileTable> = {
    participants: getValidatedTable(`participants`, participantSchema),
    sessions: getValidatedTable(`sessions`, sessionSchema),
    blocks: getValidatedTable(`blocks`, blockSchema),
    trials: getValidatedTable(`trials`, trialSchema),
  };
  logger.debug(`Added all of Smile's "meta" tables!`);

  for (const experiment of Object.values(experiments)) {
    tables[experiment.tableName] = getValidatedTable(
      experiment.tableName,
      experiment.schema
    );
    logger.debug(`Adding the ${experiment.tableName} table!`);
    const { stimuli } = experiment;
    tables[stimuli.tableName] = getValidatedTable(stimuli.tableName, stimuli.schema);
    logger.debug(`Adding the ${stimuli.tableName} table!`);
  }

  SmileTemplates.drizzleConfig(config);
  nuxt.options.alias["#smile:db/schema"] = SmileTemplates.schema(config, tables).dst;

  SmileTemplates.sqlTables(config, tables);
  nuxt.options.alias["#smile:sql/tables"] = SmileTemplates.tsTables(config, tables).dst;
  nuxt.options.alias["#smile:sql/seed"] = SmileTemplates.tsSeed(config, tables).dst;

  addServerPlugin(resolve("./runtime/server/plugins/database.ts"));
}

function initializeMDXProcessor(config: SmileBuildConfig) {
  const nuxt = useNuxt();
  const {
    resolver: { resolve },
    paths: { sandbox },
  } = config;

  nuxt.hook("nitro:config", (nitroConfig: NitroConfig) => {
    nitroConfig.storage = nitroConfig.storage || {};
    nitroConfig.storage["smile:mdx"] = {
      driver: "fs",
      base: join(sandbox, "mdx"),
    };
  });

  addServerPlugin(resolve("./runtime/server/plugins/mdx.ts"));
}

async function devtools(config: SmileBuildConfig) {
  const logger = useLogger("devtools");
  const nuxt = useNuxt();

  // Only enable in development mode
  if (!nuxt.options.dev) {
    return;
  }

  const {
    resolver: { resolve },
  } = config;
  const base = resolve("../src");

  // Use Nuxt's built-in file watching system
  nuxt.hook("builder:watch", async (event, path) => {
    // Only process files within our module
    if (!path.startsWith(base)) {
      return;
    }

    if (!["add", "change"].includes(event)) {
      return;
    }

    const relpath = relative(base, path);

    // Handle different file events
    logger.debug(`File ${event}: ${relpath}`);

    // Handle API route additions
    if (event === "add" && path.includes("runtime/server/api/")) {
      mkNitroRoute(base, path);
      return;
    }

    // Check if we need to restart for critical changes
    const needsRestart = [
      "database/",
      "config/",
      "utils/",
      "module.ts",
      "types/",
      "templates/",
    ];

    const shouldRestart = needsRestart.some((p) => relpath.includes(p));

    if (shouldRestart) {
      logger.info(`Module source changed (${relpath}), restarting...`);
      await nuxt.callHook("restart");
    }
  });

  // Alternative approach: Add watch patterns to Vite
  nuxt.hook("vite:extendConfig", (config) => {
    if (!nuxt.options.dev) return;

    config.server = config.server || {};
    config.server.watch = config.server.watch || {};

    // Ensure module files trigger HMR by not ignoring our resolved paths
    const ignoredPatterns = Array.isArray(config.server.watch.ignored)
      ? config.server.watch.ignored
      : [];

    // Add negation pattern for `smile`
    // The "!" prefix means "don't ignore these paths"
    config.server.watch.ignored = [
      ...ignoredPatterns,
      `!${base}/**`, // Don't ignore module files
    ];
  });

  logger.success("Development file watching initialized");
}
