// 3D renderer for MERAPI ASH RUN: three.js chase view + 2D HUD overlay canvas.
// One WebGL canvas below, one 2D canvas on top (pointer-events none). Both are
// part of the page, so Playwright screenshots capture the whole picture.

import * as THREE from '../vendor/three.module.min.js';
import { COLOURS } from './config.js';
import { buildWorld } from './world.js';

const DEG = Math.PI / 180;

function buildAircraft() {
  const g = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: COLOURS.planeWhite });
  const red = new THREE.MeshLambertMaterial({ color: COLOURS.planeRed });
  const orange = new THREE.MeshLambertMaterial({ color: COLOURS.planeOrange });
  const glass = new THREE.MeshLambertMaterial({ color: COLOURS.canopy });

  // Fuselage (nose faces -z).
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.5, 14, 12), white);
  fus.rotation.x = Math.PI / 2;
  g.add(fus);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(2.1, 3.4, 12), red);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -8.6;
  g.add(nose);
  // Red cheatline band.
  const band = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 1.2, 12), red);
  band.rotation.x = Math.PI / 2;
  band.position.z = -3;
  g.add(band);
  // Wings.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(27, 0.55, 5.2), white);
  wing.position.set(0, -0.4, -0.5);
  g.add(wing);
  for (const sx of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 5.2), red);
    tip.position.set(sx * 13.4, -0.4, -0.5);
    g.add(tip);
  }
  // Tail.
  const stab = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.45, 3.2), white);
  stab.position.set(0, 0.4, 6.2);
  g.add(stab);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4.6, 4.2), red);
  fin.position.set(0, 2.2, 6.2);
  g.add(fin);
  // Canopy.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.7, 12, 10), glass);
  canopy.scale.set(1, 0.85, 2.1);
  canopy.position.set(0, 1.7, -2.6);
  g.add(canopy);
  // Survey pod (the ash sampler) under the belly.
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.4, 10), orange);
  pod.rotation.x = Math.PI / 2;
  pod.position.set(0, -2.4, 1.5);
  g.add(pod);
  // Propeller (spins around z).
  const prop = new THREE.Group();
  prop.position.z = -10.4;
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), red);
  prop.add(hub);
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.5, 0.3), red);
    blade.rotation.z = a;
    prop.add(blade);
  }
  // faint spinning-disc blur so the prop reads as motion, not a red cross
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(7, 24),
    new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.08, side: THREE.DoubleSide }),
  );
  disc.position.z = -0.4;
  prop.add(disc);
  g.add(prop);
  g.userData.prop = prop;
  return g;
}

