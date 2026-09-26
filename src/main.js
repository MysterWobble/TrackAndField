// Entry point for `npm.cmd run race`.
//
//   npm.cmd run race                       -> random runner, race plays live (press K to kick)
//   npm.cmd run race -- 12345              -> replay seed 12345
//   npm.cmd run race -- 12345 --instant    -> skip the live view, just print the results
//   npm.cmd run race -- 12345 --fast-start -> runner plans to sprint lap 1
//   npm.cmd run race -- 12345 --det 0      -> set Determination to 0 (for testing)
//
// Steps 2-4: one runner, alone on the track. No cards, styles, or other runners yet.

import { createRandom, newSeed } from "./random.js";
import { buildRunner, randomStatPoints, STAT_NAMES, STAT_LABELS } from "./runner.js";
import { createRace, PLANS } from "./race.js";
import { runLive } from "./live.js";
import { formatTime } from "./units.js";
import { determinationBonus } from "./determination.js";
import { tuning } from "../data/tuning.js";

let seedArg;
let detArg;
let instant = false;
let plan = PLANS.even;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--fast-start") plan = PLANS.fastStart;
  else if (args[i] === "--instant") instant = true;
  else if (args[i] === "--det") detArg = args[++i];
  else seedArg = args[i];
}

const seed = seedArg === undefined ? newSeed() : Number(seedArg);
if (!Number.isInteger(seed)) {
  console.log(`"${seedArg}" isn't a whole number. Try: npm.cmd run race -- 12345`);
  process.exit(1);
}
if (detArg !== undefined && !(Number(detArg) >= 0)) {
  console.log("--det needs a number 0 or higher, like: npm.cmd run race -- 12345 --det 30");
  process.exit(1);
}

const rng = createRandom(seed);
const points = randomStatPoints(rng);
if (detArg !== undefined) points.determination = Number(detArg);
const runner = buildRunner("You", points);
const race = createRace(runner, rng, plan);

console.log(`Seed: ${seed}\n`);
console.log("RUNNER");
console.log("  " + STAT_NAMES.map((stat) => `${STAT_LABELS[stat]} ${runner.points[stat]}`).join(" · "));
console.log(`  Average pace   ${formatTime(runner.averagePace)}  (${runner.averageSpeed.toFixed(2)} mph)`);
console.log(`  Top speed pace ${formatTime(runner.topSpeedPace)}  (${runner.topSpeed.toFixed(2)} mph)`);
console.log(`  Stamina ${runner.maxStamina}, uses ${runner.drainPerLap.toFixed(1)} per lap at average pace`);
console.log(`  Kick ${runner.kick.toFixed(2)} mph per second`);
console.log(
  `  Determination: ${runner.determination}% chance per roll, +${determinationBonus(runner).toFixed(1)} stamina\n`,
);
console.log(`RACE (plan: ${plan.label})`);

// The live view needs a real terminal to read key presses. If there isn't one, fall back to instant.
if (!instant && !process.stdin.isTTY) {
  console.log("  (No keyboard available here, so showing instant results instead.)");
  instant = true;
}

if (instant) {
  while (!race.finished) race.step();
  printInstantResults(race.result());
} else {
  const { finished } = await runLive(race);
  if (finished) console.log(`\nFINISH: ${formatTime(race.time)}`);
}

function printInstantResults(result) {
  console.log("  Lap   Lap time   Split    Stamina left");
  for (const lap of result.laps) {
    console.log(
      `   ${lap.lap}    ${formatTime(lap.lapTime).padStart(6)}   ${formatTime(lap.split).padStart(6)}   ${lap.staminaLeft.toFixed(0).padStart(5)}`,
    );
  }
  console.log("");
  if (result.ranOutAt !== null) {
    const lap = Math.floor(result.ranOutAt / tuning.lapMeters) + 1;
    console.log(`  Ran out of stamina at ${Math.round(result.ranOutAt)} m (lap ${lap}).`);
  }
  for (const event of result.events) {
    console.log(
      `  Lap ${event.lap}, ${Math.round(event.distance)} m: Determination kicks in! +${event.bonus.toFixed(1)} stamina`,
    );
  }
  console.log(`\nFINISH: ${formatTime(result.finishTime)}`);
}
