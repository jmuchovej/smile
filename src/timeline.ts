import { resolveFiles } from "@nuxt/kit";
import { basename, extname, relative } from "pathe";

/**
 * Numeric ordering helper (adapted from @nuxt/content)
 */
export function refineURLPart(name: string): string {
  const part = name.split(/[/:]/).pop()!;

  // Remove numbering (01.overview -> overview)
  return part
    .replace(/(\d+\.)?(.*)/, "$2")
    .replace(/^index(\.draft)?$/, "") // Remove index keyword
    .replace(/\.draft$/, ""); // Remove draft keyword
}

export function refineURLMatcher(url: string | string[]) {
  const parts = (Array.isArray(url) ? url : [url]).join("/");

  const matchers = parts.replaceAll(/\[[^/]+\]/g, (match) => {
    match = match.replaceAll(/\[|\]/g, "");
    if (match.includes("...")) {
      return `**:${match.replace(/.../, "")}`;
    }
    return `:${match}`;
  });

  return `${matchers}`;
}

/**
 * Raw file information discovered from the file system.
 * This is what we get from scanning /smile/experiment-name/ directories.
 */
export interface TimelineFile {
  id: string;

  /** Absolute path to the file */
  path: string;

  /** Path relative to experiment root (e.g., "1.instructions/01.overview.mdx") */
  relpath: string;

  route: string;

  /** File type */
  type: "vue" | "mdx";

  /** Extracted numeric order (e.g., 01 from "01.overview.mdx") */
  order: number | null;

  /** Directory depth from experiment root */
  depth: number;

  /** Parent directory name */
  dirname: string | undefined;
}

export async function globTimelineFiles(rootDir: string): Promise<TimelineFile[]> {
  const files = await resolveFiles(rootDir, ["**/*.vue", "**/*.mdx"]);

  function processFile(path: string): TimelineFile {
    const extension = extname(path);
    const relpath = relative(rootDir, path);
    const type = extension.replace(/^\./, "") as TimelineFile["type"];
    const segments = relpath.replace(extension, "").split("/");
    const filename = basename(path);

    // Extract order from filename (e.g., "01.overview.mdx" -> 1)
    const match = filename.match(/^(?<order>\d+)\./);
    const order = match?.groups?.order ? Number.parseInt(match.groups.order, 10) : null;

    return {
      id: segments.map(refineURLPart).join("-"),
      path: path,
      relpath: relpath,
      route: `/experiment/${refineURLMatcher(segments.map(refineURLPart))}`,
      type,
      order,
      depth: segments.length - 1,
      dirname: segments.length > 1 ? segments[segments.length - 2] : undefined,
    };
  }

  return files.map(processFile).sort((a, b) => {
    // Sort by depth first, then by order
    if (a.depth !== b.depth) return a.depth - b.depth;
    if (a.order !== null && b.order !== null) return a.order - b.order;
    return a.route.localeCompare(b.route);
  });
}
