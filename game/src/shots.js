// Staged screenshots for MERAPI ASH RUN. In ?shot=<name>&seed=7 mode the game
// renders exactly one frame at a fixed pose and time, then sets
// window.__shotReady = true, so captures are byte-identical across runs.

import { SHOTS, RINGS } from './data.js';
import { CFG } from './config.js';

export function shotState(name, seed) {
  const pose = SHOTS[name] || SHOTS.cover;
  // Rings "already collected" per shot, so the HUD tells the story:
  // cover 0/8, rings 3/8 (mid-flight), plume 4/8, landing 8/8.
  const doneByShot = { cover: 0, rings: 3, plume: 4, landing: 8 };
  const ringsDone = doneByShot[name] ?? 0;
  const state = {
    x: pose.x,
    y: pose.y,
    z: pose.z,
    headingDeg: pose.headingDeg,
    pitchDeg: pose.pitchDeg,
    bankDeg: pose.bankDeg,
    speedKmh: 190 + (name === 'landing' ? -70 : 0),
    throttle: pose.throttle,
    propSpin: 0.6,
    phase: 'flying',
    score: ringsDone * 150 + (name === 'landing' ? 400 : 0),
    ringsDone,
    fuel: name === 'landing' ? 34 : 78,
    damage: name === 'plume' ? 25 : 0,
    timeLeft: name === 'landing' ? 41 : 150,
    altitude: pose.y - 40,
    messages: [],
    nextRingDist: 0,
    nextRingBearing: 0,
    endTitle: '',
    grade: '',
    endTimeText: '',
  };
  if (name === 'cover') {
    state.nextRingDist = 285; // true 3D distance to ring 1 from the cover pose
    state.nextRingBearing = 8;
  } else if (name === 'rings') {
    state.messages = [{ text: 'RING 3/8  +150', color: '#37d67a', age: 0.4 }];
    state.nextRingDist = 644; // true 3D distance to ring 4 from the rings pose
    state.nextRingBearing = 0;
  } else if (name === 'plume') {
    state.messages = [{ text: 'KOLOM ABU! HINDARI', color: '#ff5a3c', age: 0.3 }];
    state.nextRingDist = 1560; // true 3D distance to ring 5 from the plume pose
    state.nextRingBearing = 6;
  } else if (name === 'landing') {
    state.messages = [{ text: 'SEMUA RING TERKUMPUL — MENDARAT!', color: '#37d67a', age: 0.5 }];
    state.nextRingDist = 0;
  }
  // The altitude shown is height above the terrain at the pose.
  state.altitude = pose.y;
  return state;
}

export function shotElapsed(name) {
  // Fixed animation time per shot so clouds/rings/pulse freeze identically.
  return { cover: 12, rings: 24, plume: 36, landing: 48 }[name] ?? 12;
}

export const SHOT_NAMES = ['cover', 'rings', 'plume', 'landing'];
export const SHOT_FILES = ['1-cover.jpg', '2-rings.jpg', '3-plume.jpg', '4-landing.jpg'];
export const SHOT_SEED = CFG.seed;
