# Backlog — what is not built, and why

Kept current. If something on this list ships, it comes off the list; if something
here is wrong, it is a bug in the document.

Last reviewed: **2026-08-02**. Start at **§5b — open bugs**.

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

## 5b. OPEN BUGS — found 2 Aug, not yet fixed

**These are the next thing to do.** All three were found by looking at live mode on
screen, which is the only way any of the recent bugs have been found.

### B1 — the anomaly matrix does not render in live mode 🔴

The signature element of the entire console is blank. `useMatrixFillCount()` in
`src/store/selectors.ts` derives its fill from `useDemoClock(s => s.t)` and the
`BEAT.thermalScan..thermalDone` window. Live mode never advances `t`, so the count is
0, every cell paints `--surface-inset`, and both defect lists filter themselves to
nothing.

Same class as the dispatch-doesn't-fly-the-scene bug: a live surface gated on a
scripted clock. The fix is the same shape — derive the fill from the flight cue, or
from "this array has been inspected", rather than from `t`.

### B2 — "Cell defects" renders twice 🟡

`AnomalyMatrix` renders its own sub-header and ΔT list (`AnomalyMatrix.tsx:65`), and
the rail restructure wrapped `CellDefectList` in a second block with the same label
(`DetailPanel.tsx`). Two headings, and in live mode the second list is empty because
of B1. Pick one owner.

### B3 — the forecast band does not say it is site weather 🟡

The chart is identical for all 120 arrays, which is correct — it is the site's
weather, and only the RISK badge, deadline and projected loss are per-array. But
nothing on the chart says so, so it reads as a bug. One caption fixes it.

## 5c. UI REDESIGN — the highest-priority item after the bugs above 🔴

**Full brief: [`docs/ui-brief.md`](ui-brief.md).** Read it before touching any
component — it has the region-by-region diagnosis, the identity constraints, and the
one rule a redesign must not break.

Short version: the console is too dense to read. Type runs 10–13 px throughout with no
hierarchy, the right rail stacks ~25 facts at equal weight, and it is shown on a
projector. The owner has raised this more than once, weeks apart, about different parts
of the same screen — it is the product's biggest remaining weakness and it outranks
every feature on this list.

The data layer does not change. This is a presentation swap inside `src/components/`
plus `globals.css`; every selector keeps its signature.

## 6. Known cosmetic and structural gaps

- **Map has no zoom or pan.** 120 arrays at a fixed scale.
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
