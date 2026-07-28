# 05 — Build plan

Re-cut from `CLAUDE.md` §16's M0–M10 for **one person with no deadline**. Two structural changes:

1. **Phases are sequenced for single-threaded flow, not four parallel workstreams.** M0's "four people can now work without talking to each other" is moot. What replaces it as the reason to freeze contracts early is *you should never have to re-derive a number you already solved.*
2. **The 3D scene is a planned phase, not a gated stretch.** It still comes after a complete demo exists — but it is expected to land.

Hour estimates are kept as **relative effort signals**, not a schedule. Ignore the totals.

Every phase ends at something you could show if you stopped there. That discipline is not about deadline risk here; it's about **motivation on a solo project**. A phase that ends in "the backend is done" is where solo projects die.

---

## Phase 0 — Contract freeze  *(~2h)*

Not code. Resolve every open number **before** anything depends on it.

- [ ] Apply corrections **C1–C8** from `00-overview.md`.
- [ ] Decide the `STRINGS_PER_ARRAY` question in `03-data-model.md` §4 — recommendation is **(a) 7 strings, 5 faulted → −41.8%**.
- [ ] Fill `CLAUDE.md` §2's table with final copy for every event and mission-log line. No TBDs.
- [ ] Copy `plan/schemas.ts` → `src/lib/types.ts`.
- [ ] Write `data/events.json` by hand as a stub against the schema.
- [ ] Add `LICENSE` (AGPL-3.0) — the YOLOv8 decision from `02-architecture.md`.

**Definition of done:** every number in `19. Fixed identifiers` is either confirmed or corrected, and `plan/schemas.ts` compiles. **You never renegotiate a number after this point** — if one turns out wrong, you change the generator and let the invariant catch the fallout.

---

## Phase 1 — Data & physics  *(~5h)*

- [ ] `scripts/generate_farm.py` → `data/farm.json` (3 zones, 120 arrays, 3 inverters, 2 pads)
- [ ] `scripts/generate_telemetry.py` → `data/telemetry.json` (91 frames) + `data/forecast.json` (73 points)
- [ ] `scripts/generate_events.py` → `data/events.json`
- [ ] `scripts/validate_data.ts` + `npm run validate:data`, wired into `prebuild`

**Definition of done:** `npm run validate:data` passes all of I1–I16 (minus I11–I13, which need later phases). Deliberately corrupt one value in `telemetry.json` and the build fails with a named error. Every headline number — 15.02, 36.10, −58.4, −41.8, 364, 1.44, 14:00 — came out of the model, and you can point at the line that produced it.

*Build this first, before any UI.* It's the component with the most downstream dependents and the one that's most painful to change late.

---

## Phase 2 — Clock & shell  *(~4h)*

- [ ] `src/store/demoClock.ts` (zustand) + `src/hooks/useDemoClock.ts` (the one rAF loop, mounted in `layout.tsx`)
- [ ] Keyboard controls: `Space ← → 1 2 3 R C V`
- [ ] `globals.css` with every token from `04-design-system.md`
- [ ] Three-column grid with placeholder boxes
- [ ] Debug readout showing `t` and `view`
- [ ] ESLint guardrails from `02-architecture.md` §7

**Definition of done:** Space advances `t`; arrows seek; the debug readout is correct; the layout is exactly 1920×1080 with no scrollbars; adding a `setInterval` anywhere in `src/components/` fails lint.

---

## Phase 3 — Vision  *(~6h)*

Runs on Colab, so it's the one phase with real dead time — start the training run and build Phase 4 while it goes.

- [ ] Source a Roboflow Universe solar-defect dataset. Record **name, image count, split, licence** in `README.md` *as you download it*, not later.
- [ ] `scripts/train_defect_model.py` — YOLOv8n, ~50 epochs, imgsz 640, batch 16, classes `["crack","soiling","delamination","hotspot"]`
- [ ] Commit `models/defect_yolov8n.pt` + a screenshot of the final metrics table to `docs/`
- [ ] `scripts/detect_on_evidence.py` → `b17_rgb_annotated.jpg`, `b17_detection.json`
- [ ] `scripts/thermal_hotspot.py` → `b17_cellgrid.json`, `b17_thermal.png` (ironbow LUT matching the CSS tokens)

