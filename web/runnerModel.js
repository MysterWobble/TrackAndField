// A low-poly runner in the spirit of late-90s 3D RPG characters (style only, nothing copied): a body made
// of separate rigid blocks joined at the shoulders, elbows, hips and knees, flat colors with no textures,
// a big head, big hands, spiky shoulders and elbows, rounded sneakers, and angular hair. About 900 triangles each.
//
// It's built from many small pieces for easy editing, then each body segment's pieces are baked into one
// mesh colored per vertex: about 14 draw calls per runner instead of 30+ (STYLE_GUIDE.md §4).
//
// The model faces +x (the way the track's `heading` expects), with up = +y. Sizes are in "runner units"
// (about 1.8 tall); runners.js scales the whole thing up so it reads from the stadium camera.
//
// animate() plays a running stride: legs swing and knees fold, arms pump the other way, the body leans
// in and bobs. It speeds up and gets bigger when the runner pushes, and settles to a standstill at rest.

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { mat } from "./materials.js";

// A box that's a different size at the top and bottom (shoulders wider than the waist, a wide head and
// narrow chin). Its bottom sits at y = 0, so it hangs from or stands on a joint easily.
function block({ w, h, d, wTop = w, dTop = d, down = false }) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const top = position.getY(i) > 0;
    position.setXYZ(i, position.getX(i) * (top ? dTop : d), (position.getY(i) + 0.5) * h, position.getZ(i) * (top ? wTop : w));
  }
  geometry.computeVertexNormals();
  return down ? geometry.translate(0, -h, 0) : geometry; // `down`: hangs below its joint instead
}

// A faceted limb: a five-sided prism, thicker at one end, hanging below its joint.
// Five flat sides catch the light like the polygon limbs of late-90s characters.
const limb = (rTop, rBottom, h) => new THREE.CylinderGeometry(rTop, rBottom, h, 5).translate(0, -h / 2, 0);

// A faceted, rounded skull (a low-poly ball, a little taller than wide), centered on (x, y, z).
const skull = (size = 1) => new THREE.IcosahedronGeometry(0.165, 1).scale(1.05 * size, 1.08 * size, 0.95 * size);
const SKULL_Y = 0.2; // the skull's center, above the neck joint

// Hair that hugs the skull: the same shape, a bit bigger, pushed up and back so the face shows.
function hairCap(head, material, { size = 1.06, lift = 0.035, back = 0.035 } = {}) {
  head.add(mesh(skull(size), material, -back, SKULL_Y + lift, 0));
}

// A running shoe: a wedge with a taller heel sloping down to a lower, narrower toe.
// Its sole sits at y = 0; the heel is at -x and the toe at +x.
function shoeShape({ length = 0.29, heel = 0.11, toe = 0.055, heelWidth = 0.14, toeWidth = 0.11 } = {}) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const front = position.getX(i) > 0;
    const top = position.getY(i) > 0;
    position.setXYZ(i, position.getX(i) * length, top ? (front ? toe : heel) : 0, position.getZ(i) * (front ? toeWidth : heelWidth));
  }
  geometry.computeVertexNormals();
  return geometry;
}

// A faceted oval (a low-poly ball squashed to the given sizes), for rounded toes and soles.
const oval = (x, y, z, detail = 1) => new THREE.IcosahedronGeometry(1, detail).scale(x, y, z);

// A four-sided spike, pointing along +y from its base, for hair.
const spike = (radius, length) => new THREE.ConeGeometry(radius, length, 4).translate(0, length / 2, 0);

function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

// Bakes every joint's pieces into one mesh, colored per vertex with each piece's color.
// `material` is a vertex-colored material (shared, or your runner's own copy).
function bake(root, material) {
  const joints = [];
  root.traverse((o) => o.isGroup && joints.push(o));
  for (const j of joints) {
    const pieces = j.children.filter((child) => child.isMesh);
    if (!pieces.length) continue;
    const geometries = pieces.map((piece) => {
      piece.updateMatrix();
      const geometry = (piece.geometry.index ? piece.geometry.toNonIndexed() : piece.geometry.clone()).applyMatrix4(piece.matrix);
      if (geometry.attributes.uv) geometry.deleteAttribute("uv");
      const colors = new Float32Array(geometry.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) piece.material.color.toArray(colors, i);
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      return geometry;
    });
    for (const piece of pieces) j.remove(piece);
    j.add(new THREE.Mesh(mergeGeometries(geometries), material));
  }
}
const BAKED = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

