// Automatic checks for racing against the computer runners. Run with: npm.cmd test

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRandom } from "../src/random.js";
import { buildRunner, randomStatPoints, totalPoints } from "../src/runner.js";
import { makeField } from "../src/field.js";
import { createRace, runSolo } from "../src/race.js";

const zeroPoints = { speed: 0, topSpeed: 0, stamina: 0, kick: 0, determination: 0, raceIQ: 0 };
const even25 = { speed: 25, topSpeed: 25, stamina: 25, kick: 25, determination: 25, raceIQ: 25 };

function runFullRace(seed) {
  const rng = createRandom(seed);
  const points = randomStatPoints(rng);
  const race = createRace(buildRunner("You", points), makeField(points, rng), rng);
  while (!race.finished) race.step();
  return race;
}

test("the field has 7 runners with different names, 1-2 of them stronger than you", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const rng = createRandom(seed);
    const points = randomStatPoints(rng);
    const field = makeField(points, rng);
    assert.equal(field.length, 7);
    assert.equal(new Set(field.map((r) => r.name)).size, 7);
    const stronger = field.filter((r) => totalPoints(r.points) > totalPoints(points)).length;
    assert.ok(stronger >= 1 && stronger <= 2, `seed ${seed}: ${stronger} stronger runners`);
  }
});

test("everyone finishes and results are in time order", () => {
  const results = runFullRace(12345).results();
  assert.equal(results.length, 8);
  assert.equal(results.filter((r) => r.isPlayer).length, 1);
  for (let i = 1; i < results.length; i++) {
    assert.ok(results[i].finishTime >= results[i - 1].finishTime);
    assert.equal(results[i].place, i + 1);
  }
});

test("same seed gives the same race", () => {
  assert.deepEqual(runFullRace(4242).results(), runFullRace(4242).results());
});

test("running right behind someone (drafting) saves a little stamina", () => {
  const you = buildRunner("You", even25);
  const solo = createRace(you, [], createRandom(1));
  const drafting = createRace(you, [buildRunner("Pacer", even25)], createRandom(1));
  drafting.entrants[1].distance = 1; // the other runner starts 1 m ahead, so you tuck in behind
  for (let i = 0; i < 600; i++) {
    solo.step();
    drafting.step();
  }
  const saved = drafting.player.stamina - solo.player.stamina;
  assert.ok(saved > 0 && saved < 3, `saved ${saved} stamina in 60 seconds`);
});

test("a faster runner passing you shows up as a pass", () => {
  const race = createRace(buildRunner("You", zeroPoints), [buildRunner("Speedy", { ...zeroPoints, speed: 35 })], createRandom(1));
  race.player.distance = 50; // give yourself a head start so Speedy has to pass you
  while (!race.finished) race.step();
  const passes = race.log.filter((event) => event.type === "pass");
  assert.ok(passes.some((p) => p.entrant.runner.name === "Speedy" && p.passed.isPlayer));
  assert.equal(race.results()[0].name, "Speedy");
});

test("computer runners kick once, on the last lap", () => {
  const race = runFullRace(777);
  const kicks = race.log.filter((event) => event.type === "kick");
  assert.ok(kicks.length > 0);
  for (const kick of kicks) {
    assert.ok(!kick.entrant.isPlayer);
    assert.ok(kick.distance >= 1200, `kicked at ${kick.distance} m`);
  }
  assert.equal(new Set(kicks.map((k) => k.entrant)).size, kicks.length, "nobody kicks twice");
});

test("smart computer runners time their kick better than careless ones", () => {
  const stats = { ...even25, determination: 0 };
  let smartTotal = 0;
  let carelessTotal = 0;
  for (let seed = 1; seed <= 40; seed++) {
    // A runner with no player to race: we just want each computer runner's own time.
    const smart = createRace(buildRunner("x", zeroPoints), [buildRunner("Smart", { ...stats, raceIQ: 50 })], createRandom(seed));
    const careless = createRace(buildRunner("x", zeroPoints), [buildRunner("Careless", { ...stats, raceIQ: 0 })], createRandom(seed));
    while (!smart.finished) smart.step();
    while (!careless.finished) careless.step();
    smartTotal += smart.entrants[1].finishTime;
    carelessTotal += careless.entrants[1].finishTime;
  }
  assert.ok(smartTotal < carelessTotal, `smart avg ${smartTotal / 40} vs careless avg ${carelessTotal / 40}`);
});

test("a solo race still works the same way", () => {
  const result = runSolo(buildRunner("Test", zeroPoints), createRandom(1));
  assert.ok(result.finishTime > 435 && result.finishTime < 437);
});
