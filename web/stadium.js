// The stadium, modeled loosely on the real high school from aerial photos, in the low-poly style
// (docs/STYLE_GUIDE.md): a red track with a gray walkway around it, a green turf football field with navy
// end zones and a white border, long jump runways (south side and east curve), a red high jump apron in the
// west curve, home bleachers with a press box on the school (north) side, smaller visitor bleachers on the
// south side, a few little buildings beside them, light poles, and a scoreboard at the east end.
// The team name (Tigers) and the big T are shown; the school's own name is left out (designers' decision).
//
// Directions: north = -z (the far side of the screen), east = +x (right).

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { CAMPUS, CROWD, TRACK } from "./colors.js";
import { mat } from "./materials.js";
import { bigT, blockText } from "./lettering.js";
import { INSIDE_RADIUS, LANE_WIDTH, LANES, STRAIGHT, ovalOutline, pointOnTrack } from "./track.js";

export const OUTSIDE_RADIUS = INSIDE_RADIUS + LANES * LANE_WIDTH;
export const TRACK_HALF_LENGTH = STRAIGHT / 2 + OUTSIDE_RADIUS; // ~88.5 m: the track's far left/right edge
const WALKWAY_EDGE = OUTSIDE_RADIUS + 6; // the gray asphalt band ends here

// --- Flat shapes ---
// Flat pieces are drawn in x/y, then laid down on the ground. Laying down turns y into -z.

function ovalPath(radius, path = new THREE.Shape()) {
  ovalOutline(radius).forEach(([x, z], i) => (i === 0 ? path.moveTo(x, -z) : path.lineTo(x, -z)));
  path.closePath();
  return path;
}

export function layFlat(geometry, color, height) {
  const mesh = new THREE.Mesh(geometry, mat(color));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = height;
  return mesh;
}

// Many flat pieces of one color, merged into a single mesh (one draw call, STYLE_GUIDE.md §4).
export function flatPieces(pieces, color, height) {
  return layFlat(mergeGeometries(pieces), color, height);
}
export const rect = (x, z, width, depth, angle = 0) => new THREE.PlaneGeometry(width, depth).rotateZ(angle).translate(x, -z, 0);
export const disc = (x, z, radius, segments = 20) => new THREE.CircleGeometry(radius, segments).translate(x, -z, 0);
const ovalRing = (inner, outer) => {
  const shape = ovalPath(outer);
  shape.holes.push(ovalPath(inner, new THREE.Path()));
  return new THREE.ShapeGeometry(shape);
};
// A thin bar along the track at `distance` meters, across one lane (for exchange-zone marks).
const laneMark = (distance, lane) => {
  const offset = (lane + 0.5) * LANE_WIDTH - 0.3; // lane center, measured from the running line
  const { x, z, heading } = pointOnTrack(distance, offset);
  return new THREE.PlaneGeometry(0.25, LANE_WIDTH * 0.7).rotateZ(heading).translate(x, -z, 0);
};

// Boxes of one color, merged into a single mesh. Each box: [x, y, z, width, height, depth].
export function boxes(list, color) {
  return new THREE.Mesh(mergeGeometries(list.map(([x, y, z, w, h, d]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z))), mat(color));
}

// --- The track and the football field ---

// A US high school football field fits inside the track: 120 yards long, 53.3 yards wide.
const YARD = 0.9144;
const FIELD_HALF_LENGTH = 50 * YARD; // goal line
const END_ZONE = 10 * YARD;
const FIELD_HALF_WIDTH = (53.33 * YARD) / 2;
const BORDER = 1.8; // the wide white border around the field

