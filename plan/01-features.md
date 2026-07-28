# 01 — Features

Tagging: **[MVP]** = the 90-second demo fails without it. **[V2]** = builds after MVP is whole. **[STRETCH]** = upside, never blocking.

Because this is solo with no deadline, [V2] and [STRETCH] are **expected to land**, not hoped for. The tags encode *order and blocking-ness*, not likelihood. Within each tag, features are ordered by build dependency.

Cross-cutting acceptance rule for every feature below: **no number rendered by this feature may be a literal in a component.** It comes from `/data`, which comes from `scripts/`. A grep for the number in `src/` must return zero hits.

---

## A. Foundation

### A1. The demo clock  [MVP]
- **Story:** As the operator, I press Space and the entire console, scene, and overlays advance together, so nothing can desync.
- **Acceptance:** `Space` toggles play. `←`/`→` seek ∓5s. `1`/`2`/`3` set speed 0.5/1/2×. `R` resets. `C`/`V` force console/cinematic. A debug readout shows `t` and `view`. **Seeking backwards to t=40 produces byte-identical UI to having played forward to t=40.**
- **Depends on:** nothing. Build first.
- **Notes:** One `requestAnimationFrame` loop, mounted once in `layout.tsx`. Any second timer that drives state is a bug — see `02-architecture.md` §"The single-clock invariant".

### A2. Design tokens & type scale  [MVP]
- **Story:** As the builder, every colour I use comes from the ironbow ramp, so the console and the thermal feed read as one system.
- **Acceptance:** `globals.css` defines every token in `04-design-system.md`. A grep for `#` hex literals inside `src/components/` returns zero hits. `--line-active` is `#2A3446` (not the deliberately broken value).
- **Depends on:** nothing.

### A3. Three-column shell at 1920×1080  [MVP]
- **Story:** As the operator, the console fills the projector with no scrollbars.
- **Acceptance:** Grid is `304px | 1fr | 448px`, header 72px, footer 40px. At exactly 1920×1080 the body has `overflow: hidden` and no axis scrolls.
- **Depends on:** A2.

---

## B. Data & physics

### B1. Farm geometry generator  [MVP]
- **Story:** As the console, I read a real site layout rather than a hand-typed one.
- **Acceptance:** `scripts/generate_farm.py` emits `data/farm.json` with 3 zones, 120 `PanelArray`s, 3 inverters, 2 drone pads, validating against the `Farm` type. Site coords are `27.540 N, 71.915 E`. B-17 exists at zone B with `cellRows: 5, cellCols: 7`.
- **Depends on:** the schemas in `03-data-model.md` being frozen.

### B2. Physics telemetry generator  [MVP]
- **Story:** As a judge, I open one Python file and see the model that produced every number on screen.
- **Acceptance:** `data/telemetry.json` has **91 frames** (t=0..90). At the demo frame: INV-B deviation within ±0.05 of **−58.4%**, B-17 array deviation within ±0.5 of **−42.0%**, farm output **364 MW ±1**, string actual **15.02 kW**, expected **36.10 kW**. `P_RATED_STRING = 49.61`, `f_mismatch = 0.4160` (see `00-overview.md` C1/C2/C3). Fault ramps over t=6..9 so health animates.
- **Depends on:** B1.
- **Notes:** PVWatts/NOCT model, coefficients cited in README. This is the single most credibility-bearing script in the repo.

### B3. 72h forecast generator  [MVP]
- **Story:** As the prognosis stage, I have a forecast to reason against.
- **Acceptance:** `data/forecast.json` has 73 points (hourOffset 0..72), `peakAmbientC: 38.1`, `clearHours: 72`. `projected72hLossMWh` integrates the shortfall across the forecast irradiance curve and lands within ±0.05 of **1.44**. `actBefore` is *computed* as the hour cell temperature first crosses the crack-propagation threshold, and lands on **14:00** — it is not typed.
- **Depends on:** B2.

### B4. Scripted event feed  [MVP]
- **Story:** As the operator, events enter the feed at the right second with the right severity.
- **Acceptance:** `data/events.json` validates against `DemoEvent[]`. Every beat in `CLAUDE.md` §2 that says "event enters feed" has a matching row with the right `t`, `source`, `severity`.
- **Depends on:** B1.

### B5. Build-time data validation gate  [MVP]
- **Story:** As the builder, a schema drift or a number that stopped matching the physics fails the build instead of the demo.
- **Acceptance:** `npm run validate:data` parses every file in `data/` against the Zod schemas and asserts the invariants from B2/B3. Wired into `prebuild`. Deliberately corrupting one value in `telemetry.json` fails the build with a named error.
- **Depends on:** B2, B3, B4.
- **Notes:** This is the mechanical enforcement of the one principle. Cheap to build, and it's the thing that stops slow drift over a long solo project.

