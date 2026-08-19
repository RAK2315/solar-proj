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
