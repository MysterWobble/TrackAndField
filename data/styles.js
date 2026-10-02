// The four running styles. Every runner (yours and the computer's) has one.
// Change the numbers to tune a style. "description" is what the player sees.
//
// Speed bonuses (like +5%) add together with any other bonuses, and change what the
// runner is capable of, so they don't cost extra stamina. Pace changes (running slower
// or surging) are the runner working harder or easier, so they DO change stamina use.

export const STYLES = {
  frontRunner: {
    name: "Front Runner",
    description: "Surges on lap 1 and fights to keep their position when passed. Race IQ keeps them calmer.",
    lap1Surge: 0.035, // lap 1 effort: 0 = average pace, 1 = top speed (about 1% faster; halved after playtesting, they led too much early)
    surgeShrinkPerRaceIQ: 0.01, // each Race IQ point makes the lap 1 surge 1% smaller (30 IQ -> 30% smaller)
    neverChaseRaceIQ: 50, // chance to fight back when passed = 100% at 0 Race IQ, down to 0% at this much
    chaseEffort: 0.5, // how hard they push while fighting back
    chaseMaxMeters: 200, // they give up if they haven't got the position back after this far
    chaseStopsAtStamina: 0.25, // ...or once their stamina drops below 25%
    chaseUntilAheadMeters: 3, // they keep pushing until they're this far back in front
    chaseCooldownSeconds: 30, // after a fight, they won't fight back again for this long
  },

  pacer: {
    name: "Pacer",
    description: "Steady and efficient: uses 10% less stamina at normal pace, but has a weaker kick.",
    staminaSavingAtPace: 0.1, // 10% less stamina used while at or below average pace
    kickMultiplier: 0.75, // kick is 25% weaker
  },

  closer: {
    name: "Closer",
    description: "Hangs back at 97% pace for 3 laps to save stamina, then gets +20% top speed on the last lap.",
    earlyPace: 0.97, // laps 1-3 run at 97% of average pace
    lastLapTopSpeedBonus: 0.2, // +20% top speed on the last lap
  },

  competitor: {
    name: "Competitor",
    description: "+5% speed when chasing someone down, but -5% when leading or far from everyone.",
    closeBehindMeters: 10, // within this far behind another runner...
    closeBehindSpeedBonus: 0.05, // ...gets +5% speed
    tuckInMeters: 2, // once this close, they tuck in and run normally (so two Competitors don't leapfrog forever)
    aloneMeters: 20, // leading (by more than tuckInMeters), or more than this far from everyone...
    aloneSpeedPenalty: 0.05, // ...gets -5% speed
  },
};

export const STYLE_KEYS = Object.keys(STYLES);
