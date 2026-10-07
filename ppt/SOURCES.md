# Where every figure on the deck comes from

The deck is held to the product's own rule: no figure without a source. Each row
is a figure that appears on a slide, with the slide, and where it was read.

Three kinds of source are used:

- **Repo**: a file in this repository. The status box at the top of `CLAUDE.md`
  records every measurement with its date.
- **Capture**: read off a screenshot of the running prototype, taken 7 Oct 2026
  from a production build (`npm run demo`) in Chrome at 1920 by 1080, starting
  from the committed rehearsal state. The site clock runs, so these move with
  site time: a figure captured at 10:23 will read differently at 11:00. The
  picture each was read from is on the same slide.
- **Cited**: an outside document, with its address.

## Outside sources

| Short name | Full reference |
|---|---|
| Turbine Logic / EPRI | Sheppard, Cook, Perullo (Turbine Logic) and Fregosi, Bolen (EPRI), *Field Experience Detecting PV Underperformance in Real Time Using Existing Instrumentation*. https://www.osti.gov/servlets/purl/1960134 . Read in full 4 Oct 2026. Hosted on OSTI. **Not an NREL paper.** |
| SECI auction | SECI auction, Bhadla Phase-III Solar Park, 2017. https://www.iea.org/policies/6373-auction-of-solar-corporation-of-india-seci and https://www.pv-magazine-india.com/?p=1613 . Checked 6 Oct 2026. |
| NREL PVWatts | NREL/TP-6A20-60272. https://docs.nrel.gov/docs/fy14osti/60272.pdf |
| Roboflow dataset | Solar Panel Fault Detection v2, `solarvision-gwljt`. https://universe.roboflow.com/solarvision-gwljt/solar-panel-fault-detection/dataset/2 . CC BY 4.0. |
| Raptor Maps dataset | InfraredSolarModules. https://github.com/RaptorMaps/InfraredSolarModules . MIT. |

## Figures, by slide

