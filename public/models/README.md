# Put the exported detector here

This directory is where the browser looks for the trained model:

```
public/models/defect_yolov8n.onnx           the exported network
public/models/defect_yolov8n.classes.json   its class names, in index order
```

**Neither is committed**, because neither can be produced on this machine —
CLAUDE.md forbids installing torch here, and exporting a `.pt` needs it. The Colab
cell that produces both is `docs/colab-export-onnx.md`; it takes about two minutes.

Until they exist the console says *"Detector not loaded"* and draws nothing. That
is the designed state. No box is ever drawn from anything but model output: the 3D
scene knows exactly where the crack is, and using that to place a rectangle
labelled as a detection would be fabricated evidence.
