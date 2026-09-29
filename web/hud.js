// The race display drawn over the 3D view: lap, time, position, stamina, splits, the kick button,
// pop-up messages, the kick "nitro" glow, and the card-pick and results screens.
// Plain for now; step 6 makes it look good.

import { formatTime, ordinal, raceMeters } from "../src/units.js";
import { STYLES } from "../data/styles.js";
import { tuning } from "../data/tuning.js";

const HOT_ICE_FUZZ = 30; // HotIce: the pace readout can be up to this many seconds off

function element(tag, className, parent, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  parent.appendChild(el);
  return el;
}

export function createHud(root) {
  root.innerHTML = "";
  const glow = element("div", "kick-glow", root);
  const info = element("div", "panel hud-info", root);
  const lapBox = element("div", "panel hud-lap", root);
  const positionBox = element("div", "panel hud-position", root);
  const bottom = element("div", "panel hud-bottom", root);
  const staminaLabel = element("div", "stamina-label", bottom);
  const staminaBar = element("div", "stamina-bar", bottom);
  const staminaFill = element("div", "stamina-fill", staminaBar);
  const paceLine = element("div", "pace", bottom);
  const splits = element("div", "splits", bottom);
  const kickButton = element("button", "kick-button", root, "HOLD\nTO KICK");
  const messages = element("div", "messages", root);
  const overlay = element("div", "overlay hidden", root);

  let paceFuzz = 0; // HotIce: how far off the pace readout is this lap
  let fuzzLap = -1;

  function update(race) {
    const you = race.player;
    const runner = you.runner;
    const hidden = you.cardFlags.hideStats; // Flow State hides your stats
    const done = you.finishTime !== null;

    info.textContent = `${race.condition ? race.condition.name : "No conditions"} · ${STYLES[runner.style].name}\nCards: ${you.cards.length ? you.cards.map((held) => held.card.name).join(" · ") : "none yet"}`;

    const lap = Math.min(Math.floor(you.distance / tuning.lapMeters) + 1, tuning.laps);
    lapBox.textContent = done ? `FINISHED\n${formatTime(you.finishTime)}` : `LAP ${lap} / ${tuning.laps}\n${formatTime(race.time)}`;

    const order = race.standings();
    const place = order.indexOf(you);
    const ahead = order[place - 1];
    const behind = order[place + 1];
    const gap = (other) => `${other.runner.name} ${Math.round(Math.abs(other.distance - you.distance))} m`;
    positionBox.textContent = done
      ? `${ordinal(place + 1)} of ${order.length}\nfinished`
      : `${ordinal(place + 1)} of ${order.length}` + (ahead ? `\n▲ ${gap(ahead)}` : "\n▲ leading!") + (behind ? `\n▼ ${gap(behind)}` : "");

    const fraction = Math.max(0, you.stamina / runner.maxStamina);
    staminaLabel.textContent = hidden ? "Stamina ???  (Flow State)" : `Stamina ${Math.round(fraction * 100)}%`;
    staminaFill.style.width = hidden ? "100%" : `${fraction * 100}%`;
    staminaFill.classList.toggle("hidden-stat", hidden);
    staminaFill.classList.toggle("low", !hidden && fraction < 0.25);

    if (fuzzLap !== you.laps.length) {
      fuzzLap = you.laps.length;
      paceFuzz = (Math.random() * 2 - 1) * HOT_ICE_FUZZ; // screen only, never the race itself
    }
    const clock = done ? you.finishTime : race.time; // stop the pace once you've finished
    const projected = you.distance > 50 ? (clock / you.distance) * raceMeters() : null;
    paceLine.textContent = projected === null ? "Pace --" : `Pace ${formatTime(projected + (you.cardFlags.paceFuzz ? paceFuzz : 0))}${you.cardFlags.paceFuzz ? "  (HotIce: unreliable)" : ""}`;
    splits.textContent = you.laps.map((l) => `Lap ${l.lap}  ${formatTime(l.lapTime)}  ${ordinal(l.position)}`).join("\n");

    const kicking = you.kicking;
    glow.classList.toggle("on", kicking);
    kickButton.classList.toggle("on", kicking);
    kickButton.classList.toggle("tired", !kicking && you.stamina <= 0);
    kickButton.textContent = done ? "DONE" : kicking ? "KICKING!" : you.stamina <= 0 ? "TOO\nTIRED" : "HOLD\nTO KICK";
  }

  // A message that pops up for a few seconds. tone: "good", "bad", or "info".
  function toast(text, tone = "info") {
    const note = element("div", `toast ${tone}`, messages, text);
    while (messages.children.length > 4) messages.firstChild.remove();
    setTimeout(() => note.classList.add("fade"), 2500);
    setTimeout(() => note.remove(), 3200);
  }

  // Shows up to 3 cards and waits for a pick (click/tap, or keys 1-3). Resolves with the chosen card's index.
  function showCards(offer, heading) {
    overlay.innerHTML = "";
    overlay.classList.remove("hidden");
    element("h2", null, overlay, heading);
    const row = element("div", "cards", overlay);
    return new Promise((resolve) => {
      const choose = (index) => {
        window.removeEventListener("keydown", onKey);
        overlay.classList.add("hidden");
        resolve(index);
      };
      const onKey = (event) => {
        const index = Number(event.key) - 1;
        if (index >= 0 && index < offer.length) choose(index);
      };
      window.addEventListener("keydown", onKey);
      offer.forEach((card, i) => {
        const button = element("button", `card type-${card.type.toLowerCase()}`, row);
        element("div", "card-key", button, String(i + 1));
        element("div", "card-type", button, card.type);
        element("div", "card-name", button, `"${card.name}"`);
        element("div", "card-text", button, card.text);
        button.addEventListener("click", () => choose(i));
      });
    });
  }

  // Final results, with a button to race again.
  function showResults(race, onAgain) {
    overlay.innerHTML = "";
    overlay.classList.remove("hidden");
    const you = race.player;
    element("h2", null, overlay, `You finished ${ordinal(race.positionOf(you))} in ${formatTime(you.finishTime)}`);
    const table = element("div", "results", overlay);
    const winner = race.results()[0].finishTime;
    for (const r of race.results()) {
      const line = element("div", r.isPlayer ? "result you" : "result", table);
      const gap = r.place === 1 ? "" : `+${(r.finishTime - winner).toFixed(1)}`;
      line.textContent = `${ordinal(r.place).padEnd(4)} ${r.name.padEnd(8)} ${STYLES[r.style].name.padEnd(13)} ${formatTime(r.finishTime)}  ${gap}${r.isRival ? "  (rival)" : ""}`;
    }
    const again = element("button", "again", overlay, "Race again (R)");
    const go = () => {
      window.removeEventListener("keydown", onKey);
      overlay.classList.add("hidden");
      onAgain();
    };
    const onKey = (event) => event.code === "KeyR" && go();
    window.addEventListener("keydown", onKey);
    again.addEventListener("click", go);
  }

  return { update, toast, showCards, showResults, kickButton };
}

// Turns a race event into a pop-up message about YOU (or null if it isn't worth showing).
export function messageFor(event, race) {
  const you = race.player;
  const mine = event.entrant === you;
  const name = (entrant) => (entrant === race.rival ? `your rival ${entrant.runner.name}` : entrant.runner.name);
  const place = () => ordinal(race.positionOf(you));
  if (event.type === "pass" && mine) return [`You pass ${name(event.passed)}! Now ${place()}.`, "good"];
  if (event.type === "pass" && event.passed === you) return [`${name(event.entrant)} passes you. Now ${place()}.`, "bad"];
  if (event.type === "boxed" && mine) return ["Boxed in! Stuck behind the runner ahead.", "bad"];
  if (event.type === "determination" && mine) return [`Determination! +${event.bonus.toFixed(0)} stamina`, "good"];
  if (event.type === "ranOut" && mine) return ["Out of stamina! Fading...", "bad"];
  if (event.type === "chase" && mine) return ["Your Front Runner fights back!", "info"];
  if (event.type === "kick" && event.entrant === race.rival) return [`Your rival ${event.entrant.runner.name} starts kicking!`, "info"];
  return null;
}
