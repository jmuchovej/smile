import type { NuxtPage } from "@nuxt/schema";
import type { RouterMethod } from "h3";
import type { NitroEventHandler } from "nitropack";
import { extname, relative } from "pathe";
import {
  cleanDoubleSlashes,
  parseFilename,
  withBase,
  withLeadingSlash,
  withTrailingSlash,
} from "ufo";
import { useLogger } from "../../runtime/internal";

/**
 * Numeric ordering helper (adapted from @nuxt/content)
 */
export function refineURLPart(name: string): string {
  // biome-ignore lint/style/noNonNullAssertion: This should never be null, but it's to keep TypeScript from claiming it might be...
  const part = name.split(/[/:]/).pop()!;

  // Remove numbering (01.overview -> overview)
  return part
    .replace(/(\d+\.)?(.*)/, "$2")
    .replace(/^index(\.draft)?$/, "") // Remove index keyword
    .replace(/\.draft$/, ""); // Remove draft keyword
}

/**
 *
 */
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

// Overload declarations
export function refineRoute(basepath: string, path: string): string;
export function refineRoute(relpath: string): string;

// Implementation
export function refineRoute(basepathOrRelpath: string, path?: string): string {
  if (path !== undefined) {
    // Two-parameter version: convert to relative path and recurse
    const relpath = relative(basepathOrRelpath, path);
    return refineRoute(relpath);
  }

  // One-parameter version: do the actual processing
  const relpath = basepathOrRelpath;
  const extless = relpath.replace(extname(relpath), "");
  const route = refineURLMatcher(extless.split("/").map(refineURLPart));
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
