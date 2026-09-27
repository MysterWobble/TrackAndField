// Entry point for `npm.cmd run race`.
//
//   npm.cmd run race                            -> a CAREER race with your saved runners (saved, earns a training point)
//   npm.cmd run race -- --new                   -> start a new career (your old one is kept as a backup file)
//
// Everything below is a PRACTICE race (not saved), for testing and trying things out:
//   npm.cmd run race -- 12345                   -> replay seed 12345 (a fresh set of runners from that seed)
//   npm.cmd run race -- 12345 --runner 2        -> skip the question and race with runner 2
//   npm.cmd run race -- 12345 --condition rain  -> force a condition: hot, windy, fastTrack, rivalry, rain, none
//   npm.cmd run race -- 12345 --picks 2,1,3,1   -> choose cards ahead of time (pre-race, after lap 1, 2, 3)
//   npm.cmd run race -- 12345 --give "Flow State" -> make sure a card is offered (as choice 1) when it's allowed
//   npm.cmd run race -- 12345 --instant         -> skip the live view, just print the results (random card picks)
//   npm.cmd run race -- 12345 --fast-start      -> your runner also sprints lap 1 (for testing)
//   npm.cmd run race -- 12345 --det 0           -> set your Determination to 0 (for testing)
//   npm.cmd run race -- 12345 --solo            -> race alone, no computer runners

import readline from "node:readline/promises";
import { createRandom, newSeed } from "./random.js";
import { buildRunner, totalPoints, STAT_NAMES, STAT_LABELS } from "./runner.js";
import { makeField, makeYourRunners } from "./field.js";
import { createRace, PLANS } from "./race.js";
import { runLive } from "./live.js";
import { formatTime, ordinal } from "./units.js";
import { checkCards } from "./checkCards.js";
import { offerLines, pickPrompt } from "./cardScreen.js";
import { CARDS } from "../data/cards.js";
import { STYLES } from "../data/styles.js";
import { CONDITIONS, CONDITION_KEYS } from "../data/conditions.js";
import { TRAINING } from "../data/training.js";
import { tuning } from "../data/tuning.js";
import { backupCareer, checkTraining, loadCareer, newCareer, recordRace, runnerFromCareer, saveCareer } from "./career.js";
import { newBestLines, personalBestLines, runnerLines, spendTrainingPoints } from "./careerScreen.js";

// Check the card and training files before anything else, so mistakes get explained instead of crashing mid-race.
for (const [file, problems] of [
  ["data/cards.js", checkCards(CARDS)],
  ["data/training.js", checkTraining(TRAINING)],
]) {
  if (problems.length) {
    console.log(`There's a problem in ${file}:\n`);
    for (const problem of problems) console.log(`  - ${problem}`);
    process.exit(1);
  }
}

let seedArg;
let detArg;
let runnerArg;
let conditionArg;
let picksArg;
let giveArg;
let instant = false;
let solo = false;
let startNewCareer = false;
let plan = PLANS.even;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--new") startNewCareer = true;
  else if (args[i] === "--fast-start") plan = PLANS.fastStart;
  else if (args[i] === "--instant") instant = true;
  else if (args[i] === "--solo") solo = true;
  else if (args[i] === "--det") detArg = args[++i];
  else if (args[i] === "--runner") runnerArg = args[++i];
  else if (args[i] === "--condition") conditionArg = args[++i];
  else if (args[i] === "--picks") picksArg = args[++i];
  else if (args[i] === "--give") giveArg = args[++i];
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
if (conditionArg !== undefined && conditionArg !== "none" && !CONDITION_KEYS.includes(conditionArg)) {
  console.log(`--condition needs one of: ${[...CONDITION_KEYS, "none"].join(", ")}`);
  process.exit(1);
}
const presetPicks = picksArg === undefined ? [] : picksArg.split(",").map(Number);
if (presetPicks.some((n) => ![1, 2, 3].includes(n))) {
  console.log("--picks needs up to 4 choices of 1, 2 or 3, like: npm.cmd run race -- 12345 --picks 2,1,3,1");
  process.exit(1);
}
const givenCard = giveArg === undefined ? null : CARDS.find((card) => card.name.toLowerCase() === giveArg.toLowerCase());
if (giveArg !== undefined && !givenCard) {
  console.log(`--give: there's no card called "${giveArg}". Card names are in data/cards.js.`);
  process.exit(1);
}

