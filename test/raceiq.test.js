// Automatic checks for Race IQ mistakes and settling in. Run with: npm.cmd test

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRandom } from "../src/random.js";
import { buildRunner } from "../src/runner.js";
import { makeField, makeYourRunners } from "../src/field.js";
import { createRace } from "../src/race.js";

const stats = { speed: 25, topSpeed: 25, stamina: 25, kick: 25, determination: 0, raceIQ: 0 };

test("low Race IQ makes the pace wobble, but Pacers and perfect Race IQ stay steady", () => {
  const wobbles = (runner) => {
    const race = createRace(runner, [], createRandom(1));
    for (let i = 0; i < 20; i++) race.step();
    return race.player.wobble;
  };
  assert.notEqual(wobbles(buildRunner("You", stats)), 0);
  assert.equal(wobbles(buildRunner("You", stats, "pacer")), 0);
  assert.equal(wobbles(buildRunner("You", { ...stats, raceIQ: 50 })), 0);
});

test("perfect Race IQ never gets boxed in", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const rng = createRandom(seed);
    const base = makeYourRunners(rng)[0];
    const you = buildRunner("You", { ...base.points, raceIQ: 50 }, base.style);
    const race = createRace(you, makeField(base.points, rng), rng);
    while (!race.finished) race.step();
    assert.equal(race.log.filter((e) => e.type === "boxed" && e.entrant.isPlayer).length, 0);
  }
});

test("after being passed, a runner settles in behind instead of passing straight back (unless fighting back or kicking)", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const rng = createRandom(seed);
    const base = makeYourRunners(rng)[seed % 3];
    const race = createRace(base, makeField(base.points, rng), rng);
    while (!race.finished) race.step();
    const passes = race.log.filter((e) => e.type === "pass");
    for (const pass of passes) {
      const passBack = passes.find(
        (p) => p.entrant === pass.passed && p.passed === pass.entrant && p.time > pass.time && p.time - pass.time < 1,
      );
      if (!passBack) continue;
      // Allowed: a Front Runner fighting back, or a runner who has started their kick.
      const foughtBack = race.log.some(
        (e) => e.type === "chase" && e.entrant === passBack.entrant && e.time >= pass.time - 1e-9 && e.time <= passBack.time,
      );
      const kicking = race.log.some((e) => e.type === "kick" && e.entrant === passBack.entrant && e.time <= passBack.time);
      assert.ok(foughtBack || kicking, `seed ${seed}: passed straight back`);
    }
  }
});

test("over many races, perfect Race IQ finishes faster than 0 Race IQ", () => {
  // Front Runners are left out: for them, Race IQ also shrinks their lap-1 surge, which is a different tradeoff.
  let smart = 0;
  let careless = 0;
  let races = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const base = makeYourRunners(createRandom(seed))[seed % 3];
    if (base.style === "frontRunner") continue;
    races++;
    for (const iq of [0, 50]) {
      const rng = createRandom(seed);
      makeYourRunners(rng); // use up the same random numbers as the line above, so the field matches
      const you = buildRunner("You", { ...base.points, raceIQ: iq }, base.style);
      const race = createRace(you, makeField(base.points, rng), rng);
      while (!race.finished) {
        if (race.player.distance > 1400 && race.player.stamina > 0 && !race.player.kickedOnce) {
          race.player.kicking = true; // kick for the last 200 m, like a player would
          race.player.kickedOnce = true;
        }
        race.step();
      }
      if (iq === 50) smart += race.player.finishTime;
      else careless += race.player.finishTime;
    }
  }
  assert.ok(smart < careless, `perfect IQ avg ${(smart / races).toFixed(1)}s vs 0 IQ avg ${(careless / races).toFixed(1)}s`);
});
