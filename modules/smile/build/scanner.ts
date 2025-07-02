/**
 * Build-time scanning of an experiment directory.
 *
 * Turns `experiments/{name}/` into a timeline tree, Nuxt page routes, and
 * the flat ordered sequence of entries a participant walks through.
 */
import { existsSync, readdirSync, statSync } from "node:fs";

import type { NuxtPage } from "@nuxt/schema";
import { join, relative } from "pathe";

import {
  type TimelineNode,
  areChildrenOrdered,
  buildSmileId,
  calculatePrefixDigitWidth,
  dynamicParamName,
  generateRouteName,
  generateRoutePath,
  isDynamicSegment,
  isPageFile,
  normalizePrefix,
  parseNumericPrefix,
  sortByName,
  sortByPrefix,
  validateChildren,
  validateDynamicSegments,
} from "./timeline";

// ─── Types ───────────────────────────────────────────────────────────────────

export class ExperimentScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExperimentScanError";
  }
}

/** One step of the participant's sequence, after dynamic expansion. */
export interface TimelineEntry {
  /** Position in the sequence, 0-based. */
  index: number;
  smileId: string;
  routeName: string;
  /** Concrete URL path with parameters substituted. */
  path: string;
  /** Route parameters for dynamic pages. */
  params: Record<string, string>;
  /** Page file relative to the experiment directory. */
  page: string;
  isDynamic: boolean;
  /** Trial identifier bound to a dynamic page. */
  trialId?: string | number;
  /** SmileID of the nearest unordered ancestor block, if any. */
  unorderedGroup?: string;
}

/** A page's route as registered with Nuxt, plus its manifest data. */
export interface ScannedRoute {
  route: NuxtPage;
  smileId: string;
  page: string;
  isDynamic: boolean;
}

export interface ScanResult {
  experimentName: string;
  /** The directory the pages were read from. */
  experimentDir: string;
  tree: TimelineNode;
  /** Leaf pages in presentation order (before dynamic expansion). */
  pages: TimelineNode[];
  routes: ScannedRoute[];
  entries: TimelineEntry[];
}

export interface ScanOptions {
  experimentsDir: string;
  /** Experiment name, e.g. `stroop`. */
  name: string;
  /** Experiment version, e.g. `pilot`. Selects `{name}@{version}/` when present. */
  version: string;
  /** Trial identifiers to expand dynamic segments with, in presentation order. */
  trialIds: Array<string | number>;
}

const IGNORED_NAMES = new Set([".DS_Store", "thumbs.db", ".gitkeep", "node_modules"]);

function shouldIgnore(name: string): boolean {
  return IGNORED_NAMES.has(name) || name.startsWith("_") || name.startsWith(".");
}

// ─── Directory Resolution ────────────────────────────────────────────────────

/**
 * `experiments/{name}@{version}/` when it exists, otherwise
 * `experiments/{name}/`.
 *
 * @throws ExperimentScanError naming both candidates when neither exists
 */
export function resolveExperimentDir(
  experimentsDir: string,
  name: string,
  version: string,
): string {
  const versioned = join(experimentsDir, `${name}@${version}`);
  const plain = join(experimentsDir, name);
  if (existsSync(versioned) && statSync(versioned).isDirectory()) return versioned;
  if (existsSync(plain) && statSync(plain).isDirectory()) return plain;
  throw new ExperimentScanError(
    `No experiment directory for "${name}@${version}": looked for ${versioned} and ${plain}`,
  );
}

// ─── Tree ────────────────────────────────────────────────────────────────────

interface ParsedEntry {
  fileName: string;
  isDirectory: boolean;
  prefix: string | null;
  name: string;
  relativePath: string;
}

function scanDirectory(
  dirPath: string,
  relativePath: string,
  ancestorPrefixes: string[],
  experimentDir: string,
): TimelineNode {
  const parsed: ParsedEntry[] = [];
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    if (shouldIgnore(entry.name)) continue;
    const isDirectory = entry.isDirectory();
    if (!isDirectory && !isPageFile(entry.name)) continue;
    const { prefix, name } = parseNumericPrefix(entry.name);
    parsed.push({
      fileName: entry.name,
      isDirectory,
      prefix,
      name,
      relativePath: relativePath ? `${relativePath}/${entry.name}` : entry.name,
    });
  }

  const digitWidth = calculatePrefixDigitWidth(parsed.map((p) => p.prefix));
  const children: TimelineNode[] = [];

  for (const entry of parsed) {
    const prefix = entry.prefix !== null ? normalizePrefix(entry.prefix, digitWidth) : null;
    const dynamic = isDynamicSegment(entry.name);
    const smileId = buildSmileId(ancestorPrefixes, prefix, entry.name);

    if (entry.isDirectory) {
      const nextAncestors =
        prefix !== null
          ? [...ancestorPrefixes, prefix]
          : dynamic
            ? [...ancestorPrefixes, entry.name]
            : ancestorPrefixes;
      const block = scanDirectory(
        join(dirPath, entry.fileName),
        entry.relativePath,
        nextAncestors,
        experimentDir,
      );
      block.smileId = smileId;
      block.name = entry.name;
      block.prefix = prefix;
      block.isDynamic = dynamic;
      children.push(block);
    } else {
      children.push({
        smileId,
        name: entry.name,
        prefix,
        path: entry.relativePath,
        type: "page",
        isDynamic: dynamic,
      });
    }
  }

  const label = relativePath ? relative(experimentDir, join(experimentDir, relativePath)) : ".";
  validateChildren(children, label === "." ? experimentDir : `${experimentDir}/${label}`);
  validateDynamicSegments(children, label === "." ? experimentDir : `${experimentDir}/${label}`);

  const childrenOrdered = areChildrenOrdered(children);
  const sorted = childrenOrdered ? sortByPrefix(children) : sortByName(children);

  return {
    smileId: "",
    name: "",
    prefix: null,
    path: relativePath,
    type: "block",
    isDynamic: false,
    children: sorted,
    childrenOrdered,
  };
}

