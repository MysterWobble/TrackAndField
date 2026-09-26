// What each running style does during the race. The numbers live in data/styles.js.
//
// The race loop asks this file three questions about a runner every tick:
//   - planFor():       how hard do they want to run right now? (pace and effort)
//   - speedBonuses():  any style bonus to Speed or Top Speed right now?
//   - staminaFactor(): any style discount on stamina?
// Front Runners also get asked wantsToChase() when someone passes them.

import { tuning } from "../data/tuning.js";
import { STYLES } from "../data/styles.js";

const { frontRunner, pacer, closer, competitor } = STYLES;

// pace = multiplier on average speed (0.95 = hang back), effort = 0 average ... 1 top speed.
export function planFor(entrant, lapIndex) {
  const style = entrant.runner.style;
  if (style === "frontRunner" && lapIndex === 0) {
    const shrink = Math.max(0, 1 - entrant.runner.raceIQ * frontRunner.surgeShrinkPerRaceIQ);
    return { pace: 1, effort: frontRunner.lap1Surge * shrink };
  }
  if (style === "closer" && lapIndex < tuning.laps - 1) {
    return { pace: closer.earlyPace, effort: 0 };
  }
  return { pace: 1, effort: 0 };
}

// Returns bonuses as fractions (0.05 = +5%). `speed` raises average AND top speed; `topSpeed` only top.
// `surroundings` = { gapAhead, gapBehind } in meters to the nearest runner (null if nobody there).
export function speedBonuses(entrant, lapIndex, surroundings) {
  const style = entrant.runner.style;
  if (style === "closer" && lapIndex === tuning.laps - 1) {
    return { speed: 0, topSpeed: closer.lastLapTopSpeedBonus };
  }
  if (style === "competitor") {
    const { gapAhead, gapBehind } = surroundings;
    const tuckedIn = (gap) => gap !== null && gap <= competitor.tuckInMeters;
    if (tuckedIn(gapAhead) || tuckedIn(gapBehind)) {
      return { speed: 0, topSpeed: 0 }; // right on someone's shoulder: just run normally
    }
    if (gapAhead !== null && gapAhead <= competitor.closeBehindMeters) {
      return { speed: competitor.closeBehindSpeedBonus, topSpeed: 0 };
    }
    const leading = gapAhead === null;
    const nearest = Math.min(gapAhead ?? Infinity, gapBehind ?? Infinity);
    if (leading || nearest > competitor.aloneMeters) {
      return { speed: -competitor.aloneSpeedPenalty, topSpeed: 0 };
    }
  }
  return { speed: 0, topSpeed: 0 };
}

// Multiplier on stamina used this tick (0.9 = uses 10% less).
export function staminaFactor(entrant, speed, averageSpeed) {
  if (entrant.runner.style === "pacer" && speed <= averageSpeed + 1e-9) {
    return 1 - pacer.staminaSavingAtPace;
  }
  return 1;
}

// A Front Runner who just got passed: do they fight back? Race IQ makes them calmer.
export function wantsToChase(entrant, rng) {
  const chance = Math.max(0, 1 - entrant.runner.raceIQ / frontRunner.neverChaseRaceIQ);
  return rng.chance(chance);
}

export const CHASE = { effort: frontRunner.chaseEffort, maxMeters: frontRunner.chaseMaxMeters };
