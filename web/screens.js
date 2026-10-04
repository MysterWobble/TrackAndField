// Menu screens (home, runner pick, card picks, results, training). They all use one plain layout:
// a title, some lines of text, choice cards (click, or press 1-3), and buttons (click, or their key).
// Plain for now; step 6 makes them look good.

function element(tag, className, parent, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  parent.appendChild(el);
  return el;
}

const KEY_NAMES = { enter: "Enter", escape: "Esc" };

export function createScreens(root) {
  const overlay = element("div", "overlay hidden", root);

  // Shows a screen and waits for the player. Resolves with { choice: index } or { button: id }.
  //   title    big heading
  //   lines    text lines: "plain text" or { text, tone: "good" | "bad" | "gold" }
  //   table    rows of monospaced text: { text, you }
  //   choices  clickable cards: { tag, name, text: [lines], className }
  //   buttons  { id, label, key, primary }
  function show({ title, lines = [], table = null, choices = [], buttons = [] }) {
    return new Promise((resolve) => {
      overlay.innerHTML = "";
      overlay.classList.remove("hidden");
      if (title) element("h2", null, overlay, title);
      for (const line of lines) {
        const { text, tone } = typeof line === "string" ? { text: line } : line;
        element("div", `note ${tone ?? ""}`, overlay, text);
      }
      if (table) {
        const box = element("div", "results", overlay);
        for (const row of table) element("div", row.you ? "result you" : "result", box, row.text);
      }

      const done = (value) => {
        window.removeEventListener("keydown", onKey);
        overlay.classList.add("hidden");
        resolve(value);
      };

      if (choices.length) {
        const row = element("div", "cards", overlay);
        choices.forEach((choice, i) => {
          const card = element("button", `card ${choice.className ?? ""}`, row);
          element("div", "card-key", card, String(i + 1));
          if (choice.tag) element("div", "card-type", card, choice.tag);
          element("div", "card-name", card, choice.name);
          for (const text of choice.text ?? []) element("div", "card-text", card, text);
          card.addEventListener("click", () => done({ choice: i }));
        });
      }

      if (buttons.length) {
        const row = element("div", "buttons", overlay);
        for (const button of buttons) {
          const key = button.key ? ` (${KEY_NAMES[button.key] ?? button.key.toUpperCase()})` : "";
          const el = element("button", `button ${button.primary ? "primary" : ""}`, row, `${button.label}${key}`);
          el.addEventListener("click", () => done({ button: button.id }));
        }
      }

      const onKey = (event) => {
        const index = Number(event.key) - 1;
        if (index >= 0 && index < choices.length) return done({ choice: index });
        const button = buttons.find((b) => b.key && b.key === event.key.toLowerCase());
        if (button) done({ button: button.id });
      };
      window.addEventListener("keydown", onKey);
    });
  }

  return { show };
}
