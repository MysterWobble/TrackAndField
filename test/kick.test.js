// Automatic checks for kicking (what the K key does in the live race). Run with: npm.cmd test

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRandom } from "../src/random.js";
import { buildRunner } from "../src/runner.js";
import { createRace, runSolo } from "../src/race.js";

const runner = buildRunner("Test", { speed: 25, topSpeed: 25, stamina: 25, kick: 25, determination: 0, raceIQ: 50 });

// Runs a solo race, turning kick on once the runner passes `kickFromMeters`.
function raceWithKick(kickFromMeters) {
  const race = createRace(runner, [], createRandom(1));
  const you = race.player;
  while (!race.finished) {
    if (you.distance >= kickFromMeters && you.stamina > 0) you.kicking = true;
    race.step();
  }
  return you;
}

test("kicking for the last 150 m beats even pace", () => {
  const even = runSolo(runner, createRandom(1));
  const kicked = raceWithKick(1450);
  assert.equal(kicked.ranOutAt, null, "should have enough stamina for a short kick");
  assert.ok(kicked.finishTime < even.finishTime, `kick ${kicked.finishTime} vs even ${even.finishTime}`);
});

test("kicking for the last 1000 m runs out of stamina and loses to even pace", () => {
  const even = runSolo(runner, createRandom(1));
  const kicked = raceWithKick(600);
  assert.notEqual(kicked.ranOutAt, null);
  assert.ok(kicked.finishTime > even.finishTime);
});

test("kick turns itself off when stamina runs out", () => {
  const race = createRace(runner, [], createRandom(1));
  race.player.kicking = true;
  while (race.player.stamina > 0) race.step();
  assert.equal(race.player.kicking, false);
});

test("kicking speeds up at the Kick rate, not instantly", () => {
  const race = createRace(runner, [], createRandom(1));
  const you = race.player;
  while (you.speed < runner.averageSpeed) race.step(); // get up to pace first
  you.kicking = true;
  race.step();
  const gainedInOneTick = you.speed - runner.averageSpeed;
  assert.ok(gainedInOneTick <= runner.kick * 0.1 + 1e-9, `gained ${gainedInOneTick} mph in one tick`);
  assert.ok(you.speed < runner.topSpeed);
});
