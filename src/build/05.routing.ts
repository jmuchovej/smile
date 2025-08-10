import { addServerHandler, extendPages, resolveFiles, useNuxt } from "@nuxt/kit";
import type { NuxtPage } from "@nuxt/schema";
import { useLogger } from "../runtime/internal";
import { mkNitroRoute, mkNuxtRoute } from "./utils/routing";
import { defineBuildStep, useSmile } from "./utils/runner";
import { scanExperimentDirectory } from "./utils/timeline";

export default defineBuildStep({
  name: "routing",
  async setup({ runtimeResolve, paths }) {
    const logger = useLogger("routing");

    logger.start("Adding Smile's built-in pages!");
    const pageBase = runtimeResolve("./app/pages");
    const pageFiles = await resolveFiles(pageBase, "**/*.vue");

    extendPages((pages: NuxtPage[]) => {
      pages.push(
        ...pageFiles
          .filter((file) =>
            ["experiment/[experiment]/[...slug].vue"].every(
              (path) => !file.endsWith(path)
            )
          )
          .map((file) => mkNuxtRoute(pageBase, file))
      );
    });

    logger.success("Added Smile's built-in pages!");

    logger.start("Adding Smile's built-in API routes!");
    const apiBase = runtimeResolve("./server/api");
    const apiFiles = await resolveFiles(apiBase, "**/*.ts");

    for (const apiFile of apiFiles) {
      addServerHandler(mkNitroRoute(apiBase, apiFile));
    }
    logger.success("Added Smile's built-in api routes!");

    logger.start("Adding your experiment's routes!");
    const { experiments } = useSmile();
    const timelines = await Promise.all(
      Object.values(experiments).map(
        async (experiment) =>
          await scanExperimentDirectory(
            experiment.id,
            experiment.basename,
            paths.root,
            experiment.stimuli.parameters
          )
      )
    );

    logger.debug(timelines.length);

    if (timelines.length === 0) {
      logger.warn(
        "No timeline files matched to experiments - skipping route generation"
      );
    }

    // Generate timeline routes for each experiment
    const file = runtimeResolve("./app/pages/experiment/[experiment]/[...slug].vue");

    const experimentPages: NuxtPage[] = [];
    for (const timeline of timelines) {
      const experimentID = timeline.experiment;
      logger.start(`Generating routes for ${experimentID}...`);
      logger.debug(`  Timeline has ${timeline.steps.length} steps`);
      const experiment = experiments[experimentID];
      if (!experiment) {
        logger.error(`  This shouldn't happen - experiment ${experimentID} not found`);
        continue;
      }
      if (timeline.steps.length === 0) {
        logger.error(`  This shouldn't happen - no timeline steps found!`);
        continue;
      }

      // Register routes for each timeline step
      for (const step of timeline.steps) {
        const { id, filetype, filepath, route, kind } = step;
        logger.debug(`Processing step: [${kind}] id=${id}, route=${route}`);
        const page = {
          name: route.split("/").filter(Boolean).join("-"),
          path: route,
          file,
          meta: {
            filetype,
            filepath,
          },
        } satisfies NuxtPage;

        experimentPages.push(page);
        logger.debug(`Registered route: ${page.path}`);
      }
    }
    extendPages((pages) => {
      pages.push(...experimentPages);
    });

    // Store timeline definitions in runtime config for API access
    const nuxt = useNuxt();
    nuxt.options.runtimeConfig.smile.timelines = Object.fromEntries(
      timelines.map((timeline) => [timeline.experiment, timeline])
    );

    logger.success("Added all of your experiment's routes!");
  },
});
