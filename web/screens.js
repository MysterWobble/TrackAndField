// Menu screens (home, runner pick, card picks, results, training), in three layouts:
//   choices  cards laid on the scene, under a title pill (card picks, runner pick, training)
//   moment   the Big Moment card for results: a ribbon, your time counting up, confetti (UI_DIRECTION.md §8)
//   (other)  a navy paper panel with a title, lines, stats, and buttons (home, confirmations)
//
// Choice cards follow docs/UI_DIRECTION.md §5: tap a card to select it (it lifts, the others dim), then
// tap Continue. On a keyboard, press 1-3 to select and Enter (or the same number again) to confirm.

import { tuning } from "../data/tuning.js";
import { formatTime } from "../src/units.js";
import { ICONS } from "./icons.js";

function element(tag, className, parent, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  parent.appendChild(el);
  return el;
}

const KEY_NAMES = { enter: "Enter", escape: "Esc" };

// The run path: Start, then each lap line, then the finish. `at` = how many laps are done.
function runPath(parent, at) {
  const strip = element("div", "run-path", parent);
  const stops = ["Start", ...Array.from({ length: tuning.laps - 1 }, (_, i) => `Lap ${i + 1}`), "Finish"];
  stops.forEach((label, i) => {
    if (i > 0) element("span", `trail ${i <= at ? "done" : ""}`, strip);
    const stop = element("div", `stop ${i < at ? "done" : i === at ? "now" : ""}`, strip);
    const dot = element("span", "dot", stop);
    if (label === "Finish") dot.insertAdjacentHTML("beforeend", ICONS.flag);
    element("span", "stop-label", stop, label);
  });
}

export function createScreens(root) {
  const overlay = element("div", "overlay hidden", root);

  // Shows a screen and waits for the player. Resolves with { choice: index } or { button: id }.
  //   logo     the game's name in big outlined letters (home)
  //   title    big heading
  //   lines    text lines: "plain text" or { text, tone: "good" | "bad" | "gold" }
  //   stats    small tiles: { icon (a key of ICONS), label, value }
  //   glossary explanations: { name, text } (the "How stats work" screen)
  //   path     laps done so far, to show the run path strip (card picks)
  //   table    { columns: [names], rows: [{ cells: [values], you, rival }] }
  //   moment   the results card: { place, of, time, badge, confetti }
  //   choices  cards: { tag, name, text: [lines], icon (a key of ICONS), className, help: [{ name, text }] }
  //            (help adds a ? button that opens an explanation bubble over the card)
  //   buttons  { id, label, key, primary }
  function show({ logo = null, title, lines = [], stats = [], glossary = [], path = null, table = null, choices = [], buttons = [], moment = null }) {
    return new Promise((resolve) => {
      overlay.innerHTML = "";
      overlay.classList.remove("hidden");
      overlay.classList.toggle("dim", !choices.length); // panels get a darker backdrop; cards sit on the scene

      // Where everything goes: straight on the overlay (cards), a paper panel, or the Big Moment card.
      let box = overlay;
      if (moment) box = bigMoment(moment);
      else if (!choices.length) box = element("div", "sheet", overlay);

      if (logo) element("h1", "logo", box, logo);
      if (title) element("h2", null, box, title);
      for (const line of lines) {
        const { text, tone } = typeof line === "string" ? { text: line } : line;
        element("div", `note ${tone ?? ""}`, box, text);
      }
      if (stats.length) {
        const grid = element("div", "stats", box);
        for (const stat of stats) {
          const tile = element("div", "stat", grid);
          if (stat.icon) tile.insertAdjacentHTML("beforeend", ICONS[stat.icon]);
          element("span", "stat-value", tile, stat.value);
          element("span", "stat-label", tile, stat.label);
        }
      }
      if (glossary.length) {
        const list = element("div", "glossary", box);
        for (const entry of glossary) {
          const row = element("div", "glossary-row", list);
          element("div", "glossary-name", row, entry.name);
          element("div", "glossary-text", row, entry.text);
        }
      }
      if (path !== null) runPath(box, path);
      if (table) resultsTable(box, table);

      const done = (value) => {
        window.removeEventListener("keydown", onKey);
        overlay.classList.add("hidden");
        resolve(value);
      };

      // Choice cards: select first, then Continue.
      let selected = -1;
      let cards = [];
      let continueButton = null;
      const select = (index) => {
        selected = index;
        cards.forEach((card, i) => {
          card.classList.toggle("picked", i === index);
          card.setAttribute("aria-pressed", String(i === index));
        });
        cards[0].parentElement.classList.add("has-pick");
        continueButton.disabled = false;
      };
      if (choices.length) {
        const row = element("div", "cards", overlay);
        cards = choices.map((choice, i) => {
          // A div acting as a button, so the ? button can sit inside it.
          const card = element("div", `card ${choice.className ?? ""}`, row);
          card.tabIndex = 0;
          card.setAttribute("role", "button");
          card.style.setProperty("--i", i); // staggers the entrance
          card.setAttribute("aria-pressed", "false");
          const top = element("div", "card-top", card);
          element("span", choice.tag ? "card-type" : "", top, choice.tag ?? "");
          if (choice.help?.length) helpBubble(card, top, choice.help);
          element("span", "card-key", top, String(i + 1)); // painted like a lane number
          if (choice.icon) element("div", "card-icon", card).insertAdjacentHTML("beforeend", ICONS[choice.icon]);
          element("div", "card-name", card, choice.name);
          for (const text of choice.text ?? []) element("div", "card-text", card, text);
          card.addEventListener("click", () => select(i));
          card.addEventListener("keydown", (event) => {
            if (event.key !== " " && event.key !== "Enter") return;
            event.preventDefault();
            event.stopPropagation();
            if (event.key === "Enter" && selected === i) done({ choice: i }); // Enter on the picked card confirms it
            else select(i);
          });
          return card;
        });
      }

      const allButtons = choices.length ? [{ id: "continue", label: "Continue", key: "enter", primary: true }, ...buttons] : buttons;
      if (allButtons.length) {
        const row = element("div", "buttons", box);
        for (const button of allButtons) {
          const key = button.key ? ` (${KEY_NAMES[button.key] ?? button.key.toUpperCase()})` : "";
          const el = element("button", `button ${button.primary ? "primary" : ""}`, row, `${button.label}${key}`);
          if (button.id === "continue") {
            continueButton = el;
            el.disabled = true;
            el.addEventListener("click", () => selected >= 0 && done({ choice: selected }));
          } else {
            el.addEventListener("click", () => done({ button: button.id }));
          }
        }
      }

      const onKey = (event) => {
        const index = Number(event.key) - 1;
        if (index >= 0 && index < choices.length) {
          if (index === selected) return done({ choice: index }); // the same number twice confirms
          return select(index);
        }
        const key = event.key.toLowerCase();
        if (key === "enter" && choices.length) {
          if (selected >= 0) done({ choice: selected });
          return;
        }
        const button = buttons.find((b) => b.key && b.key === key);
        if (button) done({ button: button.id });
      };
      window.addEventListener("keydown", onKey);
    });
  }

  // The Big Moment card: a ribbon with your place, your time counting up and landing with a bounce, an
  // optional gold badge (personal best), and confetti for the best moments.
  function bigMoment({ place, of, time, badge = null, confetti = false }) {
    const card = element("div", "moment", overlay);
    const ribbon = element("div", "ribbon", card);
    ribbon.insertAdjacentHTML(
      "beforeend",
      `<svg viewBox="0 0 300 64" preserveAspectRatio="none" aria-hidden="true">
        <path class="ribbon-tail" d="M0 18 H44 V58 H0 L14 38 Z M300 18 H256 V58 H300 L286 38 Z"/>
        <path class="ribbon-fold" d="M44 50 L60 58 V50 Z M256 50 L240 58 V50 Z"/>
        <rect class="ribbon-band" x="30" y="4" width="240" height="46" rx="6"/>
      </svg>`,
    );
    const label = element("div", "ribbon-text", ribbon);
    element("span", "", label, place);
    element("span", "ribbon-of", label, ` of ${of}`);
    const clock = element("div", "moment-time", card, formatTime(0));
    countUp(clock, time);
    if (badge) {
      const chip = element("div", "moment-badge", card);
      chip.insertAdjacentHTML("beforeend", ICONS.star);
      element("span", "", chip, badge);
    }
    if (confetti && !matchMedia("(prefers-reduced-motion: reduce)").matches) throwConfetti(overlay);
    return card;
  }

  return { show };
}

