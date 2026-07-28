# models/

`defect_yolov8n.pt` — YOLOv8n fine-tuned on `solarvision-gwljt/solar-panel-fault-detection`
v2. **Not present until the Colab run lands** (`plan/COLAB-NOTEBOOK.md`, Cells 1–5 + 7).

The weights are committed as **provenance evidence**, not as a runtime dependency. Nothing
in `src/` loads them; inference ran once, offline, on a T4, and its output is the committed
`data/evidence/b17_detection.json`. Vercel never sees a GPU.

They are also the reason this repository is **AGPL-3.0** — Ultralytics' licence is contagious
to custom-trained weights. See `plan/02-architecture.md` for the ADR and the RF-DETR escape
hatch if that ever needs to stop being true.

~6 MB, so it is committed rather than ignored. `dataset/` and `runs/` are ignored; this is not.
