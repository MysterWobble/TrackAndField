// One shared matte material per color (docs/STYLE_GUIDE.md §4).
// Lambert is cheaper than Standard and matte by default; flat shading gives each face one solid color.
//
// Never change a shared material while the game runs: every object using that color would change too.
// Anything that changes (like YOUR runner's kick glow) gets its own copy: mat(hex).clone().

import * as THREE from "three";

const cache = new Map();

export function mat(hex) {
  if (!cache.has(hex)) cache.set(hex, new THREE.MeshLambertMaterial({ color: hex, flatShading: true }));
  return cache.get(hex);
}
