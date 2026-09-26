// Entry point for `npm.cmd run race`.
//
//   npm.cmd run race                       -> random runner, race plays live (press K to kick)
//   npm.cmd run race -- 12345              -> replay seed 12345
//   npm.cmd run race -- 12345 --instant    -> skip the live view, just print the results
//   npm.cmd run race -- 12345 --fast-start -> your runner plans to sprint lap 1
//   npm.cmd run race -- 12345 --det 0      -> set your Determination to 0 (for testing)
//   npm.cmd run race -- 12345 --solo       -> race alone, no computer runners
//
// So far: you + 7 computer runners. No cards, styles, or race conditions yet.

import { createRandom, newSeed } from "./random.js";
import { buildRunner, randomStatPoints, totalPoints, STAT_NAMES, STAT_LABELS } from "./runner.js";
import { makeField } from "./field.js";
import { createRace, PLANS } from "./race.js";
import { runLive } from "./live.js";
import { formatTime, ordinal } from "./units.js";
import { determinationBonus } from "./determination.js";
import { tuning } from "../data/tuning.js";

let seedArg;
let detArg;
let instant = false;
let solo = false;
let plan = PLANS.even;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--fast-start") plan = PLANS.fastStart;
  else if (args[i] === "--instant") instant = true;
  else if (args[i] === "--solo") solo = true;
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
const rivals = solo ? [] : makeField(points, rng);
const race = createRace(runner, rivals, rng, plan);

console.log(`Seed: ${seed}\n`);
console.log("YOUR RUNNER");
console.log("  " + STAT_NAMES.map((stat) => `${STAT_LABELS[stat]} ${runner.points[stat]}`).join(" · "));
console.log(`  Average pace   ${formatTime(runner.averagePace)}  (${runner.averageSpeed.toFixed(2)} mph)`);
console.log(`  Top speed pace ${formatTime(runner.topSpeedPace)}  (${runner.topSpeed.toFixed(2)} mph)`);
console.log(`  Stamina ${runner.maxStamina}, uses ${runner.drainPerLap.toFixed(1)} per lap at average pace`);
console.log(`  Kick ${runner.kick.toFixed(2)} mph per second`);
console.log(`  Determination: ${runner.determination}% chance per roll, +${determinationBonus(runner).toFixed(1)} stamina`);

if (rivals.length) {
  console.log("\nTHE FIELD (stat points · average pace)");
  console.log(`  ${"You".padEnd(8)} ${totalPoints(points)} pts · ${formatTime(runner.averagePace)}`);
  for (const rival of rivals) {
    console.log(`  ${rival.name.padEnd(8)} ${totalPoints(rival.points)} pts · ${formatTime(rival.averagePace)}`);
  }
}

console.log(`\nRACE (your plan: ${plan.label})`);

// The live view needs a real terminal to read key presses. If there isn't one, fall back to instant.
if (!instant && !process.stdin.isTTY) {
  console.log("  (No keyboard available here, so showing instant results instead.)");
  instant = true;
}

if (instant) {
  while (!race.finished) race.step();
  printYourRace();
  printResults();
} else {
  const { finished } = await runLive(race);
  if (finished) printResults();
}

function printYourRace() {
  const you = race.player;
  console.log("  Lap   Lap time   Split    Stamina left   Position");
  for (const lap of you.laps) {
    console.log(
      `   ${lap.lap}    ${formatTime(lap.lapTime).padStart(6)}   ${formatTime(lap.split).padStart(6)}   ${lap.staminaLeft.toFixed(0).padStart(7)}        ${ordinal(lap.position)}`,
    );
  }
  console.log("");
  if (you.ranOutAt !== null) {
    const lap = Math.floor(you.ranOutAt / tuning.lapMeters) + 1;
    console.log(`  Ran out of stamina at ${Math.round(you.ranOutAt)} m (lap ${lap}).`);
  }
  for (const event of you.events) {
    console.log(`  Lap ${event.lap}, ${Math.round(event.distance)} m: Determination kicks in! +${event.bonus.toFixed(1)} stamina`);
  }
  const passes = race.log.filter((e) => e.type === "pass");
  const made = passes.filter((e) => e.entrant === you).length;
  const taken = passes.filter((e) => e.passed === you).length;
  if (rivals.length) console.log(`  You passed runners ${made} times and got passed ${taken} times.`);
}

function printResults() {
  const results = race.results();
  const winnerTime = results[0].finishTime;
  console.log("\nRESULTS");
  for (const r of results) {
    const gap = r.place === 1 ? "" : `+${(r.finishTime - winnerTime).toFixed(1)}`;
    const marker = r.isPlayer ? "  <-- you" : "";
    console.log(`  ${ordinal(r.place).padEnd(4)} ${r.name.padEnd(8)} ${formatTime(r.finishTime)}  ${gap.padStart(6)}${marker}`);
  }
}
