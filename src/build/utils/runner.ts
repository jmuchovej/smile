import type { Resolver } from "@nuxt/kit";
import type { ResolvedSmileConfig } from "../core/config";

let _smileConfig: ResolvedSmileConfig | null = null;

export function setSmile(config: ResolvedSmileConfig) {
  _smileConfig = config;
}

export function useSmile(): ResolvedSmileConfig {
  if (!_smileConfig) {
    throw new Error(
      "Smile config is unavailable! Make sure you're calling `useSmile()` in a build step _after_ it's been set!"
    );
  }

  return _smileConfig;
}

export interface SmileBuildContext {
  runtimeResolve: Resolver["resolve"];
  builderResolve: Resolver["resolve"];
  paths: {
    root: string;
    build: string;
    sandbox: string;
    database: string;
    experiments: string;
    stimuli: string;
  };
}

export interface SmileBuildStep {
  name: string;
  setup: (context: SmileBuildContext) => Promise<void> | void;
}

export function defineBuildStep(step: SmileBuildStep): SmileBuildStep {
  return step;
}
