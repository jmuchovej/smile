import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ConfigLoadError,
  expectedConfigFiles,
  findConfigFile,
  loadSmileConfig,
  resolveActiveExperiment,
} from "../../../../modules/smile/build/config";
import { SmileConfig, s } from "../../../../modules/smile/builder";

// `new URL(..., import.meta.url)` is unreliable under the happy-dom
// environment, so build paths from __dirname instead.
const moduleDir = resolve(__dirname, "../../../../modules/smile");
const fixture = (name: string) => resolve(__dirname, `../fixtures/config/${name}`);

const load = (name: string, extra: Partial<Parameters<typeof loadSmileConfig>[0]> = {}) =>
  loadSmileConfig({ rootDir: fixture(name), moduleDir, env: {}, ...extra });

describe("findConfigFile", () => {
  it("finds smile.config.ts in the root", () => {
    expect(findConfigFile(fixture("valid"))).toMatch(/valid\/smile\.config\.ts$/);
  });

  it("returns null when no config exists", () => {
    expect(findConfigFile(fixture("absent"))).toBeNull();
  });

  it("lists the accepted file names", () => {
    expect(expectedConfigFiles()).toEqual([
      "smile.config.ts",
      "smile.config.mts",
      "smile.config.js",
      "smile.config.mjs",
    ]);
  });
});

describe("loadSmileConfig", () => {
  it("loads a valid config through the #smile alias and resolves the active experiment", async () => {
    const loaded = await load("valid");
    expect(loaded.configFile).toMatch(/smile\.config\.ts$/);
    expect(loaded.config).toBeInstanceOf(SmileConfig);
    expect(loaded.activeExperiment).toBe("stroop@pilot");
    expect(loaded.activeSource).toBe("config");
    expect(loaded.experiment?.id).toBe("stroop@pilot");
    expect(loaded.experiment?.getExtra("compensation")).toBe("$3.00");
    expect(loaded.experiment?.stimuli.trialIDColumn).toBe("index");
    expect(loaded.config?.getExperimentIds()).toEqual(["stroop@pilot", "stroop@full"]);
  });

  it("returns null fields when no config file exists", async () => {
    const loaded = await load("absent");
    expect(loaded).toEqual({
      configFile: null,
      config: null,
      activeExperiment: null,
      experiment: null,
      activeSource: null,
    });
  });

  it("defaults the active experiment to the first one", async () => {
    const loaded = await load("no-active");
    expect(loaded.activeExperiment).toBe("demo@first");
    expect(loaded.activeSource).toBe("default");
  });

  it("lets the environment override the config", async () => {
    const loaded = await load("valid", { env: { SMILE_EXPERIMENT: "stroop@full" } });
    expect(loaded.activeExperiment).toBe("stroop@full");
    expect(loaded.activeSource).toBe("env");
    expect(loaded.experiment?.randomizer).toBe("none");
  });

  it("lets the module option override the config, below the environment", async () => {
    const byOption = await load("valid", { experimentOverride: "stroop@full" });
    expect(byOption.activeSource).toBe("option");

    const both = await load("valid", {
      experimentOverride: "stroop@full",
      env: { SMILE_EXPERIMENT: "stroop@pilot" },
    });
    expect(both.activeExperiment).toBe("stroop@pilot");
    expect(both.activeSource).toBe("env");
  });

  it("rejects an override naming an unknown experiment", async () => {
    await expect(load("valid", { env: { SMILE_EXPERIMENT: "nope@x" } })).rejects.toThrow(
      /SMILE_EXPERIMENT names "nope@x".*Available: stroop@pilot, stroop@full/,
    );
    await expect(load("valid", { experimentOverride: "nope@x" })).rejects.toThrow(ConfigLoadError);
  });

  it("rejects an unknown activeExperiment in the file", async () => {
    await expect(load("invalid-active")).rejects.toThrow(
      /Failed to load .*invalid-active\/smile\.config\.ts: activeExperiment: "flanker@v2" not found/,
    );
  });

  it("rejects a schema without a trialID column, naming the file", async () => {
    await expect(load("invalid-trialid")).rejects.toThrow(
      /Failed to load .*invalid-trialid\/smile\.config\.ts: schema: Schema must have exactly one column marked as trialID/,
    );
  });

  it("rejects duplicate experiment identifiers", async () => {
    await expect(load("duplicate")).rejects.toThrow(/Duplicate experiment ID: "demo@first"/);
  });

  it("rejects a config that was not built with the builder", async () => {
    await expect(load("not-builder")).rejects.toThrow(
      /Invalid configuration in .*not-builder\/smile\.config\.ts: .*created with s\.experiment\(\)/,
    );
  });
});

describe("resolveActiveExperiment", () => {
  const stimuli = s.stimuli({ name: "d", source: "d.csv", schema: { id: s.number().trialID() } });
  const config = SmileConfig.create({
    experiments: [s.experiment("d", "a", { stimuli }), s.experiment("d", "b", { stimuli })],
  });

  it("falls back to the first experiment", () => {
    expect(resolveActiveExperiment(config, { env: {} }, "x")).toEqual({
      id: "d@a",
      source: "default",
    });
  });

  it("names the option in its error", () => {
    expect(() =>
      resolveActiveExperiment(config, { env: {}, experimentOverride: "d@z" }, "x"),
    ).toThrow(/the `smile.experiment` option names "d@z"/);
  });
});
