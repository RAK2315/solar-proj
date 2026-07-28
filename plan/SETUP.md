# Setup — exact steps before you start

Verified on this machine: **Node v24.16.0, npm 11.13.0, Python 3.10.11, git 2.54.0.** All above minimum. **You have nothing to install.**

Work through STEP 1, then start building. STEPS 2–5 aren't needed until Phase 3 and can be done while Phases 0–2 are underway.

---

## STEP 1 — 3 minutes, do this now

Everything here is local. No accounts, no downloads.

### 1a. Initialise git

The project is not a git repo yet. Do this before the first line of code exists.

```powershell
cd "D:\Projects\12. project"
git init
```

### 1b. Create `.gitignore` — before any key exists

```powershell
@'
node_modules/
.next/
out/
.env.local
.env*.local
.DS_Store
*.log
__pycache__/
*.pyc
.venv/
venv/
runs/
datasets/
'@ | Out-File -FilePath ".gitignore" -Encoding utf8
```

`runs/` and `datasets/` are Ultralytics' training scratch dirs — they're large and you don't want them committed. `models/*.pt` **is** committed (that's the provenance evidence); it's small (~6 MB for YOLOv8n).

### 1c. Create the env stub — empty for now

```powershell
@'
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
ROBOFLOW_API_KEY=
LIVE_AGENT=false
'@ | Out-File -FilePath ".env.local" -Encoding utf8
```

Verify it's ignored before you paste a real key into it:

```powershell
git status --short   # .env.local must NOT appear
```

If it appears, stop and fix `.gitignore` first.

### 1d. Local Python packages — the light set only

```powershell
pip install numpy pandas groq
```

**That's deliberately all.** Do **not** `pip install ultralytics` locally — it pulls PyTorch (~2.5 GB). All vision work runs on Colab, which has torch pre-installed; you download the finished artefacts. See STEP 4.

### ✅ You can now start Phase 0 and Phase 1

Open a new Claude Code session and paste the prompt from `KICKOFF-PROMPT.md`. Phases 0–2 need **no keys and no datasets**.

---

## STEP 2 — Groq API key (2 min, needed by Phase 6)

