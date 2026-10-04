// The game's colors, from docs/STYLE_GUIDE.md §3 (the single source of truth for the look).
// Warm and slightly desaturated. You green is the only saturated color, and it's only for YOUR runner.
// Change colors in the style guide first, then here.

export const COLORS = {
  // Scene
  track: 0xc0654a, // terracotta
  trackEdge: 0x9e4f39, // curbs, inner edge
  lane: 0xf2ebda, // lane lines, finish line (cream, never pure white)
  infield: 0x8ca65a, // sage
  infieldStripe: 0x7f9a4f,
  ground: 0xd4c48a, // outer ground, the top of the diorama slab
  standCream: 0xe3d6b8,
  oak: 0x8b5a2b,
  oakDark: 0x6b4226,
  brass: 0xb8913f,
  roof: 0x2e4a3c,
  canopy: 0x8bae56,
  canopyDark: 0x6e8f45,
  pine: 0x2f5d55,
  trunk: 0x7a5534,
  earth1: 0xb8a788, // diorama slab side bands, top to bottom
  earth2: 0xa08f70,
  earth3: 0x85765a,
  haze: 0xeadfc6, // fog
  sun: 0xffe3b5,
  shadow: 0x3a3326, // blob shadows, at about 35%

  // Runners
  you: 0x34b98a, // YOUR runner only
  kits: [0xefe6d2, 0x2f4a7a, 0xb39cd0, 0x7a4e7e, 0x6fa8d6, 0x3b3a3f, 0xe39fae], // cream, navy, lavender, plum, sky, charcoal, rose

  // UI
  gold: 0xe8b84b, // highlights, kicking
  ink: 0x22304a,
};

// The track and field, in the real high school's colors (from the aerial photos): a red track,
// green turf, navy end zones, and a wide white border around the field. Slightly warmed per the style guide.
export const TRACK = {
  surface: 0xc8544a, // red running surface
  edge: 0xa5443c, // curbs
  lane: 0xf2ebda, // lane lines and field lines (cream, never pure white)
  accent: 0x2c3e73, // exchange-zone marks, the 1600 m start arc
  endZone: 0x2c3e73, // navy end zones (no lettering)
  turf: 0x6c9e47, // the whole infield is green turf
  turfStripe: 0x5f8f3f, // mowing-style stripes on the field
  walkway: 0x8a857c, // the gray asphalt band around the outside of the track
};

// The campus and hills around the stadium.
export const CAMPUS = {
  concrete: 0xc2bba9, // walkways, plazas, the pool deck
  asphalt: 0x6f6b64, // parking lots and roads
  aluminum: 0xcdc7bb, // bleachers
  building: 0xe3dccb, // school buildings (light, flat roofs)
  buildingShade: 0xc9c0ab, // building walls and roof trim, a step darker
  portable: 0xd9d3c6, // portable classrooms
  poolWater: 0x5fa8c9,
  sand: 0xdcc797, // sand volleyball courts, long jump pits
  courtAsphalt: 0x5a5752, // basketball courts
  solar: 0x3d5584, // solar panel canopies over the parking lots (blue, like the real ones)
  courtBlue: 0x4e78a8,
  courtRed: 0xb85a4c,
  lawn: 0x7fa356, // irrigated lawns and outfields
  clay: 0xc98a55, // baseball infield dirt
  dryGrass: 0xcdbb8a, // flat dry ground around campus
  scrub: 0x8a8a55, // chaparral on the hills
  scrubDark: 0x6e7046,
  hill: 0xbba779, // bare hillside
  palmFrond: 0x6e8f45,
  palmTrunk: 0x8b6a45,
  cars: [0xefe6d2, 0x3b3a3f, 0x6fa8d6, 0x8d99ae, 0xb39cd0, 0x7a4e7e, 0xa08f70],
};

// Extra shades for the crowd (not runners, so the kit rules don't apply): muted palette colors and skin tones.
export const CROWD = {
  shirts: [0xefe6d2, 0x2f4a7a, 0x6fa8d6, 0x7a4e7e, 0xb8913f, 0xe39fae],
  skin: [0xeac7a3, 0xcf9f72, 0x9a6a45, 0x6e4a32],
};

// Runners' own looks (web/runnerModel.js). Kits set the shirt and shorts; these vary everything else.
// No gold (it means kicking) and no green (it means you).
export const RUNNER_LOOKS = {
  skin: [0xeac7a3, 0xcf9f72, 0x9a6a45, 0x6e4a32, 0xdcb08a],
  hair: [0x2b2220, 0x4a3424, 0x7d4a2c, 0xa98258, 0x1c1c22],
  shoes: [0xefe6d2, 0x3b3a3f, 0xc8544a, 0x6fa8d6],
  bib: 0xf6f0e2,
};
