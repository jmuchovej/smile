import * as embedded from "#build/smile/stimuli";
import type { ActiveDataset, StimuliRows } from "#build/smile/stimuli";

import {
  createStimuliAccess,
  type EmbeddedStimuli,
  type StimuliAccess,
  type StimulusRow,
} from "../stimuli/access";

/** Call signatures of `useStimuli()`, typed from the generated dataset map. */
export interface UseStimuli {
  /** The active experiment's dataset. */
  (): StimuliAccess<StimuliRows[ActiveDataset] & StimulusRow>;
  /** A dataset by name. */
  <N extends keyof StimuliRows>(name: N): StimuliAccess<StimuliRows[N] & StimulusRow>;
}

/**
 * The validated rows of a stimuli dataset, defaulting to the active
 * experiment's dataset. Rows are typed from the dataset's schema.
 *
 * @throws UnknownDatasetError when `name` is not a configured dataset
 */
export const useStimuli: UseStimuli = ((name?: string) =>
  createStimuliAccess(embedded as unknown as EmbeddedStimuli, name)) as UseStimuli;