const hasKeyboard = Boolean(process.stdin.isTTY);

// Career race or practice? Practice = anything that bends the rules or can't be played properly.
const testingFlags = detArg !== undefined || giveArg !== undefined || conditionArg !== undefined || solo || plan !== PLANS.even;
const practice = seedArg !== undefined || instant || !hasKeyboard || testingFlags;
let career = null;
if (!practice) {
  if (startNewCareer) {
    const backup = backupCareer();
    if (backup) console.log(`Starting a new career. Your old one is kept in ${backup}\n`);
  }
  career = loadCareer();
  if (!career) {
    career = newCareer(newSeed());
    saveCareer(career);
    console.log("WELCOME TO YOUR CAREER! Here are your 3 runners. They're saved, and they'll get better as you train.\n");
  }
} else if (startNewCareer) {
  console.log("(--new only works for a career race, so your career wasn't changed.)\n");
}

const rng = createRandom(seed);
const yourRunners = career ? career.runners.map((_, i) => runnerFromCareer(career, i)) : makeYourRunners(rng);
const conditionKey = conditionArg ?? rng.pick(CONDITION_KEYS);
const condition = conditionKey === "none" ? null : CONDITIONS[conditionKey];

// Card offers get their own random numbers per pick moment, so the same seed always offers the same
// cards no matter what happened earlier in the race (that keeps the Daily Race fair).
const cardRandom = (moment) => createRandom(seed * 1000 + moment + 7);

