import { useRuntimeConfig } from "#app";

import type { SerializedExperiment, SmilePublicRuntimeConfig } from "../types";

export interface SmileConfigAccess {
  /** Whether a `smile.config.*` file was loaded at build time. */
  isConfigured: boolean;
  /** `name@version` of the active experiment, or null when unconfigured. */
  activeExperiment: string | null;
  /** The active experiment's resolved settings, or null when unconfigured. */
  experiment: SerializedExperiment | null;
  /** Identifiers of every configured experiment. */
  availableExperiments: string[];
  /** Reads a key from the active experiment's `extra` metadata. */
  extra: <T = unknown>(key: string) => T | undefined;
}

/**
 * Access to the project configuration resolved at build time, without
 * importing `smile.config.ts` from application code.
 */
export function useSmileConfig(): SmileConfigAccess {
  const runtimeConfig = useRuntimeConfig();
  const smile = (runtimeConfig.public.smile ?? {}) as Partial<SmilePublicRuntimeConfig>;

  const experiment = smile.experiment ?? null;

  return {
    isConfigured: smile.activeExperiment != null,
    activeExperiment: smile.activeExperiment ?? null,
    experiment,
    availableExperiments: smile.availableExperiments ?? [],
    extra: <T = unknown>(key: string): T | undefined => experiment?.extra?.[key] as T | undefined,
  };
}
