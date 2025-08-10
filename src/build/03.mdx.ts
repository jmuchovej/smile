import { addServerPlugin, addTemplate, useNuxt } from "@nuxt/kit";
import { genDynamicImport } from "knitwork";
import type { NitroConfig } from "nitropack";
import type { NuxtTemplate } from "nuxt/schema";
import { isAbsolute, join, relative } from "pathe";
import { useLogger } from "../runtime/internal";
import { defineBuildStep } from "./utils/runner";

export default defineBuildStep({
  name: "mdx",
  async setup({ runtimeResolve, paths: { sandbox } }) {
    const logger = useLogger("mdx");
    const nuxt = useNuxt();

    nuxt.options.alias["#smile:components"] = addTemplate({
      filename: "smile/components.ts",
      write: true,
      getContents: mdxComponents,
    }).dst;

    nuxt.hook("nitro:config", (nitroConfig: NitroConfig) => {
      nitroConfig.storage = nitroConfig.storage || {};
      nitroConfig.storage["smile:mdx"] = {
        driver: "fs",
        base: join(sandbox, "mdx"),
      };
    });

    addServerPlugin(runtimeResolve("./server/plugins/mdx.ts"));
  },
});

type GetContentParams = Parameters<NonNullable<NuxtTemplate["getContents"]>>[0];

function mdxComponents({ nuxt, app, options }: GetContentParams) {
  const buildDir = join(nuxt.options.buildDir, "smile");
  const componentMap = app.components
    .filter(({ island, filePath, pascalName, global }) => {
      // Ignore island components
      if (island) return false;
      // Ignore CSS
      if (filePath.endsWith(".css")) return false;

      return nuxt.options.dev || global;
    })
    .reduce(
      (acc, { pascalName, filePath, global }) => {
        if (acc[pascalName]) return acc;

        const cleanPath = filePath.replace(/\b\.(?!vue)\w+$/g, "");
        acc[pascalName] = {
          name: pascalName,
          import: genDynamicImport(
            isAbsolute(filePath) ? `./${relative(buildDir, cleanPath)}` : cleanPath,
            { wrapper: false, singleQuotes: false }
          ),
          global,
        };

        return acc;
      },
      {} as Record<string, unknown>
    );

  const componentList = Object.values(componentMap);
  const globalComponents = componentList
    .filter(({ global }) => global)
    .map(({ name }) => name);
  const localComponents = componentList
    .filter(({ global }) => !global)
    .map(({ name }) => name);

  return [
    ...localComponents.map(
      (name) => `export const ${name} = () => ${componentMap[name].import};`
    ),
    `export const globalComponents: string[] = ${JSON.stringify(globalComponents, null, 2)};`,
    `export const localComponents: string[] = ${JSON.stringify(localComponents, null, 2)};`,
  ].join("\n");
}
