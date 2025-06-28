import { defineSmileConfig, s } from "#smile/builder";

const stimuli = s.stimuli({
  name: "demo",
  source: "demo.csv",
  schema: s.schema({ word: s.string() }),
});

export default defineSmileConfig({
  experiments: [s.experiment("demo", "first", { stimuli })],
});
