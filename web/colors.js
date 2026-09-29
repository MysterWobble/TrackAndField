// The game's colors (SPEC section 9: bright, energetic, friendly — a sunny school meet).
// Everything on screen should use these, or lighter/darker shades of them.

export const COLORS = {
  trackRed: 0xc8553d,
  infieldGreen: 0x5fa04e,
  skyBlue: 0x8ec9f0,
  laneWhite: 0xf7f4ea,
  you: 0x2ee66b, // YOUR runner: the "this is me" green (bright, so it pops on the red track)
  gold: 0xf2b33d, // highlights: kicking, personal bests
  navy: 0x1f2a44,
};

// Shades for things that need to stand apart from each other (grass outside the track, stands, crowd).
export const SHADES = {
  outerGrass: 0x4e8c40, // a darker infield green
  standConcrete: 0xd9d4c3, // a darker lane white
  seats: 0x33456b, // a lighter navy
  crowd: [COLORS.trackRed, COLORS.gold, COLORS.laneWhite, COLORS.skyBlue, 0x33456b, 0xe07a5f, 0x81b29a],
  // Computer runners. No greens here, so only YOU are green.
  runners: [0xe07a5f, 0x3d85c6, 0x9b5de5, 0xf28482, 0x6d6875, 0xf4a261, 0x8d99ae],
};
