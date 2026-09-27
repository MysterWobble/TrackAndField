// Automatic checks for saving your career, personal bests, and training. Run with: npm.cmd test
// These use a temporary save file, so they never touch your real career.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRandom } from "../src/random.js";
import { totalPoints } from "../src/runner.js";
import {
  applyTraining,
  backupCareer,
  checkTraining,
  loadCareer,
  newCareer,
  offerTraining,
  personalBest,
  recordRace,
  runnerFromCareer,
  saveCareer,
} from "../src/career.js";
import { TRAINING } from "../data/training.js";

const tempSave = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "track-career-")), "career.json");
const race = (time, extra = {}) => ({ seed: 1, runner: 0, style: "pacer", condition: "hot", time, place: 3, fieldSize: 8, cards: [], ...extra });

test("a new career has 3 runners with different styles and 150 points each", () => {
  const career = newCareer(42);
  assert.equal(career.runners.length, 3);
  assert.equal(new Set(career.runners.map((r) => r.style)).size, 3);
  for (const r of career.runners) assert.equal(totalPoints(r.points), 150);
  assert.equal(career.trainingPoints, 0);
});

test("saving and loading gives back the same career", () => {
  const file = tempSave();
  assert.equal(loadCareer(file), null, "no save yet");
  const career = newCareer(7);
  recordRace(career, race(400));
  saveCareer(career, file);
  assert.deepEqual(loadCareer(file), career);
});

test("personal bests: first race counts, slower doesn't, faster does", () => {
  const career = newCareer(1);
  const first = recordRace(career, race(410));
  assert.ok(first.overall && first.previousOverall === null);
  const slower = recordRace(career, race(415));
  assert.equal(slower.overall, false);
  const faster = recordRace(career, race(405));
  assert.ok(faster.overall);
  assert.equal(faster.previousOverall, 410);
  assert.equal(personalBest(career), 405);
});

test("rain has its own personal best", () => {
  const career = newCareer(1);
  recordRace(career, race(400));
  const wet = recordRace(career, race(420, { condition: "rain", rain: true }));
  assert.ok(wet.overall, "first rain race is a rain PB even though it's slower than the dry PB");
  assert.equal(personalBest(career), 400);
  assert.equal(personalBest(career, { rain: true }), 420);
});

test("each runner has their own best too", () => {
  const career = newCareer(1);
  recordRace(career, race(400, { runner: 0 }));
  const other = recordRace(career, race(410, { runner: 2 }));
  assert.equal(other.overall, false);
  assert.equal(other.runner, true, "first race for runner 3 is their best");
  assert.equal(personalBest(career, { runner: 2 }), 410);
});

test("every race earns a training point, and points can be saved up", () => {
  const career = newCareer(1);
  recordRace(career, race(400));
  recordRace(career, race(401));
  assert.equal(career.trainingPoints, 2);
});

test("training spends a point and permanently raises the chosen runner's stats", () => {
  const career = newCareer(3);
  recordRace(career, race(400));
  const before = { ...career.runners[1].points };
  const session = TRAINING.find((s) => s.name === "Mile repeats");
  const { gains } = applyTraining(career, 1, session, createRandom(1));
  assert.equal(career.trainingPoints, 0);
  assert.equal(career.runners[1].points.speed, before.speed + 3);
  assert.equal(career.runners[0].points.speed, newCareer(3).runners[0].points.speed, "other runners unchanged");
  assert.ok(gains.speed === 3);
  assert.throws(() => applyTraining(career, 1, session, createRandom(1)), /No training points/);
});

test("trained runners really are faster", () => {
  const career = newCareer(5);
  const before = runnerFromCareer(career, 0).averagePace;
  for (let i = 0; i < 5; i++) {
    career.trainingPoints++;
    applyTraining(career, 0, TRAINING.find((s) => s.name === "Mile repeats"), createRandom(i));
  }
  assert.ok(runnerFromCareer(career, 0).averagePace < before - 5, "15 Speed points should be over 5 s faster");
});

test("training can push a stat past the starting cap of 35", () => {
  const career = newCareer(5);
  career.runners[0].points.kick = 35;
  career.trainingPoints = 1;
  applyTraining(career, 0, TRAINING.find((s) => s.name === "Track workout"), createRandom(1));
  assert.ok(career.runners[0].points.kick >= 38);
});

test("training sometimes gives a small Determination bonus (about 15% of the time)", () => {
  let bonuses = 0;
  for (let seed = 1; seed <= 1000; seed++) {
    const career = newCareer(1);
    career.trainingPoints = 1;
    if (applyTraining(career, 0, TRAINING[0], createRandom(seed)).bonus) bonuses++;
  }
  assert.ok(bonuses > 110 && bonuses < 190, `${bonuses} bonuses in 1000 sessions`);
});

test("training offers 3 different sessions", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const offer = offerTraining(createRandom(seed));
    assert.equal(offer.length, 3);
    assert.equal(new Set(offer).size, 3);
  }
});

test("starting a new career keeps the old one as a backup", () => {
  const file = tempSave();
  saveCareer(newCareer(9), file);
  const backup = backupCareer(file);
  assert.ok(fs.existsSync(backup));
  assert.equal(fs.existsSync(file), false);
  assert.equal(loadCareer(backup).seed, 9);
});

test("the training file has no mistakes, and the checker explains mistakes", () => {
  assert.deepEqual(checkTraining(TRAINING), []);
  const problems = checkTraining([{ name: "A", text: "x", effects: { sped: 3 }, rarity: "x" }, { name: "A", text: "x", effects: { kick: 1.5 } }]).join("\n");
  assert.match(problems, /Did you mean "speed"/);
  assert.match(problems, /"rarity" isn't a training setting/);
  assert.match(problems, /same name/);
  assert.match(problems, /whole number/);
});
