import { addVitePlugin, hasNuxtModule, installModule, useNuxt } from "@nuxt/kit";
import type { Nuxt } from "@nuxt/schema";
import { defu } from "defu";
import { defineBuildStep } from "./utils/runner";

async function registerModule(
  nuxt: Nuxt,
  name: string,
  key: string,
  options: Record<string, unknown>
) {
  if (!hasNuxtModule(name)) {
    await installModule(name, options);
  } else {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    (nuxt.options as any)[key] = defu((nuxt.options as any)[key], options);
  }
}

export default defineBuildStep({
  name: "nuxt-options",
  async setup({ runtimeResolve }) {
    const nuxt = useNuxt();

    nuxt.options.alias["#smile"] = runtimeResolve(".");
    nuxt.options.alias["#smile:app"] = runtimeResolve("./app");
    nuxt.options.alias["#smile:server"] = runtimeResolve("./server");

    nuxt.options.pages = true;
    nuxt.options.ssr = false;

    nuxt.options.router ||= { options: {} };
    nuxt.options.router.options = defu(nuxt.options.router.options, {
      hashMode: true,
    });

    await registerModule(nuxt, "@nuxt/icon", "icon", {
      cssLayer: "components",
    });
    await registerModule(nuxt, "@nuxtjs/mdc", "mdc", {});

    if (nuxt.options.builder === "@nuxt/vite-builder") {
      const tailwindcss = (await import("@tailwindcss/vite")).default;
      addVitePlugin(tailwindcss());
    } else {
      nuxt.options.postcss.plugins["@tailwindcss/postcss"] = {};
    }

    await registerModule(nuxt, "shadcn-nuxt", "shadcn", {
      prefix: "UI",
      componentDir: runtimeResolve("./app/components/uikit"),
    });

    nuxt.options.nitro ||= {};
    nuxt.options.nitro = defu(nuxt.options.nitro, {
      experiment: {
        database: true,
      },
    });

    nuxt.options.appConfig.smile = defu(nuxt.options.appConfig.smile, {
      activeExperiment: "",
    });
    nuxt.options.runtimeConfig = defu(nuxt.options.runtimeConfig, {
      smile: {},
      public: {
        smile: {
          activeExperiment: "",
        },
      },
    });
  },
});
