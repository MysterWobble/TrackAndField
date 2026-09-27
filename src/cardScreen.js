// How a card offer looks on screen (used by both the live race and instant mode).

import { ordinal } from "./units.js";

export function offerLines(offer, moment, position = null) {
  const when = moment === 0 ? "before the race" : `after lap ${moment}`;
  const where = position ? `, you're ${ordinal(position)}` : "";
  const lines = ["", `  ── CHOOSE A CARD (${when}${where}) ──`];
  offer.forEach((card, i) => {
    lines.push(`  ${i + 1}. "${card.name}"   [${card.type}]`);
    lines.push(`     ${card.text}`);
  });
  return lines;
}

export function pickPrompt(count) {
  return count === 1 ? "Press 1" : count === 2 ? "Press 1 or 2" : "Press 1, 2 or 3";
}
