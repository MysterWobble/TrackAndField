// Race conditions. Every race picks one of these at random, and it affects EVERY runner.
//
// "bonuses" use the same names as cards will: speed, topSpeed, stamina, kick,
// determination, raceIQ, staminaDrain. 0.10 = +10%, -0.05 = -5%.
// "speed" also raises top speed, so "all stats -5%" only needs speed (not topSpeed too).

export const CONDITIONS = {
  hot: {
    name: "Hot Day",
    description: "Stamina drains 10% faster for everyone. Pacers handle the heat: their stamina saving doubles.",
    bonuses: { staminaDrain: 0.1 },
    pacerSavingMultiplier: 2, // Pacer's 10% stamina saving becomes 20%
  },

  windy: {
    name: "Windy",
    description: "Tailwind on the first half of every lap (+10% speed), headwind on the second half (-10%). Tuck in behind someone to hide from the headwind.",
    wind: 0.1, // speed change: + on the first half of each lap, - on the second half
    shelterMeters: 5, // running within this far behind someone...
    headwindShelter: 0.8, // ...blocks 80% of the headwind
    draftingMultiplier: 3, // running right behind someone saves 3x the normal stamina (3% -> 9%)
  },

  fastTrack: {
    name: "Fast Track",
    description: "Everyone's Kick and top speed are 5% higher.",
    bonuses: { kick: 0.05, topSpeed: 0.05 },
  },

  rivalry: {
    name: "Rivalry Race",
    description: "Everyone's Determination is 10% higher, and one runner is your rival.",
    bonuses: { determination: 0.1 },
    rival: true, // picks a random computer runner as your rival (rivalry cards will unlock here later)
  },

  rain: {
    name: "Rainy",
    description: "Everyone's stats drop 5%, except Race IQ, which goes up 5%.",
    bonuses: { speed: -0.05, stamina: -0.05, kick: -0.05, determination: -0.05, raceIQ: 0.05 },
    separatePersonalBest: true, // rain is so much slower that it gets its own personal best (built with saving, PLAN step 4)
  },
};

export const CONDITION_KEYS = Object.keys(CONDITIONS);
