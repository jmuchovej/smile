import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// End-to-end tests boot the Nuxt app with @nuxt/test-utils. They live in a
// separate Vitest project so the engine unit tests never pay for a Nuxt
// build.
export default defineConfig({
  test: {
    name: "nuxt-e2e",
    root: fileURLToPath(new URL("./", import.meta.url)),
    include: ["**/*.e2e.test.ts"],
    testTimeout: 180_000,
    hookTimeout: 240_000,
  },
});
