// The high school campus and hills around the stadium, laid out from the designers' aerial screenshots of
// the real school, in the low-poly style. Nothing from the photos is used in the game; they were only a
// guide for where things go (docs/STYLE_GUIDE.md §8).
//
// What's where (north = -z, the far side of the screen; east = +x, right):
//   north of the home stands - sand volleyball and basketball courts, then a two-story building with
//                              TIGERS on it, the pool, and the main school buildings beyond
//   northeast                - 8 tennis courts, then a parking lot under solar panel canopies
//   west                     - a big parking lot (more solar canopies), lacrosse portables, the baseball field
//   northwest                - the hill with the big T on it, just past the baseball outfield wall
//   southwest and south      - a big lawn with a softball diamond, and a second softball field
//   east                     - a native plant garden, the road down the east side (it turns into a path),
//                              then a hill and the parkway cut into it
//
// The real stadium sits about 10° off true east-west. The school buildings line up with the track, so they're
// placed in the game's own directions. The "natural" layer (hills, roads, ball fields, the hill T) was
// measured north-up from the screenshots and is turned by TURN to match.

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { CAMPUS, TRACK } from "./colors.js";
import { mat } from "./materials.js";
import { boxes, disc, flatPieces, rect, wallText } from "./stadium.js";
import { bigT } from "./lettering.js";

const TURN = (10 * Math.PI) / 180;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

// --- The ground and hills (north-up meters, from the middle of the field) ---

// The flat valley floor the school is built in. Outside it the ground rises into hills.
const VALLEY = [
  [-140, -700], [-115, -330], [-114, -195], [-112, -110], // west edge of the parking lots
  [-248, -110], [-258, 15], [-205, 22], // around the baseball field (the T hill is north of it)
  [-205, 200], [-120, 215], [-20, 190], [60, 170], [96, 120], // the fields to the south
  [110, 30], [152, -40], [178, -120], [188, -300], [180, -700], // the plant garden, then along the road
];

