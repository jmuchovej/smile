import { describe, expect, it } from "vitest";

import {
  createTimelineNavigation,
  findEntryIndex,
} from "../../../../modules/smile/runtime/timeline/navigation";
import type { TimelineEntry } from "../../../../modules/smile/runtime/types";

const entry = (index: number, over: Partial<TimelineEntry>): TimelineEntry => ({
  index,
  smileId: String(index),
  routeName: "smile-demo-x",
  path: "/experiment/demo/x",
  params: {},
  page: "x.vue",
  isDynamic: false,
  ...over,
});

const entries: TimelineEntry[] = [
  entry(0, { smileId: "1", routeName: "smile-demo-welcome", path: "/experiment/demo/welcome" }),
  entry(1, {
    smileId: "2.[index]",
    routeName: "smile-demo-trials-index",
    path: "/experiment/demo/trials/a",
    params: { index: "a" },
    isDynamic: true,
    trialId: "a",
  }),
  entry(2, {
    smileId: "2.[index]",
    routeName: "smile-demo-trials-index",
    path: "/experiment/demo/trials/b",
    params: { index: "b" },
    isDynamic: true,
    trialId: "b",
  }),
  entry(3, { smileId: "3", routeName: "smile-demo-debrief", path: "/experiment/demo/debrief" }),
];

describe("findEntryIndex", () => {
  it("matches by route name and parameters", () => {
    expect(findEntryIndex(entries, { name: "smile-demo-welcome" })).toBe(0);
    expect(
      findEntryIndex(entries, { name: "smile-demo-trials-index", params: { index: "b" } }),
    ).toBe(2);
    expect(
      findEntryIndex(entries, { name: "smile-demo-trials-index", params: { index: "zzz" } }),
    ).toBe(-1);
    expect(findEntryIndex(entries, { name: "not-in-timeline" })).toBe(-1);
    expect(findEntryIndex(entries, { name: null })).toBe(-1);
  });
});

describe("createTimelineNavigation", () => {
  it("moves between trial identifiers inside a dynamic block", () => {
    const nav = createTimelineNavigation(entries, {
      name: "smile-demo-trials-index",
      params: { index: "a" },
    });
    expect(nav.index).toBe(1);
    expect(nav.current?.trialId).toBe("a");
    expect(nav.hasNext).toBe(true);
    expect(nav.hasPrev).toBe(true);
    expect(nav.next()).toEqual({
      name: "smile-demo-trials-index",
      params: { index: "b" },
      path: "/experiment/demo/trials/b",
    });
  });

  it("crosses block boundaries going back", () => {
    const nav = createTimelineNavigation(entries, {
      name: "smile-demo-trials-index",
      params: { index: "a" },
    });
    expect(nav.prev()).toEqual({
      name: "smile-demo-welcome",
      params: {},
      path: "/experiment/demo/welcome",
    });
  });

  it("reports no next entry at the end and no previous at the start", () => {
    const end = createTimelineNavigation(entries, { name: "smile-demo-debrief" });
    expect(end.hasNext).toBe(false);
    expect(end.next()).toBeNull();
    expect(end.prev()?.name).toBe("smile-demo-trials-index");

    const start = createTimelineNavigation(entries, { name: "smile-demo-welcome" });
    expect(start.hasPrev).toBe(false);
    expect(start.prev()).toBeNull();
    expect(start.length).toBe(4);
  });

  it("is inert on routes outside the timeline", () => {
    const nav = createTimelineNavigation(entries, { name: "launcher" });
    expect(nav.current).toBeNull();
    expect(nav.index).toBe(-1);
    expect(nav.hasNext).toBe(false);
    expect(nav.next()).toBeNull();
    expect(nav.at(3)?.name).toBe("smile-demo-debrief");
    expect(nav.at(9)).toBeNull();
  });
});
