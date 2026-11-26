// MERAPI ASH RUN — Volcano Survey Flight
// Shared constants. All distances in metres, speeds in km/h, angles in degrees
// unless noted. No network, no external assets.

export const CFG = {
  seed: 7,
  // World
  worldSize: 4200, // ground plane spans -2100..2100 on x and z
  seaLevel: 0,
  // Flight model (arcade)
  minSpeed: 90, // km/h, stall below this
  maxSpeed: 320, // km/h at full throttle
  cruiseSpeed: 190,
  climbRate: 9, // m/s at full pitch up + full throttle
  sinkRate: 7, // m/s at full pitch down
  turnRate: 26, // deg/s at full bank
  maxBank: 42, // deg
  maxPitch: 24, // deg
  throttleStep: 0.25,
  groundClearance: 10, // crash if closer to terrain than this
  // Rings
  ringCount: 8,
  ringRadius: 26, // torus ring radius (m); pass if centre within 30m
  ringPassDist: 30,
  ringScore: 150,
  ringPerfectBonus: 50, // centre within 12m
  // Plumes
  plumeHitRadius: 34,
  plumeDamage: 25,
  // Fuel / time
  fuelMax: 100,
  fuelDrain: 0.55, // per second at full throttle (scaled by throttle)
  timeLimit: 180, // seconds
  // Scoring
  landingBonus: 400,
  timeBonusPerSec: 5,
  damageScorePenalty: 0,
  gradeBands: [
    [1400, 'S'],
    [1100, 'A'],
    [800, 'B'],
    [500, 'C'],
    [0, 'D'],
  ],
};

export const COLOURS = {
  skyTop: 0x2f6fb2,
  skyBottom: 0xbfe3f2,
  fog: 0xcfe5ef,
  sea: 0x2e7fa8,
  grassLow: 0x5da244,
  grassHigh: 0x7fae56,
  terrace: 0xc9b078,
  rock: 0x9a8f7a,
  crater: 0x6f675e,
  ash: 0x3d3a38,
  runway: 0x3a3f45,
  runwayMark: 0xf2f2f2,
  ring: 0xff7a1a,
  ringDone: 0x37d67a,
  gate: 0x2fd47a,
  planeWhite: 0xf4f6f8,
  planeRed: 0xd43d2a,
  planeOrange: 0xff8c1a,
  canopy: 0x1c5f8a,
};
