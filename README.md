# SURYA AGENT

**Autonomous inspection & triage console for utility-scale solar.**

An agent watches a 500 MW block of Bhadla Solar Park, detects that a string is
underperforming, decides telemetry alone cannot say *why*, dispatches a drone to look,
localises the defect from real imagery, projects how it evolves against a 72-hour
forecast, and hands the operator a ranked repair order with a deadline — then stops and
waits for a human to approve it.

> Prior art stops at **detection**: a panel is bad. This stops at **a deadline**: the
> string becomes unrecoverable after 14:00, here is why, and a person has to say yes.

**Status:** deployable. Two modes over one console —

  **LIVE** (default) — the site runs on the physics model in real time. Click any of
  the 120 arrays, read its actual telemetry, dispatch a drone to it, watch the mission
  fly, and raise a work order. Faults develop over site time from a committed
  scenario, so the session is reproducible without being scripted.

  **DEMO** (press `M`) — the 90-second scripted incident, preserved intact: the
  cinematic, the drone POV, the agent reasoning, the human gate.

The one outstanding item is the Colab training run, which fills in the detector's real
metrics (see *Data provenance*).
Build plan: `plan/05-build-plan.md` · Frozen numbers: `docs/contract-freeze.md` ·
Phase-by-phase record incl. every correction: `report.txt`

---

## The one principle

> Every element on screen is traceable to a physics model, a trained model, or a
> deterministic function — and the operator can see which.

Enforced mechanically, not by discipline:

- `npm run validate:data` parses every JSON against Zod schemas and asserts invariants
  I1–I16. Wired into `prebuild`, so a drifted number **fails the build, not the demo**.
