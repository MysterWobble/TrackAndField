// What each stat does, in plain words. Shown on the "How stats work" screen and in the ? bubbles on cards.
// Edit freely: this is just text. (The real numbers live in data/tuning.js.)

export const STAT_HELP = {
  speed: "Your normal racing pace. More Speed means a faster pace the whole race, and a slightly faster top speed too.",
  topSpeed: "How fast you can sprint when you kick.",
  stamina:
    "Your energy tank. Running faster than your normal pace drains it quicker, and kicking drains it about 4 times as fast. Run out and you slow way down.",
  kick: "How quickly you get up to top speed when you kick. Strong kickers also sprint a little more efficiently (less stamina).",
  determination:
    "Digging deep. Once a lap, when your stamina gets low, you have a Determination % chance to get some stamina back. More Determination also means a bigger boost.",
  raceIQ:
    "Racing smarts: holding a steady pace, not getting boxed in behind other runners, and not swinging wide (and wasting stamina) when you pass.",
  staminaDrain: "How fast your stamina runs down. Lower is better.",
};

// Extra notes for cards.
export const CARD_NOTES = {
  pushSpeed: "Speed from a card means pushing harder, so it costs extra stamina.",
  freeSpeed: "This speed is free: it doesn't cost extra stamina.",
};

export const HELP_LABELS = {
  speed: "Speed",
  topSpeed: "Top Speed",
  stamina: "Stamina",
  kick: "Kick",
  determination: "Determination",
  raceIQ: "Race IQ",
  staminaDrain: "Stamina drain",
};
