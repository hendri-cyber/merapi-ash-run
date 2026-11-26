# Build notes — MERAPI ASH RUN (best-flight-game-20261126-0057)

Date: 26 Nov 2026, session started ~13:57 WIB (06:57 UTC), after competition open 00:57 UTC.
Competition: "Make the best flight game", $500 top-50 (1st $100), fee $0 (live),
escrow $500.00 funded, deadline 28 Nov 07:57 WIB, 2,755 subs at 11:04 check,
4,019 subs at ~14:00 check. Blind rounds: 4 (cutoffs 19:57 WIB 26 Nov / 07:57 /
19:57 WIB 27 Nov / 07:57 WIB 28 Nov final). Account @hendri-cyber,
payout wallet FY5N8wKgMAn2s747dQBfG13jRQvnp695T6mfrhukuAUa.
Repo anchor: makefun init 88a1dab0378ed6aa85c8e3df7cae6b4b24e3a7e2, drand round 34291003.

## 8-skill loop (mandatory, standing order 23 Nov 2026)
1. host-profiler — Host is make.fun house bounty; judge is an AI comparing games
   pairwise by screenshots + source outline. Jargon: "desktop browser", "static
   files", "no network request", "keyboard and mouse". What wins: a game that reads
   instantly in a 1280x720 still — aircraft + terrain + HUD all legible at a glance.
2. brief-decoder — Hard reqs: original complete flight game; static files, NO
   network; keyboard+mouse; screenshots MUST show: cockpit or chase view over
   recognisable terrain, aircraft in frame with instruments lit, a runway or a
   target ring ahead, altitude/speed/heading on HUD. Deliverables: public GitHub
   repo (or source bundle), OSI license, main.ts (Node 22) at root,
   vendor/makefun-game.ts unchanged, game/ static files, 3-4 screenshots (real
   renders), agent transcripts. Max 10 subs/day, 20 total. Risks: any network
   request = DQ; screenshots not of the game = refuse; repo created before open
   = refuse; code not authored in-window = transcript gate fails.
3. angle-generator — A solid/direct: island courier ring run (rel 5 / uniq 1 /
   feas 5 = 11) — REJECTED after live field check: courier/mail-run and island
   themes flood the field (Skylark/Skyline/Sky Courier x8+, island x6+, rings x5+).
   B contrast: Merapi volcano survey (rel 5 / uniq 4 / feas 4 = 13) — CHOSEN.
   C bold: night storm rescue with searchlight (rel 4 / uniq 5 / feas 2 = 11) —
   REJECTED: dark scenes lose pairwise screenshot comparisons (heist lesson:
   COLD AISLE screened out rank 4,435 for being dark/hard to read).
4. bounty-hunter — GO: brief clear, fit good, fee $0, escrow funded, $500 top-50.
   Field check (first 50 submissions): courier/island/ring flooded; volcano
   nearly empty (1 title "Merapi Skies"); water bomber x2, rescue x1. Lesson
   from SATE BARA (cooking, rank 254/5,848, judge 688.877): bright palette,
   big readable labels, every required element visible in EVERY shot.
5. time-boxer (fast sprint, ~42h to deadline, round-1 cutoff 19:57 WIB today) —
   Research 13:57-14:30 / Production 14:30-18:00 / Polish+audit 18:00-19:00,
   report for user approval ~19:00 (submit before 19:57 catches round 1).
6. anti-ai-polisher — README/dossier text: no AI slop words
   (delve/seamless/elevate/...); concrete numbers (1280x720, 4 shots, 8 rings,
   3-minute flight); active voice.
7. pitch-packager — README opens with hook header + one-liner + 3-point summary
   + how-to-play; the 4 screenshots are the pitch; shot 1 (cover) shows all
   required elements (chase view, Merapi cone, rings ahead, HUD lit).
8. postmortem-coach — Pre-mortem logged above (heist screen-out, dark scenes).
   Post-result: compare with winners, log 1-2 gaps, update playbook.

## Game: MERAPI ASH RUN — Volcano Survey Flight
3D three.js 0.160.0 vendored (same proven pipeline as SATE BARA 3D). Chase camera
behind a survey aircraft built from primitives, over a procedural island dominated
by Mount Merapi cone, rice terraces, a river, a runway and villages. Fly through
8 ash-sampling rings (glowing orange torus) in sequence; avoid ash plume columns
(dark smoke) — a hit costs damage + time. HUD: altitude, speed, heading, rings,
fuel, timer. Finish all rings, then land on the runway through the landing gate
for the final score + grade. 3-minute flight. Keyboard: arrows steer, W/S throttle,
P pause, R restart. Mouse: menu buttons. Sounds: WebAudio synth in code, no assets.

## 2D vs 3D decision
3D three.js, vendored. The brief demands a cockpit or chase view over recognisable
terrain with the aircraft in frame and a runway or target ring ahead — only a 3D
chase view shows all of that convincingly in one still; a 2D side view cannot show
a runway ahead + terrain. The SATE BARA 3D pipeline is proven (14/14 playtest,
deterministic shots, check passes). No external assets, no network, no fonts.

