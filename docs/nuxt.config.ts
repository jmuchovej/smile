import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",

  devtools: { enabled: true },
  modules: [
    "@nuxt/icon",
    "@nuxt/fonts",
    "@nuxt/image",
    "@nuxt/content",
    "@vueuse/nuxt",
  ],

  css: ["~/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
  },

  content: {
    experimental: {
      sqliteConnector: "native",
    },
  },

  llms: {
    domain: "https://smile.js.org",
    title: "SmileJS",
    description: "SmileJS: A happy approach to behavioral research.",
    notes: [],
    full: {
      title: "Complete Documentation",
      description: "The complete documentation including all content",
    },
  },
});
