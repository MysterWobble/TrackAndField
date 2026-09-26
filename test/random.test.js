// Automatic checks for the random helper. Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRandom } from "../src/random.js";

test("same seed gives the same numbers", () => {
  const a = createRandom(42);
  const b = createRandom(42);
  for (let i = 0; i < 100; i++) {
    assert.equal(a.next(), b.next());
  }
});

test("different seeds give different numbers", () => {
  const a = createRandom(1);
  const b = createRandom(2);
  const listA = Array.from({ length: 10 }, () => a.next());
  const listB = Array.from({ length: 10 }, () => b.next());
  assert.notDeepEqual(listA, listB);
});

test("int stays inside its limits and hits both ends", () => {
  const rng = createRandom(7);
  const seen = new Set();
  for (let i = 0; i < 1000; i++) {
    const roll = rng.int(1, 6);
    assert.ok(roll >= 1 && roll <= 6, `rolled ${roll}`);
    seen.add(roll);
  }
  assert.equal(seen.size, 6);
});

test("chance(0.3) is true roughly 30% of the time", () => {
  const rng = createRandom(99);
  let hits = 0;
  for (let i = 0; i < 10000; i++) if (rng.chance(0.3)) hits++;
  assert.ok(hits > 2800 && hits < 3200, `got ${hits} out of 10000`);
});

test("shuffle keeps every item and doesn't change the original", () => {
  const rng = createRandom(5);
  const lanes = [1, 2, 3, 4, 5, 6, 7, 8];
  const shuffled = rng.shuffle(lanes);
  assert.deepEqual([...shuffled].sort(), lanes);
  assert.deepEqual(lanes, [1, 2, 3, 4, 5, 6, 7, 8]);
});