// How far outside the valley floor a point is (0 if it's on the floor).
function distanceOutsideValley(x, z) {
  let inside = false;
  let nearest = Infinity;
  for (let i = 0, j = VALLEY.length - 1; i < VALLEY.length; j = i++) {
    const [ax, az] = VALLEY[i];
    const [bx, bz] = VALLEY[j];
    if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside;
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    nearest = Math.min(nearest, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return inside ? 0 : nearest;
}

// The parkway east of campus: a straight line, cut into the hills on a level shelf.
const highwayX = (z) => 233 - 0.245 * z;
const HIGHWAY_LEVEL = 5;

// Smooth, lumpy "noise" from a few overlapping waves (no randomness needed, so it's the same every time).
const lumps = (x, z) =>
  Math.sin(x * 0.013 + 1.3) * Math.cos(z * 0.011) + 0.5 * Math.sin(x * 0.031 - z * 0.027 + 2) + 0.25 * Math.sin(x * 0.07 + z * 0.05);
const smoothstep = (edge0, edge1, v) => {
  const t = Math.min(1, Math.max(0, (v - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

function groundHeight(x, z) {
  let h = smoothstep(0, 85, distanceOutsideValley(x, z)) * (46 + 20 * lumps(x, z));
  const cut = 1 - smoothstep(20, 48, Math.abs(x - highwayX(z)));
  h += (HIGHWAY_LEVEL - h) * cut;
  return h - 0.05; // just under the flat pieces laid on top
}

function terrain() {
  const geometry = new THREE.PlaneGeometry(1800, 1800, 130, 130).rotateX(-Math.PI / 2).toNonIndexed();
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) position.setY(i, groundHeight(position.getX(i), position.getZ(i)));

  // One flat color per face (STYLE_GUIDE.md §2): dry grass on the flat, then bare hillside and chaparral patches.
  const colors = new Float32Array(position.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < position.count; i += 3) {
    const x = (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3;
    const z = (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3;
    const y = (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3;
    const patch = lumps(z * 1.7 + 40, x * 1.9);
    if (y < 1) color.setHex(CAMPUS.dryGrass);
    else if (patch > 0.35) color.setHex(CAMPUS.scrubDark);
    else if (patch > -0.25) color.setHex(CAMPUS.scrub);
    else color.setHex(CAMPUS.hill);
    for (let k = 0; k < 3; k++) color.toArray(colors, (i + k) * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
}

// --- Roads and paths ---

// A flat strip along a line of points: one piece per stretch, with round joints so the bends don't gap.
function strip(points, width) {
  const pieces = [];
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1];
    const [bx, bz] = points[i];
    pieces.push(rect((ax + bx) / 2, (az + bz) / 2, Math.hypot(bx - ax, bz - az), width, Math.atan2(-(bz - az), bx - ax)));
    if (i > 1) pieces.push(disc(ax, az, width / 2, 10));
  }
  return pieces;
}

// Dashes down the middle of a line of points, every `gap` meters.
function dashes(points, offset = 0, gap = 10) {
  const pieces = [];
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1];
    const [bx, bz] = points[i];
    const length = Math.hypot(bx - ax, bz - az);
    const [ux, uz] = [(bx - ax) / length, (bz - az) / length];
    for (let d = gap / 2; d < length; d += gap) {
      pieces.push(rect(ax + ux * d - uz * offset, az + uz * d + ux * offset, gap * 0.4, 0.3, Math.atan2(-uz, ux)));
    }
  }
  return pieces;
}

// The road down the east side, which ends near the stadium and carries on south as a footpath.
const CREEK_ROAD = [[80, -470], [150, -354], [168, -283], [166, -195], [152, -124], [138, -60], [130, -25]];
const PATHS = [
  [[130, -25], [124, 60], [116, 140], [110, 220]],
  [[92, 30], [80, 90], [75, 150]], // from the stadium's southeast corner, past the plant garden
];

function roads(random) {
  // The parkway: two carriageways with a median, lane dashes, and a few cars.
  const ends = [[highwayX(-800), -800], [highwayX(600), 600]];
  const across = new THREE.Vector2(1, 0.245).normalize(); // sideways to the parkway
  const side = (offset) => ends.map(([x, z]) => [x + across.x * offset, z + across.y * offset]);
  const highway = [...strip(side(-9.5), 13), ...strip(side(9.5), 13)];
  const highwayLines = [...dashes(side(-9.5), 0, 12), ...dashes(side(9.5), 0, 12)];

  const cars = [];
  for (let i = 0; i < 16; i++) {
    const z = -500 + random() * 800;
    const lane = [-12.7, -6.3, 6.3, 12.7][Math.floor(random() * 4)];
    cars.push([highwayX(z) + across.x * lane, z + across.y * lane]);
  }
  const carMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 1.5, 4.4), new THREE.MeshLambertMaterial({ flatShading: true }), cars.length);
  const place = new THREE.Object3D();
  const color = new THREE.Color();
  cars.forEach(([x, z], i) => {
    place.position.set(x, HIGHWAY_LEVEL + 0.75, z);
    place.rotation.y = Math.atan2(-0.245, 1); // pointing along the parkway
    place.updateMatrix();
    carMesh.setMatrixAt(i, place.matrix);
    carMesh.setColorAt(i, color.setHex(CAMPUS.cars[Math.floor(random() * CAMPUS.cars.length)]));
  });

  const group = new THREE.Group();
  group.add(
    flatPieces(strip(CREEK_ROAD, 11), CAMPUS.asphalt, 0.012),
    flatPieces(dashes(CREEK_ROAD), TRACK.lane, 0.02),
    flatPieces(PATHS.flatMap((path) => strip(path, 3.5)), CAMPUS.concrete, 0.012),
    flatPieces(highway, CAMPUS.asphalt, HIGHWAY_LEVEL + 0.02),
    flatPieces(highwayLines, TRACK.lane, HIGHWAY_LEVEL + 0.04),
    carMesh,
  );
  return group;
}

// --- Baseball and softball ---

// One diamond: a lawn outfield fan, a dirt infield, a grass square inside the base paths, bases, foul lines,
// a backstop fence, and (for baseball) a navy outfield wall. `facing` = direction from home plate toward
// second base, in radians (0 = east, -PI/2 = north). `bases` = distance between bases.
function diamond({ home: [homeX, homeZ], facing, outfield, bases, wall = false }) {
  const lawn = [];
  const clay = [];
  const lines = [];
  const turn = -facing; // flat-shape space is mirrored in z, so angles flip
  // A point `distance` meters toward center field and `sideways` meters to the side.
  const along = (distance, sideways = 0) => [
    homeX + Math.cos(facing) * distance - Math.sin(facing) * sideways,
    homeZ + Math.sin(facing) * distance + Math.cos(facing) * sideways,
  ];
  const half = bases / Math.SQRT2; // first and third base sit this far out and this far to each side
  const fan = (radius) => new THREE.CircleGeometry(radius, 16, -Math.PI / 4, Math.PI / 2).rotateZ(turn).translate(homeX, -homeZ, 0);
  lawn.push(fan(outfield));
  clay.push(fan(bases * 1.06));
  const [cx, cz] = along(half);
  lawn.push(new THREE.PlaneGeometry(bases * 0.82, bases * 0.82).rotateZ(turn + Math.PI / 4).translate(cx, -cz, 0)); // grass infield
  clay.push(disc(...along(half * 0.95), bases * 0.1, 10), disc(homeX, homeZ, bases * 0.14, 10)); // pitcher's mound, home plate area
  for (const [x, z] of [along(half, half), along(half * 2), along(half, -half), [homeX, homeZ]]) lines.push(disc(x, z, 0.6, 4));
  for (const side of [-1, 1]) {
    const angle = facing + side * (Math.PI / 4); // foul lines run along the base paths and out to the fence
    lines.push(new THREE.PlaneGeometry(outfield, 0.2).translate(outfield / 2, 0, 0).rotateZ(-angle).translate(homeX, -homeZ, 0));
  }
  // The backstop fence behind home plate, side-on to the field.
  const fence = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, bases * 0.55), mat(CAMPUS.aluminum));
  const [fx, fz] = along(-bases * 0.2);
  fence.position.set(fx, 2.5, fz);
  fence.rotation.y = -facing;

  const group = new THREE.Group();
  group.add(flatPieces(lawn, CAMPUS.lawn, 0.012), flatPieces(clay, CAMPUS.clay, 0.02), flatPieces(lines, TRACK.lane, 0.025), fence);

  if (wall) {
    // The padded outfield wall: short straight pieces around the edge of the fan.
    const pieces = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const a = facing - Math.PI / 4 + ((i + 0.5) / count) * (Math.PI / 2);
      const length = 2 * outfield * Math.sin(Math.PI / 4 / count) + 0.3;
      pieces.push(new THREE.BoxGeometry(length, 2.4, 0.4).rotateY(-(a + Math.PI / 2)).translate(homeX + Math.cos(a) * outfield, 1.2, homeZ + Math.sin(a) * outfield));
    }
    group.add(new THREE.Mesh(mergeGeometries(pieces), mat(TRACK.accent)));
  }
  return group;
}

// A flat lawn from a list of [x, z] corners.
const lawnShape = (corners) => new THREE.ShapeGeometry(new THREE.Shape(corners.map(([x, z]) => new THREE.Vector2(x, -z))));

function fields() {
  const group = new THREE.Group();
  group.add(
    // Baseball, west of the stadium: home plate to the south, the outfield wall backing onto the T hill.
    diamond({ home: [-176, -2], facing: -1.35, outfield: 95, bases: 27.4, wall: true }),
    // Its little scoreboard behind the wall, at the foot of the hill.
    boxes([[-152, 2, -104, 0.3, 4, 0.3], [-146, 2, -104, 0.3, 4, 0.3]], CAMPUS.aluminum),
    boxes([[-149, 4.6, -104, 8, 2.6, 0.4]], TRACK.accent),
    // The big lawn to the southwest, with a softball diamond in its far corner.
    flatPieces([lawnShape([[-180, 28], [-92, 32], [-46, 170], [-180, 180]])], CAMPUS.lawn, 0.008),
    diamond({ home: [-165, 172], facing: -0.9, outfield: 62, bases: 18.3 }),
    // The second softball field, south of the stadium, home plate on its east side.
    flatPieces([lawnShape([[-68, 74], [6, 66], [10, 150], [-62, 160]])], CAMPUS.lawn, 0.008),
    diamond({ home: [-2, 100], facing: 2.6, outfield: 56, bases: 18.3 }),
  );
  return group;
}

// --- Scrub ---

function scrub(random) {
  const blobs = [];
  // Chaparral scattered over the hills (not on the parkway).
  while (blobs.length < 330) {
    const x = -450 + random() * 900;
    const z = -650 + random() * 1000;
    if (distanceOutsideValley(x, z) > 3 && Math.abs(x - highwayX(z)) > 22) blobs.push([x, z]);
  }
  // The native plant garden east of the stadium, between the paths.
  for (let i = 0; i < 45; i++) blobs.push([96 + random() * 18, -10 + random() * 150]);
  for (let i = 0; i < 30; i++) blobs.push([134 + random() * 20, -10 + random() * 150]);

  const blob = mergeGeometries([
    new THREE.IcosahedronGeometry(2.6, 0).translate(0, 2, 0),
    new THREE.IcosahedronGeometry(1.8, 0).translate(1.8, 1.6, 0.6),
    new THREE.IcosahedronGeometry(1.7, 0).translate(-1.5, 1.5, -0.7),
  ]);
  const mesh = new THREE.InstancedMesh(blob, new THREE.MeshLambertMaterial({ flatShading: true }), blobs.length);
  const place = new THREE.Object3D();
  const color = new THREE.Color();
  blobs.forEach(([x, z], i) => {
    place.position.set(x, groundHeight(x, z), z);
    place.rotation.set(0, random() * Math.PI * 2, 0);
    place.scale.setScalar(0.8 + random() * 0.8);
    place.updateMatrix();
    mesh.setMatrixAt(i, place.matrix);
    mesh.setColorAt(i, color.setHex(random() < 0.6 ? CAMPUS.scrubDark : CAMPUS.scrub));
  });
  return mesh;
}

// --- The big T on the hill ---

// The real one is a white T on the hillside just north of the baseball outfield. Ours is red with a cream
// outline, and about four times bigger, so it reads from the air.
const HILL_T = { x: -176, z: -144, height: 22 };

// Where the hill T sits and which way it faces: lying on the hillside, its top pointing uphill.
function hillTPlacement() {
  const { x, z } = HILL_T;
  const step = 12; // measure the slope over roughly the T's size, so it sits flat on the average hillside
  const slopeX = (groundHeight(x + step, z) - groundHeight(x - step, z)) / (2 * step);
  const slopeZ = (groundHeight(x, z + step) - groundHeight(x, z - step)) / (2 * step);
  const normal = new THREE.Vector3(-slopeX, 1, -slopeZ).normalize(); // straight out of the hillside
  const up = new THREE.Vector3(0, 1, 0).addScaledVector(normal, -normal.y).normalize(); // uphill, along the slope
  const right = new THREE.Vector3().crossVectors(up, normal);
  const center = new THREE.Vector3(x, groundHeight(x, z), z).addScaledVector(normal, 1.2); // lifted a little so bumps don't poke through
  return { center, normal, up, right };
}

// The hill T's four corners in the game's directions, so the menu camera can keep it in the picture.
export function hillTFitPoints() {
  const { center, up, right } = hillTPlacement();
  const half = HILL_T.height / 2;
  return [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) =>
    center.clone().addScaledVector(right, sx * half * 0.85).addScaledVector(up, sy * half).applyAxisAngle(Y_AXIS, TURN).toArray(),
  );
}

