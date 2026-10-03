// The race display drawn over the 3D view (docs/UI_DIRECTION.md §4). Kept minimal so the race is the show:
//   top-left     lap dots, LAP 2/4, the clock, and your pace
//   top-right    your place ("3rd /8") and who's just ahead and behind
//   bottom-left  today's conditions, your style, and your cards, as small tags (tap one to reread it)
//   bottom-right the kick button, with your stamina as a ring around it
//   bottom-mid   a gold KICK chip, only while you're kicking
//   above kick   the camera button (stadium view <-> race camera)
// Big numbers have a dark outline instead of a box behind them. (Menus and card picks are in screens.js.)

import { formatTime, ordinal, raceMeters } from "../src/units.js";
import { STYLES } from "../data/styles.js";
import { tuning } from "../data/tuning.js";
import { ICONS, TYPE_ICONS } from "./icons.js";
import { cardLook } from "../src/cards.js";

const HOT_ICE_FUZZ = 30; // HotIce: the pace readout can be up to this many seconds off
const LOW_STAMINA = 0.25; // below this, the ring pulses
const RING_RADIUS = 54;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function element(tag, className, parent, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  parent.appendChild(el);
  return el;
}

// Text whose characters each sit in a fixed-width box, so a ticking clock doesn't wobble sideways.
function setDigits(el, text) {
  if (el.dataset.text === text) return;
  el.dataset.text = text;
  el.innerHTML = "";
  for (const char of text) element("span", /\d/.test(char) ? "digit" : "sep", el, char);
}

// Restart a little "landing" bounce on an element (e.g. when your place changes).
function bump(el) {
  el.classList.remove("bump");
  void el.offsetWidth; // let the browser notice the class came off, so the animation can run again
  el.classList.add("bump");
}

