import type { ResolvedExperiment } from "./experiment";

// declare module '#smile/experiments' {
//   export const experiments: Record<string, unknown>
// }

declare module "@nuxt/schema" {
  interface RuntimeConfig {
    smile: SmileRuntimeConfig;
  }
  interface PublicRuntimeConfig {
    smile: SmilePublicRuntimeConfig;
  }
}

export interface SmileRuntimeConfig {
  activeExperiment: string;
  experiments: Record<string, ResolvedExperiment>;
  database: {
    path: string;
  };
  session: {
    secret: string;
  };
}

export interface SmilePublicRuntimeConfig {
  database: {};
}

export interface SmileAppConfig {
  activeExperiment: string;
  availableExperiments: string[];
}
