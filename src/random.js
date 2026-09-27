// Seeded random numbers.
//
// Math.random() gives different numbers every time, so a weird race can never
// be replayed. Instead we use a "seed": a starting number that fully decides
// every random number after it. Same seed -> same numbers -> same race.
// That's what makes the Daily Race fair (everyone gets the same seed) and lets
// us replay any race that did something strange.
//
// The math inside next() is a well-known small generator called "mulberry32".
// You don't need to understand those lines. Just know: seed in, a long
// predictable-but-random-looking list of numbers out.

export function createRandom(seed) {
  let state = seed >>> 0; // force the seed into a whole number the math can use

  // A number from 0 (included) up to 1 (not included). Everything else below is built on this.
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // A decimal number between min and max. range(5, 10) might give 7.31.
  function range(min, max) {
    return min + next() * (max - min);
  }

  // A whole number from min to max, both included. int(1, 6) is a dice roll.
  function int(min, max) {
    return min + Math.floor(next() * (max - min + 1));
  }

  // True with the given chance. chance(0.3) is true about 30% of the time.
  function chance(probability) {
    return next() < probability;
  }

  // One random item from a list.
  function pick(list) {
    return list[Math.floor(next() * list.length)];
  }

  // A shuffled copy of a list (the original list is left alone).
  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  return { seed, next, range, int, chance, pick, shuffle };
}

// A fresh seed for when the player didn't ask for a specific one.
export function newSeed() {
  return Math.floor(Math.random() * 1_000_000);
}
