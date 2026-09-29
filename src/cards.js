// How cards work: which ones can be offered, drawing 3, picking one, and what each does during the race.
// The cards themselves live in data/cards.js.

import { tuning } from "../data/tuning.js";
import { CARDS } from "../data/cards.js";
import { STAT_NAMES } from "./runner.js";

export const CARD_TYPES = ["Preparation", "Pacing", "Encouragement", "Strategy", "Push", "Unique"];
// Card effects are stat POINTS (the same as training), except staminaDrain, which is a percent.
export const EFFECT_KEYS = [...STAT_NAMES, "staminaDrain"];
// "multiply" can scale these stats, for cards like "double your Determination".
export const MULTIPLY_KEYS = ["stamina", "kick", "determination", "raceIQ"];
export const CARD_FIELDS = ["name", "type", "when", "text", "effects", "multiply", "freeSpeed", "rivalryOnly", "minPosition", "requires", "special"];

// Pick moments: 0 = before the race, 1 = after lap 1, 2 = after lap 2, 3 = after lap 3.
// Turns "pre-race" / "after lap 1-3" / "after lap 3" into a list of moments, or null if it doesn't make sense.
export function momentsFor(when) {
  if (when === "pre-race") return [0];
  const match = /^after lap (\d)(?:-(\d))?$/.exec(String(when));
  if (!match) return null;
  const from = Number(match[1]);
  const to = Number(match[2] ?? match[1]);
  if (from < 1 || to > tuning.laps - 1 || from > to) return null;
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

export function isRare(card) {
  return card.type === "Unique" || card.rivalryOnly === true;
}

// --- Helpers for counting what's happened since a card was picked ---

function passesMadeSince(race, you, time) {
  return race.log.filter((e) => e.type === "pass" && e.entrant === you && e.time >= time).length;
}

function passesTakenSince(race, you, time) {
  return race.log.filter((e) => e.type === "pass" && e.passed === you && e.time >= time).length;
}

// --- Special conditions a card can require before it's offered ("requires" in data/cards.js) ---

export const REQUIREMENTS = {
  // Same position at the last two lap lines.
  samePositionTwoLaps: (race, you) => {
    const laps = you.laps;
    return laps.length >= 2 && laps[laps.length - 1].position === laps[laps.length - 2].position;
  },
  // You've passed one runner at least twice, and they've passed you at least twice.
  backAndForth: (race, you) => {
    const made = new Map();
    const taken = new Map();
    for (const e of race.log) {
      if (e.type !== "pass") continue;
      if (e.entrant === you) made.set(e.passed, (made.get(e.passed) ?? 0) + 1);
      if (e.passed === you) taken.set(e.entrant, (taken.get(e.entrant) ?? 0) + 1);
    }
    return [...made].some(([runner, count]) => count >= 2 && (taken.get(runner) ?? 0) >= 2);
  },
};

// --- Special behaviors ("special" in data/cards.js) ---
// Each one can have any of these:
//   onPick(state, race, you, rng)  runs once when the card is picked; can return a message to show
//   isActive(state, race, you)     return false once the card has worn off (its effects stop)
//   extraEffects(state, race, you) stat points that change during the race
//   extraMultiply(state)           stat multipliers decided during the race
//   last()                         rules applied after every other card
//   hideStats / paceFuzz / matchRunnerAhead: switches the race and screen look at while the card is active

export const SPECIALS = {
  hotIce: { paceFuzz: true },

  keepUpWithThatGuy: {
    isActive: (state, race, you) => passesMadeSince(race, you, state.pickedAt) < 2,
  },

  rememberWhy: {
    isActive: (state, race, you) => !you.events.some((event) => event.time >= state.pickedAt),
  },

  peopleWatching: {
    onPick: (state, race, you, rng) => {
      const roll = rng.next();
      state.multiplier = roll < 0.5 ? 1.5 : roll < 0.75 ? 1 : 0.7;
      if (state.multiplier > 1) return "The crowd roars! +50% Determination.";
      if (state.multiplier < 1) return "The pressure gets to you. -30% Determination.";
      return "You barely notice the crowd. Nothing changes.";
    },
    extraMultiply: (state) => ({ determination: state.multiplier }),
  },

  tripAndFall: {
    onPick: (state, race, you) => {
      you.fallenFor = tuning.tripFallSeconds;
      return "You trip and hit the track... and get right back up!";
    },
    last: () => ({ multiply: { stamina: 0.9, kick: 0.9, raceIQ: 0.9 } }),
  },

  losingForm: {
    last: () => ({ raceIQPointsOverBase: 5 }),
  },

  scorer: {
    extraEffects: (state, race, you) => ({ determination: 5 * passesMadeSince(race, you, state.pickedAt) }),
  },

  onHisBack: {
    matchRunnerAhead: true,
    isActive: (state, race, you) => {
      if (you.stamina <= 0) state.over = true; // once you run out, it's over for good
      return !state.over;
    },
  },

  flowState: { hideStats: true },

  heThinks: {
    onPick: (state, race, you, rng) => {
      const moment = you.laps.length;
      const pool = CARDS.filter(
        (card) =>
          !isRare(card) &&
          card.special !== "heThinks" &&
          momentsFor(card.when).includes(moment) &&
          !you.cards.some((held) => held.card === card),
      );
      const gained = rng.shuffle(pool).slice(0, 2);
      const messages = gained.map((card) => {
        const extra = applyCard(race, you, card, rng);
        return `You also get "${card.name}"${extra.length ? ` ${extra.join(" ")}` : ""}`;
      });
      return messages.join("\n  ");
    },
  },

  state: {
    extraEffects: (state, race, you) => ({ determination: -5 * passesTakenSince(race, you, state.pickedAt) }),
  },
};

// --- Offering and picking ---

// Can this card be offered to you right now?
export function canOffer(card, moment, race, you) {
  if (!momentsFor(card.when).includes(moment)) return false;
  if (you.cards.some((held) => held.card === card)) return false;
  if (card.rivalryOnly && !race.condition?.rival) return false;
  if (card.minPosition && race.positionOf(you) < card.minPosition) return false;
  if (card.requires && !REQUIREMENTS[card.requires](race, you)) return false;
  return true;
}

// Draws up to 3 different cards. Rivalry and Unique cards are less likely (tuning.rareCardWeight).
// `forced` puts one specific card first, ignoring its conditions (for testing with --give).
export function offerCards(moment, race, rng, forced = null) {
  const you = race.player;
  const ranked = CARDS.filter((card) => canOffer(card, moment, race, you))
    .map((card) => ({ card, ticket: rng.next() ** (1 / (isRare(card) ? tuning.rareCardWeight : 1)) }))
    .sort((a, b) => b.ticket - a.ticket)
    .map((entry) => entry.card);
  const forcedFits = forced && momentsFor(forced.when).includes(moment) && !you.cards.some((held) => held.card === forced);
  const offer = forcedFits ? [forced, ...ranked.filter((card) => card !== forced)] : ranked;
  return offer.slice(0, 3);
}

// Gives you a card. Returns any messages to show (like how "people watching" turned out).
export function applyCard(race, you, card, rng) {
  const state = { card, pickedAt: race.time };
  you.cards.push(state);
  const message = SPECIALS[card.special]?.onPick?.(state, race, you, rng);
  return message ? [message] : [];
}

// Adds up everything your cards do right now:
//   points          stat points to add (like training)
//   pushSpeedPoints Speed points that come from pushing harder (they cost stamina)
//   percent         percent bonuses (staminaDrain)
//   last            multipliers, and Losing Your Form's Race IQ reset
//   flags           switches like hideStats
export function cardBonuses(race, you) {
  const points = {};
  let pushSpeedPoints = 0;
  const percent = {};
  const last = { multiply: {} };
  const flags = { hideStats: false, paceFuzz: false, matchRunnerAhead: false };
  const multiplyBy = (list) => {
    for (const [stat, factor] of Object.entries(list ?? {})) last.multiply[stat] = (last.multiply[stat] ?? 1) * factor;
  };

  for (const state of you.cards) {
    const special = SPECIALS[state.card.special] ?? {};
    if (special.isActive && !special.isActive(state, race, you)) continue;

    for (const list of [state.card.effects ?? {}, special.extraEffects?.(state, race, you) ?? {}]) {
      for (const [key, amount] of Object.entries(list)) {
        if (key === "staminaDrain") percent.staminaDrain = (percent.staminaDrain ?? 0) + amount / 100;
        else if (key === "speed" && !state.card.freeSpeed) pushSpeedPoints += amount; // pushing harder costs stamina
        else points[key] = (points[key] ?? 0) + amount;
      }
    }

    multiplyBy(state.card.multiply);
    multiplyBy(special.extraMultiply?.(state));
    const rules = special.last?.() ?? {};
    multiplyBy(rules.multiply);
    if (rules.raceIQPointsOverBase !== undefined) last.raceIQPointsOverBase = rules.raceIQPointsOverBase;

    for (const flag of Object.keys(flags)) if (special[flag]) flags[flag] = true;
  }
  return { points, pushSpeedPoints, percent, last, flags };
}
