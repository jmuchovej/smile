import { defineEventHandler, type H3Event, readBody } from "h3";
import Rand, { PRNG } from "rand-seed";

export default defineEventHandler(async (event: H3Event) => {
  const { participant, pages, options } = await readBody(event);

  const algorithm = PRNG.xoshiro128ss;
  const rng = new Rand(participant, algorithm);

  const shuffled = [...pages];

  for (let curr = shuffled.length - 1; curr > 0; curr--) {
    const swap = rng.next() % curr;
    [shuffled[curr], shuffled[swap]] = [shuffled[swap], shuffled[curr]];
  }

  return {
    pages: shuffled,
    metadata: {
      strategy: "shuffle",
      seed: participant,
      algorithm,
    },
  };
});
