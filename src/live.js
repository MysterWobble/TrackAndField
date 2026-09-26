// The live race view: plays the race out in the terminal and listens for keys.
//
//   K = start kicking / stop kicking
//   Q = quit
//
// About 20 times a second it moves the race forward a few ticks and redraws a small
// status box at the bottom. Things worth keeping (lap splits, Determination, running out
// of stamina) get printed above the box so they stay on screen.

import { tuning } from "../data/tuning.js";
import { formatTime, raceMeters } from "./units.js";

const FRAME_MS = 50;
const BOX_LINES = 4;

// ▕██████░░░░░░▏ style bar. `fraction` is 0 to 1.
function bar(fraction, width = 24) {
  const filled = Math.round(Math.max(0, Math.min(1, fraction)) * width);
  return "▕" + "█".repeat(filled) + "░".repeat(width - filled) + "▏";
}

export function runLive(race) {
  return new Promise((resolve) => {
    const runner = race.runner;
    const out = process.stdout;
    let boxDrawn = false;
    let lapsPrinted = 0;
    let eventsPrinted = 0;
    let ranOutPrinted = false;
    let tickBank = 0; // leftover fraction of a tick carried to the next frame

    function drawBox() {
      const kickText = race.kicking
        ? ">>> KICKING <<<  (press K to ease off)"
        : race.stamina <= 0
          ? "too tired to kick"
          : "press K to kick";
      const lines = [
        `  Lap ${race.lapIndex() + 1} of ${tuning.laps}  ${bar(race.distance / raceMeters())}  ${Math.round(race.distance)} m   ${formatTime(race.time)}`,
        `  Speed   ${race.speed.toFixed(2)} mph   (average ${runner.averageSpeed.toFixed(2)} · top ${runner.topSpeed.toFixed(2)})`,
        `  Stamina ${bar(race.stamina / runner.maxStamina)}  ${Math.round(race.stamina)} / ${runner.maxStamina}`,
        `  ${kickText}      Q = quit`,
      ];
      out.write(lines.map((line) => "\x1b[2K" + line).join("\n") + "\n");
      boxDrawn = true;
    }

    // Prints a line above the status box so it stays on screen.
    function say(text) {
      if (boxDrawn) out.write(`\x1b[${BOX_LINES}A\x1b[0J`); // move up over the box and erase it
      out.write(text + "\n");
      boxDrawn = false;
    }

    function printNewThings() {
      if (race.ranOutAt !== null && !ranOutPrinted) {
        say(`  Out of stamina at ${Math.round(race.ranOutAt)} m! Fading...`);
        ranOutPrinted = true;
      }
      while (eventsPrinted < race.events.length) {
        const event = race.events[eventsPrinted++];
        say(`  Lap ${event.lap}, ${Math.round(event.distance)} m: Determination kicks in! +${event.bonus.toFixed(1)} stamina`);
      }
      while (lapsPrinted < race.laps.length) {
        const lap = race.laps[lapsPrinted++];
        say(`  Lap ${lap.lap}:  ${formatTime(lap.lapTime)}   (split ${formatTime(lap.split)})`);
      }
    }

    function redraw() {
      if (boxDrawn) out.write(`\x1b[${BOX_LINES}A`);
      drawBox();
    }

    function stop(finished) {
      clearInterval(timer);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onKey);
      resolve({ finished });
    }

    function onKey(key) {
      if (key === "k" || key === "K") {
        if (race.stamina > 0) race.kicking = !race.kicking;
      } else if (key === "q" || key === "Q" || key === "\u0003") {
        // \u0003 is Ctrl+C
        say("\n  Race stopped.");
        stop(false);
      }
    }

    process.stdin.setRawMode(true); // get each key press right away, without waiting for Enter
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", onKey);
    process.stdin.resume();

    const timer = setInterval(() => {
      tickBank += (FRAME_MS / 1000) * tuning.liveSpeedup / tuning.tickSeconds;
      while (tickBank >= 1 && !race.finished) {
        race.step();
        tickBank -= 1;
      }
      printNewThings();
      redraw();
      if (race.finished) stop(true);
    }, FRAME_MS);

    say("");
    drawBox();
  });
}
