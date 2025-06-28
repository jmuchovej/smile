/**
 * Build-time loading of `smile.config.ts`.
 *
 * Finds the configuration file, evaluates it through c12 (so TypeScript and
 * the `#smile` alias work outside the Nuxt bundler), validates the result,
 * and resolves which experiment is active after applying overrides.
 */
import { existsSync } from "node:fs";

import { loadConfig, watchConfig } from "c12";
import { resolve } from "pathe";

import { SmileConfig, type SmileConfigDefinition } from "../builder/config";
import type { Experiment } from "../builder/experiment";

// ─── Types ───────────────────────────────────────────────────────────────────

export class ConfigLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigLoadError";
  }
}

export interface LoadSmileConfigOptions {
  /** Project root; the config file is searched here. */
  rootDir: string;
  /** Directory the `#smile` alias resolves to (the module directory). */
  moduleDir: string;
  /** Base name of the config file without extension. Default `smile.config`. */
  configPath?: string;
  /** Module-option override for the active experiment. */
  experimentOverride?: string;
  /** Environment to read `SMILE_EXPERIMENT` from. Default `process.env`. */
  env?: Record<string, string | undefined>;
}

/** Where the active experiment identifier came from. */
export type ActiveExperimentSource = "env" | "option" | "config" | "default";

export interface LoadedSmileConfig {
  /** Absolute path of the config file, or null when none was found. */
  configFile: string | null;
  /** The validated configuration, or null when no file was found. */
  config: SmileConfig | null;
  /** Identifier of the active experiment, or null when no file was found. */
  activeExperiment: string | null;
  /** The resolved active experiment, or null when no file was found. */
  experiment: Experiment | null;
  /** How the active experiment was chosen. */
  activeSource: ActiveExperimentSource | null;
}

// ─── Discovery ───────────────────────────────────────────────────────────────

export const CONFIG_EXTENSIONS = [".ts", ".mts", ".js", ".mjs"] as const;
export const DEFAULT_CONFIG_NAME = "smile.config";

/** Returns the absolute path of the config file, or null if none exists. */
export function findConfigFile(rootDir: string, configPath = DEFAULT_CONFIG_NAME): string | null {
  for (const ext of CONFIG_EXTENSIONS) {
    const candidate = resolve(rootDir, `${configPath}${ext}`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** The file names that would be accepted, for messages. */
export function expectedConfigFiles(configPath = DEFAULT_CONFIG_NAME): string[] {
  return CONFIG_EXTENSIONS.map((ext) => `${configPath}${ext}`);
}

// ─── Loading ─────────────────────────────────────────────────────────────────

function c12Options(opts: LoadSmileConfigOptions) {
  return {
    name: "smile",
    cwd: opts.rootDir,
    // Base name only: c12 appends the extension itself, both when loading
    // and when computing the files its watcher should follow.
    configFile: opts.configPath ?? DEFAULT_CONFIG_NAME,
    rcFile: false as const,
    globalRc: false,
    dotenv: false,
    packageJson: false,
    jitiOptions: {
      alias: { "#smile": opts.moduleDir },
    },
  };
}

interface ZodLikeIssue {
  path?: Array<string | number>;
  message: string;
}

/** Formats an error thrown while evaluating the config file. */
export function describeConfigError(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as { name?: string; issues?: ZodLikeIssue[]; message?: string };
    // The config file evaluates its own copy of zod, so check by shape.
    if (err.name === "ZodError" && Array.isArray(err.issues)) {
      return err.issues
        .map((issue) => {
          const path = issue.path && issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
          return `${path}${issue.message}`;
        })
        .join("; ");
    }
    if (typeof err.message === "string") return err.message;
  }
  return String(error);
}

/** Picks the raw (unmerged) config object out of a c12 result. */
function rawConfig(result: {
  config?: unknown;
  layers?: Array<{ config?: unknown }>;
}): SmileConfigDefinition | null {
  const layer = result.layers?.[0]?.config;
  const value = layer ?? result.config;
  if (!value || typeof value !== "object") return null;
  return value as SmileConfigDefinition;
}

/**
 * Resolves the active experiment identifier: `SMILE_EXPERIMENT`, then the
 * module option, then the file's `activeExperiment`, then the first
 * experiment.
 *
 * @throws ConfigLoadError when an override names an unknown experiment
 */
export function resolveActiveExperiment(
  config: SmileConfig,
  opts: Pick<LoadSmileConfigOptions, "experimentOverride" | "env">,
  configFile: string,
): { id: string; source: ActiveExperimentSource } {
  const env = opts.env ?? process.env;
  const candidates: Array<[string | undefined, ActiveExperimentSource]> = [
    [env.SMILE_EXPERIMENT, "env"],
    [opts.experimentOverride, "option"],
    [config.activeExperiment, "config"],
  ];

  for (const [id, source] of candidates) {
    if (!id) continue;
    if (!config.has(id)) {
      const label =
        source === "env"
          ? "SMILE_EXPERIMENT"
          : source === "option"
            ? "the `smile.experiment` option"
            : `activeExperiment in ${configFile}`;
      throw new ConfigLoadError(
        `${label} names "${id}", which is not defined. Available: ${config.getExperimentIds().join(", ")}`,
      );
    }
    return { id, source };
  }

  return { id: config.active, source: "default" };
}

/**
 * Loads and validates the project configuration.
 *
 * Returns a result with null fields when no config file exists; the caller
 * decides whether that is a warning. Throws `ConfigLoadError` for any
 * invalid configuration.
 */
export async function loadSmileConfig(opts: LoadSmileConfigOptions): Promise<LoadedSmileConfig> {
  const configFile = findConfigFile(opts.rootDir, opts.configPath);
  if (!configFile) {
    return {
      configFile: null,
      config: null,
      activeExperiment: null,
      experiment: null,
      activeSource: null,
    };
  }

  let definition: SmileConfigDefinition | null;
  try {
    const result = await loadConfig<SmileConfigDefinition>(c12Options(opts));
    definition = rawConfig(result);
  } catch (error) {
    throw new ConfigLoadError(`Failed to load ${configFile}: ${describeConfigError(error)}`);
  }

  if (!definition || !Array.isArray(definition.experiments)) {
    throw new ConfigLoadError(
      `Failed to load ${configFile}: the default export must be the result of defineSmileConfig()`,
    );
  }

  let config: SmileConfig;
  try {
    config = SmileConfig.create(definition);
  } catch (error) {
    throw new ConfigLoadError(
      `Invalid configuration in ${configFile}: ${describeConfigError(error)}`,
    );
  }

  const { id, source } = resolveActiveExperiment(config, opts, configFile);
  const experiment = config.get(id) ?? null;

  return { configFile, config, activeExperiment: id, experiment, activeSource: source };
}

// ─── Watching ────────────────────────────────────────────────────────────────

export interface WatchSmileConfigOptions extends LoadSmileConfigOptions {
  /** Called when the config file (or a file it imports) changes. */
  onChange: (event: { type: string; path: string }) => void;
}

/**
 * Watches the config file during development. Returns a function that stops
 * watching, or null when no config file exists.
 */
export async function watchSmileConfig(
  opts: WatchSmileConfigOptions,
): Promise<(() => Promise<void>) | null> {
  const configFile = findConfigFile(opts.rootDir, opts.configPath);
  if (!configFile) return null;

  const watcher = await watchConfig<SmileConfigDefinition>({
    ...c12Options(opts),
    onWatch: (event) => opts.onChange({ type: event.type, path: event.path }),
  });

  return () => watcher.unwatch();
}
