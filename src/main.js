// Entry point for `npm run race`.
//
//   npm run race            -> random seed
//   npm run race -- 12345   -> replay seed 12345
//
// Right now this only proves the seeded random helper works.
// The race itself arrives in step 2.

import { createRandom, newSeed } from "./random.js";

const seedArg = process.argv[2];
const seed = seedArg === undefined ? newSeed() : Number(seedArg);

if (!Number.isInteger(seed)) {
  console.log(`"${seedArg}" isn't a whole number. Try: npm run race -- 12345`);
  process.exit(1);
}

const rng = createRandom(seed);

console.log(`Seed: ${seed}`);
console.log("Five dice rolls:", [1, 2, 3, 4, 5].map(() => rng.int(1, 6)).join(" "));
console.log("A decimal from 0 to 1:", rng.next().toFixed(4));
console.log("Shuffled lanes:", rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8]).join(" "));
console.log("\nRun it again with the same seed and every line above will match.");