function collectPages(node: TimelineNode, out: TimelineNode[] = []): TimelineNode[] {
  if (node.type === "page") {
    out.push(node);
    return out;
  }
  for (const child of node.children ?? []) collectPages(child, out);
  return out;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

function buildRoutes(
  pages: TimelineNode[],
  experimentName: string,
  experimentDir: string,
): ScannedRoute[] {
  const byPath = new Map<string, string>();
  const byName = new Map<string, string>();
  const routes: ScannedRoute[] = [];

  for (const page of pages) {
    const path = generateRoutePath(experimentName, page.path);
    const name = generateRouteName(experimentName, page.path);

    const clashPath = byPath.get(path);
    if (clashPath !== undefined) {
      throw new ExperimentScanError(
        `Pages "${clashPath}" and "${page.path}" both resolve to the route ${path}`,
      );
    }
    const clashName = byName.get(name);
    if (clashName !== undefined) {
      throw new ExperimentScanError(
        `Pages "${clashName}" and "${page.path}" both resolve to the route name ${name}`,
      );
    }
    byPath.set(path, page.path);
    byName.set(name, page.path);

    routes.push({
      smileId: page.smileId,
      page: page.path,
      isDynamic:
        page.isDynamic ||
        page.path.split("/").some((s) => isDynamicSegment(parseNumericPrefix(s).name)),
      route: {
        name,
        path,
        file: join(experimentDir, page.path),
        meta: {
          layout: "smile",
          smileExperiment: experimentName,
          smileId: page.smileId,
          smilePage: page.path,
        },
      },
    });
  }

  return routes;
}

// ─── Flat Sequence ───────────────────────────────────────────────────────────

interface ExpansionContext {
  experimentName: string;
  trialIds: Array<string | number>;
  entries: TimelineEntry[];
}

function expand(
  node: TimelineNode,
  ctx: ExpansionContext,
  params: Record<string, string>,
  trialId: string | number | undefined,
  unorderedGroup: string | undefined,
): void {
  if (node.type === "page") {
    const dynamic = node.isDynamic;
    const ids = dynamic ? ctx.trialIds : [undefined];
    for (const id of ids) {
      const entryParams = { ...params };
      let entryTrial = trialId;
      if (dynamic && id !== undefined) {
        entryParams[dynamicParamName(node.name)] = String(id);
        entryTrial = id;
      }
      const routeName = generateRouteName(ctx.experimentName, node.path);
      const path = generateRoutePath(ctx.experimentName, node.path).replace(
        /:([A-Za-z0-9_]+)/g,
        (_, key: string) => entryParams[key] ?? `:${key}`,
      );
      ctx.entries.push({
        index: ctx.entries.length,
        smileId: node.smileId,
        routeName,
        path,
        params: entryParams,
        page: node.path,
        isDynamic: dynamic || Object.keys(entryParams).length > 0,
        ...(entryTrial !== undefined ? { trialId: entryTrial } : {}),
        ...(unorderedGroup !== undefined ? { unorderedGroup } : {}),
      });
    }
    return;
  }

  const group = node.childrenOrdered === false ? node.smileId || "." : unorderedGroup;
  if (node.isDynamic) {
    for (const id of ctx.trialIds) {
      const nextParams = { ...params, [dynamicParamName(node.name)]: String(id) };
      for (const child of node.children ?? []) expand(child, ctx, nextParams, id, group);
    }
    return;
  }

  for (const child of node.children ?? []) expand(child, ctx, params, trialId, group);
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

/**
 * Scans the active experiment's directory.
 *
 * @throws ExperimentScanError, MixedNumberingError or AmbiguousDynamicSegmentError
 */
export function scanExperiment(options: ScanOptions): ScanResult {
  const experimentDir = resolveExperimentDir(options.experimentsDir, options.name, options.version);
  const tree = scanDirectory(experimentDir, "", [], experimentDir);
  tree.name = options.name;

  const pages = collectPages(tree);
  if (pages.length === 0) {
    throw new ExperimentScanError(`Experiment directory ${experimentDir} contains no .vue pages`);
  }

  const routes = buildRoutes(pages, options.name, experimentDir);

  const ctx: ExpansionContext = {
    experimentName: options.name,
    trialIds: options.trialIds,
    entries: [],
  };
  expand(tree, ctx, {}, undefined, undefined);

  return {
    experimentName: options.name,
    experimentDir,
    tree,
    pages,
    routes,
    entries: ctx.entries,
  };
}

/** Names of the experiment directories under `experimentsDir`, sorted. */
export function listExperimentDirs(experimentsDir: string): string[] {
  if (!existsSync(experimentsDir)) return [];
  return readdirSync(experimentsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !shouldIgnore(e.name))
    .map((e) => e.name)
    .sort();
}
