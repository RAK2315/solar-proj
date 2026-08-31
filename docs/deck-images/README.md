# Deck images

Captured 31 Aug 2026 for `docs/slides.md`, which is nine slides. Numbered by the
slide they belong to.

**Everything here is a real screenshot or a real graph.** There are no pictures of
text and no diagrams waiting to be drawn — if a slide needs words, they are set as
words on the slide.

All console captures are at 1920×1080, which is the design size, so nothing is
resampled. The console itself now scales correctly at any window size
(`check:layout` measures the 3D canvas against its frame on every run), so this is
a sharpness choice rather than a workaround.

| File | Slide | What it shows |
|---|---|---|
| `01-hero-flight.png` | 1 | Drone on station over B-17 during the pass, with the detector's own box — `Cracked 0.74` — drawn on the module it found. The live console runs beside it. |
| `02-landing-gap.png` | 2 | The landing page's three derived figures: 73% delivered, −41.7% on one array, 1.01 MWh a day. |
| `03-incident-chain.png` | 3 | "How this conclusion was reached" — six steps, each badged with whether its answer is a measurement, a model projection, a calculation or a person. Includes the live browser run. |
| `04-detector-verify.png` | 4 | **The strongest image in the deck.** The reasoning chain on the left; on the right the captured evidence and the run ledger, with two Verify runs reproducing the committed 0.91. |
| `04-annotated.jpg` | 4 | `b17_rgb_annotated.jpg` — the committed detection box. |
| `04-thermal.png` | 4 | The ironbow thermal render of the same module. |
| `04-training-curves.png` | 4 | Training-run metrics, if a fourth image is wanted. |
| `06-matrix.png` | 5 | The 5×7 cell grid, R2 C3–C6 lit, with the measured temperatures listed beneath. |
| `07-repairs.png` | 6 | The repair queue, each row printing its own arithmetic. |
| `05-site-dark.png`, `05-site-light.png` | 7 | The site screen in both themes. |
| `05-cinematic.png` | 7 | The drone's view with the picture-in-picture console. |
| `08-rehearsal.png` | 8 | The Rehearsal screen — inject a fault on any array and the physics works out the rest. |
| `09-data.png` | 9 | The Data screen: the day's generation curve with losses drawn against it, loss by cause, and the worst arrays. |

Spare, if a slide wants another image: `02-landing-hero.png`, `04-evidence-rgb.jpg`,
`06-dossier-after-flight.png`.

`04-texture-cracked.jpg` is the photograph used as **surface material** on the 3D
modules. It is not evidence. If it is ever shown, say so.

## Regenerating

`npm run demo` in one terminal, then drive the app with `playwright-core` against
`:3000` at 1920×1080. Two things to know:

- **The anomaly matrix and the incident chain only fill in after a real sortie.**
  Dispatch a drone and let the pass finish before opening the dossier.
- **Catch the cinematic by polling for the detector's box**, not by waiting a fixed
  time. At 600× a whole sortie is about six seconds; at 60× it is fifty-six. Poll
  the page for `Cracked 0.` and take the shot when it appears.
- The picture-in-picture renders a second live console at `scale(0.31)`, so any
  text you search for exists twice. Take the widest match.