console.log(career ? "CAREER RACE" : `PRACTICE RACE (not saved) · Seed: ${seed}`);
if (career) for (const line of personalBestLines(career)) console.log(line);
console.log("");
console.log(`TODAY'S CONDITIONS: ${condition ? condition.name.toUpperCase() : "NONE"}`);
if (condition) console.log(`  ${condition.description}`);
console.log("");
console.log("YOUR RUNNERS");
yourRunners.forEach((r, i) => {
  if (career) {
    for (const line of runnerLines(career, i)) console.log(line);
    console.log("");
    return;
  }
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
const race = createRace(runner, rivals, rng, plan, condition);

if (rivals.length) {
  console.log("\nTHE FIELD (style · stat points · average pace)");
  for (const e of race.entrants) {
    const r = e.runner;
    const rivalTag = e === race.rival ? "  <-- your rival" : "";
    console.log(
      `  ${r.name.padEnd(8)} ${STYLES[r.style].name.padEnd(13)} ${totalPoints(r.points)} pts · ${formatTime(r.averagePace)}${rivalTag}`,
    );
  }
}

// The live view needs a real terminal to read key presses. If there isn't one, fall back to instant.
if (!instant && !hasKeyboard) {
  console.log("\n(No keyboard available here, so showing instant results instead.)");
  instant = true;
}

// Before the race: pick a Preparation card.
const preRaceOffer = race.offerCards(0, cardRandom(0), givenCard);
if (preRaceOffer.length) {
  for (const line of offerLines(preRaceOffer, 0)) console.log(line);
  const index = instant ? instantPick(preRaceOffer, 0) : await askPick(preRaceOffer, 0);
  takeCard(preRaceOffer[index], 0, (line) => console.log(line));
}

console.log(`\nRACE${plan === PLANS.even ? "" : ` (your plan: ${plan.label})`}`);

if (instant) {
  let lapsDone = 0;
  const picksDuringRace = [];
  while (!race.finished) {
    race.step();
    if (race.player.laps.length > lapsDone) {
      lapsDone = race.player.laps.length;
      if (lapsDone < tuning.laps) {
        const offer = race.offerCards(lapsDone, cardRandom(lapsDone), givenCard);
        if (offer.length) {
          const index = instantPick(offer, lapsDone);
          const where = ordinal(race.positionOf(race.player));
          takeCard(offer[index], lapsDone, (line) => picksDuringRace.push(line), `After lap ${lapsDone} (${where}): `);
        }
      }
    }
  }
  printYourRace(picksDuringRace);
  printResults();
} else {
  const { finished } = await runLive(race, {
    offerCards: (moment) => race.offerCards(moment, cardRandom(moment), givenCard),
    presetPick: (moment) => (presetPicks[moment] === undefined ? undefined : presetPicks[moment] - 1),
    takeCard: (card, moment, say) => takeCard(card, moment, say),
  });
  if (finished) printResults();
  if (finished && career) await finishCareerRace();
}

// Career: save the race, check personal bests, and spend the training point.
async function finishCareerRace() {
  const you = race.player;
  const result = recordRace(career, {
    seed,
    runner: choice - 1,
    style: runner.style,
    condition: conditionKey,
    rain: Boolean(condition?.separatePersonalBest),
    time: you.finishTime,
    place: race.positionOf(you),
    fieldSize: race.entrants.length,
    cards: you.cards.map((held) => held.card.name),
  });
  saveCareer(career);
  console.log("");
  for (const line of newBestLines(result, you.finishTime)) console.log(line);
  console.log(`  You earned a training point.`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await spendTrainingPoints(
    career,
    (question) => rl.question(question),
    (n) => createRandom(career.seed * 31 + n),
    () => saveCareer(career),
  );
  rl.close();
}

// Gives the player a card and shows what happened.
function takeCard(card, moment, show, prefix = "") {
  const messages = race.pickCard(card, cardRandom(moment + 200)); // its own random numbers (e.g. "people watching" coin flip)
  show(`  ${prefix}You picked "${card.name}"`);
  for (const message of messages) show(`  ${message}`);
}

// Instant mode: use --picks if given, otherwise pick at random (the same way every time for this seed).
function instantPick(offer, moment) {
  const preset = presetPicks[moment];
  if (preset !== undefined) return Math.min(preset, offer.length) - 1;
  return cardRandom(moment + 100).int(0, offer.length - 1);
}

async function askPick(offer, moment) {
  const preset = presetPicks[moment];
  if (preset !== undefined) return Math.min(preset, offer.length) - 1;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const valid = offer.map((_, i) => String(i + 1));
  let answer;
  while (!valid.includes(answer)) answer = (await rl.question(`  ${pickPrompt(offer.length)}: `)).trim();
  rl.close();
  return Number(answer) - 1;
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

function printYourRace(picksDuringRace) {
  const you = race.player;
  const hidden = you.cardFlags.hideStats; // Flow State hides your stats
  console.log("  Lap   Lap time   Split    Stamina left   Position");
  for (const lap of you.laps) {
    const stamina = hidden ? "???" : lap.staminaLeft.toFixed(0);
    console.log(
      `   ${lap.lap}    ${formatTime(lap.lapTime).padStart(6)}   ${formatTime(lap.split).padStart(6)}   ${stamina.padStart(7)}        ${ordinal(lap.position)}`,
    );
  }
  console.log("");
  for (const line of picksDuringRace) console.log(line);
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
  const boxed = race.log.filter((e) => e.type === "boxed" && e.entrant === you).length;
  if (rivals.length) console.log(`  You passed runners ${made} times, got passed ${taken} times, and got boxed in ${boxed} times.`);
}

function printResults() {
  const results = race.results();
  const winnerTime = results[0].finishTime;
  console.log("\nRESULTS");
  for (const r of results) {
    const gap = r.place === 1 ? "" : `+${(r.finishTime - winnerTime).toFixed(1)}`;
    const marker = r.isPlayer ? "  <-- you" : r.isRival ? "  <-- your rival" : "";
    console.log(
      `  ${ordinal(r.place).padEnd(4)} ${r.name.padEnd(8)} ${STYLES[r.style].name.padEnd(13)} ${formatTime(r.finishTime)}  ${gap.padStart(6)}${marker}`,
    );
  }
}
