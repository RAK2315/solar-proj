# Colab notebook — all vision work, zero local load

**Your laptop never runs a model.** Training and inference happen on Google's T4. You
download a handful of small artefacts at the end. Locally you only ever installed
`numpy pandas groq pillow matplotlib` — no PyTorch, no ultralytics, no fans.

You do **not** need to upload the 60 MB dataset — Colab re-downloads it from Roboflow.

New notebook at [colab.research.google.com](https://colab.research.google.com), then:
**Runtime → Change runtime type → T4 GPU → Save.** Without this it runs on CPU for hours.

> **Run Cells 1–5 and Cell 7 only.** The thermal path (Cells 6a–6c) already ran locally
> and its output is committed. Those cells are kept for reference and are marked
> superseded — **running them would overwrite a measurement you cannot re-derive.**

---

## Cell 1 — confirm the GPU

```python
!nvidia-smi
```
Must print `Tesla T4`. If it doesn't, you missed the runtime change above.

## Cell 2 — install + pull the dataset

```python
!pip install ultralytics roboflow -q

import getpass
from roboflow import Roboflow

# Paste when prompted. Do NOT hardcode the key in a cell you might share or commit —
# the notebook file lives in a public repo.
rf = Roboflow(api_key=getpass.getpass("Roboflow API key: "))
project = rf.workspace("solarvision-gwljt").project("solar-panel-fault-detection")
dataset = project.version(2).download("yolov8")
print("data.yaml:", dataset.location + "/data.yaml")
```

Your key is in `.env.local` as `ROBOFLOW_API_KEY`.

## Cell 3 — train (~20–30 min on T4)

```python
from ultralytics import YOLO

model = YOLO('yolov8n.pt')
results = model.train(
    data=dataset.location + "/data.yaml",
    epochs=50, imgsz=640, batch=16,
    project='surya', name='defect', exist_ok=True,
)
```

Leave the tab open. Colab free sessions idle-timeout; 50 epochs finishes well inside the limit.

Classes train **as the dataset ships them** — `BakimGereken, Cracked, Dirty, Good, Saglam`,
two of them Turkish. Do not rename them. `src/lib/types.ts` expects exactly these.

## Cell 4 — the REAL metrics

```python
metrics = model.val()
names = model.names

# ap_class_index, NOT enumerate(). Ultralytics only reports AP for classes that have
# instances in the eval set, so the arrays are indexed by ap_class_index. `Dirty` has
# ZERO test instances, so enumerate() would silently shift every label by one and
# attribute the wrong number to the wrong class.
ap_per_class = {names[int(c)]: round(float(ap), 4)
                for c, ap in zip(metrics.box.ap_class_index, metrics.box.ap50)}

print(f"overall mAP@50    : {metrics.box.map50:.4f}")
print(f"overall mAP@50-95 : {metrics.box.map:.4f}\n")
print("per-class AP@50 (classes with test instances only):")
for name, ap in ap_per_class.items():
    print(f"  {name:<14} {ap:.4f}")

missing = [n for n in names.values() if n not in ap_per_class]
print("\nno test instances, AP undefined (NOT zero):", missing or "none")
```

**Screenshot this output.** These numbers go into `docs/dataset-provenance.md` exactly as
printed, and `ap_per_class` is written into `b17_detection.json` in the next cell so the
number is committed data rather than a figure retyped from a screenshot.

Expect `Saglam` to score near zero — it has 27 boxes total, 1 in test. That drags the overall
mean down, which is exactly why you report **per-class AP** and let `Cracked` (22 test boxes)
stand on its own. Whatever `Cracked` scores is what you claim. Do not round up, and never
quote the overall figure as if it were the crack number.

`Dirty` has **no test instances**, so its AP is *undefined*, not 0.0. Reporting a zero would
imply the model failed at something it was never evaluated on.

## Cell 5 — pick the evidence image + run detection

```python
import json, glob, os, shutil
from ultralytics import YOLO

os.makedirs('out', exist_ok=True)
best_weights = 'surya/defect/weights/best.pt'
model = YOLO(best_weights)

CRACKED_IDX = 1            # verified against data.yaml: [BakimGereken, Cracked, Dirty, Good, Saglam]

# TEST-split images the model has never seen whose label contains a crack.
# Locally counted: 22 of the 42 test images qualify.
cracked = []
for lbl in sorted(glob.glob(dataset.location + "/test/labels/*.txt")):
    if any(ln.strip().startswith(f'{CRACKED_IDX} ') for ln in open(lbl) if ln.strip()):
        stem = lbl.replace('/labels/', '/images/').rsplit('.', 1)[0]
        for ext in ('.jpg', '.jpeg', '.png'):
            if os.path.exists(stem + ext):
                cracked.append(stem + ext)
                break
print(f"{len(cracked)} unseen test images containing a crack")

# Take the first image the model ACTUALLY detects a crack in. Trying candidates in a
# fixed order is selection, which is fine; editing the confidence afterwards would not be.
chosen = None
for src in cracked:
    r = model(src, verbose=False)[0]
    boxes = [(float(b.conf), b) for b in r.boxes
             if model.names[int(b.cls)] == 'Cracked']
    if boxes:
        conf, box = max(boxes, key=lambda x: x[0])
        chosen = (src, r, conf, box)
        break

if chosen is None:
    raise SystemExit(
        "The model found no Cracked box in any unseen test image. Do NOT relabel a "
        "different class as a crack. Either train longer, or change what the UI claims."
    )

src, r, conf, box = chosen
shutil.copy(src, 'out/b17_rgb.jpg')
r.save(filename='out/b17_rgb_annotated.jpg')

x, y, w, h = box.xywhn[0].tolist()
detection = {
    "label": "Cracked",                       # verbatim dataset class name
    "confidence": round(conf, 4),             # WHATEVER THE MODEL RETURNED
    "bbox": [round(v, 4) for v in (x, y, w, h)],
    "model": "yolov8n-solar-defect",
    "mAP50": round(float(metrics.box.map50), 4),
    "apPerClass": ap_per_class,               # from Cell 4
    "sourceImage": os.path.basename(src),
    "split": "test (held out)",
}
json.dump(detection, open('out/b17_detection.json', 'w'), indent=2)
print(json.dumps(detection, indent=2))
```

If `confidence` comes back `0.71`, then **the UI says 0.71** and `CLAUDE.md` §2's caption
changes to match. The `0.84` in the spec is a placeholder, and **invariant I11 fails the
build if that exact value ever appears** — deliberately.

I11 also checks that `label` is `Cracked`, that `apPerClass` has a `Cracked` entry, and that
`split` says test. Those exist so the reticle cannot claim something the model did not find.

## Cells 6a–6c — ⛔ SUPERSEDED. DO NOT RUN.

The thermal path needs no GPU, so it ran locally via `python scripts/thermal_hotspot.py`.
`data/evidence/b17_cellgrid.json` and `b17_thermal.png` are **committed and must not be
regenerated** — the measured hot band at `(2,3)(2,4)(2,5)(2,6)`, ΔT ≈ +2.8 °C, one cluster,
is propagated into the fault story, the prognosis prompt, and invariant I10.

The local script also differs from the sketch below in two ways that matter:

- It imports `BASELINE_TEMP_C` from `scripts/physics.py` (62.81 °C, the NOCT-model median)
  rather than using the raw intensity median. Correction C9.
- It maps intensity to °C through a declared `THERMAL_SPAN_C = 25.0`, because Raptor Maps
  images are normalised 8-bit, not radiometric.

If you ever do want a different source image or σ, re-run the **local** script with
`--index` / `--sigma` and then update `MEASURED_HOT_CELLS` in `src/lib/types.ts` to whatever
it printed. Full rationale: `docs/dataset-provenance.md`.

<details>
<summary>Original Cells 6a–6c, kept for reference only</summary>

```python
# 6a — fetch the thermal source
!git clone -q https://github.com/RaptorMaps/InfraredSolarModules.git
!cd InfraredSolarModules && unzip -q -o 2020-02-14_InfraredSolarModules.zip

# 6b — extract the cell grid (classical CV, no model)
import cv2, numpy as np, json

def extract_cellgrid(gray, rows=5, cols=7, sigma=1.5):
    h, w = gray.shape
    ch, cw = h // rows, w // cols
    cell_means = np.array([[gray[r*ch:(r+1)*ch, c*cw:(c+1)*cw].mean()
                            for c in range(cols)] for r in range(rows)])
    baseline = np.median(cell_means)
    delta = cell_means - baseline
    mask = (delta > delta.std() * sigma).astype(np.uint8)
    n, _ = cv2.connectedComponents(mask)
    return {"matrix": np.round(delta, 1).tolist(), "clusters": int(n - 1)}

# 6c — ironbow render. interpolation='nearest' is deliberate: smooth looks like a
# heatmap graphic, blocky looks like a thermal sensor.
from matplotlib.colors import LinearSegmentedColormap
ironbow = LinearSegmentedColormap.from_list('ironbow', [
    '#1B1035', '#4A1D6E', '#9B2A63', '#D94A3D', '#F08B2A', '#FFC94D', '#FFF3D6'])
```

⚠️ **Never hand-edit the output to hit the coordinates in `CLAUDE.md` §8.** Those were the
*story*, not a measurement — and the measurement already disagreed with them, so the story
changed. The measurement leads; the story follows.

</details>

## Cell 7 — download everything

```python
import shutil

shutil.copy(best_weights, 'out/defect_yolov8n.pt')
shutil.copy('surya/defect/results.csv', 'out/results.csv')
shutil.copy('surya/defect/results.png', 'out/training_curves.png')

# Note what is NOT here: b17_cellgrid.json and b17_thermal.png. The thermal artefacts
# are local, measured, and committed. Shipping them in this zip is how you would
# accidentally overwrite them on unzip.
print(sorted(os.listdir('out')))

!cd out && zip -r ../surya_vision.zip . -q
from google.colab import files
files.download('surya_vision.zip')
```

Expected contents — **five files, no thermal**:

```
defect_yolov8n.pt   b17_rgb.jpg   b17_rgb_annotated.jpg
b17_detection.json  results.csv   training_curves.png
```

## Unzip into the project

```powershell
cd "D:\Projects\12. project"
# extract surya_vision.zip, then place:
#   defect_yolov8n.pt      -> models\defect_yolov8n.pt
#   b17_rgb.jpg            -> data\evidence\b17_rgb.jpg
#   b17_rgb_annotated.jpg  -> data\evidence\b17_rgb_annotated.jpg
#   b17_detection.json     -> data\evidence\b17_detection.json
#   results.csv            -> docs\training\results.csv
#   training_curves.png    -> docs\training\training_curves.png
#   Cell 4 screenshot      -> docs\training\metrics.png
```

⛔ **Do not copy anything over `data\evidence\b17_cellgrid.json` or `b17_thermal.png`.**

Then:

```powershell
npm run validate:data
```

It will pick the detection up automatically, flip **I11** from `skip` to `PASS`, and print the
confidence and per-class AP it found. Fill the mAP rows in `docs\dataset-provenance.md` from
the same values.

**Total local ML: none.** The `.pt` file is ~6 MB, committed as provenance. It is never loaded
at runtime and Vercel never sees a GPU.
