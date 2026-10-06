"""
scripts/render_thermal.py -- one MODELLED thermal frame for each array we hold no
capture of.

WHAT THIS IS, AND WHAT IT IS NOT.

We hold one real thermal capture, of B-17. The other 119 arrays have none. This
script draws, for each of them, the frame a thermal camera would be expected to
return given what the site record says about that array. The frames are an input
for the whole-field classifier and nothing else.

They are NOT measurements. Nothing rendered here may be shown as a capture, and
every classifier result that rests on one is labelled "flagged from modelled
signature". B-17 is deliberately not rendered: it has the real thing.

HOW A FRAME IS BUILT.

  resolution  read from the dataset's own images when the dataset is on disk, and
              checked against the constant below. 24 wide by 40 high, 8-bit grey.
  base level  the median grey level of the dataset's No-Anomaly frames stands for
              the healthy cell temperature the PV model gives at reference
              conditions (physics.cell_temp). One level is THERMAL_SPAN_C / 255
              degC, the same declared scaling scripts/thermal_hotspot.py uses.
  shape       the mean row and column profile of the dataset's No-Anomaly frames:
              warm in the middle, cooler toward the frame's edge.
  mechanism   one pattern each, sized in degC from the physics model:
                hot-spot    one cell, hotter by the measured hot-band delta
                diode band  a third of the module, hotter by the same delta
                soiling     irregular patches, cooler by the model's own figure
                            where the dirt lies; dirt keeps light off the cell,
                            so it lowers heat input as well as power
                offline     the whole module hotter (no committed array uses it)
  noise       pixel noise at the dataset's measured level.

DETERMINISTIC. One seed, and each array's own generator is derived from the seed
and the array id, so adding an array does not change any other array's frame.

The statistics below were measured from the dataset with --measure. Run that
again if the dataset copy changes; it prints the values to paste here.

    python scripts/render_thermal.py            # writes data/evidence/thermal_modelled.*
    python scripts/render_thermal.py --measure  # prints the dataset statistics
"""

import argparse
import base64
import hashlib
import json
import os

import numpy as np
from PIL import Image

import physics as P
from thermal_hotspot import IRONBOW_STOPS, THERMAL_SPAN_C

DATASET_DIR = "dataset/thermal-raptormaps"
OUT_JSON = "data/evidence/thermal_modelled.json"
OUT_SHEET = "data/evidence/thermal_modelled_sheet.png"

SEED = 20261006

# The dataset's frame, as read from its images on 6 Oct 2026.
WIDTH, HEIGHT = 24, 40
# A 60-cell module seen at this resolution: 6 cells by 10, 4 pixels to a cell.
CELL_PX = 4

LEVELS_PER_C = 255.0 / THERMAL_SPAN_C

# -- Measured from the dataset's No-Anomaly frames, every 25th, n = 400 -------
# (python scripts/render_thermal.py --measure, 6 Oct 2026)
BASE_LEVEL = 158.7                # median of the frames' mean grey level
PIXEL_NOISE_STD = 1.9             # median std of a frame minus its 3x3 mean
ROW_PROFILE = [
    -24.7, -16.8, -10.0, -5.5, -2.7, -0.7, 0.8, 2.0, 2.8, 3.3, 3.8, 3.9, 3.9, 3.8,
    3.6, 3.5, 3.4, 3.6, 3.9, 4.2, 4.4, 4.4, 4.3, 4.2, 4.1, 3.9, 3.8, 3.7, 3.7, 3.8,
    3.9, 3.9, 3.7, 3.2, 2.2, 0.8, -1.8, -6.4, -13.9, -21.9,
]
COL_PROFILE = [
    -22.0, -17.7, -11.5, -5.5, -0.9, 2.1, 4.0, 5.2, 6.2, 6.8, 7.3, 7.6, 7.7, 7.7,
    7.4, 7.0, 6.5, 5.7, 4.8, 3.5, 1.2, -3.4, -10.9, -18.7,
]

# -- Declared, because nothing we hold measures them --------------------------
# How much one modelled frame's overall level may sit off the base, in levels.
# The dataset's own frames vary far more than this (their 10th to 90th
# percentile spans about 96 levels) because each was normalised on its own
# scene. A modelled field is one scene, so the spread is kept small and stated.
FRAME_LEVEL_STD = 3.0
# A string open at the combiner: every module of it warm. No committed array is
# in this state; the pattern exists so an injected outage has one.
OFFLINE_DELTA_C = P.HOT_BAND_DELTA_T_C

MECHANISMS = ("healthy", "hot-spot", "diode band", "soiling", "offline")


def rng_for(panel_id):
    """A generator that depends on the seed and this array only."""
    digest = hashlib.sha256(f"{SEED}:{panel_id}".encode("ascii")).digest()
    return np.random.default_rng(int.from_bytes(digest[:8], "big"))


