/**
 * Smile as a local Nuxt module.
 *
 * Everything framework-provided lives under this directory so that it can
 * later be lifted out as a published module without content edits. Code
 * under `runtime/` is shipped to the browser; everything else runs at build
 * time inside Nuxt.
 */
import { existsSync } from "node:fs";

import {
  addImportsDir,
  addLayout,
  addTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  extendPages,
  useLogger,
} from "@nuxt/kit";
import { isAbsolute, relative, resolve as resolvePath } from "pathe";

import { expectedConfigFiles, loadSmileConfig, watchSmileConfig } from "./build/config";
import { type ScanResult, scanExperiment } from "./build/scanner";
import { serializeExperiment } from "./build/serialize";
import { loadAllStimuli, type LoadedStimuli } from "./build/stimuli";
import {
  stimuliModuleContents,
  stimuliTypesContents,
  timelineModuleContents,
  timelineTypesContents,
} from "./build/templates";
import type { SmileAppConfig, SmilePublicRuntimeConfig } from "./runtime/types";

export interface SmileModuleOptions {
  /**
   * Identifier (`name@version`) of the experiment to build, overriding
   * `activeExperiment` in `smile.config.ts`. The `SMILE_EXPERIMENT`
   * environment variable takes precedence over this option.
   */
  experiment?: string;
  /** Directory holding experiment timelines, relative to the project root. */
  experimentsDir?: string;
  /** Directory holding stimulus data files, relative to the project root. */
  stimuliDir?: string;
  /** Base name of the configuration file, without extension. */
  configPath?: string;
}

declare module "nuxt/schema" {
  interface NuxtConfig {
    smile?: SmileModuleOptions;
  }
  interface NuxtOptions {
    smile: SmileModuleOptions;
  }
}

