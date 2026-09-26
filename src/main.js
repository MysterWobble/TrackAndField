// Entry point for `npm run race`.
//
//   npm run race                       -> random runner, even pace
//   npm run race -- 12345              -> replay seed 12345
//   npm run race -- 12345 --fast-start -> same runner, but sprints lap 1
//
// Step 2: one runner, alone on the track. No cards, styles, or other runners yet.

import { createRandom, newSeed } from "./random.js";
import { buildRunner, randomStatPoints, STAT_NAMES, STAT_LABELS } from "./runner.js";
import { runSolo, PLANS } from "./race.js";
import { formatTime } from "./units.js";
import { tuning } from "../data/tuning.js";

const args = process.argv.slice(2);
const seedArg = args.find((arg) => !arg.startsWith("--"));
const seed = seedArg === undefined ? newSeed() : Number(seedArg);
const plan = args.includes("--fast-start") ? PLANS.fastStart : PLANS.even;

if (!Number.isInteger(seed)) {
  console.log(`"${seedArg}" isn't a whole number. Try: npm run race -- 12345`);
  process.exit(1);
}

const rng = createRandom(seed);
const runner = buildRunner("You", randomStatPoints(rng));
const result = runSolo(runner, plan);

console.log(`Seed: ${seed}\n`);

console.log("RUNNER");
console.log("  " + STAT_NAMES.map((stat) => `${STAT_LABELS[stat]} ${runner.points[stat]}`).join(" · "));
console.log(`  Average pace   ${formatTime(runner.averagePace)}  (${runner.averageSpeed.toFixed(2)} mph)`);
console.log(`  Top speed pace ${formatTime(runner.topSpeedPace)}  (${runner.topSpeed.toFixed(2)} mph)`);
console.log(`  Stamina ${runner.maxStamina}, uses ${runner.drainPerLap.toFixed(1)} per lap at average pace`);
console.log(`  Kick ${runner.kick.toFixed(2)} mph per second\n`);

console.log(`RACE (plan: ${plan.label})`);
console.log("  Lap   Lap time   Split    Stamina left");
for (const lap of result.laps) {
  console.log(
    `   ${lap.lap}    ${formatTime(lap.lapTime).padStart(6)}   ${formatTime(lap.split).padStart(6)}   ${lap.staminaLeft.toFixed(0).padStart(5)}`,
  );
}
if (result.ranOutAt !== null) {
  const lap = Math.floor(result.ranOutAt / tuning.lapMeters) + 1;
  console.log(`\n  Ran out of stamina at ${Math.round(result.ranOutAt)} m (lap ${lap}) and faded.`);
}
console.log(`\nFINISH: ${formatTime(result.finishTime)}`);
