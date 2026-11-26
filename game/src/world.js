// Terrain + scenery for MERAPI ASH RUN. All geometry is generated in code from a
// seeded height function — no external models, textures or network requests.

import * as THREE from '../vendor/three.module.min.js';
import { fbm2, mulberry32 } from './random.js';
import { CFG, COLOURS } from './config.js';
import { MERAPI, RUNWAY, RIVER, RINGS, LANDING_GATE, PLUMES, VILLAGES, TERRACES, START } from './data.js';

function distToPolyline(x, z, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const abx = bx - ax;
    const abz = bz - az;
    const len2 = abx * abx + abz * abz || 1;
    let t = ((x - ax) * abx + (z - az) * abz) / len2;
    t = Math.max(0, Math.min(1, t));
    const dx = x - (ax + abx * t);
    const dz = z - (az + abz * t);
    best = Math.min(best, Math.hypot(dx, dz));
  }
  return best;
}

export function heightAt(x, z) {
  const seed = CFG.seed;
  let h = 40 + fbm2(x * 0.0016, z * 0.0016, seed, 3) * 130;
  // Mount Merapi cone with a crater bowl.
  const dx = x - MERAPI.x;
  const dz = z - MERAPI.z;
  const d = Math.hypot(dx, dz);
  if (d < MERAPI.radius) {
    const t = 1 - d / MERAPI.radius;
    h += Math.pow(t, 1.35) * MERAPI.peak;
    if (d < MERAPI.crater) h -= (1 - d / MERAPI.crater) * 130;
  }
  // River valley carve.
  const rd = distToPolyline(x, z, RIVER);
  if (rd < 110) {
    const t = 1 - rd / 110;
    h = h * (1 - t * 0.85) + 5 * (t * 0.85);
  }
  // Flatten the runway apron.
  const rx = Math.abs(x - RUNWAY.x);
  const rz = Math.abs(z - RUNWAY.z);
  if (rx < 260 && rz < 460) {
    const t = Math.min(1, (1 - rx / 260) * (1 - rz / 460) * 2.2);
    h = h * (1 - t) + RUNWAY.height * t;
  }
  // Beach falloff at the world edge.
  const edge = Math.max(Math.abs(x), Math.abs(z));
  if (edge > 1850) {
    const t = Math.min(1, (edge - 1850) / 250);
    h = h * (1 - t) + 2 * t;
  }
  return Math.max(2, h);
}

function colourFor(x, z, h, slope) {
  const c = new THREE.Color();
  const n = fbm2(x * 0.01, z * 0.01, CFG.seed + 5, 2) * 0.08;
  if (h < 9) c.setHex(0xd9c28a); // sand
  else if (h < 70) c.setHex(COLOURS.grassLow);
  else if (h < 230) {
    // Rice-terrace bands: quantised steps read as terraces from the air.
    const band = Math.floor(h / 26) % 2;
    c.setHex(band === 0 ? COLOURS.grassHigh : COLOURS.terrace);
  } else if (h < 480) c.setHex(COLOURS.grassHigh);
  else if (h < 720) c.setHex(COLOURS.rock);
  else c.setHex(COLOURS.crater);
  if (slope < 0.72) c.lerp(new THREE.Color(COLOURS.rock), 0.55); // steep = rock
  const dm = Math.hypot(x - MERAPI.x, z - MERAPI.z);
  if (dm < 320) c.lerp(new THREE.Color(COLOURS.ash), 0.3 * (1 - dm / 320)); // ash near crater
  c.offsetHSL(0, 0, n);
  return c;
}

