import { type ComputedRef, computed } from "vue";

import { navigateTo, useRoute } from "#app";
import { entries, experimentName, tree } from "#build/smile/timeline";

import {
  type TimelineNavigation,
  type TimelineTarget,
  createTimelineNavigation,
} from "../timeline/navigation";
import type { TimelineEntry, TimelineNode } from "../types";

export interface TimelineAccess {
  /** Name of the active experiment, or null when unconfigured. */
  experimentName: string | null;
  /** The flat ordered sequence. */
  entries: readonly TimelineEntry[];
  /** The scanned directory tree, for tooling. */
  tree: TimelineNode | null;
  /** Navigation state for the current route; recomputed on navigation. */
  navigation: ComputedRef<TimelineNavigation>;
  current: ComputedRef<TimelineEntry | null>;
  index: ComputedRef<number>;
  length: number;
  hasNext: ComputedRef<boolean>;
  hasPrev: ComputedRef<boolean>;
  next: () => TimelineTarget | null;
  prev: () => TimelineTarget | null;
  /** Navigate to the next entry. Resolves to false when there is none. */
  goNext: () => Promise<boolean>;
  /** Navigate to the previous entry. Resolves to false when there is none. */
  goPrev: () => Promise<boolean>;
  /** Navigate to an entry by position. */
  goTo: (index: number) => Promise<boolean>;
}

/**
 * Ordered navigation through the active experiment's timeline.
 */
export function useTimeline(): TimelineAccess {
  const route = useRoute();
  const navigation = computed(() =>
    createTimelineNavigation(entries, { name: route.name, params: route.params }),
  );

  const go = async (target: TimelineTarget | null): Promise<boolean> => {
    if (!target) return false;
    await navigateTo({ name: target.name, params: target.params });
    return true;
  };

  return {
    experimentName,
    entries,
    tree,
    navigation,
    current: computed(() => navigation.value.current),
    index: computed(() => navigation.value.index),
    length: entries.length,
    hasNext: computed(() => navigation.value.hasNext),
    hasPrev: computed(() => navigation.value.hasPrev),
    next: () => navigation.value.next(),
    prev: () => navigation.value.prev(),
    goNext: () => go(navigation.value.next()),
    goPrev: () => go(navigation.value.prev()),
    goTo: (index) => go(navigation.value.at(index)),
  };
}
