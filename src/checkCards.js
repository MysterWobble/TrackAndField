// Checks data/cards.js for mistakes and explains them in plain English.
// Runs every time the game starts (and in the tests).

import { CARD_FIELDS, CARD_TYPES, EFFECT_KEYS, MULTIPLY_KEYS, REQUIREMENTS, SPECIALS, momentsFor } from "./cards.js";

// How many single-letter changes turn one word into another (used for "did you mean...?").
function distance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
    }
  }
  return rows[a.length][b.length];
}

function didYouMean(word, options) {
  const shortFor = options.find((option) => String(word).length >= 3 && option.toLowerCase().startsWith(String(word).toLowerCase()));
  if (shortFor) return ` Did you mean "${shortFor}"?`;
  const best = options
    .map((option) => ({ option, d: distance(String(word), option) }))
    .sort((x, y) => x.d - y.d)[0];
  return best && best.d <= Math.max(2, Math.floor(String(word).length / 3)) ? ` Did you mean "${best.option}"?` : "";
}

const WHEN_OPTIONS = ["pre-race", "after lap 1-3", "after lap 2-3", "after lap 3", "after lap 1", "after lap 2"];

export function checkCards(cards) {
  const errors = [];
  const seenNames = new Map();

  cards.forEach((card, index) => {
    const label = `Card ${index + 1}${typeof card?.name === "string" ? ` ("${card.name}")` : ""}`;
    const problem = (text) => errors.push(`${label}: ${text}`);

    if (typeof card !== "object" || card === null) {
      problem("isn't a card block. Each card should look like { name: ..., type: ..., ... },");
      return;
    }

    for (const field of Object.keys(card)) {
      if (!CARD_FIELDS.includes(field)) problem(`"${field}" isn't a card setting.${didYouMean(field, CARD_FIELDS)}`);
    }

    if (typeof card.name !== "string" || card.name.trim() === "") problem('needs a name in quotes, like name: "Coach Pep-Talk",');
    else if (seenNames.has(card.name)) problem(`has the same name as card ${seenNames.get(card.name)}. Every card needs its own name.`);
    else seenNames.set(card.name, index + 1);

    if (!CARD_TYPES.includes(card.type)) {
      problem(`type "${card.type}" isn't a card type.${didYouMean(card.type ?? "", CARD_TYPES)} Use one of: ${CARD_TYPES.join(", ")}`);
    }

    if (!momentsFor(card.when)) {
      problem(`when "${card.when}" doesn't make sense.${didYouMean(card.when ?? "", WHEN_OPTIONS)} Use "pre-race", "after lap 1-3", "after lap 2-3" or "after lap 3".`);
    }

    if (typeof card.text !== "string" || card.text.trim() === "") problem("needs a text description in quotes (what the player reads).");

    if (card.effects !== undefined) {
      if (typeof card.effects !== "object" || card.effects === null) problem("effects should look like { speed: 10 }");
      else {
        for (const [key, value] of Object.entries(card.effects)) {
          if (!EFFECT_KEYS.includes(key)) problem(`effect "${key}" isn't a stat.${didYouMean(key, EFFECT_KEYS)} Use: ${EFFECT_KEYS.join(", ")}`);
          if (typeof value !== "number" || Number.isNaN(value)) problem(`effect ${key} should be a number, like ${key}: 10`);
        }
      }
    }

    if (card.multiply !== undefined) {
      if (typeof card.multiply !== "object" || card.multiply === null) problem("multiply should look like { determination: 2 }");
      else {
        for (const [key, value] of Object.entries(card.multiply)) {
          if (!MULTIPLY_KEYS.includes(key)) problem(`multiply "${key}" isn't allowed.${didYouMean(key, MULTIPLY_KEYS)} Use: ${MULTIPLY_KEYS.join(", ")}`);
          if (typeof value !== "number" || !(value > 0)) problem(`multiply ${key} should be a number above 0, like ${key}: 2 (double)`);
        }
      }
    }

    if (card.special !== undefined && !(card.special in SPECIALS)) {
      problem(`special "${card.special}" doesn't exist.${didYouMean(card.special, Object.keys(SPECIALS))}`);
    }
    if (card.requires !== undefined && !(card.requires in REQUIREMENTS)) {
      problem(`requires "${card.requires}" doesn't exist.${didYouMean(card.requires, Object.keys(REQUIREMENTS))}`);
    }
    if (card.minPosition !== undefined && !(Number.isInteger(card.minPosition) && card.minPosition >= 2 && card.minPosition <= 8)) {
      problem("minPosition should be a whole number from 2 to 8 (4 means 4th or worse).");
    }
    for (const flag of ["freeSpeed", "rivalryOnly"]) {
      if (card[flag] !== undefined && typeof card[flag] !== "boolean") problem(`${flag} should be true or false (no quotes).`);
    }
    if (card.effects === undefined && card.multiply === undefined && card.special === undefined) {
      problem("doesn't do anything yet: give it effects, multiply, or a special.");
    }
  });

  return errors;
}