function track() {
  const group = new THREE.Group();
  const lines = []; // cream: lane lines, finish line, field lines, the field border
  const accents = []; // navy: exchange-zone marks, the 1600 m start arc
  const stripes = [];
  const navy = []; // end zones and the team areas along the sidelines
  const runways = [];
  const sand = [];

  // The running track: lane lines, the finish line, relay exchange zones, and the curved 1600 m start.
  for (let lane = 0; lane <= LANES; lane++) {
    const r = INSIDE_RADIUS + lane * LANE_WIDTH;
    lines.push(ovalRing(r - 0.06, r + 0.06));
  }
  lines.push(rect(STRAIGHT / 2, (INSIDE_RADIUS + OUTSIDE_RADIUS) / 2, 0.6, OUTSIDE_RADIUS - INSIDE_RADIUS));
  for (const zoneCenter of [100, 200, 300]) {
    for (const edge of [-10, 10]) {
      for (let lane = 0; lane < LANES; lane++) accents.push(laneMark(zoneCenter + edge, lane));
    }
  }
  for (let lane = 0; lane < LANES; lane++) {
    accents.push(rect(STRAIGHT / 2 - 3 - 0.12 * lane * lane, INSIDE_RADIUS + (lane + 0.5) * LANE_WIDTH, 0.3, LANE_WIDTH));
  }

  // The football field: stripes every 5 yards, navy end zones, yard lines, a white border, and navy
  // team areas along both sidelines.
  for (let i = 0; i < 20; i += 2) stripes.push(rect(-FIELD_HALF_LENGTH + (i + 0.5) * 5 * YARD, 0, 5 * YARD, FIELD_HALF_WIDTH * 2));
  for (const side of [-1, 1]) {
    navy.push(rect(side * (FIELD_HALF_LENGTH + END_ZONE / 2), 0, END_ZONE, FIELD_HALF_WIDTH * 2));
    navy.push(rect(0, side * (FIELD_HALF_WIDTH + BORDER + 1.4), 50 * YARD, 2.4)); // team area, 25-yard line to 25-yard line
    const outerX = FIELD_HALF_LENGTH + END_ZONE;
    lines.push(rect(0, side * (FIELD_HALF_WIDTH + BORDER / 2), (outerX + BORDER) * 2, BORDER)); // border along the sidelines
    lines.push(rect(side * (outerX + BORDER / 2), 0, BORDER, FIELD_HALF_WIDTH * 2)); // border along the end lines
  }
  for (let yard = -45; yard <= 45; yard += 5) lines.push(rect(yard * YARD, 0, yard % 10 === 0 ? 0.3 : 0.18, FIELD_HALF_WIDTH * 2));
  lines.push(rect(0, 0, 0.35, FIELD_HALF_WIDTH * 2)); // the 50
  // Yard numbers, simplified to little blocks near each sideline.
  for (let yard = -40; yard <= 40; yard += 10) {
    for (const side of [-1, 1]) lines.push(rect(yard * YARD, side * (FIELD_HALF_WIDTH - 6), 2.2, 1.1));
  }

  // Long jump on the south side between the field and the track: two red runways and sand pits.
  for (const z of [31, 34]) {
    runways.push(rect(-20, z, 50, 1.3));
    lines.push(rect(5.5, z, 0.25, 1.3)); // takeoff boards
    sand.push(rect(10, z, 8, 2.6));
  }
  // Two more long jump runways and pits in the east curve, running north-south like the real ones.
  for (const x of [60, 63.5]) {
    runways.push(rect(x, 10.5, 1.3, 31));
    lines.push(rect(x, -3, 1.3, 0.25));
  }
  sand.push(rect(61.75, -9, 7, 8));
  // The west curve is paved red for the high jump and pole vault (the real one is too).
  const apronEdge = -(FIELD_HALF_LENGTH + END_ZONE + BORDER + 0.5);
  const radius = INSIDE_RADIUS - 0.5;
  const reach = Math.acos((apronEdge + STRAIGHT / 2) / radius); // where the curve meets the apron's straight edge
  const apron = new THREE.Shape();
  for (let i = 0; i <= 24; i++) {
    const a = reach + (i / 24) * (Math.PI * 2 - 2 * reach);
    const point = [-STRAIGHT / 2 + Math.cos(a) * radius, Math.sin(a) * radius];
    if (i === 0) apron.moveTo(...point);
    else apron.lineTo(...point);
  }
  apron.closePath();
  runways.push(new THREE.ShapeGeometry(apron));

  // Goal posts at each end line.
  const posts = [];
  for (const side of [-1, 1]) {
    const x = side * (FIELD_HALF_LENGTH + END_ZONE + BORDER + 0.6);
    posts.push([x, 1.5, 0, 0.3, 3, 0.3], [x, 3, 0, 0.3, 0.3, 5.6], [x, 6, -2.8, 0.25, 6, 0.25], [x, 6, 2.8, 0.25, 6, 0.25]);
  }

  group.add(
    flatPieces([ovalRing(OUTSIDE_RADIUS + 1.7, WALKWAY_EDGE)], TRACK.walkway, 0.02),
    flatPieces([ovalRing(INSIDE_RADIUS - 0.5, OUTSIDE_RADIUS + 1.2)], TRACK.surface, 0.03),
    flatPieces([ovalRing(INSIDE_RADIUS - 0.5, INSIDE_RADIUS), ovalRing(OUTSIDE_RADIUS + 1.2, OUTSIDE_RADIUS + 1.7)], TRACK.edge, 0.045),
    layFlat(new THREE.ShapeGeometry(ovalPath(INSIDE_RADIUS - 0.5)), TRACK.turf, 0.04),
    flatPieces(stripes, TRACK.turfStripe, 0.05),
    flatPieces(navy, TRACK.endZone, 0.05),
    flatPieces(runways, TRACK.surface, 0.055),
    flatPieces(sand, CAMPUS.sand, 0.06),
    flatPieces(lines, TRACK.lane, 0.065),
    flatPieces(accents, TRACK.accent, 0.07),
    boxes(posts, TRACK.lane),
    boxes([[-66, 0.45, -10, 5, 0.8, 6]], TRACK.accent), // the high jump landing mat
    teamName(),
  );
  return group;
}

