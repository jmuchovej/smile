import { useNuxt } from "@nuxt/kit";
import { useLogger } from "../runtime/internal";
import { resolveSmileConfig } from "./core/config";
import { defineBuildStep, setSmile } from "./utils/runner";

export default defineBuildStep({
  name: "config",
  async setup() {
    const logger = useLogger("config");
    const nuxt = useNuxt();

    logger.debug("Loading `smile.config.ts`...");
    const config = await resolveSmileConfig();
    setSmile(config);
    const { activeExperiment, experiments } = config;
    logger.success("Loaded & parsed `smile.config.ts`!");

    nuxt.options.appConfig.smile.activeExperiment = activeExperiment;
    nuxt.options.runtimeConfig.public.smile.activeExperiment = activeExperiment;

    const versions = Object.keys(experiments) as string[];
    nuxt.options.appConfig.smile.availableExperiments = versions;
    nuxt.options.runtimeConfig.smile.experiments = experiments;
  },
});