---

## C. Vision (the trained component)

### C1. Defect detector fine-tune  [MVP]
- **Story:** As a judge asking "what did you actually train?", I get a file, a metric, and a dataset name.
- **Acceptance:** `models/defect_yolov8n.pt` committed. `README.md` records dataset name, image count, split, licence, and the **real** mAP@50 from the run. A screenshot of the final metrics table is committed to `docs/`. No number is rounded up.
- **Depends on:** dataset sourced.
- **Notes:** Colab free T4, ~50 epochs, imgsz 640, batch 16, ~20–30 min. Classes `["crack","soiling","delamination","hotspot"]` — four so it isn't a single-class binary, but only `crack` appears on screen.

### C2. Detection on the evidence image  [MVP]
- **Story:** As the reticle, the confidence I display is what the model actually returned.
- **Acceptance:** `scripts/detect_on_evidence.py` runs the committed weights on `data/evidence/b17_rgb.jpg` and writes `b17_rgb_annotated.jpg` + `b17_detection.json`. **If the model returns 0.71, the UI says 0.71** and the §2 caption changes with it. A grep for `0.84` in `src/` returns zero hits.
- **Depends on:** C1.

### C3. Thermal hotspot extraction → cell grid  [MVP]
- **Story:** As the anomaly matrix, my 5×7 ΔT values are measured, not authored.
- **Acceptance:** `scripts/thermal_hotspot.py` cell-means a thermal image over a 5×7 grid, takes ΔT against the median baseline, thresholds at σ·2.5, runs connected components, and writes `data/evidence/b17_cellgrid.json`. The per-cell defect list rendered under the matrix is generated from this file.
- **Depends on:** a thermal source image.
- **Notes:** Classical CV, no model. More defensible here than ML and much faster to make correct.

### C4. Ironbow thermal render  [MVP]
- **Story:** As the evidence strip, my thermal thumbnail uses the same LUT as the console's colour ramp.
- **Acceptance:** `data/evidence/b17_thermal.png` rendered with matplotlib using an ironbow LUT whose stops match the `--iron-*` tokens.
- **Depends on:** C3.

### C5. Inverter acoustic evidence  [V2]
- **Story:** As the operator, I can play a 6-second inverter recording as part of the evidence bundle.
- **Acceptance:** `b17_inverter_audio.wav` plays in `InverterAudio.tsx` with a spectrogram thumbnail.
- **Notes:** `CLAUDE.md` §11.3 marks this first-to-cut *under time pressure*. There is none, so it stays. The FFT band-energy check for switching harmonics is **[STRETCH]**.

---

## D. Console

### D1. HeaderBar — KPIs  [MVP]
- **Story:** As the operator, I see farm health, output, and anomaly counts update live.
- **Acceptance:** Health reads 94/100 before t=6 and tweens to 80 across t=6..9 with no spring. Output shows **364 MW**. Anomalies 2→3, critical 0→1 at t=6. Each KPI carries a 40px recharts sparkline. All numerals tabular — **no digit jitter during the tween**.
- **Depends on:** A1, B2.

### D2. EventFeed + EventCard  [MVP]
- **Story:** As the operator, new events arrive newest-first with severity colour.
- **Acceptance:** `useVisibleEvents()` filters `e.t <= t`. 2px left border in severity colour, uppercase source, `--type-micro` timestamp, one-line truncated body, `›` chevron. 120ms slide-in from left, ease-out, no spring. Max 5 visible.
- **Depends on:** A1, B4.

### D3. FarmMap  [MVP]
- **Story:** As the operator, I see the whole site and B-17 flashing red inside Zone B.
- **Acceptance:** SVG (not canvas), 120 `<rect>` arrays. Warning/critical panels carry an SVG `<pattern>` diagonal hatch. Zone boundary strokes. B-17 gets a red dashed selection rect and a label tag. At t=6 B-17 goes critical with a single 400ms border pulse.
- **Depends on:** A1, B1, B2.
- **Notes:** The hatch is what makes the screenshot read as an engineering drawing instead of a heatmap. Don't skip it.

### D4. DroneRoute  [MVP]
- **Story:** As the operator, I watch the route draw from PAD-01 to B-17.
- **Acceptance:** SVG `<path>` with `stroke-dashoffset` computed from `t`, **not** a CSS keyframe. Seeking backwards retracts it correctly.
- **Depends on:** D3.

