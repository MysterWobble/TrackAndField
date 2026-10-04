// Chunky block lettering and the big T, built from simple flat shapes (no font files, no textures).
// Fits the low-poly look, and it's all original, so there's no font license to worry about.
//
// Letters are drawn on a 4-wide, 6-tall grid with strokes 1 unit thick. Each piece is either a rectangle
// [x, y, width, height] or a polygon [[x, y], [x, y], ...]. Add a letter here if a new word needs one.

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const LETTERS = {
  A: [[0, 0, 1, 6], [3, 0, 1, 6], [1, 5, 2, 1], [1, 2.5, 2, 1]],
  B: [[0, 0, 1, 6], [1, 5, 2, 1], [1, 2.5, 2, 1], [1, 0, 2, 1], [3, 0.6, 1, 1.9], [3, 3.4, 1, 1.8]],
  E: [[0, 0, 1, 6], [1, 5, 3, 1], [1, 2.5, 2.5, 1], [1, 0, 3, 1]],
  F: [[0, 0, 1, 6], [1, 5, 3, 1], [1, 2.5, 2, 1]],
  G: [[0, 0, 1, 6], [1, 5, 3, 1], [1, 0, 3, 1], [3, 1, 1, 2.5], [2, 2.5, 1, 1]],
  H: [[0, 0, 1, 6], [3, 0, 1, 6], [1, 2.5, 2, 1]],
  I: [[1.5, 0, 1, 6], [0.5, 5, 3, 1], [0.5, 0, 3, 1]],
  L: [[0, 0, 1, 6], [1, 0, 3, 1]],
  M: [[0, 0, 1, 6], [3, 0, 1, 6], [[1, 6], [2, 3.2], [3, 6], [3, 4.4], [2, 1.6], [1, 4.4]]],
  N: [[0, 0, 1, 6], [3, 0, 1, 6], [[1, 6], [3, 1.5], [3, 0], [1, 4.5]]],
  O: [[0, 0, 1, 6], [3, 0, 1, 6], [1, 5, 2, 1], [1, 0, 2, 1]],
  R: [[0, 0, 1, 6], [1, 5, 2, 1], [1, 2.5, 2, 1], [3, 3.4, 1, 1.8], [[1.8, 2.5], [3, 2.5], [4, 0], [2.8, 0]]],
  S: [[0, 5, 4, 1], [0, 2.5, 4, 1], [0, 0, 4, 1], [0, 3, 1, 2.5], [3, 0.5, 1, 2.5]],
  T: [[0, 5, 4, 1], [1.5, 0, 1, 5]],
};
const ADVANCE = 5; // letter width plus a gap
const SPACE = 3;

// A piece as a flat shape, grown by `grow` units on every side (used to make outlines).
function pieceShape(piece, grow) {
  if (Array.isArray(piece[0])) {
    // Polygon: grow it outward from its middle.
    const cx = piece.reduce((sum, [x]) => sum + x, 0) / piece.length;
    const cy = piece.reduce((sum, [, y]) => sum + y, 0) / piece.length;
    const points = piece.map(([x, y]) => {
      const dx = x - cx;
      const dy = y - cy;
      const length = Math.hypot(dx, dy) || 1;
      return new THREE.Vector2(x + (dx / length) * grow * 1.4, y + (dy / length) * grow * 1.4);
    });
    return new THREE.Shape(points);
  }
  const [x, y, w, h] = piece;
  const shape = new THREE.Shape();
  shape.moveTo(x - grow, y - grow);
  shape.lineTo(x + w + grow, y - grow);
  shape.lineTo(x + w + grow, y + h + grow);
  shape.lineTo(x - grow, y + h + grow);
  shape.closePath();
  return shape;
}

// Flat block text in the x/y plane, centered on the origin, `height` meters tall.
// `grow` (in letter units) fattens every stroke, for drawing an outline behind the letters.
export function blockText(text, height, grow = 0) {
  const scale = height / 6;
  const pieces = [];
  let x = 0;
  for (const char of text.toUpperCase()) {
    if (char === " ") {
      x += SPACE;
      continue;
    }
    for (const piece of LETTERS[char] ?? []) {
      const moved = Array.isArray(piece[0]) ? piece.map(([px, py]) => [px + x, py]) : [piece[0] + x, piece[1], piece[2], piece[3]];
      pieces.push(new THREE.ShapeGeometry(pieceShape(moved, grow)));
    }
    x += ADVANCE;
  }
  const width = x - (ADVANCE - 4);
  return mergeGeometries(pieces).translate(-width / 2, -3, 0).scale(scale, scale, 1);
}

// The big college-style T: a top bar with angled ends, and a stem with a flared foot. 12 units tall.
const BIG_T = [[0, 12], [10, 12], [10, 8.5], [9, 9.5], [6.2, 9.5], [6.2, 1.2], [7.4, 0], [2.6, 0], [3.8, 1.2], [3.8, 9.5], [1, 9.5], [0, 8.5]];

// The big T as a flat shape in the x/y plane, centered, `height` meters tall.
// `grow` (in units of the 12-tall T) makes an outline: 8 copies shifted outward in every direction.
export function bigT(height, grow = 0) {
  const scale = height / 12;
  const shape = () => new THREE.ShapeGeometry(new THREE.Shape(BIG_T.map(([x, y]) => new THREE.Vector2(x, y)))).translate(-5, -6, 0);
  if (!grow) return shape().scale(scale, scale, 1);
  const copies = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    copies.push(shape().translate(Math.cos(a) * grow, Math.sin(a) * grow, 0));
  }
  return mergeGeometries(copies).scale(scale, scale, 1);
}
