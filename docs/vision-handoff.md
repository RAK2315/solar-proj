# Vision handoff — Colab → repo

Phase 3 is split across two machines on purpose: **no model ever runs on this laptop.**
Everything on the repo side is wired and waiting. This page is the round-trip.

---

## Before you open Colab

Everything below is already done — nothing to prepare.

| Ready | What |
|---|---|
| ✅ | `src/lib/types.ts` — `Detection` schema, class names verbatim, `apPerClass` |
| ✅ | Invariant **I11** — five separate rejections, tested against synthetic inputs |
| ✅ | `npm run validate:data` — picks the detection up automatically when it appears |
| ✅ | `models/` and `docs/training/` — destinations documented |
| ✅ | `plan/COLAB-NOTEBOOK.md` — corrected; run **Cells 1–5 and 7 only** |
| ✅ | Thermal path — measured, committed, and **out of the download** |

## Run it

`plan/COLAB-NOTEBOOK.md`. Runtime → T4 GPU first, or it runs on CPU for hours.

Three things that will bite if you deviate:

1. **Cells 6a–6c are superseded — do not run them.** They regenerate the thermal cell grid.
   The committed one is a real measurement whose coordinates are baked into the fault story,
   the prognosis prompt and invariant I10. Cell 7 deliberately excludes those files from the
   zip so an unzip cannot clobber them.
2. **Do not hardcode the Roboflow key** in a cell. Cell 2 prompts with `getpass`; the key is
   in `.env.local`. The old notebook had it inline and it is now in git history — see the
   warning at the bottom of this page.
3. **Do not rename the classes.** `BakimGereken, Cracked, Dirty, Good, Saglam`, two of them
   Turkish, exactly as shipped. The Zod enum rejects anything else, on purpose.

## Bring it back

Extract `surya_vision.zip` — **five files, no thermal** — and place:

| From the zip | To |
|---|---|
| `defect_yolov8n.pt` | `models/defect_yolov8n.pt` |
| `b17_rgb.jpg` | `data/evidence/b17_rgb.jpg` |
| `b17_rgb_annotated.jpg` | `data/evidence/b17_rgb_annotated.jpg` |
| `b17_detection.json` | `data/evidence/b17_detection.json` |
| `results.csv` | `docs/training/results.csv` |
| `training_curves.png` | `docs/training/training_curves.png` |
| *screenshot of Cell 4* | `docs/training/metrics.png` |

⛔ Nothing goes over `data/evidence/b17_cellgrid.json` or `b17_thermal.png`.

Then:

```bash
npm run validate:data
```

**I11 flips from `skip` to `PASS`**, and the run prints a `vision, as the model returned it`
block with the confidence, the five-class mean, and per-class AP. Copy those two figures into
`docs/dataset-provenance.md`'s pending rows and the `README.md` provenance table.

## If validation rejects it

Each message says what to do. The rejections exist to stop specific lies:

| Message | Meaning |
|---|---|
| `confidence is exactly 0.84` | That is `CLAUDE.md` §2's **placeholder**, not a result. If the model genuinely returned it, delete the check and say so in the README. |
| `label is "X", but the reticle says a crack` | The model did not find a crack in that image. Try another candidate — do **not** relabel a different class. |
| `apPerClass has no entry for Cracked` | Cell 4's per-class dict did not make it into Cell 5. The five-class mean is not a substitute. |
| `evidence image came from the "train" split` | The confidence is only meaningful on data the model never saw. |
| `Invalid option: expected one of "BakimGereken"…` | Someone renamed the classes. |

## What to say when a judge asks "what did you actually train?"

Four things, in this order — all of them openable on screen:

1. `docs/dataset-provenance.md` — dataset, licence, 921 images / 1,067 boxes, per-split class
   counts **counted from the label files**, not read off a web page.
2. `docs/training/metrics.png` — the metrics table as printed by the run.
3. `data/evidence/b17_detection.json` — the confidence on the screen, on a **held-out test
   image**, with per-class AP alongside.
4. The honest caveat, volunteered rather than extracted: *"the five-class mean is depressed by
   `Saglam`, which has 27 boxes total. The number that matters is AP@50 for `Cracked`, and
   `Dirty` has no test instances at all so its AP is undefined rather than zero."*

Volunteering the weakness is what makes the rest of it credible.

---

## ⚠️ Rotate the Roboflow key

`plan/COLAB-NOTEBOOK.md` shipped with a Roboflow API key hardcoded in Cell 2, and that file
is committed — so the key is in this repository's git history and rewriting the notebook does
not remove it. If this repo is ever public (and AGPL-3.0 says it will be):

**Roboflow → Settings → API Keys → revoke and reissue**, then put the new key in `.env.local`
only. Cell 2 now prompts for it at runtime.
