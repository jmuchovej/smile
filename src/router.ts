import { addServerHandler, extendPages, resolveFiles } from "@nuxt/kit";
import type { NuxtPage } from "@nuxt/schema";
import type { RouterMethod } from "h3";
import type { NitroEventHandler } from "nitropack";
import { extname, join, parse, relative } from "pathe";
import {
    cleanDoubleSlashes,
    parseFilename,
    withBase,
    withLeadingSlash,
    withTrailingSlash,
} from "ufo";
import { useLogger } from "./runtime/internal";
import {
    globTimelineFiles,
    refineURLMatcher,
    refineURLPart,
    type TimelineFile,
} from "./timeline";
import type { SmileBuildConfig } from "./types/build-config";

export async function generateInternalRoutes(config: SmileBuildConfig): Promise<void> {
  const logger = useLogger("router", "internal");
  const {
    resolver: { resolve },
  } = config;

  const pageBase = resolve("./runtime/app/pages");
  const pageFiles = await resolveFiles(pageBase, "**/*.vue");

  extendPages((pages: NuxtPage[]) => {
    pages.push(
      ...pageFiles
      .filter((file) => [
        "experiment/[experiment]/[...slug].vue",
      ].every(path => !file.endsWith(path)))
      .map((file) => mkNuxtRoute(pageBase, file))
    );
  });
  logger.success("Added Smile's built-in pages!");

  const apiBase = resolve("./runtime/server/api");
  const apiFiles = await resolveFiles(apiBase, "**/*.ts");

  for (const apiFile of apiFiles) {
    addServerHandler(mkNitroRoute(apiBase, apiFile));
  }
  logger.success("Added Smile's built-in api routes!");
}

export function refineRoute(basepath: string, path: string): string {
  const relpath = relative(basepath, path);
  const { dir, name } = parse(relpath.replace(extname(relpath), ""));

  const route = refineURLMatcher(join(dir, name).split("/").map(refineURLPart));

  return withTrailingSlash(withLeadingSlash(route));
}

export function mkNuxtRoute(base: string, file: string): NuxtPage {
  const logger = useLogger("router", "page");
  const route = refineRoute(base, file);
  const isIndex = parseFilename(file)?.startsWith("index");

  const name = cleanDoubleSlashes(
    ["smile", route, isIndex ? "index" : undefined].filter(Boolean).join("/")
  ).replace(/\//g, "-");

  return {
    name,
    path: cleanDoubleSlashes(route),
    file,
  } satisfies NuxtPage;
}

export function mkNitroRoute(base: string, path: string): NitroEventHandler {
  const logger = useLogger("router", "server");
  const route = withBase(refineRoute(base, path), "/api/s");
  const method = extname(path.replace(extname(path), "")).replace(/^\./, "");
  if (!method) {
    logger.error(
      `Attempted to add [method=${method}] for route=${route} to the Server API, but \`method\` is falsy!`
    );
    throw Error(
      "API Routes must be defined and have an associated method in their filename..."
    );
  }

  return {
    route: cleanDoubleSlashes(withBase(withLeadingSlash(route), "/api/s")),
    method: method as RouterMethod,
    handler: path,
  } satisfies NitroEventHandler;
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

    const file = resolve("./runtime/app/pages/experiment/[experiment]/[...slug].vue");

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
