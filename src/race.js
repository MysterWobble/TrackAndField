// The race loop: you plus the computer runners, all on the track together.
//
// The sim works like a flip-book. Every tick (0.1 seconds), for each runner, it:
//   1. decides how fast they want to go (running style, kicking, Front Runners fighting back),
//   2. speeds them up or slows them down toward that,
//   3. moves them forward and takes away stamina (a little less if drafting),
//   4. rolls for Determination if stamina is low,
//   5. writes down a split whenever they cross a lap line.
// Then it checks who passed whom.
//
// createRace() makes a race you can step through one tick at a time (the live view does this,
// so it can draw the screen and listen for the K key between ticks).
// runSolo() races one runner alone, instantly. Handy for tests and tuning.

import { tuning } from "../data/tuning.js";
import { mphToMetersPerSecond, raceMeters } from "./units.js";
import { staminaUsed } from "./stamina.js";
import { rollDetermination } from "./determination.js";
import { planFor, speedBonuses, staminaFactor, wantsToChase, CHASE } from "./styles.js";
import { STYLES } from "../data/styles.js";
import { withBonuses } from "./runner.js";

// A pace plan says how hard to run each lap: 0 = average pace, 1 = top speed, 0.5 = halfway between.
export const PLANS = {
  even: { label: "even pace", effort: [0, 0, 0, 0] },
  fastStart: { label: "sprint lap 1 at top speed", effort: [1, 0, 0, 0] },
};

function lapOf(distance) {
  return Math.min(Math.floor(distance / tuning.lapMeters), tuning.laps - 1);
}

// How far off a computer runner's kick timing can be. Race IQ makes it more accurate.
function kickMisjudge(runner) {
  return tuning.computerKickMisjudge * Math.max(0, 1 - runner.raceIQ / tuning.perfectKickRaceIQ);
}

function createEntrant(runner, isPlayer, plan, rng) {
  return {
    runner,
    isPlayer,
    plan,
    distance: 0,
    speed: 0, // standing start
    stamina: runner.maxStamina,
    kicking: false,
    hasKicked: false, // computer runners only kick once
    chasing: null, // a Front Runner fighting to get a position back: { target, until }
    noChaseUntil: 0, // race time before which a Front Runner won't fight back again
    kickTiming: isPlayer ? 0 : rng.range(-1, 1) * kickMisjudge(runner), // + means they'll go too early
    reachedPace: false, // true once they first get up to average pace
    nextRollIn: 0, // seconds until the next Determination roll
    lastSuccessLap: null, // Determination can only succeed once per lap
    ranOutAt: null, // meters where stamina first hit 0
    finishTime: null,
    laps: [],
    events: [], // this runner's Determination successes
  };
}

