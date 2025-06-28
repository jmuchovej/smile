/**
 * Reduce builder objects to the JSON-safe shapes the browser receives.
 */
import type { Experiment } from "../builder/experiment";
import type { Stimuli } from "../builder/stimuli";
import type { SerializedExperiment, SerializedStimuli } from "../runtime/types";

export function serializeStimuli(stimuli: Stimuli): SerializedStimuli {
  return {
    name: stimuli.name,
    sources: stimuli.sources,
    trialIDColumn: stimuli.trialIDColumn,
    columns: stimuli.table.summarizeColumns(),
  };
}

export function serializeExperiment(experiment: Experiment): SerializedExperiment {
  return {
    id: experiment.id,
    name: experiment.name,
    version: experiment.version,
    services: [...experiment.services],
    randomizer: experiment.randomizer,
    allowRepeats: experiment.allowRepeats,
    autoSave: experiment.autoSave,
    extra: JSON.parse(JSON.stringify(experiment.extra)) as Record<string, unknown>,
    stimuli: serializeStimuli(experiment.stimuli),
  };
}
