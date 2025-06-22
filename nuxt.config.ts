import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("./", import.meta.url));

const unwatched = [
  /[\\/]node_modules[\\/]/,
  /[\\/]\.(devenv|.+)[\\/]/,
  /[\\/](src|docs|tests|dist|plugins|scripts)[\\/]/,
];

export default defineNuxtConfig({
  compatibilityDate: "2025-06-16",
  future: {
    compatibilityVersion: 4,
  },
  ssr: false,
  pages: true,
  modules: ["@nuxt/ui-pro"],
  css: ["~/assets/css/main.css"],
  ignore: [".devenv/**", ".*/**", "src/**", "docs/**", "tests/**", "plugins/**", "scripts/**"],
  vite: {
    server: {
      watch: {
        ignored: [".devenv/**", ".*/**", "**/src/**", "**/docs/**"],
      },
    },
  },
  nitro: {
    devStorage: {
      root: {
        driver: "fs",
        readOnly: true,
        base: rootDir,
        watchOptions: { ignored: unwatched },
      },
    },
  },
});
