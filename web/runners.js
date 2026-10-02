// The runners on screen: low-poly characters (web/runnerModel.js) with a running stride.
//
// The race sim only knows how far along the track each runner is. This file decides how the
// pack LOOKS, like a real 1600 m race:
//   - everyone hugs the inside lane, in a line
//   - you only step out to lane 2 (or 3) when someone is right in front of you, then move back in
//   - lane changes are gradual, not sideways slides
//   - never more than 3 wide: extra runners tuck in behind instead

import * as THREE from "three";
import { COLORS, RUNNER_LOOKS } from "./colors.js";
import { mat } from "./materials.js";
import { LANE_WIDTH, pointOnTrack } from "./track.js";
import { buildRunnerModel, hairStyleFor } from "./runnerModel.js";

export const RUNNER_SCALE = 3.5; // drawn bigger than life so you can see them from the stadium camera
const FOLLOW_GAP = 0.45 * RUNNER_SCALE; // meters: how close one runner can follow another in the same lane
const MOST_LANES_WIDE = 3; // a real pack is rarely more than 2-3 wide
const LANE_CHANGE_SPEED = 0.8; // meters per second sideways (about 1.5 seconds to move one lane)
const CATCH_UP_SPEED = 3; // meters per second a tucked-in runner's shown position can drift to match the sim
const JOG_PAST_FINISH = 25; // meters finished runners jog on past the line

// Blob shadows fall away from the sun, which shines from the left and slightly toward the camera.
const SHADOW_NUDGE = { x: 0.12 * RUNNER_SCALE, z: -0.07 * RUNNER_SCALE };
const SHADOW_MATERIAL = new THREE.MeshBasicMaterial({ color: COLORS.shadow, transparent: true, opacity: 0.35, depthWrite: false });

// Shorts are a step darker than the shirt, or charcoal/cream for the cream/charcoal kits (STYLE_GUIDE.md §3).
function shortsColor(shirt) {
  if (shirt === COLORS.kits[0]) return COLORS.kits[5];
  if (shirt === COLORS.kits[5]) return COLORS.kits[0];
  return new THREE.Color(shirt).multiplyScalar(0.72).getHex();
}

// Each runner's look: their kit, plus skin, hair and shoes that vary from runner to runner.
// `look` = their place in the field, so the same runner slot always looks the same.
function makeRunnerModel(color, isYou, look) {
  const pick = (list, step) => list[(look * step + (isYou ? 2 : 0)) % list.length];
  const model = buildRunnerModel({
    colors: {
      shirt: color,
      shorts: shortsColor(color),
      skin: pick(RUNNER_LOOKS.skin, 3),
      hair: pick(RUNNER_LOOKS.hair, 2),
      shoes: pick(RUNNER_LOOKS.shoes, 1),
      bib: RUNNER_LOOKS.bib,
    },
    hairStyle: hairStyleFor(look),
    own: isYou, // your runner's materials are your own copies, so the kick glow lights up only you (STYLE_GUIDE.md §4)
  });
  const group = model.group;

  const shadow = new THREE.Group();
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 12), SHADOW_MATERIAL);
  shadow.add(blob);
  let marker = null;
  if (isYou) {
    // Your runner gets a You-green ring around its shadow, plus a marker overhead.
    const ringMaterial = new THREE.MeshBasicMaterial({ color: COLORS.you, depthWrite: false });
    shadow.add(new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 20), ringMaterial));
    marker = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 4), mat(COLORS.you));
    marker.rotation.x = Math.PI; // point down at your runner
    marker.position.y = 2.4;
    group.add(marker);
  }
  shadow.rotation.x = -Math.PI / 2;
  group.scale.setScalar(RUNNER_SCALE);
  shadow.scale.setScalar(RUNNER_SCALE);
  return { group, shadow, marker, materials: model.materials, animate: model.animate };
}

export function createRunnerViews(race, scene) {
  const views = race.entrants.map((entrant, i) => {
    const color = entrant.isPlayer ? COLORS.you : COLORS.kits[(i - 1) % COLORS.kits.length];
    const model = makeRunnerModel(color, entrant.isPlayer, i);
    scene.add(model.group, model.shadow);
    // Everyone starts spread across the lanes (like a real 1600 m start) and cuts in to lane 1.
    return { entrant, ...model, lane: i, offset: i * LANE_WIDTH, shown: 0 };
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
      // The stride: pace compared to their normal pace (0 once they've jogged to a stop past the finish).
      const stopped = done && race.time - view.entrant.finishTime > JOG_PAST_FINISH / 3;
      const pace = stopped ? 0 : view.entrant.speed / view.entrant.runner.averageSpeed;
      view.animate(dt, done ? Math.min(pace, 0.8) : pace, !done && (view.entrant.kicking || pace > 1.08));
      view.group.position.set(x, 0, z);
      view.group.rotation.y = heading;
      view.shadow.position.set(x + SHADOW_NUDGE.x, 0.08, z + SHADOW_NUDGE.z);

      if (view.entrant.isPlayer) {
        view.marker.position.y = 2.4 + Math.sin(time * 3) * 0.1;
        // Kicking glow: only YOUR runner lights up gold (its materials are its own copies).
        const kicking = view.entrant.kicking;
        for (const material of view.materials) {
          material.emissive.setHex(kicking ? COLORS.gold : 0x000000);
          material.emissiveIntensity = kicking ? 0.45 + Math.sin(time * 12) * 0.15 : 0;
        }
      }
    }
  }

  return { update, views, you: views[0] };
}