// The ? button on a card, and the explanation bubble it opens. Tapping either one never picks the card.
function helpBubble(card, top, help) {
  const button = element("span", "card-help-button", top, "?");
  button.setAttribute("role", "button");
  button.setAttribute("aria-label", "What does this do?");
  const bubble = element("div", "card-help", card);
  for (const entry of help) {
    const row = element("div", "card-help-row", bubble);
    if (entry.name) element("b", "", row, `${entry.name}: `);
    element("span", "", row, entry.text);
  }
  element("div", "card-help-close", bubble, "Tap to close");
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    card.classList.toggle("show-help");
  });
  bubble.addEventListener("click", (event) => {
    event.stopPropagation();
    card.classList.remove("show-help");
  });
}

// Counts a time up from zero, then lands it with a small bounce.
function countUp(el, time) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duration = reduced ? 0 : 800;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration || 1);
    const eased = 1 - (1 - t) ** 3;
    el.textContent = formatTime(time * eased);
    if (t < 1) requestAnimationFrame(tick);
    else el.classList.add("landed");
  };
  requestAnimationFrame(tick);
}

// 26 paper pieces in cream, gold, school red and lavender, falling for about 1.2 s (STYLE_GUIDE.md §9).
const CONFETTI_COLORS = ["var(--cream)", "var(--gold)", "var(--track)", "#b39cd0"];
function throwConfetti(parent) {
  const layer = element("div", "confetti", parent);
  for (let i = 0; i < 26; i++) {
    const piece = element("span", "", layer);
    piece.style.left = `${10 + Math.random() * 80}%`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 120}px`);
    piece.style.setProperty("--spin", `${(Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 360)}deg`);
    piece.style.animationDelay = `${Math.random() * 250}ms`;
  }
  setTimeout(() => layer.remove(), 1800);
}

// The results table: one row per runner, yours marked with a You-green bar.
function resultsTable(parent, { columns, rows }) {
  const table = element("table", "results", parent);
  const head = element("tr", "", element("thead", "", table));
  for (const column of columns) element("th", "", head, column);
  const body = element("tbody", "", table);
  for (const row of rows) {
    const tr = element("tr", `${row.you ? "you" : ""} ${row.rival ? "rival" : ""}`, body);
    for (const cell of row.cells) element("td", "", tr, cell);
  }
}
