/**
 * Column definitions for stimulus schemas.
 *
 * A fluent API for typed columns backed by zod validation. Columns carry
 * experiment roles (`trialID`, `blockID`, `conditionID`), database
 * constraints (`primaryKey`, `unique`, `index`) and can emit zod, Drizzle
 * and SQLite source text so that the same definition later drives database
 * tables and migrations for structured trial data.
 */
import { z } from "zod";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Experiment-level roles a column can play. */
export type ExperimentConstraint = "trialID" | "blockID" | "conditionID";

/** Database-level constraints. */
export interface DatabaseConstraints {
  primaryKey?: boolean;
  unique?: boolean;
  index?: boolean;
}

/** Options shared by every column type. */
export interface BaseColumnOptions {
  nullable?: boolean;
  optional?: boolean;
  default?: unknown;
}

/** Runtime discriminator used when a schema is serialised for the client. */
export type ColumnKind =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "enum"
  | "json"
  | "array"
  | "object"
  | "looseObject";

/** Serialisable description of a column, safe to embed in generated code. */
export interface ColumnSummary {
  kind: ColumnKind;
  optional: boolean;
  nullable: boolean;
  hasDefault: boolean;
  roles: ExperimentConstraint[];
  values?: readonly string[];
}

// ─── Column Base Class ───────────────────────────────────────────────────────

/**
 * Base class for all column types.
 *
 * Subclasses implement the type-specific zod schema and code generation.
 */
/**
 * Brand carried by every builder instance. The config file is evaluated in
 * its own module realm, so consumers check this marker instead of
 * `instanceof`, which would fail across realms.
 */
export const SMILE_BRAND = "__smileKind" as const;

export function hasBrand(value: unknown, kind: string): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>)[SMILE_BRAND] === kind
  );
}

export abstract class Column<out TOutput = unknown> {
  readonly [SMILE_BRAND] = "column" as const;
  protected _experimentConstraints = new Set<ExperimentConstraint>();
  protected _databaseConstraints: DatabaseConstraints = {};
  protected _baseOptions: BaseColumnOptions = {};
  protected _zodOptions: Record<string, unknown> = {};

  /** Discriminator for serialisation and type generation. */
  abstract readonly kind: ColumnKind;

  // ─── Experiment Constraints ──────────────────────────────────────────────

  /** Mark this column as the trial identifier. Implies `primaryKey()`. */
  trialID(): this {
    this._experimentConstraints.add("trialID");
    return this.primaryKey();
  }

  /** Mark this column as a block identifier. Implies `index()`. */
  blockID(): this {
    this._experimentConstraints.add("blockID");
    return this.index();
  }

  /** Mark this column as a condition identifier. Implies `index()`. */
  conditionID(): this {
    this._experimentConstraints.add("conditionID");
    return this.index();
  }

  // ─── Database Constraints ────────────────────────────────────────────────

  primaryKey(): this {
    this._databaseConstraints.primaryKey = true;
    return this;
  }

  unique(): this {
    this._databaseConstraints.unique = true;
    return this;
  }

  index(): this {
    this._databaseConstraints.index = true;
    return this;
  }

  // ─── Base Options ────────────────────────────────────────────────────────

  nullable(): this {
    this._baseOptions.nullable = true;
    return this;
  }

  optional(): this {
    this._baseOptions.optional = true;
    return this;
  }

  default(value: TOutput): this {
    this._baseOptions.default = value;
    return this;
  }

  // ─── Getters ─────────────────────────────────────────────────────────────

  getExperimentConstraints(): Set<ExperimentConstraint> {
    return new Set(this._experimentConstraints);
  }

  getDatabaseConstraints(): DatabaseConstraints {
    return { ...this._databaseConstraints };
  }

  getBaseOptions(): BaseColumnOptions {
    return { ...this._baseOptions };
  }

  getZodOptions(): Record<string, unknown> {
    return { ...this._zodOptions };
  }

  /** A JSON-safe description of this column. */
  summary(): ColumnSummary {
    return {
      kind: this.kind,
      optional: this._baseOptions.optional === true,
      nullable: this._baseOptions.nullable === true,
      hasDefault: this._baseOptions.default !== undefined,
      roles: [...this._experimentConstraints],
    };
  }

  // ─── Validation ──────────────────────────────────────────────────────────

