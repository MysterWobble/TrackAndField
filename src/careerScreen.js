// What your career looks like on screen: your runners, personal bests, and spending training points.

import { STYLES } from "../data/styles.js";
import { tuning } from "../data/tuning.js";
import { STAT_LABELS, STAT_NAMES } from "./runner.js";
import { formatTime } from "./units.js";
import { applyTraining, offerTraining, personalBest, runnerFromCareer } from "./career.js";

// "+3 Speed, -1 Stamina"
export function gainsText(gains) {
  return Object.entries(gains)
    .filter(([, amount]) => amount !== 0)
    .map(([stat, amount]) => `${amount > 0 ? "+" : ""}${amount} ${STAT_LABELS[stat]}`)
    .join(", ");
}

export function runnerLines(career, index) {
  const r = runnerFromCareer(career, index);
  const best = personalBest(career, { runner: index });
  const rainBest = personalBest(career, { runner: index, rain: true });
  const bests = `best ${best === null ? "--" : formatTime(best)}${rainBest === null ? "" : ` · rain best ${formatTime(rainBest)}`}`;
  return [
    `  ${index + 1}. ${STYLES[r.style].name.toUpperCase()}   (${bests})`,
    "     " + STAT_NAMES.map((stat) => `${STAT_LABELS[stat]} ${r.points[stat]}`).join(" · "),
    `     Average ${formatTime(r.averagePace)} · Top speed ${formatTime(r.topSpeedPace)} · Stamina ${Math.round(r.maxStamina)} · Kick ${r.kick.toFixed(2)} mph/s`,
    `     ${STYLES[r.style].description}`,
  ];
}

export function personalBestLines(career) {
  const best = personalBest(career);
  const rainBest = personalBest(career, { rain: true });
  return [
    `  Personal best: ${best === null ? "none yet" : formatTime(best)}`,
    `  Rain personal best: ${rainBest === null ? "none yet" : formatTime(rainBest)}`,
  ];
}

// After a race: which personal bests fell?
export function newBestLines(result, time) {
  const where = result.rain ? "RAIN " : "";
  if (result.overall && result.previousOverall === null) return [`  Your first ${where.toLowerCase()}race on record: ${formatTime(time)} is your ${where.toLowerCase()}personal best!`];
  if (result.overall) {
    return [`  *** NEW ${where}PERSONAL BEST! ${formatTime(time)} (was ${formatTime(result.previousOverall)}, ${(result.previousOverall - time).toFixed(1)}s faster) ***`];
  }
  if (result.runner && result.previousRunner === null) return [`  First ${where.toLowerCase()}race for this runner: ${formatTime(time)} is their best.`];
  if (result.runner) return [`  New best for this runner: ${formatTime(time)} (was ${formatTime(result.previousRunner)}).`];
  return [`  No personal best this time (${where.toLowerCase()}best is ${formatTime(result.previousOverall)}).`];
}

// Spend training points on any runner. `ask(question)` returns what the player typed,
// `randomFor(n)` gives random numbers for the nth training session, and `save()` saves the career.
export async function spendTrainingPoints(career, ask, randomFor, save) {
  while (career.trainingPoints > 0) {
    console.log(`\nTRAINING: you have ${career.trainingPoints} training point${career.trainingPoints === 1 ? "" : "s"}.`);
    career.runners.forEach((_, i) => runnerLines(career, i).slice(0, 2).forEach((line) => console.log(line)));
    const who = (await ask("  Train which runner? (1, 2 or 3, or just press Enter to save the point for later): ")).trim();
    if (!["1", "2", "3"].includes(who)) {
      console.log("  Saved for later. Spend it any time with: npm.cmd run career");
      return;
    }
    const runnerIndex = Number(who) - 1;
    const rng = randomFor(career.training.length);
    const offer = offerTraining(rng);
    console.log(`\n  Sessions for your ${STYLES[career.runners[runnerIndex].style].name}:`);
    offer.forEach((session, i) => console.log(`  ${i + 1}. ${session.name}: ${session.text}`));
    const valid = offer.map((_, i) => String(i + 1));
    let pick;
    while (!valid.includes(pick)) pick = (await ask(`  Pick a session (1-${offer.length}): `)).trim();
    const session = offer[Number(pick) - 1];
    const { bonus } = applyTraining(career, runnerIndex, session, rng);
    save();
    const bonusText = bonus ? `  Bonus: +${tuning.trainingDeterminationBonus} Determination!` : "";
    console.log(`  ${gainsText(session.effects)}.${bonusText}`);
  }
}
