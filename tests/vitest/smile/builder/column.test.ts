import { describe, expect, it } from "vitest";
import { z } from "zod";

import { s } from "../../../../modules/smile/builder";

describe("column primitives", () => {
  describe("string", () => {
    it("applies length constraints", () => {
      const col = s.string().min(2).max(4);
      expect(col.toZod().safeParse("a").success).toBe(false);
      expect(col.toZod().safeParse("abc").success).toBe(true);
      expect(col.toZod().safeParse("abcde").success).toBe(false);
      expect(col.codegenZod()).toBe("z.string().min(2).max(4)");
    });

    it("applies exact length, regex, prefix and suffix constraints", () => {
      const col = s
        .string()
        .length(3)
        .regex(/^[a-z]+$/)
        .startsWith("a")
        .endsWith("c");
      expect(col.toZod().safeParse("abc").success).toBe(true);
      expect(col.toZod().safeParse("ab1").success).toBe(false);
      expect(col.toZod().safeParse("ABC").success).toBe(false);
      expect(col.codegenZod()).toBe(
        'z.string().length(3).regex(/^[a-z]+$/).startsWith("a").endsWith("c")',
      );
    });

    it("validates email and url formats", () => {
      expect(s.string().email().toZod().safeParse("a@b.co").success).toBe(true);
      expect(s.string().email().toZod().safeParse("nope").success).toBe(false);
      expect(s.string().url().toZod().safeParse("https://x.y").success).toBe(true);
      expect(s.string().url().toZod().safeParse("nope").success).toBe(false);
    });
  });

  describe("number", () => {
    it("applies range and integer constraints", () => {
      const col = s.number().int().min(1).max(10);
      expect(col.toZod().safeParse(5).success).toBe(true);
      expect(col.toZod().safeParse(5.5).success).toBe(false);
      expect(col.toZod().safeParse(0).success).toBe(false);
      expect(col.codegenZod()).toBe("z.number().min(1).max(10).int()");
    });

    it("applies sign, multiple-of, finite and safe constraints", () => {
      expect(s.number().positive().toZod().safeParse(0).success).toBe(false);
      expect(s.number().nonnegative().toZod().safeParse(0).success).toBe(true);
      expect(s.number().negative().toZod().safeParse(-1).success).toBe(true);
      expect(s.number().nonpositive().toZod().safeParse(1).success).toBe(false);
      expect(s.number().multipleOf(5).toZod().safeParse(11).success).toBe(false);
      expect(s.number().finite().toZod().safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
      expect(
        s
          .number()
          .safe()
          .toZod()
          .safeParse(Number.MAX_SAFE_INTEGER + 2).success,
      ).toBe(false);
      expect(s.number().positive().multipleOf(5).finite().safe().codegenZod()).toBe(
        "z.number().positive().multipleOf(5).finite().safe()",
      );
    });

    it("coerces string input only through the coercing schema", () => {
      const col = s.number().int();
      expect(col.toZod().safeParse("12").success).toBe(false);
      expect(col.toCoercingZod().parse("12")).toBe(12);
      expect(col.toCoercingZod().safeParse("twelve").success).toBe(false);
    });
  });

  describe("boolean", () => {
    it("accepts booleans and coerces common spellings", () => {
      const col = s.boolean();
      expect(col.toZod().safeParse(true).success).toBe(true);
      expect(col.toZod().safeParse("true").success).toBe(false);
      expect(col.toCoercingZod().parse("TRUE")).toBe(true);
      expect(col.toCoercingZod().parse("0")).toBe(false);
      expect(col.toCoercingZod().safeParse("maybe").success).toBe(false);
      expect(col.codegenZod()).toBe("z.boolean()");
    });
  });

  describe("date", () => {
    it("applies min and max and coerces ISO strings", () => {
      const min = new Date("2024-01-01T00:00:00.000Z");
      const col = s.date().min(min);
      expect(col.toZod().safeParse(new Date("2023-06-01")).success).toBe(false);
      expect(col.toZod().safeParse(new Date("2024-06-01")).success).toBe(true);
      expect(col.toCoercingZod().parse("2024-06-01T00:00:00.000Z")).toBeInstanceOf(Date);
      expect(col.codegenZod()).toBe('z.date().min(new Date("2024-01-01T00:00:00.000Z"))');
    });
  });

  describe("enum", () => {
    it("restricts to the declared values", () => {
      const col = s.enum(["red", "green", "blue"]);
      expect(col.toZod().safeParse("red").success).toBe(true);
      expect(col.toZod().safeParse("purple").success).toBe(false);
      expect(col.getValues()).toEqual(["red", "green", "blue"]);
      expect(col.codegenZod()).toBe('z.enum(["red", "green", "blue"])');
      expect(col.summary().values).toEqual(["red", "green", "blue"]);
    });
  });

  describe("json, array and object", () => {
    it("json accepts anything and parses JSON text when coercing", () => {
      expect(s.json().toZod().safeParse({ a: 1 }).success).toBe(true);
      expect(s.json().toCoercingZod().parse('{"a":1}')).toEqual({ a: 1 });
      expect(s.json().codegenZod()).toBe("z.unknown()");
    });

    it("array validates elements and length", () => {
      const col = s.array(s.number().int()).min(1).max(2);
      expect(col.toZod().safeParse([1]).success).toBe(true);
      expect(col.toZod().safeParse([1, 2, 3]).success).toBe(false);
      expect(col.toZod().safeParse(["1"]).success).toBe(false);
      expect(col.toCoercingZod().parse('["1","2"]')).toEqual([1, 2]);
      expect(col.codegenZod()).toBe("z.array(z.number().int()).min(1).max(2)");
      expect(s.array(s.string()).nonempty().codegenZod()).toBe("z.array(z.string()).nonempty()");
    });

    it("object is strict while looseObject passes extra keys through", () => {
      const strict = s.object({ a: s.number() });
      const loose = s.looseObject({ a: s.number() });
      expect(strict.toZod().safeParse({ a: 1, b: 2 }).success).toBe(false);
      expect(loose.toZod().parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
      expect(strict.codegenZod()).toBe("z.object({ a: z.number() }).strict()");
      expect(loose.codegenZod()).toBe("z.object({ a: z.number() }).passthrough()");
    });
  });

  describe("base modifiers", () => {
    it("optional, nullable and default change the zod schema and codegen", () => {
      const col = s.string().optional().nullable().default("x");
      expect(col.toZod().parse(undefined)).toBe("x");
      expect(col.toZod().parse(null)).toBeNull();
      expect(col.codegenZod()).toBe('z.string().nullable().optional().default("x")');
      expect(col.summary()).toMatchObject({ optional: true, nullable: true, hasDefault: true });
    });

    it("the coercing schema treats empty cells as absent for optional columns", () => {
      expect(s.number().optional().toCoercingZod().parse("")).toBeUndefined();
      expect(s.number().default(7).toCoercingZod().parse("")).toBe(7);
      expect(s.string().nullable().toCoercingZod().parse("")).toBeNull();
    });
  });

  describe("role markers", () => {
    it("trialID implies primary key; blockID and conditionID imply an index", () => {
      const trial = s.number().trialID();
      expect(trial.getExperimentConstraints()).toEqual(new Set(["trialID"]));
      expect(trial.getDatabaseConstraints()).toEqual({ primaryKey: true });

      const block = s.string().blockID();
      expect(block.getExperimentConstraints()).toEqual(new Set(["blockID"]));
      expect(block.getDatabaseConstraints()).toEqual({ index: true });

      const cond = s.string().conditionID();
      expect(cond.getExperimentConstraints()).toEqual(new Set(["conditionID"]));
      expect(cond.getDatabaseConstraints()).toEqual({ index: true });
      expect(cond.summary().roles).toEqual(["conditionID"]);
    });

    it("unique and primaryKey appear in Drizzle codegen", () => {
      expect(s.string().unique().codegenDrizzle("code")).toBe('text("code").unique()');
      expect(s.number().int().trialID().codegenDrizzle("index")).toBe(
        'integer("index").primaryKey()',
      );
      expect(s.number().codegenDrizzle("rt")).toBe('real("rt")');
      expect(s.boolean().codegenDrizzle("hit")).toBe('integer("hit", { mode: "boolean" })');
      expect(s.json().codegenDrizzle("meta")).toBe('text("meta", { mode: "json" })');
    });
  });

  it("toZod returns real zod schemas", () => {
    expect(s.string().toZod()).toBeInstanceOf(z.ZodType);
  });
});
