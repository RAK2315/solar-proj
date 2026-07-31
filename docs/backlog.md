# Backlog — what is not built, and why

Kept current. If something on this list ships, it comes off the list; if something
here is wrong, it is a bug in the document.

Last reviewed: **2026-07-31**.

---

## 1. The detector — the one outstanding claim

**Status: not done. Nothing about it is faked, which is why it is visible.**

| Missing | Consequence on screen |
|---|---|
| `models/defect_yolov8n.pt` | no weights committed; nothing to show a judge who asks "what did you train?" |
| `data/evidence/b17_rgb.jpg` | RGB slot in the evidence strip is absent, not empty |
| `data/evidence/b17_rgb_annotated.jpg` | no burned-in box |
| `data/evidence/b17_detection.json` | reticle shows the array's deviation instead of a confidence; invariant I11 is skipped |
| measured mAP@50 / per-class AP | README has no metrics table |

The dataset is already downloaded (`dataset/rgb-solar-panel-fault-v2/`, CC BY 4.0,
921 images). Training and inference run on Colab only — **this laptop never installs
torch or ultralytics**. Procedure: `plan/COLAB-NOTEBOOK.md`, cells 1–5 and 7.

Report **AP@50 for `Cracked`** on its own alongside the five-class mean. `Saglam` has
27 boxes and will drag the mean down; `Dirty` has zero test instances so its AP is
undefined rather than 0.0.

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

- **Rotate the Roboflow API key** — it was in git history before the scrub.
- **Run the Colab notebook** (cells 1–5 and 7) and commit the artefacts.
- **Set `GROQ_API_KEY` on Vercel** — server-side, never `NEXT_PUBLIC_`.
- **Record the 90 seconds** (`docs/recording.md`) and measure the frame rate.
