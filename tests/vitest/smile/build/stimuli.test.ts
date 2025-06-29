import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import pl from "nodejs-polars";
import { beforeAll, describe, expect, it } from "vitest";

import {
  StimuliLoadError,
  loadAllStimuli,
  loadStimuli,
  resolveSources,
  supportedExtensionList,
} from "../../../../modules/smile/build/stimuli";
import { SmileConfig, s } from "../../../../modules/smile/builder";

const stimuliDir = resolve(__dirname, "../fixtures/stimuli");

const stroopSchema = () =>
  s.schema({
    index: s.number().trialID().int().min(1),
    word: s.string().min(1),
    color: s.enum(["red", "green", "blue"]),
    rt: s.number().optional(),
    note: s.string().optional(),
  });

describe("resolveSources", () => {
  it("resolves a single file relative to the stimuli directory", async () => {
    const stimuli = s.stimuli({ name: "stroop", source: "stroop.csv", schema: stroopSchema() });
    const files = await resolveSources(stimuli, stimuliDir);
    expect(files.map((f) => f.relative)).toEqual(["stroop.csv"]);
    expect(files[0]?.format).toBe("csv");
  });

  it("expands a glob in lexical order and drops duplicates", async () => {
    const stimuli = s.stimuli({
      name: "gonogo",
      source: ["gonogo/*.jsonl", "gonogo/part1.jsonl"],
      schema: { id: s.string().trialID() },
    });
    const files = await resolveSources(stimuli, stimuliDir);
    expect(files.map((f) => f.relative)).toEqual(["gonogo/part1.jsonl", "gonogo/part2.jsonl"]);
  });

  it("names the stimuli and the pattern when nothing matches", async () => {
    const stimuli = s.stimuli({
      name: "flanker",
      source: "flanker.csv",
      schema: { id: s.number().trialID() },
    });
    await expect(resolveSources(stimuli, stimuliDir)).rejects.toThrow(
      /Stimuli "flanker": source "flanker.csv" matched no files/,
    );
    const globbed = s.stimuli({
      name: "flanker",
      source: "nothing/*.csv",
      schema: { id: s.number().trialID() },
    });
    await expect(resolveSources(globbed, stimuliDir)).rejects.toThrow(StimuliLoadError);
  });

  it("rejects unsupported extensions and lists the supported ones", async () => {
    const stimuli = s.stimuli({
      name: "sheet",
      source: "unsupported.xlsx",
      schema: { id: s.number().trialID() },
    });
    await expect(resolveSources(stimuli, stimuliDir)).rejects.toThrow(
      `unsupported file format for "unsupported.xlsx". Supported extensions: ${supportedExtensionList()}`,
    );
    expect(supportedExtensionList()).toContain(".parquet");
    expect(supportedExtensionList()).toContain(".avro");
  });
});

describe("loadStimuli", () => {
  it("coerces CSV cells to the declared types and treats blank cells as absent", async () => {
    const stimuli = s.stimuli({ name: "stroop", source: "stroop.csv", schema: stroopSchema() });
    const loaded = await loadStimuli(stimuli, stimuliDir);
    expect(loaded.files).toEqual(["stroop.csv"]);
    expect(loaded.trialIDColumn).toBe("index");
    expect(loaded.trialIds).toEqual([1, 2, 12]);
    expect(loaded.rows[0]).toEqual({ index: 1, word: "SHIP", color: "red", rt: 512 });
    expect(loaded.rows[1]).toEqual({
      index: 2,
      word: "MONKEY",
      color: "green",
      note: "first note",
    });
    expect(loaded.rows[2]?.rt).toBe(433.5);
  });

  it("reads JSONL files with native types and concatenates a glob", async () => {
    const stimuli = s.stimuli({
      name: "gonogo",
      source: "gonogo/*.jsonl",
      schema: s.schema({ id: s.string().trialID(), stimulus: s.enum(["R", "P"]), go: s.boolean() }),
    });
    const loaded = await loadStimuli(stimuli, stimuliDir);
    expect(loaded.files).toEqual(["gonogo/part1.jsonl", "gonogo/part2.jsonl"]);
    expect(loaded.trialIds).toEqual(["a1", "a2", "b1"]);
    expect(loaded.rows[1]).toEqual({ id: "a2", stimulus: "P", go: false });
  });

  it("applies defaults and keeps optional columns absent from JSONL rows", async () => {
    const stimuli = s.stimuli({
      name: "optional",
      source: "optional.jsonl",
      schema: s.schema({
        id: s.number().trialID(),
        label: s.string(),
        note: s.string().optional(),
        weight: s.number().default(1),
      }),
    });
    const loaded = await loadStimuli(stimuli, stimuliDir);
    expect(loaded.rows).toEqual([
      { id: 1, label: "with note", note: "hello", weight: 2 },
      { id: 2, label: "without note", weight: 1 },
    ]);
  });

  it("reports an enum violation with file, row and column", async () => {
    const stimuli = s.stimuli({ name: "stroop", source: "bad-enum.csv", schema: stroopSchema() });
    await expect(loadStimuli(stimuli, stimuliDir)).rejects.toThrow(
      /Stimuli "stroop": invalid row in "bad-enum.csv" \(row 2\): column "color": /,
    );
  });

  it("reports a duplicate trial identifier with both locations", async () => {
    const stimuli = s.stimuli({ name: "stroop", source: "dup-id.csv", schema: stroopSchema() });
    await expect(loadStimuli(stimuli, stimuliDir)).rejects.toThrow(
      /duplicate trial identifier "1" \(index\) at dup-id.csv row 3; first seen at dup-id.csv row 1/,
    );
  });

  describe("parquet", () => {
    let dir: string;
    beforeAll(() => {
      dir = mkdtempSync(join(tmpdir(), "smile-stimuli-"));
      pl.DataFrame({
        index: [1, 2, 3],
        target: ["left", "right", "left"],
        rt: [1.5, 2.25, 3],
        valid: [true, false, true],
      }).writeParquet(join(dir, "flanker.parquet"));
    });

    it("reads a Parquet source with native types", async () => {
      const stimuli = s.stimuli({
        name: "flanker",
        source: "flanker.parquet",
        schema: s.schema({
          index: s.number().trialID().int(),
          target: s.enum(["left", "right"]),
          rt: s.number(),
          valid: s.boolean(),
        }),
      });
      const loaded = await loadStimuli(stimuli, dir);
      expect(loaded.rows).toEqual([
        { index: 1, target: "left", rt: 1.5, valid: true },
        { index: 2, target: "right", rt: 2.25, valid: false },
        { index: 3, target: "left", rt: 3, valid: true },
      ]);
    });
  });
});

describe("loadAllStimuli", () => {
  it("loads each dataset once, keyed by name", async () => {
    const stroop = s.stimuli({ name: "stroop", source: "stroop.csv", schema: stroopSchema() });
    const gonogo = s.stimuli({
      name: "gonogo",
      source: "gonogo/*.jsonl",
      schema: s.schema({ id: s.string().trialID(), stimulus: s.string(), go: s.boolean() }),
    });
    const config = SmileConfig.create({
      experiments: [
        s.experiment("stroop", "pilot", { stimuli: stroop }),
        s.experiment("stroop", "full", { stimuli: stroop }),
        s.experiment("gonogo", "pilot", { stimuli: gonogo }),
      ],
    });
    const all = await loadAllStimuli(config, stimuliDir);
    expect(Object.keys(all)).toEqual(["stroop", "gonogo"]);
    expect(all.stroop?.rows).toHaveLength(3);
    expect(all.gonogo?.rows).toHaveLength(3);
  });
});
