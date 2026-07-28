# Prerequisites — get these before Phase 1

Nothing here costs money. Total setup ≈ 30 minutes.

---

## 1. Accounts & API keys

| # | Service | Needed for | Cost | Where |
|---|---|---|---|---|
| 1 | **Groq** | The 3 cached agent calls (`run_agent.py`) | Free tier | [console.groq.com/keys](https://console.groq.com/keys) |
| 2 | **Roboflow** | Downloading the defect dataset | Free account | [app.roboflow.com](https://app.roboflow.com) → Settings → API key |
| 3 | **Google account** | Colab free T4 for training | Free | [colab.research.google.com](https://colab.research.google.com) |

Nothing else. **No OpenAI, no Anthropic, no Vercel key needed at build time** (Vercel deploy is via GitHub connect).

```bash
# .env.local  — used ONLY by scripts/. The Next.js app reads none of these.
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-120b
ROBOFLOW_API_KEY=...
LIVE_AGENT=false
```

⚠️ Add `.env.local` to `.gitignore` **before** you paste a key into it.

**Groq free-tier limits** are per-model RPM/RPD. You make **3 calls total, once**, offline. You will not come near a limit. If you somehow hit one, wait a minute — the output is cached and committed, so the demo never calls Groq at all.

---

## 2. Datasets

### 2a. RGB defect detection — pick ONE (required)

All on Roboflow Universe, all export directly in YOLOv8 format. Ranked by fit:

| Dataset | Images | Classes | Link |
|---|---|---|---|
| **Solar Panel Fault Detection** (SolarVision) ⭐ | ~921 | crack-focused | [universe.roboflow.com/solarvision-gwljt/solar-panel-fault-detection](https://universe.roboflow.com/solarvision-gwljt/solar-panel-fault-detection) |
| Crack Solar Panel | ~387 | Fault/crack | [universe.roboflow.com/solar-panel-detection-pz2ap/crack-solar-panel](https://universe.roboflow.com/solar-panel-detection-pz2ap/crack-solar-panel) |
| Cracked Solar Panels (Compass) | — | cracked | [universe.roboflow.com/compass-dhncp/cracked-solar-panels](https://universe.roboflow.com/compass-dhncp/cracked-solar-panels) |
| 4-class defect set | ~6,493 | bird drop, cracked, dusty, panel | search Universe for `class:cracked` |

**Start with SolarVision** — largest crack-labelled set of the three, enough to train on and small enough to finish on a T4 in under 30 minutes.

> **Use the dataset's real class names.** `CLAUDE.md` §11 proposes `["crack","soiling","delamination","hotspot"]`, but if your dataset ships `["bird drop","cracked","dusty","panel"]`, train on **those** and report those. Only `crack`/`cracked` ever appears on screen. Inventing class names you didn't train on is the same failure mode as inventing a metric.

**Record at download time** (not later — you will forget): dataset name, version, image count, train/val/test split, licence (usually CC BY 4.0). These go straight into `README.md`.

### 2b. Thermal source image (required)

You need **one** calibrated grayscale thermal image of a panel for `thermal_hotspot.py` to run on. Options:

- **PVMD dataset** — DJI Mavic 3T, hotspots/cracks/shadings, public: [`10.17632/5ssmfpgrpc.1`](https://data.mendeley.com/datasets/5ssmfpgrpc/1)
- **Roboflow thermal set** — 191 thermal panel images: [universe.roboflow.com/solarpanelimages/solar-panel-infrared-images](https://universe.roboflow.com/solarpanelimages/solar-panel-infrared-images)

`thermal_hotspot.py` is classical CV (cell-means → ΔT vs median → σ threshold → connected components). It works on **any** thermal panel image. Don't over-shop.

### 2c. Evidence RGB photo (required)

One photo of a solar panel with a visible crack → `data/evidence/b17_rgb.jpg`. The trained model runs on this and its **actual** confidence output drives the reticle.

Pull one from the held-out **test split** of your chosen dataset. That's the honest choice — the model has genuinely never seen it.

---

## 3. Media assets

| Asset | Source | Note |
|---|---|---|
| `b17_flyover.mp4` (8s) + cinematic background | [Pexels — Drone Footage of a Solar Farm](https://www.pexels.com/video/drone-footage-of-a-solar-farm-7042814/) | Free, no attribution required. **Download and commit — never hotlink.** |
| `b17_inverter_audio.wav` (6s) | [Freesound](https://freesound.org) — search "transformer hum" / "inverter buzz" (filter CC0) | V2. Check licence per-clip; Freesound mixes CC0 and BY. |
| Drone glTF (Phase 8 only) | [Poly Pizza](https://poly.pizza) or [Sketchfab](https://sketchfab.com) CC0 filter | Low-poly, 4 rotors. Not needed until Phase 8. |
| IBM Plex Mono / Sans / Sans Condensed | `next/font/google` | No download — code handles it. |

---

## 4. Local toolchain

```bash
node --version     # ≥ 20
python --version   # 3.10+
```

```bash
# Python — scripts/ only, never runtime
pip install numpy pandas ultralytics opencv-python matplotlib groq roboflow scipy
```

`scipy` is only needed for the optional acoustic FFT (H1). Skip it if you're not building that.

---

## 5. Checklist

- [ ] Groq API key in `.env.local`, `.env.local` in `.gitignore`
- [ ] Roboflow API key
- [ ] Colab opens and `!nvidia-smi` shows a T4
- [ ] RGB dataset chosen; **name / count / split / licence written into `README.md`**
- [ ] Thermal image saved
- [ ] `b17_rgb.jpg` chosen from the test split
- [ ] Pexels flyover downloaded and committed
- [ ] `node -v` ≥ 20, `python -v` ≥ 3.10, pip packages installed
- [ ] `LICENSE` file = **AGPL-3.0** (YOLOv8's licence is contagious to your weights — see `02-architecture.md` ADR)