## Files (all authored in this session; kit/vendor files excluded)
- game/index.html, game/src/{config,data,random,world,render3d,input,shots,main}.js
- game/vendor/three.module.min.js (670,681 bytes, MIT, vendored)
- main.ts — copies game/ + screenshots/ to /output, writes dossier.json
- vendor/makefun-game.ts — kit library, copied unchanged
- serve.ts — minimal static server for local testing
- shots.json — 4 staged shots (1280x720 JPEG, each <= 256 KiB)
- screenshots/1-cover.jpg .. 4-landing.jpg — real captures (Playwright)
- README.md — hook + summary + how to play + shots + hand-in (3 make.fun badges)
- LICENSE — MIT (from makefun init)

## Verification log
- 26 Nov ~14:30 WIB: first Playwright smoke run — 4 shots captured (1280x720 JPEG,
  60-70 KB each, q82), menu -> flying -> pause -> resume -> restart all work,
  NO page errors. Shot review found real defects, all fixed:
  1. **Plume visuals rendered at the world origin, not at their vents** (world.js
     never set the plume group's position) — the visible column floated in mid-air
     and the real vents had no column; collision (main.js) used the true vent
     positions, so visuals and hitbox disagreed. FIXED: `g.position.set(p.x, 0, p.z)`.
  2. **Rings 4-5 sat inside the Merapi cone** (ring 4 at 230 m from the crater
     centre, terrain ~700 m vs ring at 560 m — buried; the straight 4->5 path
     clipped the cone shoulder). FIXED: cone shrunk (peak 880->820 m, radius
     950->800 m), rings 4/5 moved out to the west flank (-1050,620,-500 and
     -1150,700,-1000) with 150-340 m clearance on every leg; plumes P2/P4 baseY
     raised above their local terrain, P3 baseY lowered to 220 (was floating).
  3. **Chase camera too close** (plane filled 40% of frame) — pulled back 42->60 m,
     +15 m, FOV 62->60. **Damage bar overflowed its HUD panel by 6 px** — panel
     enlarged (H-104, 90 px). **Compass centre label clipped by the marker** —
     centre now shows an orange ▲, rect marker removed. **Prop read as a red
     cross** — blades narrowed, faint blur disc added (opacity 0.08).
  4. Plume look: 7 discrete beads -> 30 heavily overlapping soft spheres
     (radius > spacing, opacity 0.45/0.35, lighter greys) — reads as smoke.
     A tapered-cylinder attempt read as concrete pillars and was reverted.
  5. Staged-shot HUD numbers corrected to true 3D distances (cover 285 m,
     rings 644 m, plume 1560 m) instead of invented values.
- 26 Nov ~14:10 WIB: full-course autopilot playtest RUNNING (background) — steers
  with real keyboard events through all 8 rings to the landing gate; result below.
- 26 Nov ~14:15 WIB: **AUTOPILOT PLAYTEST PASS — course winnable end to end.**
  Real keyboard steering (arrows bank/pitch, W throttle) from the menu: all 8 rings
  collected (35.9s / 60.7s / 77.5s / 93.3s / 101.6s / 142.7s / 174.8s / 203.9s
  real time), then the landing gate: **PENDARATAN BERHASIL, grade S, score 2115**
  (1200 rings + 400 landing + 515 time bonus), fuel 48 left, damage 0 (no plume
  hit), 103s of the 180s left. Total game time ~77s. NO page errors. (The 4
  "STUCK?" lines in the log are false positives from the tester's own
  stuck-detector — distance was closing again within seconds each time.)
- Determinism: staged shots re-captured twice after the final plume-material
  change — **all 4 sha256 byte-identical** (cover 6018f3be…, rings 9876df9a…,
  plume 04cf6536…, landing 8f9db912…). Sizes 68,935 / 65,464 / 70,131 / 58,586 B.
- `makefun check` (cooking kit CLI, commit ad60b4e): **4 passed** — snapshot
  (22 files, 1,050,356 B, within caps), license_osi (MIT), entrypoint (main.ts
  node22), repo_created_after_open (beacon 88a1dab, drand 34291003, after the
  flight opening 2026-11-26T00:57Z). **2 failed, both explained, not defects:**
  competition_open fails only because the cooking kit checks ITS slug
  (best-cooking-game-20261125-0137, closed 25 Nov) — the flight competition is
  OPEN live (API: status open, deadline 28 Nov 07:57 WIB, 4,157 subs, fee $0,
  pot $500); transcripts_present fails because no bundle was passed — the
  transcript bundle is created at submit time (parent's job; must include this
  session's usage rows + the parent's, per the batch-d lesson).
- main.ts dry run (MAKEFUN_OUTPUT_DIR=/tmp/flight-out): dossier.json 397,694 B
  written, game/ + screenshots/ copied. No network refs anywhere in game/
  (grep clean). vendor/makefun-game.ts byte-identical to the kit copy
  (sha256 dc671875…). Secrets scan clean.

## Verification log — TO BE FILLED
