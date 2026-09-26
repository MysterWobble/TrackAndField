// A runner = 150 stat points, turned into real numbers the race can use.

import { tuning } from "../data/tuning.js";
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

// Turns stat points into what the race actually uses.
export function buildRunner(name, points) {
  const averagePace = tuning.zeroPointAveragePace - points.speed * tuning.secondsPerSpeedPoint;
  const topSpeedPace =
    tuning.zeroPointTopSpeedPace -
    points.speed * tuning.secondsPerSpeedPoint -
    points.topSpeed * tuning.secondsPerTopSpeedPoint;

  return {
    name,
    points,
    averagePace, // seconds to run 1600 m at average pace
    topSpeedPace, // seconds to run 1600 m at top speed (if you somehow never got tired)
    averageSpeed: paceToMph(averagePace), // mph
    topSpeed: paceToMph(topSpeedPace), // mph
    maxStamina: tuning.baseStamina + points.stamina * tuning.staminaPerPoint,
    drainPerLap: tuning.drainPerLapAtAveragePace + points.stamina * tuning.extraDrainPerLapPerStaminaPoint,
    kick: tuning.baseKick + points.kick * tuning.kickPerPoint, // mph gained per second when pushing
    determination: points.determination, // % chance to recover stamina when running low
    raceIQ: points.raceIQ, // how smart the runner races (kick timing for now; positioning later)
  };
}
