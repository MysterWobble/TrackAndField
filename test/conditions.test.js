// Automatic checks for race conditions. Run with: npm.cmd test

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRandom } from "../src/random.js";
import { addBonuses, buildRunner, withBonuses } from "../src/runner.js";
import { createRace } from "../src/race.js";
import { makeField, makeYourRunners } from "../src/field.js";
import { CONDITIONS } from "../data/conditions.js";
import { tuning } from "../data/tuning.js";

const stats = { speed: 25, topSpeed: 25, stamina: 25, kick: 25, determination: 30, raceIQ: 20 };
const close = (a, b) => Math.abs(a - b) < 1e-9;

// Some checks compare exact stats or speeds, so computer runners' random cards are switched off for them.
function withoutComputerCards(check) {
  const before = tuning.computerRunnersGetCards;
  tuning.computerRunnersGetCards = false;
  try {
    check();
  } finally {
    tuning.computerRunnersGetCards = before;
  }
}

function soloRace(runner, condition) {
  const race = createRace(runner, [], createRandom(1), undefined, condition);
  while (!race.finished) race.step();
  return race;
}

test("bonuses for the same stat add together", () => {
  const total = addBonuses({ speed: 0.1 }, { speed: 0.05, kick: -0.25 });
  assert.ok(close(total.speed, 0.15));
  assert.ok(close(total.kick, -0.25));
  assert.throws(() => addBonuses({ sped: 0.1 }), /Unknown bonus "sped"/);
});

test("Hot Day: stamina drains 10% faster, so you finish with less", () => {
  const runner = buildRunner("You", { ...stats, determination: 0 }); // no lucky stamina boosts blurring the comparison
  const normal = soloRace(runner, null);
  const hot = soloRace(runner, CONDITIONS.hot);
  assert.ok(close(hot.player.runner.drainPerLap, runner.drainPerLap * 1.1));
  assert.ok(hot.player.stamina < normal.player.stamina);
});

test("Windy: faster on the first half of a lap than the second half", () => {
  const race = createRace(buildRunner("You", stats), [], createRandom(1), undefined, CONDITIONS.windy);
  let firstHalfSpeed = 0;
  let secondHalfSpeed = 0;
  while (race.player.distance < 800) {
    race.step();
    if (race.player.distance > 480 && race.player.distance < 580) firstHalfSpeed = race.player.speed;
    if (race.player.distance > 680 && race.player.distance < 780) secondHalfSpeed = race.player.speed;
  }
  assert.ok(firstHalfSpeed > secondHalfSpeed * 1.05, `tailwind ${firstHalfSpeed} vs headwind ${secondHalfSpeed}`);
});

test("Fast Track: Kick +5%, and it adds to the Pacer's -25% (making -20%)", () => {
  const plain = buildRunner("You", stats);
  const pacer = buildRunner("You", stats, "pacer");
  assert.ok(close(withBonuses(plain, CONDITIONS.fastTrack.bonuses).kick, plain.kick * 1.05));
  assert.ok(close(withBonuses(pacer, CONDITIONS.fastTrack.bonuses).kick, plain.kick * 0.8));
});

test("Rivalry Race: everyone gets +10% Determination and one computer runner is your rival", () => {
  withoutComputerCards(() => {
    const rivals = [buildRunner("Maya", stats), buildRunner("Leo", stats)];
    const race = createRace(buildRunner("You", stats), rivals, createRandom(1), undefined, CONDITIONS.rivalry);
    for (const e of race.entrants) assert.ok(close(e.runner.determination, 33));
    assert.ok(race.rival && !race.rival.isPlayer);
    assert.equal(createRace(buildRunner("You", stats), rivals, createRandom(1)).rival, null, "no rival in a normal race");
  });
});

