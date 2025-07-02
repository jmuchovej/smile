/**
 * Numbering rules for the `experiments/` directory: prefix parsing, SmileID
 * derivation, ordering, and the validation errors the scanner raises.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** A page or block inside an experiment directory. */
export interface TimelineNode {
  /** Hierarchical identifier derived from numeric prefixes, e.g. `3.[index].02`. */
  smileId: string;
  /** Name without numeric prefix and extension, e.g. `overview` or `[index]`. */
  name: string;
  /** Normalised numeric prefix, or null for unnumbered entries. */
  prefix: string | null;
  /** Path relative to the experiment directory, including the extension. */
  path: string;
  type: "page" | "block";
  /** True for `[param]` names. */
  isDynamic: boolean;
  /** Children of a block, in presentation order. */
  children?: TimelineNode[];
  /** For blocks: whether children are numbered (ordered) or a randomized group. */
  childrenOrdered?: boolean;
}

// ─── Prefix Parsing ──────────────────────────────────────────────────────────

const NUMERIC_PREFIX_REGEX = /^(\d+)\.(.+)$/;
const PAGE_EXTENSION_REGEX = /\.vue$/;

export interface ParsedName {
  prefix: string | null;
  name: string;
}

/**
 * Splits `01.welcome.vue` into prefix `01` and name `welcome`. Names without
 * a numeric prefix keep the whole stem and get a null prefix.
 */
export function parseNumericPrefix(fileName: string): ParsedName {
  const stem = fileName.replace(PAGE_EXTENSION_REGEX, "");
  const match = stem.match(NUMERIC_PREFIX_REGEX);
  if (match && match[1] !== undefined && match[2] !== undefined) {
    return { prefix: match[1], name: match[2] };
  }
  return { prefix: null, name: stem };
}

/** Digits needed to represent the largest prefix among siblings. */
export function calculatePrefixDigitWidth(prefixes: Array<string | null>): number {
  let max = 0;
  for (const prefix of prefixes) {
    if (prefix === null) continue;
    const value = Number.parseInt(prefix, 10);
    if (value > max) max = value;
  }
  return max > 0 ? String(max).length : 0;
}

/** Zero-pads a prefix to the sibling digit width, dropping excess zeros. */
export function normalizePrefix(prefix: string, digitWidth: number): string {
  const value = Number.parseInt(prefix, 10);
  return String(value).padStart(digitWidth, "0");
}

/**
 * Joins ancestor prefixes with the node's own prefix. Dynamic segments
 * contribute their bracketed name; unnumbered entries contribute nothing.
 */
export function buildSmileId(ancestors: string[], prefix: string | null, name: string): string {
  const parts = [...ancestors];
  if (isDynamicSegment(name)) {
    parts.push(name);
  } else if (prefix !== null) {
    parts.push(prefix);
  }
  return parts.join(".");
}

export function isDynamicSegment(name: string): boolean {
  return name.startsWith("[") && name.endsWith("]") && name.length > 2;
}

/** The parameter name of a dynamic segment: `[index]` gives `index`. */
export function dynamicParamName(name: string): string {
  return name.slice(1, -1);
}

export function isPageFile(fileName: string): boolean {
  return PAGE_EXTENSION_REGEX.test(fileName);
}

// ─── Validation ──────────────────────────────────────────────────────────────

export class MixedNumberingError extends Error {
  constructor(
    public readonly path: string,
    public readonly numbered: string[],
    public readonly unnumbered: string[],
  ) {
    super(
      `Mixed numbering in ${path}: numbered=[${numbered.join(", ")}], unnumbered=[${unnumbered.join(", ")}]. ` +
        "All entries in a directory must be numbered, or none of them.",
    );
    this.name = "MixedNumberingError";
  }
}

/** Siblings must be all numbered or all unnumbered. */
export function validateChildren(children: TimelineNode[], parentPath: string): void {
  const numbered: string[] = [];
  const unnumbered: string[] = [];
  for (const child of children) {
    (child.prefix !== null ? numbered : unnumbered).push(child.name);
  }
  if (numbered.length > 0 && unnumbered.length > 0) {
    throw new MixedNumberingError(parentPath, numbered, unnumbered);
  }
}

export class AmbiguousDynamicSegmentError extends Error {
  constructor(
    public readonly path: string,
    public readonly dynamicFile: string,
    public readonly siblings: string[],
  ) {
    super(
      `Ambiguous dynamic page in ${path}: ${dynamicFile} has siblings [${siblings.join(", ")}]. ` +
        `A dynamic page must be alone at its level; use a ${dynamicFile}/ directory to combine it with other pages.`,
    );
    this.name = "AmbiguousDynamicSegmentError";
  }
}

/**
 * A dynamic page (`[param].vue`) must be the only entry at its level. Dynamic
 * blocks (`[param]/`) may have siblings.
 */
export function validateDynamicSegments(children: TimelineNode[], parentPath: string): void {
  if (children.length <= 1) return;
  const dynamicPages = children.filter((c) => c.type === "page" && c.isDynamic);
  if (dynamicPages.length === 0) return;

  const first = dynamicPages[0]!;
  const others = children.filter((c) => c !== first).map((c) => c.name);
  throw new AmbiguousDynamicSegmentError(parentPath, first.name, others);
}

// ─── Ordering ────────────────────────────────────────────────────────────────

/** Numbered children are ordered; unnumbered children form a randomized group. */
export function areChildrenOrdered(children: TimelineNode[]): boolean {
  if (children.length === 0) return true;
  return children[0]!.prefix !== null;
}

export function sortByPrefix(children: TimelineNode[]): TimelineNode[] {
  return [...children].sort(
    (a, b) => Number.parseInt(a.prefix ?? "0", 10) - Number.parseInt(b.prefix ?? "0", 10),
  );
}

export function sortByName(children: TimelineNode[]): TimelineNode[] {
  return [...children].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/** Path segments without prefixes or extension: `1.a/02.b.vue` gives `["a", "b"]`. */
export function routeSegments(relativePath: string): string[] {
  return relativePath.split("/").map((segment) => parseNumericPrefix(segment).name);
}

/** `smile-{experiment}-{segments}`, with `[param]` reduced to `param`. */
export function generateRouteName(experimentName: string, relativePath: string): string {
  const segments = routeSegments(relativePath).map((s) =>
    isDynamicSegment(s) ? dynamicParamName(s) : s,
  );
  return ["smile", experimentName, ...segments].join("-");
}

/** `/experiment/{experiment}/{segments}` with `[param]` as `:param`. */
export function generateRoutePath(experimentName: string, relativePath: string): string {
  const segments = routeSegments(relativePath).map((s) =>
    isDynamicSegment(s) ? `:${dynamicParamName(s)}` : s,
  );
  return `/experiment/${experimentName}/${segments.join("/")}`;
}
