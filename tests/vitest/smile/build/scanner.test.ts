import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
  ExperimentScanError,
  listExperimentDirs,
  resolveExperimentDir,
  scanExperiment,
} from "../../../../modules/smile/build/scanner";
import {
  AmbiguousDynamicSegmentError,
  MixedNumberingError,
} from "../../../../modules/smile/build/timeline";

/** Writes a fixture experiments tree into a temp directory. */
function fixtureTree(spec: Record<string, string[]>): string {
  const root = mkdtempSync(join(tmpdir(), "smile-experiments-"));
  for (const [experiment, files] of Object.entries(spec)) {
    mkdirSync(join(root, experiment), { recursive: true });
    for (const file of files) {
      const full = join(root, experiment, file);
      mkdirSync(join(full, ".."), { recursive: true });
      writeFileSync(full, "<template><div /></template>\n");
    }
  }
  return root;
}

const PAGE = "<template><div /></template>\n";
const ids = [1, 2, 3];

describe("resolveExperimentDir", () => {
  let root: string;
  beforeAll(() => {
    root = fixtureTree({
      stroop: ["01.welcome.vue"],
      "stroop@pilot": ["01.welcome.vue"],
      flanker: ["01.welcome.vue"],
    });
  });

  it("prefers the versioned directory", () => {
    expect(resolveExperimentDir(root, "stroop", "pilot")).toBe(join(root, "stroop@pilot"));
  });

  it("falls back to the unversioned directory", () => {
    expect(resolveExperimentDir(root, "stroop", "full")).toBe(join(root, "stroop"));
    expect(resolveExperimentDir(root, "flanker", "v1")).toBe(join(root, "flanker"));
  });

  it("names both candidates when neither exists", () => {
    expect(() => resolveExperimentDir(root, "gonogo", "v1")).toThrow(ExperimentScanError);
    expect(() => resolveExperimentDir(root, "gonogo", "v1")).toThrow(
      new RegExp(`looked for ${join(root, "gonogo@v1")} and ${join(root, "gonogo")}`),
    );
  });

  it("lists experiment directories", () => {
    expect(listExperimentDirs(root)).toEqual(["flanker", "stroop", "stroop@pilot"]);
    expect(listExperimentDirs(join(root, "missing"))).toEqual([]);
  });
});

