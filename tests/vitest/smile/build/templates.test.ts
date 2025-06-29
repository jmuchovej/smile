import { describe, expect, it } from "vitest";

import {
  columnTypeText,
  rowInterfaceName,
  stimuliModuleContents,
  stimuliTypesContents,
} from "../../../../modules/smile/build/templates";
import { SmileConfig, s } from "../../../../modules/smile/builder";

const stroop = s.stimuli({
  name: "stroop",
  source: "stroop.csv",
  schema: s.schema({
    index: s.number().trialID().int(),
    word: s.string(),
    color: s.enum(["red", "green", "blue"]),
    rt: s.number().optional(),
    note: s.string().nullable(),
    shown: s.date(),
    meta: s.json(),
    tags: s.array(s.string()),
    layout: s.object({ x: s.number() }),
    weight: s.number().default(1),
    "odd-name": s.boolean(),
  }),
});

const config = SmileConfig.create({
  experiments: [
    s.experiment("stroop", "pilot", { stimuli: stroop }),
    s.experiment("stroop", "full", { stimuli: stroop }),
  ],
});

describe("stimuliModuleContents", () => {
  it("embeds rows keyed by dataset name", () => {
    const source = stimuliModuleContents({
      active: "stroop",
      datasets: {
        stroop: {
          name: "stroop",
          files: ["stroop.csv"],
          trialIDColumn: "index",
          rows: [{ index: 1, word: "SHIP" }],
          trialIds: [1],
        },
      },
    });
    expect(source).toContain('export const active = "stroop";');
    expect(source).toContain('"trialIDColumn": "index"');
    expect(source).toContain('"word": "SHIP"');
    expect(source).not.toContain("trialIds");
  });

  it("emits an empty module when nothing is configured", () => {
    const source = stimuliModuleContents({ active: null, datasets: {} });
    expect(source).toContain("export const active = null;");
    expect(source).toContain("export const datasets = {};");
  });
});

describe("stimuliTypesContents", () => {
  it("maps column kinds to TypeScript types", () => {
    expect(
      columnTypeText({
        kind: "string",
        optional: false,
        nullable: false,
        hasDefault: false,
        roles: [],
      }),
    ).toBe("string");
    expect(
      columnTypeText({
        kind: "enum",
        optional: false,
        nullable: true,
        hasDefault: false,
        roles: [],
        values: ["a", "b"],
      }),
    ).toBe('"a" | "b" | null');
    expect(
      columnTypeText({
        kind: "date",
        optional: false,
        nullable: false,
        hasDefault: false,
        roles: [],
      }),
    ).toBe("string");
    expect(rowInterfaceName("go-nogo task")).toBe("GoNogoTaskRow");
  });

  it("emits one interface per dataset and the rows map", () => {
    const source = stimuliTypesContents(config, "stroop");
    expect(source).toContain("export interface StroopRow {");
    expect(source).toContain("  index: number;");
    expect(source).toContain('  color: "red" | "green" | "blue";');
    expect(source).toContain("  rt?: number;");
    expect(source).toContain("  note: string | null;");
    expect(source).toContain("  shown: string;");
    expect(source).toContain("  meta: unknown;");
    expect(source).toContain("  tags: unknown[];");
    expect(source).toContain("  layout: Record<string, unknown>;");
    expect(source).toContain("  weight: number;");
    expect(source).toContain('  "odd-name": boolean;');
    expect(source).toContain('  "stroop": StroopRow;');
    expect(source).toContain('export type ActiveDataset = "stroop";');
    expect(source.match(/export interface StroopRow/g)).toHaveLength(1);
  });

  it("declares nothing active when unconfigured", () => {
    const source = stimuliTypesContents(null, null);
    expect(source).toContain("export interface StimuliRows {\n}");
    expect(source).toContain("export type ActiveDataset = never;");
  });
});