function hillT() {
  const { height } = HILL_T;
  const { center, normal, up, right } = hillTPlacement();
  const group = new THREE.Group();
  const outline = new THREE.Mesh(bigT(height, 0.9), mat(TRACK.lane));
  const letter = new THREE.Mesh(bigT(height), mat(TRACK.surface));
  letter.position.z = 0.15; // just in front of its outline
  group.add(outline, letter);
  group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, normal));
  group.position.copy(center);
  return group;
}

// --- School buildings, courts and parking (in the game's directions, lined up with the track) ---

// Flat-roofed buildings: [x, z, width, height, depth]. Walls a step darker than the roofs, with little
// boxes on the roofs (air conditioners), a classic aerial detail.
function buildings(list, random) {
  const walls = list.map(([x, z, w, h, d]) => [x, h / 2, z, w, h, d]);
  const roofs = list.map(([x, z, w, h, d]) => [x, h + 0.35, z, w + 1, 0.7, d + 1]);
  const roofUnits = [];
  for (const [x, z, w, h, d] of list) {
    const count = Math.round((w * d) / 500);
    for (let i = 0; i < count; i++) roofUnits.push([x + (random() - 0.5) * w * 0.8, h + 1.2, z + (random() - 0.5) * d * 0.8, 2.4, 1.2, 1.8]);
  }
  const group = new THREE.Group();
  group.add(boxes(walls, CAMPUS.buildingShade), boxes(roofs, CAMPUS.building), boxes(roofUnits, CAMPUS.aluminum));
  return group;
}