// `condition` is one entry from data/conditions.js (or null for a plain race).
export function createRace(player, rivals, rng, plan = PLANS.even, condition = null) {
  const dt = tuning.tickSeconds;
  const finishLine = raceMeters();
  // Race conditions affect everyone, so every runner gets the condition's bonuses.
  const applyCondition = (runner) => (condition?.bonuses ? withBonuses(runner, condition.bonuses) : runner);
  const entrants = [
    createEntrant(applyCondition(player), true, plan, rng),
    ...rivals.map((runner) => createEntrant(applyCondition(runner), false, PLANS.even, rng)),
  ];

  // Windy: tailwind on the first half of each lap, headwind on the second half.
  function windAt(distance) {
    if (!condition?.wind) return 0;
    return distance % tuning.lapMeters < tuning.lapMeters / 2 ? condition.wind : -condition.wind;
  }

  // Who's ahead? Finished runners rank by finish time, everyone else by distance.
  function rankKey(entrant) {
    return entrant.finishTime !== null ? 1e9 - entrant.finishTime : entrant.distance;
  }

  // Is runner i ahead of runner j? If they're exactly level, the lower lane (earlier in the list) counts as ahead.
  function isAhead(keys, i, j) {
    return keys[i] > keys[j] || (keys[i] === keys[j] && i < j);
  }

  // The nearest runner ahead, as a list position (using where everyone was at the start of this tick).
  function nearestAhead(index, startDistances) {
    let nearest = null;
    startDistances.forEach((distance, j) => {
      const ahead = distance - startDistances[index];
      if (j !== index && entrants[j].finishTime === null && ahead > 0) {
        if (nearest === null || distance < startDistances[nearest]) nearest = j;
      }
    });
    return nearest;
  }

  // Meters to the nearest runner behind.
  function gapBehind(index, startDistances) {
    let gap = null;
    startDistances.forEach((distance, j) => {
      const behind = startDistances[index] - distance;
      if (j !== index && entrants[j].finishTime === null && behind >= 0 && (gap === null || behind < gap)) gap = behind;
    });
    return gap;
  }

  function moveEntrant(e, index, startDistances) {
    const runner = e.runner;
    const lapIndex = lapOf(e.distance);

    // 1. How fast do they want to go?
    if (!e.isPlayer && lapIndex === tuning.laps - 1 && !e.hasKicked && e.stamina > 0) {
      // Computer kick: go once the finish is about as far as their stamina can sprint.
      const drainPerMeterAtTop = (runner.drainPerLap / tuning.lapMeters) * tuning.drainMultiplierAtTopSpeed;
      const canSprintMeters = e.stamina / drainPerMeterAtTop;
      if (finishLine - e.distance <= canSprintMeters * (1 + e.kickTiming)) {
        e.kicking = true;
        e.hasKicked = true;
        race.log.push({ type: "kick", entrant: e, distance: e.distance, time: race.time });
      }
    }

    // Running style: any speed bonuses right now, and how hard they want to run.
    const ahead = nearestAhead(index, startDistances);
    const surroundings = {
      gapAhead: ahead === null ? null : startDistances[ahead] - startDistances[index],
      gapBehind: gapBehind(index, startDistances),
    };
    const bonus = speedBonuses(e, lapIndex, surroundings);

    // Wind. Tucking in close behind someone blocks most of the headwind.
    const wind = windAt(e.distance);
    const sheltered = wind < 0 && surroundings.gapAhead !== null && surroundings.gapAhead <= condition.shelterMeters;
    const windBonus = sheltered ? wind * (1 - condition.headwindShelter) : wind;

    // Every speed bonus adds together: whole-race ones (conditions), style ones, and the wind.
    const speedsWith = (windPart) => {
      const speedBonus = runner.bonuses.speed + bonus.speed + windPart;
      return {
        average: runner.baseAverageSpeed * (1 + speedBonus),
        top: runner.baseTopSpeed * (1 + speedBonus + runner.bonuses.topSpeed + bonus.topSpeed),
      };
    };
    const { average: averageSpeed, top: topSpeed } = speedsWith(windBonus);
    const stylePlan = planFor(e, lapIndex);

    if (e.chasing) {
      const gotItBack = e.distance > e.chasing.target.distance + STYLES.frontRunner.chaseUntilAheadMeters;
      const tooTired = e.stamina < STYLES.frontRunner.chaseStopsAtStamina * runner.maxStamina;
      if (gotItBack || tooTired || e.distance >= e.chasing.until || lapIndex === tuning.laps - 1) {
        e.chasing = null;
        e.noChaseUntil = race.time + STYLES.frontRunner.chaseCooldownSeconds;
      }
    }

    let effort = Math.max(e.plan.effort[lapIndex], stylePlan.effort);
    if (e.chasing) effort = Math.max(effort, CHASE.effort);
    if (e.kicking) effort = 1;
    const pace = effort > 0 ? 1 : stylePlan.pace; // hanging back (Closer) only applies when not pushing
    const targetFor = (speeds) => speeds.average * pace + effort * (speeds.top - speeds.average);
    let targetSpeed = targetFor({ average: averageSpeed, top: topSpeed });
    if (sheltered) {
      // Shelter helps you keep up with the runner ahead, not blow past them.
      // (The runner ahead has already moved this tick, so this is their up-to-date speed.)
      const exposedTarget = targetFor(speedsWith(wind));
      targetSpeed = Math.max(exposedTarget, Math.min(targetSpeed, entrants[ahead].speed));
    }

    // 2. Speed up or slow down.
    if (e.stamina <= 0) {
      // Out of stamina: fade by 10% of average speed per second, down to 50%.
      const floor = tuning.exhaustedFloor * runner.averageSpeed;
      e.speed = Math.max(e.speed - tuning.exhaustedSlowdownPerSecond * runner.averageSpeed * dt, floor);
    } else if (e.speed < targetSpeed) {
      // Leaving the start line is quick for everyone. After that, all speeding up
      // (a kick, or recovering after running out of stamina) happens at the Kick rate.
      const rate = e.reachedPace ? runner.kick : tuning.startAcceleration;
      e.speed = Math.min(e.speed + rate * dt, targetSpeed);
    } else if (e.speed > targetSpeed) {
      e.speed = Math.max(e.speed - tuning.easeOffRate * dt, targetSpeed);
    }
    if (e.speed >= Math.min(targetSpeed, runner.averageSpeed) - 1e-9) e.reachedPace = true;

    // 3. Move forward and use stamina.
    let meters = mphToMetersPerSecond(e.speed) * dt;
    let tickTime = dt;
    if (e.distance + meters >= finishLine) {
      // Only count the part of this tick it took to reach the line, so times aren't rounded to 0.1s.
      const fraction = (finishLine - e.distance) / meters;
      meters *= fraction;
      tickTime *= fraction;
    }

    const lapLineAhead = (lapIndex + 1) * tuning.lapMeters;
    const crossesLapLine = e.distance < lapLineAhead && e.distance + meters >= lapLineAhead;
    const timeAtLapLine = race.time + tickTime * ((lapLineAhead - e.distance) / meters);

    // Stamina cost is measured against the runner's speeds right now (including style bonuses).
    let used = staminaUsed({ ...runner, averageSpeed, topSpeed }, e.speed, meters) * staminaFactor(e, e.speed, averageSpeed, condition);
    const gap = surroundings.gapAhead;
    const draftingSaving = tuning.draftingStaminaSaving * (condition?.draftingMultiplier ?? 1); // bigger in the wind
    if (gap !== null && gap <= tuning.draftingRangeMeters) used *= 1 - draftingSaving;
    e.stamina -= used;
    if (e.stamina <= 0) {
      if (e.ranOutAt === null) {
        e.ranOutAt = e.distance + meters;
        race.log.push({ type: "ranOut", entrant: e, distance: e.ranOutAt, time: race.time });
      }
      e.kicking = false; // too tired to keep kicking
    }
    e.stamina = Math.max(e.stamina, 0);
    e.distance += meters;
    if (e.distance >= finishLine) e.finishTime = race.time + tickTime;

    // 4. Determination: while stamina is low, roll every few seconds (max one success per lap).
    const lowStamina = e.stamina < tuning.determinationLowStamina * runner.maxStamina;
    if (!lowStamina) {
      e.nextRollIn = 0; // roll straight away the next time stamina drops low
    } else {
      e.nextRollIn -= tickTime;
      if (e.nextRollIn <= 0 && e.lastSuccessLap !== lapIndex) {
        e.nextRollIn = tuning.determinationRollEverySeconds;
        const bonus = rollDetermination(runner, rng);
        if (bonus > 0) {
          e.stamina = Math.min(e.stamina + bonus, runner.maxStamina);
          e.lastSuccessLap = lapIndex;
          const event = { type: "determination", entrant: e, time: race.time, distance: e.distance, lap: lapIndex + 1, bonus };
          e.events.push(event);
          race.log.push(event);
        }
      }
    }

    // 5. Record a split at each lap line (position gets filled in once everyone has moved).
    if (crossesLapLine) {
      const previousSplit = e.laps.length ? e.laps[e.laps.length - 1].split : 0;
      e.laps.push({
        lap: lapIndex + 1,
        split: timeAtLapLine, // total race time so far
        lapTime: timeAtLapLine - previousSplit,
        staminaLeft: e.stamina,
        position: null,
      });
    }
  }

  // A Front Runner who just got passed might fight to get the position back.
  function maybeChase(frontRunner, passer) {
    const canChase =
      frontRunner.runner.style === "frontRunner" &&
      frontRunner.finishTime === null &&
      !frontRunner.chasing &&
      race.time >= frontRunner.noChaseUntil &&
      frontRunner.stamina > STYLES.frontRunner.chaseStopsAtStamina * frontRunner.runner.maxStamina &&
      lapOf(frontRunner.distance) < tuning.laps - 1;
    if (canChase && wantsToChase(frontRunner, rng)) {
      frontRunner.chasing = { target: passer, until: frontRunner.distance + CHASE.maxMeters };
      race.log.push({ type: "chase", entrant: frontRunner, target: passer, distance: frontRunner.distance, time: race.time });
    }
  }

  const race = {
    entrants,
    player: entrants[0],
    condition,
    rival: condition?.rival && entrants.length > 1 ? rng.pick(entrants.slice(1)) : null,
    time: 0,
    finished: false,
    log: [], // everything worth announcing: passes, kicks, Determination, running out

    // Everyone in race order, leader first.
    standings() {
      const keys = entrants.map(rankKey);
      const order = entrants.map((_, i) => i);
      order.sort((i, j) => (isAhead(keys, i, j) ? -1 : 1));
      return order.map((i) => entrants[i]);
    },

    positionOf(entrant) {
      return race.standings().indexOf(entrant) + 1;
    },

    step() {
      if (race.finished) return;
      const startDistances = entrants.map((e) => e.distance);
      const startKeys = entrants.map(rankKey);
      const startLaps = entrants.map((e) => e.laps.length);

      // Move runners front to back, so anyone tucked in behind reacts to the runner ahead's new speed.
      const frontToBack = entrants.map((_, i) => i).sort((i, j) => startDistances[j] - startDistances[i] || i - j);
      for (const i of frontToBack) {
        if (entrants[i].finishTime === null) moveEntrant(entrants[i], i, startDistances);
      }
      race.time += dt;

      // Passes: anyone who was behind someone at the start of the tick and is now ahead.
      const endKeys = entrants.map(rankKey);
      entrants.forEach((a, i) => {
        entrants.forEach((b, j) => {
          const passed = i !== j && isAhead(startKeys, j, i) && isAhead(endKeys, i, j);
          if (passed && a.distance > tuning.ignorePassesFirstMeters) {
            race.log.push({ type: "pass", entrant: a, passed: b, distance: a.distance, time: race.time });
            maybeChase(b, a);
          }
        });
      });

      entrants.forEach((e, i) => {
        if (e.laps.length > startLaps[i]) e.laps[e.laps.length - 1].position = race.positionOf(e);
      });

      race.finished = entrants.every((e) => e.finishTime !== null);
    },

    // Final results, winner first.
    results() {
      return race.standings().map((e, i) => ({
        place: i + 1,
        name: e.runner.name,
        isPlayer: e.isPlayer,
        isRival: e === race.rival,
        style: e.runner.style,
        finishTime: e.finishTime,
      }));
    },

    // The player's race, in the same shape runSolo() returns.
    result() {
      const p = race.player;
      return { finishTime: p.finishTime, laps: p.laps, ranOutAt: p.ranOutAt, staminaLeft: p.stamina, events: p.events };
    },
  };

  return race;
}

export function runSolo(runner, rng, plan = PLANS.even) {
  const race = createRace(runner, [], rng, plan);
  while (!race.finished) race.step();
  return race.result();
}
