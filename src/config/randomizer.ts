export interface RandomizerBase {
  name: string;
  options: Record<string, unknown>;
}

export function defineRandomizer<T extends RandomizerBase>(config: T): T {
  return config;
}

export const nullRandomizer = defineRandomizer({
  name: "null",
  options: {},
} as const);

export const shuffleRandomizer = defineRandomizer({
  name: "shuffle",
  options: {},
} as const);

export const builtinRandomizers = {
  null: nullRandomizer,
  shuffle: shuffleRandomizer,
} as const;

export type BuiltinRandomizerName = keyof typeof builtinRandomizers;
export type BuiltinRandomizer = typeof builtinRandomizers[BuiltinRandomizerName];

// User-facing type that accepts shorthand strings or full objects
export type DefinedRandomizer =
  | BuiltinRandomizerName  // "null" | "shuffle"
  | RandomizerBase          // Custom randomizer object
  | string;                 // Any other string for custom randomizers

export interface ResolvedRandomizer {
  name: string;
  options: Record<string, unknown>;
}

// Helper function to resolve randomizer definitions to ResolvedRandomizer
export function resolveRandomizer(randomizer: DefinedRandomizer): ResolvedRandomizer {
  if (typeof randomizer === "string") {
    // Check if it's a built-in randomizer
    if (randomizer in builtinRandomizers) {
      const builtin = builtinRandomizers[randomizer as BuiltinRandomizerName];
      return {
        name: builtin.name,
        options: builtin.options,
      };
    }
    // Otherwise treat as custom randomizer with no options
    return {
      name: randomizer,
      options: {},
    };
  }
  // Full randomizer object
  return {
    name: randomizer.name,
    options: randomizer.options,
  };
}
