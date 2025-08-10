import type { H3Event } from "h3";
import { createError, defineEventHandler, getRouterParam, readBody } from "h3";
import { ofetch } from "ofetch";
import { useRuntimeConfig } from "#imports";

export default defineEventHandler(async (event: H3Event) => {
  const experiment = getRouterParam(event, "experiment") as string;
  const { participant, pages } = await readBody(event);

  if (!experiment) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Missing `experiment` parameter",
    })
  }

  if (!participant) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Missing `participant` in body",
    })
  }

  const { smile: config } = useRuntimeConfig();

  if (!Object.keys(config.experiments).includes(experiment)) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not found",
      message: `Experiment: \`${experiment}\` not found!`
    })
  }

  const { name, options } = config.experiments[experiment].randomizer;

  const result = await ofetch(`/api/s/randomize/${name}`, {
    method: "POST",
    body: {
      participant,
      pages,
      options,
    }
  })

  return {
    pages: result.pages,
    metadata: {
      ...result.metadata,
      at: new Date().toISOString(),
    }
  }
});