### D5. DroneStatus + SignalQuality  [MVP]
- **Acceptance:** Drone 01 STANDBY→ACTIVE at t=18. Battery, pad, uplink/downlink bars. All values from `/data`.
- **Depends on:** A1, B4.

### D6. InverterTable  [MVP]
- **Story:** As a judge, the contrast between INV-A/C and INV-B is self-evident in one glance.
- **Acceptance:** Three rows, monospace, tabular numerals. INV-A `41.0 / 41.0 · 0.0%`, INV-B `15.02 / 36.10 · −58.4%` in `--sev-critical`, INV-C `41.0 / 41.0 · 0.0%`.
- **Depends on:** B2.
- **Notes:** `CLAUDE.md` §13 calls this the most persuasive element in the console. It's also the cheapest. Build it early.

### D7. AnomalyMatrix — signature element  [MVP]
- **Story:** As a judge, I see the fault localised to a physical cell on a physical object.
- **Acceptance:** 5×7 grid, row labels R1–R5, column labels 1–7, each cell filled by interpolating ΔT through the ironbow ramp. **Cells fill one at a time in scan order across t=48..56**, driven by the clock — not a single fade-in. The per-cell defect list sits *directly beneath* it so grid and text are visibly the same data.
- **Depends on:** A1, C3.
- **Notes:** The sequential fill is what sells that a sensor is reading it. Everything around this element stays quiet — no glow, no gradient.

### D8. AgentReasoning cards  [MVP]
- **Story:** As a judge, I can see which model produced which sentence.
- **Acceptance:** One card per stage, teal `--sev-active` left border, header `TRIAGE · openai/gpt-oss-120b` in `--type-micro`, prose typewritten at 45 cps as a pure function of `t`. `show more ›` expands. TRIAGE enters at t=10, PROGNOSIS at t=62.
- **Depends on:** A1, E1.

### D9. EvidenceStrip + FlyoverPlayer  [MVP]
- **Acceptance:** RGB thumb appears at t=40, thermal thumb at t=48, flyover clip at t=56. Thumbnails are the real generated artefacts from `data/evidence/`.
- **Depends on:** C2, C4.

### D10. ForecastBand  [MVP]
- **Acceptance:** recharts band over 72h appearing at t=62, peak 38.1 °C marked. `RISK HIGH · act before 14:00` badge. `72H CLEAR — DELAY IS COSTLY` chip.
- **Depends on:** B3.

### D11. RepairQueueBar + deterministic ranking  [MVP]
- **Story:** As a judge asking "how does it prioritise?", I get shown a pure function.
- **Acceptance:** `rankQueue()` in `src/lib/ranking.ts` is pure and LLM-free. Four tasks; **B-17 ranks #1 by a clear margin**, and re-running the demo produces the identical order every time. Footer reads `REPAIR QUEUE · 4 TASKS · NEXT: B-17 (CRITICAL)`.
- **Depends on:** B2.

### D12. Timeline  [MVP]
- **Acceptance:** Timestamped rows fill in progressively: 09:48 anomaly detected → drone dispatched → evidence captured → added to queue ranked #1.
- **Depends on:** A1, B4.

### D13. ApprovalBar — the human gate  [MVP]
- **Story:** As the operator, nothing enters the work queue without my click.
- **Acceptance:** Sticky bottom-right, full-width `--sev-critical` button reading `APPROVE — CREATE WORK ORDER →`. Secondary row `✓ QUEUED / INSPECT EVIDENCE / OVERRIDE`. On click: label → `✓ WORK ORDER #INC-B17 CREATED`, B-17 turns `--panel-scheduled`, queue 4→3.
- **Depends on:** D11.
- **Notes:** `approved` is **the only legitimate mutable state outside the clock** in the entire app.

---

## E. Agent layer

### E1. Cached three-stage agent  [MVP]
- **Story:** As the console, I stream pre-run reasoning that reads as live generation.
- **Acceptance:** `scripts/run_agent.py` runs TRIAGE/PROGNOSIS/RECOMMENDATION once against Groq and writes `data/agent_cache.json` validating against `AgentCache`. **Triage returns `requiresPhysicalVerification: true`** with a rationale grounded in the mechanism (soiling and cracking produce similar string-level signatures; only imaging distinguishes them).
- **Depends on:** B2, C2, C3, B3.
- **Notes:** That triage sentence is the justification for the drone existing. Tighten the prompt until the model produces it.

