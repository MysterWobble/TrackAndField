// The low-poly stadium, built from simple shapes (no downloads needed):
// grass, the red track with white lane lines, the finish line, and stands full of a blocky crowd.

import * as THREE from "three";
import { COLORS, SHADES } from "./colors.js";
import { INSIDE_RADIUS, LANE_WIDTH, LANES, STRAIGHT, ovalOutline } from "./track.js";

const OUTSIDE_RADIUS = INSIDE_RADIUS + LANES * LANE_WIDTH;

// Flat shapes are drawn in x/y, then laid down on the ground. Laying down turns y into -z.
function ovalPath(radius, path = new THREE.Shape()) {
  ovalOutline(radius).forEach(([x, z], i) => (i === 0 ? path.moveTo(x, -z) : path.lineTo(x, -z)));
  path.closePath();
  return path;
}

// A flat oval ring (like the track, or a lane line) from `inner` to `outer` radius.
function ring(inner, outer, color, height) {
  const shape = ovalPath(outer);
  shape.holes.push(ovalPath(inner, new THREE.Path()));
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshLambertMaterial({ color }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = height;
  return mesh;
}

function flatOval(radius, color, height) {
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(ovalPath(radius)), new THREE.MeshLambertMaterial({ color }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = height;
  return mesh;
}

// Stepped stands along one side, with a crowd of little blocks on the steps.
// `side` = 1 for the near (home straight) side, -1 for the far side.
function stands(side, length, tiers, random) {
  const group = new THREE.Group();
  const concrete = new THREE.MeshLambertMaterial({ color: SHADES.standConcrete, flatShading: true });
  const seats = new THREE.MeshLambertMaterial({ color: SHADES.seats, flatShading: true });
  const start = OUTSIDE_RADIUS + 5;
  const depth = 2.2;
  const rise = 1.4;
  const spots = [];

  for (let t = 0; t < tiers; t++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(length, rise * (t + 1), depth), t % 2 ? seats : concrete);
    const z = side * (start + t * depth + depth / 2);
    step.position.set(0, (rise * (t + 1)) / 2, z);
    group.add(step);
    for (let x = -length / 2 + 1; x < length / 2 - 1; x += 1.1) {
      if (random() < 0.75) spots.push([x + (random() - 0.5) * 0.3, rise * (t + 1), z]);
    }
  }

  // One InstancedMesh draws the whole crowd in a single go (much faster than hundreds of separate blocks).
  const fan = new THREE.BoxGeometry(0.6, 1.1, 0.5);
  const crowd = new THREE.InstancedMesh(fan, new THREE.MeshLambertMaterial(), spots.length);
  const place = new THREE.Object3D();
  const color = new THREE.Color();
  spots.forEach(([x, y, z], i) => {
    place.position.set(x, y + 0.55, z);
    place.updateMatrix();
    crowd.setMatrixAt(i, place.matrix);
    crowd.setColorAt(i, color.setHex(SHADES.crowd[Math.floor(random() * SHADES.crowd.length)]));
  });
  group.add(crowd);
  return group;
}

// Simple low-poly trees: a cone on a stick.
function tree(x, z, scale) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2, 5), new THREE.MeshLambertMaterial({ color: 0x8a5a3b }));
  trunk.position.y = 1;
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 5, 6),
    new THREE.MeshLambertMaterial({ color: SHADES.outerGrass, flatShading: true }),
  );
  leaves.position.y = 4.5;
  group.add(trunk, leaves);
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  return group;
}

export function buildStadium(random) {
  const stadium = new THREE.Group();

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: SHADES.outerGrass }));
  ground.rotation.x = -Math.PI / 2;
  stadium.add(ground);

  stadium.add(ring(INSIDE_RADIUS - 0.4, OUTSIDE_RADIUS + 1.2, COLORS.trackRed, 0.02)); // the track (with a little border)
  stadium.add(flatOval(INSIDE_RADIUS - 0.4, COLORS.infieldGreen, 0.03)); // the infield
  for (let lane = 0; lane <= LANES; lane++) {
    const r = INSIDE_RADIUS + lane * LANE_WIDTH;
    stadium.add(ring(r - 0.05, r + 0.05, COLORS.laneWhite, 0.04)); // lane lines
  }

  // Finish line: across all lanes at the end of the home straight.
  const finish = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, OUTSIDE_RADIUS - INSIDE_RADIUS),
    new THREE.MeshLambertMaterial({ color: COLORS.laneWhite }),
  );
  finish.rotation.x = -Math.PI / 2;
  finish.position.set(STRAIGHT / 2, 0.05, (INSIDE_RADIUS + OUTSIDE_RADIUS) / 2);
  stadium.add(finish);

  stadium.add(stands(1, STRAIGHT + 20, 7, random)); // main stands, nearest the camera
  stadium.add(stands(-1, STRAIGHT - 10, 4, random)); // smaller stands on the far side

  for (let i = 0; i < 14; i++) {
    const x = (i - 6.5) * 18 + (random() - 0.5) * 8;
    stadium.add(tree(x, -OUTSIDE_RADIUS - 22 - random() * 10, 0.8 + random() * 0.6));
  }

  return stadium;
}
