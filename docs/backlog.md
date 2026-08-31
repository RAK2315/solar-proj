# Backlog — what is not built, and why

Kept current. If something on this list ships, it comes off the list; if something
here is wrong, it is a bug in the document.

Last reviewed: **2026-08-18**. §5b and §5c are both clear — the redesign shipped.
Start at **§4**, the prognosis/recommendation live path, which is now the largest gap.

---

## 1. The detector — ✅ DONE, 1 Aug 2026

Trained on Colab T4, 50 epochs, 13 minutes. All artefacts committed; invariant **I11**
went from `skip` to `PASS`.

| Figure | Value |
|---|---|
| AP@50 `Cracked` — **the number this project quotes** | **0.995** |
| mAP@50, four-class mean (test, held out) | 0.9813 |
| Evidence-frame confidence | 0.9084 |
| `Dirty` | *undefined* — zero test instances, not 0.0 |

Full table and provenance: `docs/dataset-provenance.md`.

**One thing still to do here:** `docs/training/metrics.png` — the screenshot of Cell 4's
output. `results.csv` and `training_curves.png` are in, the screenshot is not. It is
corroboration for numbers that are already committed as data, so it is a nice-to-have.

### Known limitation, stated on screen

The source dataset is **ground-level photography**, so the evidence frame is a panel
photographed on a floor, shoes in shot — not an aerial capture of Bhadla. The detection
is genuine and on an image the model never saw; the *framing* is not site imagery. The
evidence strip says exactly that beneath the thumbnails rather than letting the layout
imply a drone took it.

Closing this properly would need a UAV-perspective crack dataset. `Raptor Maps
InfraredSolarModules` (already used for thermal) is IR-only, so it does not solve it.

## 2. Evidence media never captured

- `b17_inverter_audio.wav` — 6 s clip. `InverterAudio.tsx` was never written.
- `b17_flyover.mp4` — 8 s clip. `FlyoverPlayer.tsx` was never written.

`CLAUDE.md` §11.3 names acoustic as the first thing to cut, so this is expected. The
evidence strip renders present slots and omits absent ones; nothing implies otherwise.

## 3. Right rail — further work

Reorganised into five groups (State → Assessment → Inspection → Outlook → Decision).
Still open:

- **Group collapse.** All five are always expanded. On a healthy array with a long
  agent paragraph the rail still scrolls further than it needs to.
- **Evidence lightbox.** `INSPECT EVIDENCE` scrolls to the inspection group; it does
  not open the thermal frame at full size.
- **Findings/Recommendation for non-B-17 arrays.** Gated off, correctly — they are
  the cached B-17 run. A live prognosis and recommendation stage (the triage stage
  already exists at `/api/triage`) would let them render for any array.

## 4. Agent

- **Prognosis and recommendation have no live path.** Only triage does. In live mode
  the other two stages are absent for every array except B-17, which is honest but
  incomplete. `LIVE_AGENT` now works (`scripts/run_agent.py`), but only for
  regenerating the committed cache.
- **No retry from the UI.** An `unavailable` triage stays unavailable until the array
  is reselected.

## 5. Scenario injection — further work

Shipped: a `Scenario` screen that injects four mechanisms onto any array, writing a
scenario event that the physics then evaluates. Still open:

- **No soiling injection.** Only mismatch faults. Soiling is a derate rather than a
  scenario event, so it needs a different plumbing.
- **No scheduling.** Injected faults start now; they cannot be queued for a future
  site hour the way the committed ones are.
- **No export.** An injected case cannot be written back out to `scenario.json`, so a
  case worth keeping has to be added to `generate_scenario.py` by hand.

## 5b. OPEN BUGS — found 2 Aug, ✅ ALL FIXED 2 Aug

All three were found by looking at live mode on screen, which is the only way any of
the recent bugs have been found. A fourth, **B4**, was found while diagnosing B1 —
same cause, same section, and it made B1's fix half a fix.

### B1 — the anomaly matrix did not render in live mode ✅

The signature element of the entire console was blank. `useMatrixFillCount()` derived
its fill from `useDemoClock(s => s.t)` across the `BEAT.thermalScan..thermalDone`
window. Live mode never advances `t`, so the count was 0, every cell painted
`--surface-inset`, and both defect lists filtered themselves to nothing.

Same class as the dispatch-doesn't-fly-the-scene bug: a live surface gated on a
scripted clock. Fixed with the same shape of fix — `useInspectionClock()` in
`selectors.ts` returns `t` in demo mode and the **flight cue's** scene-timeline
position in live mode, holding at `BEAT.thermalDone` once the array has actually been
inspected. `flightCue.ts` already maps site seconds onto that timeline, so one set of
beats serves both modes.