describe("scanExperiment", () => {
  it("builds the tree, SmileIDs, routes and an expanded sequence", () => {
    const root = fixtureTree({
      stroop: [
        "01.welcome.vue",
        "02.instructions/01.overview.vue",
        "02.instructions/02.check.vue",
        "03.trials/[index].vue",
        "04.debrief.vue",
        "_shared/Header.vue",
        ".hidden.vue",
        "notes.md",
      ],
    });
    const result = scanExperiment({
      experimentsDir: root,
      name: "stroop",
      version: "pilot",
      trialIds: ids,
    });

    expect(result.experimentDir).toBe(join(root, "stroop"));
    expect(result.pages.map((p) => p.path)).toEqual([
      "01.welcome.vue",
      "02.instructions/01.overview.vue",
      "02.instructions/02.check.vue",
      "03.trials/[index].vue",
      "04.debrief.vue",
    ]);
    expect(result.pages.map((p) => p.smileId)).toEqual(["1", "2.1", "2.2", "3.[index]", "4"]);

    const routes = result.routes.map((r) => [r.route.name, r.route.path]);
    expect(routes).toEqual([
      ["smile-stroop-welcome", "/experiment/stroop/welcome"],
      ["smile-stroop-instructions-overview", "/experiment/stroop/instructions/overview"],
      ["smile-stroop-instructions-check", "/experiment/stroop/instructions/check"],
      ["smile-stroop-trials-index", "/experiment/stroop/trials/:index"],
      ["smile-stroop-debrief", "/experiment/stroop/debrief"],
    ]);
    expect(result.routes[0]?.route.file).toBe(join(root, "stroop", "01.welcome.vue"));
    expect(result.routes[0]?.route.meta).toMatchObject({
      layout: "smile",
      smileExperiment: "stroop",
      smileId: "1",
      smilePage: "01.welcome.vue",
    });

    expect(result.entries.map((e) => e.path)).toEqual([
      "/experiment/stroop/welcome",
      "/experiment/stroop/instructions/overview",
      "/experiment/stroop/instructions/check",
      "/experiment/stroop/trials/1",
      "/experiment/stroop/trials/2",
      "/experiment/stroop/trials/3",
      "/experiment/stroop/debrief",
    ]);
    expect(result.entries[4]).toMatchObject({
      index: 4,
      smileId: "3.[index]",
      routeName: "smile-stroop-trials-index",
      params: { index: "2" },
      trialId: 2,
      isDynamic: true,
    });
    expect(result.entries[0]?.unorderedGroup).toBeUndefined();
  });

  it("orders numbered siblings numerically regardless of padding", () => {
    const root = fixtureTree({ demo: ["1.fixation.vue", "02.stimulus.vue", "03.feedback.vue"] });
    const result = scanExperiment({
      experimentsDir: root,
      name: "demo",
      version: "v1",
      trialIds: [],
    });
    expect(result.pages.map((p) => p.name)).toEqual(["fixation", "stimulus", "feedback"]);
    expect(result.pages.map((p) => p.smileId)).toEqual(["1", "2", "3"]);
  });

  it("expands a dynamic block once per trial identifier, keeping its inner order", () => {
    const root = fixtureTree({
      flanker: [
        "1.ready.vue",
        "2.trials/[index]/1.fixation.vue",
        "2.trials/[index]/02.stimulus.vue",
        "3.done.vue",
      ],
    });
    const result = scanExperiment({
      experimentsDir: root,
      name: "flanker",
      version: "v1",
      trialIds: ["a", "b"],
    });
    expect(result.pages.map((p) => p.smileId)).toEqual(["1", "2.[index].1", "2.[index].2", "3"]);
    expect(result.entries.map((e) => `${e.smileId}@${e.trialId ?? "-"}`)).toEqual([
      "1@-",
      "2.[index].1@a",
      "2.[index].2@a",
      "2.[index].1@b",
      "2.[index].2@b",
      "3@-",
    ]);
    expect(result.entries[1]?.path).toBe("/experiment/flanker/trials/a/fixation");
  });

  it("marks unnumbered siblings as an unordered group in lexical order", () => {
    const root = fixtureTree({
      demo: ["1.intro.vue", "2.tasks/beta.vue", "2.tasks/alpha.vue", "3.end.vue"],
    });
    const result = scanExperiment({
      experimentsDir: root,
      name: "demo",
      version: "v1",
      trialIds: [],
    });
    const tasks = result.tree.children?.[1];
    expect(tasks?.childrenOrdered).toBe(false);
    expect(result.entries.map((e) => e.page)).toEqual([
      "1.intro.vue",
      "2.tasks/alpha.vue",
      "2.tasks/beta.vue",
      "3.end.vue",
    ]);
    expect(result.entries[1]?.unorderedGroup).toBe("2");
    expect(result.entries[3]?.unorderedGroup).toBeUndefined();
  });

  it("rejects mixed numbering naming the directory", () => {
    const root = fixtureTree({ demo: ["01.welcome.vue", "extra.vue"] });
    expect(() =>
      scanExperiment({ experimentsDir: root, name: "demo", version: "v1", trialIds: [] }),
    ).toThrow(MixedNumberingError);
  });

  it("rejects a dynamic page with siblings", () => {
    const root = fixtureTree({ demo: ["1.trials/[index].vue", "1.trials/summary.vue"] });
    expect(() =>
      scanExperiment({ experimentsDir: root, name: "demo", version: "v1", trialIds: [] }),
    ).toThrow(AmbiguousDynamicSegmentError);
  });

  it("rejects an experiment with no pages", () => {
    const root = fixtureTree({ demo: ["notes.md", "_draft/1.a.vue"] });
    expect(() =>
      scanExperiment({ experimentsDir: root, name: "demo", version: "v1", trialIds: [] }),
    ).toThrow(/contains no \.vue pages/);
  });

  it("rejects two pages resolving to the same route", () => {
    const root = fixtureTree({ demo: ["1.welcome.vue", "2.welcome.vue"] });
    expect(() =>
      scanExperiment({ experimentsDir: root, name: "demo", version: "v1", trialIds: [] }),
    ).toThrow(/both resolve to the route \/experiment\/demo\/welcome/);
  });

  it("uses the versioned directory when present", () => {
    const root = fixtureTree({ stroop: ["1.a.vue"], "stroop@pilot": ["1.b.vue"] });
    writeFileSync(join(root, "stroop@pilot", "1.b.vue"), PAGE);
    const result = scanExperiment({
      experimentsDir: root,
      name: "stroop",
      version: "pilot",
      trialIds: [],
    });
    expect(result.pages.map((p) => p.name)).toEqual(["b"]);
  });
});