  /**
   * The zod schema for this column, with `nullable`, `optional` and
   * `default` applied on top of the type-specific base schema.
   */
  toZod(): z.ZodTypeAny {
    let schema: z.ZodTypeAny = this._toZodBase();
    const { nullable, optional, default: defaultVal } = this._baseOptions;

    if (nullable) schema = schema.nullable();
    if (optional) schema = schema.optional();
    if (defaultVal !== undefined) schema = schema.default(defaultVal);

    return schema;
  }

  /**
   * Like `toZod()`, but coerces string input into the column's type first.
   * Used for delimited-text sources where every value arrives as a string.
   */
  toCoercingZod(): z.ZodTypeAny {
    let schema: z.ZodTypeAny = this._toCoercingZodBase();
    const { nullable, optional, default: defaultVal } = this._baseOptions;

    if (nullable) schema = z.preprocess((v) => (v === "" ? null : v), schema.nullable());
    if (optional) schema = z.preprocess((v) => (v === "" ? undefined : v), schema.optional());
    if (defaultVal !== undefined) {
      schema = z.preprocess((v) => (v === "" ? undefined : v), schema.default(defaultVal));
    }

    return schema;
  }

  protected abstract _toZodBase(): z.ZodTypeAny;

  /** Default coercion is none; numeric and boolean columns override. */
  protected _toCoercingZodBase(): z.ZodTypeAny {
    return this._toZodBase();
  }

  // ─── Code Generation ─────────────────────────────────────────────────────

  abstract codegenDrizzle(name: string): string;

  abstract codegenSQLite(): "text" | "integer" | "real" | "blob";

  codegenZod(): string {
    const parts = [this._codegenZodBase()];
    const { nullable, optional, default: defaultVal } = this._baseOptions;

    if (nullable) parts.push(".nullable()");
    if (optional) parts.push(".optional()");
    if (defaultVal !== undefined) {
      const val = typeof defaultVal === "string" ? `"${defaultVal}"` : JSON.stringify(defaultVal);
      parts.push(`.default(${val})`);
    }

    return parts.join("");
  }

  protected abstract _codegenZodBase(): string;

  protected _appendDrizzleConstraints(base: string): string {
    const parts = [base];
    if (this._databaseConstraints.primaryKey) parts.push(".primaryKey()");
    if (this._databaseConstraints.unique) parts.push(".unique()");
    // index() is applied at table level in Drizzle.
    return parts.join("");
  }
}

// ─── String Column ───────────────────────────────────────────────────────────

export class StringColumn extends Column<string> {
  readonly kind = "string" as const;

  min(length: number): this {
    this._zodOptions.min = length;
    return this;
  }

  max(length: number): this {
    this._zodOptions.max = length;
    return this;
  }

  length(exact: number): this {
    this._zodOptions.length = exact;
    return this;
  }

  email(): this {
    this._zodOptions.email = true;
    return this;
  }

  url(): this {
    this._zodOptions.url = true;
    return this;
  }

  regex(pattern: RegExp): this {
    this._zodOptions.regex = pattern;
    return this;
  }

  startsWith(prefix: string): this {
    this._zodOptions.startsWith = prefix;
    return this;
  }

  endsWith(suffix: string): this {
    this._zodOptions.endsWith = suffix;
    return this;
  }

  protected _toZodBase(): z.ZodString {
    let schema = z.string();
    const { email, url, min, max, length, regex, startsWith, endsWith } = this._zodOptions;
    if (email) schema = schema.email();
    if (url) schema = schema.url();
    if (min !== undefined) schema = schema.min(min as number);
    if (max !== undefined) schema = schema.max(max as number);
    if (length !== undefined) schema = schema.length(length as number);
    if (regex !== undefined) schema = schema.regex(regex as RegExp);
    if (startsWith !== undefined) schema = schema.startsWith(startsWith as string);
    if (endsWith !== undefined) schema = schema.endsWith(endsWith as string);
    return schema;
  }

  protected _codegenZodBase(): string {
    const parts = ["z.string()"];
    const { email, url, min, max, length, regex, startsWith, endsWith } = this._zodOptions;
    if (email) parts.push(".email()");
    if (url) parts.push(".url()");
    if (min !== undefined) parts.push(`.min(${min})`);
    if (max !== undefined) parts.push(`.max(${max})`);
    if (length !== undefined) parts.push(`.length(${length})`);
    if (regex !== undefined) parts.push(`.regex(${(regex as RegExp).toString()})`);
    if (startsWith !== undefined) parts.push(`.startsWith("${startsWith}")`);
    if (endsWith !== undefined) parts.push(`.endsWith("${endsWith}")`);
    return parts.join("");
  }

