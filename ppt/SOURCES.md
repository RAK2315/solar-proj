# Where every figure on the deck comes from

The deck is held to the product's own rule: no figure without a source. Each row
is a figure that appears on a slide, with the slide, and where it was read.

Three kinds of source are used:

- **Repo**: a file in this repository. The status box at the top of `CLAUDE.md`
  records every measurement with its date.
- **Capture**: read off a screenshot of the running prototype, taken 7 Oct 2026
  from a production build (`npm run demo`) in Chrome at 1920 by 1080, in the
  product's light theme, starting
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

The deck is eight slides, also saved as `SURYA-AGENT-Round1.pdf`: 1 title, 2 problem statement, 3 our solution, 4 tech
stack and flow, 5 our USP, 6 feasibility and viability, 7 impact and benefits,
8 research and references. The one-page PDF (`SURYA-AGENT-One-Page.pdf`) uses a
subset of the same figures and nothing that is not in this table.

| Slide | Figure | Kind | Source |
|---|---|---|---|
| 1 | 500 MW block of Bhadla Solar Park | Repo | `CLAUDE.md` section 1; Bhadla Phase-III is 500 MW, `src/lib/money.ts` |
| 1 | 364 MW delivered, at 62.8 °C cell temperature | Repo | `src/app/numbers.ts` (`OUTPUT_MW`, `CELL_TEMP_C`), from `src/lib/physics.ts`; README physics table |
| 1, 2, 7 | B-17 is 41.7 % below expected; 5 of 7 strings bypassed | Repo | `scripts/physics.py`, `src/lib/physics.ts` (`DEV_ARRAY_PCT`); `docs/contract-freeze.md` |
| 1, 2, 7 | 3.07 MWh lost over 72 h; act before 14:00 | Repo | `src/lib/queue.ts` (`projected72hLossMWh`); `data/forecast.json` (`actBefore`) |
| 1, 3, 6 | Cracked AP@50 0.995, held-out test split | Repo | `data/evidence/b17_detection.json` (`apPerClass.Cracked`, `split`); `docs/dataset-provenance.md` |
| 1, 4 | 120 arrays; six screens | Repo | `data/farm.json`; `src/components/shell/Rail.tsx` |
| 2 | Aerial infrared inspection is usually annual | Cited | Turbine Logic / EPRI: "This is usually performed on an annual cadence." |
| 2 | Faults go undetected for weeks to months | Cited | Turbine Logic / EPRI: "many failures go undetected for weeks to months at a time." |
| 2, 7 | ₹7,509 lost over 72 h | Repo | 3.07 MWh at the tariff, by `src/lib/money.ts`; shown on the array panel |
| 2, 5, 7 | ₹2.446/kWh | Repo, from Cited | (200 MW × ₹2.44 + 300 MW × ₹2.45) ÷ 500 MW, computed in `src/lib/money.ts` from the SECI auction lots |
| 2 | Raptor Maps, Zeitview and Sitemark do drone thermal imaging with AI; twins under way | Repo | `plan/rework/01-hero.md`, prior-art sweep of 4 Oct 2026. Our reading of their public material, not a benchmark |
| 3 | Cracked 0.89 on the drone's frame | Capture | `03-drone-detection.png`, the label on the box, and the dossier's own text on that flight. `CLAUDE.md` records 0.89 on an earlier flight; a flight on the same day in the dark theme returned 0.90 |
| 3 notes | 0.91 on the committed photograph, committed 0.9084 | Capture and Repo | the dossier on that flight; `data/evidence/b17_detection.json` |
| 3 | Four hot cells, row 2 columns 3 to 6, about +2.8 °C, one band | Repo | `data/evidence/b17_cellgrid.json`, written by `scripts/thermal_hotspot.py` |
| 3 | 921 labelled photographs | Repo | `docs/dataset-provenance.md`, read from the dataset's own `data.yaml` |
| 3, 4 | Model `openai/gpt-oss-120b` on Groq | Repo | `src/app/api/triage/route.ts`; `data/agent_cache.json` |
| 3, 4, 6 | Solver capped at 50 ms | Repo | `src/lib/highsSolver.ts`; `plan/rework/02-stack.md` DR-9 |
| 3, 6 | B-17 diagnosed; 119 flagged from modelled signature | Repo | `plan/rework/01-hero.md` vocabulary rule; enforced by `scripts/check_literals.mjs` |
| 4 | 16 invariants | Repo | `src/lib/types.ts`, I1 to I16 |
| 4, 6 | 457 tests | Repo and run | `CLAUDE.md` status box, the landing page row; run 7 Oct 2026 by `npm run demo`: 457 passed |
| 4 | Versions: Next.js 15, React 19 | Repo | `package.json` |
| 5 | score = loss per day × severity × urgency ÷ access; urgency = 1 + 24 ÷ hours left | Repo | `src/lib/ranking.ts` |
| 5 | 1.01 MWh × 3.0 × 7.69 ÷ 1.0 = 23.29; A-08 next at 0.81 | Capture | `05-queue-arithmetic.png` |
| 5 | 8 arrays affected, 6 jobs added, 1 displaced, B-17 still first | Capture | `05-sandbox-hazard.png`, the line under the queue |
| 5 | 5.61 MWh, ₹13,714, band ₹12,518 to ₹14,880, over 72 h | Capture | `05-sandbox-hazard.png`, Hazards panel. Depends on where the dust was dropped |
| 5, 6 | 31 to 40 ms from drop to the re-planned frame; budget 150 ms | Repo | `CLAUDE.md` status box, P5: measured in Chrome with `npm run measure:hero`. Budget: `plan/rework/01-hero.md` R2 |
| 5, 6 | 60.1 fps, no frame over 20 ms, at both widths | Repo | `CLAUDE.md` status box, P5 |
| 5 notes | 5.8 % difference at 14:17 site time | Repo | `plan/rework/01-hero.md`; `CLAUDE.md` status box |
| 6 notes | Solve 10.8 ms at the rehearsal state, cut off at 50 ms | Repo | `CLAUDE.md` status box, the owner's rulings of 6 Oct |
| 6 notes | Test split of 42 images | Repo | `docs/dataset-provenance.md` |
| 6 | Tested to 120 arrays | Repo | `data/farm.json`: the product has never been run larger |
| 6 | A 2D map takes over below 30 frames a second | Repo | `src/components/twin/Watchdog.tsx` |
| 6 | A build gate of 16 invariants | Repo | `src/lib/types.ts`, I1 to I16; `scripts/validate_data.ts` |
| 6 notes | γ −0.0037/°C, NOCT 45 °C, η 0.98; module replacement 3 h, wash 1 h; 65 °C, 5 h | Repo | README physics table; `src/lib/repair.ts`. Declared where the README says so |
| 7 | ₹74,114 for 30 days | Derived | 1.01 MWh/day (`data/repair_queue.json`, INC-B17) × 30 = 30.3 MWh; × 1000 × ₹2.446 = ₹74,113.8. **An illustration: it assumes the loss stays constant.** Labelled so on the slide |
| 7 chart and text | Repair now 0.00 MWh; in 6 hours 0.77 MWh, ₹1,894; tomorrow 1.51 MWh, ₹3,704; in 3 days 4.82 MWh, ₹11,795 | Capture | The cost-of-waiting table on the B-17 incident screen, 7 Oct 2026 (`07-cost-of-waiting.png` is that table). Drawn as a native chart and labelled "as captured": they move with site time |
| 7 | Lots: 200 MW at ₹2.44, 300 MW at ₹2.45 | Cited | SECI auction; held in `src/lib/money.ts` |
| 7 | Crews kept out above 40 °C | Repo | `CLAUDE.md` status box, P4: "The heat rule is 40 °C" |
| 7 notes | 178 kW short, 0.6 %; 9.66 of 903 MWh | Capture | the Analytics screen, 7 Oct 2026 |
| 8 | Dataset sizes and licences | Repo | `docs/dataset-provenance.md` |
| 8 | Library licences | Repo | each package's `package.json` under `node_modules`, read 7 Oct 2026 |

## Declared assumptions that appear on the deck

These are labelled as assumptions on the slides and in the product, and must stay
labelled if the deck is restyled:

- Hazard strengths in the sandbox (`HAZARD_SPEC` in `src/lib/hazard.ts`).
- Crew hours for each kind of repair (`src/lib/repair.ts`).
- The forecast band, ±5 % on irradiance now widening to ±15 % at 72 h.
- The 25 °C thermal span, the 65 °C threshold and the 5 h dose budget.
- The 30-day figure on slide 7, which assumes a constant loss.

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
- Patent and startup lines on slide 8 state only what the repository supports
  (nothing filed; the AGPL-3.0 constraint). Replace them with the team's actual
  intentions if there are any.
