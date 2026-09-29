// Automatic checks for cards. Run with: npm.cmd test

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRandom } from "../src/random.js";
import { buildRunner } from "../src/runner.js";
import { createRace } from "../src/race.js";
import { makeField, makeYourRunners } from "../src/field.js";
import { checkCards } from "../src/checkCards.js";
import { momentsFor } from "../src/cards.js";
import { CARDS } from "../data/cards.js";
import { CONDITIONS } from "../data/conditions.js";

const steady = { speed: 25, topSpeed: 25, stamina: 25, kick: 25, determination: 30, raceIQ: 50 };
const card = (name) => CARDS.find((c) => c.name === name);
const close = (a, b, tolerance = 1e-9) => Math.abs(a - b) < tolerance;

// A solo race where you pick `names` before the start.
function soloWith(names, stats = steady, condition = null) {
  const race = createRace(buildRunner("You", stats), [], createRandom(1), undefined, condition);
  for (const name of names) race.pickCard(card(name), createRandom(2));
  return race;
}
const finish = (race) => {
  while (!race.finished) race.step();
  return race.player;
};

test("the card file has no mistakes", () => {
  assert.deepEqual(checkCards(CARDS), []);
});

test("the card checker explains mistakes in plain English", () => {
  const problems = checkCards([
    { name: "A", type: "Prep", when: "after lap 4", text: "x", effects: { sped: 10 }, rarity: "rare" },
    { name: "A", type: "Push", when: "pre-race", text: "x", special: "hotIc" },
  ]);
  const all = problems.join("\n");
  assert.match(all, /"rarity" isn't a card setting/);
  assert.match(all, /Did you mean "Preparation"/);
  assert.match(all, /Did you mean "after lap 3"/);
  assert.match(all, /Did you mean "speed"/);
  assert.match(all, /same name as card 1/);
  assert.match(all, /Did you mean "hotIce"/);
});

test("offers: up to 3 different cards that fit the moment, never one you already have", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const rng = createRandom(seed);
    const you = makeYourRunners(rng)[0];
    const race = createRace(you, makeField(you.points, rng), rng);
    for (const moment of [0, 1, 2, 3]) {
      while (race.player.laps.length < moment) race.step();
      const offer = race.offerCards(moment, createRandom(seed * 10 + moment));
      assert.ok(offer.length >= 1 && offer.length <= 3);
      assert.equal(new Set(offer).size, offer.length);
      for (const c of offer) {
        assert.ok(momentsFor(c.when).includes(moment), `${c.name} offered at moment ${moment}`);
        assert.ok(!race.player.cards.some((held) => held.card === c), "already held");
        if (c.rivalryOnly) assert.fail("rivalry card offered outside a Rivalry Race");
      }
      race.pickCard(offer[0], createRandom(1));
    }
  }
});

test("offers are the same for the same seed and moment (fair Daily Race)", () => {
  const make = () => {
    const rng = createRandom(9);
    const you = makeYourRunners(rng)[0];
    return createRace(you, makeField(you.points, rng), rng);
  };
  assert.deepEqual(make().offerCards(0, createRandom(5)), make().offerCards(0, createRandom(5)));
});

test("card speed costs stamina, but the new shoes' speed is free", () => {
  const noLuck = { ...steady, determination: 0 }; // no lucky stamina boosts blurring the comparison
  const plain = finish(soloWith([], noLuck));
  const pushed = finish(soloWith(["Remember your pace in the last race!"], noLuck));
  const shoes = finish(soloWith(["Put these on quick"], noLuck));
  assert.ok(pushed.finishTime < plain.finishTime - 8, "+20 Speed should be much faster");
  assert.ok(pushed.stamina < plain.stamina - 1, "...but use more stamina");
  assert.ok(close(shoes.finishTime, pushed.finishTime, 3), "shoes: about as fast");
  assert.ok(close(shoes.stamina, plain.stamina, 0.5), "...without the extra stamina cost");
});

