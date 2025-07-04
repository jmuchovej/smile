import { defineSmileConfig, s } from "#smile/builder";

const stroopStimuli = s.stimuli({
  name: "stroop",
  source: "stroop.csv",
  schema: s.schema({
    index: s.number().trialID().int().min(1),
    word: s.string().min(1).max(20),
    color: s.enum(["red", "green", "blue"]),
    type: s.enum(["unrelated", "congruent", "incongruent"]),
    correct: s.enum(["R", "G", "B"]),
  }),
});

const consent = {
  purpose: "We are conducting research on cognitive processing and selective attention.",
  procedures:
    "You will see words displayed in different colors and respond to the color of each word by pressing a key. This is known as a Stroop task.",
};

const stroopPilot = s.experiment("stroop", "pilot", {
  stimuli: stroopStimuli,
  services: ["prolific"],
  randomizer: "shuffle",
  allowRepeats: true,
  autoSave: true,
  extra: {
    compensation: "$1.00",
    duration: "5 minutes",
    consent,
  },
});

const stroopFull = s.experiment("stroop", "full", {
  stimuli: stroopStimuli,
  services: ["prolific"],
  randomizer: "shuffle",
  allowRepeats: false,
  autoSave: true,
  extra: {
    compensation: "$3.00",
    duration: "12 minutes",
    consent,
  },
});

export default defineSmileConfig({
  activeExperiment: "stroop@pilot",
  experiments: [stroopPilot, stroopFull],
});
