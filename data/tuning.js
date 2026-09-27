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
  secondsPerSpeedPoint: 0.55, // each Speed point takes this much off average pace AND top speed pace
  secondsPerTopSpeedPoint: 2, // each Top Speed point takes this much off top speed pace only

  // --- Stamina ---
  baseStamina: 100,
  staminaPerPoint: 1.25, // tank size = baseStamina + (points × this)
  drainPerLapAtAveragePace: 25,
  extraDrainPerLapPerStaminaPoint: 0.0625, // with 1.25 per point, each Stamina point is worth 1 spare stamina over a race
  drainMultiplierAtTopSpeed: 2.5, // running at top speed drains this many times faster than average pace...
  surgeDrain: 6, // running above your normal pace without kicking (surging, fighting back, drifting fast): every 1% faster uses 6% more stamina
  drainCurvePower: 2, // shape of the cost between average pace and top speed (2 = small pushes are cheap, 1 = even, 0.5 = any push costs a lot)
  pushSpeedDrain: 3, // speed from cards is you pushing harder: every 1% faster uses 3% more stamina (new shoes excepted)
  kickSprintSavingPerPoint: 0.02, // ...minus this much per Kick point (strong kickers sprint more efficiently: 25 Kick -> 2.0)
  lowestSprintDrain: 1.5, // ...but never less than this

  // --- Speeding up and slowing down (mph per second) ---
  baseKick: 0.25, // how fast a 0-Kick runner speeds up past their average pace
  kickPerPoint: 0.04, // each Kick point adds this (30 points -> 1.45 mph/s)
  startAcceleration: 4, // getting up to average pace from the start line (same for everyone)
  easeOffRate: 4, // slowing back down to planned pace after a push

  // --- Out of stamina ---
  exhaustedSlowdownPerSecond: 0.1, // lose 10% of average pace speed every second...
  exhaustedFloor: 0.5, // ...until you're down to 50% of it

  // --- Determination ---
  determinationLowStamina: 0.35, // start rolling when stamina drops below 35% of the tank
  determinationRollEverySeconds: 5, // roll again this often while still low
  determinationBaseBonus: 5, // a successful roll gives this much stamina...
  determinationBonusPerPoint: 0.6, // ...plus this much per Determination point (30 points -> +23 total)
  // (chance of success = Determination points as a percent; 30 points = 30%. Max one success per lap.)

  // --- The field (computer runners) ---
  computerRunners: 7,
  strongerRunnersMin: 1, // 1 or 2 computer runners always have MORE stat points than you...
  strongerRunnersMax: 2,
  strongerExtraPoints: [5, 15], // ...this many more (random in this range)
  weakerFewerPoints: [0, 20], // everyone else has this many FEWER points than you
  computerKickMisjudge: 0.6, // a Race IQ 0 runner can start their kick up to 60% too early or too late

  // --- Race IQ ---
  // Every Race IQ mistake below shrinks as Race IQ goes up, and disappears at perfectRaceIQ.
  perfectRaceIQ: 50, // at this much Race IQ: no positioning mistakes, and computer runners time their kick perfectly
  paceWobble: 0.1, // a Race IQ 0 runner's cruising pace drifts up to 10% faster or slower...
  paceWobbleEverySeconds: 15, // ...changing this often (Pacers never wobble)
  boxedInChancePerSecond: 1, // chance per second a Race IQ 0 runner gets boxed in when stuck in a pack
  boxedInSeconds: 4, // boxed in = stuck behind the runner ahead for this long...
  boxedInSlowdown: 0.25, // ...running 25% slower than them (checking your stride)
  boxedInPackMeters: 2, // "stuck in a pack" = someone within this far ahead AND someone else right beside you
  boxedInCooldownSeconds: 3, // after getting out of a box, can't get boxed in again for this long
  passWideStamina: 10, // passing makes a Race IQ 0 runner swing wide, costing this much extra stamina

  // --- Racing together ---
  draftingRangeMeters: 2, // running this close behind someone...
  draftingStaminaSaving: 0.03, // ...saves this much stamina (3%)
  ignorePassesFirstMeters: 100, // don't announce passes while the pack sorts itself out at the start
  settleInSeconds: 15, // after someone passes you, you settle in behind them this long instead of passing straight back
                       // (kicking, or a Front Runner fighting back, ignores this)

  // --- Cards ---
  rareCardWeight: 1 / 3, // Rivalry and Unique cards show up a third as often as normal cards
  tripFallSeconds: 1, // "I won't stop here": how long you're down after tripping (then you have to get back up to speed)

  // --- Simulation ---
  tickSeconds: 0.1, // the sim moves everyone forward in steps this long
  liveSpeedup: 7, // the live race plays this many times faster than real life (a 1:40 lap takes ~14 seconds)
};
