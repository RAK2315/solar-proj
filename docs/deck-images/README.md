# Deck images

Captured 30 Aug 2026 for `docs/slides.md`. Numbered by the slide they belong to.

**All console captures are at 1920x1080.** That is deliberate and not just for
sharpness: below the design size the console is CSS-scaled to fit, and the 3D
canvas currently mis-sizes itself under that transform, so the cinematic scene
fills only part of the frame. At 1920x1080 the scale is 1 and it is correct.

| File | What it shows |
|---|---|
| `01-hero-flight.png` | Drone on station over B-17. Two live detections drawn from the model's own output, PiP console running beside it. Slide 1. |
| `02-landing-hero.png` | Landing page hero. |
| `02-landing-gap.png` | The three derived stat cards — delivered share, array deviation, daily loss. Slide 2. |
| `04-detector-verify.png` | **The strongest image in the deck.** Reasoning chain left; right, the run ledger with two live verify runs reproducing the committed 0.91. Slide 4. |
| `04-annotated.jpg` | `b17_rgb_annotated.jpg` — the committed detection box. |
| `04-evidence-rgb.jpg` | The unannotated evidence photograph. |
| `04-thermal.png` | The ironbow thermal render. |
| `04-training-curves.png` | Training run metrics. |
| `04-texture-cracked.jpg` | The photograph used as module surface material in the 3D scene. Not evidence — say so if it is shown. |
| `05-site-dark.png` / `05-site-light.png` | Site screen, both themes. Slide 5. |
| `05-cinematic.png` | Cinematic with the PiP console. Slide 5. |
| `06-matrix.png` | The 5x7 anomaly matrix, R2 C3-C6 band lit, cell defects listed beneath. Slide 6. |
| `06-dossier-after-flight.png` | Full dossier after a completed sortie, for context. |
| `07-repairs.png` | Repairs screen with the arithmetic printed in each row. Slide 7. |

## Still to draw

Slides 3, 6 and 8 want diagrams that no screenshot provides: the 9-step loop,
the five-signal fusion flow, and the build-gate pipeline.

## Regenerating

`npm run demo` in one terminal, then drive the app with playwright-core against
`:3000` at 1920x1080 (`scripts/shoot.mjs` is the working example to copy).
The anomaly matrix only renders once a sortie has actually captured evidence,
so dispatch a drone and let the pass finish before opening the dossier.
