// The kick "nitro" trail: while you're kicking, glowing sparks stream off the back of your runner.

import * as THREE from "three";
import { COLORS } from "./colors.js";

const SPARKS = 60; // how many can be on screen at once
const PER_SECOND = 45; // how many appear per second while kicking
const LIFE = 0.45; // seconds each spark lasts

export function createKickTrail(scene) {
  const geometry = new THREE.BoxGeometry(0.35, 0.35, 0.35);
  const sparks = [];
  for (let i = 0; i < SPARKS; i++) {
    const material = new THREE.MeshBasicMaterial({ color: i % 3 ? COLORS.gold : COLORS.you, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    scene.add(mesh);
    sparks.push({ mesh, age: LIFE, drift: new THREE.Vector3() });
  }
  let next = 0;
  let owed = 0; // fraction of a spark carried to the next frame

  // `runner` = your runner's 3D group. Call every frame.
  function update(dt, runner, kicking) {
    if (kicking) {
      owed += PER_SECOND * dt;
      while (owed >= 1) {
        owed -= 1;
        const spark = sparks[next];
        next = (next + 1) % SPARKS;
        spark.age = 0;
        spark.mesh.visible = true;
        spark.mesh.position.set(
          runner.position.x + (Math.random() - 0.5) * 1.5,
          1 + Math.random() * 3.5,
          runner.position.z + (Math.random() - 0.5) * 1.5,
        );
        // Drift backwards (opposite the way the runner faces) and a little upward.
        const back = runner.rotation.y + Math.PI;
        spark.drift.set(Math.cos(back) * 6, 1.5, -Math.sin(back) * 6);
      }
    }
    for (const spark of sparks) {
      if (!spark.mesh.visible) continue;
      spark.age += dt;
      if (spark.age >= LIFE) {
        spark.mesh.visible = false;
        continue;
      }
      const left = 1 - spark.age / LIFE;
      spark.mesh.position.addScaledVector(spark.drift, dt);
      spark.mesh.material.opacity = left;
      spark.mesh.scale.setScalar(0.4 + left);
    }
  }

  return { update };
}
