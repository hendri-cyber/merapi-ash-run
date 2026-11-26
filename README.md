# MERAPI ASH RUN — Volcano Survey Flight

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/hendri-cyber/merapi-ash-run/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/hendri-cyber/merapi-ash-run/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A complete, original 3D flight game (three.js, vendored) for the make.fun bounty
**best-flight-game-20261126-0057** ("Make the best flight game", $500, top 50).

You fly a survey plane around Mount Merapi. Thread 8 glowing ash-sampling rings
in order, dodge the black ash columns rising from the crater, then put the plane
down on the runway before your fuel or your 3 minutes run out. One flight,
8 rings, 1 landing.

## How to play

Serve `game/` with any static server (`node serve.ts`, then open
http://localhost:8909) and play in a desktop browser. No network request,
no build step, no assets — every mountain, house and cloud is drawn from code.

- **Fly**: **← →** bank and turn, **↑ ↓** climb and descend, **W / S** throttle.
  Speed, altitude and heading stay on the HUD, with a compass strip at the bottom.
- **Sample**: fly through each orange ring in order. Dead centre pays +200,
  a clean pass pays +150. The HUD counts your samples 0/8 and points you at the
  next ring with a distance and a turn arrow.
- **Dodge**: black ash columns cost 25 damage and knock 35 km/h off your speed.
  At 100 damage the flight is over.
- **Land**: after ring 8, fly the green landing gate — or touch down on the
  strip itself under 150 km/h — for +400 plus 5 points per second left on the clock.
- **Keys**: arrows steer · W/S throttle · P pause · R restart · Enter start.

## The island

- **Real 3D (three.js 0.160.0, vendored under `game/vendor/`)**: one WebGL
  canvas, one chase camera — the island is built from real geometry: a seeded
  heightmap with Mount Merapi's cone and crater, stepped rice terraces, a river
  valley, villages with red roofs, a 600 m runway with lights and a windsock,
  drifting clouds and four ash columns.
- **Deterministic**: the same seed (7) builds the same island, rings and shots
  on every run. Staged shots render one fixed frame each (`?shot=cover|rings|
  plume|landing&seed=7`, `window.__shotReady` signals the capture).
- **Fixed timestep**: the flight model steps at 1/60 s, so the same inputs fly
  the same path every time.

## Shots

1. **Cover** — chase view over the terraces, Merapi ahead, ring 1 glowing, HUD lit.
2. **Rings** — mid-flight through ring 4 on the crater's west flank.
3. **Plume** — skimming the crater column with the damage warning up.
4. **Landing** — final approach, green gate ahead, runway and tower in frame.

## Hand-in

- `main.ts` (Node 22) copies `game/` and `screenshots/` to `/output` and
  writes `dossier.json` with the kit's `vendor/makefun-game.ts`.
- `game/` holds 10 files, 4 screenshots at 1280×720 JPEG, each under 256 KiB.
- License: MIT.
