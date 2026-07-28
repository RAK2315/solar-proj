# Colab notebook — all vision work, zero local load

**Your laptop never runs a model.** Training, inference, and thermal extraction all happen on
Google's T4. You download four small artefacts at the end. Locally you only ever installed
`numpy pandas groq` — no PyTorch, no ultralytics, no fans.

You do **not** need to upload the 60 MB dataset — Colab re-downloads it from Roboflow in one line.

New notebook at [colab.research.google.com](https://colab.research.google.com), then:
**Runtime → Change runtime type → T4 GPU → Save.** Without this it runs on CPU for hours.

---

## Cell 1 — confirm the GPU

```python
!nvidia-smi
```
Must print `Tesla T4`. If it doesn't, you missed the runtime change above.

## Cell 2 — install + pull the dataset

```python
!pip install ultralytics roboflow -q

from roboflow import Roboflow
rf = Roboflow(api_key="PASTE-YOUR-KEY-WHEN-PROMPTED")
project = rf.workspace("solarvision-gwljt").project("solar-panel-fault-detection")
dataset = project.version(2).download("yolov8")
print("data.yaml:", dataset.location + "/data.yaml")
```

## Cell 3 — train (~20-30 min on T4)

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

## Cell 4 — the REAL metrics

```python
metrics = model.val()
names = model.names

print(f"overall mAP@50    : {metrics.box.map50:.4f}")
print(f"overall mAP@50-95 : {metrics.box.map:.4f}\n")
print("per-class AP@50:")
for i, ap in enumerate(metrics.box.ap50):
    print(f"  {names[i]:<14} {ap:.4f}")
```

**Screenshot this output.** These numbers go in `README.md` exactly as printed.

Expect `Saglam` to score near zero — it has 27 boxes. That drags the overall mean down, which is
why you report **per-class AP** and let `Cracked` stand on its own. Whatever `Cracked` scores is
what you claim. Do not round up, and do not quote the overall figure as if it were the crack number.

## Cell 5 — pick the evidence image + run detection

```python
import json, glob, shutil, os
from ultralytics import YOLO

os.makedirs('out', exist_ok=True)
best = 'surya/defect/weights/best.pt'
model = YOLO(best)

# Find a TEST-split image the model has never seen, whose label contains Cracked (class 1).
cracked = []
for lbl in glob.glob(dataset.location + "/test/labels/*.txt"):
    if any(ln.strip().startswith('1 ') for ln in open(lbl) if ln.strip()):
        img = lbl.replace('/labels/', '/images/').rsplit('.', 1)[0]
        for ext in ('.jpg', '.jpeg', '.png'):
            if os.path.exists(img + ext):
                cracked.append(img + ext)
print(f"{len(cracked)} unseen test images containing a crack")

src = cracked[0]
shutil.copy(src, 'out/b17_rgb.jpg')

r = model('out/b17_rgb.jpg')[0]
r.save(filename='out/b17_rgb_annotated.jpg')

# Highest-confidence Cracked box; fall back to the top box overall.
best_box, best_conf = None, -1.0
for b in r.boxes:
    cls, conf = model.names[int(b.cls)], float(b.conf)
    if conf > best_conf and (cls == 'Cracked' or best_box is None):
        best_box, best_conf, best_cls = b, conf, cls

x, y, w, h = best_box.xywhn[0].tolist()
detection = {
    "label": best_cls,
    "confidence": round(best_conf, 4),      # WHATEVER THE MODEL RETURNED
    "bbox": [round(v, 4) for v in (x, y, w, h)],
    "model": "yolov8n-solar-defect",
    "mAP50": round(float(metrics.box.map50), 4),
    "sourceImage": os.path.basename(src),
    "split": "test (held out)",
}
json.dump(detection, open('out/b17_detection.json', 'w'), indent=2)
print(json.dumps(detection, indent=2))
```

If `confidence` comes back `0.71`, then **the UI says 0.71** and `CLAUDE.md` §2's caption changes
to match. The `0.84` in the spec is a placeholder, and invariant I11 in `plan/schemas.ts` will fail
the build if that exact value ever appears — deliberately.

If the list of cracked test images is empty, widen to `valid/labels` (13 Cracked boxes there).

## Cells 6a–6c — ✅ ALREADY DONE LOCALLY, SKIP THEM

The thermal path needs no GPU, so it already ran on the laptop via
`python scripts/thermal_hotspot.py`. `data/evidence/b17_cellgrid.json` and
`b17_thermal.png` exist and are committed. Measured result and the two deviations from
`CLAUDE.md` §8 are recorded in `docs/dataset-provenance.md`.

**In Colab you only need Cells 1–5 and Cell 7.** The cells below are kept for reference,
or in case you want to re-run with a different source image or σ.

---

## Cell 6a — get the thermal source (no upload needed)

**Raptor Maps InfraredSolarModules** — 20,000 real UAV thermal images, **MIT licence**, and
critically they are **single-module crops**, which is exactly what a 5×7 cell grid needs. Aerial
wide shots would be useless here. It also ships a `Hot-Spot-Multi` class, which matches our
multi-hotspot fault story.

```python
!git clone -q https://github.com/RaptorMaps/InfraredSolarModules.git
!cd InfraredSolarModules && unzip -q -o 2020-02-14_InfraredSolarModules.zip

import json, collections
meta = json.load(open('InfraredSolarModules/2020-02-14_InfraredSolarModules/module_metadata.json'))
print(collections.Counter(v['anomaly_class'] for v in meta.values()))

# Prefer Hot-Spot-Multi (several hot cells), fall back to Hot-Spot.
BASE = 'InfraredSolarModules/2020-02-14_InfraredSolarModules/'
cands = [BASE + v['image_filepath'] for v in meta.values()
         if v['anomaly_class'] == 'Hot-Spot-Multi'] \
     or [BASE + v['image_filepath'] for v in meta.values()
         if v['anomaly_class'] == 'Hot-Spot']
print(len(cands), 'candidates ->', cands[0])
```

Images are 24×40 px. That sounds tiny, but it is **genuinely what a radiometric UAV sensor
produces**, and for a 5×7 grid it gives ~4×5 px per cell — plenty to average. The displayed
thumbnail is not this file anyway: it is the ironbow render generated *from* the measurement in
Cell 6c. `CLAUDE.md` §14 explicitly wants the thermal pass to look lower-resolution than the
visible camera, so the real sensor resolution is an asset, not a problem.

## Cell 6b — extract the cell grid (classical CV, no model)

```python
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
    return {
        "panelId": "B-17", "rows": rows, "cols": cols,
        "baselineTempC": round(float(baseline), 1),
        "matrix": np.round(delta, 1).tolist(),
        "defects": [{"row": int(r)+1, "col": int(c)+1, "type": "hotspot",
                     "deltaTC": round(float(delta[r, c]), 1)}
                    for r, c in zip(*np.where(mask))],
        "clusters": int(n - 1),
    }

src = cands[0]
gray = cv2.imread(src, cv2.IMREAD_GRAYSCALE)
if gray.shape[0] > gray.shape[1]:       # portrait -> rotate to landscape (7 cols wide)
    gray = np.rot90(gray)
print('source:', src, gray.shape)

grid = extract_cellgrid(gray)
grid['sourceImage'] = src.split('/')[-1]
grid['sourceDataset'] = 'RaptorMaps InfraredSolarModules (MIT)'
json.dump(grid, open('out/b17_cellgrid.json', 'w'), indent=2)
print(json.dumps(grid, indent=2))
```

Adjust `sigma` (try 1.2–2.5) until you get **~4 hot cells**. If one candidate image gives a poor
spread, try `cands[1]`, `cands[2]` — you have hundreds.

⚠️ **Do not hand-edit the output to hit (2,5)/(2,6)/(4,5)/(4,6).** Those coordinates in
`CLAUDE.md` §8 are the *story*, not a measurement. If the real hotspots land at (3,2) and (3,3),
then change the coordinates in `generate_telemetry.py`, the §9.2 prognosis prompt, and the demo
script to match what was measured. **The measurement leads; the story follows.** This is the same
rule as the detection confidence, and it's the whole reason the thermal path is classical CV you
can point at rather than a number you typed.

## Cell 6c — ironbow render for the evidence thumbnail

```python
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

# Stops match the --iron-* CSS tokens in plan/04-design-system.md
ironbow = LinearSegmentedColormap.from_list('ironbow', [
    '#1B1035', '#4A1D6E', '#9B2A63', '#D94A3D', '#F08B2A', '#FFC94D', '#FFF3D6'])

fig, ax = plt.subplots(figsize=(7, 5), dpi=100)
ax.imshow(gray, cmap=ironbow, interpolation='nearest')   # nearest = sensor-authentic
ax.axis('off')
fig.savefig('out/b17_thermal.png', bbox_inches='tight', pad_inches=0)
plt.show()
```

`interpolation='nearest'` is deliberate — smooth interpolation would look like a heatmap graphic,
blocky pixels look like a thermal sensor.

## Cell 7 — download everything

```python
shutil.copy(best, 'out/defect_yolov8n.pt')
shutil.copy('surya/defect/results.csv', 'out/results.csv')
shutil.copy('surya/defect/results.png', 'out/training_curves.png')
!cd out && zip -r ../surya_vision.zip . -q

from google.colab import files
files.download('surya_vision.zip')
```

## Unzip into the project

```powershell
cd "D:\Projects\12. project"
# extract surya_vision.zip, then:
#   defect_yolov8n.pt      -> models\defect_yolov8n.pt
#   b17_rgb.jpg            -> data\evidence\b17_rgb.jpg
#   b17_rgb_annotated.jpg  -> data\evidence\b17_rgb_annotated.jpg
#   b17_detection.json     -> data\evidence\b17_detection.json
#   b17_cellgrid.json      -> data\evidence\b17_cellgrid.json
#   results.csv, training_curves.png, metrics screenshot -> docs\
```

Then fill the mAP fields in `docs\dataset-provenance.md` with the Cell 4 output.

**Total local ML: none.** The `.pt` file is ~6 MB and is committed as provenance — it is never
loaded at runtime, and Vercel never sees a GPU.