export default defineNuxtModule<SmileModuleOptions>({
  meta: {
    name: "smile",
    configKey: "smile",
    compatibility: {
      nuxt: ">=3.17.0 <4.0.0",
    },
  },
  defaults: {
    experimentsDir: "experiments",
    stimuliDir: "stimuli",
    configPath: "smile.config",
  },
  async setup(options, nuxt) {
    const logger = useLogger("smile");
    const { resolve } = createResolver(import.meta.url);
    const moduleDir = resolve(".");
    const rootDir = nuxt.options.rootDir;

    // `#smile` points at this directory for application code and for the
    // configuration file. It becomes the package name once published.
    nuxt.options.alias["#smile"] = moduleDir;

    // Runtime code is authored in TypeScript and Vue SFCs; let Nuxt transpile it.
    nuxt.options.build.transpile.push(resolve("./runtime"));

    // ─── Configuration ───────────────────────────────────────────────────

    const loaded = await loadSmileConfig({
      rootDir,
      moduleDir,
      configPath: options.configPath,
      experimentOverride: options.experiment,
    });

    if (!loaded.configFile) {
      logger.warn(
        `No configuration file found in ${rootDir}. Expected one of: ${expectedConfigFiles(options.configPath).join(", ")}. No experiments will be available.`,
      );
    } else {
      logger.info(
        `Active experiment: ${loaded.activeExperiment} (from ${loaded.activeSource}); config: ${relative(rootDir, loaded.configFile)}`,
      );
    }

    const publicConfig: SmilePublicRuntimeConfig = {
      activeExperiment: loaded.activeExperiment,
      experiment: loaded.experiment ? serializeExperiment(loaded.experiment) : null,
      availableExperiments: loaded.config?.getExperimentIds() ?? [],
    };
    const appConfig: SmileAppConfig = {
      activeExperiment: publicConfig.activeExperiment,
      availableExperiments: publicConfig.availableExperiments,
    };

    // Nuxt infers these keys' types from their values, which would pin the
    // nullable fields to whatever the demo config happens to contain.
    (nuxt.options.runtimeConfig.public as Record<string, unknown>).smile = publicConfig;
    (nuxt.options.appConfig as Record<string, unknown>).smile = appConfig;

    // ─── Stimuli ─────────────────────────────────────────────────────────

    const stimuliDir = resolvePath(rootDir, options.stimuliDir ?? "stimuli");
    const experimentsDir = resolvePath(rootDir, options.experimentsDir ?? "experiments");

    let datasets: Record<string, LoadedStimuli> = {};
    if (loaded.config) {
      // Errors carry file, row and column; let them fail the build as-is.
      datasets = await loadAllStimuli(loaded.config, stimuliDir);
      for (const dataset of Object.values(datasets)) {
        logger.info(
          `Stimuli "${dataset.name}": ${dataset.rows.length} rows from ${dataset.files.join(", ")}`,
        );
      }
    }
    const activeDataset = loaded.experiment?.stimuli.name ?? null;

    addTemplate({
      filename: "smile/stimuli.mjs",
      write: true,
      getContents: () => stimuliModuleContents({ active: activeDataset, datasets }),
    });
    addTypeTemplate({
      filename: "smile/stimuli.d.ts",
      getContents: () => stimuliTypesContents(loaded.config, activeDataset),
    });

    // ─── Experiment timeline ─────────────────────────────────────────────

    let scan: ScanResult | null = null;
    if (loaded.experiment) {
      const { experiment } = loaded;
      // Scan errors name the directory and entries; let them fail the build.
      scan = scanExperiment({
        experimentsDir,
        name: experiment.name,
        version: experiment.version,
        trialIds: datasets[experiment.stimuli.name]?.trialIds ?? [],
      });
      logger.info(
        `Experiment "${experiment.id}": ${scan.pages.length} pages, ${scan.entries.length} timeline entries from ${relative(rootDir, scan.experimentDir)}/`,
      );
    }

    // Experiment pages, plus the framework pages: in development a launcher
    // at `/` and an index per experiment; in production those paths redirect
    // to the first timeline entry.
    const firstEntry = scan?.entries[0] ?? null;
    const experimentRoutes = scan?.routes.map((r) => r.route) ?? [];
    const launcherPage = resolve("./runtime/pages/launcher.vue");
    const indexPage = resolve("./runtime/pages/experiment-index.vue");
    const isDev = nuxt.options.dev;

    extendPages((pages) => {
      pages.push(...experimentRoutes);

      if (isDev || !firstEntry) {
        pages.push({ name: "smile-launcher", path: "/", file: launcherPage });
      } else {
        pages.push({ name: "smile-launcher", path: "/", redirect: firstEntry.path });
      }

      if (isDev) {
        pages.push({ name: "smile-experiment-index", path: "/experiment/:name", file: indexPage });
      } else if (firstEntry && scan) {
        pages.push({
          name: "smile-experiment-index",
          path: `/experiment/${scan.experimentName}`,
          redirect: firstEntry.path,
        });
      }
    });

    addTemplate({
      filename: "smile/timeline.mjs",
      write: true,
      getContents: () => timelineModuleContents(scan),
    });
    addTypeTemplate({
      filename: "smile/timeline.d.ts",
      getContents: () => timelineTypesContents(),
    });

    // Reload when the configuration, stimuli or experiment files change
    // during development. A full restart is the only reliable way to re-run
    // this setup on Nuxt 3.
    if (nuxt.options.dev) {
      const watchedDirs = [stimuliDir, experimentsDir].filter((dir) => existsSync(dir));
      nuxt.options.watch.push(...watchedDirs);
      nuxt.hook("builder:watch", (event, path) => {
        const absolute = isAbsolute(path) ? path : resolvePath(nuxt.options.srcDir, path);
        if (watchedDirs.some((dir) => absolute.startsWith(`${dir}/`))) {
          logger.info(`${relative(rootDir, absolute)} ${event}; restarting`);
          void nuxt.callHook("restart", { hard: true });
        }
      });

      const unwatch = await watchSmileConfig({
        rootDir,
        moduleDir,
        configPath: options.configPath,
        experimentOverride: options.experiment,
        onChange: (event) => {
          logger.info(`${relative(rootDir, event.path)} ${event.type}; restarting`);
          void nuxt.callHook("restart", { hard: true });
        },
      });
      if (unwatch) nuxt.hook("close", () => unwatch());
    }

    // ─── Runtime ─────────────────────────────────────────────────────────

    addImportsDir(resolve("./runtime/composables"));

    // The shell every experiment page renders inside.
    addLayout(resolve("./runtime/layouts/smile.vue"), "smile");
  },
});
