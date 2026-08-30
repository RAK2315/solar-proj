# Export the detector to ONNX — one Colab cell

**You run this. It takes about two minutes.**

## Why

`models/defect_yolov8n.pt` is a PyTorch checkpoint. Running it needs PyTorch — a
multi-gigabyte install this laptop deliberately does not have (CLAUDE.md: *"This
laptop never installs torch"*), and Vercel has no GPU at runtime.

**ONNX has neither problem.** It runs in the browser, on the CPU, in a few
megabytes of WebAssembly. That turns the detection from a result we committed
earlier into something the console does **in front of the judge**:

> *"That box isn't saved. Watch — it's running the model in this browser, right now."*

Same weights, same model, same numbers. Only the runtime changes.

## The cell

Open `plan/COLAB-NOTEBOOK.md`'s notebook (or any Colab), upload
`models/defect_yolov8n.pt`, and run:

```python
!pip -q install ultralytics onnx onnxruntime

from ultralytics import YOLO

model = YOLO('defect_yolov8n.pt')

# opset 12 is what onnxruntime-web's default build supports comfortably.
# simplify=True folds the graph so the browser has less to do at load.
# imgsz 640 matches training; do not change it without changing LETTERBOX_SIZE
# in src/lib/detect.ts, or the letterbox and the model will disagree.
path = model.export(
    format='onnx',
    opset=12,
    simplify=True,
    imgsz=640,
    dynamic=False,
)
print('written:', path)

# The class names, in the model's own index order. The console needs these and
# must NOT have them typed in by hand — a renamed class would silently relabel
# every detection.
print('names:', model.names)
```

## What to do with the output

1. Download `defect_yolov8n.onnx`.
2. Put it at **`public/models/defect_yolov8n.onnx`** in the repo.
3. Paste the printed `names:` dict into **`public/models/defect_yolov8n.classes.json`**
   as a plain JSON array in index order. For the shipped model that is:

```json
["BakimGereken", "Cracked", "Dirty", "Good", "Saglam"]
```

Those are the dataset's own labels, two of them Turkish, and they stay exactly as
the dataset ships them — see `docs/dataset-provenance.md`. Renaming them would
describe a model that does not exist.

## Until you do

The console says the detector is not loaded, and draws nothing. That is the
designed state, not a broken one: **no box is ever drawn from anything but model
output.** A box positioned from the crack we already know about, labelled as a
detection, would be fabricated evidence — the one thing this project does not do.

## The honest risk

The model was trained on **ground-level photographs of real panels**. The frame we
feed it is a **render from the 3D scene**. It may simply not recognise a crack in a
render — different lighting, different texture, no photographic noise.

If it does: that is a genuinely strong result and it goes on screen.
If it does not: the console says the model found nothing in this frame, the real
photograph stays where it is, and we say why. Either outcome is reportable. Only a
fabricated one is not.