// Parking lots with painted stalls, parked cars, and solar panel canopies on posts.
function parking(lots, canopies, random) {
  const stallLines = [];
  const cars = [];
  for (const lot of lots) {
    for (let row = 0; row * 14 < lot.depth - 6; row++) {
      const z = lot.z - lot.depth / 2 + 7 + row * 14;
      for (let x = lot.x - lot.width / 2 + 3; x < lot.x + lot.width / 2 - 2; x += 3) {
        stallLines.push(rect(x - 1.5, z, 0.15, 5.5));
        if (random() < 0.5) cars.push([x, z]);
      }
    }
  }
  const carMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 1.5, 4.4), new THREE.MeshLambertMaterial({ flatShading: true }), cars.length);
  const place = new THREE.Object3D();
  const color = new THREE.Color();
  cars.forEach(([x, z], i) => {
    place.position.set(x, 0.75, z + (random() - 0.5) * 0.6);
    place.updateMatrix();
    carMesh.setMatrixAt(i, place.matrix);
    carMesh.setColorAt(i, color.setHex(CAMPUS.cars[Math.floor(random() * CAMPUS.cars.length)]));
  });

  // Canopies: [x, z, width, depth], a tilted-looking panel roof on a row of posts.
  const posts = [];
  for (const [x, z, , depth] of canopies) {
    for (let d = -depth / 2 + 4; d < depth / 2; d += 10) posts.push([x, 2, z + d, 0.3, 4, 0.3]);
  }
  const group = new THREE.Group();
  group.add(
    flatPieces(lots.map((l) => rect(l.x, l.z, l.width, l.depth)), CAMPUS.asphalt, 0.012),
    flatPieces(stallLines, TRACK.lane, 0.02),
    carMesh,
    boxes(posts, CAMPUS.aluminum),
    boxes(canopies.map(([x, z, w, d]) => [x, 4.3, z, w, 0.35, d]), CAMPUS.solar),
  );
  return group;
}

