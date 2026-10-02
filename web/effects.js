// The kick trail: while you're kicking, a handful of soft warm motes drift off the back of your runner.
// (STYLE_GUIDE.md §9: the kick is the one loud moment, restyled to fit the cozy look.)
// The motes are glowing points that add light, so a mote fading to black simply disappears.

import * as THREE from "three";
import { COLORS } from "./colors.js";

const MOTES = 40; // how many can be on screen at once
const PER_SECOND = 24; // how many appear per second while kicking
const LIFE = 0.6; // seconds each mote lasts

export function createKickTrail(scene) {
  const positions = new Float32Array(MOTES * 3);
  const colors = new Float32Array(MOTES * 3); // black = invisible
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 1.6,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  scene.add(new THREE.Points(geometry, material));

  const motes = Array.from({ length: MOTES }, () => ({ age: LIFE, drift: new THREE.Vector3(), tint: new THREE.Color() }));
  const warm = [new THREE.Color(COLORS.gold), new THREE.Color(COLORS.sun)];
  let next = 0;
  let owed = 0; // fraction of a mote carried to the next frame

  // `runner` = your runner's 3D group. Call every frame.
  function update(dt, runner, kicking) {
    if (kicking) {
      owed += PER_SECOND * dt;
      while (owed >= 1) {
        owed -= 1;
        const i = next;
        next = (next + 1) % MOTES;
        const mote = motes[i];
        mote.age = 0;
        mote.tint.copy(warm[i % 2]);
        positions[i * 3] = runner.position.x + (Math.random() - 0.5) * 1.5;
        positions[i * 3 + 1] = 1 + Math.random() * 4;
        positions[i * 3 + 2] = runner.position.z + (Math.random() - 0.5) * 1.5;
        // Drift backwards (opposite the way the runner faces) and gently upward.
        const back = runner.rotation.y + Math.PI;
        mote.drift.set(Math.cos(back) * 4, 1.2, -Math.sin(back) * 4);
      }
    }
    motes.forEach((mote, i) => {
      if (mote.age >= LIFE) {
        colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 0;
        return;
      }
      mote.age += dt;
      const left = Math.max(0, 1 - mote.age / LIFE);
      positions[i * 3] += mote.drift.x * dt;
      positions[i * 3 + 1] += mote.drift.y * dt;
      positions[i * 3 + 2] += mote.drift.z * dt;
      colors[i * 3] = mote.tint.r * left;
      colors[i * 3 + 1] = mote.tint.g * left;
      colors[i * 3 + 2] = mote.tint.b * left;
    });
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }

  return { update };
}
