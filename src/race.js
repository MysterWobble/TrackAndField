// The race loop: one runner, alone on the track (the other 7 runners come in a later step).
//
// The sim works like a flip-book. Every tick (0.1 seconds) it:
//   1. decides how fast the runner wants to go,
//   2. speeds them up or slows them down toward that,
//   3. moves them forward and takes away stamina,
//   4. rolls for Determination if stamina is low,
//   5. writes down a split whenever they cross a lap line.
//
// createRace() makes a race you can step through one tick at a time (the live view does this,
// so it can draw the screen and listen for the K key between ticks).
// runSolo() just steps all the way to the finish instantly.

import { tuning } from "../data/tuning.js";
import { mphToMetersPerSecond, raceMeters } from "./units.js";
import { staminaUsed } from "./stamina.js";
import { rollDetermination } from "./determination.js";

// A pace plan says how hard to run each lap: 0 = average pace, 1 = top speed, 0.5 = halfway between.
export const PLANS = {
  even: { label: "even pace", effort: [0, 0, 0, 0] },
  fastStart: { label: "sprint lap 1 at top speed", effort: [1, 0, 0, 0] },
};

export function createRace(runner, rng, plan = PLANS.even) {
  const dt = tuning.tickSeconds;
  const finishLine = raceMeters();

  let reachedPace = false; // true once the runner first gets up to average pace
  let nextRollIn = 0; // seconds until the next Determination roll
  let lastSuccessLap = null; // Determination can only succeed once per lap

  const race = {
    runner,
    plan,
    time: 0,
    distance: 0,
    speed: 0, // standing start
    stamina: runner.maxStamina,
    kicking: false, // true while the player has kick turned on
    finished: false,
    ranOutAt: null, // meters where stamina first hit 0
    laps: [],
    events: [], // Determination successes, for printing

    lapIndex() {
      return Math.min(Math.floor(race.distance / tuning.lapMeters), tuning.laps - 1);
    },

    step() {
      if (race.finished) return;
      const lapIndex = race.lapIndex();

      // 1. How fast does the runner want to go? Kicking means "go for top speed".
      const effort = race.kicking ? 1 : plan.effort[lapIndex];
      const targetSpeed = runner.averageSpeed + effort * (runner.topSpeed - runner.averageSpeed);

      // 2. Speed up or slow down.
      if (race.stamina <= 0) {
        // Out of stamina: fade by 10% of average speed per second, down to 50%.
        const floor = tuning.exhaustedFloor * runner.averageSpeed;
        race.speed = Math.max(race.speed - tuning.exhaustedSlowdownPerSecond * runner.averageSpeed * dt, floor);
      } else if (race.speed < targetSpeed) {
        // Leaving the start line is quick for everyone. After that, all speeding up
        // (a kick, or recovering after running out of stamina) happens at the Kick rate.
        const rate = reachedPace ? runner.kick : tuning.startAcceleration;
        race.speed = Math.min(race.speed + rate * dt, targetSpeed);
      } else if (race.speed > targetSpeed) {
        race.speed = Math.max(race.speed - tuning.easeOffRate * dt, targetSpeed);
      }
      if (race.speed >= runner.averageSpeed) reachedPace = true;

      // 3. Move forward and use stamina.
      let meters = mphToMetersPerSecond(race.speed) * dt;
      let tickTime = dt;
      if (race.distance + meters >= finishLine) {
        // Only count the part of this tick it took to reach the line, so times aren't rounded to 0.1s.
        const fraction = (finishLine - race.distance) / meters;
        meters *= fraction;
        tickTime *= fraction;
      }

      const lapLineAhead = (lapIndex + 1) * tuning.lapMeters;
      const crossesLapLine = race.distance < lapLineAhead && race.distance + meters >= lapLineAhead;
      const timeAtLapLine = race.time + tickTime * ((lapLineAhead - race.distance) / meters);

      race.stamina -= staminaUsed(runner, race.speed, meters);
      if (race.stamina <= 0) {
        if (race.ranOutAt === null) race.ranOutAt = race.distance + meters;
        race.kicking = false; // too tired to keep kicking
      }
      race.stamina = Math.max(race.stamina, 0);
      race.distance += meters;
      race.time += tickTime;

      // 4. Determination: while stamina is low, roll every few seconds (max one success per lap).
      const lowStamina = race.stamina < tuning.determinationLowStamina * runner.maxStamina;
      if (!lowStamina) {
        nextRollIn = 0; // roll straight away the next time stamina drops low
      } else {
        nextRollIn -= tickTime;
        if (nextRollIn <= 0 && lastSuccessLap !== lapIndex) {
          nextRollIn = tuning.determinationRollEverySeconds;
          const bonus = rollDetermination(runner, rng);
          if (bonus > 0) {
            race.stamina = Math.min(race.stamina + bonus, runner.maxStamina);
            lastSuccessLap = lapIndex;
            race.events.push({ type: "determination", time: race.time, distance: race.distance, lap: lapIndex + 1, bonus });
          }
        }
      }

      // 5. Record a split at each lap line.
      if (crossesLapLine) {
        const previousSplit = race.laps.length ? race.laps[race.laps.length - 1].split : 0;
        race.laps.push({
          lap: lapIndex + 1,
          split: timeAtLapLine, // total race time so far
          lapTime: timeAtLapLine - previousSplit,
          staminaLeft: race.stamina,
        });
      }

      if (race.distance >= finishLine) race.finished = true;
    },

    result() {
      return {
        finishTime: race.time,
        laps: race.laps,
        ranOutAt: race.ranOutAt,
        staminaLeft: race.stamina,
        events: race.events,
      };
    },
  };

  return race;
}

export function runSolo(runner, rng, plan = PLANS.even) {
  const race = createRace(runner, rng, plan);
  while (!race.finished) race.step();
  return race.result();
}
