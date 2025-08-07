import { addServerHandler, extendPages, resolveFiles } from "@nuxt/kit";
import type { NuxtPage } from "@nuxt/schema";
import type { RouterMethod } from "h3";
import { extname, relative, parse, join } from "pathe";
import type { SmileBuildConfig } from "./types/build-config";
import { useLogger } from "./runtime/internal";
import {
  globTimelineFiles,
  type TimelineFile,
  refineURLMatcher,
  refineURLPart,
} from "./timeline";

export async function generateInternalRoutes(config: SmileBuildConfig) {
  const logger = useLogger("router", "internal");
  const {
    resolver: { resolve },
  } = config;

  extendPages(async (pages) => {
    pages.push({
      name: "smile-config",
      path: "/config",
      file: resolve("./runtime/pages/config.vue"),
    });

    pages.push({
      name: "smile-admin-database",
      path: "/admin/database",
      file: resolve("./runtime/pages/admin/database/index.vue"),
    });

    pages.push({
      name: "smile-index",
      path: "/",
      file: resolve("./runtime/pages/index.vue"),
    });

    pages.push({
      name: "smile-experiment-index",
      path: "/experiment/:experiment",
      file: resolve("./runtime/pages/experiment/[experiment]/index.vue"),
    });
    pages.push({
      name: "smile-experiment-timeline",
      path: "/experiment/:experiment/_timeline",
      file: resolve("./runtime/pages/experiment/[experiment]/timeline.vue"),
      meta: {
        devOnly: true,
      },
    });
  });

  const apiBase = resolve("./runtime/server/api");
  const apiFiles = await resolveFiles(apiBase, "**/*.ts");

  for (const apiFile of apiFiles) {
    addAPIRoute(apiBase, apiFile);
  }
}

export function addAPIRoute(base: string, path: string) {
  const relpath = relative(base, path);
  const { dir, ext, name } = parse(relpath.replace(extname(relpath), ""));

  // const route = refineURLMatcher(join(root, name).split("/").map(refineURLPart));
  const rawRoute = join(dir, name);
  const route = refineURLMatcher(rawRoute);

  const method = ext.replace(/^\./, "");
  if (!route || !method) return;

  const finalRoute = `/api/smile/${route}`;

  addServerHandler({
    route: finalRoute,
    method: method as RouterMethod,
    handler: path,
  });
}

export async function generateExperimentRoutes(config: SmileBuildConfig) {
  const logger = useLogger("router", "experiment");
  const {
    resolver: { resolve },
  } = config;

  logger.info("Starting experiment route generation");

  const timelineFiles = await globTimelineFiles(config.paths.experiments);

  // Map timeline files to their corresponding experiments
  const experimentTimelines = new Map<string, TimelineFile[]>();

  for (const route of timelineFiles) {
    logger.debug(`  ${route.route}`);
    const dirname = route.relpath.split("/")[0] || "";

    // Find matching experiment(s) by directory name
    for (const [experimentId, experiment] of Object.entries(config.experiments)) {
      // Check if this experiment's path ends with the directory name
      if (experiment.basename === dirname) {
        const files = experimentTimelines.get(experimentId) || [];
        files.push(route);
        experimentTimelines.set(experimentId, files);
        logger.debug(`  Matched ${dirname} to experiment ${experimentId}`);
      }
    }
  }

  logger.debug(`found ${timelineFiles.length} timeline files...`);
  logger.debug(`Matched to experiments: ${[...experimentTimelines.keys()]}`);

  extendPages(async (pages) => {
    if (experimentTimelines.size === 0) {
      logger.warn(
        "No timeline files matched to experiments - skipping route generation"
      );
      return;
    }

    const file = resolve("./runtime/pages/experiment/[experiment]/[...slug].vue");

    // Generate timeline routes for each experiment
    for (const [experimentID, timeline] of experimentTimelines) {
      logger.debug(`Generating routes for ${experimentID}...`);
      const experiment = config.experiments[experimentID];
      if (!experiment) {
        logger.error(`This shouldn't happen - experiment ${experimentID} not found`);
        continue;
      }

      try {
        logger.debug(
          `Generating routes for ${experimentID} (${experiment.id}) from ${experiment.basename}/: ${timeline.length} files`
        );

        // Register routes for each timeline step
        for (const step of timeline) {
          const { type, route, relpath: filepath } = step;
          const path = route.split("/").some((segment) => segment === experiment.id)
            ? route
            : route.replace(experiment.name, experiment.id);
          const name = step.id.split("-").some((segment) => segment === experiment.id)
            ? step.path
            : step.path.replace(experiment.name, experiment.id);
          const page = {
            name,
            path,
            file,
            meta: {
              type,
              filepath,
            },
          } satisfies NuxtPage;

          pages.push(page);
          logger.debug(`Registered route: ${page.path}`);
        }
      } catch (error) {
        logger.error(
          `Failed to generate routes for ${experimentID} (${experiment.id}):`,
          error
        );
      }
    }
  });
}
