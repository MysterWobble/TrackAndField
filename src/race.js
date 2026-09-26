// The race loop: one runner, alone on the track (the other 7 runners come in a later step).
//
// The sim works like a flip-book. Every tick (0.1 seconds) it:
//   1. decides how fast the runner wants to go,
//   2. speeds them up or slows them down toward that,
//   3. moves them forward and takes away stamina,
//   4. writes down a split whenever they cross a lap line.

import { tuning } from "../data/tuning.js";
import { mphToMetersPerSecond, raceMeters } from "./units.js";
import { staminaUsed } from "./stamina.js";

// A pace plan says how hard to run each lap: 0 = average pace, 1 = top speed, 0.5 = halfway between.
export const PLANS = {
  even: { label: "even pace", effort: [0, 0, 0, 0] },
  fastStart: { label: "sprint lap 1 at top speed", effort: [1, 0, 0, 0] },
};

export function runSolo(runner, plan = PLANS.even) {
  const dt = tuning.tickSeconds;
  const finishLine = raceMeters();

  let time = 0;
  let distance = 0;
  let speed = 0; // standing start
  let stamina = runner.maxStamina;
  let ranOutAt = null; // meters where stamina first hit 0
  const laps = [];

  while (distance < finishLine) {
    const lapIndex = Math.min(Math.floor(distance / tuning.lapMeters), tuning.laps - 1);

    // 1. How fast does the runner want to go?
    const effort = plan.effort[lapIndex];
    const targetSpeed = runner.averageSpeed + effort * (runner.topSpeed - runner.averageSpeed);

    // 2. Speed up or slow down.
    if (stamina <= 0) {
      // Out of stamina: fade by 10% of average speed per second, down to 50%.
      const floor = tuning.exhaustedFloor * runner.averageSpeed;
      speed = Math.max(speed - tuning.exhaustedSlowdownPerSecond * runner.averageSpeed * dt, floor);
    } else if (speed < targetSpeed) {
      // Getting up to average pace is quick for everyone. Going past it is what Kick controls.
      const rate = speed < runner.averageSpeed ? tuning.startAcceleration : runner.kick;
      speed = Math.min(speed + rate * dt, targetSpeed);
    } else if (speed > targetSpeed) {
      speed = Math.max(speed - tuning.easeOffRate * dt, targetSpeed);
    }

    // 3. Move forward and use stamina.
    let meters = mphToMetersPerSecond(speed) * dt;
    let tickTime = dt;
    if (distance + meters >= finishLine) {
      // Only count the part of this tick it took to reach the line, so times aren't rounded to 0.1s.
      const fraction = (finishLine - distance) / meters;
      meters *= fraction;
      tickTime *= fraction;
    }

    const lapLineAhead = (lapIndex + 1) * tuning.lapMeters;
    const crossesLapLine = distance < lapLineAhead && distance + meters >= lapLineAhead;
    const timeAtLapLine = time + tickTime * ((lapLineAhead - distance) / meters);

    stamina -= staminaUsed(runner, speed, meters);
    if (stamina <= 0 && ranOutAt === null) ranOutAt = distance + meters;
    stamina = Math.max(stamina, 0);
    distance += meters;
    time += tickTime;

    // 4. Record a split at each lap line.
    if (crossesLapLine) {
      const previousSplit = laps.length ? laps[laps.length - 1].split : 0;
      laps.push({
        lap: lapIndex + 1,
        split: timeAtLapLine, // total race time so far
        lapTime: timeAtLapLine - previousSplit,
        staminaLeft: stamina,
      });
    }
  }

  return { finishTime: time, laps, ranOutAt, staminaLeft: stamina };
}
