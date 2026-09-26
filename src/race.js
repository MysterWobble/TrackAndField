// The race loop: you plus the computer runners, all on the track together.
//
// The sim works like a flip-book. Every tick (0.1 seconds), for each runner, it:
//   1. decides how fast they want to go (computer runners decide here when to kick),
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

export function createRace(player, rivals, rng, plan = PLANS.even) {
  const dt = tuning.tickSeconds;
  const finishLine = raceMeters();
  const entrants = [
    createEntrant(player, true, plan, rng),
    ...rivals.map((runner) => createEntrant(runner, false, PLANS.even, rng)),
  ];

  // Who's ahead? Finished runners rank by finish time, everyone else by distance.
  function rankKey(entrant) {
    return entrant.finishTime !== null ? 1e9 - entrant.finishTime : entrant.distance;
  }

  // Is runner i ahead of runner j? If they're exactly level, the lower lane (earlier in the list) counts as ahead.
  function isAhead(keys, i, j) {
    return keys[i] > keys[j] || (keys[i] === keys[j] && i < j);
  }

  // Meters to the nearest runner ahead (using where everyone was at the start of this tick).
  function gapAhead(index, startDistances) {
    let gap = null;
    startDistances.forEach((distance, j) => {
      const ahead = distance - startDistances[index];
      if (j !== index && entrants[j].finishTime === null && ahead > 0 && (gap === null || ahead < gap)) gap = ahead;
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
    const effort = e.kicking ? 1 : e.plan.effort[lapIndex];
    const targetSpeed = runner.averageSpeed + effort * (runner.topSpeed - runner.averageSpeed);

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
    if (e.speed >= runner.averageSpeed) e.reachedPace = true;

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

    let used = staminaUsed(runner, e.speed, meters);
    const gap = gapAhead(index, startDistances);
    if (gap !== null && gap <= tuning.draftingRangeMeters) used *= 1 - tuning.draftingStaminaSaving;
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

  const race = {
    entrants,
    player: entrants[0],
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

      entrants.forEach((e, i) => {
        if (e.finishTime === null) moveEntrant(e, i, startDistances);
      });
      race.time += dt;

      // Passes: anyone who was behind someone at the start of the tick and is now ahead.
      const endKeys = entrants.map(rankKey);
      entrants.forEach((a, i) => {
        entrants.forEach((b, j) => {
          const passed = i !== j && isAhead(startKeys, j, i) && isAhead(endKeys, i, j);
          if (passed && a.distance > tuning.ignorePassesFirstMeters) {
            race.log.push({ type: "pass", entrant: a, passed: b, distance: a.distance, time: race.time });
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