  codegenDrizzle(name: string): string {
    return this._appendDrizzleConstraints(`text("${name}")`);
  }

  codegenSQLite(): "text" {
    return "text";
  }
}

// ─── Number Column ───────────────────────────────────────────────────────────

export class NumberColumn extends Column<number> {
  readonly kind = "number" as const;

  min(value: number): this {
    this._zodOptions.min = value;
    return this;
  }

  max(value: number): this {
    this._zodOptions.max = value;
    return this;
  }

  int(): this {
    this._zodOptions.int = true;
    return this;
  }

  positive(): this {
    this._zodOptions.positive = true;
    return this;
  }

  nonnegative(): this {
    this._zodOptions.nonnegative = true;
    return this;
  }

  negative(): this {
    this._zodOptions.negative = true;
    return this;
  }

  nonpositive(): this {
    this._zodOptions.nonpositive = true;
    return this;
  }

  multipleOf(value: number): this {
    this._zodOptions.multipleOf = value;
    return this;
  }

  finite(): this {
    this._zodOptions.finite = true;
    return this;
  }

  safe(): this {
    this._zodOptions.safe = true;
    return this;
  }

  private _applyConstraints(schema: z.ZodNumber): z.ZodNumber {
    const {
      min,
      max,
      int,
      positive,
      nonnegative,
      negative,
      nonpositive,
      multipleOf,
      finite,
      safe,
    } = this._zodOptions;
    if (min !== undefined) schema = schema.min(min as number);
    if (max !== undefined) schema = schema.max(max as number);
    if (int) schema = schema.int();
    if (positive) schema = schema.positive();
    if (nonnegative) schema = schema.nonnegative();
    if (negative) schema = schema.negative();
    if (nonpositive) schema = schema.nonpositive();
    if (multipleOf !== undefined) schema = schema.multipleOf(multipleOf as number);
    if (finite) schema = schema.finite();
    if (safe) schema = schema.safe();
    return schema;
  }

  protected _toZodBase(): z.ZodNumber {
    return this._applyConstraints(z.number());
  }

  protected override _toCoercingZodBase(): z.ZodNumber {
    return this._applyConstraints(z.coerce.number());
  }

  protected _codegenZodBase(): string {
    const parts = ["z.number()"];
    const {
      min,
      max,
      int,
      positive,
      nonnegative,
      negative,
      nonpositive,
      multipleOf,
      finite,
      safe,
    } = this._zodOptions;
    if (min !== undefined) parts.push(`.min(${min})`);
    if (max !== undefined) parts.push(`.max(${max})`);
    if (int) parts.push(".int()");
    if (positive) parts.push(".positive()");
    if (nonnegative) parts.push(".nonnegative()");
    if (negative) parts.push(".negative()");
    if (nonpositive) parts.push(".nonpositive()");
    if (multipleOf !== undefined) parts.push(`.multipleOf(${multipleOf})`);
    if (finite) parts.push(".finite()");
    if (safe) parts.push(".safe()");
    return parts.join("");
  }

  codegenDrizzle(name: string): string {
    const colType = this._zodOptions.int ? "integer" : "real";
    return this._appendDrizzleConstraints(`${colType}("${name}")`);
  }

  codegenSQLite(): "integer" | "real" {
    return this._zodOptions.int ? "integer" : "real";
  }
}

// ─── Boolean Column ──────────────────────────────────────────────────────────

const TRUE_STRINGS = new Set(["true", "1", "yes", "y", "t"]);
const FALSE_STRINGS = new Set(["false", "0", "no", "n", "f"]);

export class BooleanColumn extends Column<boolean> {
  readonly kind = "boolean" as const;

  protected _toZodBase(): z.ZodBoolean {
    return z.boolean();
  }

  protected override _toCoercingZodBase(): z.ZodTypeAny {
    return z.preprocess((value) => {
      if (typeof value !== "string") return value;
      const lowered = value.trim().toLowerCase();
      if (TRUE_STRINGS.has(lowered)) return true;
      if (FALSE_STRINGS.has(lowered)) return false;
      return value;
    }, z.boolean());
  }

  protected _codegenZodBase(): string {
    return "z.boolean()";
  }

  codegenDrizzle(name: string): string {
    // SQLite has no boolean affinity; store 0/1.
    return this._appendDrizzleConstraints(`integer("${name}", { mode: "boolean" })`);
  }

  codegenSQLite(): "integer" {
    return "integer";
  }
}

// ─── Date Column ─────────────────────────────────────────────────────────────

export class DateColumn extends Column<Date> {
  readonly kind = "date" as const;

