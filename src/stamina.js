// How much stamina a runner uses.
//
// The idea: at average pace you use `drainPerLap` stamina every lap. Run faster and
// it costs more, a LOT more near top speed. Run slower and it costs less.
//
// The "effort multiplier" is how many times the normal cost you're paying right now:
//
//   speed:       half pace   average pace   halfway to top   top speed
//   multiplier:     0.25          1.0            1.375            2.5
//
// Squaring the numbers (** 2) is what makes the cost climb faster as you get
// closer to top speed, so a small push is cheap and a full sprint is expensive.

import { tuning } from "../data/tuning.js";

export function effortMultiplier(runner, speed) {
  if (speed <= runner.averageSpeed) {
    return (speed / runner.averageSpeed) ** 2;
  }
  // 0 at average pace, 1 at top speed (and above 1 if something pushes you past top speed)
  const closenessToTop = (speed - runner.averageSpeed) / (runner.topSpeed - runner.averageSpeed);
  return 1 + (tuning.drainMultiplierAtTopSpeed - 1) * closenessToTop ** 2;
}

// Stamina used while running `meters` at `speed` mph.
export function staminaUsed(runner, speed, meters) {
  const drainPerMeter = runner.drainPerLap / tuning.lapMeters;
  return drainPerMeter * meters * effortMultiplier(runner, speed);
}