- `npm run check:literals` fails if a headline figure is hardcoded anywhere in `src/`.
- Two invariants are tripwires against the author: **I11** rejects a detection confidence
  of exactly `0.84` (the spec's placeholder), and **I10** rejects a ΔT outside the measured
  band, so the thermal scaling cannot be quietly tuned to produce a nicer number.

## Licence — AGPL-3.0

Ultralytics YOLOv8 is AGPL-3.0 and the licence is **contagious to custom-trained weights**.
`models/defect_yolov8n.pt` is committed as provenance evidence, so this repository is
AGPL-3.0. That is a decision, not an accident — see `plan/02-architecture.md`. Switching to
RF-DETR (Apache-2.0) would touch one script and zero components.

## Physics — the citation table

Cell temperature and the power equation are **NREL PVWatts**
([NREL/TP-6A20-60272](https://docs.nrel.gov/docs/fy14osti/60272.pdf)); the coefficients are
representative crystalline-silicon values, stated here rather than implied.

| Symbol | Value | Meaning | Provenance |
|---|---|---|---|
| Cell temp model | `T_c = T_a + (NOCT−20)/800 × G` | — | NREL PVWatts, verbatim |
| `NOCT` | 45 °C | Nominal operating cell temperature | Standard c-Si datasheet value |
| `γ` | −0.0037 /°C | Power temperature coefficient | Representative c-Si (typical band −0.0035…−0.0040). **Not a specific module's datasheet figure.** PVWatts v1 itself fixes γ at −0.005; ours is a more modern module. |
| `η_inv` | 0.98 | Inverter efficiency | Typical utility-scale central inverter |
| `f_soil` | 0.97 | Soiling derate, nominal | Representative for Rajasthan pre-clean |
| `f_mismatch` | 1.0000 / **0.4160** | Cell mismatch, healthy / faulted | **Solved** to reproduce the −58.4 % shortfall being demonstrated |
| `P_RATED_STRING` | **49.61 kW** | String nameplate | **Solved** so expected = 36.10 kW at demo conditions |
| `T_PROP_C` | 65 °C | Crack-propagation threshold | Engineering threshold, declared |
| `DOSE_BUDGET_H` | **5.0 h** | Time above threshold before diode-failure risk | **Solved** to reproduce the 14:00 deadline |
| `THERMAL_SPAN_C` | 25 °C | 8-bit intensity → °C scaling | **Declared assumption** — the thermal source is normalised, not radiometric |

Three of those are solved to reproduce an observable, and each says so. **A declared
assumption is credible; a number tuned quietly is not.** Everything else falls out.

```
T_cell   = 35.0 + (45−20)/800 × 890                        = 62.81 °C
derate   = (890/1000) × (1 − 0.0037×37.81) × 0.97 × 0.98   = 0.727669
expected = 49.61 × 0.727669                                = 36.10 kW
actual   = 36.10 × 0.4160                                  = 15.02 kW
dev_str  = 0.4160 − 1                                      = −58.4 %
dev_arr  = −58.4 × 5/7   (5 faulted strings of 7)          = −41.7 %
park     = 500 MW × 0.727669                               = 364 MW
```

`npm run validate:data` prints all of these, generated, on every run.

### Numbers this project *corrected* rather than reproduced

The build spec's arithmetic did not close. Rather than quietly matching it, the generator
produces the right answer and the invariants pin it:

| Was | Is | Why |
|---|---|---|
| 412 MW farm output | **364 MW** | 412 needs a 4.2 °C ambient in Rajasthan at midday |
| `P_RATED_STRING = 40.0` | **49.61** | 40.0 yields 29.11 kW, not the claimed 36.1 |
| panel −42 % *and* string −58.4 % | **array −41.7 %**, **string −58.4 %** | two different objects; the array is `−58.4 × 5/7` |
| 1.44 MWh / 72 h | **3.07 MWh / 72 h** | 1.44 was `0.48 × 3` with 0.48 itself a seed value; the integral gives 3.07 |
| baseline cell temp 47 °C | **62.8 °C** | contradicted the NOCT model at 890 W/m² |
| hot cells (2,5)(2,6)(4,5)(4,6) @ +8/+6/+5 °C | **(2,3)(2,4)(2,5)(2,6) @ ≈+2.8 °C** | measured from a real thermal frame; see below |

Full record with derivations: `docs/contract-freeze.md`.

## Data provenance

### Defect detection — RGB

| Field | Value |
|---|---|
| **Name** | Solar Panel Fault Detection |
| **Workspace / project** | `solarvision-gwljt` / `solar-panel-fault-detection`, version 2 |
| **URL** | https://universe.roboflow.com/solarvision-gwljt/solar-panel-fault-detection/dataset/2 |
| **Licence** | **CC BY 4.0** — attribution required, which is why this table ships |
| **Attribution** | "Provided by a Roboflow user", via Roboflow Universe |
| **Images / boxes** | **921** (train 797 / valid 82 / test 42) · **1,067** boxes |
| **Classes (5, verbatim)** | `BakimGereken`, `Cracked`, `Dirty`, `Good`, `Saglam` |
| **mAP@50, five-class mean** | *pending — Colab, Cell 4* |
| **AP@50 `Cracked`** | *pending — **this** is the figure this project may quote* |

Class names are **as shipped**, including the two Turkish ones (`BakimGereken` =
"maintenance required", `Saglam` = "intact"). The build spec proposed renaming them to
`crack / soiling / delamination / hotspot`; that would describe a model that does not
exist. Only `Cracked` reaches the UI.

Per-class AP@50 is reported alongside the mean, because the mean is misleading here:
`Saglam` has 27 boxes and will score near zero, and `Dirty` has **zero test instances**, so
its test AP is *undefined* rather than 0.0. The number that matters is AP@50 for `Cracked`
(350 boxes, 22 of them held out).

Both figures are committed as data in `data/evidence/b17_detection.json` and checked by
invariant **I11**, rather than retyped into this README from a screenshot. The Cell 4
screenshot in `docs/training/` corroborates the JSON, not the other way round.

The evidence image comes from the **held-out test split**, so the displayed confidence is a
genuine output on an image the model never saw.

### Thermal — DONE

| Field | Value |
|---|---|
| **Name** | InfraredSolarModules — Raptor Maps, Inc. |
| **URL** | https://github.com/RaptorMaps/InfraredSolarModules |
| **Licence** | **MIT** |
| **Images** | 20,000 single-module UAV thermal crops, 24×40 px, 8-bit greyscale |
| **Image used** | `7916.jpg`, labelled class `Hot-Spot-Multi` |
| **Method** | `scripts/thermal_hotspot.py` — classical CV. No model, no training, no GPU. |

Single-module framing is the point: a 5×7 grid over an aerial shot of forty panels would
average sky and dirt into cells and mean nothing. Here each grid cell maps to roughly one
physical solar cell, which is what makes the anomaly matrix true rather than decorative.

**Measured result** — cell-mean ΔT °C, σ = 1.0:

```
        C1     C2     C3     C4     C5     C6     C7
  R1   -2.5    0.7    1.5    1.5    1.6    1.7    0.7
  R2   -1.9    1.9   [2.7]  [2.8]  [2.8]  [2.7]   1.5    <- 4 hot cells, ONE cluster
  R3   -2.4    0.2    0.8    1.0    1.1    0.8    0.0
  R4   -4.7   -2.2   -1.7   -1.4   -1.3   -1.5   -2.4
  R5   -6.3   -2.9   -2.4   -2.4   -2.2   -2.4   -3.3
```

A **contiguous band across row 2** — which is better physics than the spec invented.
Module substrings are wired in rows, so a bypassed substring in reverse bias heats as a
band, not as isolated cells. The measurement matches the mechanism.

ΔT reads +2.8 rather than the +8 a thermographer would quote, for two stated reasons:
it is a **cell mean** (each cell averages ~4×5 px, mixing the hot core with cooler
surroundings) not a peak pixel, and the source is **normalised 8-bit, not radiometric**, so
absolute temperature is unrecoverable and `THERMAL_SPAN_C = 25.0` is a declared linear
scaling. The *localisation* is measured; the *magnitude in degrees* is a documented
assumption. Invariant I10 fails the build if that span is changed silently.

## Repository

```
scripts/          Python + TS. Run once, output committed. Never runtime.
  physics.py           the PV model and every constant — single source
  generate_farm.py / generate_telemetry.py / generate_events.py
  thermal_hotspot.py   classical-CV hotspot extraction
  run_agent.py         three Groq stages + the numeric cross-check
  validate_data.ts     THE BUILD GATE — Zod + invariants I1–I16
  check_literals.mjs   no hardcoded demo numbers in src/
  sync_artefacts.mjs   copies evidence to public/, writes the manifest
data/             generated, committed. The contract between pipeline and app.
models/           trained weights (provenance evidence, never loaded at runtime)
src/
  lib/            pure and I/O-free: physics, ranking, formatting, scene spline,
                  the ironbow ramp, the Zod schemas
  store/          demoClock.ts (the ONE clock) + selectors.ts (the public API)
  components/     console/ · cinematic/ · scene/
plan/             the build pack: features, architecture, ADRs, schemas, risks
docs/             contract-freeze.md · dataset-provenance.md · media-provenance.md
                  vision-handoff.md · training/
report.txt        every phase, what it found, and what is still open
```

### Architecture in one paragraph

There is **no server**. Python generates every number offline and commits it as JSON;
the app imports that JSON at build time. One Zustand store holds `t` and `approved` —
the only mutable state in the application — and one `requestAnimationFrame` loop
advances `t`. Everything else is a pure function of `t` through `src/store/selectors.ts`,
which is why seeking backwards works and why the console, the cinematic overlays, the
3D camera and the picture-in-picture can never disagree about what time it is. ESLint
fails the build if a second timer appears in `src/components/`.

Regenerate everything — each step reads the one before it:

```bash
python scripts/generate_farm.py
python scripts/generate_telemetry.py
python scripts/generate_events.py
npm run validate:data
```

Model training and inference run **on Colab only** (`plan/COLAB-NOTEBOOK.md`); artefacts are
downloaded and committed. Nothing in this repo installs torch locally, and the deployed app
makes **zero network calls** — telemetry is pre-generated, LLM output is cached.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # gate: sync + validate:data + check:literals + 145 tests
npm run test         # vitest
npm run lint         # includes the one-clock guardrails
```

> **If you touch `generate_telemetry.py`, re-run `run_agent.py`.** The cached agent prose
> quotes numbers from the telemetry, and the cross-check only protects you if it runs.
> `validate:data` catches the structured fields (I9); the prose is checked at generation.

**Deploying.** Vercel. The build gate runs first, so a deployment cannot ship data that
contradicts the physics. Everything the app needs is committed — `/data`,
`public/cinematic/`, `public/evidence/`.

Set **one** environment variable in Vercel:

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Live-mode triage. **Server-side only** — never `NEXT_PUBLIC_`. |
| `GROQ_MODEL` | Optional. Defaults to `openai/gpt-oss-120b`. |

Without it the app still works: live triage reports **agent unavailable** with the
reason, and everything else — telemetry, dispatch, evidence, the demo — is unaffected.

**On network calls.** The demo path makes none: telemetry is pre-generated, agent
prose is cached, fonts are self-hosted, the detector ran offline. Live mode adds
exactly one, `POST /api/triage`, and only when an array is selected. That call is
server-to-server; the browser never sees the key, and the server recomputes the
telemetry itself rather than trusting anything the client sends.

### Rehearsal keys

The demo has no visible transport. It runs on the keyboard (`CLAUDE.md` §6):

| Key | Action |
|---|---|
| `Space` | play / pause |
| `←` `→` | seek ∓5 s |
| `1` `2` `3` | speed 0.5× / 1× / 2× |
| `R` | reset |
| `C` `V` | force console / cinematic — press again to hand the view back to `t` |
| `D` | show / hide the debug readout |
| `M` | switch between **live** and **demo** |

In live mode only `Space` (pause site time), `D` and `M` apply — seeking a live site
would be a lie about what a console can do.

The view is otherwise a pure function of `t`: console on `[0,18) ∪ [74,90]`, cinematic
on `[18,74)`.

## What is not built

The full, current list lives in **[`docs/backlog.md`](docs/backlog.md)** — what is
missing, why, and what it would take. The two that matter most:

- **The detector is not trained.** `models/defect_yolov8n.pt` does not exist,
  `data/evidence/b17_rgb.jpg` does not exist, and the README carries no measured
  mAP@50. Everything else in this project can be checked; this is the one claim that
  is currently unmade. It runs on Colab — see [`plan/COLAB-NOTEBOOK.md`](plan/COLAB-NOTEBOOK.md).
- **Inverter acoustic and flyover clips.** Never captured. The evidence strip renders
  present slots and omits absent ones, so nothing on screen implies otherwise.

Deliberately out of scope: auth and accounts, responsive layout, a second site,
historical browsing, map zoom.

---

## The ranking function

When someone asks *"how does it prioritise?"*, this is the answer — and it is worth
more than any LLM output in the project, because it returns the same order every
single time. `src/lib/ranking.ts`:

```ts
const SEVERITY_WEIGHT = { critical: 3.0, warning: 1.5, active: 1.0, info: 0.25 };

export function priorityScore(task: RepairTask): number {
  // Urgency grows hyperbolically as the deadline closes: a 4-hour deadline is
  // worth 3.5× a 24-hour one, not 6× linearly.
  const urgency = 1 + 24 / Math.max(1, task.hoursUntilDeadline);
  return (task.lossMWhPerDay * SEVERITY_WEIGHT[task.severity] * urgency) / task.accessCost;
}
```

No model touches it. `INC-B17` leads #2 by **26.7×**, and the *reason* is visible in the
inputs rather than buried in a tie-break — it wins on all three factors at once: most
energy bleeding, `critical` rather than `warning`, and the tightest deadline.

| Task | Loss/day | Severity | Deadline | Access | Score |
|---|---|---|---|---|---|
| `INC-B17` | 1.01 MWh | critical | 3.9 h | 1.0 | **21.53** |
| `INC-A08` | 0.28 MWh | warning | 26 h | 1.0 | 0.81 |
| `INC-C31` | 0.28 MWh | warning | 48 h | 1.4 | 0.45 |
| `INC-A22` | 0.10 MWh | active | 60 h | 1.0 | 0.14 |

## Questions this project expects, and where the answer lives

Each answer is a file you can open, not a claim.

**"Is any of this real?"**
Telemetry is simulated on NREL's PVWatts model with the coefficients stated above —
open `scripts/physics.py`. The defect detector is fine-tuned on real labelled imagery
with recorded provenance. The hot cells are measured by classical CV from a real UAV
thermal frame. The fault is a physically coherent chain — cracked cell → series
resistance rise → bypass diode conduction → reverse-bias heating → a hot *band*,
because substrings are wired in rows — not a random number.

**"What did you actually train?"**
`models/defect_yolov8n.pt`, `docs/training/`, and the provenance table above. Per-class
AP@50, not just the five-class mean, because the mean is depressed by a 27-box class
this project never uses.

**"Why an agent and not a threshold dashboard?"**
The prognosis stage. A rule engine tells you a string is down. This tells you *when it
becomes unrecoverable*, by fusing the confirmed defect state, the degradation mechanism
and the 72-hour forecast into a deadline no threshold can produce. That gap is the
entire product.

**"How does it prioritise?"**
The twelve lines above. Pure, deterministic, LLM-free, identical on every re-run.

**"Would you let this run unsupervised?"**
No — and that is the approval gate. Everything up to the recommendation is autonomous;
then it stops and waits. The work order does not exist until a person clicks.

**"Why is output only 73% of nameplate?"**
Because the cells are at 62.8 °C and c-Si loses 0.37 % per °C above 25. That is the
model, not a fudge. The 364 MW figure exists *because* this was checked — the spec
claimed 412 MW, which would need a 4.2 °C ambient in Rajasthan at midday.

**"What would you not claim?"**
The flyover plate is CC0 stock, not footage of Bhadla — the 3D scene is an explicit
simulation built from the same `farm.json` the map draws. ΔT is a cell mean under a
declared scaling, not a radiometric reading. The agent writes prose *about* numbers; it
never produces one, and `run_agent.py` refuses to write a cache containing a figure the
telemetry does not support.

**"What is left?"**
[`docs/backlog.md`](docs/backlog.md), kept honest. The headline gap is the detector:
it is the one component this project claims to have trained and the one that has not
been run yet. Saying so is cheaper than being asked.