// "TIGERS" in both end zones (red with a cream outline, reading from the field like real end zones),
// and the big T at midfield (red, with navy and cream outlines).
function teamName() {
  const group = new THREE.Group();
  const outlines = [];
  const letters = [];
  for (const side of [-1, 1]) {
    const x = side * (FIELD_HALF_LENGTH + END_ZONE / 2);
    const turn = side < 0 ? Math.PI / 2 : -Math.PI / 2; // letters' tops point out of the field
    outlines.push(blockText("TIGERS", 6.2, 0.35).rotateZ(turn).translate(x, 0, 0));
    letters.push(blockText("TIGERS", 6.2).rotateZ(turn).translate(x, 0, 0));
  }
  group.add(
    flatPieces(outlines, TRACK.lane, 0.058),
    flatPieces(letters, TRACK.surface, 0.062),
    flatPieces([bigT(11, 1.2)], TRACK.lane, 0.072),
    flatPieces([bigT(11, 0.6)], TRACK.accent, 0.074),
    flatPieces([bigT(11)], TRACK.surface, 0.076),
  );
  return group;
}

// Upright text on a wall, readable from in front. `facing` is the direction the text faces: "+z", "-z" or "-x".
export function wallText(text, height, color, x, y, z, facing = "+z") {
  const geometry = blockText(text, height); // faces +z to start with
  if (facing === "-z") geometry.rotateY(Math.PI);
  if (facing === "-x") geometry.rotateY(-Math.PI / 2);
  return new THREE.Mesh(geometry.translate(x, y, z), mat(color));
}

// --- Bleachers ---

// How big the fans are compared to real life (1.5 = 50% bigger, so they read from the stadium camera).
const CROWD_SCALE = 1.5;

