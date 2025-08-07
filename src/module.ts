// biome-ignore assist/source/organizeImports: Must be first to ensure zod extensions are loaded
import "./database/zod";
import {
  addComponentsDir,
  addImportsDir,
  addRouteMiddleware,
  addServerPlugin,
  createResolver,
  defineNuxtModule,
} from "@nuxt/kit";
import { defu } from "defu";
import type { Nuxt } from "nuxt/schema";
import { loadSmileConfig } from "./config";
import {
  blockSchema,
  participantSchema,
  sessionSchema,
  trialSchema,
} from "./database/schemas";
import { getValidatedTable } from "./database/zod";
import { generateRoutingTable } from "./router";
import { createSmileBuildConfig, type SmileBuildConfig } from "./types/build-config";
import { devtools, useLogger, registerModule } from "./utils/module";
import { SmileTemplates } from "./templates";
import type { NitroConfig } from "nitropack";
import { join } from "pathe";
import { existsSync } from "node:fs";
import type { SmileTable } from "./database/types";

export type * from "./config";
export {
  defineExperiment,
  defineSmileConfig,
  defineStimuli,
} from "./config";
export * from "./types";

// biome-ignore lint/suspicious/noEmptyInterface: <explanation>
export interface SmileModuleOptions {}

export default defineNuxtModule<SmileModuleOptions>({
  meta: {
    name: "@smile/nuxt",
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
    const { resolve } = resolver;
    nuxt.options.alias["#smile"] = resolve("./runtime");

    nuxt.options.pages = nuxt.options.pages || {};
    nuxt.options.pages = true;

    nuxt.options.ssr = false;

    nuxt.options.router = defu(nuxt.options.router || {}, {
      options: { hashMode: true },
    });
    nuxt.options.router.options.hashMode = true;

    await registerModule(nuxt, "@nuxtjs/mdc", "mdc", {});
    await registerModule(nuxt, "@nuxt/ui-pro", "ui", {
      css: ["~assets/css/main.css"],
    });

    // Add SmileJS CSS
    nuxt.options.css = nuxt.options.css || [];
    nuxt.options.css.push(resolve("./smile.css"));

    // Add Vite alias for Tailwind v4 imports in module components
    nuxt.hook("vite:extendConfig", (config) => {
      config.resolve = config.resolve || {};
      config.resolve.alias = config.resolve.alias || {};
      // Allow @import "tailwindcss" in module components
      // config.resolve.alias["tailwindcss"] = resolve("./smile.css");
    });

    // Extend Tailwind config to include SmileJS components
    // nuxt.hook("tailwindcss:config:extend", (tailwindConfig) => {
    //   tailwindConfig.content = tailwindConfig.content || [];
    //   if (Array.isArray(tailwindConfig.content)) {
    //     tailwindConfig.content.push(
    //       resolve("./runtime/components/**/*.{js,vue,ts}"),
    //       resolve("./runtime/pages/**/*.{js,vue,ts}")
    //     );
    //   }
    // });

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

    const buildConfig = createSmileBuildConfig(nuxt, experiments, resolver);

    await devtools(buildConfig);
    initializeDatabase(buildConfig);
    initializeMDXProcessor(buildConfig);
    await generateRoutingTable(buildConfig);

    addRouteMiddleware({
      name: "smile-timeline",
      path: resolve("runtime/middleware/timeline"),
      global: true,
    });

    addComponentsDir({
      path: resolve("runtime/components"),
      prefix: "Smile",
      pathPrefix: false,
      watch: true,
    });

    addImportsDir(resolve("runtime/composables"));

    nuxt.options.alias["#smile:components"] =
      SmileTemplates.mdxComponents(buildConfig).dst;

    // Check if user has defined app.vue, if not create one with SmileLayout
    nuxt.hook("app:resolve", async (app) => {
      const userAppPath = join(nuxt.options.srcDir, "app.vue");

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

function initializeMDXProcessor(config: SmileBuildConfig) {
  const {
    nuxt,
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

function initializeDatabase(config: SmileBuildConfig) {
  const logger = useLogger("database");

  const {
    nuxt,
    resolver: { resolve },
  } = config;

  nuxt.options.alias["#smile/database"] = SmileTemplates.database(config).dst;

  const tables: Record<string, SmileTable> = {
    participants: getValidatedTable(`participants`, participantSchema),
    sessions: getValidatedTable(`sessions`, sessionSchema),
    blocks: getValidatedTable(`block`, blockSchema),
    trials: getValidatedTable(`trials`, trialSchema),
  };
  logger.debug(`Added all of Smile's "meta" tables!`);

  const { experiments } = config;
  for (const experiment of Object.values(experiments)) {
    const { stimuli } = experiment;
    tables[experiment.tableName] = getValidatedTable(
      experiment.tableName,
      experiment.schema
    );
    tables[stimuli.tableName] = getValidatedTable(stimuli.tableName, stimuli.schema);
    logger.debug(`Adding the \`${experiment.tableName}\` table!`);
    logger.debug(`Adding the \`${stimuli.tableName}\` table!`);
  }

  SmileTemplates.drizzleConfig(config);
  nuxt.options.alias["#smile:db/schema"] = SmileTemplates.schema(config, tables).dst;

  SmileTemplates.sqlTables(config, tables);
  nuxt.options.alias["#smile:sql/tables"] = SmileTemplates.tsTables(config, tables).dst;
  nuxt.options.alias["#smile:sql/seed"] = SmileTemplates.tsSeed(config, tables).dst;

  addServerPlugin(resolve("./runtime/server/plugins/database.ts"));
}
