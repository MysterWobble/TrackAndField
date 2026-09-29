// The shape of a real 400 m track, and where a runner is on it.
//
// A standard track is two straights (84.39 m) joined by two half-circle bends. Runners in
// lane 1 run 30 cm out from the inside edge, which makes exactly 400 m per lap.
// Runners go counterclockwise, like real races. The finish line is at the end of the home
// straight (the one in front of the main stands, nearest the camera).
//
// Coordinates: x = left/right, z = toward/away from the camera, y = up. Meters.

export const STRAIGHT = 84.39;
export const INSIDE_RADIUS = 36.5; // inside edge of the track
export const LANE_WIDTH = 1.22;
export const LANES = 8;
export const RUNNING_LINE = INSIDE_RADIUS + 0.3; // where lane 1 is measured: 2 × 84.39 + 2π × 36.8 = 400 m
export const LAP = 2 * STRAIGHT + 2 * Math.PI * RUNNING_LINE;

const HALF = STRAIGHT / 2;

// Where you are after `distance` meters, `offset` meters out from the running line.
// Returns { x, z, heading }. heading = the Three.js rotation.y that turns a runner facing +x to face forward.
export function pointOnTrack(distance, offset = 0) {
  const r = RUNNING_LINE + offset;
  const bend = Math.PI * RUNNING_LINE; // length of one bend on the running line
  let s = ((distance % LAP) + LAP) % LAP;

  if (s < bend) {
    // Bend 1 (far right), curving from the home straight to the back straight.
    const a = s / RUNNING_LINE;
    return { x: HALF + r * Math.sin(a), z: r * Math.cos(a), heading: a };
  }
  s -= bend;
  if (s < STRAIGHT) {
    // Back straight (far side), running right to left.
    return { x: HALF - s, z: -r, heading: Math.PI };
  }
  s -= STRAIGHT;
  if (s < bend) {
    // Bend 2 (far left), curving back to the home straight.
    const a = s / RUNNING_LINE;
    return { x: -HALF - r * Math.sin(a), z: -r * Math.cos(a), heading: Math.PI + a };
  }
  s -= bend;
  // Home straight (near side), running left to right toward the finish line.
  return { x: -HALF + s, z: r, heading: 0 };
}

// Points around the whole oval at `radius` from the center of each bend (for drawing lines and shapes).
export function ovalOutline(radius, steps = 64) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI;
    points.push([HALF + radius * Math.sin(a), radius * Math.cos(a)]);
  }
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI;
    points.push([-HALF - radius * Math.sin(a), -radius * Math.cos(a)]);
  }
  return points;
}
