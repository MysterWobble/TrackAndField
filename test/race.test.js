// Automatic checks for runner stats and the solo race. Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRandom } from "../src/random.js";
import { buildRunner, randomStatPoints, STAT_NAMES } from "../src/runner.js";
import { runSolo, PLANS } from "../src/race.js";
import { formatTime } from "../src/units.js";

const zeroPoints = { speed: 0, topSpeed: 0, stamina: 0, kick: 0, determination: 0, raceIQ: 0 };

test("formatTime shows race time like 7:15.0", () => {
  assert.equal(formatTime(435), "7:15.0");
  assert.equal(formatTime(405.26), "6:45.3");
  assert.equal(formatTime(59.96), "1:00.0");
});

test("random runners get exactly 150 points, none over 35", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const points = randomStatPoints(createRandom(seed));
    const total = STAT_NAMES.reduce((sum, stat) => sum + points[stat], 0);
    assert.equal(total, 150, `seed ${seed}`);
    for (const stat of STAT_NAMES) assert.ok(points[stat] <= 35, `seed ${seed}: ${stat} = ${points[stat]}`);
  }
});

test("stat points turn into the right paces", () => {
  const runner = buildRunner("Test", { ...zeroPoints, speed: 30, topSpeed: 20 });
  assert.equal(runner.averagePace, 405); // 7:15 - 30s
  assert.equal(runner.topSpeedPace, 325); // 6:15 - 30s - 20s
});

test("a 0-point runner at even pace finishes just over 7:15 with almost no stamina left", () => {
  const result = runSolo(buildRunner("Test", zeroPoints), createRandom(1));
  assert.ok(result.finishTime > 435 && result.finishTime < 437, formatTime(result.finishTime));
  assert.ok(result.staminaLeft < 2, `stamina left ${result.staminaLeft}`);
});

test("each Stamina point leaves about 0.75 spare stamina at even pace", () => {
  const result = runSolo(buildRunner("Test", { ...zeroPoints, stamina: 20 }), createRandom(1));
  assert.ok(result.staminaLeft > 14 && result.staminaLeft < 17, `stamina left ${result.staminaLeft}`);
});

test("sprinting lap 1 runs out of stamina and ends up slower than even pace", () => {
  const runner = buildRunner("Test", { ...zeroPoints, speed: 25, topSpeed: 25, stamina: 25, kick: 25 });
  const even = runSolo(runner, createRandom(1), PLANS.even);
  const fast = runSolo(runner, createRandom(1), PLANS.fastStart);
  assert.equal(even.ranOutAt, null);
  assert.notEqual(fast.ranOutAt, null);
  assert.ok(fast.laps[0].lapTime < even.laps[0].lapTime, "fast start should win lap 1");
  assert.ok(fast.finishTime > even.finishTime, "...but lose the race");
});
