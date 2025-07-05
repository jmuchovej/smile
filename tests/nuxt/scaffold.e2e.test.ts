import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { $fetch, setup, useTestContext } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";

/**
 * Boots the app in development mode against the demo experiment and checks
 * what the scaffold provides. The app is client-only, so HTTP responses are
 * the SPA shell; the scanned timeline and stimuli are asserted from the
 * modules the build step generated.
 */
await setup({
  rootDir: fileURLToPath(new URL("../../", import.meta.url)),
  dev: true,
  server: true,
  browser: false,
});

function generated(file: string): string {
  const buildDir = useTestContext().nuxt?.options.buildDir;
  if (!buildDir) throw new Error("Nuxt build dir unavailable in test context");
  return readFileSync(join(buildDir, "smile", file), "utf8");
}

describe("scaffold", () => {
  it("serves the launcher at the root", async () => {
    const html = await $fetch<string>("/");
    expect(html).toContain('id="__nuxt"');
  });

  it("serves the experiment index and a scanned page", async () => {
    const index = await $fetch<string>("/experiment/stroop");
    expect(index).toContain('id="__nuxt"');

    const page = await $fetch<string>("/experiment/stroop/instructions/overview");
    expect(page).toContain('id="__nuxt"');
  });

  it("scanned the demo experiment into an ordered timeline", () => {
    const timeline = generated("timeline.mjs");
    expect(timeline).toContain('export const experimentName = "stroop";');
    expect(timeline).toContain('"path": "/experiment/stroop/welcome"');
    expect(timeline).toContain('"path": "/experiment/stroop/trials/9"');
    expect(timeline).toContain('"smileId": "3.[index]"');
  });

  it("embedded the validated stimuli rows", () => {
    const stimuli = generated("stimuli.mjs");
    expect(stimuli).toContain('export const active = "stroop";');
    expect(stimuli).toContain('"trialIDColumn": "index"');
    expect(stimuli).toContain('"word": "ZAMBONI"');
  });
});
