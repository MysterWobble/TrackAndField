// The runners on screen. For now they're simple placeholder shapes (a body and a head);
// real low-poly characters with run animations replace them in a later step.
//
// The race sim only knows how far along the track each runner is. This file decides how the
// pack LOOKS, like a real 1600 m race:
//   - everyone hugs the inside lane, in a line
//   - you only step out to lane 2 (or 3) when someone is right in front of you, then move back in
//   - lane changes are gradual, not sideways slides
//   - never more than 3 wide: extra runners tuck in behind instead

import * as THREE from "three";
import { COLORS, SHADES } from "./colors.js";
import { LANE_WIDTH, pointOnTrack } from "./track.js";

export const RUNNER_SCALE = 3.5; // drawn bigger than life so you can see them from the stadium camera
const FOLLOW_GAP = 0.45 * RUNNER_SCALE; // meters: how close one runner can follow another in the same lane
const MOST_LANES_WIDE = 3; // a real pack is rarely more than 2-3 wide
const LANE_CHANGE_SPEED = 0.8; // meters per second sideways (about 1.5 seconds to move one lane)
const CATCH_UP_SPEED = 3; // meters per second a tucked-in runner's shown position can drift to match the sim
const JOG_PAST_FINISH = 25; // meters finished runners jog on past the line
const BOB = 0.05; // how much runners bounce as they run

function makeRunnerModel(color, isYou) {
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ color, flatShading: true });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.7, 2, 6), material);
  body.position.y = 0.85;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), material);
  head.position.y = 1.55;
  group.add(body, head);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.4, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }),
  );
  shadow.rotation.x = -Math.PI / 2;

  let marker = null;
  if (isYou) {
    marker = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 4), new THREE.MeshLambertMaterial({ color: COLORS.you }));
    marker.rotation.x = Math.PI; // point down at your runner
    marker.position.y = 2.4;
    group.add(marker);
  }
  group.scale.setScalar(RUNNER_SCALE);
  shadow.scale.setScalar(RUNNER_SCALE);
  return { group, shadow, marker, material };
}

export function createRunnerViews(race, scene) {
  const views = race.entrants.map((entrant, i) => {
    const color = entrant.isPlayer ? COLORS.you : SHADES.runners[(i - 1) % SHADES.runners.length];
    const model = makeRunnerModel(color, entrant.isPlayer);
    scene.add(model.group, model.shadow);
    // Everyone starts spread across the lanes (like a real 1600 m start) and cuts in to lane 1.
    return { entrant, ...model, lane: i, offset: i * LANE_WIDTH, shown: 0, stride: Math.random() * Math.PI };
  });

  // Where the sim says a runner is, plus a little jog past the finish line once they're done.
  function simDistance(entrant) {
    if (entrant.finishTime === null) return entrant.distance;
    return entrant.distance + Math.min(JOG_PAST_FINISH, (race.time - entrant.finishTime) * 3);
  }

  // Called every frame. `dt` = real seconds since the last frame.
  function update(dt, time) {
    const order = [...views].sort((a, b) => simDistance(b.entrant) - simDistance(a.entrant));
    const placed = []; // runners already positioned this frame (everyone ahead of the current one)

    for (const view of order) {
      const want = simDistance(view.entrant);
      const done = view.entrant.finishTime !== null;
      const lanes = done ? 8 : MOST_LANES_WIDE; // after the finish they can spread out

      // How far forward this runner can be shown in `lane` without running into someone ahead.
      const roomIn = (lane) => {
        let limit = want;
        for (const p of placed) {
          if (p.lane === lane && p.shown - FOLLOW_GAP < limit && p.shown > want - FOLLOW_GAP) limit = p.shown - FOLLOW_GAP;
        }
        return limit;
      };
      const clear = (lane) => roomIn(lane) >= want - 1e-6;

      // Move in toward the rail when there's room; step out only when blocked; otherwise stay put.
      let lane = view.lane;
      if (lane > 0 && clear(lane - 1)) lane -= 1;
      else if (!clear(lane)) {
        let best = lane;
        for (let l = 0; l < lanes; l++) {
          if (clear(l)) {
            best = l;
            break;
          }
          if (roomIn(l) > roomIn(best)) best = l;
        }
        lane = best;
      }
      lane = Math.min(lane, lanes - 1);
      view.lane = lane;

      // Shown position: tucked in behind anyone in the way, drifting smoothly toward where the sim says.
      const target = roomIn(lane);
      const drift = CATCH_UP_SPEED * RUNNER_SCALE * dt;
      view.shown = target > view.shown ? Math.min(target, view.shown + Math.max(drift, (target - view.shown) * 0.5)) : Math.max(target, view.shown - drift);
      placed.push({ lane, shown: view.shown });

      const sideways = LANE_CHANGE_SPEED * dt;
      view.offset += Math.max(-sideways, Math.min(sideways, lane * LANE_WIDTH - view.offset));

      const { x, z, heading } = pointOnTrack(view.shown, view.offset);
      const moving = done && race.time - view.entrant.finishTime > JOG_PAST_FINISH / 3 ? 0 : view.entrant.speed;
      view.stride += moving * dt * 1.6;
      const bob = Math.abs(Math.sin(view.stride)) * BOB * RUNNER_SCALE;
      view.group.position.set(x, bob, z);
      view.group.rotation.y = heading;
      view.shadow.position.set(x, 0.06, z);

      if (view.marker) view.marker.position.y = 2.4 + Math.sin(time * 3) * 0.1;
      // Kicking glow: your runner lights up gold.
      const kicking = view.entrant.kicking;
      view.material.emissive.setHex(kicking ? COLORS.gold : 0x000000);
      view.material.emissiveIntensity = kicking ? 0.6 + Math.sin(time * 20) * 0.2 : 0;
    }
  }

  return { update, views, you: views[0] };
}