def mechanism_for(panel_id, scenario):
    """What the SITE RECORD says about an array. Never guessed from a reading."""
    for event in scenario["events"]:
        if event["panelId"] != panel_id:
            continue
        if event.get("terminalMismatch", 1.0) == 0.0:
            return "offline", event
        # Most of the array's strings bypassed is a diode's signature across the
        # module; fewer is a single hot cell.
        if event.get("faultedStrings", 0) >= P.FAULTED_STRINGS:
            return "diode band", event
        return "hot-spot", event
    for soil in scenario["soiling"]:
        if soil["panelId"] == panel_id:
            return "soiling", soil
    return "healthy", None


def soiling_delta_c(f_soil):
    """Cell-temperature change from dirt, by the model's own NOCT relation.

    The rise above ambient is proportional to the light reaching the cell, and
    dirt beyond the nominal derate keeps that fraction of it off. Negative.
    """
    rise = P.cell_temp(P.T_AMB_DEMO, P.G_DEMO) - P.T_AMB_DEMO
    return -rise * (P.F_SOIL - f_soil)


def base_frame(rng):
    """A healthy module: the dataset's own shape, at the model's temperature."""
    rows = np.asarray(ROW_PROFILE, dtype=np.float64)[:, None]
    cols = np.asarray(COL_PROFILE, dtype=np.float64)[None, :]
    return BASE_LEVEL + rows + cols + rng.normal(0.0, FRAME_LEVEL_STD)


def soft_block(top, left, height, width):
    """A block with a one-pixel soft edge, as a 0..1 mask."""
    mask = np.zeros((HEIGHT, WIDTH), dtype=np.float64)
    mask[top:top + height, left:left + width] = 1.0
    padded = np.pad(mask, 1, mode="edge")
    return sum(
        padded[i:i + HEIGHT, j:j + WIDTH] for i in range(3) for j in range(3)
    ) / 9.0


