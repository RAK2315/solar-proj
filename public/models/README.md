# The exported detector

This directory is where the browser looks for the trained model:

```
public/models/defect_yolov8n.onnx           the exported network, 11.7 MB
public/models/defect_yolov8n.classes.json   its class names, in index order
```

**Both are committed.** The binary cannot be produced on this machine — CLAUDE.md
forbids installing torch here, and exporting a `.pt` needs it — so a deployed build
has no way to fetch it other than from the repo. The Colab cell that produces both
is `docs/colab-export-onnx.md`; it takes about two minutes and is how you replace
them after a retrain.

If they are ever missing the console says *"Detector not loaded"* and draws nothing.
That is the designed state. No box is ever drawn from anything but model output: the
3D scene knows exactly where the crack is, and using that to place a rectangle
labelled as a detection would be fabricated evidence.