### B2 — "Cell defects" rendered twice ✅

`AnomalyMatrix` owned a sub-header and ΔT list, and the rail restructure wrapped a
second `CellDefectList` in a block with the same label. `AnomalyMatrix` is now the
sole owner — the grid and the list have to be adjacent to read as the same data.
`CellDefectList` is deleted rather than left unused.

### B3 — the forecast band did not say it was site weather ✅

One caption above the chart: the curve is the site's ambient forecast and is the same
for every array; the risk badge, deadline and projected loss below are computed for
the selected array.

### B4 — captured frames never appeared in live mode ✅ (found while fixing B1)

`useEvidence()` had B1's defect exactly: it gated every slot on `t >= beat` against
the demo clock. In live mode an operator could fly a mission to B-17, be shown the
cell grid, and **never see the thermal frame the grid was measured from** — the
imagery the drone was sent for. It now reads `useInspectionClock()`.

The two imaging gates in `DetailPanel` moved onto the same clock, so a live capture
plays out on its own beats — RGB while the drone is on station, then the grid filling
cell by cell — rather than arriving whole after the mission ends, which read as a
lookup rather than a sensor.

**Why the suite did not catch any of this:** every test asserted the *heading*
(`'Anomaly matrix'`, `'Cell defects'`), and headings render whether or not the thing
beneath them has any content. The five new tests in `live.test.tsx` assert the
measured ΔT values and the frames instead.

## 5c. UI REDESIGN — ✅ DONE, 18 Aug 2026

**Brief: [`docs/ui-brief.md`](ui-brief.md)** — the diagnosis it records is the one
that was fixed. Ported from Stitch output in `docs/temp/`, screen by screen.

What changed, against the brief's four complaints:

| Complaint | Fix |
|---|---|
| No hierarchy — 10–13 px throughout | A five-tier scale: `t-hero` 52 / `t-kpi` 42 / `t-metric` 32 / `t-value` 24 / `t-data` 13. The figure that matters is ~4.7× the caption beside it. |
| The header buried the four figures an operator reads first | They moved out of the 64 px chrome bar into their own 118 px band — four tiled cells sharing edges, at 52 px, with a gauge or a trend under each. |
| The right rail was a wall of ~25 equal facts | It is one argument top to bottom, each step a different SHAPE: pinned header, keyed diagnostic sentence, two 42 px figures, a 2×2 of readings, the peer table, the agent's outlined teal box, one control, the outlook, the gate. |
| The feed's rows were indistinguishable | Severity now changes the whole slab — tinted ground, 4 px keyed edge, the severity spelled out. An array named in a row is a button that selects it. |

Also in the port: the map gained a survey grid, per-array ID labels, working zoom
and zone annotations that were previously drawn off-canvas at `x = -64` and clipped
away entirely; the dossier became a full-bleed workspace with the matrix as a
labelled lattice printing ΔT in the cells; all four module screens were rebuilt;
`--text-muted` (2.8:1) was promoted to `--text-secondary` on the 62 places it was
carrying content rather than chrome; and `--sev-*-ink` was added so a 42 px critical
figure is legible without leaving the ironbow ramp.

**A fifth instance of the evidence-scoping bug was found and fixed on the way.**
`StatusChips` printed `forecast.actBefore` — a clock hour computed from B-17's own
thermal dose — under any array whose status was critical, so injecting a fault
produced a console telling an operator to act before an hour nobody had computed for
that array. It now quotes that array's own booked window in hours instead, and two
tests in `live.test.tsx` assert the value rather than the heading.

The data layer did not change: `src/lib/`, `src/store/`, `scripts/` and `/data` are
untouched and every selector kept its signature.

## 6. Known cosmetic and structural gaps

- **Map has zoom but no pan.** The zoom shrinks the viewBox around the centre, so
  at 2.5× the outer zones are off screen and there is no way to reach them.
- **No responsive layout.** Fixed 1920×1080. Deliberate — this runs on a projector.
- **`VIEW ALL EVENTS` caps at the full derived feed**, which is short by construction;
  there is no historical event store behind it.
- **Signal quality is derived from mission state**, not modelled. It is two numbers
  that change when a drone is airborne, and it says nothing it cannot support.

## 6b. Found by the browser harness, 19 Aug 2026

`npm run shoot` (playwright-core driving the installed Chrome — see
`scripts/shoot.mjs`) is the first thing on this machine that opens the product.
It found two things immediately that 345 pure-function tests could not.

