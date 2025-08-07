import { defineStimuli, defineExperiment, defineSmileConfig } from "@smile/nuxt";
import { z } from "zod";

// Stroop Task Stimuli
const stroopStimuli = defineStimuli({
  name: "stroop",
  source: "stroop.csv",
  schema: z.object({
    index: z.number().trialID(),
    word: z.string(),
    color: z.enum(["red", "green", "blue"]),
    type: z.enum(["unrelated", "congruent", "incongruent"]),
    correct: z.enum(["R", "G", "B"]),
  }),
});

// Stroop Pilot - shorter version for testing
const stroopPilot = defineExperiment({
  name: "stroop",
  version: "pilot",
  compensation: "$0.50",
  duration: "2 minutes",
  stimuli: stroopStimuli,
  services: [{ type: "prolific", code: "STROOP_PILOT" }],
  allowRepeats: true, // Allow repeats for pilot testing
  autoSave: true,
  maxTrials: 20, // Only 20 trials for pilot
  schema: z.object({
    index: z.number().trialID(),
    word: z.string(),
    color: z.enum(["red", "green", "blue"]),
    type: z.enum(["unrelated", "congruent", "incongruent"]),
    correct: z.enum(["R", "G", "B"]),
  }),
});

// Stroop Full Study
const stroopFull = defineExperiment({
  name: "stroop",
  version: "full",
  compensation: "$2.00",
  duration: "10 minutes",
  stimuli: stroopStimuli,
  services: [{ type: "prolific", code: "STROOP_FULL" }],
  allowRepeats: false,
  autoSave: true,
  schema: z.object({
    index: z.number().trialID(),
    word: z.string(),
    color: z.enum(["red", "green", "blue"]),
    type: z.enum(["unrelated", "congruent", "incongruent"]),
    correct: z.enum(["R", "G", "B"]),
  }),
});

// Go/No-Go Task Stimuli
const gonogoStimuli = defineStimuli({
  name: "gonogo",
  source: "gonogo/*.jsonl",
  schema: z.object({
    index: z.number().trialID(),
    block: z.string().blockID(),
    stimulus: z.string(),
    RorP: z.enum(["R", "P"]),
    GoNoGo: z.enum(["Go", "NoGo"]),
    position: z.number().min(1).max(4),
    correct_key: z.string().nullable(),
    go_letter: z.enum(["R", "P"]),
  }),
});

// Go/No-Go Pilot
const gonogoPilot = defineExperiment({
  name: "gonogo",
  version: "pilot",
  compensation: "$0.50",
  duration: "3 minutes",
  services: [{ type: "prolific", code: "GONOGO_PILOT" }],
  allowRepeats: true,
  autoSave: true,
  stimuli: gonogoStimuli,
  schema: z.object({
    index: z.number().trialID(),
    block: z.string().blockID(),
    stimulus: z.string(),
    RorP: z.enum(["R", "P"]),
    GoNoGo: z.enum(["Go", "NoGo"]),
    position: z.number().min(1).max(4),
    correct_key: z.string().nullable(),
    go_letter: z.enum(["R", "P"]),
  }),
});

// Go/No-Go Full Study
const gonogoFull = defineExperiment({
  name: "gonogo",
  version: "full",
  compensation: "$2.50",
  duration: "12 minutes",
  services: [{ type: "prolific", code: "GONOGO_FULL" }],
  allowRepeats: false,
  autoSave: true,
  stimuli: gonogoStimuli,
  schema: z.object({
    index: z.number().trialID(),
    block: z.string().blockID(),
    stimulus: z.string(),
    RorP: z.enum(["R", "P"]),
    GoNoGo: z.enum(["Go", "NoGo"]),
    position: z.number().min(1).max(4),
    correct_key: z.string().nullable(),
    go_letter: z.enum(["R", "P"]),
  }),
});

// Flanker Task Stimuli
const flankerStimuli = defineStimuli({
  name: "flanker",
  source: "flanker.csv",
  schema: z.object({
    index: z.number().trialID(),
    target: z.enum(["left", "right"]),
    flankers: z.enum(["left", "right", "neutral"]),
    type: z.enum(["congruent", "incongruent", "neutral"]),
    correct: z.enum(["ArrowLeft", "ArrowRight"]),
    response_window: z.number(),
  }),
});

// Flanker Pilot
const flankerPilot = defineExperiment({
  name: "flanker",
  version: "pilot",
  compensation: "$0.50",
  duration: "2 minutes",
  stimuli: flankerStimuli,
  services: [{ type: "prolific", code: "FLANKER_PILOT" }],
  allowRepeats: true,
  autoSave: true,
  schema: z.object({
    index: z.number().trialID(),
    target: z.enum(["left", "right"]),
    flankers: z.enum(["left", "right", "neutral"]),
    type: z.enum(["congruent", "incongruent", "neutral"]),
    correct: z.enum(["ArrowLeft", "ArrowRight"]),
    response_window: z.number(),
  }),
});

// Flanker Full Study
const flankerFull = defineExperiment({
  name: "flanker",
  version: "full",
  compensation: "$2.00",
  duration: "8 minutes",
  stimuli: flankerStimuli,
  services: [{ type: "prolific", code: "FLANKER_FULL" }],
  allowRepeats: false,
  autoSave: true,
  schema: z.object({
    index: z.number().trialID(),
    target: z.enum(["left", "right"]),
    flankers: z.enum(["left", "right", "neutral"]),
    type: z.enum(["congruent", "incongruent", "neutral"]),
    correct: z.enum(["ArrowLeft", "ArrowRight"]),
    response_window: z.number(),
  }),
});

export default defineSmileConfig({
  activeExperiment: "stroopPilot",
  experiments: [
    // Pilot experiments
    stroopPilot,
    gonogoPilot,
    flankerPilot,
    // Full experiments
    stroopFull,
    gonogoFull,
    flankerFull,
  ],
});