export function createHud(root) {
  root.innerHTML = "";
  const glow = element("div", "kick-glow", root);

  // Top-left: laps and time.
  const lapBox = element("div", "hud-corner hud-lap", root);
  const lapRow = element("div", "hud-row", lapBox);
  lapRow.insertAdjacentHTML("beforeend", ICONS.flag);
  const pips = element("div", "pips", lapRow);
  const pipList = Array.from({ length: tuning.laps }, () => element("span", "pip", pips));
  const lapLabel = element("span", "hud-num hud-num-small", lapRow);
  const clockRow = element("div", "hud-row", lapBox);
  clockRow.insertAdjacentHTML("beforeend", ICONS.stopwatch);
  const clock = element("span", "hud-num hud-num-big", clockRow);
  const paceLine = element("div", "hud-small", lapBox);

  // Top-right: your place.
  const placeBox = element("div", "hud-corner hud-place", root);
  const placeRow = element("div", "hud-row", placeBox);
  placeRow.insertAdjacentHTML("beforeend", ICONS.medal);
  const placeNum = element("span", "hud-num hud-num-big", placeRow);
  const placeOf = element("span", "hud-num hud-num-of", placeRow);
  const gaps = element("div", "hud-small", placeBox);

  // Bottom-left: conditions, style and cards. Tapping one pops up a small card above them to reread it.
  const tagArea = element("div", "hud-tag-area", root);
  const tags = element("div", "hud-tags", tagArea);
  const peek = element("div", "peek", tagArea);
  peek.hidden = true;
  let tagInfo = []; // what each tag says when you open it
  let peeking = -1; // which tag is open (-1 = none)

  function openPeek(index) {
    const info = tagInfo[index];
    peeking = index;
    peek.className = `peek ${info.className ?? ""}`;
    peek.innerHTML = "";
    const top = element("div", "card-top", peek);
    element("span", "card-type", top, info.chip);
    if (info.badge) element("span", "card-badge", top, info.badge);
    if (info.icon) element("span", "card-icon", top).insertAdjacentHTML("beforeend", ICONS[info.icon]);
    element("div", "peek-name", peek, info.title);
    element("div", "peek-text", peek, info.text);
    element("div", "peek-close", peek, "Tap to close");
    peek.hidden = false;
    [...tags.children].forEach((tag, i) => tag.classList.toggle("open", i === index));
  }
  // Closes the peek. Returns true if it was open (so a tap on the track that closes it isn't also a kick).
  function closePeek() {
    if (peeking < 0) return false;
    peeking = -1;
    peek.hidden = true;
    for (const tag of tags.children) tag.classList.remove("open");
    return true;
  }
  peek.addEventListener("click", closePeek);
  // A tap anywhere else in the race display closes it too.
  window.addEventListener("pointerdown", (event) => {
    if (peeking >= 0 && !tagArea.contains(event.target) && event.target.id !== "scene") closePeek();
  });

  // Bottom-middle: the KICK chip.
  const kickChip = element("div", "kick-chip", root);
  kickChip.insertAdjacentHTML("beforeend", ICONS.shoe);
  element("span", "", kickChip, "KICK!");

  // Bottom-right: the kick button with the stamina ring around it.
  const kick = element("div", "kick", root);
  kick.insertAdjacentHTML(
    "beforeend",
    `<svg class="ring" viewBox="0 0 124 124" aria-hidden="true">
      <circle class="ring-track" cx="62" cy="62" r="${RING_RADIUS}"/>
      <circle class="ring-fill" cx="62" cy="62" r="${RING_RADIUS}" stroke-dasharray="${RING_LENGTH}"/>
      <circle class="ring-lane" cx="62" cy="62" r="${RING_RADIUS - 5.5}"/>
      <circle class="ring-lane" cx="62" cy="62" r="${RING_RADIUS}"/>
      <circle class="ring-lane" cx="62" cy="62" r="${RING_RADIUS + 5.5}"/>
      <rect class="ring-start" x="${62 + RING_RADIUS - 6}" y="61" width="12" height="2.2"/>
    </svg>`,
  );
  const ringFill = kick.querySelector(".ring-fill");
  const kickButton = element("button", "kick-button", kick);
  kickButton.setAttribute("aria-label", "Hold to kick");
  kickButton.insertAdjacentHTML("beforeend", ICONS.shoe);
  const kickLabel = element("span", "kick-label", kickButton);
  const staminaText = element("span", "kick-stamina", kickButton);

  // Above the kick button: switch between the stadium view and the race camera.
  const cameraButton = element("button", "camera-button", root);
  cameraButton.setAttribute("aria-label", "Switch camera (C)");
  cameraButton.title = "Switch camera (C)";
  cameraButton.insertAdjacentHTML("beforeend", ICONS.camera);

  const messages = element("div", "messages", root);

  let paceFuzz = 0; // HotIce: how far off the pace readout is this lap
  let fuzzLap = -1;
  let lastPlace = 0;
  let lapsSeen = 0;
  let tagText = "";

  function update(race) {
    const you = race.player;
    const runner = you.runner;
    const hidden = you.cardFlags.hideStats; // Flow State hides your stats
    const done = you.finishTime !== null;

    // Laps: finished laps are filled in, the current one pulses.
    const lapsDone = you.laps.length;
    const lap = Math.min(lapsDone + 1, tuning.laps);
    pipList.forEach((pip, i) => {
      pip.classList.toggle("done", i < lapsDone);
      pip.classList.toggle("now", !done && i === lapsDone);
    });
    lapLabel.textContent = done ? "FINISHED" : `LAP ${lap}/${tuning.laps}`;
    setDigits(clock, formatTime(done ? you.finishTime : race.time));

    // A lap split pops up as each lap is finished.
    if (lapsDone > lapsSeen) {
      const last = you.laps[lapsDone - 1];
      if (lapsDone < tuning.laps) toast(`Lap ${last.lap}: ${formatTime(last.lapTime)}, ${ordinal(last.position)}`, "info");
      lapsSeen = lapsDone;
    }

    if (fuzzLap !== lapsDone) {
      fuzzLap = lapsDone;
      paceFuzz = (Math.random() * 2 - 1) * HOT_ICE_FUZZ; // screen only, never the race itself
    }
    const clockTime = done ? you.finishTime : race.time; // stop the pace once you've finished
    const projected = you.distance > 50 ? (clockTime / you.distance) * raceMeters() : null;
    paceLine.textContent =
      projected === null
        ? "Pace --"
        : `Pace ${formatTime(projected + (you.cardFlags.paceFuzz ? paceFuzz : 0))}${you.cardFlags.paceFuzz ? " (HotIce: unreliable)" : ""}`;

    // Place: lands with a little bounce when it changes.
    const order = race.standings();
    const place = order.indexOf(you) + 1;
    if (place !== lastPlace) {
      placeNum.textContent = ordinal(place);
      placeOf.textContent = `/${order.length}`;
      if (lastPlace) bump(placeNum);
      lastPlace = place;
    }
    const ahead = order[place - 2];
    const behind = order[place];
    const gap = (other) => `${other.runner.name} ${Math.round(Math.abs(other.distance - you.distance))} m`;
    gaps.textContent = done ? "finished" : [ahead ? `▲ ${gap(ahead)}` : "▲ leading!", behind ? `▼ ${gap(behind)}` : ""].filter(Boolean).join("\n");

    // Tags: only rebuilt when something changes (a card is added mid-race).
    const tagList = [race.condition ? race.condition.name : "No conditions", STYLES[runner.style].name, ...you.cards.map((held) => held.card.name)];
    if (tagList.join("|") !== tagText) {
      tagText = tagList.join("|");
      tagInfo = [
        race.condition
          ? { chip: "Today", title: race.condition.name, text: race.condition.description }
          : { chip: "Today", title: "No conditions", text: "A normal race: nothing special about the weather or the track today." },
        { chip: "Your style", title: STYLES[runner.style].name, text: STYLES[runner.style].description, icon: "shoe" },
        ...you.cards.map(({ card }) => ({
          chip: card.type,
          title: `"${card.name}"`,
          text: card.text,
          icon: TYPE_ICONS[card.type],
          ...cardLook(card),
        })),
      ];
      tags.innerHTML = "";
      tagList.forEach((text, i) => {
        const tag = element("button", i < 2 ? "tag" : "tag tag-card", tags, text);
        tag.addEventListener("click", () => (peeking === i ? closePeek() : openPeek(i)));
      });
      if (peeking >= tagList.length) closePeek();
      else if (peeking >= 0) openPeek(peeking); // keep it open, with the tags rebuilt
    }

    // Kick button and stamina ring.
    const fraction = Math.max(0, Math.min(1, you.stamina / runner.maxStamina));
    const kicking = you.kicking;
    const tired = !kicking && you.stamina <= 0;
    ringFill.style.strokeDashoffset = hidden ? 0 : RING_LENGTH * (1 - fraction);
    kick.classList.toggle("on", kicking);
    kick.classList.toggle("tired", tired && !done);
    kick.classList.toggle("low", !hidden && !done && fraction < LOW_STAMINA);
    kick.classList.toggle("hidden-stat", hidden);
    kickLabel.textContent = done ? "DONE" : tired ? "TIRED" : "KICK";
    staminaText.textContent = hidden ? "??" : `${Math.round(fraction * 100)}%`;
    kickChip.classList.toggle("on", kicking);
    glow.classList.toggle("on", kicking);
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

  // Hide the race display while the menus are up. Showing it again starts fresh for a new race.
  function setVisible(on) {
    root.classList.toggle("off", !on);
    closePeek();
    if (!on) messages.innerHTML = "";
    if (on) {
      lastPlace = 0;
      lapsSeen = 0;
      tagText = "";
    }
  }

  return { update, toast, setVisible, kickButton, cameraButton, closePeek };
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