  min(date: Date): this {
    this._zodOptions.min = date;
    return this;
  }

  max(date: Date): this {
    this._zodOptions.max = date;
    return this;
  }

  private _applyConstraints(schema: z.ZodDate): z.ZodDate {
    const { min, max } = this._zodOptions;
    if (min !== undefined) schema = schema.min(min as Date);
    if (max !== undefined) schema = schema.max(max as Date);
    return schema;
  }

  protected _toZodBase(): z.ZodDate {
    return this._applyConstraints(z.date());
  }

  protected override _toCoercingZodBase(): z.ZodDate {
    return this._applyConstraints(z.coerce.date());
  }

  protected _codegenZodBase(): string {
    const parts = ["z.date()"];
    const { min, max } = this._zodOptions;
    if (min !== undefined) parts.push(`.min(new Date("${(min as Date).toISOString()}"))`);
    if (max !== undefined) parts.push(`.max(new Date("${(max as Date).toISOString()}"))`);
    return parts.join("");
  }

  codegenDrizzle(name: string): string {
    // Stored as an ISO string.
    return this._appendDrizzleConstraints(`text("${name}")`);
  }

  codegenSQLite(): "text" {
    return "text";
  }
}

// ─── Enum Column ─────────────────────────────────────────────────────────────

export class EnumColumn<T extends readonly [string, ...string[]]> extends Column<T[number]> {
  readonly kind = "enum" as const;
  private _values: T;

  constructor(values: T) {
    super();
    this._values = values;
  }

  getValues(): T {
    return this._values;
  }

  override summary(): ColumnSummary {
    return { ...super.summary(), values: [...this._values] };
  }

  protected _toZodBase(): z.ZodTypeAny {
    return z.enum(this._values as unknown as [string, ...string[]]);
  }

  protected _codegenZodBase(): string {
    const values = this._values.map((v) => `"${v}"`).join(", ");
    return `z.enum([${values}])`;
  }

  codegenDrizzle(name: string): string {
    return this._appendDrizzleConstraints(`text("${name}")`);
  }

  codegenSQLite(): "text" {
    return "text";
  }
}

// ─── JSON Column ─────────────────────────────────────────────────────────────

export class JSONColumn extends Column<unknown> {
  readonly kind = "json" as const;

  protected _toZodBase(): z.ZodUnknown {
    return z.unknown();
  }

  protected override _toCoercingZodBase(): z.ZodTypeAny {
    return z.preprocess((value) => {
      if (typeof value !== "string") return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }, z.unknown());
  }

  protected _codegenZodBase(): string {
    return "z.unknown()";
  }

  codegenDrizzle(name: string): string {
    return this._appendDrizzleConstraints(`text("${name}", { mode: "json" })`);
  }

  codegenSQLite(): "text" {
    return "text";
  }
}

// ─── Array Column ────────────────────────────────────────────────────────────

export class ArrayColumn<T extends Column> extends Column<ReturnType<T["toZod"]>["_output"][]> {
  readonly kind = "array" as const;
  private _element: T;

  constructor(element: T) {
    super();
    this._element = element;
  }

  getElement(): T {
    return this._element;
  }

  min(length: number): this {
    this._zodOptions.min = length;
    return this;
  }

  max(length: number): this {
    this._zodOptions.max = length;
    return this;
  }

  length(exact: number): this {
    this._zodOptions.length = exact;
    return this;
  }

  nonempty(): this {
    this._zodOptions.nonempty = true;
    return this;
  }

  private _applyConstraints(schema: z.ZodArray<z.ZodTypeAny>): z.ZodTypeAny {
    const { min, max, length, nonempty } = this._zodOptions;
    let result: z.ZodTypeAny = schema;
    if (min !== undefined) result = schema.min(min as number);
    if (max !== undefined) result = (result as z.ZodArray<z.ZodTypeAny>).max(max as number);
    if (length !== undefined)
      result = (result as z.ZodArray<z.ZodTypeAny>).length(length as number);
    if (nonempty) result = (result as z.ZodArray<z.ZodTypeAny>).nonempty();
    return result;
  }

  protected _toZodBase(): z.ZodTypeAny {
    return this._applyConstraints(z.array(this._element.toZod()));
  }

  protected override _toCoercingZodBase(): z.ZodTypeAny {
    const inner = this._applyConstraints(z.array(this._element.toCoercingZod()));
    return z.preprocess((value) => {
      if (typeof value !== "string") return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }, inner);
  }