// Volleyball, basketball and tennis courts.
function courts() {
  const sand = [rect(-21, -93, 48, 30)];
  const asphalt = [rect(19, -93, 32, 30)];
  const red = [];
  const blue = [];
  const lines = [];
  const nets = [];
  const posts = [];
  const outline = (x, z, w, d, t = 0.12) => [rect(x, z - d / 2, w, t), rect(x, z + d / 2, w, t), rect(x - w / 2, z, t, d), rect(x + w / 2, z, t, d)];

  // Three sand volleyball courts.
  for (const x of [-37, -21, -5]) {
    lines.push(...outline(x, -93, 8, 16, 0.1));
    nets.push([x, 2.1, -93, 9, 0.9, 0.06]);
    posts.push([x - 4.6, 1.25, -93, 0.15, 2.5, 0.15], [x + 4.6, 1.25, -93, 0.15, 2.5, 0.15]);
  }
  // Two basketball courts with hoops.
  for (const x of [11, 27]) {
    lines.push(...outline(x, -93, 14, 26), rect(x, -93, 14, 0.12), ...outline(x, -93 - 10.5, 4.9, 5, 0.1), ...outline(x, -93 + 10.5, 4.9, 5, 0.1));
    for (const end of [-1, 1]) {
      posts.push([x, 1.6, -93 + end * 13.4, 0.15, 3.2, 0.15]);
      nets.push([x, 3.1, -93 + end * 13.1, 1.8, 1.1, 0.08]);
    }
  }
  // Eight tennis courts in two rows: blue courts in red surrounds, with cream lines and navy nets.
  for (const z of [-129, -87]) {
    red.push(rect(76, z, 78, 41.5));
    for (const x of [46.75, 66.25, 85.75, 105.25]) {
      blue.push(rect(x, z, 14, 30));
      lines.push(...outline(x, z, 10.97, 23.77));
      lines.push(rect(x - 4.115, z, 0.1, 23.77), rect(x + 4.115, z, 0.1, 23.77)); // singles sidelines
      lines.push(rect(x, z - 6.4, 8.23, 0.1), rect(x, z + 6.4, 8.23, 0.1), rect(x, z, 0.1, 12.8)); // service boxes
      nets.push([x, 0.5, z, 12.8, 1, 0.06]);
    }
  }
  const group = new THREE.Group();
  group.add(
    flatPieces(sand, CAMPUS.sand, 0.015),
    flatPieces(asphalt, CAMPUS.courtAsphalt, 0.015),
    flatPieces(red, CAMPUS.courtRed, 0.015),
    flatPieces(blue, CAMPUS.courtBlue, 0.02),
    flatPieces(lines, TRACK.lane, 0.025),
    boxes(nets, TRACK.lane),
    boxes(posts, CAMPUS.aluminum),
  );
  return group;
}

