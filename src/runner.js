// A runner = 150 stat points, turned into real numbers the race can use.

import { tuning } from "../data/tuning.js";
import { STYLES } from "../data/styles.js";
import { paceToMph } from "./units.js";

export const STAT_NAMES = ["speed", "topSpeed", "stamina", "kick", "determination", "raceIQ"];

export const STAT_LABELS = {
  speed: "Speed",
  topSpeed: "Top Speed",
  stamina: "Stamina",
  kick: "Kick",
  determination: "Determination",
  raceIQ: "Race IQ",
};

export function totalPoints(points) {
  return STAT_NAMES.reduce((sum, stat) => sum + points[stat], 0);
}

// Hands out the stat points at random. Each stat gets a random "lean" first, so runners
// have personalities (one might be all Stamina, another all Kick) instead of all being ~25s.
export function randomStatPoints(rng, total = tuning.statPointsTotal) {
  // The per-stat limit grows if a runner ever has too many points to fit under it.
  const maxPerStat = Math.max(tuning.maxPointsPerStat, Math.ceil(total / STAT_NAMES.length));
  const points = {};
  const lean = {};
  for (const stat of STAT_NAMES) {
    points[stat] = 0;
    lean[stat] = rng.range(0.3, 1.7);
  }

  for (let i = 0; i < total; i++) {
    const open = STAT_NAMES.filter((stat) => points[stat] < maxPerStat);
    const totalLean = open.reduce((sum, stat) => sum + lean[stat], 0);
    let roll = rng.range(0, totalLean);
    let chosen = open[open.length - 1];
    for (const stat of open) {
      roll -= lean[stat];
      if (roll < 0) {
        chosen = stat;
        break;
      }
    }
    points[chosen]++;
  }
  return points;
}

// Percentage bonuses a runner can get from styles, race conditions, and cards.
// 0.10 = +10%. Bonuses for the same stat ADD together: +10% and +5% make +15%.
// "speed" raises average speed AND top speed; "topSpeed" raises top speed only.
// "pushSpeed" is speed from cards: the runner goes faster by pushing harder, so it costs stamina.
export const BONUS_KEYS = ["speed", "pushSpeed", "topSpeed", "stamina", "kick", "determination", "raceIQ", "staminaDrain"];

export function addBonuses(...lists) {
  const total = Object.fromEntries(BONUS_KEYS.map((key) => [key, 0]));
  for (const list of lists) {
    for (const [key, value] of Object.entries(list ?? {})) {
      if (!(key in total)) throw new Error(`Unknown bonus "${key}". Use one of: ${BONUS_KEYS.join(", ")}`);
      total[key] += value;
    }
  }
  return total;
}

// Bonuses that come from a running style and last the whole race.
function styleBonuses(style) {
  return style === "pacer" ? { kick: STYLES.pacer.kickMultiplier - 1 } : {};
}

// Turns stat points into what the race actually uses.
// `style` is a key from data/styles.js ("closer", "pacer", ...) or null for no style (used in tests).
// `extraBonuses` are bonuses from race conditions and cards.
// `last` holds card rules applied after every other bonus:
//   multiply: { stamina: 0.9, determination: 2, ... }   ("double Determination", Trip and Fall's -10%)
//   raceIQ: 30                                          (Losing Your Form: sets Race IQ exactly, ignoring everything else)
export function buildRunner(name, points, style = null, extraBonuses = {}, last = {}) {
  const bonuses = addBonuses(styleBonuses(style), extraBonuses);
  const multiply = { speed: 1, stamina: 1, kick: 1, determination: 1, raceIQ: 1, ...last.multiply };
  const averagePace = tuning.zeroPointAveragePace - points.speed * tuning.secondsPerSpeedPoint;
  const topSpeedPace =
    tuning.zeroPointTopSpeedPace -
    points.speed * tuning.secondsPerSpeedPoint -
    points.topSpeed * tuning.secondsPerTopSpeedPoint;
  const baseAverageSpeed = paceToMph(averagePace) * multiply.speed;
  const baseTopSpeed = paceToMph(topSpeedPace) * multiply.speed;
  const raceIQ = last.raceIQ !== undefined ? last.raceIQ : points.raceIQ * (1 + bonuses.raceIQ) * multiply.raceIQ;

  return {
    name,
    points,
    style,
    extraBonuses, // kept so the runner can be rebuilt with more bonuses (see withBonuses)
    bonuses, // all whole-race bonuses added up
    averagePace, // seconds to run 1600 m at average pace, from stat points alone
    topSpeedPace, // seconds to run 1600 m at top speed, from stat points alone
    baseAverageSpeed, // mph, before bonuses
    baseTopSpeed, // mph, before bonuses
    averageSpeed: baseAverageSpeed * (1 + bonuses.speed + bonuses.pushSpeed), // mph
    topSpeed: baseTopSpeed * (1 + bonuses.speed + bonuses.pushSpeed + bonuses.topSpeed), // mph
    maxStamina: (tuning.baseStamina + points.stamina * tuning.staminaPerPoint) * (1 + bonuses.stamina) * multiply.stamina,
    drainPerLap:
      (tuning.drainPerLapAtAveragePace + points.stamina * tuning.extraDrainPerLapPerStaminaPoint) *
      (1 + bonuses.staminaDrain),
    kick: (tuning.baseKick + points.kick * tuning.kickPerPoint) * (1 + bonuses.kick) * multiply.kick, // mph gained per second when pushing
    // How many times faster than normal stamina drains at top speed. Kick points make sprinting more efficient.
    sprintDrain: Math.max(tuning.lowestSprintDrain, tuning.drainMultiplierAtTopSpeed - points.kick * tuning.kickSprintSavingPerPoint),
    determination: points.determination * (1 + bonuses.determination) * multiply.determination, // % chance to recover stamina when low
    raceIQ, // how smart the runner races: positioning mistakes, pace wobble, kick timing
  };
}

// The same runner with more whole-race bonuses added on top.
export function withBonuses(runner, bonuses) {
  return buildRunner(runner.name, runner.points, runner.style, addBonuses(runner.extraBonuses, bonuses));
}
