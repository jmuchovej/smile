/**
 * Smile as a local Nuxt module.
 *
 * Everything framework-provided lives under this directory so that it can
 * later be lifted out as a published module without content edits. Code
 * under `runtime/` is shipped to the browser; everything else runs at build
 * time inside Nuxt.
 */
import { addLayout, createResolver, defineNuxtModule, useLogger } from "@nuxt/kit";

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
  setup(options, nuxt) {
    const logger = useLogger("smile");
    const { resolve } = createResolver(import.meta.url);

    // `#smile` points at this directory for application code and for the
    // configuration file. It becomes the package name once published.
    nuxt.options.alias["#smile"] = resolve(".");

    // Runtime code is authored in TypeScript and Vue SFCs; let Nuxt transpile it.
    nuxt.options.build.transpile.push(resolve("./runtime"));

    // The shell every experiment page renders inside.
    addLayout(resolve("./runtime/layouts/smile.vue"), "smile");

    logger.info(
      `Loaded (experiments: ${options.experimentsDir}/, stimuli: ${options.stimuliDir}/, config: ${options.configPath})`,
    );
  },
});
