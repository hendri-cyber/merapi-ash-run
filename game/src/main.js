// MERAPI ASH RUN — game logic. Fixed-timestep (1/60s) arcade flight: bank to
// turn, pitch to climb/descend, W/S throttle. One ring at a time, in order;
// ash plumes cost damage; finish all 8 rings, then fly the landing gate (or
// touch down on the runway) to score. All sounds are WebAudio synth in code.

import { CFG } from './config.js';
import { RINGS, LANDING_GATE, PLUMES, RUNWAY, START } from './data.js';
import { heightAt } from './world.js';
import { createRenderer } from './render3d.js';
import { createInput } from './input.js';
import { shotState, shotElapsed } from './shots.js';

const DEG = Math.PI / 180;
const STEP = 1 / 60;

function freshState() {
  return {
    x: START.x,
    y: START.y,
    z: START.z,
    headingDeg: START.headingDeg,
    pitchDeg: 0,
    bankDeg: 0,
    speedKmh: START.speedKmh,
    throttle: START.throttle,
    propSpin: 0,
    phase: 'menu',
    score: 0,
    ringsDone: 0,
    fuel: CFG.fuelMax,
    damage: 0,
    timeLeft: CFG.timeLimit,
    altitude: START.y - heightAt(START.x, START.z),
    messages: [],
    nextRingDist: 0,
    nextRingBearing: 0,
    endTitle: '',
    grade: '',
    endTimeText: '',
    plumeCooldown: 0,
    elapsed: 0,
  };
}

function gradeFor(score) {
  for (const [min, g] of CFG.gradeBands) if (score >= min) return g;
  return 'D';
}

