// Converting between the units people read (mph, 6:45.2) and the ones the sim uses (meters, seconds).

import { tuning } from "../data/tuning.js";

const METERS_PER_SECOND_PER_MPH = 0.44704;

export function raceMeters() {
  return tuning.lapMeters * tuning.laps;
}

export function mphToMetersPerSecond(mph) {
  return mph * METERS_PER_SECOND_PER_MPH;
}

// A pace like 6:45 (405 seconds for the whole race) -> the speed in mph that runs it.
export function paceToMph(paceSeconds) {
  return raceMeters() / paceSeconds / METERS_PER_SECOND_PER_MPH;
}

// 405.23 -> "6:45.2"
export function formatTime(seconds) {
  const tenths = Math.round(seconds * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = (tenths % 600) / 10;
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
}