- **✅ FIXED — `projectToScreen` was mirrored.** It built `right` as the camera's
  LEFT, so both basis vectors came out flipped and every projected point landed
  rotated 180 degrees about the centre of frame. `reticleRect` was immune (it
  bounding-boxes four corners symmetric about the target, and a point reflection
  through that target leaves the box identical), which is why nothing caught it —
  but every panel ID tag was drawn on the far side of the frame from the array it
  names, which is exactly the doubt those tags exist to answer. `scene.test.ts`
  now checks the projection against a real three.js `PerspectiveCamera` instead of
  against itself.

- **✅ FIXED — `data/telemetry.json` shipped in the client bundle.** All 1.1 MB of
  it, as a single `JSON.parse('...')` line inside `chunks/app/layout.js`. The dev
  server truncated that chunk on roughly one load in two; the browser threw
  `SyntaxError: Invalid or unexpected token`, hydration never ran, and the page
  still looked completely correct because the server-rendered markup was all
  there. Nothing responded to a click.

  The demo is one incident on one array, so across all 91 frames exactly ONE of
  the 120 arrays ever changes — the other 119 were stored identically, ninety-one
  times over. `data/telemetry_client.json` stores the base once plus the per-frame
  differences: **1617 kB → 52 kB, 3.2%**. `layout.js` in dev went from carrying
  the whole file to 405 kB total.

  It is a shipping format, not a summary, and two things keep it that way:
  `scripts/pack_telemetry.ts` refuses to write unless unpacking reproduces
  `telemetry.json` **byte for byte**, and `telemetryPack.test.ts` asserts the same
  against the committed pair. `telemetry.json` is still the source of truth and
  every invariant is still asserted against it.

- **The demo must run from a production build, not from `npm run dev`.** Measured,
  not assumed: `npm run check:live` loads the real console in the real browser and
  presses a real key. Against `next dev` it was dead on 1 load in 10 — the scene
  chunk is 12 MB and `page.js` 9.6 MB of unminified three.js, and a chunk that
  size truncates whatever else is fixed. Against `next start` it was awake on
  **20 of 20**. `npm run demo` builds and serves, so the safe path is the short
  one.

## 6c. The detector on the render — 30 Aug 2026

- ✅ **The modules are textured with photographs and the detector fires on them.**
  Two modules of the inspected array carry real panel photographs from the test
  split; the crop handed to the model is the module rather than the module plus a
  field of sand, and a live pass now returns `Cracked` at 0.57–0.63 on the render.
  Generator: `scripts/make_panel_textures.mts`. Provenance is stated on screen.

- [ ] **`crackedOnly()` understates what the model said.** On the wide crop the
  model's top answer was `Saglam` (intact) at 0.94; the UI discards every
  non-`Cracked` class and prints "the model found nothing", which is true of
  cracked boxes and quieter than the truth. Showing the best other class, clearly
  labelled as not what we are looking for, would be more honest and would also
  make a false negative legible.

- [ ] **The other 118 arrays are still untextured.** Two were done as a test so the
  owner could look before the rest. The instanced field in `PanelField.tsx` shares
  one material, so texturing it means either a shared atlas or accepting one
  photograph across the whole field.

- [ ] **Measure inference time on the demo machine.** Every figure taken here came
  through headless Chrome on a software rasteriser and ranged 300 ms to 40 s
  depending on what the scene was doing. The console prints the real measurement;
  it just has not been read on real hardware.

## 6d. Left open after the Phase 23 review

- [ ] **A job with no work to do still consumes a crew.** `schedule.ts`: a
  `shading` or `none` cause books `REPAIR_HOURS = 0` and `needsInspection =
  false`, yet still takes `TRAVEL_HOURS_BASE × accessCost` of a crew's day — so a
  row DayPlan labels "no repair — geometry" can push a real repair past its
  deadline. That is the one number the component exists to report. Not changed
  here because it moves a headline figure ("2 of 4 jobs finish late") and the
  right answer may be to drop such jobs from the plan rather than to zero their
  travel.

- [ ] **A panel texture that 404s fails quietly.** `CrackedPanel` logs the error
  and falls back to the drawn texture, but `SurfaceProvenance` and the incident
  file go on saying the surface is a photograph. The claim is not wired to whether
  the image actually loaded.

## 6e. Found by looking at it, 30 Aug 2026 — ALL FOUR FIXED 31 Aug 2026

Three reports from the owner plus one thing found while chasing them. All four were
presentation-layer; none touched physics, data or the agent. Each entry keeps its
original measurement and adds what the fix measures now.

