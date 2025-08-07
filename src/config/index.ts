import {
  createDefineConfig,
  loadConfig,
  type WatchConfigOptions,
  watchConfig,
} from "c12";
import type { Nuxt } from "nuxt/schema";
import { join, relative } from "pathe";
import z from "zod";
import { useLogger } from "../runtime/internal";
import {
  type DefinedExperiment,
  defineExperiment,
  resolveExperiments,
} from "./experiment";
import { defineStimuli } from "./stimuli";

export type * from "./experiment";
export { defineExperiment } from "./experiment";
export type * from "./module";
export type * from "./step";
export type * from "./stimuli";
export { defineStimuli } from "./stimuli";

type NuxtSmileConfig = {
  activeExperiment: string;
  experiments: DefinedExperiment[];
};

type SmileExperimentConfig = NuxtSmileConfig["experiments"][number];

const defaultConfig: NuxtSmileConfig = {
  activeExperiment: "default@experiment",
  experiments: [
    defineExperiment({
      name: "default",
      version: "experiment",
      compensation: "$100.00",
      duration: "10 minutes",
      services: [{ type: "prolific", code: "C7W0RVYD" }],
      stimuli: defineStimuli({
        name: "silly-rabbit",
        source: "trix-are-for-kids.csv",
        schema: z.object({
          id: z.string().trialID(),
        }),
      }),
      schema: z.object({
        id: z.string().trialID(),
      }),
    }),
  ],
};

export const defineSmileConfig = createDefineConfig<NuxtSmileConfig>();

type ConfigLoader = typeof watchConfig;

export async function loadSmileConfig(nuxt: Nuxt) {
  const logger = useLogger("config");
  const devConfigLoader = (opts: WatchConfigOptions) =>
    watchConfig({
      ...opts,
      onWatch: (e) => {
        logger.info(
          `${relative(nuxt.options.rootDir, e.path)} ${e.type}, restarting the Nuxt server...`
        );
        nuxt.hooks.callHook(`restart`, { hard: true });
      },
    });
  const prodConfigLoader = loadConfig;
  const configLoader = (
    nuxt.options.dev ? devConfigLoader : prodConfigLoader
  ) as ConfigLoader;

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  (globalThis as any).defineSmileConfig = (c: any) => c;

  const layers = [...nuxt.options._layers].reverse();

  const configs = await Promise.all(
    layers.map((layer) =>
      configLoader<NuxtSmileConfig>({
        name: "smile",
        cwd: layer.config.rootDir,
        // Don't push the dummy configuration that's used for type-generation
        defaultConfig: { activeExperiment: "", experiments: [] },
      })
    )
  );

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  delete (globalThis as any).defineSmileConfig;

  if (nuxt.options.dev) {
    nuxt.hook("close", () =>
      Promise.all(configs.map((c: ConfigLoader) => c.unwatch())).then(() => {})
    );
  }

  const activeExperiment = configs.find((c) => c.config?.activeExperiment)?.config
    .activeExperiment;

  const definedExperiments = configs.reduce(
    (acc: SmileExperimentConfig[], current: ConfigLoader) => {
      const experiments = current.config?.experiments || [];
      // biome-ignore lint/style/noNonNullAssertion: This will be resolved by `c12`
      const cwd = current.cwd!;

      for (const experiment of experiments) {
        // Set the base path for this specific experiment relative to its layer
        experiment.searchPath = join(cwd, "experiments");
        acc.push(experiment);
      }

      return acc;
    },
    [] as SmileExperimentConfig[]
  );
  const hasNoExperiments = (definedExperiments || []).length === 0;

  if (hasNoExperiments) {
    logger.warn(
      `No experiment configurations found! Falling back to the default experiment.`,
      `To have full control over your experiments, define the config file in your project root.`,
      `\n`,
      `See: https://smilejs.netlify.app/getting-started`
    );
    // Set rootDir for default experiments
    for (const experiment of defaultConfig.experiments) {
      experiment.searchPath = join(nuxt.options.rootDir, "experiments");
    }
  }

  const experiments = resolveExperiments(
    hasNoExperiments ? defaultConfig.experiments : definedExperiments
  );

  return {
    activeExperiment,
    experiments,
  };
}