def render(panel_id, mechanism, detail):
    rng = rng_for(panel_id)
    frame = base_frame(rng)
    delta_c = 0.0

    if mechanism == "hot-spot":
        delta_c = P.HOT_BAND_DELTA_T_C
        cell_row = int(rng.integers(1, HEIGHT // CELL_PX - 1))
        cell_col = int(rng.integers(1, WIDTH // CELL_PX - 1))
        frame += soft_block(cell_row * CELL_PX, cell_col * CELL_PX, CELL_PX, CELL_PX) \
            * delta_c * LEVELS_PER_C
    elif mechanism == "diode band":
        delta_c = P.HOT_BAND_DELTA_T_C
        # A bypassed substring is a third of the module, running its length.
        third = WIDTH // 3
        left = int(rng.integers(0, 3)) * third
        frame += soft_block(0, left, HEIGHT, third) * delta_c * LEVELS_PER_C
    elif mechanism == "soiling":
        delta_c = soiling_delta_c(detail["fSoil"])
        patches = np.zeros((HEIGHT, WIDTH), dtype=np.float64)
        for _ in range(int(rng.integers(3, 6))):
            h = int(rng.integers(6, 14))
            w = int(rng.integers(5, 11))
            patches = np.maximum(patches, soft_block(
                int(rng.integers(0, HEIGHT - h)), int(rng.integers(0, WIDTH - w)), h, w))
        # Cooler by the model's figure where the dirt lies, and untouched elsewhere.
        # Scaling the patches so the whole frame averaged that figure was tried
        # first and drew patches 15 C colder than the glass beside them.
        frame += patches * delta_c * LEVELS_PER_C
    elif mechanism == "offline":
        delta_c = OFFLINE_DELTA_C
        frame += delta_c * LEVELS_PER_C

    frame += rng.normal(0.0, PIXEL_NOISE_STD, size=frame.shape)
    return np.clip(np.rint(frame), 0, 255).astype(np.uint8), delta_c


def ironbow(gray):
    stops = np.array(
        [[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in IRONBOW_STOPS], dtype=np.float64)
    x = gray.astype(np.float64) / 255.0 * (len(stops) - 1)
    lo = np.clip(np.floor(x).astype(int), 0, len(stops) - 2)
    t = (x - lo)[..., None]
    return np.rint(stops[lo] * (1 - t) + stops[lo + 1] * t).astype(np.uint8)


def contact_sheet(frames, path, per_row=20, scale=3, gap=2):
    """Every frame in ironbow, for a person to look at. The JSON is the data."""
    ids = sorted(frames)
    rows = (len(ids) + per_row - 1) // per_row
    cell_w, cell_h = WIDTH * scale + gap, HEIGHT * scale + gap
    sheet = np.zeros((rows * cell_h + gap, per_row * cell_w + gap, 3), dtype=np.uint8)
    for n, panel_id in enumerate(ids):
        tile = np.kron(ironbow(frames[panel_id]), np.ones((scale, scale, 1), dtype=np.uint8))
        y = gap + (n // per_row) * cell_h
        x = gap + (n % per_row) * cell_w
        sheet[y:y + HEIGHT * scale, x:x + WIDTH * scale] = tile
    Image.fromarray(sheet).save(path)


def measure():
    """Print the dataset statistics the constants above were taken from."""
    with open(os.path.join(DATASET_DIR, "module_metadata.json"), encoding="utf-8") as f:
        meta = json.load(f)
    keys = sorted(meta, key=int)
    healthy = [k for k in keys if meta[k]["anomaly_class"] == "No-Anomaly"][::25]
    means, residuals, rows, cols, sizes = [], [], [], [], set()
    for k in healthy:
        image = Image.open(os.path.join(DATASET_DIR, meta[k]["image_filepath"]))
        sizes.add(image.size)
        a = np.asarray(image.convert("L"), dtype=np.float64)
        means.append(a.mean())
        rows.append(a.mean(axis=1) - a.mean())
        cols.append(a.mean(axis=0) - a.mean())
        padded = np.pad(a, 1, mode="edge")
        smooth = sum(
            padded[i:i + a.shape[0], j:j + a.shape[1]] for i in range(3) for j in range(3)) / 9.0
        residuals.append((a - smooth).std())
    print(f"frames measured      {len(healthy)} No-Anomaly, every 25th")
    print(f"frame size (w, h)    {sorted(sizes)}")
    print(f"BASE_LEVEL           {np.median(means):.1f}")
    print(f"PIXEL_NOISE_STD      {np.median(residuals):.1f}")
    print(f"ROW_PROFILE          {np.round(np.mean(rows, axis=0), 1).tolist()}")
    print(f"COL_PROFILE          {np.round(np.mean(cols, axis=0), 1).tolist()}")


def check_resolution():
    """The constant is only trusted when the dataset is not here to contradict it."""
    first = os.path.join(DATASET_DIR, "images", "0.jpg")
    if not os.path.exists(first):
        return "constant (dataset not on disk)"
    size = Image.open(first).size
    if size != (WIDTH, HEIGHT):
        raise SystemExit(
            f"render_thermal: the dataset's frames are {size}, not {(WIDTH, HEIGHT)}")
    return "dataset/thermal-raptormaps/images/0.jpg"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--measure", action="store_true")
    args = parser.parse_args()
    if args.measure:
        measure()
        return

    resolution_from = check_resolution()
    with open("data/farm.json", encoding="utf-8") as f:
        farm = json.load(f)
    with open("data/scenario.json", encoding="utf-8") as f:
        scenario = json.load(f)

    panel_ids = sorted(p["id"] for zone in farm["zones"] for p in zone["panels"])
    healthy_c = P.cell_temp(P.T_AMB_DEMO, P.G_DEMO)

    frames, entries = {}, []
    for panel_id in panel_ids:
        if panel_id == P.FAULTED_ARRAY:
            continue                      # the one array with a real capture
        mechanism, detail = mechanism_for(panel_id, scenario)
        gray, delta_c = render(panel_id, mechanism, detail)
        frames[panel_id] = gray
        entries.append({
            "panelId": panel_id,
            "mechanism": mechanism,
            "deltaTC": round(float(delta_c), 2),
            # Row-major, top row first, one byte per pixel.
            "pixels": base64.b64encode(gray.tobytes()).decode("ascii"),
        })

    counts = {m: sum(1 for e in entries if e["mechanism"] == m) for m in MECHANISMS}
    out = {
        "note": "MODELLED thermal frames, rendered from the site record and the PV "
                "model. Not captures. Any result that rests on one is flagged from "
                "modelled signature.",
        "generatedBy": "scripts/render_thermal.py",
        "seed": SEED,
        "width": WIDTH,
        "height": HEIGHT,
        "resolutionReadFrom": resolution_from,
        "encoding": "base64 of uint8, row-major, top row first",
        "thermalSpanC": THERMAL_SPAN_C,
        "healthyCellTempC": round(healthy_c, 2),
        "conditions": {"irradiance": P.G_DEMO, "ambientC": P.T_AMB_DEMO},
        "statisticsFrom": "Raptor Maps InfraredSolarModules (MIT), No-Anomaly frames, "
                          "every 25th, n = 400",
        "baseLevel": BASE_LEVEL,
        "pixelNoiseStd": PIXEL_NOISE_STD,
        "excluded": [P.FAULTED_ARRAY],
        "counts": counts,
        "frames": entries,
    }
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, indent=2)
        f.write("\n")
    contact_sheet(frames, OUT_SHEET)

    print(f"render_thermal: {len(entries)} frames at {WIDTH}x{HEIGHT}, seed {SEED}")
    for mechanism in MECHANISMS:
        ids = [e["panelId"] for e in entries if e["mechanism"] == mechanism]
        shown = " ".join(ids) if len(ids) <= 6 else f"{len(ids)} arrays"
        print(f"  {mechanism:11s} {shown}")
    print(f"  healthy cell temperature {healthy_c:.2f} C at level {BASE_LEVEL}, "
          f"{LEVELS_PER_C:.1f} levels per C")
    print(f"  wrote {OUT_JSON} and {OUT_SHEET}")


if __name__ == "__main__":
    main()