### E2. Numeric cross-check in `run_agent.py`  [MVP]
- **Story:** As the builder, the LLM cannot introduce a number that contradicts the physics.
- **Acceptance:** After each call, every numeric field in the response is asserted against `telemetry.json`/`forecast.json` within tolerance. A mismatch fails the script loudly rather than writing the cache.
- **Depends on:** E1.
- **Notes:** `CLAUDE.md` §17 asks for this explicitly. The LLM writes *prose about* numbers; it never sources them.

### E3. `LIVE_AGENT=true` escape hatch  [V2]
- **Acceptance:** Set the env var and the three calls hit Groq at runtime, producing identically-shaped output. Off by default.

---

## F. Cinematic

### F1. MissionLog  [MVP]
- **Acceptance:** Top-left, 78% width, typewriter at 45 cps, coloured by event class (anomaly→`--iron-80`, confirmation→`--sev-active`, status→`--text-primary`). Header `SURYA AGENT — mission log` + `● LIVE`.
- **Depends on:** A1.

### F2. Timecode + StatusPill  [MVP]
- **Acceptance:** `● REC` pulsing, `T+00:0X`, `LIVE`. Pill hard-cuts between states per §2 — no transition. Instrument readouts don't ease.
- **Depends on:** A1.

### F3. PiPConsole  [MVP]
- **Story:** As the audience, I watch the real console react in real time to the physical event, so I never have to be told the two halves are one system.
- **Acceptance:** Renders the **actual `<ConsoleRoot />`** inside a `transform: scale(0.31)` wrapper — not a screenshot, not a video. Driven by the same clock. 2px `--sev-active` border with corner brackets.
- **Depends on:** D1–D13.
- **Notes:** `CLAUDE.md` §15 calls this the smartest element in the design. It is also nearly free once the console exists. Highest impact-per-hour item in the pack.

### F4. TargetReticle  [MVP]
- **Acceptance:** Four `--iron-80` corner brackets in screen space, label tab `B-17 — surface crack suspected (<real confidence>)` sourced from `b17_detection.json`.
- **Depends on:** C2.

### F5. Cinematic over licensed video  [MVP]
- **Acceptance:** Full 90s plays with console→cinematic→console cuts at t=18 and t=74, over a CC0 solar-farm flyover from Pexels/Pixabay. **This alone is a complete, presentable demo.**
- **Depends on:** F1–F4.

---

## G. 3D scene — promoted to planned

### G1. R3F scene with instanced panel field  [V2]
- **Acceptance:** ~500 instanced boxes via drei `<Instances>`, hard cap 600. Ground, sky gradient shader, sun + hemisphere fill, linear fog. **60fps at 1920×1080 on the demo machine**, `dpr={[1, 1.5]}`, no shadows except one blob under the drone.
- **Depends on:** F5 shipping first.
- **Notes:** Was M8/gated-stretch under time pressure. With no deadline it is a planned phase — but it still comes *after* a complete demo exists, so a bad day on the scene never costs you the demo.

### G2. Drone model + camera spline  [V2]
- **Acceptance:** Low-poly glTF drone. Camera position/lookAt/fov are **pure functions of `t`** sampled from a spline; the `lerp` smooths toward the target but never drives it, so seeking still works. Hits the five marks in `CLAUDE.md` §14.
- **Depends on:** G1.

### G3. Cracked-panel mesh  [V2]
- **Acceptance:** One instance swapped for a unique mesh with an alpha-mapped branching crack decal, visible from t=34.
- **Depends on:** G1.

### G4. Ironbow thermal post-process pass  [V2]
- **Acceptance:** Luminance mapped through the ironbow LUT, hotspot mask biasing the cracked region hotter, active t=48..56. Scanline noise + `dpr 0.75` during the pass — real thermal sensors are lower-res, and the fidelity drop reads as authentic.
- **Depends on:** G1, G3.

---

## H. Upside

### H1. Acoustic FFT band-energy check  [STRETCH]
- **Acceptance:** Spectrogram flags irregular switching harmonics on INV-B with a computed band-energy ratio, displayed next to the player.

### H2. `prefers-reduced-motion` support  [V2]
- **Acceptance:** Typewriter skipped (full text shown immediately), everything else unchanged.

### H3. Recorded demo capture  [V2]
- **Acceptance:** A clean 90s screen recording at 1920×1080 committed as the fallback if anything breaks live.
- **Notes:** For a personal project this doubles as the shareable artefact. Worth doing.

### H4. Zone C  [V2 — restored]
- **Notes:** `CLAUDE.md` §20 cuts Zone C to reach 80 panels under time pressure. Keep all 120 and all three zones; the cut was schedule-driven only.
