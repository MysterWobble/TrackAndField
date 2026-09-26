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

  // --- Determination ---
  determinationLowStamina: 0.25, // start rolling when stamina drops below 25% of the tank
  determinationRollEverySeconds: 5, // roll again this often while still low
  determinationBaseBonus: 5, // a successful roll gives this much stamina...
  determinationBonusPerPoint: 0.1, // ...plus this much per Determination point (30 points -> +8 total)
  // (chance of success = Determination points as a percent; 30 points = 30%. Max one success per lap.)

  // --- The field (computer runners) ---
  computerRunners: 7,
  strongerRunnersMin: 1, // 1 or 2 computer runners always have MORE stat points than you...
  strongerRunnersMax: 2,
  strongerExtraPoints: [5, 15], // ...this many more (random in this range)
  weakerFewerPoints: [0, 20], // everyone else has this many FEWER points than you
  computerKickMisjudge: 0.6, // a Race IQ 0 runner can start their kick up to 60% too early or too late
  perfectKickRaceIQ: 50, // at this much Race IQ, a computer runner times its kick perfectly

  // --- Racing together ---
  draftingRangeMeters: 2, // running this close behind someone...
  draftingStaminaSaving: 0.03, // ...saves this much stamina (3%)
  ignorePassesFirstMeters: 100, // don't announce passes while the pack sorts itself out at the start

  // --- Simulation ---
  tickSeconds: 0.1, // the sim moves everyone forward in steps this long
  liveSpeedup: 7, // the live race plays this many times faster than real life (a 1:40 lap takes ~14 seconds)
};
