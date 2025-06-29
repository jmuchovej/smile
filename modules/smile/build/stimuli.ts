/**
 * Build-time loading of stimuli datasets.
 *
 * Resolves each dataset's sources under the stimuli directory, reads them
 * with Polars, validates every row against the declared schema, and returns
 * JSON-safe rows ready to embed in the client bundle.
 */
import { existsSync, statSync } from "node:fs";

import pl from "nodejs-polars";
import { extname, relative, resolve } from "pathe";
import { glob, isDynamicPattern } from "tinyglobby";

import type { SmileConfig } from "../builder/config";
import type { Stimuli } from "../builder/stimuli";
import type { Row } from "../builder/table";

// ─── Types ───────────────────────────────────────────────────────────────────

export class StimuliLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StimuliLoadError";
  }
}

export type SourceFormat = "csv" | "tsv" | "json" | "jsonl" | "parquet" | "ipc" | "avro";

/** Extension to reader mapping. */
export const SUPPORTED_EXTENSIONS: Record<string, SourceFormat> = {
  ".csv": "csv",
  ".tsv": "tsv",
  ".json": "json",
  ".jsonl": "jsonl",
  ".ndjson": "jsonl",
  ".parquet": "parquet",
  ".arrow": "ipc",
  ".ipc": "ipc",
  ".feather": "ipc",
  ".avro": "avro",
};

export interface ResolvedSourceFile {
  /** Absolute path. */
  absolute: string;
  /** Path relative to the stimuli directory, for messages and manifests. */
  relative: string;
  format: SourceFormat;
}

export interface SourceRows {
  file: ResolvedSourceFile;
  rows: Row[];
  /** True for delimited text, where every cell is a string to be coerced. */
  delimited: boolean;
}

export interface LoadedStimuli {
  name: string;
  /** Source files in read order, relative to the stimuli directory. */
  files: string[];
  trialIDColumn: string;
  /** Validated rows in source order, JSON-safe. */
  rows: Row[];
  /** Trial identifiers in source order. */
  trialIds: Array<string | number>;
}

// ─── Source Resolution ───────────────────────────────────────────────────────

function formatFor(file: string): SourceFormat | null {
  return SUPPORTED_EXTENSIONS[extname(file).toLowerCase()] ?? null;
}

export function supportedExtensionList(): string {
  return Object.keys(SUPPORTED_EXTENSIONS).join(", ");
}

/**
 * Resolves a dataset's `source` entries to files. Each entry may be a path
 * or a glob; matches are read in lexical order and duplicates dropped.
 *
 * @throws StimuliLoadError for an entry matching nothing or an unsupported extension
 */
export async function resolveSources(
  stimuli: Stimuli,
  stimuliDir: string,
): Promise<ResolvedSourceFile[]> {
  const seen = new Set<string>();
  const files: ResolvedSourceFile[] = [];

  for (const pattern of stimuli.sources) {
    let matches: string[];
    if (isDynamicPattern(pattern)) {
      matches = await glob(pattern, { cwd: stimuliDir, absolute: true, onlyFiles: true });
      matches.sort();
    } else {
      const absolute = resolve(stimuliDir, pattern);
      matches = existsSync(absolute) && statSync(absolute).isFile() ? [absolute] : [];
    }

    if (matches.length === 0) {
      throw new StimuliLoadError(
        `Stimuli "${stimuli.name}": source "${pattern}" matched no files under ${stimuliDir}`,
      );
    }

    for (const absolute of matches) {
      if (seen.has(absolute)) continue;
      seen.add(absolute);
      const format = formatFor(absolute);
      const rel = relative(stimuliDir, absolute);
      if (!format) {
        throw new StimuliLoadError(
          `Stimuli "${stimuli.name}": unsupported file format for "${rel}". Supported extensions: ${supportedExtensionList()}`,
        );
      }
      files.push({ absolute, relative: rel, format });
    }
  }

  return files;
}

// ─── Reading ─────────────────────────────────────────────────────────────────

function readFrame(file: ResolvedSourceFile): pl.DataFrame {
  switch (file.format) {
    case "csv":
      // No type inference: every cell arrives as text and the column
      // definitions decide how to coerce it.
      return pl.readCSV(file.absolute, { inferSchemaLength: 0 });
    case "tsv":
      return pl.readCSV(file.absolute, { inferSchemaLength: 0, sep: "\t" });
    case "json":
      return pl.readJSON(file.absolute, { format: "json" });
    case "jsonl":
      return pl.readJSON(file.absolute, { format: "lines" });
    case "parquet":
      return pl.readParquet(file.absolute);
    case "ipc":
      try {
        return pl.readIPC(file.absolute);
      } catch {
        return pl.readIPCStream(file.absolute);
      }
    case "avro":
      return pl.readAvro(file.absolute);
  }
}

