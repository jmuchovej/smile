/**
 * A stimuli definition: a named dataset, its source file(s) under the
 * stimuli directory, and the column schema its rows must satisfy.
 */
import { z } from "zod";

import { Column, SMILE_BRAND, hasBrand } from "./column";
import { SmileTable, type ColumnDefinition, type Row, type StimuliIdentifiers } from "./table";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StimuliInput {
  name: string;
  /** Path(s) or glob(s) relative to the stimuli directory. */
  source: string | string[];
  schema: ColumnDefinition;
}

// ─── Validation ──────────────────────────────────────────────────────────────

function isColumn(val: unknown): val is Column {
  return val instanceof Column || hasBrand(val, "column");
}

function validateSchemaColumns(schema: unknown): schema is Record<string, Column> {
  if (typeof schema !== "object" || schema === null) return false;
  return Object.values(schema).every(isColumn);
}

export const StimuliInputSchema = z
  .object({
    name: z.string().min(1, "Stimuli name is required"),
    source: z.union([
      z.string().min(1, "Source file path is required"),
      z
        .array(z.string().min(1, "Source file path cannot be empty"))
        .min(1, "At least one source file required"),
    ]),
    schema: z.record(z.string(), z.any()).refine(validateSchemaColumns, {
      message: "Expected a column definition (e.g., s.string(), s.number())",
    }),
  })
  .superRefine(({ schema }, ctx) => {
    if (!validateSchemaColumns(schema)) return;
    const trialIDColumns = Object.entries(schema).filter(([, col]) =>
      col.getExperimentConstraints().has("trialID"),
    );
    if (trialIDColumns.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["schema"],
        message: "Schema must have exactly one column marked as trialID()",
      });
    } else if (trialIDColumns.length > 1) {
      const names = trialIDColumns.map(([name]) => name).join(", ");
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["schema"],
        message: `Schema has multiple trialID columns: ${names}. Only one is allowed.`,
      });
    }
  });

// ─── Stimuli Class ───────────────────────────────────────────────────────────

export class Stimuli {
  readonly [SMILE_BRAND] = "stimuli" as const;
  private _table?: SmileTable;
  private _schema: ColumnDefinition;

  readonly name: string;
  readonly source: string | string[];

  get schema(): ColumnDefinition {
    return this._schema;
  }

  private constructor(input: StimuliInput) {
    this.name = input.name;
    this.source = input.source;
    this._schema = input.schema;
  }

  /** @throws ZodError if the input is invalid */
  static create(input: StimuliInput): Stimuli {
    StimuliInputSchema.parse(input);
    return new Stimuli(input);
  }

  // ─── Computed Properties ─────────────────────────────────────────────────

  get id(): string {
    return this.name;
  }

  get sources(): string[] {
    return Array.isArray(this.source) ? this.source : [this.source];
  }

  get table(): SmileTable {
    if (!this._table) {
      const tableName = `_stimuli-${this.name.toLowerCase().replace(/\s+/g, "-")}`;
      this._table = new SmileTable(tableName, this._schema);
    }
    return this._table;
  }

  get identifiers(): StimuliIdentifiers {
    return this.table.getIdentifiers();
  }

  get trialIDColumn(): string {
    const { trialID } = this.identifiers;
    if (!trialID) {
      throw new Error(`Stimuli "${this.name}" has no trialID column`);
    }
    return trialID;
  }

  // ─── Convenience Methods ─────────────────────────────────────────────────

  parseRow(data: unknown): Row {
    return this.table.parse(data);
  }

  safeParseRow(data: unknown): z.SafeParseReturnType<unknown, Row> {
    return this.table.safeParse(data);
  }
}

export function createStimuli(input: StimuliInput): Stimuli {
  return Stimuli.create(input);
}
