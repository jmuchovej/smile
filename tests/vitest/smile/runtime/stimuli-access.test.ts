import { describe, expect, it } from "vitest";

import {
  UnknownDatasetError,
  createStimuliAccess,
  type EmbeddedStimuli,
} from "../../../../modules/smile/runtime/stimuli/access";

const embedded: EmbeddedStimuli = {
  active: "stroop",
  datasets: {
    stroop: {
      name: "stroop",
      files: ["stroop.csv"],
      trialIDColumn: "index",
      rows: [
        { index: 1, word: "SHIP", color: "red" },
        { index: 7, word: "GREEN", color: "red" },
        { index: 3, word: "ZAMBONI", color: "blue" },
      ],
    },
    gonogo: {
      name: "gonogo",
      files: ["gonogo/part1.jsonl"],
      trialIDColumn: "id",
      rows: [{ id: "a1", stimulus: "R" }],
    },
  },
};

describe("createStimuliAccess", () => {
  it("defaults to the active experiment's dataset", () => {
    const access = createStimuliAccess(embedded);
    expect(access.name).toBe("stroop");
    expect(access.count).toBe(3);
    expect(access.trialIDColumn).toBe("index");
    expect(access.trialIds).toEqual([1, 7, 3]);
    expect(access.rows[1]).toEqual({ index: 7, word: "GREEN", color: "red" });
  });

  it("looks up rows by trial identifier, tolerating string and number forms", () => {
    const access = createStimuliAccess(embedded);
    expect(access.byTrialId(7)).toEqual({ index: 7, word: "GREEN", color: "red" });
    expect(access.byTrialId("7")).toEqual({ index: 7, word: "GREEN", color: "red" });
    expect(access.byTrialId(99)).toBeUndefined();
    expect(access.indexOf(3)).toBe(2);
    expect(access.indexOf("nope")).toBe(-1);
  });

  it("selects a named dataset", () => {
    const access = createStimuliAccess(embedded, "gonogo");
    expect(access.trialIds).toEqual(["a1"]);
    expect(access.byTrialId("a1")?.stimulus).toBe("R");
  });

  it("raises a named error listing the available datasets", () => {
    expect(() => createStimuliAccess(embedded, "nonexistent")).toThrow(UnknownDatasetError);
    expect(() => createStimuliAccess(embedded, "nonexistent")).toThrow(
      'Unknown stimuli dataset "nonexistent". Available datasets: stroop, gonogo',
    );
  });

  it("raises when nothing is configured and no name is given", () => {
    expect(() => createStimuliAccess({ active: null, datasets: {} })).toThrow(
      /Unknown stimuli dataset "\(active\)". Available datasets: \(none\)/,
    );
  });
});
