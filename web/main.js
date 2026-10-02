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
import { CARD_NOTES, HELP_LABELS, STAT_HELP } from "../data/statHelp.js";
import { COLORS } from "./colors.js";
import { buildStadium, stadiumFitPoints } from "./stadium.js";
import { buildCampus, hillTFitPoints } from "./campus.js";
import { createRunnerViews } from "./runners.js";
import { createKickTrail } from "./effects.js";
import { createHud, messageFor } from "./hud.js";
import { TYPE_ICONS } from "./icons.js";
import { createScreens } from "./screens.js";
import { backupCareer, loadCareer, saveCareer } from "./storage.js";

const speedUp = Number(new URLSearchParams(location.search).get("speed")) || 1;

// --- The 3D world ---

// Lighting and atmosphere follow docs/STYLE_GUIDE.md §5.
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); // transparent, so the CSS backdrop shows
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping; // keeps palette hues honest
renderer.shadowMap.enabled = false; // blob shadows only
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // sharp on phones, but not so sharp it gets slow

const scene = new THREE.Scene(); // no scene.background: it would cover the CSS backdrop
scene.fog = new THREE.Fog(COLORS.haze, 280, 650); // the campus and hills fade into warm haze in the distance
scene.add(new THREE.HemisphereLight(0xf3e7cc, 0x8a7a55, 1.5)); // warm sky, olive bounce
const sun = new THREE.DirectionalLight(COLORS.sun, 2.0);
sun.position.set(-1, 1.1, 0.6).multiplyScalar(50); // ~45° up, from the side
scene.add(sun);
const stadium = buildStadium(createRandom(1).next); // the same crowd every time
scene.add(stadium.group);
scene.add(buildCampus(createRandom(2).next)); // the school around the stadium, the same every time

// Two fixed, steep camera views from over the south side:
//   race - the whole stadium just fits, so the runners stay as big as possible.
//   wide - for the menus: pulled back so you can see the campus and the big T on the hill.
// The camera glides between them when a race starts or ends.
const camera = new THREE.PerspectiveCamera(38, 1, 1, 1000);
const FROM_TARGET_TO_CAMERA = new THREE.Vector3(0, 0.6, 0.8).normalize(); // up and toward the viewer, about 37° down
const STADIUM_POINTS = stadiumFitPoints();
const HILL_T_POINTS = hillTFitPoints();
const VIEWS = {
  race: { lookAt: new THREE.Vector3(0, 0, -4), points: STADIUM_POINTS },
  wide: { lookAt: new THREE.Vector3(-40, 0, -20), points: [...STADIUM_POINTS, ...HILL_T_POINTS] }, // nudged toward the hill T
};
for (const view of Object.values(VIEWS)) {
  view.points = view.points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  view.position = new THREE.Vector3();
}
const FIT_MARGIN = 0.97; // keep everything just inside the screen edge
const GLIDE_SECONDS = 1.6;
let viewBlend = 1; // 0 = race view, 1 = wide view
let wideWanted = true;

function placeCamera(position, lookAt) {
  camera.position.copy(position);
  camera.lookAt(lookAt);
  camera.updateMatrixWorld();
}

// Back the camera off until every point of a view fits on screen, whatever shape the screen is.
// (Perspective makes the near edge look wider, so we check real points instead of guessing.)
function fitView(view) {
  const placeAt = (distance) => placeCamera(view.position.copy(view.lookAt).addScaledVector(FROM_TARGET_TO_CAMERA, distance), view.lookAt);
  const fits = () =>
    view.points.every((point) => {
      const p = point.clone().project(camera);
      return Math.abs(p.x) <= FIT_MARGIN && Math.abs(p.y) <= FIT_MARGIN && p.z < 1;
    });
  let near = 40;
  let far = 900;
  for (let i = 0; i < 24; i++) {
    const middle = (near + far) / 2;
    placeAt(middle);
    if (fits()) far = middle;
    else near = middle;
  }
  placeAt(far);
}

