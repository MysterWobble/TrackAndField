// Builds the runners: your 3 to choose from, and the 7 computer runners you race against.
//
// The computer runners are scaled to YOU: 1-2 of them get a few more stat points than you
// (so there's always someone better on paper that you have to out-race), and the rest get
// a few fewer. When training makes you stronger, the field gets stronger too.

import { tuning } from "../data/tuning.js";
import { RUNNER_NAMES } from "../data/names.js";
import { STYLE_KEYS } from "../data/styles.js";
import { buildRunner, randomStatPoints, totalPoints } from "./runner.js";

// Your 3 runners, each with a different running style.
export function makeYourRunners(rng) {
  const allPoints = [randomStatPoints(rng), randomStatPoints(rng), randomStatPoints(rng)];
  const styles = rng.shuffle(STYLE_KEYS).slice(0, 3);
  return allPoints.map((points, i) => buildRunner("You", points, styles[i]));
}

export function makeField(playerPoints, rng) {
  const yourTotal = totalPoints(playerPoints);
  const strongerCount = rng.int(tuning.strongerRunnersMin, tuning.strongerRunnersMax);
  const names = rng.shuffle(RUNNER_NAMES).slice(0, tuning.computerRunners);

  return names.map((name, i) => {
    const total =
      i < strongerCount
        ? yourTotal + rng.int(...tuning.strongerExtraPoints)
        : yourTotal - rng.int(...tuning.weakerFewerPoints);
    return buildRunner(name, randomStatPoints(rng, total), rng.pick(STYLE_KEYS));
  });
}