1. Go to **[console.groq.com](https://console.groq.com)** → sign in with Google/GitHub.
2. Left sidebar → **API Keys** → **Create API Key**.
3. Name it `surya`. Copy the key — **it's shown once**.
4. Paste into `.env.local` after `GROQ_API_KEY=`.

Free tier, no card required. You make **3 calls total, once, offline**. The output is cached and committed, so the demo itself never calls Groq.

**Sanity check** (after `pip install groq`):
```powershell
python -c "import os,groq; c=groq.Groq(api_key='PASTE_KEY_HERE'); print(c.chat.completions.create(model='openai/gpt-oss-120b',messages=[{'role':'user','content':'reply OK'}]).choices[0].message.content)"
```
Prints `OK` → you're good. If the model ID errors, check [console.groq.com/docs/models](https://console.groq.com/docs/models) for the current free-tier list and update `GROQ_MODEL` in `.env.local`.

---

## STEP 3 — Roboflow account + dataset (10 min, needed by Phase 3)

### 3a. Account and key
1. **[app.roboflow.com](https://app.roboflow.com)** → sign up free.
2. Click your workspace → **Settings** → **API Keys** → copy the **Private API Key**.
3. Paste into `.env.local` after `ROBOFLOW_API_KEY=`.

### 3b. Pick the dataset

Go to **[universe.roboflow.com/solarvision-gwljt/solar-panel-fault-detection](https://universe.roboflow.com/solarvision-gwljt/solar-panel-fault-detection)** (~921 crack images — the recommended one).

If that link is dead, use either backup:
- [universe.roboflow.com/solar-panel-detection-pz2ap/crack-solar-panel](https://universe.roboflow.com/solar-panel-detection-pz2ap/crack-solar-panel) (~387)
- [universe.roboflow.com/compass-dhncp/cracked-solar-panels](https://universe.roboflow.com/compass-dhncp/cracked-solar-panels)

### 3c. Record the provenance — do this NOW, not later

On the dataset page, before downloading, write these five things into a scratch file:

```
Dataset name    : ______________________________
Version         : ______________________________
Total images    : ______________________________
Train/val/test  : ______ / ______ / ______
Licence         : ______________________________  (usually CC BY 4.0)
Class names     : ______________________________  (the ACTUAL ones, verbatim)
URL             : ______________________________
```

These go verbatim into `README.md`. "Where's your data from?" answered precisely is a large credibility swing; answered vaguely it's a rejection signal. You will not remember this in two weeks.

⚠️ **Copy the class names exactly as the dataset ships them.** If it's `["bird drop","cracked","dusty","panel"]`, you train and report *those* — not CLAUDE.md's proposed `["crack","soiling","delamination","hotspot"]`. Only the crack class ever appears on screen. Reporting classes you didn't train on is the same failure as reporting a metric you didn't measure.

### 3d. Get the download snippet
On the dataset page → **Download this Dataset** → format **YOLOv8** → **show download code**. Copy the Python snippet; you'll paste it into Colab in STEP 4.

---

## STEP 4 — Train on Colab (30 min, mostly waiting)

Everything vision-related happens here, so nothing heavy installs locally.

1. **[colab.research.google.com](https://colab.research.google.com)** → **New notebook**.
2. **Runtime → Change runtime type → T4 GPU → Save.** ← easy to forget; without it training takes hours.
3. Confirm the GPU:
   ```python
   !nvidia-smi
   ```
   Must show `Tesla T4`.
4. Install and pull the dataset:
   ```python
   !pip install ultralytics roboflow -q
   # paste your Roboflow download snippet from STEP 3d here
   ```
5. Train (~20–30 min):
   ```python
   from ultralytics import YOLO
   model = YOLO('yolov8n.pt')
   model.train(data='<path>/data.yaml', epochs=50, imgsz=640, batch=16)
   ```
6. **Screenshot the final metrics table.** The real mAP@50 is the number that goes in `README.md`. Whatever it is — 0.41 is a respectable, honestly-reported result and worth more than 0.85 you can't defend.
7. Download these back to the project:
   - `runs/detect/train/weights/best.pt` → `models/defect_yolov8n.pt`
   - the metrics screenshot → `docs/training_metrics.png`
   - `runs/detect/train/results.csv` → `docs/results.csv`

Colab free sessions time out. 50 epochs on YOLOv8n/T4 finishes well inside the limit, but don't close the tab.

---

## STEP 5 — Assets (10 min, needed by Phases 3 and 7)

Create the folders first:

```powershell
cd "D:\Projects\12. project"
New-Item -ItemType Directory -Force -Path "data\evidence", "models", "docs", "scripts" | Out-Null
```

| # | File | Where to get it |
|---|---|---|
| 1 | `data\evidence\b17_rgb.jpg` | **A cracked-panel image from your dataset's held-out `test/` split.** The model genuinely hasn't seen it — that's the honest choice, and it's the image the reticle's confidence comes from. |
| 2 | `data\evidence\b17_thermal_source.png` | [PVMD on Mendeley](https://data.mendeley.com/datasets/5ssmfpgrpc/1) (DJI Mavic 3T) or [Roboflow's 191 IR images](https://universe.roboflow.com/solarpanelimages/solar-panel-infrared-images). Any thermal panel image works — `thermal_hotspot.py` is classical CV. Don't over-shop. |
| 3 | `public\b17_flyover.mp4` | [Pexels — Drone Footage of a Solar Farm](https://www.pexels.com/video/drone-footage-of-a-solar-farm-7042814/) → Free Download → HD. **Download and commit. Never hotlink.** Same clip serves as the cinematic background in Phase 7. |
| 4 | `public\b17_inverter_audio.wav` | *(V2, optional)* [freesound.org](https://freesound.org) → search "transformer hum" → filter **CC0**. Check the licence per clip; Freesound mixes CC0 and BY. |
| 5 | drone glTF | *(Phase 8 only — skip for now)* [poly.pizza](https://poly.pizza) or Sketchfab with the CC0 filter. |

---

## Final checklist

**Before Phase 0** (3 min):
- [ ] `git init` done
- [ ] `.gitignore` created, `git status` does **not** list `.env.local`
- [ ] `.env.local` stub created
- [ ] `pip install numpy pandas groq`

**Before Phase 3** (~40 min):
- [ ] Roboflow key in `.env.local`
- [ ] Dataset chosen; **name / version / count / split / licence / class names written down**
- [ ] Colab shows Tesla T4
- [ ] `models\defect_yolov8n.pt` + `docs\training_metrics.png` downloaded
- [ ] `b17_rgb.jpg` from the **test** split
- [ ] thermal source image saved

**Before Phase 6**:
- [ ] Groq key in `.env.local`, test call returns `OK`

**Before Phase 7**:
- [ ] Pexels flyover downloaded to `public\`
