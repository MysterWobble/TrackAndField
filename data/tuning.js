// All the race numbers in one place. Change a number, save, run `npm run race` again.
// Times are in seconds, speeds in mph. A "mile" here means our 1600 m race.

export const tuning = {
  // --- Track ---
  lapMeters: 400,
  laps: 4,

  // --- Stat points ---
  statPointsTotal: 150, // every runner gets exactly this many points...
  maxPointsPerStat: 35, // ...but no stat can go above this

  // --- Pace ---
  zeroPointAveragePace: 7 * 60 + 15, // 7:15: average pace of a runner with 0 Speed points
  zeroPointTopSpeedPace: 6 * 60 + 15, // 6:15: top speed pace with 0 Speed and 0 Top Speed points
  secondsPerSpeedPoint: 1, // each Speed point takes this much off average pace AND top speed pace
  secondsPerTopSpeedPoint: 1, // each Top Speed point takes this much off top speed pace only

  // --- Stamina ---
  baseStamina: 100,
  staminaPerPoint: 1, // tank size = baseStamina + (points × this)
  drainPerLapAtAveragePace: 25,
  extraDrainPerLapPerStaminaPoint: 0.0625, // makes each Stamina point worth 0.75 spare stamina over a race
  drainMultiplierAtTopSpeed: 2.5, // running at top speed drains this many times faster than average pace

  // --- Speeding up and slowing down (mph per second) ---
  baseKick: 0.4, // how fast a 0-Kick runner speeds up past their average pace
  kickPerPoint: 0.02, // each Kick point adds this (30 points -> 1.0 mph/s)
  startAcceleration: 4, // getting up to average pace from the start line (same for everyone)
  easeOffRate: 4, // slowing back down to planned pace after a push

  // --- Out of stamina ---
  exhaustedSlowdownPerSecond: 0.1, // lose 10% of average pace speed every second...
  exhaustedFloor: 0.5, // ...until you're down to 50% of it

  // --- Simulation ---
  tickSeconds: 0.1, // the sim moves everyone forward in steps this long
};