function palms(random) {
  const spots = [];
  for (let x = -40; x <= 30; x += 10) spots.push([x, -74.5]); // the plaza behind the home stands
  for (const z of [-100, -120, -140]) spots.push([34, z]); // between the courts
  for (const z of [-120, -140, -160]) spots.push([-50, z]); // by the west parking lot
  for (let z = -195; z >= -295; z -= 25) spots.push([56, z]); // along the east parking lot
  for (let z = -40; z <= 40; z += 20) spots.push([113, z]); // the east walkway
  spots.push([-60, 70], [40, 70], [-48, -60], [60, -60]);

  const trunk = new THREE.CylinderGeometry(0.3, 0.45, 10, 5).translate(0, 5, 0);
  const fronds = mergeGeometries(
    Array.from({ length: 7 }, (_, i) =>
      new THREE.BoxGeometry(4.2, 0.15, 1)
        .translate(2.1, 0, 0)
        .rotateZ(-0.35)
        .rotateY((i / 7) * Math.PI * 2)
        .translate(0, 10, 0),
    ),
  );
  const trunks = new THREE.InstancedMesh(trunk, mat(CAMPUS.palmTrunk), spots.length);
  const crowns = new THREE.InstancedMesh(fronds, mat(CAMPUS.palmFrond), spots.length);
  const place = new THREE.Object3D();
  spots.forEach(([x, z], i) => {
    place.position.set(x + (random() - 0.5) * 2, 0, z + (random() - 0.5) * 2);
    place.rotation.set((random() - 0.5) * 0.15, random() * Math.PI * 2, (random() - 0.5) * 0.15);
    place.scale.setScalar(0.9 + random() * 0.3);
    place.updateMatrix();
    trunks.setMatrixAt(i, place.matrix);
    crowns.setMatrixAt(i, place.matrix);
  });
  const group = new THREE.Group();
  group.add(trunks, crowns);
  return group;
}

function school(random) {
  const group = new THREE.Group();
  group.add(
    // Concrete: the plaza behind the home stands, the walk in front of the TIGERS building, the pool deck,
    // the grounds around the main buildings, and the walkway along the east end.
    flatPieces(
      [rect(2, -74, 84, 8), rect(-5, -111, 100, 6), rect(5, -255, 150, 170), rect(106, 0, 6, 110)],
      CAMPUS.concrete,
      0.01,
    ),
    flatPieces([rect(7, -174, 42, 26)], CAMPUS.concrete, 0.013),
    flatPieces([rect(7, -174, 28, 16)], CAMPUS.poolWater, 0.02),
    flatPieces([rect(-56, -95, 20, 40)], CAMPUS.lawn, 0.01),
    courts(),
    // The two-story building facing the stadium, with TIGERS on a navy band.
    buildings([[-11, -134, 66, 10, 40]], random),
    boxes([[-11, 6.4, -113.8, 30, 4.6, 0.2]], TRACK.accent),
    wallText("TIGERS", 3.2, TRACK.lane, -11, 6.4, -113.6),
    // The main school buildings around and beyond the pool.
    buildings(
      [
        [5, -198, 70, 9, 22],
        [-30, -174, 20, 7, 26],
        [44, -174, 24, 8, 30],
        [-30, -250, 56, 11, 60],
        [32, -255, 56, 12, 66],
        [0, -335, 110, 10, 56],
        [-42, -300, 26, 8, 22],
      ],
      random,
    ),
    // Lacrosse portables between the baseball field and the track, and the little buildings by home plate.
    boxes([[-94, 1.8, -54, 15, 3.6, 7], [-94, 1.8, -46, 15, 3.6, 7], [-94, 1.8, -38, 15, 3.6, 7]], CAMPUS.portable),
    boxes([[-128, 1.5, 16, 8, 3, 5], [-116, 2, 26, 10, 4, 6]], CAMPUS.portable),
    parking(
      [
        { x: -99, z: -127, width: 62, depth: 116 }, // the big lot west of the courts
        { x: -82, z: -290, width: 36, depth: 200 }, // the long lot up the west side of the school
        { x: 84, z: -240, width: 48, depth: 120 }, // the east lot by the road
      ],
      [
        [-73, -95, 9, 50],
        [-70, -290, 8, 150],
        [70, -240, 9, 100],
        [84, -240, 9, 100],
        [98, -240, 9, 100],
      ],
      random,
    ),
    palms(random),
  );
  return group;
}

export function buildCampus(random) {
  // The natural layer is measured north-up, then turned to line up with the track.
  const natural = new THREE.Group();
  natural.add(terrain(), roads(random), fields(), scrub(random), hillT());
  natural.rotation.y = TURN;

  const group = new THREE.Group();
  group.add(natural, school(random));
  return group;
}
