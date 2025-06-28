import { defineSmileConfig, s } from "#smile/builder";

const stimuli = s.stimuli({
  name: "demo",
  source: "demo.csv",
  schema: s.schema({ id: s.number().trialID() }),
});

export default defineSmileConfig({
  experiments: [
    s.experiment("demo", "first", { stimuli }),
    s.experiment("demo", "second", { stimuli }),
  ],
});