function fitCamera() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  fitView(VIEWS.race);
  fitView(VIEWS.wide);
  moveCamera(0);
}

// The race camera: over your runner's right shoulder, a few body-lengths back, looking up the track.
// It follows smoothly (so the bends don't jerk it around), and only during races.
const SHOULDER = {
  back: 11, // meters behind your runner
  up: 9.5, // camera height (your runner is about 6 m tall on screen), high enough to see over the pack
  side: 2.2, // to the right, so you look past your runner's shoulder
  ahead: 22, // looks at a point this far up the track...
  lookHeight: 2, // ...at this height
  fov: 55, // a wider lens up close (the stadium views use 38)
  follow: 6, // how quickly it catches up with your runner (higher = tighter)
  switchSeconds: 0.9,
};
const CAMERA_CHOICE_KEY = "1600m.raceCamera";
let shoulderWanted = false;
try {
  shoulderWanted = localStorage.getItem(CAMERA_CHOICE_KEY) === "shoulder"; // remember the last choice
} catch {
  // storage blocked: just start in the stadium view
}
let followRunner = null; // your runner's view, set when a race starts
let shoulderBlend = 0; // 0 = stadium view, 1 = race camera
let shoulderPlaced = false;
const shoulderPosition = new THREE.Vector3();
const shoulderLookAt = new THREE.Vector3();
const wantPosition = new THREE.Vector3();
const wantLookAt = new THREE.Vector3();

function toggleRaceCamera() {
  shoulderWanted = !shoulderWanted;
  hud.cameraButton.classList.toggle("on", shoulderWanted);
  try {
    localStorage.setItem(CAMERA_CHOICE_KEY, shoulderWanted ? "shoulder" : "stadium");
  } catch {
    // fine: it just won't be remembered
  }
}

// Where the race camera wants to be for your runner right now.
function shoulderTargets(group) {
  const heading = group.rotation.y; // runners face +x, turned by their heading
  const forwardX = Math.cos(heading);
  const forwardZ = -Math.sin(heading);
  const rightX = Math.sin(heading);
  const rightZ = Math.cos(heading);
  const { x, z } = group.position;
  wantPosition.set(x - forwardX * SHOULDER.back + rightX * SHOULDER.side, SHOULDER.up, z - forwardZ * SHOULDER.back + rightZ * SHOULDER.side);
  wantLookAt.set(x + forwardX * SHOULDER.ahead, SHOULDER.lookHeight, z + forwardZ * SHOULDER.ahead);
}

// Glide toward the wanted view (smooth start and stop): the stadium views, blended with the race camera.
const lookAt = new THREE.Vector3();
const position = new THREE.Vector3();
const ease = (t) => t * t * (3 - 2 * t);
function moveCamera(dt) {
  const step = dt / GLIDE_SECONDS;
  viewBlend = wideWanted ? Math.min(1, viewBlend + step) : Math.max(0, viewBlend - step);
  const t = ease(viewBlend);
  position.lerpVectors(VIEWS.race.position, VIEWS.wide.position, t);
  lookAt.lerpVectors(VIEWS.race.lookAt, VIEWS.wide.lookAt, t);

  const shoulderOn = shoulderWanted && !wideWanted && followRunner !== null;
  const shoulderStep = dt / SHOULDER.switchSeconds;
  shoulderBlend = shoulderOn ? Math.min(1, shoulderBlend + shoulderStep) : Math.max(0, shoulderBlend - shoulderStep);
  if (followRunner) {
    shoulderTargets(followRunner.group);
    if (!shoulderPlaced) {
      shoulderPosition.copy(wantPosition);
      shoulderLookAt.copy(wantLookAt);
      shoulderPlaced = true;
    } else {
      const catchUp = 1 - Math.exp(-dt * SHOULDER.follow);
      shoulderPosition.lerp(wantPosition, catchUp);
      shoulderLookAt.lerp(wantLookAt, catchUp);
    }
    if (followRunner.marker) followRunner.marker.visible = shoulderBlend < 0.5; // the arrow over you would block the view
  }
  const s = ease(shoulderBlend);
  if (s > 0) {
    position.lerp(shoulderPosition, s);
    lookAt.lerp(shoulderLookAt, s);
  }
  const fov = 38 + (SHOULDER.fov - 38) * s;
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  placeCamera(position, lookAt);
}

