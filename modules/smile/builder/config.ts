/**
 * Top-level project configuration: the experiment variants and which one is
 * active.
 *
 * `defineSmileConfig()` validates its input and returns it as a plain
 * object, which is what `smile.config.ts` exports. The build step wraps that
 * object in a `SmileConfig` for lookups. Keeping the exported value plain
 * means it survives the config loader's merging step intact.
 */
import { z } from "zod";

import { hasBrand } from "./column";
import { Experiment } from "./experiment";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SmileConfigInput {
  experiments: Experiment[];
  /** `name@version` of the experiment to build. Defaults to the first one. */
  activeExperiment?: string;
}

/** The validated, plain form exported by `smile.config.ts`. */
export interface SmileConfigDefinition {
  experiments: Experiment[];
  activeExperiment?: string;
}

// ─── Validation ──────────────────────────────────────────────────────────────

function isExperiment(val: unknown): val is Experiment {
  return val instanceof Experiment || hasBrand(val, "experiment");
}

export const SmileConfigInputSchema = z.object({
  activeExperiment: z.string().min(1).optional(),
  experiments: z
    .array(
      z.any().refine(isExperiment, {
        message: "Expected an experiment created with s.experiment()",
      }),
    )
    .min(1, "At least one experiment is required"),
});

// ─── SmileConfig Class ───────────────────────────────────────────────────────

export class SmileConfig {
  private _experimentMap?: Map<string, Experiment>;

  readonly experiments: Experiment[];
  readonly activeExperiment?: string;

  private constructor(experiments: Experiment[], activeExperiment?: string) {
    this.experiments = experiments;
    this.activeExperiment = activeExperiment;
  }

  /** @throws ZodError if the input is invalid */
  static create(config: SmileConfigInput): SmileConfig {
    SmileConfigInputSchema.parse(config);

    const seen = new Set<string>();
    for (const exp of config.experiments) {
      if (seen.has(exp.id)) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            path: ["experiments"],
            message: `Duplicate experiment ID: "${exp.id}"`,
          },
        ]);
      }
      seen.add(exp.id);
    }

    if (config.activeExperiment) {
      const ids = config.experiments.map((e) => e.id);
      if (!ids.includes(config.activeExperiment)) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            path: ["activeExperiment"],
            message: `"${config.activeExperiment}" not found. Available: ${ids.join(", ")}`,
          },
        ]);
      }
    }

    return new SmileConfig(config.experiments, config.activeExperiment);
  }

  // ─── Computed Properties ─────────────────────────────────────────────────

  /** The active identifier, defaulting to the first experiment. */
  get active(): string {
    return this.activeExperiment ?? this.experiments[0]?.id ?? "";
  }

  private get experimentMap(): Map<string, Experiment> {
    if (!this._experimentMap) {
      this._experimentMap = new Map(this.experiments.map((e) => [e.id, e]));
    }
    return this._experimentMap;
  }

  // ─── Methods ─────────────────────────────────────────────────────────────

  get(id: string): Experiment | undefined {
    return this.experimentMap.get(id);
  }

  getActive(): Experiment | undefined {
    return this.get(this.active);
  }

  has(id: string): boolean {
    return this.experimentMap.has(id);
  }

  getExperimentIds(): string[] {
    return this.experiments.map((e) => e.id);
  }

  getByName(name: string): Experiment[] {
    return this.experiments.filter((e) => e.name === name);
  }

  getLatestByName(name: string): Experiment | undefined {
    const experiments = this.getByName(name);
    return experiments[experiments.length - 1];
  }
}

// ─── Factory Function ────────────────────────────────────────────────────────

/**
 * Validate a configuration and return it in plain form for export from
 * `smile.config.ts`.
 *
 * @throws ZodError if the input is invalid
 */
export function defineSmileConfig(config: SmileConfigInput): SmileConfigDefinition {
  SmileConfig.create(config);
  return {
    experiments: config.experiments,
    ...(config.activeExperiment !== undefined ? { activeExperiment: config.activeExperiment } : {}),
  };
}
