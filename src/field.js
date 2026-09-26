// Builds the 7 computer runners you race against.
//
// They're scaled to YOU: 1-2 of them get a few more stat points than you (so there's always
// someone better on paper that you have to out-race), and the rest get a few fewer.
// When training makes you stronger, the field gets stronger too.

import { tuning } from "../data/tuning.js";
import { RUNNER_NAMES } from "../data/names.js";
import { buildRunner, randomStatPoints, totalPoints } from "./runner.js";

export function makeField(playerPoints, rng) {
  const yourTotal = totalPoints(playerPoints);
  const strongerCount = rng.int(tuning.strongerRunnersMin, tuning.strongerRunnersMax);
  const names = rng.shuffle(RUNNER_NAMES).slice(0, tuning.computerRunners);

  return names.map((name, i) => {
    const total =
      i < strongerCount
        ? yourTotal + rng.int(...tuning.strongerExtraPoints)
        : yourTotal - rng.int(...tuning.weakerFewerPoints);
    return buildRunner(name, randomStatPoints(rng, total));
  });
}
