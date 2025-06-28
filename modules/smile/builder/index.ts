/**
 * Smile builder API.
 *
 * The `s` namespace is the entry point for authoring `smile.config.ts`:
 *
 * ```ts
 * import { defineSmileConfig, s } from "#smile/builder";
 *
 * const stroopStimuli = s.stimuli({
 *   name: "stroop",
 *   source: "stroop.csv",
 *   schema: s.schema({
 *     index: s.number().trialID().int().min(1),
 *     word: s.string().min(1),
 *     color: s.enum(["red", "green", "blue"]),
 *   }),
 * });
 *
 * const stroopPilot = s.experiment("stroop", "pilot", {
 *   stimuli: stroopStimuli,
 *   services: ["prolific"],
 * });
 *
 * export default defineSmileConfig({
 *   activeExperiment: "stroop@pilot",
 *   experiments: [stroopPilot],
 * });
 * ```
 */
import { z } from "zod";

// ─── Column Exports ──────────────────────────────────────────────────────────

export {
  Column,
  SMILE_BRAND,
  hasBrand,
  type ExperimentConstraint,
  type DatabaseConstraints,
  type BaseColumnOptions,
  type ColumnKind,
  type ColumnSummary,
  StringColumn,
  NumberColumn,
  BooleanColumn,
  DateColumn,
  EnumColumn,
  JSONColumn,
  ArrayColumn,
  ObjectColumn,
  LooseObjectColumn,
  type ColumnShape,
  type InferColumnShapeOutput,
  string,
  number,
  boolean,
  date,
  enumColumn,
  json,
  array,
  object,
  looseObject,
} from "./column";

// ─── Table Exports ───────────────────────────────────────────────────────────

export {
  SmileTable,
  type ColumnDefinition,
  type StimuliIdentifiers,
  type InferColumnOutput,
  type Row,
} from "./table";

// ─── Entity Exports ──────────────────────────────────────────────────────────

export { Stimuli, createStimuli, type StimuliInput } from "./stimuli";
export {
  Experiment,
  createExperiment,
  type ExperimentInput,
  type RandomizerType,
} from "./experiment";
export {
  SmileConfig,
  defineSmileConfig,
  type SmileConfigInput,
  type SmileConfigDefinition,
} from "./config";

// ─── Namespace ───────────────────────────────────────────────────────────────

import {
  Column as ColumnClass,
  hasBrand,
  array,
  boolean,
  date,
  enumColumn,
  json,
  looseObject,
  number,
  object,
  string,
} from "./column";
import { SmileConfig, defineSmileConfig as createConfig, type SmileConfigInput } from "./config";
import { Experiment, type ExperimentInput } from "./experiment";
import { Stimuli, type StimuliInput } from "./stimuli";
import type { ColumnDefinition } from "./table";

/**
 * Validate a schema map: every value must be a column and exactly one must
 * be marked `trialID()`. Returns the map unchanged.
 *
 * @throws ZodError on violation
 */
function schema<T extends ColumnDefinition>(columns: T): T {
  for (const [key, value] of Object.entries(columns)) {
    if (!(value instanceof ColumnClass || hasBrand(value, "column"))) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ["schema", key],
          message: "Expected a column definition (e.g., s.string(), s.number())",
        },
      ]);
    }
  }

  const trialIDColumns = Object.entries(columns).filter(([, col]) =>
    col.getExperimentConstraints().has("trialID"),
  );

  if (trialIDColumns.length === 0) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ["schema"],
        message: "Schema must have exactly one column marked as trialID()",
      },
    ]);
  }

  if (trialIDColumns.length > 1) {
    const names = trialIDColumns.map(([name]) => name).join(", ");
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ["schema"],
        message: `Schema has multiple trialID columns: ${names}. Only one is allowed.`,
      },
    ]);
  }

  return columns;
}

function stimuli(input: StimuliInput): Stimuli {
  return Stimuli.create(input);
}

function experiment(name: string, version: string, input: ExperimentInput): Experiment {
  return Experiment.create(name, version, input);
}

function config(input: SmileConfigInput): SmileConfig {
  return SmileConfig.create(input);
}

export const s = {
  // Column primitives
  string,
  number,
  boolean,
  date,
  enum: enumColumn,
  json,
  array,
  object,
  looseObject,

  // Schema and entity builders
  schema,
  stimuli,
  experiment,
  config,

  // Convenience alias for the top-level export
  defineSmileConfig: createConfig,
} as const;

export type S = typeof s;