**Definition of done:** the weights are committed; `README.md` states the real mAP@50 with dataset provenance; `b17_rgb_annotated.jpg` shows a box with the model's **actual** confidence; `b17_cellgrid.json` has 4 defects at (2,5),(2,6),(4,5),(4,6) that came out of OpenCV.

If the reported mAP is 0.41, the README says 0.41. **Do not round up and do not quote the dataset leaderboard as your own** — this is the specific failure mode `CLAUDE.md` §11 flags by name, and it is the one thing in this project that cannot be repaired after the fact.

---

## Phase 4 — Console, static  *(~9h)*

Every component in `src/components/console/` rendering real data at a **fixed** `t`. No animation yet.

Order within the phase — cheapest-to-most-persuasive first, so you always have something to look at:
- [ ] `InverterTable` (highest persuasion-per-hour in the whole project)
- [ ] `HeaderBar` + sparklines
- [ ] `FarmMap` + `PanelCell` (SVG, hatch pattern, zone strokes, B-17 selection rect)
- [ ] `EventFeed` + `EventCard`
- [ ] `DetailPanel` container, `AnalysisBlock`, `EvidenceStrip`
- [ ] `AnomalyMatrix` (static, all cells filled)
- [ ] `AgentReasoning` (static, full text)
- [ ] `ForecastBand`, `Timeline`, `RepairQueueBar`, `ApprovalBar`
- [ ] `DroneStatus`, `SignalQuality`, `InverterAudio`, `FlyoverPlayer`
- [ ] `src/lib/ranking.ts` + unit tests

**Definition of done:** hardcode `t = 80` and the console matches `CLAUDE.md` §2's row for that beat — anomaly matrix, inverter table, approval bar, ranked queue. `rankQueue()` has tests proving B-17 wins by ≥1.5×. Screenshot it; this is your first real artefact.

---

## Phase 5 — Console, clock-driven  *(~5h)*

- [ ] `src/store/selectors.ts` — the full public surface from `02-architecture.md` §4
- [ ] Wire every component to selectors; delete every hardcoded `t`
- [ ] `useTypewriter` / `useStreamedText` (pure function of `t`)
- [ ] Progressive section reveal in the right rail
- [ ] Matrix sequential fill across t=48..56
- [ ] `approve()` and its cascade (button label, panel colour, queue count)

**Definition of done:** play 0→90 and **every beat in §2 fires at the right second**. Then seek back to t=40 and the state is correct — nothing is stuck from having played forward. That backwards-seek test is the real acceptance criterion; run it after every subsequent phase.

---

## Phase 6 — Agent cache  *(~3h)*

- [ ] `scripts/run_agent.py` — three prompts from `CLAUDE.md` §9, model `openai/gpt-oss-120b`
- [ ] Numeric cross-check against `telemetry.json` / `forecast.json`; fail loudly, never write a cache with a contradicted number
- [ ] Commit `data/agent_cache.json`
- [ ] Model ID rendered in each card header

**Definition of done:** `agent_cache.json` validates; **triage returns `requiresPhysicalVerification: true`** with a mechanism-grounded rationale (soiling and cracking produce similar string-level signatures under these conditions; only imaging distinguishes them). If the model won't produce that, tighten the prompt until it does — it is the load-bearing claim of the entire demo, and without it the drone has no reason to exist.

---

## Phase 7 — Cinematic over video  *(~5h)*

- [ ] Download a CC0 solar-farm flyover from Pexels/Pixabay; **commit it**, never hotlink
- [ ] `CinematicView` + `CinematicBackground` (the swap seam for Phase 8)
- [ ] `MissionLog` (typewriter, colour by event class)
- [ ] `Timecode`, `StatusPill` (hard cuts)
- [ ] `PiPConsole` — the real `<ConsoleRoot />` at `scale(0.31)`
- [ ] `TargetReticle` with the real confidence from `b17_detection.json`
- [ ] View switching at t=18 and t=74

**Definition of done:** the full 90 seconds plays end to end with both cuts, and **the PiP visibly updates in sync with the cinematic**. Record it.