// Menus get the wide view; races get the race view.
function showRace(on) {
  hud.setVisible(on);
  wideWanted = !on;
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

// The explanations behind the ? on cards (data/statHelp.js).
const ALL_STATS_HELP = STAT_NAMES.map((stat) => ({ name: HELP_LABELS[stat], text: STAT_HELP[stat] }));
// What each stat a card or training session touches does. Cards with only special rules explain themselves.
function helpFor(effects = {}, multiply = {}, card = null) {
  const stats = [...new Set([...Object.keys(effects), ...Object.keys(multiply)])].filter((stat) => STAT_HELP[stat]);
  const help = stats.map((stat) => ({ name: HELP_LABELS[stat], text: STAT_HELP[stat] }));
  if (card && effects.speed > 0) help.push({ name: "Note", text: card.freeSpeed ? CARD_NOTES.freeSpeed : CARD_NOTES.pushSpeed });
  return help;
}

// One runner, as a choice card.
function runnerChoice(index) {
  const runner = runnerFromCareer(career, index);
  const best = personalBest(career, { runner: index });
  const rainBest = personalBest(career, { runner: index, rain: true });
  return {
    tag: `Best ${bestText(best)}${rainBest === null ? "" : ` · rain ${formatTime(rainBest)}`}`,
    name: STYLES[runner.style].name,
    icon: "shoe",
    help: ALL_STATS_HELP,
    text: [
      STAT_NAMES.map((stat) => `${STAT_LABELS[stat]} ${runner.points[stat]}`).join(" · "),
      `Average ${formatTime(runner.averagePace)} · Top ${formatTime(runner.topSpeedPace)} · Stamina ${Math.round(runner.maxStamina)}`,
      STYLES[runner.style].description,
    ],
  };
}

// --- Screens ---

async function home() {
  showRace(false);
  const lines = [];
  if (welcome) {
    lines.push({ text: "Welcome! Here's your career. You have 3 runners, and they get better as you train.", tone: "good" });
    welcome = false;
  }
  const stats = [
    { icon: "stopwatch", label: "Personal best", value: bestText(personalBest(career)) },
    { icon: "stopwatch", label: "Rain best", value: bestText(personalBest(career, { rain: true })) },
    { icon: "medal", label: "Races run", value: String(career.races.length) },
    { icon: "dumbbell", label: "Training points", value: String(career.trainingPoints) },
  ];
  if (!saveWorks) lines.push({ text: "This browser isn't letting the game save, so your career will be lost when you close the page.", tone: "bad" });

  const buttons = [{ id: "race", label: "Race", key: "enter", primary: true }];
  if (career.trainingPoints > 0) buttons.push({ id: "train", label: `Train (${career.trainingPoints})`, key: "t" });
  buttons.push({ id: "help", label: "How stats work", key: "s" });
  buttons.push({ id: "new", label: "New career", key: "n" });

  const { button } = await screens.show({ logo: "1600m", lines, stats, buttons });
  if (button === "race") return raceDay();
  if (button === "train") return train();
  if (button === "help") return statsHelp();
  return confirmNewCareer();
}

// What every stat does, from the home screen.
async function statsHelp() {
  await screens.show({
    title: "How stats work",
    lines: [`Every runner has ${tuning.statPointsTotal} stat points spread over 6 stats (up to ${tuning.maxPointsPerStat} each). Training adds more.`],
    glossary: ALL_STATS_HELP,
    buttons: [{ id: "back", label: "Back", key: "escape", primary: true }],
  });
  return home();
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
  followRunner = runnerViews.you; // the race camera follows your runner
  shoulderPlaced = false; // ...starting right behind them, not gliding in from the last race
  lapsOffered = 0;
  logShown = 0;
  tickBank = 0;
  showRace(true);

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
    path: moment, // where you are in the race: the start, or after lap 1-3
    choices: offer.map((card) => ({
      tag: card.type,
      name: `"${card.name}"`,
      text: [card.text],
      icon: TYPE_ICONS[card.type],
      help: helpFor(card.effects, card.multiply, card),
      className: `type-${card.type.toLowerCase()}`,
    })),
  });
  const card = offer[choice];
  const messages = race.pickCard(card, cardRandom(moment + 200)); // its own random numbers (e.g. "people watching" coin flip)
  hud.toast(`"${card.name}"`, "info");
  for (const message of messages) hud.toast(message, "info");
}

