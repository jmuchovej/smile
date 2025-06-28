/**
 * A table wraps a column definition and provides table-level operations:
 * identifier lookup, zod object generation, row parsing, and zod, Drizzle
 * and SQLite code generation.
 */
import { z } from "zod";

import { Column, type ColumnSummary, type ExperimentConstraint } from "./column";

// ─── Types ───────────────────────────────────────────────────────────────────

/** A map of column names to column definitions. */
export type ColumnDefinition = Record<string, Column>;

/** Column names carrying experiment roles. */
export interface StimuliIdentifiers {
  trialID?: string;
  blockID?: string;
  conditionID?: string;
}

/** The output type of a ColumnDefinition. */
export type InferColumnOutput<T extends ColumnDefinition> = {
  [K in keyof T]: ReturnType<T[K]["toZod"]>["_output"];
};

/** Parsed row of an untyped table. */
export type Row = Record<string, unknown>;

// ─── SmileTable Class ────────────────────────────────────────────────────────

export class SmileTable {
  private _name: string;
  private _columns: ColumnDefinition;
  private _identifiersCache?: StimuliIdentifiers;
  private _zodCache?: z.ZodObject<Record<string, z.ZodTypeAny>>;
  private _coercingZodCache?: z.ZodObject<Record<string, z.ZodTypeAny>>;

  constructor(name: string, columns: ColumnDefinition) {
    this._name = name;
    this._columns = columns;
  }

  // ─── Getters ─────────────────────────────────────────────────────────────

  getName(): string {
    return this._name;
  }

  getColumns(): ColumnDefinition {
    return this._columns;
  }

  getColumn(name: string): Column | undefined {
    return this._columns[name];
  }

  getColumnNames(): string[] {
    return Object.keys(this._columns);
  }

  /** JSON-safe description of every column, keyed by name. */
  summarizeColumns(): Record<string, ColumnSummary> {
    const out: Record<string, ColumnSummary> = {};
    for (const [name, column] of Object.entries(this._columns)) {
      out[name] = column.summary();
    }
    return out;
  }

  // ─── Constraint Lookups ──────────────────────────────────────────────────

  getColumnsWithConstraint(constraint: ExperimentConstraint): Array<[string, Column]> {
    return Object.entries(this._columns).filter(([, column]) =>
      column.getExperimentConstraints().has(constraint),
    );
  }

  getIdentifiers(): StimuliIdentifiers {
    if (this._identifiersCache) return this._identifiersCache;

    const identifiers: StimuliIdentifiers = {};
    for (const [name, column] of Object.entries(this._columns)) {
      const constraints = column.getExperimentConstraints();
      if (constraints.has("trialID")) identifiers.trialID = name;
      if (constraints.has("blockID")) identifiers.blockID = name;
      if (constraints.has("conditionID")) identifiers.conditionID = name;
    }

    this._identifiersCache = identifiers;
    return identifiers;
  }

  hasTrialID(): boolean {
    return this.getIdentifiers().trialID !== undefined;
  }

  // ─── Schema Generation ───────────────────────────────────────────────────

  toZod(): z.ZodObject<Record<string, z.ZodTypeAny>> {
    if (this._zodCache) return this._zodCache;

    const zodFields: Record<string, z.ZodTypeAny> = {};
    for (const [fieldName, column] of Object.entries(this._columns)) {
      zodFields[fieldName] = column.toZod();
    }

    this._zodCache = z.object(zodFields);
    return this._zodCache;
  }

  /** Like `toZod()`, but coerces string cells (delimited-text sources). */
  toCoercingZod(): z.ZodObject<Record<string, z.ZodTypeAny>> {
    if (this._coercingZodCache) return this._coercingZodCache;

    const zodFields: Record<string, z.ZodTypeAny> = {};
    for (const [fieldName, column] of Object.entries(this._columns)) {
      zodFields[fieldName] = column.toCoercingZod();
    }

    this._coercingZodCache = z.object(zodFields);
    return this._coercingZodCache;
  }

  parse(data: unknown): Row {
    return this.toZod().parse(data) as Row;
  }

  safeParse(data: unknown): z.SafeParseReturnType<unknown, Row> {
    return this.toZod().safeParse(data) as z.SafeParseReturnType<unknown, Row>;
  }

  // ─── Code Generation ─────────────────────────────────────────────────────

  codegenZod(): string {
    const entries = Object.entries(this._columns)
      .map(([name, column]) => `  ${name}: ${column.codegenZod()},`)
      .join("\n");
    return `z.object({\n${entries}\n})`;
  }

  codegenDrizzle(): string[] {
    const tableName = this._name;
    const tsName = this._toTsIdentifier(tableName);

    const lines: string[] = [];
    lines.push(`export const ${tsName} = sqliteTable("${tableName}", {`);

    for (const [name, column] of Object.entries(this._columns)) {
      lines.push(`  ${name}: ${column.codegenDrizzle(name)},`);
    }

    lines.push("});");
    return lines;
  }

  codegenSQLite(): string[] {
    const lines: string[] = [];
    lines.push(`CREATE TABLE "${this._name}" (`);

    const columnDefs: string[] = [];
    const constraints: string[] = [];

    for (const [name, column] of Object.entries(this._columns)) {
      const sqliteType = column.codegenSQLite();
      const dbConstraints = column.getDatabaseConstraints();
      const baseOptions = column.getBaseOptions();

      let def = `  "${name}" ${sqliteType}`;

      if (dbConstraints.primaryKey) def += " PRIMARY KEY";
      if (!baseOptions.nullable && !baseOptions.optional && !dbConstraints.primaryKey) {
        def += " NOT NULL";
      }
      if (dbConstraints.unique) def += " UNIQUE";
      if (baseOptions.default !== undefined) {
        const defaultVal =
          typeof baseOptions.default === "string"
            ? `'${baseOptions.default}'`
            : JSON.stringify(baseOptions.default);
        def += ` DEFAULT ${defaultVal}`;
      }

      columnDefs.push(def);

      if (dbConstraints.index && !dbConstraints.primaryKey) {
        constraints.push(
          `CREATE INDEX "idx_${this._name}_${name}" ON "${this._name}" ("${name}");`,
        );
      }
    }

    lines.push(columnDefs.join(",\n"));
    lines.push(");");

    if (constraints.length > 0) {
      lines.push("");
      lines.push(...constraints);
    }

    return lines;
  }

  private _toTsIdentifier(name: string): string {
    return name
      .replace(/^_+/, "")
      .replace(/[@-](.)/g, (_, char: string) => char.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, "");
  }
}
