// The browser version of the game. Step 5 so far: a practice race in 3D, with the race display,
// hold-to-kick, and card picks (before the race and after laps 1-3).
// (Menus for conditions, runner choice, results, training, and saving come in the next part.)
//
// It uses the exact same race sim as the terminal version (src/race.js). This file steps the sim
// forward in real time, pauses it for card picks, and draws where everyone is.

import * as THREE from "three";
import { createRandom, newSeed } from "../src/random.js";
import { makeField, makeYourRunners } from "../src/field.js";
import { createRace } from "../src/race.js";
import { ordinal } from "../src/units.js";
import { CONDITIONS, CONDITION_KEYS } from "../data/conditions.js";
import { tuning } from "../data/tuning.js";
import { COLORS, SHADES } from "./colors.js";
import { buildStadium } from "./stadium.js";
import { createRunnerViews } from "./runners.js";
import { createKickTrail } from "./effects.js";
import { createHud, messageFor } from "./hud.js";

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
const trail = createKickTrail(scene);

// --- The race ---

let race;
let runnerViews;
let cardRandom; // card offers get their own random numbers per pick, so a seed always offers the same cards
let state = "picking"; // "picking" (a card choice is on screen), "running", or "done"
let lapsOffered = 0; // laps we've already paused after for a card pick
let logShown = 0; // race events already turned into pop-up messages
let tickBank = 0; // leftover fraction of a sim tick carried to the next frame
const runnerLayer = new THREE.Group();
scene.add(runnerLayer);

async function startRace() {
  const seed = newSeed();
  const rng = createRandom(seed);
  const runner = makeYourRunners(rng)[0];
  const condition = CONDITIONS[rng.pick(CONDITION_KEYS)];
  race = createRace(runner, makeField(runner.points, rng), rng, undefined, condition);
  cardRandom = (moment) => createRandom(seed * 1000 + moment + 7);
  runnerLayer.clear();
  runnerViews = createRunnerViews(race, runnerLayer);
  lapsOffered = 0;
  logShown = 0;
  tickBank = 0;

  state = "picking";
  await pickCard(0);
  state = "running";
}

// Pause and offer cards. moment: 0 = before the race, 1-3 = after that lap.
async function pickCard(moment) {
  const offer = race.offerCards(moment, cardRandom(moment));
  if (!offer.length) return;
  const heading = moment === 0 ? "Pick a card before the race" : `Lap ${moment} done, you're ${ordinal(race.positionOf(race.player))}. Pick a card`;
  const index = await hud.showCards(offer, heading);
  const card = offer[index];
  const messages = race.pickCard(card, cardRandom(moment + 200)); // its own random numbers (e.g. "people watching" coin flip)
  hud.toast(`"${card.name}"`, "info");
  for (const message of messages) hud.toast(message, "info");
}

// Hold to kick: the kick button, Space or K on a keyboard, or holding anywhere on the track.
function setKick(on) {
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

  if (state === "running") {
    tickBank += (dt * tuning.liveSpeedup) / tuning.tickSeconds;
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
      hud.showResults(race, startRace);
    }
  }

  while (logShown < race.log.length) {
    const message = messageFor(race.log[logShown++], race);
    if (message) hud.toast(...message);
  }

  runnerViews.update(dt, now / 1000);
  trail.update(dt, runnerViews.you.group, race.player.kicking);
  hud.update(race);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

startRace();
requestAnimationFrame(frame);