// Aluminum bleachers built facing north (rising toward +z), with an optional press box and crowd.
// `fill` = how full the seats are (0 to 1).
function bleachers({ length, tiers, start, fill, pressBox }, random) {
  const group = new THREE.Group();
  const depth = 1.6;
  const rise = 0.85;
  const steps = [];
  const seatPlanks = [];
  const seats = [];
  for (let t = 0; t < tiers; t++) {
    const z = start + t * depth + depth / 2;
    const height = rise * (t + 1);
    steps.push([0, height / 2, z, length, height, depth]);
    seatPlanks.push([0, height + 0.08, z + 0.35, length, 0.16, 0.5]);
    for (let x = -length / 2 + 1; x < length / 2 - 1; x += 1.15) {
      if (random() < fill) seats.push([x + (random() - 0.5) * 0.3, height + 0.2, z + 0.35]);
    }
  }
  const top = rise * tiers;
  const back = start + tiers * depth;
  const railings = [
    [0, 1.1, start - 0.2, length, 0.12, 0.12], // front rail
    [0, top + 1.1, back - 0.1, length, 0.12, 0.12], // back rail
    [-length / 2, top / 2 + 0.6, start + (tiers * depth) / 2, 0.15, top + 1.2, tiers * depth], // end rails
    [length / 2, top / 2 + 0.6, start + (tiers * depth) / 2, 0.15, top + 1.2, tiers * depth],
  ];
  group.add(boxes(steps, CAMPUS.aluminum), boxes(seatPlanks, CAMPUS.buildingShade), boxes(railings, TRACK.accent));

  if (pressBox) {
    // The press box on top: a cream building with a red band, dark windows, and a flat navy roof.
    const y = top + 2.4;
    const z = back - 2.5;
    group.add(
      boxes([[0, y, z, 26, 4.2, 4.5], [-15.5, top / 2, z, 1, top, 1], [15.5, top / 2, z, 1, top, 1]], CAMPUS.building),
      boxes([[0, y + 1.5, z - 2.3, 26.2, 1.4, 0.15]], TRACK.surface),
      wallText("TIGERS FOOTBALL", 0.95, TRACK.lane, 0, y + 1.5, z - 2.4, "-z"), // front faces the track
      boxes([[0, y - 0.3, z - 2.3, 24, 1.1, 0.1]], TRACK.accent),
      boxes([[0, y + 2.3, z, 26.8, 0.4, 5]], TRACK.accent),
    );
  }

  // The crowd: a capsule body and a ball head each, as two instanced meshes (2 draw calls).
  const size = CROWD_SCALE;
  const bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.26 * size, 0.42 * size, 2, 6), new THREE.MeshLambertMaterial({ flatShading: true }), seats.length);
  const heads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22 * size, 0), new THREE.MeshLambertMaterial({ flatShading: true }), seats.length);
  const color = new THREE.Color();
  const fans = seats.map(([x, y, z], i) => {
    bodies.setColorAt(i, color.setHex(CROWD.shirts[Math.floor(random() * CROWD.shirts.length)]));
    heads.setColorAt(i, color.setHex(CROWD.skin[Math.floor(random() * CROWD.skin.length)]));
    return { x, y, z, phase: random() * Math.PI * 2, rate: 1.5 + random() * 1.5 };
  });
  group.add(bodies, heads);

  // Gentle bobbing, a few centimeters each and out of sync. Updated a few times a second to keep it cheap.
  const place = new THREE.Object3D();
  let lastUpdate = -1;
  function update(time) {
    if (time - lastUpdate < 0.12) return;
    lastUpdate = time;
    fans.forEach((fan, i) => {
      const bob = Math.max(0, Math.sin(time * fan.rate + fan.phase)) * 0.12 * size;
      place.position.set(fan.x, fan.y + 0.48 * size + bob, fan.z);
      place.updateMatrix();
      bodies.setMatrixAt(i, place.matrix);
      place.position.y = fan.y + 1.05 * size + bob;
      place.updateMatrix();
      heads.setMatrixAt(i, place.matrix);
    });
    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { group, update };
}

// --- Light poles and the scoreboard ---