test("Rainy: speed and top speed drop 5% (not 10%), Race IQ goes up 5%", () => {
  const runner = buildRunner("You", stats);
  const wet = withBonuses(runner, CONDITIONS.rain.bonuses);
  assert.ok(close(wet.averageSpeed, runner.averageSpeed * 0.95));
  assert.ok(close(wet.topSpeed, runner.topSpeed * 0.95));
  assert.ok(close(wet.maxStamina, runner.maxStamina * 0.95));
  assert.ok(close(wet.raceIQ, 21));
});

test("Hot Day: the Pacer's stamina saving doubles", () => {
  // Determination off, so a lucky stamina boost can't blur the comparison.
  const pacer = buildRunner("You", { ...stats, determination: 0 }, "pacer");
  const plain = buildRunner("You", { ...stats, determination: 0 });
  const pacerHot = soloRace(pacer, CONDITIONS.hot).player.stamina;
  const plainHot = soloRace(plain, CONDITIONS.hot).player.stamina;
  const pacerNormal = soloRace(pacer, null).player.stamina;
  const plainNormal = soloRace(plain, null).player.stamina;
  assert.ok(pacerHot - plainHot > (pacerNormal - plainNormal) * 1.5, "Pacer's edge should grow on a hot day");
});

test("Fast Track: top speed is 5% higher too", () => {
  const runner = buildRunner("You", stats);
  assert.ok(close(withBonuses(runner, CONDITIONS.fastTrack.bonuses).topSpeed, runner.topSpeed * 1.05));
  assert.ok(close(withBonuses(runner, CONDITIONS.fastTrack.bonuses).averageSpeed, runner.averageSpeed));
});

test("Windy: tucking in behind someone shelters you from the headwind, without passing them", () => {
  withoutComputerCards(() => {
    // Perfect Race IQ, so pace wobble doesn't blur the comparison.
    const leader = buildRunner("Leader", { ...stats, raceIQ: 50 });
    const follower = buildRunner("You", { ...stats, speed: 20, raceIQ: 50 }); // a bit slower than the leader
    const race = createRace(follower, [leader], createRandom(1), undefined, CONDITIONS.windy);
    race.entrants[1].distance = 2; // the leader starts 2 m ahead, so you're tucked in
    const alone = createRace(follower, [], createRandom(1), undefined, CONDITIONS.windy);
    while (race.player.distance < 380) {
      race.step();
      alone.step();
      assert.ok(race.player.distance < race.entrants[1].distance, "shelter should never carry you past the leader");
    }
    assert.ok(race.player.speed > alone.player.speed, "sheltered should be faster than facing the headwind alone");
  });
});

test("Rain is marked for its own personal best", () => {
  assert.equal(CONDITIONS.rain.separatePersonalBest, true);
});

test("no two runners swap places over and over, in any condition", () => {
  for (const condition of [null, ...Object.values(CONDITIONS)]) {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = createRandom(seed);
      const you = makeYourRunners(rng)[seed % 3];
      const race = createRace(you, makeField(you.points, rng), rng, undefined, condition);
      while (!race.finished) race.step();
      const swaps = {};
      for (const pass of race.log.filter((e) => e.type === "pass")) {
        const pair = [pass.entrant.runner.name, pass.passed.runner.name].sort().join(" & ");
        swaps[pair] = (swaps[pair] ?? 0) + 1;
      }
      const most = Math.max(0, ...Object.values(swaps));
      assert.ok(most <= 20, `${condition?.name ?? "no condition"}, seed ${seed}: one pair swapped ${most} times`);
    }
  }
});

test("every condition makes a race that finishes", () => {
  for (const condition of Object.values(CONDITIONS)) {
    const rivals = [buildRunner("Maya", stats, "closer"), buildRunner("Leo", stats, "competitor")];
    const race = createRace(buildRunner("You", stats, "frontRunner"), rivals, createRandom(3), undefined, condition);
    while (!race.finished) race.step();
    assert.equal(race.results().length, 3, condition.name);
  }
});
