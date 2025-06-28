import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  Experiment,
  SmileConfig,
  Stimuli,
  defineSmileConfig,
  s,
} from "../../../../modules/smile/builder";

const stroopStimuli = s.stimuli({
  name: "stroop",
  source: "stroop.csv",
  schema: s.schema({
    index: s.number().trialID().int().min(1),
    word: s.string().min(1),
    color: s.enum(["red", "green", "blue"]),
  }),
});

describe("s.schema", () => {
  it("returns the columns when exactly one trialID is present", () => {
    const cols = { id: s.number().trialID(), w: s.string() };
    expect(s.schema(cols)).toBe(cols);
  });

  it("rejects a schema with no trialID column", () => {
    expect(() => s.schema({ w: s.string() })).toThrow(ZodError);
    expect(() => s.schema({ w: s.string() })).toThrow(/exactly one column marked as trialID/);
  });

  it("rejects a schema with two trialID columns", () => {
    expect(() => s.schema({ a: s.number().trialID(), b: s.number().trialID() })).toThrow(
      /multiple trialID columns: a, b/,
    );
  });

  it("rejects values that are not column definitions", () => {
    expect(() => s.schema({ a: s.number().trialID(), b: "text" as never })).toThrow(
      /Expected a column definition/,
    );
  });
});

describe("s.stimuli", () => {
  it("creates a Stimuli with derived properties", () => {
    expect(stroopStimuli).toBeInstanceOf(Stimuli);
    expect(stroopStimuli.id).toBe("stroop");
    expect(stroopStimuli.sources).toEqual(["stroop.csv"]);
    expect(stroopStimuli.trialIDColumn).toBe("index");
    expect(stroopStimuli.table.getName()).toBe("_stimuli-stroop");
    expect(stroopStimuli.parseRow({ index: 1, word: "RED", color: "red" })).toEqual({
      index: 1,
      word: "RED",
      color: "red",
    });
    expect(stroopStimuli.safeParseRow({ index: 1, word: "RED", color: "pink" }).success).toBe(
      false,
    );
  });

  it("accepts a list of sources", () => {
    const multi = s.stimuli({
      name: "gonogo",
      source: ["gonogo/part1.jsonl", "gonogo/part2.jsonl"],
      schema: { index: s.number().trialID() },
    });
    expect(multi.sources).toHaveLength(2);
  });

  it("rejects an empty name or source", () => {
    expect(() =>
      s.stimuli({ name: "", source: "x.csv", schema: { i: s.number().trialID() } }),
    ).toThrow(ZodError);
    expect(() => s.stimuli({ name: "x", source: "", schema: { i: s.number().trialID() } })).toThrow(
      ZodError,
    );
  });

  it("rejects a schema without a trialID even when s.schema is bypassed", () => {
    expect(() => s.stimuli({ name: "x", source: "x.csv", schema: { w: s.string() } })).toThrow(
      /exactly one column marked as trialID/,
    );
  });
});

describe("s.experiment", () => {
  it("builds a name@version identifier", () => {
    const exp = s.experiment("stroop", "pilot", { stimuli: stroopStimuli });
    expect(exp).toBeInstanceOf(Experiment);
    expect(exp.id).toBe("stroop@pilot");
    expect(exp.name).toBe("stroop");
    expect(exp.version).toBe("pilot");
  });

  it("applies defaults for randomizer, allowRepeats and autoSave", () => {
    const exp = s.experiment("stroop", "pilot", { stimuli: stroopStimuli });
    expect(exp.randomizer).toBe("shuffle");
    expect(exp.allowRepeats).toBe(false);
    expect(exp.autoSave).toBe(true);
    expect(exp.services).toEqual([]);
    expect(exp.extra).toEqual({});
  });

  it("keeps explicit settings and extra metadata", () => {
    const exp = s.experiment("stroop", "full", {
      stimuli: stroopStimuli,
      services: ["prolific"],
      randomizer: "none",
      allowRepeats: true,
      autoSave: false,
      extra: { compensation: "$3.00" },
    });
    expect(exp.hasService("prolific")).toBe(true);
    expect(exp.hasService("mturk")).toBe(false);
    expect(exp.randomizer).toBe("none");
    expect(exp.getExtra<string>("compensation")).toBe("$3.00");
  });

  it("rejects empty names, empty versions and non-builder stimuli", () => {
    expect(() => s.experiment("", "pilot", { stimuli: stroopStimuli })).toThrow(/name is required/);
    expect(() => s.experiment("stroop", "", { stimuli: stroopStimuli })).toThrow(
      /version is required/,
    );
    expect(() =>
      s.experiment("stroop", "pilot", { stimuli: { name: "x" } as unknown as Stimuli }),
    ).toThrow(/created with s.stimuli\(\)/);
  });
});

describe("defineSmileConfig and SmileConfig", () => {
  const pilot = s.experiment("stroop", "pilot", { stimuli: stroopStimuli });
  const full = s.experiment("stroop", "full", { stimuli: stroopStimuli });

  it("returns a plain definition and resolves lookups", () => {
    const definition = defineSmileConfig({
      activeExperiment: "stroop@pilot",
      experiments: [pilot, full],
    });
    expect(definition).toEqual({ activeExperiment: "stroop@pilot", experiments: [pilot, full] });

    const config = SmileConfig.create(definition);
    expect(config.active).toBe("stroop@pilot");
    expect(config.getActive()).toBe(pilot);
    expect(config.get("stroop@full")).toBe(full);
    expect(config.has("stroop@nope")).toBe(false);
    expect(config.getExperimentIds()).toEqual(["stroop@pilot", "stroop@full"]);
    expect(config.getByName("stroop")).toEqual([pilot, full]);
    expect(config.getLatestByName("stroop")).toBe(full);
  });

  it("defaults the active experiment to the first one when omitted", () => {
    const definition = defineSmileConfig({ experiments: [full, pilot] });
    expect(definition.activeExperiment).toBeUndefined();
    expect(SmileConfig.create(definition).active).toBe("stroop@full");
  });

  it("rejects duplicate experiment identifiers", () => {
    // ZodError messages are JSON, so quotes inside them are escaped.
    expect(() => defineSmileConfig({ experiments: [pilot, pilot] })).toThrow(
      /Duplicate experiment ID: \\"stroop@pilot\\"/,
    );
  });

  it("rejects an unknown active experiment and lists the available ones", () => {
    expect(() =>
      defineSmileConfig({ activeExperiment: "flanker@v2", experiments: [pilot, full] }),
    ).toThrow(/\\"flanker@v2\\" not found\. Available: stroop@pilot, stroop@full/);
  });

  it("rejects an empty experiment list and non-builder experiments", () => {
    expect(() => defineSmileConfig({ experiments: [] })).toThrow(/At least one experiment/);
    expect(() =>
      defineSmileConfig({ experiments: [{ id: "x" } as unknown as Experiment] }),
    ).toThrow(/created with s.experiment\(\)/);
  });

  it("is also reachable through the s namespace", () => {
    expect(s.defineSmileConfig).toBe(defineSmileConfig);
    expect(s.config({ experiments: [pilot] })).toBeInstanceOf(SmileConfig);
  });
});