function lightsAndScoreboard() {
  const group = new THREE.Group();
  const poles = [];
  const lamps = [];
  for (const x of [-64, 0, 64]) {
    for (const side of [-1, 1]) {
      if (x === 0 && side === -1) continue; // the press box sits there
      const z = side * (WALKWAY_EDGE + 2);
      poles.push([x, 12, z, 0.45, 24, 0.45]);
      lamps.push([x, 24.5, z - side * 0.6, 4.2, 2.2, 0.6]);
    }
  }
  // Scoreboard at the east end: a navy board on two posts, facing the field, with cream light panels.
  const x = TRACK_HALF_LENGTH + 9;
  group.add(
    boxes(poles, CAMPUS.aluminum),
    boxes(lamps, CAMPUS.building),
    boxes([[x, 3.5, -4, 0.5, 7, 0.5], [x, 3.5, 4, 0.5, 7, 0.5]], CAMPUS.aluminum),
    boxes([[x, 8.5, 0, 0.6, 5, 12]], TRACK.accent),
    boxes([[x - 0.35, 8.1, -3.5, 0.1, 1.2, 3], [x - 0.35, 8.1, 3.5, 0.1, 1.2, 3], [x - 0.35, 6.7, 0, 0.1, 0.9, 4]], CAMPUS.building),
    wallText("TIGERS", 1.6, TRACK.lane, x - 0.4, 9.9, 0, "-x"), // faces the field
  );
  return group;
}

const HOME = { length: 64, x: 2 };
const VISITORS = { length: 50, x: -17 };

export function buildStadium(random) {
  const group = new THREE.Group();
  // Home bleachers with the press box on the north (school) side: built facing north, then turned around.
  // Sizes and spots from the aerial photos: the home side a little east of center, the visitors a little west.
  const home = bleachers({ length: HOME.length, tiers: 10, start: WALKWAY_EDGE + 1, fill: 0.7, pressBox: true }, random);
  home.group.rotation.y = Math.PI;
  home.group.position.x = HOME.x;
  // Smaller visitor bleachers on the south side, a little emptier.
  const visitors = bleachers({ length: VISITORS.length, tiers: 6, start: WALKWAY_EDGE + 1, fill: 0.35, pressBox: false }, random);
  visitors.group.position.x = VISITORS.x;
  // Little buildings beside the stands: the team building and the snack bar on the home side,
  // the visitors' press box.
  const sheds = [
    [-40, 2.5, -60, 12, 5, 8],
    [46, 2, -59.5, 16, 4, 6],
    [24, 2.2, 57.5, 16, 4.4, 5],
  ];
  group.add(
    track(),
    home.group,
    visitors.group,
    lightsAndScoreboard(),
    boxes(sheds, CAMPUS.building),
    boxes(sheds.map(([x, y, z, w, h, d]) => [x, y * 2 + 0.2, z, w + 0.6, 0.4, d + 0.6]), TRACK.accent),
  );
  return {
    group,
    update(time) {
      home.update(time);
      visitors.update(time);
    },
  };
}

// Points the camera must keep on screen: the track with its walkway, and the tops of both bleachers.
export function stadiumFitPoints() {
  const points = ovalOutline(WALKWAY_EDGE, 12).map(([x, z]) => [x, 0, z]);
  const homeTop = -(WALKWAY_EDGE + 1 + 10 * 1.6);
  const visitorTop = WALKWAY_EDGE + 1 + 6 * 1.6;
  const homeEnd = HOME.length / 2;
  const visitorEnd = VISITORS.length / 2;
  points.push([HOME.x, 13, homeTop], [HOME.x - homeEnd, 9, homeTop], [HOME.x + homeEnd, 9, homeTop]);
  points.push([VISITORS.x - visitorEnd, 5, visitorTop], [VISITORS.x + visitorEnd, 5, visitorTop]);
  // Some of the campus too, so it reads as the school from the air: the TIGERS building facing the stadium.
  points.push([-11, 10, -114]);
  return points;
}
