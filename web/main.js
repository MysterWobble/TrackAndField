// The browser version of the game: your career, the menus, and the 3D race.
//
//   Home -> today's conditions + pick 1 of your 3 runners -> pick a card -> the race
//   (card picks after laps 1-3) -> results and personal bests -> train with your training point
//
// It uses the exact same race sim and career rules as the terminal version (src/). This file steps
// the sim forward in real time, pauses it for card picks, and draws where everyone is.
// Your career is saved in the browser (web/storage.js), separate from the terminal's save file.
//
// Testing tip: add ?speed=10 to the address to run races 10x faster.

import * as THREE from "three";
import { createRandom, newSeed } from "../src/random.js";
import { makeField } from "../src/field.js";
import { createRace } from "../src/race.js";
import { STAT_LABELS, STAT_NAMES } from "../src/runner.js";
import { formatTime, ordinal } from "../src/units.js";
import {
  applyTraining,
  gainsText,
  newBestLines,
  newCareer,
  offerTraining,
  personalBest,
  recordRace,
  runnerFromCareer,
  trainingRandom,
} from "../src/careerCore.js";
import { CONDITIONS, CONDITION_KEYS } from "../data/conditions.js";
import { STYLES } from "../data/styles.js";
import { tuning } from "../data/tuning.js";
import { COLORS, SHADES } from "./colors.js";
import { buildStadium } from "./stadium.js";
import { createRunnerViews } from "./runners.js";
import { createKickTrail } from "./effects.js";
import { createHud, messageFor } from "./hud.js";
import { createScreens } from "./screens.js";
import { backupCareer, loadCareer, saveCareer } from "./storage.js";

const speedUp = Number(new URLSearchParams(location.search).get("speed")) || 1;

// --- The 3D world ---

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // sharp on phones, but not so sharp it gets slow

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.skyBlue);
scene.fog = new THREE.Fog(COLORS.skyBlue, 260, 520);
scene.add(new THREE.HemisphereLight(0xffffff, SHADES.outerGrass, 1.8));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(40, 100, 60);
scene.add(sun);
scene.add(buildStadium(createRandom(1).next)); // the same crowd and trees every time

// A fixed camera above the main stands, looking down across the whole track (SPEC section 9).
const camera = new THREE.PerspectiveCamera(35, 1, 1, 1000);
const LOOK_AT = new THREE.Vector3(0, 0, 4);
const FROM_TARGET_TO_CAMERA = new THREE.Vector3(0, 0.62, 0.78).normalize(); // up and toward the viewer
const HALF_WIDTH = 98; // meters of track (plus a little stands) that must fit side to side...
const HALF_DEPTH = 58; // ...and front to back

function fitCamera() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  // Back the camera off until the whole track fits, whatever shape the screen is.
  const verticalView = THREE.MathUtils.degToRad(camera.fov);
  const horizontalView = 2 * Math.atan(Math.tan(verticalView / 2) * camera.aspect);
  const distance = Math.max(HALF_WIDTH / Math.tan(horizontalView / 2), HALF_DEPTH / Math.tan(verticalView / 2));
  camera.position.copy(LOOK_AT).addScaledVector(FROM_TARGET_TO_CAMERA, distance);
  camera.lookAt(LOOK_AT);
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", fitCamera);
fitCamera();

const hud = createHud(document.getElementById("hud"));
const screens = createScreens(document.getElementById("screens"));
const trail = createKickTrail(scene);
const runnerLayer = new THREE.Group();
scene.add(runnerLayer);

// --- Your career ---

let career = loadCareer();
let welcome = false;
if (!career) {
  career = newCareer(newSeed());
  welcome = true;
}
let saveWorks = saveCareer(career);

function save() {
  saveWorks = saveCareer(career);
}

const bestText = (time) => (time === null ? "--" : formatTime(time));

// One runner, as a choice card.
function runnerChoice(index) {
  const runner = runnerFromCareer(career, index);
  const best = personalBest(career, { runner: index });
  const rainBest = personalBest(career, { runner: index, rain: true });
  return {
    tag: `Best ${bestText(best)}${rainBest === null ? "" : ` · rain ${formatTime(rainBest)}`}`,
    name: STYLES[runner.style].name,
    text: [
      STAT_NAMES.map((stat) => `${STAT_LABELS[stat]} ${runner.points[stat]}`).join(" · "),
      `Average ${formatTime(runner.averagePace)} · Top ${formatTime(runner.topSpeedPace)} · Stamina ${Math.round(runner.maxStamina)}`,
      STYLES[runner.style].description,
    ],
  };
}

// --- Screens ---

