# Colab notebook — the whole-field thermal classifier (P3)

**Your laptop never trains a model.** This runs on Colab and you download six small
files at the end. The contract it implements is in `plan/rework/03-features.md`
under "F3 contract". Where this file and that contract differ, the contract wins.

New notebook at [colab.research.google.com](https://colab.research.google.com).
A T4 is nice but not needed: the images are 24 by 40 pixels and the whole run takes
a few minutes on a GPU and about fifteen on a CPU.

> **Run the cells in order, top to bottom, once.** Every cell asserts what the next
> one depends on, so a cell that fails is the place to stop. Do not edit a number
> that a cell prints. If a figure looks wrong, send it back as it is.

You need one file from the repo before you start: **`data/evidence/thermal_modelled.json`**.
Cell 2 asks you to upload it. It is the 119 modelled frames the sanity check runs on.

---

## Cell 1 — runtime

```python
import torch, platform
print('python', platform.python_version(), '| torch', torch.__version__)
print('device', 'cuda: ' + torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'cpu')
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
```

## Cell 2 — the dataset, and the modelled frames

```python
!pip -q install onnx onnxruntime scikit-learn

import os, zipfile, json

# Raptor Maps publish the dataset in their own repository, MIT licence.
if not os.path.exists('InfraredSolarModules'):
    !git clone -q https://github.com/RaptorMaps/InfraredSolarModules.git

# The archive's name has changed before. Find it, do not assume it.
zips = [os.path.join(r, f) for r, _, fs in os.walk('InfraredSolarModules') for f in fs if f.endswith('.zip')]
print('archives found:', zips)
assert len(zips) == 1, 'expected exactly one zip in the repository'
with zipfile.ZipFile(zips[0]) as z:
    z.extractall('ism')

META = [os.path.join(r, f) for r, _, fs in os.walk('ism') for f in fs if f == 'module_metadata.json']
assert len(META) == 1, 'module_metadata.json not found exactly once'
DATA_ROOT = os.path.dirname(META[0])
print('dataset root:', DATA_ROOT)

# The 119 modelled frames, from the repo: data/evidence/thermal_modelled.json
from google.colab import files
if not os.path.exists('thermal_modelled.json'):
    files.upload()
assert os.path.exists('thermal_modelled.json'), 'upload data/evidence/thermal_modelled.json'
```

If the clone fails, upload your local copy instead: zip `dataset\thermal-raptormaps`
on the laptop, upload it, extract it into `ism/`, and re-run from the `META =` line.

## Cell 3 — read the classes and the image size FROM THE DATASET

```python
import numpy as np
from collections import Counter
from PIL import Image

with open(META[0]) as f:
    meta = json.load(f)

keys = sorted(meta, key=int)
labels_text = [meta[k]['anomaly_class'] for k in keys]
counts = Counter(labels_text)

# The class order is fixed HERE, once, alphabetically, and shipped with the model.
CLASSES = sorted(counts)
CLASS_INDEX = {c: i for i, c in enumerate(CLASSES)}
assert 'No-Anomaly' in CLASS_INDEX, 'the dataset has no No-Anomaly class'

# Every image is read. The size is whatever the files say it is.
sizes, modes = Counter(), Counter()
frames = []
for k in keys:
    im = Image.open(os.path.join(DATA_ROOT, meta[k]['image_filepath']))
    sizes[im.size] += 1
    modes[im.mode] += 1
    frames.append(np.asarray(im.convert('L'), dtype=np.uint8))
assert len(sizes) == 1, f'the images are not all one size: {dict(sizes)}'
WIDTH, HEIGHT = next(iter(sizes))
X = np.stack(frames)                      # (N, HEIGHT, WIDTH), uint8, no resize
y = np.array([CLASS_INDEX[t] for t in labels_text])

print(f'images   {len(keys)}')
print(f'size     {WIDTH} wide by {HEIGHT} high, modes {dict(modes)}')
print(f'classes  {len(CLASSES)}')
for c in CLASSES:
    print(f'  {c:16s} {counts[c]:6d}')

# The modelled frames must be the dataset's size, or the sanity check is meaningless.
with open('thermal_modelled.json') as f:
    modelled = json.load(f)
assert (modelled['width'], modelled['height']) == (WIDTH, HEIGHT), \
    f"modelled frames are {modelled['width']}x{modelled['height']}, the dataset is {WIDTH}x{HEIGHT}"
print(f"modelled {len(modelled['frames'])} frames, seed {modelled['seed']}, counts {modelled['counts']}")
```

**Expected, from the local copy read on 6 Oct 2026:** 20,000 images, 24 wide by 40
high, 12 classes, No-Anomaly 10,000. If Colab prints anything else, stop and send
the printout: the contract's figures need correcting before the model is trained.

## Cell 4 — the split, and the normalisation

```python
from sklearn.model_selection import train_test_split

SEED = 20261006
idx = np.arange(len(y))
# 70 / 15 / 15, stratified. Two cuts: 30 % off, then that 30 % in half.
train_idx, rest_idx = train_test_split(idx, test_size=0.30, random_state=SEED, stratify=y)
val_idx, test_idx = train_test_split(rest_idx, test_size=0.50, random_state=SEED, stratify=y[rest_idx])
assert not (set(train_idx) & set(val_idx)) and not (set(train_idx) & set(test_idx)) and not (set(val_idx) & set(test_idx))

# Scaled to [0, 1], then normalised by the TRAIN split only. The test split must
# not leak into the figures the browser will normalise with.
train01 = X[train_idx].astype(np.float32) / 255.0
MEAN, STD = float(train01.mean()), float(train01.std())

print(f'train {len(train_idx)}  val {len(val_idx)}  test {len(test_idx)}')
print(f'train mean {MEAN:.6f}  std {STD:.6f}  (on pixels scaled to 0..1)')
for name, part in (('train', train_idx), ('val', val_idx), ('test', test_idx)):
    c = Counter(y[part])
    print(f'  {name:5s}', ' '.join(f'{CLASSES[i]}={c[i]}' for i in range(len(CLASSES))))

def prepare(a):
    """uint8 (N, H, W) -> float32 (N, 1, H, W), exactly as the browser will."""
    return ((a.astype(np.float32) / 255.0 - MEAN) / STD)[:, None, :, :]
```

## Cell 5 — the model, and training

```python
import random, time, csv
import torch.nn as nn
from sklearn.metrics import f1_score

torch.manual_seed(SEED); np.random.seed(SEED); random.seed(SEED)
torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False

class ThermalNet(nn.Module):
    """Small on purpose: a 24 by 40 image does not need more, and it runs in a browser."""
    def __init__(self, n):
        super().__init__()
        def block(i, o):
            return nn.Sequential(nn.Conv2d(i, o, 3, padding=1), nn.BatchNorm2d(o), nn.ReLU(inplace=True),
                                 nn.Conv2d(o, o, 3, padding=1), nn.BatchNorm2d(o), nn.ReLU(inplace=True))
        self.features = nn.Sequential(block(1, 32), nn.MaxPool2d(2), block(32, 64), nn.MaxPool2d(2), block(64, 128))
        self.head = nn.Sequential(nn.Dropout(0.3), nn.Linear(128, n))
    def forward(self, x):
        x = self.features(x)
        return self.head(x.mean(dim=(2, 3)))          # global average pool, written out so it exports plainly

model = ThermalNet(len(CLASSES)).to(DEVICE)
print('parameters', sum(p.numel() for p in model.parameters()))

Xtr = torch.from_numpy(prepare(X[train_idx])); ytr = torch.from_numpy(y[train_idx])
Xva = torch.from_numpy(prepare(X[val_idx])).to(DEVICE); yva = y[val_idx]

# The loss is weighted by inverse class frequency, softened by a square root.
# Unweighted, a model can score well by ignoring the 175 Diode-Multi frames.
freq = np.bincount(y[train_idx], minlength=len(CLASSES))
weights = torch.tensor(np.sqrt(freq.max() / freq), dtype=torch.float32, device=DEVICE)
loss_fn = nn.CrossEntropyLoss(weight=weights)

EPOCHS, BATCH = 60, 128
opt = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-4)
sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=4e-3, total_steps=EPOCHS * ((len(Xtr) + BATCH - 1) // BATCH))
gen = torch.Generator().manual_seed(SEED)

def predict(xs):
    model.eval()
    with torch.no_grad():
        return torch.cat([model(xs[i:i + 1024]).argmax(1).cpu() for i in range(0, len(xs), 1024)]).numpy()

best, best_epoch, history = -1.0, -1, []
for epoch in range(1, EPOCHS + 1):
    model.train()
    order = torch.randperm(len(Xtr), generator=gen)
    total = 0.0
    for i in range(0, len(order), BATCH):
        b = order[i:i + BATCH]
        xb, yb = Xtr[b].to(DEVICE), ytr[b].to(DEVICE)
        # A module looks the same mirrored or upside down. Nothing else is altered.
        if torch.rand(1, generator=gen).item() < 0.5: xb = xb.flip(3)
        if torch.rand(1, generator=gen).item() < 0.5: xb = xb.flip(2)
        opt.zero_grad()
        loss = loss_fn(model(xb), yb)
        loss.backward(); opt.step(); sched.step()
        total += loss.item() * len(b)
    val_f1 = f1_score(yva, predict(Xva), average='macro')
    history.append((epoch, total / len(order), val_f1))
    # The checkpoint kept is the best on VALIDATION. The test split is not looked at here.
    if val_f1 > best:
        best, best_epoch = val_f1, epoch
        torch.save(model.state_dict(), 'thermal_classifier.pt')
    if epoch % 5 == 0 or epoch == 1:
        print(f'epoch {epoch:3d}  loss {total / len(order):.4f}  val macro-F1 {val_f1:.4f}  best {best:.4f} @ {best_epoch}')

model.load_state_dict(torch.load('thermal_classifier.pt', map_location=DEVICE))
os.makedirs('out', exist_ok=True)
with open('out/thermal_training.csv', 'w', newline='') as f:
    csv.writer(f).writerows([('epoch', 'train_loss', 'val_macro_f1'), *history])
print(f'kept epoch {best_epoch}, val macro-F1 {best:.4f}')
```

## Cell 6 — the REAL metrics, on the held-out test split

```python
from sklearn.metrics import precision_recall_fscore_support, confusion_matrix, accuracy_score
import matplotlib.pyplot as plt

# TEST, not validation. Validation chose the checkpoint, so its figure is not held out.
Xte = torch.from_numpy(prepare(X[test_idx])).to(DEVICE); yte = y[test_idx]
pred = predict(Xte)

labels = list(range(len(CLASSES)))
p, r, f, s = precision_recall_fscore_support(yte, pred, labels=labels, zero_division=0)
macro_f1 = float(f1_score(yte, pred, average='macro', labels=labels))
accuracy = float(accuracy_score(yte, pred))
cm = confusion_matrix(yte, pred, labels=labels)

print(f'TEST split, {len(yte)} images the model never saw and was never selected on')
print(f'HEADLINE  macro-F1 {macro_f1:.4f}')
print(f'accuracy  {accuracy:.4f}   (not the headline: No-Anomaly is half the dataset)')
print(f'{"class":16s} {"precision":>9s} {"recall":>7s} {"f1":>7s} {"support":>8s}')
for i, c in enumerate(CLASSES):
    print(f'{c:16s} {p[i]:9.4f} {r[i]:7.4f} {f[i]:7.4f} {s[i]:8d}')

fig, ax = plt.subplots(figsize=(8, 7))
ax.imshow(cm, cmap='magma')
ax.set_xticks(labels); ax.set_yticks(labels)
ax.set_xticklabels(CLASSES, rotation=60, ha='right'); ax.set_yticklabels(CLASSES)
ax.set_xlabel('predicted'); ax.set_ylabel('true'); ax.set_title(f'test split, macro-F1 {macro_f1:.4f}')
for i in labels:
    for j in labels:
        if cm[i, j]: ax.text(j, i, cm[i, j], ha='center', va='center', color='white' if cm[i, j] < cm.max() / 2 else 'black', fontsize=7)
fig.tight_layout(); fig.savefig('out/thermal_confusion.png', dpi=140); plt.show()
```

**Screenshot this cell's printout.** Whatever macro-F1 it shows is the number that
goes on screen. Do not round it up, and do not quote the accuracy in its place.

## Cell 7 — export to ONNX at opset 12, and prove the export

```python
import onnx, onnxruntime as ort

OPSET = 12                                 # the one opset proven on onnxruntime-web 1.19.2
model.eval().cpu()
dummy = torch.zeros(1, 1, HEIGHT, WIDTH)
kwargs = dict(opset_version=OPSET, input_names=['input'], output_names=['logits'],
              dynamic_axes={'input': {0: 'batch'}, 'logits': {0: 'batch'}}, do_constant_folding=True)
try:
    torch.onnx.export(model, dummy, 'out/thermal_classifier.onnx', dynamo=False, **kwargs)   # newer torch
except TypeError:
    torch.onnx.export(model, dummy, 'out/thermal_classifier.onnx', **kwargs)                 # older torch

# READ IT BACK. Do not trust the argument that was passed.
m = onnx.load('out/thermal_classifier.onnx')
onnx.checker.check_model(m)
opset_read = [o.version for o in m.opset_import if o.domain in ('', 'ai.onnx')][0]
print(f'opset read back {opset_read}, IR version {m.ir_version}, ops {sorted({n.op_type for n in m.graph.node})}')
assert opset_read == OPSET, f'exported at opset {opset_read}, not {OPSET}'
# The detector already running in the browser is IR 7. onnxruntime-web 1.19 reads up to IR 10.
assert m.ir_version <= 10, f'IR version {m.ir_version} is newer than the pinned browser runtime reads'

# The same test split, through ONNX Runtime, against PyTorch.
sess = ort.InferenceSession('out/thermal_classifier.onnx', providers=['CPUExecutionProvider'])
xt = prepare(X[test_idx])
onnx_logits = np.concatenate([sess.run(None, {'input': xt[i:i + 1024]})[0] for i in range(0, len(xt), 1024)])
with torch.no_grad():
    torch_logits = torch.cat([model(torch.from_numpy(xt[i:i + 1024])) for i in range(0, len(xt), 1024)]).numpy()
max_diff = float(np.abs(onnx_logits - torch_logits).max())
onnx_macro_f1 = float(f1_score(yte, onnx_logits.argmax(1), average='macro', labels=labels))
print(f'max |onnx - torch| on the test split: {max_diff:.2e}')
print(f'macro-F1 through ONNX Runtime: {onnx_macro_f1:.4f}   (PyTorch: {macro_f1:.4f})')
assert max_diff < 1e-3, 'the export does not reproduce the model'
assert abs(onnx_macro_f1 - macro_f1) < 1e-6, 'the export changes a prediction'
print('size', os.path.getsize('out/thermal_classifier.onnx') // 1024, 'kB')
```

If the IR assertion fails, do not edit the number: send the printout. The fix is a
one-line downgrade of the file's IR field, and it has to be re-verified here.

## Cell 8 — the sanity check on the modelled frames

```python
import base64

def frame_of(entry):
    return np.frombuffer(base64.b64decode(entry['pixels']), dtype=np.uint8).reshape(HEIGHT, WIDTH)

entries = modelled['frames']
mx = prepare(np.stack([frame_of(e) for e in entries]))
mpred = sess.run(None, {'input': mx})[0].argmax(1)

NO_ANOMALY = CLASS_INDEX['No-Anomaly']
healthy = [i for i, e in enumerate(entries) if e['mechanism'] == 'healthy']
healthy_ok = int(sum(1 for i in healthy if mpred[i] == NO_ANOMALY))
share = healthy_ok / len(healthy)

print(f'modelled healthy frames read as No-Anomaly: {healthy_ok} of {len(healthy)} = {share:.1%}')
print('what the healthy ones were called instead:', dict(Counter(CLASSES[mpred[i]] for i in healthy if mpred[i] != NO_ANOMALY)))
by_mechanism = {}
for i, e in enumerate(entries):
    if e['mechanism'] == 'healthy': continue
    by_mechanism.setdefault(e['mechanism'], []).append({'panelId': e['panelId'], 'predicted': CLASSES[mpred[i]]})
    print(f"  {e['panelId']}  modelled as {e['mechanism']:10s} -> classified {CLASSES[mpred[i]]}")
```

**This number is reported as it is, low or not.** The classifier learned from real
frames and these are drawn from a model. If it rejects most of them, that is the
finding, and it goes on screen. Do not re-train to move it.

## Cell 9 — write the metrics and the class file, and download

```python
import datetime, shutil

classes_file = {
    'classes': CLASSES,
    'input': {'name': 'input', 'layout': 'NCHW', 'channels': 1, 'height': HEIGHT, 'width': WIDTH, 'dtype': 'float32', 'resize': 'none'},
    'output': {'name': 'logits'},
    'normalisation': {'divideBy': 255, 'mean': MEAN, 'std': STD, 'from': 'train split'},
}
with open('out/thermal_classifier.classes.json', 'w') as f:
    json.dump(classes_file, f, indent=2)

metrics = {
    'model': 'thermal-cnn-ism',
    'dataset': {'name': 'InfraredSolarModules', 'publisher': 'Raptor Maps', 'licence': 'MIT',
                'images': int(len(y)), 'width': WIDTH, 'height': HEIGHT,
                'classCounts': {c: int(counts[c]) for c in CLASSES}},
    'split': {'method': 'stratified 70/15/15', 'seed': SEED,
              'train': int(len(train_idx)), 'val': int(len(val_idx)), 'test': int(len(test_idx))},
    'headline': {'metric': 'macroF1', 'value': round(macro_f1, 4), 'split': 'test (held out)'},
    'accuracy': round(accuracy, 4),
    'perClass': {c: {'precision': round(float(p[i]), 4), 'recall': round(float(r[i]), 4),
                     'f1': round(float(f[i]), 4), 'support': int(s[i])} for i, c in enumerate(CLASSES)},
    'confusionMatrix': {'labels': CLASSES, 'rows': cm.tolist(), 'note': 'rows are the true class, columns the predicted'},
    'training': {'epochs': EPOCHS, 'bestEpoch': int(best_epoch), 'bestValMacroF1': round(float(best), 4),
                 'selectedOn': 'validation macro-F1', 'parameters': int(sum(q.numel() for q in model.parameters()))},
    'onnx': {'file': 'thermal_classifier.onnx', 'opset': int(opset_read), 'irVersion': int(m.ir_version),
             'maxAbsDiffVsTorch': max_diff, 'macroF1ViaOnnxRuntime': round(onnx_macro_f1, 4)},
    'modelledSanity': {'source': 'data/evidence/thermal_modelled.json', 'seed': modelled['seed'],
                       'healthyFrames': len(healthy), 'readAsNoAnomaly': healthy_ok, 'share': round(share, 4),
                       'byMechanism': by_mechanism},
    'trainedAt': datetime.date.today().isoformat(),
}
with open('out/thermal_classifier.json', 'w') as f:
    json.dump(metrics, f, indent=2)

shutil.copy('thermal_classifier.pt', 'out/thermal_classifier.pt')
print(sorted(os.listdir('out')))
!cd out && zip -r ../surya_thermal.zip . -q
files.download('surya_thermal.zip')
```

Expected contents, **six files**:

```
thermal_classifier.onnx   thermal_classifier.classes.json   thermal_classifier.json
thermal_classifier.pt     thermal_confusion.png             thermal_training.csv
```

## Unzip into the project

```powershell
cd "D:\Projects\12. project"
# extract surya_thermal.zip, then place:
#   thermal_classifier.onnx          -> public\models\thermal_classifier.onnx
#   thermal_classifier.classes.json  -> public\models\thermal_classifier.classes.json
#   thermal_classifier.json          -> data\evidence\thermal_classifier.json
#   thermal_classifier.pt            -> models\thermal_classifier.pt
#   thermal_confusion.png            -> docs\training\thermal_confusion.png
#   thermal_training.csv             -> docs\training\thermal_training.csv
#   Cell 6 screenshot                -> docs\training\thermal_metrics.png
```

Do not copy anything over `data\evidence\thermal_modelled.json`. It is generated
locally by `scripts/render_thermal.py`, and the sanity figure in
`thermal_classifier.json` is only true for the copy the notebook was given.

Then say the files are in place. Integration reads the class order and the
normalisation from `thermal_classifier.classes.json`, adds the Zod invariant for
`thermal_classifier.json`, and prints the macro-F1 and the modelled-frame share
it found.