export function buildWorld(scene) {
  const rng = mulberry32(CFG.seed);
  const handles = { ringMeshes: [], plumeMeshes: [], cloudGroups: [], gateMesh: null };

  // ---- Terrain ----
  const SEG = 140;
  const geo = new THREE.PlaneGeometry(CFG.worldSize, CFG.worldSize, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const h = heightAt(v.x, v.z);
    pos.setY(i, h);
    const slope = 1; // refined after computeVertexNormals
    const c = colourFor(v.x, v.z, h, slope);
    colours[i * 3] = c.r;
    colours[i * 3 + 1] = c.g;
    colours[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geo.computeVertexNormals();
  // Re-colour steep faces as rock using the real normals.
  const nrm = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const ny = nrm.getY(i);
    if (ny < 0.72) {
      const rock = new THREE.Color(COLOURS.rock);
      colours[i * 3] = colours[i * 3] * 0.45 + rock.r * 0.55;
      colours[i * 3 + 1] = colours[i * 3 + 1] * 0.45 + rock.g * 0.55;
      colours[i * 3 + 2] = colours[i * 3 + 2] * 0.45 + rock.b * 0.55;
    }
  }
  geo.attributes.color.needsUpdate = true;
  const terrain = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  scene.add(terrain);

  // ---- Sea ----
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(12000, 12000),
    new THREE.MeshLambertMaterial({ color: COLOURS.sea }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0.5;
  scene.add(sea);

  // ---- River ribbon (flat quads along the polyline) ----
  const riverMat = new THREE.MeshLambertMaterial({ color: 0x4db2d8 });
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [ax, az] = RIVER[i];
    const [bx, bz] = RIVER[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(46, len), riverMat);
    seg.rotation.x = -Math.PI / 2;
    seg.rotation.z = -Math.atan2(bx - ax, bz - az);
    seg.position.set((ax + bx) / 2, 7, (az + bz) / 2);
    scene.add(seg);
  }

  // ---- Runway ----
  const rw = new THREE.Group();
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(RUNWAY.width, 2, RUNWAY.length),
    new THREE.MeshLambertMaterial({ color: COLOURS.runway }),
  );
  strip.position.y = 1;
  rw.add(strip);
  const markMat = new THREE.MeshBasicMaterial({ color: COLOURS.runwayMark });
  for (let i = -4; i <= 4; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 26), markMat);
    dash.position.set(0, 2.2, i * 60);
    rw.add(dash);
  }
  for (const zEnd of [-RUNWAY.length / 2 + 24, RUNWAY.length / 2 - 24]) {
    for (let k = -2; k <= 2; k++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 4), markMat);
      bar.position.set(k * 8, 2.2, zEnd);
      rw.add(bar);
    }
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: COLOURS.planeOrange });
  for (let i = -5; i <= 5; i++) {
    for (const sx of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), lightMat);
      l.position.set(sx * (RUNWAY.width / 2 + 3), 2.5, i * 55);
      rw.add(l);
    }
  }
  // Windsock + control tower.
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 22, 8),
    new THREE.MeshLambertMaterial({ color: 0xdddddd }),
  );
  pole.position.set(RUNWAY.width / 2 + 18, 11, RUNWAY.length / 2 - 60);
  rw.add(pole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(3, 12, 8),
    new THREE.MeshLambertMaterial({ color: COLOURS.planeOrange }),
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(RUNWAY.width / 2 + 24, 21, RUNWAY.length / 2 - 60);
  rw.add(sock);
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(16, 34, 16),
    new THREE.MeshLambertMaterial({ color: 0xe8e2d4 }),
  );
  tower.position.set(RUNWAY.width / 2 + 34, 17, RUNWAY.length / 2 - 120);
  rw.add(tower);
  const towerTop = new THREE.Mesh(
    new THREE.BoxGeometry(22, 8, 22),
    new THREE.MeshLambertMaterial({ color: 0x2b4a6b }),
  );
  towerTop.position.set(RUNWAY.width / 2 + 34, 38, RUNWAY.length / 2 - 120);
  rw.add(towerTop);
  rw.position.set(RUNWAY.x, RUNWAY.height, RUNWAY.z);
  scene.add(rw);

  // ---- Villages ----
  const houseMat = new THREE.MeshLambertMaterial({ color: 0xe8dcc0 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xb03a26 });
  for (const vil of VILLAGES) {
    for (let i = 0; i < vil.houses; i++) {
      const hx = vil.x + (rng() - 0.5) * 220;
      const hz = vil.z + (rng() - 0.5) * 160;
      const hy = heightAt(hx, hz);
      const house = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 9), houseMat);
      house.position.set(hx, hy + 3, hz);
      house.rotation.y = rng() * Math.PI;
      scene.add(house);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(7.5, 5, 4), roofMat);
      roof.position.set(hx, hy + 8.5, hz);
      roof.rotation.y = Math.PI / 4 + rng() * 0.5;
      scene.add(roof);
    }
  }

  // ---- Trees (instanced: trunks + canopies) ----
  const treeSpots = [];
  let guard = 0;
  while (treeSpots.length < 260 && guard++ < 4000) {
    const x = (rng() - 0.5) * 3800;
    const z = (rng() - 0.5) * 3800;
    const h = heightAt(x, z);
    if (h < 12 || h > 240) continue;
    if (Math.abs(x - RUNWAY.x) < 300 && Math.abs(z - RUNWAY.z) < 500) continue;
    if (distToPolyline(x, z, RIVER) < 60) continue;
    treeSpots.push([x, h, z]);
  }
  const trunkGeo = new THREE.CylinderGeometry(1.2, 1.8, 8, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2b });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeSpots.length);
  const canGeo = new THREE.ConeGeometry(7, 16, 7);
  const canMat = new THREE.MeshLambertMaterial({ color: 0x2f7d32 });
  const cans = new THREE.InstancedMesh(canGeo, canMat, treeSpots.length);
  const m4 = new THREE.Matrix4();
  treeSpots.forEach(([x, h, z], i) => {
    const s = 0.8 + rng() * 0.7;
    m4.makeScale(s, s, s);
    m4.setPosition(x, h + 4 * s, z);
    trunks.setMatrixAt(i, m4);
    m4.makeScale(s, s, s);
    m4.setPosition(x, h + 14 * s, z);
    cans.setMatrixAt(i, m4);
  });
  scene.add(trunks);
  scene.add(cans);

  // ---- Clouds (white flattened spheres, drift slowly in play mode) ----
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    const n = 3 + Math.floor(rng() * 3);
    for (let j = 0; j < n; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(18 + rng() * 22, 10, 8), cloudMat);
      s.position.set((rng() - 0.5) * 90, (rng() - 0.5) * 10, (rng() - 0.5) * 40);
      s.scale.y = 0.45;
      g.add(s);
    }
    g.position.set((rng() - 0.5) * 3600, 720 + rng() * 420, (rng() - 0.5) * 3600);
    g.userData.drift = 2 + rng() * 4;
    scene.add(g);
    handles.cloudGroups.push(g);
  }

  // ---- Ash plume columns: many heavily overlapping soft spheres read as smoke ----
  const plumeMat = new THREE.MeshLambertMaterial({ color: 0x5a5450, transparent: true, opacity: 0.45 });
  const plumeMat2 = new THREE.MeshLambertMaterial({ color: 0x7a7168, transparent: true, opacity: 0.35 });
  for (const p of PLUMES) {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z); // the column stands on its own vent, not at the origin
    const span = p.topY - p.baseY;
    for (let i = 0; i < 30; i++) {
      const t = i / 29;
      const r = p.radius * (0.85 + t * 0.65); // radius stays well above the spacing
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), i % 2 ? plumeMat2 : plumeMat);
      s.position.set((rng() - 0.5) * p.radius * 0.6, p.baseY + t * span, (rng() - 0.5) * p.radius * 0.6);
      g.add(s);
    }
    scene.add(g);
    handles.plumeMeshes.push(g);
  }

  // ---- Sampling rings (orange torus, facing the flight path) ----
  const ringGeo = new THREE.TorusGeometry(CFG.ringRadius, 2.4, 10, 30);
  for (let i = 0; i < RINGS.length; i++) {
    const r = RINGS[i];
    const mat = new THREE.MeshBasicMaterial({ color: COLOURS.ring });
    const mesh = new THREE.Mesh(ringGeo, mat);
    mesh.position.set(r.x, r.y, r.z);
    // Face the incoming flight direction (from previous ring / start).
    const prev = i === 0 ? START : RINGS[i - 1];
    const dir = new THREE.Vector3(r.x - prev.x, 0, r.z - prev.z).normalize();
    mesh.lookAt(new THREE.Vector3(r.x + dir.x, r.y, r.z + dir.z));
    mesh.userData.index = i;
    mesh.userData.baseScale = 1;
    scene.add(mesh);
    handles.ringMeshes.push(mesh);
    // Centre beacon dot so the ring reads at a glance.
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    dot.position.set(r.x, r.y, r.z);
    scene.add(dot);
  }

  // ---- Landing gate (green torus on the approach) ----
  const gate = new THREE.Mesh(
    new THREE.TorusGeometry(30, 2.6, 10, 30),
    new THREE.MeshBasicMaterial({ color: COLOURS.gate }),
  );
  gate.position.set(LANDING_GATE.x, LANDING_GATE.y, LANDING_GATE.z);
  scene.add(gate);
  handles.gateMesh = gate;

  return handles;
}
