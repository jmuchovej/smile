import { hasNuxtModule, installModule } from "@nuxt/kit";
import { defu } from "defu";
import type { Nuxt } from "nuxt/schema";
import type { BuiltinDriverName } from "unstorage";

export function indentLines(str: string, indent: number = 2) {
  return str
    .replace(/ {2}/g, " ".repeat(indent))
    .split("\n")
    .map((line) => `${" ".repeat(indent)}${line}`)
    .join("\n");
}

export async function registerModule(
  nuxt: Nuxt,
  name: string,
  key: string,
  options: Record<string, unknown>
) {
  if (!hasNuxtModule(name)) {
    await installModule(name, options);
  } else {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    (nuxt.options as any)[key] = defu((nuxt.options as any)[key], options);
  }
}
