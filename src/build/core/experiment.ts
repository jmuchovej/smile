import { existsSync } from "node:fs";
import { basename, dirname, join } from "pathe";
import { kebabCase } from "scule";
import { type ZodObject, z } from "zod";
import { useLogger } from "../../runtime/internal";
import type { ExperimentService } from "../../runtime/types/services";
import type { DefinedRandomizer, ResolvedRandomizer } from "./randomizer";
import { nullRandomizer, resolveRandomizer } from "./randomizer";
import type { DefinedStimuli, ResolvedStimuli } from "./stimuli";
import { resolveStimuli } from "./stimuli";

export type ExperimentSource = string | string[];

export interface ExperimentBase {
  /** Experiment name - determines directory (e.g., "stroop" → experiments/stroop/) */
  name: string;

  /** Experiment version - determines variant (e.g., "pilot", "full") */
  version: string;

  duration: string;
  compensation: string;
  services: ExperimentService[];

  allowRepeats?: boolean;
  autoSave?: boolean;

  randomizer?: DefinedRandomizer;
  stimuli: DefinedStimuli;
  schema: ZodObject;

  extra?: Record<string, unknown>;
}

export interface DefinedExperiment {
  name: ExperimentBase["name"];
  version: ExperimentBase["version"];
  searchPath: string;

  duration: ExperimentBase["duration"];
  compensation: ExperimentBase["compensation"];
  services: ExperimentBase["services"];

  allowRepeats?: ExperimentBase["allowRepeats"];
  autoSave?: ExperimentBase["autoSave"];

  randomizer: NonNullable<ExperimentBase["randomizer"]>;
  stimuli: ExperimentBase["stimuli"];
  schema: ZodObject;

  extra?: ExperimentBase["extra"];
}

function mkid(experiment: DefinedExperiment) {
  return `${experiment.name}@${experiment.version}`;
}

export interface ResolvedExperiment {
  name: DefinedExperiment["name"];
  version: DefinedExperiment["version"];
  /** Unique identifier: name@version */
  id: string;
  /** Resolved experiment directory path */
  path: string;
  /** Directory basename that was actually found (for validation/logging) */
  basename: string;

  duration: DefinedExperiment["duration"];
  compensation: DefinedExperiment["compensation"];
  services: DefinedExperiment["services"];

  allowRepeats: NonNullable<DefinedExperiment["allowRepeats"]>;
  autoSave: NonNullable<DefinedExperiment["autoSave"]>;

  randomizer: ResolvedRandomizer;
  stimuli: ResolvedStimuli;
  schema: DefinedExperiment["schema"];

  tableName: string;

  extra?: NonNullable<DefinedExperiment["extra"]>;
}

export function defineExperiment(experiment: ExperimentBase): DefinedExperiment {
  const schema = experiment.schema ?? z.object({});

  const randomizer = experiment.randomizer ?? nullRandomizer;

  return {
    ...experiment,
    randomizer,
    searchPath: "",
    schema,
  };
}

export const EXPERIMENT_TABLE_PREFIX = `_experiment`;

function getTableName(name: string) {
  return `${EXPERIMENT_TABLE_PREFIX}-${kebabCase(name)}`;
}

export function resolveExperiment(experiment: DefinedExperiment): ResolvedExperiment {
  const logger = useLogger("config", "experiment");
  // Validate that name and version are provided
  if (!experiment.name || !experiment.version) {
    logger.error(`Experiments must have explicit \`name\` and \`version\` proprties!`);
    throw new Error(`Invalid experiment configuration.`);
  }

  // Create unique identifier
  const id = mkid(experiment);

  // Resolve experiment directory with fallback logic
  const { path, basename } = resolveExperimentDirectory(experiment);

  // Validate the actual directory name we found
  if (!/^[a-z0-9@-]+$/i.test(basename)) {
    logger.warn(
      [
        `Experiment directory "${basename}" should be directory-safe.`,
        "Consider using lowercase letters, numbers, hyphens, and @ only.",
      ].join("\n")
    );
  }

  // Stimuli should be resolved relative to the layer root (parent of searchPath)
  const layerRootDir = dirname(experiment.searchPath); // Get parent of "experiments" directory
  const stimuli = resolveStimuli(layerRootDir, experiment.stimuli);

  // Resolve randomizer using the new resolver function
  const randomizer = resolveRandomizer(experiment.randomizer ?? "null");

  return {
    ...experiment,
    id,
    path,
    basename,
    tableName: getTableName(id),
    stimuli,
    randomizer,
    allowRepeats: experiment.allowRepeats ?? false,
    autoSave: experiment.autoSave ?? true,
  };
}

/**
 * Resolve experiment directory with fallback logic:
 * 1. First try: ${experimentsBasePath}/${name}@${version}/
 * 2. Fallback: ${experimentsBasePath}/${name}/
 */
function resolveExperimentDirectory(experiment: DefinedExperiment): {
  path: string;
  basename: string;
} {
  const logger = useLogger("config", "experiment");
  const subpaths = [`${experiment.name}@${experiment.version}`, experiment.name];
  for (const subpath of subpaths) {
    const path = join(experiment.searchPath, subpath);
    if (existsSync(path)) return { path, basename: basename(path) };
  }

  const fallback = join(experiment.searchPath, subpaths[subpaths.length - 1]!);
  const basepath = basename(fallback);
  logger.warn(
    `None of \`${subpaths.join(", ")}\` are present in ${dirname(fallback)}, falling back to \`${basepath}\`.`
  );
  return { path: fallback, basename: basepath };
}

export const resolveExperiments = (
  experiments: DefinedExperiment[]
): Record<string, ResolvedExperiment> => {
  return Object.fromEntries(
    experiments.map((experiment) => [mkid(experiment), resolveExperiment(experiment)])
  );
};
