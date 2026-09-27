// `npm.cmd run career` — see your runners, personal bests, and recent races, and spend training points.

import readline from "node:readline/promises";
import { STYLES } from "../data/styles.js";
import { CONDITIONS } from "../data/conditions.js";
import { TRAINING } from "../data/training.js";
import { createRandom } from "./random.js";
import { formatTime, ordinal } from "./units.js";
import { checkTraining, loadCareer, saveCareer } from "./career.js";
import { personalBestLines, runnerLines, spendTrainingPoints } from "./careerScreen.js";

const trainingProblems = checkTraining(TRAINING);
if (trainingProblems.length) {
  console.log("There's a problem in data/training.js:\n");
  for (const problem of trainingProblems) console.log(`  - ${problem}`);
  process.exit(1);
}

const career = loadCareer();
if (!career) {
  console.log("No career yet. Start one by running a race: npm.cmd run race");
  process.exit(0);
}

console.log("YOUR CAREER");
for (const line of personalBestLines(career)) console.log(line);
console.log(`  Races run: ${career.races.length} · Training points to spend: ${career.trainingPoints}\n`);

console.log("YOUR RUNNERS");
career.runners.forEach((_, i) => {
  for (const line of runnerLines(career, i)) console.log(line);
  console.log("");
});

if (career.races.length) {
  console.log("RECENT RACES");
  for (const race of career.races.slice(-5).reverse()) {
    const condition = CONDITIONS[race.condition]?.name ?? "No conditions";
    console.log(`  ${race.date.slice(0, 10)}  ${formatTime(race.time)}  ${ordinal(race.place)} of ${race.fieldSize}  ${STYLES[race.style].name}, ${condition}`);
  }
}

if (career.trainingPoints > 0) {
  if (!process.stdin.isTTY) {
    console.log("\n(Run this in a terminal to spend your training points.)");
  } else {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await spendTrainingPoints(
      career,
      (question) => rl.question(question),
      (n) => createRandom(career.seed * 31 + n),
      () => saveCareer(career),
    );
    rl.close();
  }
}
