import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Ref } from "vue";

export const getKVPrefix = () => {
  // const config = useRuntimeConfig().smile

  return;
};

export function uniqcn(...classNames: string[]) {
  return twMerge(clsx(classNames));
}

export const cn = uniqcn;

/**
 * Value updater utility for TanStack Table state management
 * This is the valueUpdater function from shadcn/vue utils
 */
export function valueUpdater<T extends Record<string, any>, K extends keyof T>(
  updaterOrValue: T[K] | ((old: T[K]) => T[K]),
  ref: Ref<T[K]>
) {
  ref.value =
    typeof updaterOrValue === "function" ? updaterOrValue(ref.value) : updaterOrValue;
}
