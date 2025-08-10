import { resolveFiles } from "@nuxt/kit";
import { extname, relative } from "pathe";
import { cleanDoubleSlashes, withLeadingSlash } from "ufo";
import { useLogger } from "../../runtime/internal";
import type {
  DefinedTimeline,
  DefinedTimelineStep,
  TimelineParameters,
} from "../../runtime/types/timeline";
import { refineRoute } from "./routing";

function processFile(
  relpath: string,
  parameters: Record<string, string>
): DefinedTimelineStep {
  const extension = extname(relpath);
  const type = extension.replace(/^\./, "") as "vue" | "mdx";
  // Pull out the ID as-defined by the the numeric ordering
  // `(?<=\/)\d+` - digits after `/` (numeric prefixes)
  // `\[\w+\]` - bracket notation for matching dynamic routes anywhere
  const orderMatch = /^\d+/;
  const slugMatch = /\[[^/]+\]/;
  const id = withLeadingSlash(relpath)
    .split("/")
    .flatMap((segment) => segment.split("."))
    .filter((segment) => orderMatch.test(segment) || slugMatch.test(segment))
    .map((segment) => {
      if (orderMatch.test(segment)) return segment;

      const parameter = parameters[segment.replace(/\[|\]/g, "")];
      return `[${parameter}]`;
    })
    .join(".");

  if (!id) {
    throw new Error(`Generated an invalid [id=${id}] for ${relpath}!`);
  }

  const route = cleanDoubleSlashes(refineRoute(relpath));
  const step: Partial<DefinedTimelineStep> = {
    id: id,
    filetype: type,
    filepath: relpath,
    route: route,
    kind: /\[\w+\]/.test(id) ? "dynamic" : "static",
  };

  return step as DefinedTimelineStep;
}

/**
 * Scan experiment directory and create timeline template with ordered sections
 */
export async function scanExperimentDirectory(
  experimentID: string,
  experimentDir: string,
  rootDir: string,
  parameters: TimelineParameters
): Promise<DefinedTimeline> {
  const logger = useLogger("utils", "timeline");
  const ondisk = await resolveFiles(rootDir, [
    `experiments/${experimentDir}/**/*.vue`,
    `experiments/${experimentDir}/**/*.mdx`,
  ]);
  const { stimuli, ...keys } = parameters;
  const schemaToParameters = Object.fromEntries(
    Object.entries(keys).map(([parameter, field]) => [field, parameter])
  );

  function createTimelineFile(path: string) {
    const relpath = relative(rootDir, path);
    return processFile(relpath, schemaToParameters);
  }

  const steps = ondisk
    .map((file) =>
      file.replace(`experiments/${experimentDir}`, `experiments/${experimentID}`)
    )
    .map(createTimelineFile);
  logger.debug(`Found ${steps.length} steps!`);
  steps.sort((a, b) => a.id.localeCompare(b.id));

  return {
    experiment: experimentID,
    steps,
  };
}
