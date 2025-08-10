import type { NuxtTypeTemplate } from "@nuxt/kit";
import { compile as jsonToTS } from "json-schema-to-typescript";
import { z } from "zod";
import type { SmileBuildConfig } from "../types/build-config";
import { pascalCase } from "scule";

export const experimentTemplates = {
  types: "smile/experiments.d.ts",
};

export function experimentDTSTemplate(config: SmileBuildConfig) {
  const { experiments, stimuli } = config;

  return {
    filename: experimentTemplates.types,
    write: true,
    options: {
      experiments: Object.values(experiments),
      stimuli: Object.values(stimuli),
    },
    getContents: async ({ options }) => {
      const { experiments, stimuli } = options;
      const contents = [];
      for (const stimulus of stimuli) {
        const { schema, name } = stimulus;
        const json = z.toJSONSchema(schema);
        contents.push(await jsonToTS(json, pascalCase(`${name}-Stimulus`)));
        contents.push("\n");
      }

      for (const experiment of experiments) {
        const { schema, id } = experiment;
        const json = z.toJSONSchema(schema);
        contents.push(
          await jsonToTS(json, pascalCase(`${id.replace("@", "-")}-Trial`))
        );
        contents.push("\n");
      }

      return contents.join("\n");
    },
  } satisfies NuxtTypeTemplate;
}
