// Fixed world layout for MERAPI ASH RUN. Hand-placed (not random) so the flight
// path, the rings and every staged shot compose well. Coordinates: x east,
// z south, y up (metres). The runway runs north-south at x = 0.

export const MERAPI = { x: -650, z: -750, peak: 820, radius: 800, crater: 120 };

export const RUNWAY = {
  x: 0,
  z: 900, // centre
  length: 600, // z from 600 to 1200
  width: 42,
  height: 42, // flattened ground height under the strip
  headingDeg: 180, // landing approach heads south (+z)
};

export const START = {
  x: 0,
  y: 300,
  z: 1250,
  headingDeg: 0, // north (-z)
  speedKmh: 190,
  throttle: 0.62,
};

// 8 ash-sampling rings: takeoff, climb west around the volcano, north loop,
// east descent, line up for landing. y is the ring centre altitude.
export const RINGS = [
  { x: 0, y: 300, z: 700 },
  { x: -150, y: 380, z: 250 },
  { x: -450, y: 500, z: -200 },
  { x: -1050, y: 620, z: -500 }, // skims the crater's west flank, clear of the cone
  { x: -1150, y: 700, z: -1000 },
  { x: 0, y: 520, z: -1120 },
  { x: 520, y: 420, z: -620 },
  { x: 340, y: 260, z: -40 }, // final, lined up for the approach
];

export const LANDING_GATE = { x: 0, y: 110, z: 420 };

// Ash plume columns: {x, z, baseY, topY, radius}. Hitting one costs damage.
export const PLUMES = [
  { x: -650, z: -750, baseY: 860, topY: 1450, radius: 36 }, // the crater itself
  { x: -330, z: -960, baseY: 520, topY: 920, radius: 30 },
  { x: 210, z: -820, baseY: 220, topY: 860, radius: 30 },
  { x: -920, z: -280, baseY: 380, topY: 700, radius: 28 },
];

// Village clusters (small houses with red roofs) near the runway.
export const VILLAGES = [
  { x: 320, z: 1010, houses: 9 },
  { x: -330, z: 1120, houses: 8 },
  { x: 620, z: 720, houses: 7 },
];

// Rice-terrace hills (stepped colour bands on the terrain + a few hut dots).
export const TERRACES = [
  { x: -180, z: 420, radius: 260 },
  { x: 720, z: -180, radius: 220 },
  { x: -1050, z: 500, radius: 240 },
];

// River polyline (valley carved into the terrain, water ribbon on top).
export const RIVER = [
  [-1050, -1250],
  [-700, -700],
  [-350, -250],
  [50, 250],
  [420, 800],
  [700, 1250],
];

// Staged screenshot poses: aircraft position + heading + pitch for each shot.
// The game renders exactly one frame at these poses in ?shot= mode.
export const SHOTS = {
  cover: { x: -40, y: 330, z: 980, headingDeg: 0, pitchDeg: 2, bankDeg: -6, throttle: 0.62 },
  rings: { x: -480, y: 620, z: -200, headingDeg: 298, pitchDeg: 3, bankDeg: -12, throttle: 0.7 },
  plume: { x: 100, y: 950, z: -100, headingDeg: 300, pitchDeg: -3, bankDeg: 6, throttle: 0.65 },
  landing: { x: 0, y: 150, z: 180, headingDeg: 180, pitchDeg: -4, bankDeg: 0, throttle: 0.4 },
};
