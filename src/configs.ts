import type { ResolvedExperiment } from "./build/core/experiment";
import type { DefinedTimeline } from "./runtime/types/timeline";

// declare module '#smile/experiments' {
//   export const experiments: Record<string, unknown>
// }

declare module "nuxt/schema" {
  interface AppConfig {
    smile: SmileAppConfig;
  }

  interface RuntimeConfig {
    smile: SmileRuntimeConfig;
  }

  interface PublicRuntimeConfig {
    smile: SmilePublicRuntimeConfig;
  }
}

export interface SmileRuntimeConfig {
  experiments: Record<string, ResolvedExperiment>;
  timelines: Record<string, DefinedTimeline>;
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
