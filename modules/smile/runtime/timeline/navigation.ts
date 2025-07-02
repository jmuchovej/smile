/**
 * Ordered navigation over the flat timeline the build step generates.
 *
 * Framework-free so it can be unit tested; `useTimeline()` binds it to the
 * current route.
 */
import type { TimelineEntry } from "../types";

/** The parts of a route needed to locate the current entry. */
export interface RouteLike {
  name?: string | symbol | null;
  params?: Record<string, string | string[] | undefined>;
}

/** Where to go next: a named route with its parameters. */
export interface TimelineTarget {
  name: string;
  params: Record<string, string>;
  path: string;
}

export interface TimelineNavigation {
  entries: readonly TimelineEntry[];
  /** The entry for the current route, or null when the route is not in the timeline. */
  current: TimelineEntry | null;
  /** Position of the current entry, or -1. */
  index: number;
  length: number;
  hasNext: boolean;
  hasPrev: boolean;
  /** The next entry's route, or null at the end. */
  next: () => TimelineTarget | null;
  /** The previous entry's route, or null at the start. */
  prev: () => TimelineTarget | null;
  /** Route for an entry by position. */
  at: (index: number) => TimelineTarget | null;
}

function paramsMatch(entry: TimelineEntry, route: RouteLike): boolean {
  const routeParams = route.params ?? {};
  for (const [key, value] of Object.entries(entry.params)) {
    const actual = routeParams[key];
    const actualValue = Array.isArray(actual) ? actual.join("/") : actual;
    if (actualValue !== value) return false;
  }
  return true;
}

/** Index of the entry matching the route's name and parameters, or -1. */
export function findEntryIndex(entries: readonly TimelineEntry[], route: RouteLike): number {
  const name = typeof route.name === "string" ? route.name : null;
  if (!name) return -1;
  return entries.findIndex((entry) => entry.routeName === name && paramsMatch(entry, route));
}

export function targetFor(entry: TimelineEntry): TimelineTarget {
  return { name: entry.routeName, params: { ...entry.params }, path: entry.path };
}

export function createTimelineNavigation(
  entries: readonly TimelineEntry[],
  route: RouteLike,
): TimelineNavigation {
  const index = findEntryIndex(entries, route);
  const current = index >= 0 ? (entries[index] ?? null) : null;
  const length = entries.length;
  const at = (i: number): TimelineTarget | null => {
    const entry = entries[i];
    return entry ? targetFor(entry) : null;
  };

  return {
    entries,
    current,
    index,
    length,
    hasNext: index >= 0 && index < length - 1,
    hasPrev: index > 0,
    next: () => (index >= 0 ? at(index + 1) : null),
    prev: () => (index > 0 ? at(index - 1) : null),
    at,
  };
}