async function home() {
  hud.setVisible(false);
  const lines = [];
  if (welcome) {
    lines.push({ text: "Welcome! Here's your career. You have 3 runners, and they get better as you train.", tone: "good" });
    welcome = false;
  }
  lines.push(`Personal best ${bestText(personalBest(career))} · Rain best ${bestText(personalBest(career, { rain: true }))}`);
  lines.push(`Races run: ${career.races.length} · Training points: ${career.trainingPoints}`);
  if (!saveWorks) lines.push({ text: "This browser isn't letting the game save, so your career will be lost when you close the page.", tone: "bad" });

  const buttons = [{ id: "race", label: "Race", key: "enter", primary: true }];
  if (career.trainingPoints > 0) buttons.push({ id: "train", label: `Train (${career.trainingPoints})`, key: "t" });
  buttons.push({ id: "new", label: "New career", key: "n" });

  const { button } = await screens.show({ title: "1600m", lines, buttons });
  if (button === "race") return raceDay();
  if (button === "train") return train();
  return confirmNewCareer();
}

async function confirmNewCareer() {
  const { button } = await screens.show({
    title: "Start a new career?",
    lines: ["You'll get 3 brand new runners. Your current career is kept as a backup."],
    buttons: [
      { id: "yes", label: "Yes, start over", key: "y" },
      { id: "no", label: "Cancel", key: "escape", primary: true },
    ],
  });
  if (button === "yes") {
    backupCareer();
    career = newCareer(newSeed());
    welcome = true;
    save();
  }
  return home();
}

// Before the race: today's conditions, then pick one of your runners.
async function raceDay() {
  const seed = newSeed();
  const rng = createRandom(seed);
  const conditionKey = rng.pick(CONDITION_KEYS);
  const condition = CONDITIONS[conditionKey];

  const pick = await screens.show({
    title: `Today: ${condition.name}`,
    lines: [condition.description, "Pick your runner:"],
    choices: career.runners.map((_, i) => runnerChoice(i)),
    buttons: [{ id: "back", label: "Back", key: "escape" }],
  });
  if (pick.button) return home();

  const runnerIndex = pick.choice;
  const runner = runnerFromCareer(career, runnerIndex);
  startRace({ seed, rng, runner, runnerIndex, condition, conditionKey });
}

// --- The race ---

let race = null;
let raceInfo = null; // { seed, runnerIndex, conditionKey, condition } for saving the result
let runnerViews = null;
let cardRandom; // card offers get their own random numbers per pick, so a seed always offers the same cards
let state = "menu"; // "menu", "picking" (a card choice is on screen), "running", or "done"
let lapsOffered = 0; // laps we've already paused after for a card pick
let logShown = 0; // race events already turned into pop-up messages
let tickBank = 0; // leftover fraction of a sim tick carried to the next frame

async function startRace({ seed, rng, runner, runnerIndex, condition, conditionKey }) {
  race = createRace(runner, makeField(runner.points, rng), rng, undefined, condition);
  raceInfo = { seed, runnerIndex, conditionKey, condition };
  cardRandom = (moment) => createRandom(seed * 1000 + moment + 7);
  runnerLayer.clear();
  runnerViews = createRunnerViews(race, runnerLayer);
  lapsOffered = 0;
  logShown = 0;
  tickBank = 0;
  hud.setVisible(true);

  state = "picking";
  await pickCard(0);
  state = "running";
}

// Pause and offer cards. moment: 0 = before the race, 1-3 = after that lap.
async function pickCard(moment) {
  const offer = race.offerCards(moment, cardRandom(moment));
  if (!offer.length) return;
  const title = moment === 0 ? "Pick a card before the race" : `Lap ${moment} done, you're ${ordinal(race.positionOf(race.player))}. Pick a card`;
  const { choice } = await screens.show({
    title,
    choices: offer.map((card) => ({ tag: card.type, name: `"${card.name}"`, text: [card.text], className: `type-${card.type.toLowerCase()}` })),
  });
  const card = offer[choice];
  const messages = race.pickCard(card, cardRandom(moment + 200)); // its own random numbers (e.g. "people watching" coin flip)
  hud.toast(`"${card.name}"`, "info");
  for (const message of messages) hud.toast(message, "info");
}

