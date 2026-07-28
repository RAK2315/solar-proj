# Dataset provenance

Copy this verbatim into `README.md` at Phase 3. Every field below was read off the
downloaded `data.yaml` / `README.dataset.txt`, not from the dataset's web page.

## Defect detection — RGB

| Field | Value |
|---|---|
| **Name** | Solar Panel Fault Detection |
| **Workspace / project** | `solarvision-gwljt` / `solar-panel-fault-detection` |
| **Version** | 2 (`yolov8-object-detection-v1-0`) |
| **URL** | https://universe.roboflow.com/solarvision-gwljt/solar-panel-fault-detection/dataset/2 |
| **Licence** | **CC BY 4.0** — attribution required, so this table must ship in the README |
| **Attribution** | "Provided by a Roboflow user", via Roboflow Universe |
| **Format** | YOLOv8 object detection |
| **Images** | **921** — train 797 / valid 82 / test 42 |
| **Boxes** | **1,067** |
| **Classes (5, verbatim)** | `BakimGereken`, `Cracked`, `Dirty`, `Good`, `Saglam` |
| **mAP@50** | *fill in from the actual training run — do not round up* |

### Class distribution (counted from the label files, not the dataset page)

| Class | Train | Valid | Test | Total | Note |
|---|---|---|---|---|---|
| `Cracked` | 315 | 13 | 22 | **350** | **The only class that appears on screen.** Well represented. |
| `Good` | 237 | 21 | 17 | 275 | Healthy baseline |
| `Dirty` | 234 | 38 | 0 | 272 | Maps to the "soiling" concept. **Zero test instances** → test mAP undefined for this class. |
| `BakimGereken` | 109 | 20 | 14 | 143 | Turkish: "maintenance required" |
| `Saglam` | 14 | 12 | 1 | 27 | Turkish: "intact". **Too sparse to learn** — expect near-zero AP. |

### Things to state honestly, not hide

1. **Class names stay as shipped.** `CLAUDE.md` §11 proposes `["crack","soiling","delamination","hotspot"]`. This dataset ships five different labels, two of them Turkish. **Train and report the real ones.** Renaming them would describe a model that doesn't exist. Only `Cracked` reaches the UI.
2. **Report per-class mAP@50, not just the overall figure.** `Saglam` has 27 boxes and will score near zero, dragging the mean down. The number that matters for this project is **AP@50 for `Cracked`**, and it deserves to be visible on its own rather than buried in a five-class mean that's depressed by a class we don't use.
3. **`Good` and `Saglam` are near-duplicate concepts** ("good" / "intact"). They were *not* merged — merging would be a data modification requiring disclosure, and the honest path is to train on the labels as published and note the redundancy here.
4. **`Dirty` has no test instances**, so any "test mAP" for it is undefined rather than zero. Don't report a 0.0 that implies the model failed at something it was never evaluated on.

## Thermal source — DONE ✅

| Field | Value |
|---|---|
| **Name** | InfraredSolarModules |
| **Author** | Raptor Maps, Inc. |
| **URL** | https://github.com/RaptorMaps/InfraredSolarModules |
| **Licence** | **MIT** |
| **Images** | 20,000 single-module UAV thermal crops, 24×40 px, 8-bit greyscale |
| **Classes (12)** | No-Anomaly 10000, Cell 1877, Vegetation 1639, Diode 1499, Cell-Multi 1288, Shadowing 1056, Cracking 940, Offline-Module 827, Hot-Spot 249, **Hot-Spot-Multi 246**, Soiling 204, Diode-Multi 175 |
| **Image used** | `7916.jpg` — class `Hot-Spot-Multi`, candidate #5 |
| **Used by** | `scripts/thermal_hotspot.py` — classical CV, **no model, no training, no GPU** |
| **Output** | `data/evidence/b17_cellgrid.json`, `data/evidence/b17_thermal.png` |

**Why this dataset and not PVMD or the Roboflow IR set:** these are *single-module crops*. A 5×7
grid over an aerial shot of forty panels would average sky and dirt into cells and mean nothing.
Single-module framing is what makes each grid cell map to roughly one physical solar cell, which is
what makes the anomaly matrix true rather than decorative. MIT is also the cleanest licence of the
three candidates.

### Measured result — this OVERRIDES the story in `CLAUDE.md` §8

Run: `python scripts/thermal_hotspot.py` (σ = 1.0, auto-selected)

```
        C1     C2     C3     C4     C5     C6     C7
  R1   -2.5    0.7    1.5    1.5    1.6    1.7    0.7
  R2   -1.9    1.9   [2.7]  [2.8]  [2.8]  [2.7]   1.5     <- 4 hot cells, 1 cluster
  R3   -2.4    0.2    0.8    1.0    1.1    0.8    0.0
  R4   -4.7   -2.2   -1.7   -1.4   -1.3   -1.5   -2.4
  R5   -6.3   -2.9   -2.4   -2.4   -2.2   -2.4   -3.3
```

**Two deviations from `CLAUDE.md` §8. Both must propagate — the measurement leads, the story follows.**

**1. Hotspot coordinates: measured `(2,3) (2,4) (2,5) (2,6)`, not `(2,5) (2,6) (4,5) (4,6)`.**

This is a **contiguous horizontal band in row 2 — one connected cluster**, not two disconnected pairs.

That is *better physics than the spec invented*. Module substrings are wired in rows, and when a
bypass diode activates the **entire substring** goes into reverse bias and heats as a band. A single
contiguous row of hot cells is exactly the bypass-diode signature `CLAUDE.md` §8 describes in prose —
the measurement matches the mechanism more faithfully than the made-up coordinates did.

Propagate to: `generate_telemetry.py` fault injection, the §9.2 prognosis prompt, the per-cell defect
list under the matrix, and invariant **I10** in `plan/schemas.ts` (currently asserts the old four).

**2. ΔT magnitude: measured ≈ +2.8 °C cell-mean, not +8 / +6 / +5.**

Two honest reasons it's lower, and neither is a bug:
- **Cell-mean dilution.** Each grid cell averages ~4×5 px, mixing the hot core with cooler
  surroundings. A thermographer quoting "+8 °C" means the *peak pixel*; we report the *cell mean*,
  because the cell mean is what the matrix visualises. Different quantity, both legitimate.
- **The 8-bit scaling assumption.** Raptor Maps images are normalised greyscale, **not radiometric**.
  Absolute temperature is unrecoverable from the file, so `thermal_hotspot.py` declares
  `THERMAL_SPAN_C = 25.0` across the 0–255 range and derives ΔT linearly from it.

⚠️ **Do not tune `THERMAL_SPAN_C` upward to reproduce the spec's +8 °C.** That is reverse-engineering
an assumption to hit a predetermined answer, which is the exact failure `CLAUDE.md` rule #1 forbids.
Either keep 25.0 and report ≈+2.8 °C, or change the span for a *stated physical reason* and report
whatever falls out.

**The defensible sentence:** *"Cell localisation is measured from a real UAV thermal image by
classical CV. Absolute ΔT is a declared linear scaling of 8-bit normalised intensity, because the
source is not radiometric — the span is stated in the script."* A declared assumption is credible;
a number tuned to fit is not.

## Evidence image

`data/evidence/b17_rgb.jpg` is taken from this dataset's **held-out `test/` split** — 42 images the
model never sees during training. The confidence the UI displays is the model's genuine output on
an unseen image, which is the whole point of doing it this way.
