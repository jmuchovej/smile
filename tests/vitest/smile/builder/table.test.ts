import { describe, expect, it } from "vitest";

import { SmileTable, s } from "../../../../modules/smile/builder";

function everyColumnTable(): SmileTable {
  return new SmileTable("_stimuli-everything", {
    index: s.number().int().trialID(),
    block: s.string().blockID(),
    condition: s.string().conditionID().optional(),
    word: s.string().min(1).max(20),
    correct: s.boolean().default(false),
    shown: s.date(),
    color: s.enum(["red", "green", "blue"]),
    meta: s.json().nullable(),
    tags: s.array(s.string()),
    layout: s.object({ x: s.number(), y: s.number() }),
    extra: s.looseObject({ note: s.string() }).optional(),
    code: s.string().unique(),
  });
}

describe("SmileTable", () => {
  it("extracts identifier columns", () => {
    const table = everyColumnTable();
    expect(table.getIdentifiers()).toEqual({
      trialID: "index",
      blockID: "block",
      conditionID: "condition",
    });
    expect(table.hasTrialID()).toBe(true);
    expect(table.getColumnsWithConstraint("blockID").map(([name]) => name)).toEqual(["block"]);
    expect(table.getColumnNames()).toContain("layout");
    expect(table.getColumn("word")).toBeDefined();
  });

  it("parses and safely parses rows", () => {
    const table = new SmileTable("t", {
      index: s.number().int().trialID(),
      word: s.string(),
    });
    expect(table.parse({ index: 1, word: "RED" })).toEqual({ index: 1, word: "RED" });
    const bad = table.safeParse({ index: "one", word: "RED" });
    expect(bad.success).toBe(false);
    expect(() => table.parse({ index: "one" })).toThrow();
  });

  it("coerces delimited-text cells through the coercing schema", () => {
    const table = new SmileTable("t", {
      index: s.number().int().trialID(),
      hit: s.boolean(),
      rt: s.number().optional(),
    });
    expect(table.toCoercingZod().parse({ index: "3", hit: "yes", rt: "" })).toEqual({
      index: 3,
      hit: true,
      rt: undefined,
    });
  });

  it("summarises columns in a JSON-safe form", () => {
    const summary = everyColumnTable().summarizeColumns();
    expect(summary.index).toEqual({
      kind: "number",
      optional: false,
      nullable: false,
      hasDefault: false,
      roles: ["trialID"],
    });
    expect(summary.color?.values).toEqual(["red", "green", "blue"]);
    expect(summary.condition?.optional).toBe(true);
  });

  it("generates a zod object source string", () => {
    expect(everyColumnTable().codegenZod()).toBe(
      [
        "z.object({",
        "  index: z.number().int(),",
        "  block: z.string(),",
        "  condition: z.string().optional(),",
        "  word: z.string().min(1).max(20),",
        "  correct: z.boolean().default(false),",
        "  shown: z.date(),",
        '  color: z.enum(["red", "green", "blue"]),',
        "  meta: z.unknown().nullable(),",
        "  tags: z.array(z.string()),",
        "  layout: z.object({ x: z.number(), y: z.number() }).strict(),",
        "  extra: z.object({ note: z.string() }).passthrough().optional(),",
        "  code: z.string(),",
        "})",
      ].join("\n"),
    );
  });

  it("generates a Drizzle table definition", () => {
    expect(everyColumnTable().codegenDrizzle()).toEqual([
      'export const stimuliEverything = sqliteTable("_stimuli-everything", {',
      '  index: integer("index").primaryKey(),',
      '  block: text("block"),',
      '  condition: text("condition"),',
      '  word: text("word"),',
      '  correct: integer("correct", { mode: "boolean" }),',
      '  shown: text("shown"),',
      '  color: text("color"),',
      '  meta: text("meta", { mode: "json" }),',
      '  tags: text("tags", { mode: "json" }),',
      '  layout: text("layout", { mode: "json" }),',
      '  extra: text("extra", { mode: "json" }),',
      '  code: text("code").unique(),',
      "});",
    ]);
  });

  it("generates a SQLite CREATE TABLE statement with indexes", () => {
    expect(everyColumnTable().codegenSQLite()).toEqual([
      'CREATE TABLE "_stimuli-everything" (',
      [
        '  "index" integer PRIMARY KEY',
        '  "block" text NOT NULL',
        '  "condition" text',
        '  "word" text NOT NULL',
        '  "correct" integer NOT NULL DEFAULT false',
        '  "shown" text NOT NULL',
        '  "color" text NOT NULL',
        '  "meta" text',
        '  "tags" text NOT NULL',
        '  "layout" text NOT NULL',
        '  "extra" text',
        '  "code" text NOT NULL UNIQUE',
      ].join(",\n"),
      ");",
      "",
      'CREATE INDEX "idx__stimuli-everything_block" ON "_stimuli-everything" ("block");',
      'CREATE INDEX "idx__stimuli-everything_condition" ON "_stimuli-everything" ("condition");',
    ]);
  });
});
