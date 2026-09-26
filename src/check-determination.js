// `npm run check:determination`
//
// Runs the same sprint-lap-1 runner 20 times with low, medium, and high Determination,
// so you can see how much the stat matters. Try changing the Determination numbers in
// data/tuning.js and running this again.

import { createRandom } from "./random.js";
import { buildRunner } from "./runner.js";
import { runSolo, PLANS } from "./race.js";
import { formatTime } from "./units.js";

const RACES = 20;
const basePoints = { speed: 25, topSpeed: 25, stamina: 25, kick: 25, determination: 0, raceIQ: 25 };

console.log(`Same runner, sprinting lap 1, ${RACES} races each:\n`);
console.log("  Determination   Recoveries (avg per race)   Average finish");
for (const determination of [0, 5, 15, 25, 35]) {
  const runner = buildRunner("Test", { ...basePoints, determination });
  let recoveries = 0;
  let totalTime = 0;
  for (let seed = 1; seed <= RACES; seed++) {
    const result = runSolo(runner, createRandom(seed), PLANS.fastStart);
    recoveries += result.events.length;
    totalTime += result.finishTime;
  }
  console.log(
    `  ${String(determination).padStart(7)}         ${(recoveries / RACES).toFixed(1).padStart(10)}                ${formatTime(totalTime / RACES)}`,
  );
}
