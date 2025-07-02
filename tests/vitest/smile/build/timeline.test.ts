import { describe, expect, it } from "vitest";

import {
  AmbiguousDynamicSegmentError,
  MixedNumberingError,
  type TimelineNode,
  buildSmileId,
  calculatePrefixDigitWidth,
  generateRouteName,
  generateRoutePath,
  isDynamicSegment,
  normalizePrefix,
  parseNumericPrefix,
  sortByPrefix,
  validateChildren,
  validateDynamicSegments,
} from "../../../../modules/smile/build/timeline";

const node = (over: Partial<TimelineNode>): TimelineNode => ({
  smileId: "",
  name: "x",
  prefix: null,
  path: "x.vue",
  type: "page",
  isDynamic: false,
  ...over,
});

describe("parseNumericPrefix", () => {
  it("splits numbered names and strips the .vue extension", () => {
    expect(parseNumericPrefix("01.welcome.vue")).toEqual({ prefix: "01", name: "welcome" });
    expect(parseNumericPrefix("2.ready")).toEqual({ prefix: "2", name: "ready" });
    expect(parseNumericPrefix("welcome.vue")).toEqual({ prefix: null, name: "welcome" });
    expect(parseNumericPrefix("[index].vue")).toEqual({ prefix: null, name: "[index]" });
    expect(parseNumericPrefix("[index]")).toEqual({ prefix: null, name: "[index]" });
  });
});

describe("prefix normalisation", () => {
  it("pads to the width of the largest sibling", () => {
    expect(calculatePrefixDigitWidth(["01", "02", "03"])).toBe(1);
    expect(calculatePrefixDigitWidth(["1", "2", "99"])).toBe(2);
    expect(calculatePrefixDigitWidth([null, null])).toBe(0);
    expect(normalizePrefix("01", 1)).toBe("1");
    expect(normalizePrefix("1", 2)).toBe("01");
  });

  it("sorts numerically regardless of padding", () => {
    const sorted = sortByPrefix([
      node({ prefix: "02", name: "stimulus" }),
      node({ prefix: "1", name: "fixation" }),
      node({ prefix: "03", name: "feedback" }),
    ]);
    expect(sorted.map((n) => n.name)).toEqual(["fixation", "stimulus", "feedback"]);
  });
});

describe("buildSmileId", () => {
  it("reproduces the documented examples", () => {
    expect(buildSmileId(["1"], "01", "overview")).toBe("1.01");
    expect(buildSmileId([], "2", "ready")).toBe("2");
    expect(buildSmileId(["3", "[index]"], "02", "stimulus")).toBe("3.[index].02");
    expect(buildSmileId(["3"], null, "[index]")).toBe("3.[index]");
    expect(buildSmileId(["4"], null, "alpha")).toBe("4");
  });

  it("recognises dynamic segments", () => {
    expect(isDynamicSegment("[index]")).toBe(true);
    expect(isDynamicSegment("index")).toBe(false);
    expect(isDynamicSegment("[]")).toBe(false);
  });
});

describe("validateChildren", () => {
  it("accepts all-numbered and all-unnumbered siblings", () => {
    expect(() =>
      validateChildren([node({ prefix: "1" }), node({ prefix: "2" })], "d"),
    ).not.toThrow();
    expect(() => validateChildren([node({ name: "a" }), node({ name: "b" })], "d")).not.toThrow();
  });

  it("rejects mixed numbering, naming both sides", () => {
    expect(() =>
      validateChildren(
        [node({ prefix: "01", name: "welcome" }), node({ name: "extra" })],
        "demo/1.instructions",
      ),
    ).toThrow(MixedNumberingError);
    expect(() =>
      validateChildren(
        [node({ prefix: "01", name: "welcome" }), node({ name: "extra" })],
        "demo/1.instructions",
      ),
    ).toThrow(
      /Mixed numbering in demo\/1.instructions: numbered=\[welcome\], unnumbered=\[extra\]/,
    );
  });
});

describe("validateDynamicSegments", () => {
  it("allows a dynamic page alone and a dynamic block with siblings", () => {
    expect(() =>
      validateDynamicSegments([node({ name: "[index]", isDynamic: true })], "d"),
    ).not.toThrow();
    expect(() =>
      validateDynamicSegments(
        [node({ name: "[index]", isDynamic: true, type: "block" }), node({ name: "summary" })],
        "d",
      ),
    ).not.toThrow();
  });

  it("rejects a dynamic page with siblings and suggests a directory", () => {
    const children = [node({ name: "[index]", isDynamic: true }), node({ name: "summary" })];
    expect(() => validateDynamicSegments(children, "demo/2.trials")).toThrow(
      AmbiguousDynamicSegmentError,
    );
    expect(() => validateDynamicSegments(children, "demo/2.trials")).toThrow(
      /\[index\] has siblings \[summary\].*use a \[index\]\/ directory/,
    );
  });
});

describe("route naming", () => {
  it("drops prefixes and extensions and maps dynamic segments", () => {
    expect(generateRouteName("stroop", "1.instructions/01.overview.vue")).toBe(
      "smile-stroop-instructions-overview",
    );
    expect(generateRoutePath("stroop", "1.instructions/01.overview.vue")).toBe(
      "/experiment/stroop/instructions/overview",
    );
    expect(generateRouteName("stroop", "02.stimuli/[index].vue")).toBe(
      "smile-stroop-stimuli-index",
    );
    expect(generateRoutePath("stroop", "02.stimuli/[index].vue")).toBe(
      "/experiment/stroop/stimuli/:index",
    );
    expect(generateRoutePath("stroop", "3.trials/[index]/02.stimulus.vue")).toBe(
      "/experiment/stroop/trials/:index/stimulus",
    );
  });
});