function joint(parent, x, y, z) {
  const j = new THREE.Group();
  j.position.set(x, y, z);
  parent.add(j);
  return j;
}

// Hair styles, built on top of the head (head top is at y = HEAD_H, face toward +x).
const HEAD_H = 0.38; // the top of the skull
const HAIR_STYLES = {
  // Short spikes swept back.
  spiky(head, material) {
    hairCap(head, material);
    const spikes = [
      [0.06, 0.0, 0.0, -0.7, 0.2],
      [0.08, 0.0, 0.11, -0.4, 0.15],
      [0.08, 0.0, -0.11, -0.4, 0.15],
      [-0.04, 0.0, 0.13, -1.2, 0.2],
      [-0.04, 0.0, -0.13, -1.2, 0.2],
      [-0.04, 0.0, 0.0, -1.3, 0.24],
      [-0.13, -0.08, 0.08, -2.0, 0.18],
      [-0.13, -0.08, -0.08, -2.0, 0.18],
    ];
    for (const [x, y, z, tilt, length] of spikes) {
      const s = mesh(spike(0.075, length), material, x - 0.02, HEAD_H - 0.03 + y, z);
      s.rotation.z = tilt * 0.6; // lean back
      s.rotation.x = z * 3; // fan out to the sides
      head.add(s);
    }
  },
  // A ponytail that swings as they run.
  ponytail(head, material, parts) {
    hairCap(head, material);
    const tie = joint(head, -0.18, HEAD_H - 0.1, 0);
    const tail = mesh(block({ w: 0.08, h: 0.24, d: 0.07, wTop: 0.1, dTop: 0.09, down: true }), material);
    tail.rotation.z = -0.5;
    tie.add(tail);
    parts.tail = tie;
  },
  // Very short, close to the head.
  buzz(head, material) {
    hairCap(head, material, { size: 1.02, lift: 0.025, back: 0.03 });
  },
  // A bun on top.
  bun(head, material) {
    hairCap(head, material);
    head.add(mesh(new THREE.IcosahedronGeometry(0.085, 0), material, -0.08, HEAD_H + 0.04, 0));
  },
  // A chunky, blocky crop that sits higher on the head.
  crop(head, material) {
    hairCap(head, material, { size: 1.12, lift: 0.05, back: 0.025 });
    head.add(mesh(block({ w: 0.3, h: 0.07, d: 0.3, wTop: 0.24, dTop: 0.24 }), material, -0.02, HEAD_H + 0.0, 0)); // flat-topped
  },
  // A runner's sweatband round the forehead, with a tuft of hair standing straight up above it.
  sweatband(head, material, parts, band) {
    hairCap(head, material, { size: 1.03, lift: 0.03, back: 0.03 });
    head.add(mesh(new THREE.CylinderGeometry(1, 1, 0.05, 10).scale(0.172, 1, 0.16), band, 0, 0.275, 0));
    const tuft = [
      [0.0, 0.0, 0.0, 0.25],
      [0.05, 0.05, 0.25, 0.2],
      [0.05, -0.05, -0.25, 0.2],
      [-0.05, 0.06, 0.4, 0.17],
      [-0.05, -0.06, -0.4, 0.17],
    ];
    for (const [x, z, lean, length] of tuft) {
      const s = mesh(spike(0.07, length), material, x - 0.01, HEAD_H - 0.05, z);
      s.rotation.x = lean; // splay out to the sides
      s.rotation.z = -x * 2; // and a little forward and back
      head.add(s);
    }
  },
};
export const HAIR_STYLE_NAMES = Object.keys(HAIR_STYLES);
// Spreads the styles across the field (5 steps around the list, so every style turns up).
export const hairStyleFor = (index) => HAIR_STYLE_NAMES[(index * 5 + 1) % HAIR_STYLE_NAMES.length];