// The line under the results badge. The badge already says "New personal best!", so this adds the detail.
// (The terminal version words these differently, in newBestLines.)
function momentBestLine(result, time) {
  const rain = result.rain ? "rain " : "";
  if (result.overall && result.previousOverall === null) return `Your first ${rain}race on record, so it's your ${rain}best.`;
  if (result.overall) return `${(result.previousOverall - time).toFixed(1)}s faster than your old ${rain}best, ${formatTime(result.previousOverall)}.`;
  if (result.runner && result.previousRunner === null) return `This runner's first ${rain}race, so it's their best.`;
  if (result.runner) return `Faster than this runner's old ${rain}best, ${formatTime(result.previousRunner)}.`;
  return `Your ${rain}best is still ${formatTime(result.previousOverall)}.`;
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
  const table = {
    columns: ["", "Runner", "Style", "Time", ""],
    rows: results.map((r) => ({
      you: r.isPlayer,
      rival: r.isRival,
      cells: [
        ordinal(r.place),
        r.isRival ? `${r.name} (rival)` : r.name, // your runner is already called "You"
        STYLES[r.style].name,
        formatTime(r.finishTime),
        r.place === 1 ? "" : `+${(r.finishTime - winner).toFixed(1)}`,
      ],
    })),
  };
  const place = race.positionOf(you);
  const bestLine = momentBestLine(result, you.finishTime);
  const { button } = await screens.show({
    // The Big Moment: confetti for a win or a new personal best.
    moment: {
      place: ordinal(place),
      of: results.length,
      time: you.finishTime,
      badge: result.overall ? "New personal best!" : result.runner ? "Runner best!" : null,
      confetti: place === 1 || result.overall,
    },
    lines: [bestLine, "You earned a training point."],
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
  showRace(false);
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
    choices: offer.map((s) => ({ name: s.name, text: [s.text], icon: "dumbbell", help: helpFor(s.effects) })),
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
  if (event.code === "KeyC" && !event.repeat && race) toggleRaceCamera();
});
hud.cameraButton.addEventListener("click", toggleRaceCamera);
hud.cameraButton.classList.toggle("on", shoulderWanted); // the remembered choice
window.addEventListener("keyup", (event) => {
  if (event.code === "Space" || event.code === "KeyK") setKick(false);
});
hud.kickButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  setKick(true);
});
canvas.addEventListener("pointerdown", () => {
  if (hud.closePeek()) return; // this tap just closes the card peek, it isn't a kick
  setKick(true);
});
window.addEventListener("pointerup", () => setKick(false));
window.addEventListener("pointercancel", () => setKick(false));
window.addEventListener("blur", () => setKick(false)); // switching apps shouldn't leave you kicking forever

// --- Every frame ---

let lastFrame = performance.now();
function frame(now) {
  const realDt = (now - lastFrame) / 1000;
  const dt = Math.min(0.1, realDt); // real seconds since the last frame (capped if the tab was hidden)
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
  stadium.update(now / 1000); // the crowd bobs
  moveCamera(realDt); // not capped: the glide takes the same time even if frames are slow
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

home();
requestAnimationFrame(frame);
