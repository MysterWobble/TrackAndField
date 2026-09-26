// The live race view: plays the race out in the terminal and listens for keys.
//
//   K = start kicking / stop kicking
//   Q = quit
//
// About 20 times a second it moves the race forward a few ticks and redraws a small
// status box at the bottom. Things worth keeping (lap splits, passes, kicks, Determination)
// get printed above the box so they stay on screen.

import { tuning } from "../data/tuning.js";
import { formatTime, ordinal, raceMeters } from "./units.js";

const FRAME_MS = 50;
const BOX_LINES = 5;
const PASS_ANNOUNCE_COOLDOWN = 3; // seconds of race time before announcing the same two runners swapping again

// ▕██████░░░░░░▏ style bar. `fraction` is 0 to 1.
function bar(fraction, width = 24) {
  const filled = Math.round(Math.max(0, Math.min(1, fraction)) * width);
  return "▕" + "█".repeat(filled) + "░".repeat(width - filled) + "▏";
}

export function runLive(race) {
  return new Promise((resolve) => {
    const you = race.player;
    const runner = you.runner;
    const out = process.stdout;
    let boxDrawn = false;
    let lapsPrinted = 0;
    let logPrinted = 0;
    let tickBank = 0; // leftover fraction of a tick carried to the next frame
    const lastPassAnnounced = new Map(); // rival -> race time of the last pass announcement

    function neighborsText() {
      const order = race.standings();
      const place = order.indexOf(you);
      const parts = [`Position ${ordinal(place + 1)} of ${order.length}`];
      const ahead = order[place - 1];
      const behind = order[place + 1];
      if (ahead) parts.push(`▲ ${ahead.runner.name} ${Math.round(ahead.distance - you.distance)} m ahead`);
      if (behind) parts.push(`▼ ${behind.runner.name} ${Math.round(you.distance - behind.distance)} m behind`);
      return parts.join("    ");
    }

    function drawBox() {
      const kickText = you.kicking
        ? ">>> KICKING <<<  (press K to ease off)"
        : you.stamina <= 0
          ? "too tired to kick"
          : "press K to kick";
      const lines = [
        `  Lap ${Math.min(Math.floor(you.distance / tuning.lapMeters) + 1, tuning.laps)} of ${tuning.laps}  ${bar(you.distance / raceMeters())}  ${Math.round(you.distance)} m   ${formatTime(race.time)}`,
        `  ${neighborsText()}`,
        `  Speed   ${you.speed.toFixed(2)} mph   (average ${runner.averageSpeed.toFixed(2)} · top ${runner.topSpeed.toFixed(2)})`,
        `  Stamina ${bar(you.stamina / runner.maxStamina)}  ${Math.round(you.stamina)} / ${runner.maxStamina}`,
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

    function announce(event) {
      const name = event.entrant.runner.name;
      const mine = event.entrant === you;
      if (event.type === "pass" && (mine || event.passed === you)) {
        const rival = mine ? event.passed : event.entrant;
        const last = lastPassAnnounced.get(rival);
        if (last !== undefined && event.time - last < PASS_ANNOUNCE_COOLDOWN) return;
        lastPassAnnounced.set(rival, event.time);
        const place = ordinal(race.positionOf(you));
        say(mine ? `  You pass ${rival.runner.name}! Now ${place}.` : `  ${name} passes you. Now ${place}.`);
      } else if (event.type === "kick") {
        say(`  ${name} starts kicking!`);
      } else if (event.type === "ranOut") {
        say(mine ? "  You're out of stamina! Fading..." : `  ${name} is out of stamina!`);
      } else if (event.type === "determination" && mine) {
        say(`  Determination kicks in! +${event.bonus.toFixed(1)} stamina`);
      }
    }

    function printNewThings() {
      while (logPrinted < race.log.length) announce(race.log[logPrinted++]);
      while (lapsPrinted < you.laps.length) {
        const lap = you.laps[lapsPrinted++];
        say(`  Lap ${lap.lap}:  ${formatTime(lap.lapTime)}   (split ${formatTime(lap.split)})   ${ordinal(lap.position)}`);
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
      if (finished) {
        say(`\n  You finish ${ordinal(race.positionOf(you))} in ${formatTime(you.finishTime)}!`);
        while (!race.finished) race.step(); // let everyone else finish instantly
      }
      resolve({ finished });
    }

    function onKey(key) {
      if (key === "k" || key === "K") {
        if (you.stamina > 0) you.kicking = !you.kicking;
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
      tickBank += ((FRAME_MS / 1000) * tuning.liveSpeedup) / tuning.tickSeconds;
      while (tickBank >= 1 && you.finishTime === null) {
        race.step();
        tickBank -= 1;
      }
      printNewThings();
      redraw();
      if (you.finishTime !== null) stop(true);
    }, FRAME_MS);

    say("");
    drawBox();
  });
}