/** Reads one source file into plain records. */
export function readSourceRows(file: ResolvedSourceFile): SourceRows {
  let frame: pl.DataFrame;
  try {
    frame = readFrame(file);
  } catch (error) {
    const reason = error instanceof Error ? error.message.split("\n")[0] : String(error);
    throw new StimuliLoadError(`Failed to read "${file.relative}": ${reason}`);
  }
  const delimited = file.format === "csv" || file.format === "tsv";
  return { file, rows: frame.toRecords() as Row[], delimited };
}

// ─── Validation ──────────────────────────────────────────────────────────────

interface ZodLikeIssue {
  path?: Array<string | number>;
  message: string;
}

function describeIssue(issue: ZodLikeIssue): string {
  const column = issue.path && issue.path.length > 0 ? `column "${issue.path.join(".")}"` : "row";
  return `${column}: ${issue.message}`;
}

/** Makes a validated row JSON-safe (dates become ISO strings). */
function toJsonSafe(row: Row): Row {
  return JSON.parse(JSON.stringify(row)) as Row;
}

/**
 * Validates rows from one or more files against the dataset's schema.
 *
 * @throws StimuliLoadError naming the file, row, column and reason of the
 *   first failure, or the duplicated trial identifier
 */
export function validateRows(stimuli: Stimuli, sources: SourceRows[]): LoadedStimuli {
  const table = stimuli.table;
  const strict = table.toZod();
  const coercing = table.toCoercingZod();
  const trialIDColumn = stimuli.trialIDColumn;
  const summaries = table.summarizeColumns();
  // Columns where a reader's null should mean "absent" rather than a value.
  const absentWhenNull = new Set(
    Object.entries(summaries)
      .filter(([, c]) => (c.optional || c.hasDefault) && !c.nullable)
      .map(([name]) => name),
  );

  const rows: Row[] = [];
  const trialIds: Array<string | number> = [];
  const seen = new Map<string, string>();

  for (const source of sources) {
    const schema = source.delimited ? coercing : strict;
    source.rows.forEach((raw, i) => {
      const rowNumber = i + 1;
      const input = source.delimited ? blankNulls(raw) : dropAbsent(raw, absentWhenNull);
      const result = schema.safeParse(input);
      if (!result.success) {
        const issues = (result.error.issues as ZodLikeIssue[]).map(describeIssue).join("; ");
        throw new StimuliLoadError(
          `Stimuli "${stimuli.name}": invalid row in "${source.file.relative}" (row ${rowNumber}): ${issues}`,
        );
      }

      const row = toJsonSafe(result.data as Row);
      const id = row[trialIDColumn] as string | number;
      const key = String(id);
      const where = `${source.file.relative} row ${rowNumber}`;
      const previous = seen.get(key);
      if (previous !== undefined) {
        throw new StimuliLoadError(
          `Stimuli "${stimuli.name}": duplicate trial identifier "${key}" (${trialIDColumn}) at ${where}; first seen at ${previous}`,
        );
      }
      seen.set(key, where);

      rows.push(row);
      trialIds.push(id);
    });
  }

  return {
    name: stimuli.name,
    files: sources.map((s) => s.file.relative),
    trialIDColumn,
    rows,
    trialIds,
  };
}

/**
 * Typed readers fill columns missing from a record with null; for optional
 * or defaulted columns that means "absent", so the key is dropped.
 */
function dropAbsent(row: Row, absentWhenNull: Set<string>): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null && absentWhenNull.has(key)) continue;
    out[key] = value;
  }
  return out;
}

/** Delimited readers report empty cells as null; treat them as blank text. */
function blankNulls(row: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = value === null ? "" : value;
  }
  return out;
}

// ─── Entry Points ────────────────────────────────────────────────────────────

/** Loads and validates one dataset. */
export async function loadStimuli(stimuli: Stimuli, stimuliDir: string): Promise<LoadedStimuli> {
  const files = await resolveSources(stimuli, stimuliDir);
  const sources = files.map(readSourceRows);
  return validateRows(stimuli, sources);
}

/**
 * Loads every dataset referenced by the configuration, keyed by dataset
 * name. Datasets shared between experiments are loaded once.
 */
export async function loadAllStimuli(
  config: SmileConfig,
  stimuliDir: string,
): Promise<Record<string, LoadedStimuli>> {
  const out: Record<string, LoadedStimuli> = {};
  for (const experiment of config.experiments) {
    const { stimuli } = experiment;
    if (stimuli.name in out) continue;
    out[stimuli.name] = await loadStimuli(stimuli, stimuliDir);
  }
  return out;
}
