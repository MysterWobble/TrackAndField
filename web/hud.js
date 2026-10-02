// The race display drawn over the 3D view: lap, time, position, stamina, splits, the kick button,
// pop-up messages, and the kick "nitro" glow. (Menus and card picks are in screens.js.)
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
  const lastShown = new Map(); // message text -> when it was last shown
  function toast(text, tone = "info") {
    const now = performance.now();
    if (now - (lastShown.get(text) ?? -Infinity) < 3000) return; // don't repeat the same message within 3 seconds
    lastShown.set(text, now);
    const note = element("div", `toast ${tone}`, messages, text);
    while (messages.children.length > 2) messages.firstChild.remove(); // at most 2 at once, so the race stays visible
    setTimeout(() => note.classList.add("fade"), 2500);
    setTimeout(() => note.remove(), 3200);
  }

  // Hide the race display while the menus are up.
  function setVisible(on) {
    root.classList.toggle("off", !on);
    if (!on) messages.innerHTML = "";
  }

  return { update, toast, setVisible, kickButton };
}

// Turns a race event into a pop-up message about YOU (or null if it isn't worth showing).
export function messageFor(event, race) {
  const you = race.player;
  const mine = event.entrant === you;
  const name = (entrant) => (entrant === race.rival ? `your rival ${entrant.runner.name}` : entrant.runner.name);
  const place = () => ordinal(race.positionOf(you));
  if (event.type === "pass" && mine) return [`You pass ${name(event.passed)}! Now ${place()}.`, "good"];
  if (event.type === "pass" && event.passed === you) {
    const who = name(event.entrant);
    return [`${who[0].toUpperCase()}${who.slice(1)} passes you. Now ${place()}.`, "bad"]; // "Your rival..." starts the sentence
  }
  if (event.type === "boxed" && mine) return ["Boxed in! Stuck behind the runner ahead.", "bad"];
  if (event.type === "determination" && mine) return [`Determination! +${event.bonus.toFixed(0)} stamina`, "good"];
  if (event.type === "ranOut" && mine) return ["Out of stamina! Fading...", "bad"];
  if (event.type === "chase" && mine) return ["Your Front Runner fights back!", "info"];
  if (event.type === "kick" && event.entrant === race.rival) return [`Your rival ${event.entrant.runner.name} starts kicking!`, "info"];
  return null;
}
