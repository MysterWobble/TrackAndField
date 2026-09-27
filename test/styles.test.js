// Automatic checks for the running styles. Run with: npm.cmd test

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRandom } from "../src/random.js";
import { buildRunner } from "../src/runner.js";
import { makeYourRunners } from "../src/field.js";
import { createRace, runSolo } from "../src/race.js";

const stats = { speed: 25, topSpeed: 25, stamina: 25, kick: 25, determination: 0, raceIQ: 25 };
const plain = buildRunner("Plain", stats); // no style, for comparison

test("your 3 runners always have 3 different styles", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const styles = makeYourRunners(createRandom(seed)).map((r) => r.style);
    assert.equal(new Set(styles).size, 3, `seed ${seed}: ${styles}`);
  }
});

test("Pacer: weaker kick, but uses less stamina at normal pace", () => {
  const pacer = buildRunner("Pacer", stats, "pacer");
  assert.ok(Math.abs(pacer.kick - plain.kick * 0.75) < 1e-9);
  const pacerRace = runSolo(pacer, createRandom(1));
  const plainRace = runSolo(plain, createRandom(1));
  assert.ok(pacerRace.staminaLeft > plainRace.staminaLeft + 5, `pacer ${pacerRace.staminaLeft} vs plain ${plainRace.staminaLeft}`);
});

test("Closer: slower early laps, more stamina saved, higher top speed on the last lap", () => {
  const closer = buildRunner("Closer", stats, "closer");
  const closerRace = runSolo(closer, createRandom(1));
  const plainRace = runSolo(plain, createRandom(1));
  assert.ok(closerRace.laps[1].lapTime > plainRace.laps[1].lapTime, "lap 2 should be slower");
  assert.ok(closerRace.laps[2].staminaLeft > plainRace.laps[2].staminaLeft, "more stamina after lap 3");

  // Kick for the whole last lap: the Closer should get past their normal top speed.
  const race = createRace(closer, [], createRandom(1));
  let fastest = 0;
  while (!race.finished) {
    if (race.player.distance >= 1200 && race.player.stamina > 0) race.player.kicking = true;
    race.step();
    fastest = Math.max(fastest, race.player.speed);
  }
  assert.ok(fastest > closer.topSpeed, `fastest ${fastest} vs normal top ${closer.topSpeed}`);
});

test("Front Runner: fast first lap, and more Race IQ means a smaller surge", () => {
  const hothead = runSolo(buildRunner("FR", { ...stats, raceIQ: 0 }, "frontRunner"), createRandom(1));
  const calm = runSolo(buildRunner("FR", { ...stats, raceIQ: 35 }, "frontRunner"), createRandom(1));
  assert.ok(hothead.laps[0].lapTime < hothead.laps[1].lapTime, "lap 1 faster than lap 2");
  assert.ok(hothead.laps[0].lapTime < calm.laps[0].lapTime, "low Race IQ surges harder");
});

test("Front Runner with 0 Race IQ fights back when passed", () => {
  // The Front Runner surges ahead on lap 1, then a much faster runner catches and passes them on lap 2 or 3.
  const frontRunner = buildRunner("FR", { ...stats, speed: 0, raceIQ: 0 }, "frontRunner");
  const faster = buildRunner("Fast", { ...stats, speed: 35, topSpeed: 35, raceIQ: 50 });
  const race = createRace(frontRunner, [faster], createRandom(1));
  while (!race.finished) race.step();
  const chases = race.log.filter((e) => e.type === "chase");
  assert.ok(chases.length > 0 && chases[0].entrant.isPlayer);
});

test("Front Runner with high Race IQ never fights back", () => {
  const frontRunner = buildRunner("FR", { ...stats, speed: 0, raceIQ: 50 }, "frontRunner");
  const race = createRace(frontRunner, [buildRunner("Fast", { ...stats, speed: 35 })], createRandom(1));
  race.player.distance = 30;
  while (!race.finished) race.step();
  assert.equal(race.log.filter((e) => e.type === "chase").length, 0);
});

test("Competitor: faster tucked in behind someone, slower when alone", () => {
  const competitor = buildRunner("Comp", stats, "competitor");
  const alone = runSolo(competitor, createRandom(1));
  const plainAlone = runSolo(plain, createRandom(1));
  assert.ok(alone.laps[1].lapTime > plainAlone.laps[1].lapTime, "alone = -5% speed");

  // Put a steady runner 5 m ahead: the Competitor should run faster than their normal average.
  const race = createRace(competitor, [buildRunner("Steady", { ...stats, speed: 35 })], createRandom(1));
  race.entrants[1].distance = 5;
  for (let i = 0; i < 100; i++) race.step();
  assert.ok(race.player.speed > competitor.averageSpeed, `speed ${race.player.speed} vs average ${competitor.averageSpeed}`);
});
