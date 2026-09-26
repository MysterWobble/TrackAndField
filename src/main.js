// Entry point for `npm.cmd run race`.
//
//   npm.cmd run race                       -> pick 1 of your 3 runners, race plays live (press K to kick)
//   npm.cmd run race -- 12345              -> replay seed 12345
//   npm.cmd run race -- 12345 --runner 2   -> skip the question and race with runner 2
//   npm.cmd run race -- 12345 --instant    -> skip the live view, just print the results
//   npm.cmd run race -- 12345 --fast-start -> your runner also sprints lap 1 (for testing)
//   npm.cmd run race -- 12345 --det 0      -> set your Determination to 0 (for testing)
//   npm.cmd run race -- 12345 --solo       -> race alone, no computer runners
//
// So far: your 3 runners with running styles + 7 computer runners. No cards or race conditions yet.

import readline from "node:readline/promises";
import { createRandom, newSeed } from "./random.js";
import { buildRunner, totalPoints, STAT_NAMES, STAT_LABELS } from "./runner.js";
import { makeField, makeYourRunners } from "./field.js";
import { createRace, PLANS } from "./race.js";
import { runLive } from "./live.js";
import { formatTime, ordinal } from "./units.js";
import { STYLES } from "../data/styles.js";
import { tuning } from "../data/tuning.js";

let seedArg;
let detArg;
let runnerArg;
let instant = false;
let solo = false;
let plan = PLANS.even;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--fast-start") plan = PLANS.fastStart;
  else if (args[i] === "--instant") instant = true;
  else if (args[i] === "--solo") solo = true;
  else if (args[i] === "--det") detArg = args[++i];
  else if (args[i] === "--runner") runnerArg = args[++i];
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
if (runnerArg !== undefined && !["1", "2", "3"].includes(runnerArg)) {
  console.log("--runner needs 1, 2 or 3, like: npm.cmd run race -- 12345 --runner 2");
  process.exit(1);
}

const hasKeyboard = Boolean(process.stdin.isTTY);
const rng = createRandom(seed);
const yourRunners = makeYourRunners(rng);

console.log(`Seed: ${seed}\n`);
console.log("YOUR RUNNERS");
yourRunners.forEach((r, i) => {
  console.log(`  ${i + 1}. ${STYLES[r.style].name.toUpperCase()}`);
  console.log("     " + STAT_NAMES.map((stat) => `${STAT_LABELS[stat]} ${r.points[stat]}`).join(" · "));
  console.log(
    `     Average ${formatTime(r.averagePace)} · Top speed ${formatTime(r.topSpeedPace)} · Stamina ${r.maxStamina} · Kick ${r.kick.toFixed(2)} mph/s`,
  );
  console.log(`     ${STYLES[r.style].description}\n`);
});

const choice = await chooseRunner();
let runner = yourRunners[choice - 1];
if (detArg !== undefined) runner = buildRunner("You", { ...runner.points, determination: Number(detArg) }, runner.style);
console.log(`You picked runner ${choice}: the ${STYLES[runner.style].name}.`);

const rivals = solo ? [] : makeField(runner.points, rng);
const race = createRace(runner, rivals, rng, plan);

if (rivals.length) {
  console.log("\nTHE FIELD (style · stat points · average pace)");
  for (const r of [runner, ...rivals]) {
    console.log(
      `  ${r.name.padEnd(8)} ${STYLES[r.style].name.padEnd(13)} ${totalPoints(r.points)} pts · ${formatTime(r.averagePace)}`,
    );
  }
}

console.log(`\nRACE${plan === PLANS.even ? "" : ` (your plan: ${plan.label})`}`);

// The live view needs a real terminal to read key presses. If there isn't one, fall back to instant.
if (!instant && !hasKeyboard) {
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

async function chooseRunner() {
  if (runnerArg !== undefined) return Number(runnerArg);
  if (!hasKeyboard) {
    console.log("(No keyboard available here, so picking runner 1. Use --runner 2 to pick another.)");
    return 1;
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let answer;
  while (!["1", "2", "3"].includes(answer)) {
    answer = (await rl.question("Pick your runner (1, 2 or 3): ")).trim();
  }
  rl.close();
  return Number(answer);
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
    console.log(
      `  ${ordinal(r.place).padEnd(4)} ${r.name.padEnd(8)} ${STYLES[r.style].name.padEnd(13)} ${formatTime(r.finishTime)}  ${gap.padStart(6)}${marker}`,
    );
  }
}
