// `npm.cmd run balance` — the balance tool. Simulates lots of full races and prints:
//   1. what +10 points of each stat is worth (seconds faster)
//   2. what each card is worth on its own (seconds faster, average place)
//
// Your runner kicks smartly: on the last lap, as soon as its stamina can last to the finish.
//
//   npm.cmd run balance                        -> both tables, 150 races each (takes a few minutes)
//   npm.cmd run balance -- --stats             -> just the stat table
//   npm.cmd run balance -- --cards             -> just the card table
//   npm.cmd run balance -- --races 50          -> fewer races: faster, but less exact
//   npm.cmd run balance -- --try '{"secondsPerSpeedPoint":0.5}'  -> test tuning numbers without editing files

import { tuning } from "../data/tuning.js";
import { CARDS } from "../data/cards.js";
import { CONDITIONS } from "../data/conditions.js";
import { createRandom } from "./random.js";
import { buildRunner, STAT_LABELS, STAT_NAMES } from "./runner.js";
import { makeField, makeYourRunners } from "./field.js";
import { createRace } from "./race.js";
import { momentsFor } from "./cards.js";

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const races = Number(option("--races") ?? 150);
const showStats = !args.includes("--cards") || args.includes("--stats");
const showCards = !args.includes("--stats") || args.includes("--cards");
if (option("--try")) Object.assign(tuning, JSON.parse(option("--try")));

// One full race. `extraPoints` = stat points added to your runner; `card` = given at its first allowed moment.
function raceOnce(seed, { extraPoints = {}, card = null } = {}) {
  const rng = createRandom(seed);
  const base = makeYourRunners(rng)[seed % 3];
  const points = { ...base.points };
  for (const [stat, amount] of Object.entries(extraPoints)) points[stat] += amount;
  const condition = card?.rivalryOnly ? CONDITIONS.rivalry : null;
  const race = createRace(buildRunner("You", points, base.style), makeField(base.points, rng), rng, undefined, condition);
  const you = race.player;
  const moment = card ? momentsFor(card.when)[0] : null;
  let given = false;
  let kicked = false;
  while (!race.finished) {
    if (card && !given && you.laps.length >= moment) {
      race.pickCard(card, createRandom(seed + 99));
      given = true;
    }
    if (!kicked && you.distance >= tuning.lapMeters * (tuning.laps - 1) && you.stamina > 0) {
      const staminaPerMeter = (you.runner.drainPerLap / tuning.lapMeters) * you.runner.sprintDrain;
      if (tuning.lapMeters * tuning.laps - you.distance <= you.stamina / staminaPerMeter) {
        you.kicking = true;
        kicked = true;
      }
    }
    race.step();
  }
  return { time: you.finishTime, place: race.positionOf(you) };
}

function average(options) {
  let time = 0;
  let place = 0;
  for (let seed = 1; seed <= races; seed++) {
    const result = raceOnce(seed, options);
    time += result.time;
    place += result.place;
  }
  return { time: time / races, place: place / races };
}

const baseline = average();
console.log(`${races} races each. No bonus: ${baseline.time.toFixed(1)}s average, ${baseline.place.toFixed(2)} average place.\n`);

if (showStats) {
  console.log("WHAT +10 POINTS OF EACH STAT IS WORTH");
  for (const stat of STAT_NAMES) {
    const result = average({ extraPoints: { [stat]: 10 } });
    console.log(`  ${STAT_LABELS[stat].padEnd(14)} ${(baseline.time - result.time).toFixed(1).padStart(5)}s faster`);
  }
  console.log("");
}

if (showCards) {
  console.log("WHAT EACH CARD IS WORTH ON ITS OWN");
  const rows = CARDS.map((card) => ({ card, ...average({ card }) }));
  rows.sort((a, b) => a.time - b.time);
  for (const row of rows) {
    const saved = (baseline.time - row.time).toFixed(1).padStart(5);
    console.log(`  ${saved}s faster   place ${row.place.toFixed(2)}   ${row.card.when.padEnd(14)} ${row.card.name}`);
  }
}