> **This is a complete, presentable demo. Everything after this is upside.** If you never open the project again, you have the thing.

---

## Phase 8 — 3D scene  *(~12h)*

Only after Phase 7 is recorded. Swap `CinematicBackground` from `<video>` to `<SolarFarmScene />`; the overlays don't change.

- [ ] `SolarFarmScene` (R3F canvas root, `dynamic(..., { ssr: false })`)
- [ ] `Ground`, sky gradient shader, sun + hemisphere fill, linear fog
- [ ] `PanelField` — drei `<Instances>`, ~500 boxes, hard cap 600, instanced support posts
- [ ] `Drone` — low-poly glTF, free-spinning rotors (presentational only)
- [ ] `CameraRig` — spline sampled from `t`, `lerp` smooths toward the target but never drives it
- [ ] `ThermalPass` — ironbow LUT post-process, t=48..56, `dpr 0.75` + scanline noise
- [ ] Cracked-panel unique mesh with alpha-mapped crack decal, visible from t=34

**Definition of done:** 60fps at 1920×1080 on the demo machine; camera hits all five marks from `CLAUDE.md` §14; **seeking backwards still works** (proof the camera reads `t` rather than integrating).

Unlike the time-boxed version of this plan, there is no revert trigger — but keep the video path working in a branch until the scene passes its DoD.

---

## Phase 9 — Polish  *(~4h)*

- [ ] Motion timing pass (nothing springs, nothing bounces)
- [ ] Ironbow ramp consistency check: the CSS `ironbow()` and the GLSL LUT produce the same colour for the same normalised value
- [ ] Copy pass against `04-design-system.md` §7 — units on every metric, U+2212 minus signs
- [ ] Keyboard focus states
- [ ] `prefers-reduced-motion`
- [ ] `npm run check:literals` returns clean

---

## Phase 10 — Artefacts  *(~3h)*

- [ ] Full 90s screen recording at 1920×1080
- [ ] `README.md`: dataset provenance, real mAP, physics constants table (`03-data-model.md` §6), the ranking function
- [ ] Deploy to Vercel; verify the static build carries all of `/data` and `/models`
- [ ] Rehearse the five judge answers in `06-risks.md` §"Questions you will be asked"

---

## Decisions made (override if you disagree)

1. **Farm output is 364 MW, not 412.** 412 is unreachable at 890 W/m² / 35 °C. See `00-overview.md` C2.
2. **`P_RATED_STRING = 49.61`, not 40.0.** The spec's own sketch yields 29.11 kW otherwise. C1.
3. **Array deviation is −41.8%, not −42%**, derived as `dev_string × 5/7`. C3.
4. **`openai/gpt-oss-120b`** replaces the deprecated `llama-3.3-70b-versatile`. C5.
5. **Repo is AGPL-3.0** because YOLOv8's licence is contagious to the weights. Switch to RF-DETR if you ever want that not to be true.
6. **The 3D scene is planned, not gated** — because you have no deadline. It still ships after a complete video-backed demo.
7. **Acoustic evidence and Zone C both stay.** Both were time-pressure cuts only.
8. **Physics first, UI second.** The generator has the most dependents and is worst to change late.
9. **A build-time validation gate exists.** On a long solo project, slow numeric drift is a bigger threat than any single bug.
10. **`t` and `approved` are the only mutable state in the app.** Everything else is `f(t)`.

## What NOT to build (yet)

- Auth, accounts, a database, persistence of any kind. A work order writes to Zustand and nothing else.
- A settings page, theme toggle, or onboarding.
- Responsive or mobile layouts. This runs at 1920×1080 on a projector.
- A second site, a second fault, a second drone mission, or historical browsing.
- Live telemetry generation in the browser (`Math.random()` anywhere in `src/` is a bug).
- Live LLM calls in the demo path.
- A stale/offline/loading state. Nothing loads at runtime — see `04-design-system.md` §4.
- Any panel-detail view for a panel that isn't B-17.
- Zone-level drill-down, map zoom/pan, or filtering the event feed. The `FILTER` affordance in the reference screenshot is decorative — leave it decorative.
- More detector classes than the four already specified.
- Anything not visible during the 90 seconds. Write it in `README.md` under "post-project TODO" and move on.
