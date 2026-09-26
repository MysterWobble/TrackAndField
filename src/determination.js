// Determination: the chance to dig deep and find a little more energy when you're nearly empty.
//
// While a runner's stamina is low, the race rolls for Determination every few seconds.
// The chance of success is their Determination as a percent (30 = 30%, 100 or more = always).
// A success gives back 5 stamina, plus 1 more for every 10 Determination.
//
// The race loop (race.js) decides WHEN to roll. This file only answers "did it work, and how much?"

import { tuning } from "../data/tuning.js";

export function determinationChance(runner) {
  return runner.determination / 100;
}

export function determinationBonus(runner) {
  return tuning.determinationBaseBonus + runner.determination * tuning.determinationBonusPerPoint;
}

// Returns the stamina gained: 0 if the roll failed.
export function rollDetermination(runner, rng) {
  return rng.chance(determinationChance(runner)) ? determinationBonus(runner) : 0;
}