test("simple stat cards change the right stats", () => {
  const base = buildRunner("You", steady);
  const race = soloWith(["Tuck in your arms, don't bob your head", "Coach Pep-Talk"]);
  race.step();
  assert.ok(close(race.player.runner.raceIQ, base.raceIQ + 10), "+10 Race IQ points");
  assert.ok(close(race.player.runner.maxStamina, base.maxStamina + 10 * 1.25), "+10 Stamina points");
});

test("You gotta keep up with that guy!: only for 4th or worse, and ends after two passes", () => {
  const rng = createRandom(3);
  const race = createRace(buildRunner("You", steady), [], rng);
  assert.equal(race.offerCards(1, createRandom(1)).some((c) => c.name === "You gotta keep up with that guy!"), false);
  race.pickCard(card("You gotta keep up with that guy!"), rng);
  race.step();
  assert.ok(race.player.runner.bonuses.pushSpeed > 0.02);
  const fakePass = () => race.log.push({ type: "pass", entrant: race.player, passed: {}, time: race.time });
  fakePass();
  race.step();
  assert.ok(race.player.runner.bonuses.pushSpeed > 0.02, "still on after one pass");
  fakePass();
  race.step();
  assert.equal(race.player.runner.bonuses.pushSpeed, 0, "off after two passes");
});

test("Remember why you do this!: double Determination until it gives you stamina", () => {
  const race = soloWith(["Remember why you do this!"]);
  race.step();
  assert.ok(close(race.player.runner.determination, 60));
  race.player.events.push({ type: "determination", time: race.time });
  race.step();
  assert.ok(close(race.player.runner.determination, 30));
});

test("You've got people watching you!: +50% half the time, nothing or -30% the rest", () => {
  const outcomes = { 45: 0, 30: 0, 21: 0 };
  for (let seed = 1; seed <= 400; seed++) {
    const race = createRace(buildRunner("You", steady), [], createRandom(1));
    race.pickCard(card("You've got people watching you!"), createRandom(seed));
    race.step();
    outcomes[Math.round(race.player.runner.determination)]++;
  }
  assert.ok(outcomes[45] > 160 && outcomes[45] < 240, JSON.stringify(outcomes));
  assert.ok(outcomes[30] > 60 && outcomes[21] > 60, JSON.stringify(outcomes));
});

test("I won't stop here: you fall, double Determination, and -10% Stamina/Kick/Race IQ after other cards", () => {
  const base = buildRunner("You", steady);
  const race = soloWith(["Coach Pep-Talk", "I won't stop here"]);
  race.step();
  assert.equal(race.player.speed, 0, "on the ground");
  assert.ok(close(race.player.runner.determination, 60));
  assert.ok(close(race.player.runner.maxStamina, (base.maxStamina + 10 * 1.25) * 0.9), "stamina: +10 from Coach, then -10%");
  assert.ok(close(race.player.runner.raceIQ, base.raceIQ * 0.9));
  assert.ok(close(race.player.runner.averageSpeed, buildRunner("You", { ...steady, speed: steady.speed }).averageSpeed * (1 + race.player.runner.bonuses.pushSpeed)), "speed isn't cut");
  const fell = finish(race);
  const stood = finish(soloWith(["Coach Pep-Talk"]));
  assert.ok(fell.finishTime > stood.finishTime + 1, "falling costs time");
});

test("You're losing your form!: Race IQ goes back to base +5, ignoring other Race IQ cards", () => {
  const race = soloWith(["Don't focus on the pain!", "You're losing your form!"]);
  race.step();
  assert.ok(close(race.player.runner.raceIQ, 50 + 5));
});

