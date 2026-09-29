// The rules of your career: your 3 runners, every race you've run, personal bests, and training.
// No saving here, so it works in both the terminal and the browser:
//   src/career.js saves to a file (terminal), web/storage.js saves in the browser.

import { tuning } from "../data/tuning.js";
import { TRAINING } from "../data/training.js";
import { buildRunner, STAT_LABELS, STAT_NAMES } from "./runner.js";
import { makeYourRunners } from "./field.js";
import { createRandom } from "./random.js";
import { formatTime } from "./units.js";
import { didYouMean } from "./checkCards.js";

export function newCareer(seed) {
  const runners = makeYourRunners(createRandom(seed)).map((r) => ({ style: r.style, points: { ...r.points } }));
  return { version: 1, createdAt: new Date().toISOString(), seed, runners, trainingPoints: 0, races: [], training: [] };
}

export function runnerFromCareer(career, index) {
  const saved = career.runners[index];
  return buildRunner("You", saved.points, saved.style);
}

// Random numbers for the nth training session (the same ones every time, for this career).
export function trainingRandom(career, n = career.training.length) {
  return createRandom(career.seed * 31 + n);
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

// --- Words for the screen (shared by the terminal and the browser) ---

// "+3 Speed, -1 Stamina"
export function gainsText(gains) {
  return Object.entries(gains)
    .filter(([, amount]) => amount !== 0)
    .map(([stat, amount]) => `${amount > 0 ? "+" : ""}${amount} ${STAT_LABELS[stat]}`)
    .join(", ");
}

// After a race: which personal bests fell?
export function newBestLines(result, time) {
  const where = result.rain ? "RAIN " : "";
  if (result.overall && result.previousOverall === null) return [`Your first ${where.toLowerCase()}race on record: ${formatTime(time)} is your ${where.toLowerCase()}personal best!`];
  if (result.overall) {
    return [`*** NEW ${where}PERSONAL BEST! ${formatTime(time)} (was ${formatTime(result.previousOverall)}, ${(result.previousOverall - time).toFixed(1)}s faster) ***`];
  }
  if (result.runner && result.previousRunner === null) return [`First ${where.toLowerCase()}race for this runner: ${formatTime(time)} is their best.`];
  if (result.runner) return [`New best for this runner: ${formatTime(time)} (was ${formatTime(result.previousRunner)}).`];
  return [`No personal best this time (${where.toLowerCase()}best is ${formatTime(result.previousOverall)}).`];
}