export function createRenderer(canvas3d, canvasHud) {
  const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true });
  renderer.setSize(1280, 720, false);
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd0e8);
  scene.fog = new THREE.Fog(COLOURS.fog, 700, 5200);

  const camera = new THREE.PerspectiveCamera(60, 1280 / 720, 1, 9000);

  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x5d7a4a, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
  sun.position.set(1200, 1800, 600);
  scene.add(sun);

  const world = buildWorld(scene);
  const aircraft = buildAircraft();
  scene.add(aircraft);

  const hud = canvasHud.getContext('2d');

  function placeAircraft(s) {
    aircraft.position.set(s.x, s.y, s.z);
    aircraft.rotation.order = 'YXZ';
    aircraft.rotation.y = -s.headingDeg * DEG;
    aircraft.rotation.x = s.pitchDeg * DEG;
    aircraft.rotation.z = -s.bankDeg * DEG;
    aircraft.userData.prop.rotation.z += s.propSpin;
  }

  function placeCamera(s) {
    const h = s.headingDeg * DEG;
    const p = s.pitchDeg * DEG;
    const fx = Math.sin(h) * Math.cos(p);
    const fy = Math.sin(p);
    const fz = -Math.cos(h) * Math.cos(p);
    camera.position.set(s.x - fx * 60, s.y - fy * 60 + 15, s.z - fz * 60);
    camera.lookAt(s.x + fx * 60, s.y + fy * 60, s.z + fz * 60);
  }

  function drawHud(s) {
    const W = 1280;
    const H = 720;
    hud.clearRect(0, 0, W, H);
    hud.textBaseline = 'alphabetic';
    // --- Top bar ---
    hud.fillStyle = 'rgba(10, 24, 38, 0.72)';
    hud.fillRect(0, 0, W, 54);
    hud.fillStyle = '#ffb347';
    hud.font = 'bold 26px sans-serif';
    hud.textAlign = 'left';
    hud.fillText('MERAPI ASH RUN', 18, 37);
    hud.fillStyle = '#ffffff';
    hud.font = 'bold 26px sans-serif';
    hud.textAlign = 'center';
    const t = Math.max(0, s.timeLeft);
    const mm = Math.floor(t / 60);
    const ss = Math.floor(t % 60).toString().padStart(2, '0');
    hud.fillText(`${mm}:${ss}`, W / 2, 37);
    hud.textAlign = 'right';
    hud.fillText(`SKOR ${s.score}`, W - 18, 37);
    // --- Rings ---
    hud.textAlign = 'left';
    hud.font = 'bold 20px sans-serif';
    hud.fillStyle = '#ffffff';
    hud.fillText(`SAMPEL ${s.ringsDone}/8`, 18, 88);
    for (let i = 0; i < 8; i++) {
      hud.beginPath();
      hud.arc(170 + i * 26, 81, 8, 0, Math.PI * 2);
      hud.fillStyle = i < s.ringsDone ? '#37d67a' : 'rgba(255,255,255,0.35)';
      hud.fill();
      hud.strokeStyle = '#ffffff';
      hud.lineWidth = 2;
      hud.stroke();
    }
    // --- Left instruments (lit) ---
    hud.fillStyle = 'rgba(10, 24, 38, 0.72)';
    hud.fillRect(14, 110, 208, 132);
    hud.strokeStyle = '#ffb347';
    hud.lineWidth = 2;
    hud.strokeRect(14, 110, 208, 132);
    hud.fillStyle = '#ffb347';
    hud.font = 'bold 15px sans-serif';
    hud.fillText('ALT', 26, 134);
    hud.fillText('SPD', 26, 178);
    hud.fillText('HDG', 26, 222);
    hud.fillStyle = '#ffffff';
    hud.font = 'bold 24px sans-serif';
    hud.textAlign = 'right';
    hud.fillText(`${Math.round(s.altitude)} m`, 210, 136);
    hud.fillText(`${Math.round(s.speedKmh)} km/h`, 210, 180);
    hud.fillText(`${String(Math.round(((s.headingDeg % 360) + 360) % 360)).padStart(3, '0')}°`, 210, 224);
    hud.textAlign = 'left';
    // --- Fuel + damage ---
    hud.fillStyle = 'rgba(10, 24, 38, 0.72)';
    hud.fillRect(14, H - 104, 260, 90);
    hud.fillStyle = '#ffffff';
    hud.font = 'bold 15px sans-serif';
    hud.fillText('BAHAN BAKAR', 26, H - 78);
    hud.fillStyle = '#222';
    hud.fillRect(26, H - 68, 236, 14);
    hud.fillStyle = s.fuel > 25 ? '#37d67a' : '#ff5a3c';
    hud.fillRect(26, H - 68, 236 * Math.max(0, s.fuel / 100), 14);
    hud.fillStyle = '#ffffff';
    hud.fillText('KERUSAKAN', 26, H - 38);
    hud.fillStyle = '#222';
    hud.fillRect(26, H - 30, 236, 12);
    hud.fillStyle = s.damage > 60 ? '#ff5a3c' : '#ffb347';
    hud.fillRect(26, H - 30, 236 * Math.max(0, s.damage / 100), 12);
    // --- Compass strip ---
    hud.fillStyle = 'rgba(10, 24, 38, 0.72)';
    hud.fillRect(W / 2 - 190, H - 44, 380, 30);
    const dirs = ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL'];
    const hdg = ((s.headingDeg % 360) + 360) % 360;
    hud.font = 'bold 15px sans-serif';
    hud.textAlign = 'center';
    for (let d = -90; d <= 90; d += 15) {
      const a = ((hdg + d) % 360 + 360) % 360;
      const x = W / 2 + d * 2;
      const label = d === 0 ? '▲' : (d % 45 === 0 ? dirs[Math.round(a / 45) % 8] : String(Math.round(a / 5) * 5));
      hud.fillStyle = d === 0 ? '#ffb347' : '#ffffff';
      hud.fillText(label, x, H - 22);
    }
    // --- Centre messages ---
    hud.textAlign = 'center';
    hud.font = 'bold 30px sans-serif';
    s.messages.forEach((m, i) => {
      const alpha = Math.max(0, 1 - m.age / 2.6);
      hud.globalAlpha = alpha;
      hud.fillStyle = m.color || '#ffffff';
      hud.fillText(m.text, W / 2, 250 + i * 40);
    });
    hud.globalAlpha = 1;
    // --- Next-ring hint ---
    if (s.phase === 'flying' && s.nextRingDist > 0) {
      hud.font = 'bold 18px sans-serif';
      hud.fillStyle = '#ffd9a8';
      const arrow = s.nextRingBearing > 8 ? '→ BELOK KANAN' : s.nextRingBearing < -8 ? '← BELOK KIRI' : '↑ LURUS';
      hud.fillText(`RING ${s.ringsDone + 1} • ${Math.round(s.nextRingDist)} m ${arrow}`, W / 2, H - 60);
    }
    // --- Phase overlays ---
    if (s.phase === 'menu') {
      hud.fillStyle = 'rgba(8, 20, 34, 0.55)';
      hud.fillRect(0, 0, W, H);
      hud.fillStyle = '#ffb347';
      hud.font = 'bold 64px sans-serif';
      hud.fillText('MERAPI ASH RUN', W / 2, 250);
      hud.fillStyle = '#ffffff';
      hud.font = 'bold 28px sans-serif';
      hud.fillText('Survei vulkano — terbang menembus 8 ring sampel abu', W / 2, 300);
      hud.font = '22px sans-serif';
      hud.fillText('← → belok   •   ↑ ↓ naik/turun   •   W / S gas   •   P jeda   •   R ulang', W / 2, 360);
      hud.fillText('Hindari kolom abu hitam. Kumpulkan semua ring, lalu mendarat di landasan.', W / 2, 396);
      hud.fillStyle = '#ffb347';
      hud.font = 'bold 30px sans-serif';
      hud.fillText('TEKAN ENTER ATAU KLIK UNTUK TERBANG', W / 2, 470);
    } else if (s.phase === 'paused') {
      hud.fillStyle = 'rgba(8, 20, 34, 0.6)';
      hud.fillRect(0, 0, W, H);
      hud.fillStyle = '#ffffff';
      hud.font = 'bold 48px sans-serif';
      hud.fillText('JEDA — tekan P untuk lanjut', W / 2, 360);
    } else if (s.phase === 'ended') {
      hud.fillStyle = 'rgba(8, 20, 34, 0.68)';
      hud.fillRect(0, 0, W, H);
      hud.fillStyle = s.endTitle.includes('BERHASIL') ? '#37d67a' : '#ffb347';
      hud.font = 'bold 52px sans-serif';
      hud.fillText(s.endTitle, W / 2, 250);
      hud.fillStyle = '#ffffff';
      hud.font = 'bold 30px sans-serif';
      hud.fillText(`SKOR ${s.score}   •   NILAI ${s.grade}`, W / 2, 310);
      hud.font = '24px sans-serif';
      hud.fillText(`Ring ${s.ringsDone}/8   •   Sisa bahan bakar ${Math.round(s.fuel)}%   •   Waktu ${s.endTimeText}`, W / 2, 356);
      hud.fillStyle = '#ffb347';
      hud.font = 'bold 26px sans-serif';
      hud.fillText('TEKAN R UNTUK TERBANG LAGI', W / 2, 420);
    }
  }

  function render(state, dt, elapsed) {
    // Animate world bits (frozen when elapsed is fixed, e.g. staged shots).
    world.ringMeshes.forEach((m, i) => {
      const done = i < state.ringsDone;
      m.material.color.setHex(done ? COLOURS.ringDone : COLOURS.ring);
      const pulse = i === state.ringsDone ? 1 + 0.05 * Math.sin(elapsed * 3 + i) : 1;
      m.scale.setScalar(pulse);
    });
    world.cloudGroups.forEach((g) => {
      g.position.x += g.userData.drift * dt;
      if (g.position.x > 2100) g.position.x = -2100;
    });
    placeAircraft(state);
    placeCamera(state);
    renderer.render(scene, camera);
    drawHud(state);
  }

  return { render, scene, camera, world, aircraft };
}
