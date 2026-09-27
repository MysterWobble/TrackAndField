// Your career: your 3 runners, every race you've run, personal bests, and training points.
// It's saved as a plain JSON file (save/career.json) so it survives between races.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tuning } from "../data/tuning.js";
import { TRAINING } from "../data/training.js";
import { buildRunner, STAT_NAMES } from "./runner.js";
import { makeYourRunners } from "./field.js";
import { createRandom } from "./random.js";
import { didYouMean } from "./checkCards.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_SAVE = path.join(projectRoot, "save", "career.json");

// --- Saving and loading ---

export function newCareer(seed) {
  const runners = makeYourRunners(createRandom(seed)).map((r) => ({ style: r.style, points: { ...r.points } }));
  return { version: 1, createdAt: new Date().toISOString(), seed, runners, trainingPoints: 0, races: [], training: [] };
}

export function loadCareer(file = DEFAULT_SAVE) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function saveCareer(career, file = DEFAULT_SAVE) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Write to a temporary file first, then swap it in, so a crash mid-save can't wreck your career.
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(career, null, 2));
  fs.renameSync(temp, file);
}

// Starting a new career keeps the old one as a backup file instead of deleting it.
export function backupCareer(file = DEFAULT_SAVE) {
  if (!fs.existsSync(file)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = file.replace(/\.json$/, `-backup-${stamp}.json`);
  fs.renameSync(file, backup);
  return backup;
}

export function runnerFromCareer(career, index) {
  const saved = career.runners[index];
  return buildRunner("You", saved.points, saved.style);
}

// --- Races and personal bests ---

// Your best time. Pass a runner (0, 1, 2) for that runner's best. Rain has its own separate bests.
export function personalBest(career, { runner = null, rain = false } = {}) {
  const times = career.races
    .filter((r) => (runner === null || r.runner === runner) && Boolean(r.rain) === rain)
    .map((r) => r.time);
  return times.length ? Math.min(...times) : null;
}

// Saves a finished race, gives a training point, and reports which personal bests it beat.
export function recordRace(career, race) {
  const rain = Boolean(race.rain);
  const previousOverall = personalBest(career, { rain });
  const previousRunner = personalBest(career, { runner: race.runner, rain });
  career.races.push({ ...race, rain, date: new Date().toISOString() });
  career.trainingPoints += tuning.trainingPointsPerRace;
  return {
    rain,
    overall: previousOverall === null || race.time < previousOverall,
    runner: previousRunner === null || race.time < previousRunner,
    previousOverall,
    previousRunner,
  };
}

// --- Training ---

export function offerTraining(rng) {
  return rng.shuffle(TRAINING).slice(0, tuning.trainingChoices);
}

// Spends one training point on a runner. Returns the stat points gained (and whether the Determination bonus hit).
export function applyTraining(career, runnerIndex, session, rng) {
  if (career.trainingPoints < 1) throw new Error("No training points left to spend.");
  const gains = { ...session.effects };
  const bonus = rng.chance(tuning.trainingDeterminationChance);
  if (bonus) gains.determination = (gains.determination ?? 0) + tuning.trainingDeterminationBonus;

  const points = career.runners[runnerIndex].points;
  for (const [stat, amount] of Object.entries(gains)) points[stat] = Math.max(0, points[stat] + amount);
  career.trainingPoints -= 1;
  career.training.push({ date: new Date().toISOString(), runner: runnerIndex, session: session.name, gains });
  return { gains, bonus };
}

// Checks data/training.js for mistakes, like the card checker does for cards.
export function checkTraining(sessions) {
  const errors = [];
  const names = new Set();
  sessions.forEach((session, index) => {
    const label = `Training ${index + 1}${typeof session?.name === "string" ? ` ("${session.name}")` : ""}`;
    if (typeof session?.name !== "string" || !session.name.trim()) errors.push(`${label}: needs a name in quotes.`);
    else if (names.has(session.name)) errors.push(`${label}: has the same name as another session.`);
    else names.add(session.name);
    if (typeof session?.text !== "string" || !session.text.trim()) errors.push(`${label}: needs a text description in quotes.`);
    for (const field of Object.keys(session ?? {})) {
      if (!["name", "text", "effects"].includes(field)) {
        errors.push(`${label}: "${field}" isn't a training setting.${didYouMean(field, ["name", "text", "effects"])}`);
      }
    }
    if (typeof session?.effects !== "object" || session.effects === null || !Object.keys(session.effects).length) {
      errors.push(`${label}: needs effects, like effects: { speed: 3 }`);
    } else {
      for (const [stat, amount] of Object.entries(session.effects)) {
        if (!STAT_NAMES.includes(stat)) errors.push(`${label}: "${stat}" isn't a stat.${didYouMean(stat, STAT_NAMES)} Use: ${STAT_NAMES.join(", ")}`);
        if (!Number.isInteger(amount)) errors.push(`${label}: ${stat} should be a whole number, like ${stat}: 3`);
      }
    }
  });
  if (sessions.length < tuning.trainingChoices) errors.push(`There need to be at least ${tuning.trainingChoices} training sessions.`);
  return errors;
}
