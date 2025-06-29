/**
 * Read access to validated stimuli rows.
 *
 * The build step embeds every dataset's rows in a generated module; this
 * accessor turns that plain data into the API `useStimuli()` exposes. It is
 * framework-free so it can be unit tested without Nuxt.
 */

/** A validated, JSON-safe stimulus row. */
export type StimulusRow = Record<string, unknown>;

/** One dataset as embedded by the build step. */
export interface EmbeddedDataset<Row extends StimulusRow = StimulusRow> {
  name: string;
  /** Source files the rows came from, relative to the stimuli directory. */
  files: string[];
  /** Name of the column marked `trialID()`. */
  trialIDColumn: string;
  /** Rows in source order. */
  rows: Row[];
}

/** The shape of the generated `#build/smile/stimuli` module. */
export interface EmbeddedStimuli {
  /** Name of the active experiment's dataset, or null when unconfigured. */
  active: string | null;
  datasets: Record<string, EmbeddedDataset>;
}

/** What `useStimuli()` returns. */
export interface StimuliAccess<Row extends StimulusRow = StimulusRow> {
  name: string;
  trialIDColumn: string;
  /** Rows in source order. */
  rows: readonly Row[];
  /** Trial identifiers in source order. */
  trialIds: readonly (string | number)[];
  count: number;
  /** Look up a row by its trial identifier. */
  byTrialId: (id: string | number) => Row | undefined;
  /** Position of a trial identifier in source order, or -1. */
  indexOf: (id: string | number) => number;
}

export class UnknownDatasetError extends Error {
  constructor(name: string, available: string[]) {
    const list = available.length > 0 ? available.join(", ") : "(none)";
    super(`Unknown stimuli dataset "${name}". Available datasets: ${list}`);
    this.name = "UnknownDatasetError";
  }
}

const trialKey = (id: string | number): string => String(id);

/**
 * Build an accessor for one dataset. When `name` is omitted the active
 * experiment's dataset is used.
 *
 * @throws UnknownDatasetError when the dataset is not defined
 */
export function createStimuliAccess<Row extends StimulusRow = StimulusRow>(
  embedded: EmbeddedStimuli,
  name?: string,
): StimuliAccess<Row> {
  const available = Object.keys(embedded.datasets);
  const target = name ?? embedded.active ?? undefined;
  if (target === undefined || !(target in embedded.datasets)) {
    throw new UnknownDatasetError(target ?? "(active)", available);
  }

  const dataset = embedded.datasets[target] as EmbeddedDataset<Row>;
  const rows = dataset.rows;
  const trialIds = rows.map((row) => row[dataset.trialIDColumn] as string | number);
  const index = new Map<string, number>();
  trialIds.forEach((id, i) => index.set(trialKey(id), i));

  return {
    name: dataset.name,
    trialIDColumn: dataset.trialIDColumn,
    rows,
    trialIds,
    count: rows.length,
    byTrialId: (id) => {
      const i = index.get(trialKey(id));
      return i === undefined ? undefined : rows[i];
    },
    indexOf: (id) => index.get(trialKey(id)) ?? -1,
  };
}