| Slide | Figure | Kind | Source |
|---|---|---|---|
| 1, 4 | 500 MW block of Bhadla Solar Park | Repo | `CLAUDE.md` §1; Bhadla Phase-III is 500 MW, `src/lib/money.ts` |
| 2 | Aerial infrared inspection is usually annual | Cited | Turbine Logic / EPRI: "This is usually performed on an annual cadence." |
| 2 | Faults go undetected for weeks to months | Cited | Turbine Logic / EPRI: "many failures go undetected for weeks to months at a time." |
| 2, 9 | B-17 is 41.7 % below expected | Repo | `scripts/physics.py`, `src/lib/physics.ts` (`DEV_ARRAY_PCT`); `docs/contract-freeze.md` |
| 2, 9 | 3.07 MWh lost over 72 h | Repo | `src/lib/queue.ts` (`projected72hLossMWh`); `CLAUDE.md` correction C16 |
| 2, 9 | ₹7,509 lost over 72 h | Repo | 3.07 MWh at the tariff, by `src/lib/money.ts`; shown on the array panel in `09-incident-approval-gate.png` |
| 2, 8, 10 | ₹2.446/kWh | Repo, from Cited | (200 MW × ₹2.44 + 300 MW × ₹2.45) ÷ 500 MW, computed in `src/lib/money.ts` from the SECI auction lots |
| 3 | Raptor Maps, Zeitview and Sitemark do drone thermal imaging with AI; twins under way | Repo | `plan/rework/01-hero.md`, prior-art sweep of 4 Oct 2026. Our reading of their public material, not a benchmark |
| 4, 11 | 120 arrays, three zones, three inverters | Repo | `data/farm.json` |
| 5 | 921 labelled photographs | Repo | `docs/dataset-provenance.md`, read from the dataset's own `data.yaml` |
| 5, 12 | Cracked AP@50 0.995, held-out test split | Repo | `data/evidence/b17_detection.json` (`apPerClass.Cracked`, `split`); `docs/dataset-provenance.md` |
| 5 | Model `openai/gpt-oss-120b` on Groq | Repo | `src/app/api/triage/route.ts`; `data/agent_cache.json` |
| 5, 9 | Act before 14:00 | Repo | `data/forecast.json` (`actBefore`), from the thermal-dose model in `physics.ts` |
| 5, 12 | Solver cut off at 50 ms | Repo | `src/lib/highsSolver.ts`; `plan/rework/02-stack.md` DR-9 |
| 5 | InfraredSolarModules: 20,000 images, 12 classes | Repo | `docs/dataset-provenance.md`; `CLAUDE.md` status box, P3 |
| 6 | Cracked 0.90 on the drone's frame | Capture | `06-drone-frame-detector.png`, the label on the box. `CLAUDE.md` records 0.89 on an earlier flight; this flight returned 0.90 |
| 6 notes | 0.91 on the committed photograph, committed 0.9084 | Capture and Repo | `06-dossier-evidence-matrix.png`; `data/evidence/b17_detection.json` |
| 6 | Four hot cells, row 2 columns 3 to 6, about +2.8 °C, one band | Repo | `data/evidence/b17_cellgrid.json`, written by `scripts/thermal_hotspot.py` |
| 6 | Declared 25 °C span | Repo | `THERMAL_SPAN_C`, README physics table. A declared assumption |
| 6, 13 | B-17 diagnosed; 119 flagged from modelled signature | Repo | `plan/rework/01-hero.md` vocabulary rule; enforced by `scripts/check_literals.mjs` |
| 7 | score = loss per day × severity × urgency ÷ access | Repo | `src/lib/ranking.ts` |
| 7 | 1.01 MWh × 3.0 × 7.65 ÷ 1.0 = 23.17, at 10:23 site time | Capture | `07-queue-arithmetic-dayplan.png` |
| 7 | Urgency = 1 + 24 ÷ hours left | Repo | `src/lib/ranking.ts` |
| 7 | A-08 next at 0.81 | Capture | `07-queue-arithmetic-dayplan.png` |
| 8 | 8 arrays affected, 6 jobs added, 1 displaced, B-17 still first | Capture | `08-sandbox-dust-dropped.png`, the line under the queue |
| 8 | 5.62 MWh, ₹13,742, band ₹12,544 to ₹14,911, over 72 h | Capture | `08-sandbox-dust-dropped.png`, Hazards panel. Depends on where the dust was dropped |
| 8, 12 | 31 to 40 ms from drop to the re-planned frame; budget 150 ms | Repo | `CLAUDE.md` status box, P5: measured in Chrome with `npm run measure:hero`. Budget: `plan/rework/01-hero.md` R2 |
| 8, 12 | 60.1 fps, no frame over 20 ms, at both widths | Repo | `CLAUDE.md` status box, P5 |
| 8 notes | 5.8 % difference at 14:17 site time | Repo | `plan/rework/01-hero.md`; `CLAUDE.md` status box |
| 9 | Work order INC-B17 | Repo | `CLAUDE.md` §19 fixed identifiers |
| 9 picture | 0.77 MWh / ₹1,891, 1.52 MWh / ₹3,715, 4.82 MWh / ₹11,779 | Capture | `09-cost-of-waiting.png`. Not repeated as slide text because they move with site time |
| 10 | ₹74,114 for 30 days | Derived | 1.01 MWh/day (`data/repair_queue.json`, INC-B17) × 30 = 30.3 MWh; × 1000 × ₹2.446 = ₹74,113.8. **An illustration: it assumes the loss stays constant.** Labelled so on the slide |
| 10 notes | 178 kW short, 0.6 %; 9.66 of 903 MWh; ₹23,623, band ₹21,529 to ₹25,665 | Capture | `10-analytics-expected-actual.png` |
| 10 | Lots: ACME 200 MW at ₹2.44, SBG Cleantech 300 MW at ₹2.45 | Cited | SECI auction; held in `src/lib/money.ts` |
| 10 | Crews kept out above 40 °C | Repo | `CLAUDE.md` status box, P4: "The heat rule is 40 °C" |
| 11 | 16 invariants | Repo | `src/lib/types.ts`, I1 to I16 |
| 11, 12 | 463 tests | Repo and run | `CLAUDE.md` status box; re-run 7 Oct 2026 by `npm run demo`: 31 files, 463 passed |
| 11 | ONNX opset 12 | Repo | `plan/rework/02-stack.md` §3 |
| 12 | Solve 10.8 ms at the rehearsal state, 1.1 ms under a heatwave | Repo | `CLAUDE.md` status box, the owner's rulings of 6 Oct |
| 12 | Test split of 42 images | Repo | `docs/dataset-provenance.md` |
| 12 | No text under 14 px | Repo | `scripts/check_layout.mjs` |
| 12 | 2D fallback below 30 fps | Repo | `src/components/twin/Watchdog.tsx` |
| 13 notes | γ −0.0037/°C, NOCT 45 °C, η 0.98, soiling 0.97 | Repo | README physics table; `scripts/physics.py` |
| 13 | Forecast band ±5 % widening to ±15 % | Repo | `CLAUDE.md` status box, P5. A declared assumption |
| 13 notes | Module replacement 3 h, wash 1 h | Repo | `src/lib/repair.ts`. Declared, not sourced |
| 13 notes | 65 °C threshold, 5 h dose budget | Repo | README physics table. Declared; the budget is solved to give 14:00 |
| 15 | Library versions and licences | Repo | each package's `package.json` under `node_modules`, read 7 Oct 2026 |
| 15 | Dataset sizes and licences | Repo | `docs/dataset-provenance.md` |

## Declared assumptions that appear on the deck

These are labelled as assumptions on the slides and in the product, and must stay
labelled if the deck is restyled:

- Hazard strengths in the sandbox (`HAZARD_SPEC` in `src/lib/hazard.ts`).
- Crew hours for each kind of repair (`src/lib/repair.ts`).
- The forecast band, ±5 % on irradiance now widening to ±15 % at 72 h.
- The 25 °C thermal span, the 65 °C threshold and the 5 h dose budget.
- The 30-day figure on slide 10, which assumes a constant loss.

## What the deck must not say

- No score for the thermal classifier. No model has been trained.
- No deviation settlement (DSM) charge, computed or estimated.
- ₹2.44 alone as the tariff. It is ₹2.446, the blend.
- That the solver beats the heuristic at the hero moment. They match there.
- That the Turbine Logic / EPRI paper is from NREL.
- "Diagnosed" for any array but B-17.
- That the telemetry is from a real plant. It is simulated on a published PV model.

## Not from the repo, supplied by the owner

- The event, track, team name, deadline and judging criteria: the owner's brief.
- Team members: Rehaan Ahmad Khan, Shantanu Singh, Lakshita Rawat, Krishna Agarwal.
  Departments were not supplied and are not on the deck.
- Patent and startup lines on slide 14 state only what the repository supports
  (nothing filed; the AGPL-3.0 constraint). Replace them with the team's actual
  intentions if there are any.
