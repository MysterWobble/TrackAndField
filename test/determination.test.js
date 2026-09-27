// Automatic checks for Determination. Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRandom } from "../src/random.js";
import { buildRunner } from "../src/runner.js";
import { determinationBonus, rollDetermination } from "../src/determination.js";
import { runSolo, PLANS } from "../src/race.js";

const zeroPoints = { speed: 0, topSpeed: 0, stamina: 0, kick: 0, determination: 0, raceIQ: 0 };
// A runner who sprints lap 1 with no spare stamina, so they're guaranteed to run low.
const sprinter = (determination) =>
  buildRunner("Test", { ...zeroPoints, speed: 25, topSpeed: 25, raceIQ: 50, determination });

test("bonus is 5 stamina plus 0.6 per Determination point", () => {
  assert.equal(determinationBonus(buildRunner("Test", zeroPoints)), 5);
  assert.equal(determinationBonus(buildRunner("Test", { ...zeroPoints, determination: 30 })), 23);
});

test("0 Determination never succeeds, 100 or more always does", () => {
  const rng = createRandom(3);
  const never = buildRunner("Test", zeroPoints);
  const always = buildRunner("Test", { ...zeroPoints, determination: 120 });
  for (let i = 0; i < 500; i++) {
    assert.equal(rollDetermination(never, rng), 0);
    assert.ok(rollDetermination(always, rng) > 0);
  }
});

test("Determination succeeds at most once per lap", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const result = runSolo(sprinter(200), createRandom(seed), PLANS.fastStart);
    const laps = result.events.map((event) => event.lap);
    assert.equal(new Set(laps).size, laps.length, `seed ${seed}: laps ${laps}`);
  }
});

test("same seed replays the same Determination rolls", () => {
  const a = runSolo(sprinter(30), createRandom(77), PLANS.fastStart);
  const b = runSolo(sprinter(30), createRandom(77), PLANS.fastStart);
  assert.deepEqual(a.events, b.events);
  assert.equal(a.finishTime, b.finishTime);
});

test("over 20 races, high Determination recovers more often and finishes faster", () => {
  let lowRecoveries = 0;
  let highRecoveries = 0;
  let lowTotalTime = 0;
  let highTotalTime = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const low = runSolo(sprinter(5), createRandom(seed), PLANS.fastStart);
    const high = runSolo(sprinter(35), createRandom(seed), PLANS.fastStart);
    lowRecoveries += low.events.length;
    highRecoveries += high.events.length;
    lowTotalTime += low.finishTime;
    highTotalTime += high.finishTime;
  }
  assert.ok(highRecoveries > lowRecoveries, `high ${highRecoveries} vs low ${lowRecoveries}`);
  assert.ok(highTotalTime < lowTotalTime, "high Determination should be faster on average");
});
