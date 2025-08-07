import { consola } from "consola";

export function useLogger(...tags: string[]) {
  return consola.withTag(["smile", ...(tags || [])].join(":"));
}

export * from "./utils";