// colors: { shirt, shorts, skin, hair, shoes, bib }. `own`: give this runner its own copy of the material
// (your runner, so the kick glow lights up only you).
export function buildRunnerModel({ colors, hairStyle = "spiky", own = false }) {
  const material = (hex) => mat(hex); // only used for its color: everything is baked below
  const shirt = material(colors.shirt);
  const shorts = material(colors.shorts);
  const skin = material(colors.skin);
  const hair = material(colors.hair);
  const shoe = material(colors.shoes);
  const dark = mat(0x2a2522); // eyes and soles

  const root = new THREE.Group(); // the whole runner (bobs up and down)
  const body = joint(root, 0, 0, 0);
  const parts = {};

  // Hips and shorts, then the torso leaning from the waist.
  const hips = joint(body, 0, 0.9, 0);
  hips.add(mesh(block({ w: 0.34, h: 0.2, d: 0.21, down: true }), shorts, 0, 0.06, 0));
  const torso = joint(hips, 0, 0.02, 0);
  torso.add(mesh(block({ w: 0.25, h: 0.5, d: 0.19, wTop: 0.5, dTop: 0.26 }), shirt));
  torso.add(mesh(block({ w: 0.17, h: 0.13, d: 0.02 }), material(colors.bib), 0.115, 0.22, 0)); // race bib
  torso.add(mesh(block({ w: 0.1, h: 0.06, d: 0.1 }), skin, 0, 0.5, 0)); // neck

  // The head: wide at the top, narrow at the chin, with two dark eyes.
  const head = joint(torso, 0.01, 0.55, 0);
  head.add(mesh(skull(), skin, 0, SKULL_Y, 0));
  head.add(mesh(block({ w: 0.14, h: 0.13, d: 0.15, wTop: 0.25, dTop: 0.24 }), skin, 0.025, 0.02, 0)); // angular jaw and chin
  head.add(mesh(new THREE.BoxGeometry(0.03, 0.035, 0.03), skin, 0.17, 0.155, 0)); // a small nose
  for (const z of [-1, 1]) {
    head.add(mesh(new THREE.BoxGeometry(0.045, 0.075, 0.03), skin, 0, 0.18, z * 0.16)); // ears
    head.add(mesh(new THREE.BoxGeometry(0.03, 0.065, 0.045), dark, 0.158, 0.205, z * 0.065)); // eyes
  }
  (HAIR_STYLES[hairStyle] ?? HAIR_STYLES.spiky)(head, hair, parts, material(colors.bib));

  // Arms: upper arm, forearm, and a big blocky hand (bare arms: it's a singlet).
  function arm(side) {
    const shoulder = joint(torso, 0, 0.45, side * 0.27);
    // A big angular shoulder cap with two spikes, one pointing out and up, a smaller one out and back.
    shoulder.add(mesh(new THREE.IcosahedronGeometry(0.1, 0), shirt, 0, 0.01, side * 0.02));
    const bigSpike = mesh(spike(0.075, 0.16), shirt, 0, 0.03, side * 0.05);
    bigSpike.rotation.x = side * 1.05;
    const smallSpike = mesh(spike(0.055, 0.11), shirt, -0.04, 0.0, side * 0.05);
    smallSpike.rotation.set(side * 1.35, 0, 0.6);
    shoulder.add(bigSpike, smallSpike);
    shoulder.add(mesh(limb(0.065, 0.05, 0.26), skin));
    // A pointed elbow, sticking out the back of the arm.
    const elbowPoint = mesh(spike(0.05, 0.1), skin, -0.02, -0.25, 0);
    elbowPoint.rotation.z = 2.0; // back and a little down
    shoulder.add(elbowPoint);
    const elbow = joint(shoulder, 0, -0.26, 0);
    elbow.add(mesh(limb(0.06, 0.075, 0.22), skin)); // forearms a bit chunkier toward the hand
    elbow.add(mesh(new THREE.BoxGeometry(0.14, 0.14, 0.12), skin, 0, -0.28, 0)); // big hand
    return { shoulder, elbow };
  }
  // Legs: thigh, shin, and a chunky shoe that points forward.
  function leg(side) {
    const hip = joint(hips, 0, -0.06, side * 0.1);
    hip.add(mesh(limb(0.1, 0.07, 0.4), skin));
    hip.add(mesh(limb(0.112, 0.1, 0.14), shorts)); // the shorts' leg, over the top of the thigh
    const knee = joint(hip, 0, -0.4, 0);
    knee.add(mesh(limb(0.075, 0.05, 0.36), skin));
    const ankle = joint(knee, 0, -0.36, 0);
    ankle.add(mesh(shoeShape({ length: 0.17, heel: 0.11, toe: 0.08, heelWidth: 0.135, toeWidth: 0.13 }), shoe, -0.01, -0.085, 0)); // heel
    ankle.add(mesh(oval(0.13, 0.055, 0.068), shoe, 0.09, -0.06, 0)); // rounded toe box
    ankle.add(mesh(block({ w: 0.12, h: 0.04, d: 0.12 }), shoe, -0.02, -0.0, 0)); // ankle collar
    ankle.add(mesh(new THREE.CylinderGeometry(1, 1, 1, 10).scale(0.165, 0.025, 0.074), dark, 0.05, -0.093, 0)); // oval sole
    return { hip, knee, ankle };
  }
  const legs = [leg(-1), leg(1)];
  const arms = [arm(-1), arm(1)];

  let phase = Math.random() * Math.PI * 2;
  let stride = 0; // 0 = standing, 1 = running (eases between)

  // `dt` = real seconds; `pace` = speed compared to their normal pace (1 = cruising, about 1.2 = flat out);
  // `pushing` = kicking or surging (longer stride, harder arm pump).
  function animate(dt, pace, pushing) {
    const running = pace > 0.15;
    stride += ((running ? 1 : 0) - stride) * Math.min(1, dt * 4);
    const effort = pushing ? 1 : 0;
    // About 2.5 strides a second at cruising pace, quicker when pushing. (The race plays sped-up, so
    // matching real foot speed would just be a blur; this reads as running at a glance.)
    phase += dt * Math.PI * 2 * (2.3 + 0.9 * Math.max(0, pace - 0.8) + 0.4 * effort) * stride;

    const legSwing = (0.62 + 0.28 * effort) * stride;
    const armSwing = (0.55 + 0.45 * effort) * stride;
    legs.forEach(({ hip, knee, ankle }, i) => {
      const p = phase + i * Math.PI;
      hip.rotation.z = Math.sin(p) * legSwing + 0.1 * stride; // + forward
      const fold = Math.max(0, Math.cos(p + Math.PI / 4)); // knee folds most as the leg swings through
      knee.rotation.z = -(0.15 + (1.25 + 0.4 * effort) * fold) * stride;
      ankle.rotation.z = -(hip.rotation.z + knee.rotation.z) * 0.5; // keep the shoe roughly level
    });
    arms.forEach(({ shoulder, elbow }, i) => {
      const p = phase + i * Math.PI; // each arm swings with the opposite leg
      shoulder.rotation.z = -Math.sin(p) * armSwing - 0.05;
      shoulder.rotation.x = (i ? -1 : 1) * 0.08; // a little out from the body
      elbow.rotation.z = (1.25 + 0.3 * effort + 0.15 * Math.sin(p)) * stride + 0.2 * (1 - stride);
    });
    torso.rotation.z = -(0.12 + 0.1 * effort) * stride; // lean into it
    torso.rotation.y = Math.sin(phase) * 0.12 * stride; // shoulders twist against the hips
    hips.rotation.y = -Math.sin(phase) * 0.08 * stride;
    head.rotation.z = (0.08 + 0.06 * effort) * stride; // eyes up the track
    body.position.y = Math.abs(Math.cos(phase)) * 0.045 * stride; // two bounces per stride
    if (parts.tail) parts.tail.rotation.x = Math.sin(phase * 2) * 0.35 * stride;
  }

  const baked = own ? BAKED.clone() : BAKED;
  bake(root, baked);
  animate(0, 0, false);
  return { group: root, animate, materials: own ? [baked] : [] };
}
