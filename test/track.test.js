// Automatic checks for the 3D track shape. Run with: npm.cmd test

import { test } from "node:test";
import assert from "node:assert/strict";
import { LAP, pointOnTrack } from "../web/track.js";

test("one lap of the running line is 400 m", () => {
  assert.ok(Math.abs(LAP - 400) < 0.05, `lap is ${LAP} m`);
});

test("walking around the track never jumps (straights and bends join up)", () => {
  let previous = pointOnTrack(0);
  for (let d = 0.5; d <= 800; d += 0.5) {
    const point = pointOnTrack(d);
    const step = Math.hypot(point.x - previous.x, point.z - previous.z);
    assert.ok(step < 0.51, `jumped ${step.toFixed(2)} m at ${d} m`);
    previous = point;
  }
});

test("runners face the way they're moving", () => {
  for (let d = 1; d < 400; d += 7) {
    const here = pointOnTrack(d);
    const ahead = pointOnTrack(d + 0.1);
    // A runner facing +x turned by rotation.y = heading faces (cos h, -sin h) in x/z.
    const facing = [Math.cos(here.heading), -Math.sin(here.heading)];
    const moving = [(ahead.x - here.x) / 0.1, (ahead.z - here.z) / 0.1];
    const dot = facing[0] * moving[0] + facing[1] * moving[1];
    assert.ok(dot > 0.99, `at ${d} m the runner faces the wrong way (dot ${dot.toFixed(2)})`);
  }
});

test("the finish line is at the end of the home straight, nearest the camera", () => {
  const finish = pointOnTrack(0);
  assert.ok(finish.z > 30 && finish.x > 40);
});
