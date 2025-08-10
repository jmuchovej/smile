import type { H3Event } from "h3";
import { defineEventHandler, readBody } from "h3";

export default defineEventHandler(async (event: H3Event) => {
  const { participant, pages, options } = await readBody(event);

  return {
    pages,
    metadata: {
      strategy: "null",
      seed: "null",
      algorithm: "null",
    }
  }
});