test("You're our scorer! and state: Determination changes as you pass and get passed", () => {
  const race = soloWith(["You're our scorer!", "If you win here we will make it to state!"]);
  race.step();
  assert.ok(close(race.player.runner.determination, 30 + 25));
  race.log.push({ type: "pass", entrant: race.player, passed: {}, time: race.time });
  race.log.push({ type: "pass", entrant: {}, passed: race.player, time: race.time });
  race.log.push({ type: "pass", entrant: {}, passed: race.player, time: race.time });
  race.step();
  assert.ok(close(race.player.runner.determination, 30 + 25 + 5 - 10));
});

test("Team Pep-Talk: +10 Determination on every lap, without building up", () => {
  const race = soloWith(["Team Pep-Talk"]);
  race.step();
  assert.ok(close(race.player.runner.determination, 40), "+10 on lap 1");
  while (race.player.laps.length < 3) race.step();
  race.step();
  assert.ok(close(race.player.runner.determination, 40), "still +10 on lap 4");
});

test("I want you on his back!: rivalry only, matches the runner ahead past your top speed, ends at 0 stamina", () => {
  const you = buildRunner("You", { ...steady, speed: 0, topSpeed: 0 });
  const fast = buildRunner("Fast", { ...steady, speed: 35, topSpeed: 35 });
  const plain = createRace(you, [fast], createRandom(1));
  assert.equal(plain.offerCards(1, createRandom(1)).some((c) => c.rivalryOnly), false);

  const race = createRace(you, [fast], createRandom(1), undefined, CONDITIONS.rivalry);
  race.entrants[1].distance = 1;
  race.pickCard(card("I want you on his back!"), createRandom(1));
  race.entrants[1].kicking = true; // the runner ahead sprints
  let fastest = 0;
  while (race.player.stamina > 0) {
    race.step();
    fastest = Math.max(fastest, race.player.speed);
  }
  assert.ok(fastest > you.topSpeed, `matched ${fastest} vs own top ${you.topSpeed}`);
  race.step();
  assert.equal(race.player.cardFlags.matchRunnerAhead, false, "over once stamina runs out");
});

test("I want you on his back! is never offered in 1st (there's nobody ahead to follow)", () => {
  const you = buildRunner("You", steady);
  const slow = buildRunner("Slow", { ...steady, speed: 0 });
  const race = createRace(you, [slow], createRandom(1), undefined, CONDITIONS.rivalry);
  while (race.player.laps.length < 1) race.step();
  assert.equal(race.positionOf(race.player), 1);
  for (let seed = 1; seed <= 50; seed++) {
    assert.equal(race.offerCards(1, createRandom(seed)).some((c) => c.name === "I want you on his back!"), false);
  }
});

test("Flow State needs the same position for two laps; it hides your stats", () => {
  const race = soloWith(["Flow State"]);
  race.step();
  assert.equal(race.player.cardFlags.hideStats, true);
  assert.equal(race.offerCards(2, createRandom(1)).some((c) => c.name === "Flow State"), false, "solo = 1st, too high");
});

test("He thinks he can beat you!: gives you two more cards, never rivalry or unique", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const race = createRace(buildRunner("You", steady), [], createRandom(1));
    while (race.player.laps.length < 1) race.step();
    const messages = race.pickCard(card("He thinks he can beat you!"), createRandom(seed));
    assert.equal(race.player.cards.length, 3);
    for (const held of race.player.cards.slice(1)) {
      assert.ok(held.card.type !== "Unique" && !held.card.rivalryOnly, held.card.name);
    }
    assert.match(messages.join(" "), /You also get/);
  }
});

test("HotIce: stamina drains 20% slower", () => {
  const base = buildRunner("You", steady);
  const race = soloWith(["Could I get some of that?"]);
  race.step();
  assert.ok(close(race.player.runner.drainPerLap, base.drainPerLap * 0.8));
  assert.equal(race.player.cardFlags.paceFuzz, true);
});

test("Less than a lap left! only shows up after lap 3", () => {
  assert.deepEqual(momentsFor(card("Less than a lap left!").when), [3]);
});
