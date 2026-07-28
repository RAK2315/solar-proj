# docs/training/

Evidence that the training run happened, and that the reported numbers are the ones it
produced. Populated from the Colab run (`plan/COLAB-NOTEBOOK.md`).

| File | From | Why it is here |
|---|---|---|
| `results.csv` | `surya/defect/results.csv` | Per-epoch loss and metric history — the run's own log |
| `training_curves.png` | `surya/defect/results.png` | The curves, so "did it converge" is answerable by looking |
| `metrics.png` | screenshot of Cell 4 output | The per-class AP@50 table **as printed** |

The `metrics.png` screenshot is the point of this directory. When a judge asks "what did you
actually train?", the answer is this folder, `models/defect_yolov8n.pt`, and the dataset
provenance table — not a claim.

The numbers themselves live in `data/evidence/b17_detection.json` as committed data
(`mAP50` and `apPerClass`), so they are validated by `npm run validate:data` rather than
retyped from the screenshot into a README. The screenshot exists to corroborate the JSON,
not the other way round.

**Report what the run produced.** If `Cracked` scores 0.63, the README says 0.63. Do not
round up and do not quote the dataset's leaderboard as your own — this is the one thing in
the project that cannot be repaired after the fact.