// After the race: save it, show the results and any personal best, then offer training.
async function afterRace() {
  const you = race.player;
  const result = recordRace(career, {
    seed: raceInfo.seed,
    runner: raceInfo.runnerIndex,
    style: you.runner.style,
    condition: raceInfo.conditionKey,
    rain: Boolean(raceInfo.condition?.separatePersonalBest),
    time: you.finishTime,
    place: race.positionOf(you),
    fieldSize: race.entrants.length,
    cards: you.cards.map((held) => held.card.name),
  });
  save();

  const results = race.results();
  const winner = results[0].finishTime;
  const table = results.map((r) => ({
    you: r.isPlayer,
    text: `${ordinal(r.place).padEnd(4)} ${r.name.padEnd(8)} ${STYLES[r.style].name.padEnd(13)} ${formatTime(r.finishTime)}  ${r.place === 1 ? "" : `+${(r.finishTime - winner).toFixed(1)}`}${r.isRival ? "  (rival)" : ""}`,
  }));
  const [bestLine] = newBestLines(result, you.finishTime);
  const { button } = await screens.show({
    title: `You finished ${ordinal(race.positionOf(you))} in ${formatTime(you.finishTime)}`,
    lines: [{ text: bestLine, tone: result.overall ? "gold" : result.runner ? "good" : undefined }, "You earned a training point."],
    table,
    buttons: [
      { id: "train", label: "Train now", key: "t", primary: true },
      { id: "again", label: "Race again", key: "r" },
      { id: "home", label: "Home", key: "h" },
    ],
  });
  state = "menu";
  if (button === "train") return train();
  if (button === "again") return raceDay();
  return home();
}

// --- Training ---

async function train() {
  hud.setVisible(false);
  if (career.trainingPoints < 1) return home();

  const pick = await screens.show({
    title: `Train a runner (${career.trainingPoints} training point${career.trainingPoints === 1 ? "" : "s"})`,
    choices: career.runners.map((_, i) => runnerChoice(i)),
    buttons: [{ id: "later", label: "Save it for later", key: "escape" }],
  });
  if (pick.button) return home();
  const runnerIndex = pick.choice;
  const style = STYLES[career.runners[runnerIndex].style].name;

  const rng = trainingRandom(career);
  const offer = offerTraining(rng);
  const session = await screens.show({
    title: `Training for your ${style}`,
    choices: offer.map((s) => ({ name: s.name, text: [s.text] })),
    buttons: [{ id: "back", label: "Back", key: "escape" }],
  });
  if (session.button) return train();

  const chosen = offer[session.choice];
  const { bonus } = applyTraining(career, runnerIndex, chosen, rng);
  save();
  const lines = [{ text: `Your ${style}: ${gainsText(chosen.effects)}`, tone: "good" }];
  if (bonus) lines.push({ text: `Bonus: +${tuning.trainingDeterminationBonus} Determination!`, tone: "gold" });

  const buttons = [];
  if (career.trainingPoints > 0) buttons.push({ id: "train", label: `Train again (${career.trainingPoints})`, key: "t", primary: true });
  buttons.push({ id: "race", label: "Race", key: "r", primary: career.trainingPoints === 0 });
  buttons.push({ id: "home", label: "Home", key: "h" });
  const { button } = await screens.show({ title: chosen.name, lines, buttons });
  if (button === "train") return train();
  if (button === "race") return raceDay();
  return home();
}

// --- Kicking ---

// Hold to kick: the kick button, Space or K on a keyboard, or holding anywhere on the track.
function setKick(on) {
  if (!race) return;
  const you = race.player;
  you.kicking = on && state === "running" && you.stamina > 0 && you.finishTime === null;
}
window.addEventListener("keydown", (event) => {
  if ((event.code === "Space" || event.code === "KeyK") && !event.repeat) setKick(true);
});
window.addEventListener("keyup", (event) => {
  if (event.code === "Space" || event.code === "KeyK") setKick(false);
});
hud.kickButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  setKick(true);
});
canvas.addEventListener("pointerdown", () => setKick(true));
window.addEventListener("pointerup", () => setKick(false));
window.addEventListener("pointercancel", () => setKick(false));
window.addEventListener("blur", () => setKick(false)); // switching apps shouldn't leave you kicking forever

// --- Every frame ---

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000); // real seconds since the last frame (capped if the tab was hidden)
  lastFrame = now;

  if (race && state === "running") {
    tickBank += (dt * tuning.liveSpeedup * speedUp) / tuning.tickSeconds;
    while (tickBank >= 1 && !race.finished) {
      race.step();
      tickBank -= 1;
      if (race.player.laps.length > lapsOffered) break; // stop right at the lap line
    }

    // Crossed a lap line? Pause for a card pick after laps 1-3.
    if (race.player.laps.length > lapsOffered) {
      lapsOffered = race.player.laps.length;
      tickBank = 0;
      if (lapsOffered < tuning.laps) {
        setKick(false);
        state = "picking";
        pickCard(lapsOffered).then(() => (state = "running"));
      }
    }

    if (race.finished) {
      state = "done";
      afterRace();
    }
  }

  if (race) {
    while (logShown < race.log.length) {
      const message = messageFor(race.log[logShown++], race);
      if (message) hud.toast(...message);
    }
    runnerViews.update(dt, now / 1000);
    trail.update(dt, runnerViews.you.group, race.player.kicking);
    hud.update(race);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

home();
requestAnimationFrame(frame);