function fmtTime(t) {
  const m = Math.floor(Math.max(0, t) / 60);
  const s = Math.floor(Math.max(0, t) % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// --- Tiny synth: engine hum, ring chime, warning blip. No audio files. ---
function createAudio() {
  let ctx = null;
  let humOsc = null;
  let humGain = null;
  return {
    ensure() {
      try {
        if (!ctx) {
          ctx = new (window.AudioContext || window.webkitAudioContext)();
          humOsc = ctx.createOscillator();
          humOsc.type = 'sawtooth';
          humOsc.frequency.value = 70;
          humGain = ctx.createGain();
          humGain.gain.value = 0.0;
          const filt = ctx.createBiquadFilter();
          filt.type = 'lowpass';
          filt.frequency.value = 320;
          humOsc.connect(filt);
          filt.connect(humGain);
          humGain.connect(ctx.destination);
          humOsc.start();
        }
        if (ctx.state === 'suspended') ctx.resume();
      } catch (e) { /* audio is decoration; never break the game */ }
    },
    hum(throttle, on) {
      if (!ctx || !humGain) return;
      humGain.gain.value = on ? 0.025 + throttle * 0.02 : 0.0;
      if (humOsc) humOsc.frequency.value = 60 + throttle * 55;
    },
    blip(freq, dur = 0.12, type = 'sine', vol = 0.12) {
      try {
        if (!ctx) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + dur);
      } catch (e) { /* ignore */ }
    },
    chime() {
      this.blip(880, 0.14);
      setTimeout(() => this.blip(1318, 0.2), 90);
    },
    warn() {
      this.blip(220, 0.18, 'square', 0.1);
      setTimeout(() => this.blip(180, 0.22, 'square', 0.1), 140);
    },
  };
}

function main() {
  const params = new URLSearchParams(location.search);
  const shotName = params.get('shot');
  const canvas3d = document.getElementById('gl');
  const canvasHud = document.getElementById('hud');
  const { render } = createRenderer(canvas3d, canvasHud);

  // --- Staged screenshot mode: one fixed frame, then signal readiness. ---
  if (shotName) {
    const state = shotState(shotName, CFG.seed);
    render(state, 0, shotElapsed(shotName));
    window.__shotReady = true;
    window.__flight = state;
    return;
  }

  const audio = createAudio();
  let state = freshState();
  window.__flight = state;

  function pushMessage(text, color = '#ffffff') {
    state.messages.push({ text, color, age: 0 });
    if (state.messages.length > 3) state.messages.shift();
  }

  function endFlight(title) {
    state.phase = 'ended';
    state.endTitle = title;
    state.grade = gradeFor(state.score);
    state.endTimeText = fmtTime(CFG.timeLimit - state.timeLeft);
    audio.hum(0, false);
  }

  function startFlight() {
    state = freshState();
    state.phase = 'flying';
    window.__flight = state;
    audio.ensure();
    pushMessage('TERBANG! Ikuti ring oranye', '#ffd9a8');
  }

  const input = createInput((code) => {
    if (code === 'Enter' || code === 'MouseClick') {
      if (state.phase === 'menu') startFlight();
    } else if (code === 'KeyP') {
      if (state.phase === 'flying') { state.phase = 'paused'; audio.hum(0, false); }
      else if (state.phase === 'paused') state.phase = 'flying';
    } else if (code === 'KeyR') {
      if (state.phase === 'ended' || state.phase === 'flying' || state.phase === 'paused') startFlight();
    }
  });

  function bearingTo(tx, tz) {
    // Bearing of target relative to current heading, degrees (-180..180).
    const dx = tx - state.x;
    const dz = tz - state.z;
    const target = (Math.atan2(dx, -dz) / DEG + 360) % 360;
    let rel = ((target - state.headingDeg) % 360 + 540) % 360 - 180;
    return rel;
  }

  function step(dt) {
    if (state.phase !== 'flying') return;
    state.elapsed += dt;
    state.timeLeft -= dt;
    state.plumeCooldown = Math.max(0, state.plumeCooldown - dt);
    for (const m of state.messages) m.age += dt;
    state.messages = state.messages.filter((m) => m.age < 2.6);

    // Controls.
    const bankTarget = input.bank * CFG.maxBank;
    const bankRate = 95;
    state.bankDeg += Math.max(-bankRate * dt, Math.min(bankRate * dt, bankTarget - state.bankDeg));
    const pitchTarget = input.pitch * CFG.maxPitch;
    const pitchRate = 65;
    state.pitchDeg += Math.max(-pitchRate * dt, Math.min(pitchRate * dt, pitchTarget - state.pitchDeg));
    if (input.throttleUp) state.throttle = Math.min(1, state.throttle + 0.5 * dt);
    if (input.throttleDown) state.throttle = Math.max(0, state.throttle - 0.5 * dt);

    // Turn follows bank; speed follows throttle.
    state.headingDeg = (state.headingDeg + (state.bankDeg / CFG.maxBank) * CFG.turnRate * dt + 360) % 360;
    const targetSpeed = CFG.minSpeed + state.throttle * (CFG.maxSpeed - CFG.minSpeed);
    const speedRate = 26;
    state.speedKmh += Math.max(-speedRate * dt, Math.min(speedRate * dt, targetSpeed - state.speedKmh));
    state.propSpin = dt * (5 + state.throttle * 26);

    // Move.
    const v = state.speedKmh / 3.6;
    const h = state.headingDeg * DEG;
    const p = state.pitchDeg * DEG;
    state.x += Math.sin(h) * Math.cos(p) * v * dt;
    state.z += -Math.cos(h) * Math.cos(p) * v * dt;
    state.y += Math.sin(p) * v * dt + (state.throttle - 0.55) * 3 * dt;
    // Soft world edge: steer back with a warning.
    if (Math.abs(state.x) > 2050 || Math.abs(state.z) > 2050) {
      state.x = Math.max(-2050, Math.min(2050, state.x));
      state.z = Math.max(-2050, Math.min(2050, state.z));
    }
    const ground = heightAt(state.x, state.z);
    state.altitude = state.y - ground;
    state.fuel = Math.max(0, state.fuel - CFG.fuelDrain * (0.35 + state.throttle) * dt);
    audio.hum(state.throttle, true);

    // Next ring / landing gate guidance.
    if (state.ringsDone < RINGS.length) {
      const r = RINGS[state.ringsDone];
      const d = Math.hypot(r.x - state.x, r.y - state.y, r.z - state.z);
      state.nextRingDist = d;
      state.nextRingBearing = bearingTo(r.x, r.z);
      if (d < CFG.ringPassDist) {
        const perfect = d < 12;
        state.score += CFG.ringScore + (perfect ? CFG.ringPerfectBonus : 0);
        state.ringsDone += 1;
        audio.chime();
        pushMessage(
          perfect ? `RING ${state.ringsDone}/8 SEMPURNA +${CFG.ringScore + CFG.ringPerfectBonus}` : `RING ${state.ringsDone}/8  +${CFG.ringScore}`,
          '#37d67a',
        );
        if (state.ringsDone === RINGS.length) {
          pushMessage('SEMUA RING TERKUMPUL — MENUJU LANDASAN', '#37d67a');
        }
      }
    } else {
      const g = LANDING_GATE;
      const d = Math.hypot(g.x - state.x, g.y - state.y, g.z - state.z);
      state.nextRingDist = d;
      state.nextRingBearing = bearingTo(g.x, g.z);
      if (d < 32) {
        state.score += CFG.landingBonus + Math.round(state.timeLeft) * CFG.timeBonusPerSec;
        endFlight('PENDARATAN BERHASIL');
        return;
      }
      // Touchdown on the strip also counts.
      const onStrip = Math.abs(state.x - RUNWAY.x) < RUNWAY.width / 2 + 4 &&
        Math.abs(state.z - RUNWAY.z) < RUNWAY.length / 2;
      if (onStrip && state.altitude < 14 && state.speedKmh < 150) {
        state.score += CFG.landingBonus + Math.round(state.timeLeft) * CFG.timeBonusPerSec;
        endFlight('PENDARATAN BERHASIL');
        return;
      }
    }

    // Ash plume hits.
    if (state.plumeCooldown <= 0) {
      for (const pl of PLUMES) {
        const hd = Math.hypot(pl.x - state.x, pl.z - state.z);
        if (hd < pl.radius && state.y > pl.baseY - 10 && state.y < pl.topY) {
          state.damage = Math.min(100, state.damage + CFG.plumeDamage);
          state.speedKmh = Math.max(CFG.minSpeed, state.speedKmh - 35);
          state.plumeCooldown = 2;
          audio.warn();
          pushMessage(`KOLOM ABU! KERUSAKAN +${CFG.plumeDamage}`, '#ff5a3c');
          break;
        }
      }
    }

    // Crash / out-of-time.
    if (state.damage >= 100) {
      endFlight('PESAWAT HANCUR — ABU TERLALU PEKAT');
      return;
    }
    if (state.altitude < CFG.groundClearance) {
      endFlight('MENABRAK TANAH');
      return;
    }
    if (state.fuel <= 0) {
      endFlight('BAHAN BAKAR HABIS');
      return;
    }
    if (state.timeLeft <= 0) {
      endFlight('WAKTU HABIS');
      return;
    }
  }

  // Fixed-timestep loop.
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) {
      step(STEP);
      acc -= STEP;
      n++;
    }
    render(state, dt, state.elapsed);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