- [x] **The 3D canvas is sized to `scale` of its container, so the cinematic scene
  fills only part of the frame on any window smaller than 1920x1080.** Measured
  during a real sortie at 1512x900: the container is 1920x1080 untransformed, and
  the canvas CSS box comes out 1512x850 — exactly the `useFitToWindow` factor,
  0.7875. R3F measures its container with `getBoundingClientRect()`, which returns
  POST-transform pixels, and writes that back as the canvas size; the wrapper's
  `scale()` then shrinks it a second time. So the scene renders into the top-left
  `scale` fraction and the rest is black. At 1920x1080 the scale is 1 and it is
  correct, which is why every screenshot harness has missed it. On a 1366x768
  projector roughly half the frame would be black. Likely fix: `resize={{ offsetSize:
  true }}` on `<Canvas>` — `offsetWidth` ignores transforms — but measure it, do not
  assume it. **This is the highest-value fix on the list.**

  **FIXED.** `resize={{ offsetSize: true }}` on the `<Canvas>`; `react-use-measure`
  then takes width and height from `offsetWidth`/`offsetHeight`, which ignore
  transforms. Measured after, during a real sortie: the canvas fills 100% of its
  container at 1512x900, 1920x1080 and 2560x1450 — it was 62% at 1512x900.
  `check:layout` now measures the canvas against its box and fails below 98%, so it
  cannot come back unnoticed: the pre-fix geometry, 1190.7x669.8 in 1512x850.5,
  scores 62%.

- [x] **`useFitToWindow` caps the scale at 1, so zooming out gives a small console
  island in a large dark bezel.** Measured at a 2560x1450 viewport: scale 1, a
  ~320px bezel each side. The cap was written to stop 52px type becoming 78px on a
  4K monitor, which is right for a monitor and wrong for browser zoom — zooming out
  doubles the CSS viewport and the app responds by rendering physically smaller.
  Letting it scale above 1:1 makes the console zoom-invariant, which is what a
  fitted fixed-size design should be.

  **FIXED.** The `1` came out of the `Math.min`. Measured after: scale 1.33333 at a
  2560x1450 viewport, exactly `min(2560/1920, 1450/1080)`, and unchanged at 0.7875
  and 1 for the two smaller viewports.

- [x] **The run ledger's "same pixels" caption is wrong during a flight.** It
  decides two runs share pixels by comparing their SOURCE STRING
  (`log[0].source === log[1].source`). An inspection pass fires several runs with
  the identical string `the drone's camera over B-17` while the camera ORBITS, so
  the ledger prints "same pixels as the run above it — the same answer is the
  point" directly above `2 found / 1 found / 1 found / nothing found`. The varying
  counts are correct and expected — legibility depends on the angle, which is why
  the pass keeps its best frame. The caption claiming they are the same pixels is
  the defect. It has to compare the frame, not its label. (The caption is correct
  in its other case, two Verify runs on the committed photograph.)

  **FIXED.** `RunLine` now carries a `frameHash` — FNV-1a over the encoded frame —
  and the caption compares that instead. Measured after: a flight pass logging
  `1 found / nothing found / 2 found / 1 found` shows no caption; two Verify runs on
  the committed photograph show it. Both branches have unit tests.

- [x] **Four explanatory notes land in one band in the cinematic.** Measured
  y-positions at 1512x900: 687 "the box is the module, not the crack" (LiveReticle),
  710 the target reticle's label tab, 791 "The module surface here is a photograph"
  (SurfaceProvenance), 828 the flight-speed control. Each was added in a different
  phase to answer a different fair objection and none knew about the others. They
  overlap each other and the PiP. Individually defensible, collectively unreadable
  — this wants one provenance strip, not four.

  **FIXED.** The two DISCLOSURES merged into one `ViewfinderNotes` strip. The
  reticle's tab stayed where it was, because it is spatially bound to the module it
  names; the speed control moved above the status pill, because it is a control and
  not a note. Measured after, in shell coordinates: strip 653..1267, PiP ends at
  627, speed control 1525..1888 sitting above the pill at 1001..1048. Nothing
  overlaps anything.

Also noticed, not a code bug: **the agent reads AGENT UNAVAILABLE locally** because
`GROQ_API_KEY` is unset on this machine. The panel degrades correctly and says so.
It is already a standing operator item below.

---

## 7. Deliberately out of scope

Auth, accounts, a second site, historical browsing, a settings page, a theme toggle.
None of these appear in the product's own argument.

---

## Standing items for the operator (not code)

- **Rotate the Roboflow API key.** The current one was pasted into a chat transcript on
  1 Aug. Training is done and the key is no longer needed for anything, so rotating it
  costs nothing.
- **Screenshot Cell 4** into `docs/training/metrics.png`.
- **Set `GROQ_API_KEY` on Vercel** — server-side, never `NEXT_PUBLIC_`.
- **Deploy to Vercel.** Nothing blocks this now.
- **Record the 90 seconds** (`docs/recording.md`) and measure the frame rate.
