// biome-ignore assist/source/organizeImports: Must be first to ensure zod extensions are loaded
import "./build/database/zod";
import { createResolver, defineNuxtModule, resolveFiles } from "@nuxt/kit";
import type { Nuxt } from "nuxt/schema";
import type { SmileBuildContext, SmileBuildStep } from "./build/utils/runner";
import { useLogger } from "./runtime/internal";
import { join } from "pathe";
import { existsSync, mkdirSync } from "node:fs";

export { defineSmileConfig } from "./build/core/config";
export { defineExperiment } from "./build/core/experiment";
export { defineRandomizer } from "./build/core/randomizer";
export { defineStimuli } from "./build/core/stimuli";
export * from "./runtime/types/services";

export type * from "./configs";

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
    const { resolve } = createResolver(import.meta.url);
    const { resolve: builderResolve } = createResolver(resolve("./build"));
    const { resolve: runtimeResolve } = createResolver(resolve("./runtime"));

    const { buildDir, rootDir } = nuxt.options;
    const sandboxPath = join(buildDir, "smile");
    const databasePath = join(sandboxPath, "database");
    const experimentsPath = join(rootDir, "experiments");
    const stimuliPath = join(rootDir, "experiments");

    const context: SmileBuildContext = {
      runtimeResolve,
      builderResolve,
      paths: {
        build: buildDir,
        root: rootDir,
        sandbox: sandboxPath,
        database: databasePath,
        experiments: experimentsPath,
        stimuli: stimuliPath,
      },
    };

    const buildPaths = [sandboxPath, databasePath];
    for (const path of buildPaths) {
      if (!existsSync(path)) {
        logger.debug(`Creating ${path}...`);
        mkdirSync(path, { recursive: true });
      }
    }

    const stepFiles = (await resolveFiles(resolve("./build"), ["*.ts"])).filter(
      (file) => /\d+\..*\.ts/.test(file)
    );
    const stepsSorted = stepFiles.sort((a, b) => a.localeCompare(b));

    for await (const stepFile of stepsSorted) {
      const stepModule = await import(stepFile);
      const step = stepModule.default as SmileBuildStep;

      logger.start(`Running build step: ${step.name}`);
      await step.setup(context);
      logger.success(`  Finished build step: ${step.name}`);
    }
  },
});
