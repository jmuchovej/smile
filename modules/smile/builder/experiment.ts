/**
 * An experiment variant: a `name@version` identifier, the stimuli it
 * presents, and its run-time settings.
 */
import { z } from "zod";

import { SMILE_BRAND, hasBrand } from "./column";
import { Stimuli } from "./stimuli";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RandomizerType = "shuffle" | "none";

export interface ExperimentInput {
  stimuli: Stimuli;
  services?: string[];
  randomizer?: RandomizerType;
  allowRepeats?: boolean;
  autoSave?: boolean;
  extra?: Record<string, unknown>;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export const ExperimentNameSchema = z.string().min(1, "Experiment name is required");
export const ExperimentVersionSchema = z.string().min(1, "Experiment version is required");

function isStimuli(val: unknown): val is Stimuli {
  return val instanceof Stimuli || hasBrand(val, "stimuli");
}

export const ExperimentInputSchema = z.object({
  stimuli: z.any().refine(isStimuli, {
    message: "Expected stimuli created with s.stimuli()",
  }),
  services: z.array(z.string()).optional(),
  randomizer: z.enum(["shuffle", "none"]).optional(),
  allowRepeats: z.boolean().optional(),
  autoSave: z.boolean().optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
});

// ─── Experiment Class ────────────────────────────────────────────────────────

export class Experiment {
  readonly [SMILE_BRAND] = "experiment" as const;
  readonly name: string;
  readonly version: string;
  readonly stimuli: Stimuli;
  readonly services: string[];
  readonly randomizer: RandomizerType;
  readonly allowRepeats: boolean;
  readonly autoSave: boolean;
  readonly extra: Record<string, unknown>;

  private constructor(name: string, version: string, input: ExperimentInput) {
    this.name = name;
    this.version = version;
    this.stimuli = input.stimuli;
    this.services = input.services ?? [];
    this.randomizer = input.randomizer ?? "shuffle";
    this.allowRepeats = input.allowRepeats ?? false;
    this.autoSave = input.autoSave ?? true;
    this.extra = input.extra ?? {};
  }

  /** @throws ZodError if the input is invalid */
  static create(name: string, version: string, input: ExperimentInput): Experiment {
    ExperimentNameSchema.parse(name);
    ExperimentVersionSchema.parse(version);
    ExperimentInputSchema.parse(input);
    return new Experiment(name, version, input);
  }

  /** Unique identifier in `name@version` form. */
  get id(): string {
    return `${this.name}@${this.version}`;
  }

  hasService(service: string): boolean {
    return this.services.includes(service);
  }

  getExtra<T = unknown>(key: string): T | undefined {
    return this.extra[key] as T | undefined;
  }
}

export function createExperiment(
  name: string,
  version: string,
  input: ExperimentInput,
): Experiment {
  return Experiment.create(name, version, input);
}
