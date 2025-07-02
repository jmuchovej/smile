/**
 * Types shared between the build step and the browser runtime.
 *
 * Everything here must be JSON-serialisable: the build step writes these
 * shapes into Nuxt's runtime config and app config.
 */
import type { ColumnSummary } from "../builder/column";
import type { RandomizerType } from "../builder/experiment";

// Type-only re-exports; nothing from the build step reaches the bundle.
export type { TimelineEntry } from "../build/scanner";
export type { TimelineNode } from "../build/timeline";

/** A stimuli definition, reduced to what the client needs to know. */
export interface SerializedStimuli {
  name: string;
  /** Source paths or globs, relative to the stimuli directory. */
  sources: string[];
  /** Name of the column marked `trialID()`. */
  trialIDColumn: string;
  /** Per-column description, keyed by column name. */
  columns: Record<string, ColumnSummary>;
}

/** The active experiment's resolved settings. */
export interface SerializedExperiment {
  /** `name@version` */
  id: string;
  name: string;
  version: string;
  services: string[];
  randomizer: RandomizerType;
  allowRepeats: boolean;
  autoSave: boolean;
  extra: Record<string, unknown>;
  stimuli: SerializedStimuli;
}

/** Shape of `runtimeConfig.public.smile`. */
export interface SmilePublicRuntimeConfig {
  /** `name@version` of the active experiment, or null when unconfigured. */
  activeExperiment: string | null;
  /** The active experiment, or null when unconfigured. */
  experiment: SerializedExperiment | null;
  /** Identifiers of every configured experiment. */
  availableExperiments: string[];
}

/** Shape of `appConfig.smile`. */
export interface SmileAppConfig {
  activeExperiment: string | null;
  availableExperiments: string[];
}
