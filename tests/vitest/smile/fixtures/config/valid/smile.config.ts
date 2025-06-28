import { defineSmileConfig, s } from "#smile/builder";

const stroopStimuli = s.stimuli({
  name: "stroop",
  source: "stroop.csv",
  schema: s.schema({
    index: s.number().trialID().int().min(1),
    word: s.string().min(1),
    color: s.enum(["red", "green", "blue"]),
  }),
});

export default defineSmileConfig({
  activeExperiment: "stroop@pilot",
  experiments: [
    s.experiment("stroop", "pilot", {
      stimuli: stroopStimuli,
      services: ["prolific"],
      extra: { compensation: "$3.00" },
    }),
    s.experiment("stroop", "full", {
      stimuli: stroopStimuli,
      randomizer: "none",
    }),
  ],
});