  protected _codegenZodBase(): string {
    const parts = [`z.array(${this._element.codegenZod()})`];
    const { min, max, length, nonempty } = this._zodOptions;
    if (min !== undefined) parts.push(`.min(${min})`);
    if (max !== undefined) parts.push(`.max(${max})`);
    if (length !== undefined) parts.push(`.length(${length})`);
    if (nonempty) parts.push(".nonempty()");
    return parts.join("");
  }

  codegenDrizzle(name: string): string {
    return this._appendDrizzleConstraints(`text("${name}", { mode: "json" })`);
  }

  codegenSQLite(): "text" {
    return "text";
  }
}

// ─── Object Columns ──────────────────────────────────────────────────────────

/** A map of property names to column definitions. */
export type ColumnShape = Record<string, Column>;

/** The output type of a ColumnShape. */
export type InferColumnShapeOutput<T extends ColumnShape> = {
  [K in keyof T]: ReturnType<T[K]["toZod"]>["_output"];
};

function shapeToZod(shape: ColumnShape, coercing: boolean): Record<string, z.ZodTypeAny> {
  const zodShape: Record<string, z.ZodTypeAny> = {};
  for (const [key, column] of Object.entries(shape)) {
    zodShape[key] = coercing ? column.toCoercingZod() : column.toZod();
  }
  return zodShape;
}

function parseJsonIfString(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/** Object column with a fixed shape; extra keys are rejected. */
export class ObjectColumn<T extends ColumnShape> extends Column<InferColumnShapeOutput<T>> {
  readonly kind = "object" as const;
  private _shape: T;

  constructor(shape: T) {
    super();
    this._shape = shape;
  }

  getShape(): T {
    return this._shape;
  }

  protected _toZodBase(): z.ZodTypeAny {
    return z.object(shapeToZod(this._shape, false)).strict();
  }

  protected override _toCoercingZodBase(): z.ZodTypeAny {
    return z.preprocess(parseJsonIfString, z.object(shapeToZod(this._shape, true)).strict());
  }

  protected _codegenZodBase(): string {
    const entries = Object.entries(this._shape)
      .map(([key, column]) => `${key}: ${column.codegenZod()}`)
      .join(", ");
    return `z.object({ ${entries} }).strict()`;
  }

  codegenDrizzle(name: string): string {
    return this._appendDrizzleConstraints(`text("${name}", { mode: "json" })`);
  }

  codegenSQLite(): "text" {
    return "text";
  }
}

/** Object column with a fixed shape; extra keys are kept. */
export class LooseObjectColumn<T extends ColumnShape> extends Column<
  InferColumnShapeOutput<T> & Record<string, unknown>
> {
  readonly kind = "looseObject" as const;
  private _shape: T;

  constructor(shape: T) {
    super();
    this._shape = shape;
  }

  getShape(): T {
    return this._shape;
  }

  protected _toZodBase(): z.ZodTypeAny {
    return z.object(shapeToZod(this._shape, false)).passthrough();
  }

  protected override _toCoercingZodBase(): z.ZodTypeAny {
    return z.preprocess(parseJsonIfString, z.object(shapeToZod(this._shape, true)).passthrough());
  }

  protected _codegenZodBase(): string {
    const entries = Object.entries(this._shape)
      .map(([key, column]) => `${key}: ${column.codegenZod()}`)
      .join(", ");
    return `z.object({ ${entries} }).passthrough()`;
  }

  codegenDrizzle(name: string): string {
    return this._appendDrizzleConstraints(`text("${name}", { mode: "json" })`);
  }

  codegenSQLite(): "text" {
    return "text";
  }
}

// ─── Factory Functions ───────────────────────────────────────────────────────

export function string(): StringColumn {
  return new StringColumn();
}

export function number(): NumberColumn {
  return new NumberColumn();
}

export function boolean(): BooleanColumn {
  return new BooleanColumn();
}

export function date(): DateColumn {
  return new DateColumn();
}

export function enumColumn<const T extends readonly [string, ...string[]]>(
  values: T,
): EnumColumn<T> {
  return new EnumColumn(values);
}

export function json(): JSONColumn {
  return new JSONColumn();
}

export function array<T extends Column>(element: T): ArrayColumn<T> {
  return new ArrayColumn(element);
}

export function object<T extends ColumnShape>(shape: T): ObjectColumn<T> {
  return new ObjectColumn(shape);
}

export function looseObject<T extends ColumnShape>(shape: T): LooseObjectColumn<T> {
  return new LooseObjectColumn(shape);
}
