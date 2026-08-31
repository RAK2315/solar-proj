# SURYA AGENT — Hackathon Selection Deck (10 Slides)

**Target**: CodeYourCult — Open Innovation, 5–6 Sep 2026
**Format**: 10 slides, 1920×1080, projector-ready
**Time**: 3–4 min presentation + 2 min demo video
**Tone**: "Shipping the Results. Building the Cult." — show, don't tell.

> **Status, 30 Aug 2026.** This deck was first written as a *plan*. The product is
> now built — 23 phases, 508 tests, six screens, a detector that runs live in the
> browser. Every figure below was read out of `data/`, `docs/` or a passing gate on
> 30 Aug; none is aspirational and none is typed from memory. Where a number is
> recomputed at runtime (the queue scores) that is said out loud.
>
> Image assets for every slide are in **`docs/deck-images/`**, numbered by slide.

---

## SLIDE 1 — TITLE / HOOK

### Visual
- Full-bleed: `01-hero-flight.png` — the drone on station over B-17, reticle locked
- Bottom-left: `SURYA AGENT` in IBM Plex Mono 700, 62px, `--sev-active` (#3FD4B8)
- Bottom-right: `BHADLA SOLAR PARK · RAJASTHAN · 500 MW BLOCK` — Plex Sans Condensed 600, 13px, uppercase

### Content
```
SURYA AGENT
From anomaly to action for utility-scale solar.

An autonomous agent that watches a 500 MW solar block, investigates
unexplained losses with real evidence (RGB + thermal), predicts when a
fault becomes unrecoverable, and hands an operator a ranked repair order
with a deadline on it.

Most systems tell operators something is wrong.
SURYA tells them what happened, why it matters, what happens if they wait,
and what to do about it — then waits for a human to say yes.
```

### Speaker Notes
- 15 seconds. Land the one-sentence thesis and move.
- "A 500 MW block of Bhadla" — real location, real scale, and it pre-empts "why only 120 arrays?"
- The human gate is not a limitation. It is the strongest claim in the product.

---

## SLIDE 2 — THE PROBLEM (WHY THIS MATTERS)

### Visual
- Left: `02-landing-gap.png` — the landing page's three derived stat cards
- Right: the same three figures blown up as 52px heroes on the ironbow ramp

### Content
```
India is installing solar faster than almost anyone.
Installed capacity is not delivered capacity.

A 500 MW block at 35 °C and 890 W/m² delivers 364 MW — 73% of nameplate.
That is physics (cell temperature 62.8 °C, γ = −0.0037 /°C), not a fault.
It is the baseline everything recoverable sits on top of.

When one string drops from 36.10 kW to 15.02 kW (−58.4%):
  SCADA sees the shortfall.
  SCADA does not see WHICH panel, WHY, or HOW URGENT.

So someone drives out and looks.
Median anomaly → diagnosis: days. Every day is measurable MWh.
```

### Speaker Notes
- Every number here comes from **our** PVWatts/NOCT model, not a quoted statistic. Say so.
- 364 MW, not 412: 412 would need a 4.2 °C ambient in Rajasthan at midday. The model refused to flatter us.
- The gap between "a string is down" and "array B-17, cracked cell in module B2-07, act before 14:00" **is** the product.

---

## SLIDE 3 — THE LOOP (ONE WORKFLOW, NOT A FEATURE LIST)

### Visual
- `03-loop.png` — horizontal 9-step flow, ironbow connectors
- Step 8 (HUMAN APPROVAL) in `--sev-critical` (#D94A3D) with a lock icon

### Content
```
One continuous decision chain. Every step answers a question.

1 TELEMETRY ANOMALY   Is something wrong?        → array drifts below what irradiance
                                                   and cell temperature say it should do
2 TRIAGE              What is wrong, how bad?    → INV-B −58.4%, string B-17-S3.
                                                   Can telemetry tell soiling from damage?
3 DISPATCH            It cannot. So act.         → DRONE 01 → B-17, real route, real flight
4 EVIDENCE CAPTURE    Acquire what was missing   → RGB + thermal, ON STATION
5 VISION              Where, and what?           → YOLOv8n localises the module;
                                                   classical CV resolves the hot band to cells
6 PROGNOSIS           What if we wait?           → 3.07 MWh at risk; deadline 14:00
                                                   from cumulative thermal dose
7 RANKED RECOMMENDATION  What first?             → B-17 #1 by 26.7× — a pure function
8 HUMAN APPROVAL      Who decides?               → A person. Always. Loudest control on screen.
9 WORK ORDER          Then what?                 → INC-B17 filed, array → SCHEDULED, queue re-ranks
```

### Speaker Notes
- Seven of the nine steps run unattended. The eighth is a human **on purpose**.
- The drone is not the product — it is how the agent gets evidence it cannot infer from telemetry.
- The deadline comes from a thermal-dose model, not a threshold. That is the whole difference from a dashboard.

---

## SLIDE 4 — WHAT IS REAL, AND HOW YOU CAN CHECK IT IN THE ROOM

> **This is the slide that wins or loses the judging. Give it the most time.**

### Visual
- `04-detector-verify.png` — the run ledger with a live inference and its millisecond count
- Beside it: `04-annotated.png` (`b17_rgb_annotated.jpg`) and `04-thermal.png` (`b17_thermal.png`)

### Content
```
THE DETECTOR RUNS LIVE, IN THIS BROWSER, IN FRONT OF YOU.

The exported YOLOv8n runs on onnxruntime-web over the frame the drone
captured a second ago. Press "Verify" and it re-runs the same weights over
the committed evidence photograph — whose answer, 0.9084, was recorded in
Colab before this UI existed. It comes back 0.91.

That single control proves every step between pixels and box — letterbox,
channel order, tensor layout, decode, suppression — in front of whoever
is asking. Nothing on this panel is cached. The millisecond count is the
measurement, and a run ledger shows each press as a new line.

FOUR MORE CLAIMS, EACH WITH THE FILE THAT BACKS IT

Physics is a published model
  NREL PVWatts + NOCT cell temperature. scripts/physics.py ↔ src/lib/physics.ts,
  golden-tested against each other. Math.random() is banned across src/.

The detector was trained, and the metric is the real one
  YOLOv8n on Roboflow CC BY 4.0 (921 images / 1067 boxes; 797 train, 82 valid,
  42 test). Reported PER CLASS on the held-out test split:
      Cracked 0.995 · Good 0.995 · Saglam 0.995 · BakimGereken 0.940
      Dirty — UNDEFINED, it has zero test instances. Not rounded to 0.0.
  Evidence frame is from that test split, so its 0.9084 is a genuine
  output on an image the model never saw.

The thermal band was measured, not authored
  Classical CV over a real Raptor Maps UAV frame (MIT). Four hot cells —
  (2,3) (2,4) (2,5) (2,6) — ΔT ≈ +2.8 °C, ONE contiguous cluster.
  It reads lower than a thermographer would quote because it is a cell MEAN
  under a declared 25 °C span, not a radiometric peak pixel. We say that on screen.

The agent writes prose ABOUT numbers it was not given
  /api/triage recomputes every fact server-side and cross-checks each numeric
  field before returning a word. Groq openai/gpt-oss-120b. It never produces
  a reading, and it has no say in the queue order at all.
```

### Speaker Notes
- **Do the Verify press live.** It is 300 ms and it is the most persuasive two seconds in the deck.
- Per-class matters: quoting the five-class mean would let `Saglam` (27 boxes) drag it down and would hide that `Dirty` has no test set at all.
- Invariant **I11** fails the build if detection confidence is exactly 0.84 — the placeholder this spec was written with. **I10** fails if anyone tunes the thermal span to a nicer ΔT.
- If asked "did you cheat the crop?": cropping changes *which pixels* the model is asked about, never what it says. Whole frame → `Saglam 0.94`, no cracked box. Cropped to the module → `Cracked 0.92`. That is a pipeline decision, and we publish both.

---

## SLIDE 5 — THE CONSOLE (LIVE AND DEMO, ONE CODEBASE)

### Visual
- `05-site-dark.png` and `05-site-light.png` side by side, with `05-cinematic.png` inset

### Content
```
Two modes. One component tree. One clock.

LIVE MODE (default — this is the product)
• The site is EVALUATED from the physics model at any site time
• 120 arrays across 3 zones; click any one to inspect it
• Three seeded faults — A-31 (−9.1%), B-17 (−41.7%), C-07 (−56.6%)
  plus operator fault injection on the Scenario screen
• Dispatch a drone, watch the 3D flight, approve or override the work
• Six screens behind an icon rail: Site · Drones · Missions · Repairs ·
  Analytics · Scenario
• Session persists across reload; light and dark both first-class

DEMO MODE (press M)
• The 90-second scripted incident, beat-perfect, asserted by 11 beat tests
• Console ↔ cinematic cuts at t=18 and t=74

ARCHITECTURE
• ONE rAF loop advances demoClock.t or session.siteSeconds. Nothing else has a timer.
• flightCue.ts is the seam: both modes emit FlightCue { t, targetId, cracked }
  and the 3D scene reads that, never a clock
• Seeking backwards works, because everything visible is a pure function of t
• The cinematic PiP renders a SECOND live <ConsoleRoot /> at scale(0.31) —
  the two halves are provably one system, not a screenshot
```

### Speaker Notes
- Live mode is the product. Demo mode is what live mode looks like when you drive it along a fixed path.
- Nothing is on rails. Offer a judge the mouse: pick any array, dispatch, watch, approve.

---

## SLIDE 6 — EVIDENCE FUSION (THE DIFFERENTIATOR)

### Visual
- `06-fusion.png` — five boxes left to right, ironbow tint, actual committed values
- `06-matrix.png` — the 5×7 anomaly matrix with the row-2 band lit

### Content
```
Five independent signals agree. That is what credibility looks like.

TELEMETRY          String B-17-S3: 15.02 / 36.10 kW = −58.4%
                   Array B-17: −41.7% (5 of 7 strings faulted — a different quantity,
                   and the console never conflates the two)
                   INV-B −58.4%  |  INV-A 0.0%  |  INV-C 0.0%

RGB VISION         YOLOv8n (yolov8n-solar-defect), held-out test split
                   Cracked, confidence 0.9084 — reproduced live in the browser
                   The box is the MODULE, not the fracture: every training example
                   labels the whole panel. Where on the module is thermal's job.

THERMAL            Classical CV, Raptor Maps InfraredSolarModules (MIT)
                   4 hot cells (2,3) (2,4) (2,5) (2,6), ΔT ≈ +2.8 °C, ONE cluster
                   Cell-mean under a declared 25 °C span, σ = 1.0

PHYSICS            Substrings are wired in ROWS, so a bypassed substring sitting in
                   reverse bias heats as a contiguous BAND — which is exactly the
                   shape the thermal frame shows. The mechanism predicts the measurement.

FORECAST           72 h clear, peak ambient 38.1 °C, irradiance to 966 W/m²
                   Projected cell temperature 67.5 °C crosses the 65 °C dose limit
                   → act before 14:00. Projected loss 3.07 MWh / 72 h.
```

### Speaker Notes
- The row-2 band was **not** invented to fit a story. It was measured first, and §8 of the spec was rewritten around it — the measurement leads and the narrative follows.
- This is why the prognosis produces a **deadline**: defect state + degradation mechanism + forecast = a cumulative dose crossing an hour.
- No threshold dashboard can produce that. It is the answer to "why an agent?".

---

## SLIDE 7 — DETERMINISTIC RANKING (EXPLAINABLE PRIORITY)

### Visual
- `07-repairs.png` — the Repairs screen, where each row prints its own arithmetic
- Callout: `#1 leads #2 by 26.7×`

### Content
```
The queue order is never LLM-decided. It is twelve lines of TypeScript.

priorityScore(task) = (lossMWhPerDay × SEVERITY_WEIGHT × urgency) ÷ accessCost

SEVERITY_WEIGHT   critical 3.0 · warning 1.5 · active 1.0 · info 0.25
urgency           = 1 + 24 / hoursUntilDeadline   (hyperbolic — a tightening
                    deadline outweighs a bigger but more distant loss)

TASK       LOSS/DAY  SEVERITY  DEADLINE  ACCESS  URGENCY   SCORE
INC-B17      1.01      3.0       3.9 h     1.0     7.11     21.53   ← #1
INC-A08      0.28      1.5        26 h     1.0     1.92      0.81
INC-C31      0.28      1.5        48 h     1.4     1.50      0.45
INC-A22      0.10      1.0        60 h     1.0     1.40      0.14

B-17 wins on all three factors: most energy bleeding, critical severity,
tightest deadline. The screen shows the arithmetic INSIDE each row —
1.01 × 3.00 × 7.11 ÷ 1.0 = 21.53 — so there is nothing left to explain.
```

### Speaker Notes
- This is the file you open when a judge asks how it prioritises: `src/lib/ranking.ts`.
- The table above is the committed demo queue. **In live mode the scores are recomputed** as the deadline closes, so the footer will read a higher urgency and score than this — same function, later hour. Say that before someone spots it.
- Invariant **I13**: B-17 must rank #1 by ≥1.5×. It currently leads by 26.7×.
- An LLM ranking that changes between two runs of the same demo is a ranking nobody can trust. That is why this one cannot.

---

## SLIDE 8 — BUILD GATES (THE NUMBERS CANNOT DRIFT)

### Visual
- `08-gates.png` — pipeline: `scripts/*.py` → JSON → validate:data → check:literals → 508 tests → build
- Red FAIL badge on any gate stops the deploy

### Content
```
prebuild = sync:artefacts → pack:telemetry → validate:data → check:literals
           → 508 tests → next build

validate:data          Parses every JSON against Zod (src/lib/types.ts is the sole
                       schema owner) and asserts 16 invariants, I1–I16:
                         I1  91 telemetry frames, monotonic t
                         I3  INV-B deviation −58.4% ±0.05
                         I4  B-17 array deviation −41.71% ±0.05
                         I6  Farm output 364 MW ±1
                         I7  Projected 72 h loss 3.07 MWh ±0.05
                         I9  actBefore 14:00 — the agent matches the forecast
                         I10 Cell grid: 4 cells, 1 cluster, ΔT within the measured band
                         I11 Detection confidence ≠ 0.84 (the spec's placeholder)
                         I12 Triage requiresPhysicalVerification = true
                         I13 Queue #1 = INC-B17, margin ≥ 1.5×
                       It PRINTS every headline number on each run.

check:literals         Greps src/ for hardcoded demo numbers and fails the build.
                       This is why the landing page cannot state a figure the
                       model does not produce.

508 tests / 31 files   Pure functions, integration, and beat-by-beat assertions
                       on the 90 seconds. They assert VALUES, never headings.

check:layout           jsdom has no layout, so a box smaller than its contents
                       renders identically to one that fits and every unit test
                       stays green. This walks six screens in both themes and
                       fails on any non-scrolling overflow. It was falsified
                       before it was trusted.

check:live             Loads the real console in a real browser and presses a
                       real key. 6/6 awake.
```

### Speaker Notes
- A drifted number fails the **build**, not the demo. That is the whole design.
- The invariants are tripwires against ourselves — I10 and I11 exist to stop us tuning a measurement toward a nicer slide.
- `check:layout` was written after the same class of bug shipped twice. Both gates were falsified (made to fail on the known-bad input) before being trusted.

---

## SLIDE 9 — TECH STACK (SHIPPABLE, NOT VAPOURWARE)

### Visual
- Two columns: RUNTIME (browser) vs BUILD-TIME (Python / Colab), green ticks on deployed items

### Content
```
RUNTIME (Vercel)
• Next.js 15 App Router + React 19 + TypeScript strict
• @react-three/fiber 9 + drei 10 + three 0.180 (the React 19 pairing — v8 does not work)
• onnxruntime-web — the trained detector, executing in the operator's browser
• Zustand — demo clock, live session, flight cue, detector, triage
• Tailwind v4 + IBM Plex in three roles + the ironbow ramp as CSS variables
• recharts · framer-motion · lucide-react · zod

BUILD-TIME (Python 3.10, scripts/ only — never at runtime)
• numpy / pandas — telemetry generation from the PV model
• ultralytics YOLOv8n — fine-tuned on a Colab T4
• PIL + numpy — thermal hotspot extraction
• matplotlib — ironbow thermal rendering

SHIPPED DETAIL WORTH ONE LINE
• telemetry.json is 1.6 MB and was going into the client bundle. A pack format
  stores the base once plus per-frame deltas: 1617 kB → 52 kB (3.2%), and it
  refuses to write unless unpacking reproduces the original BYTE FOR BYTE.

DEPLOYED
• Vercel static build; all /data, /models and /textures committed
• One env var: GROQ_API_KEY, server-side only
• Demo path makes ZERO network calls. Live mode adds exactly one: /api/triage.
```

### Speaker Notes
- No database, no auth, no accounts. There is no persistence requirement — a work order writes to Zustand and the session survives reload.
- Vision **training** ran on Colab; **inference** runs in the browser. No GPU at runtime.

---

## SLIDE 10 — WHAT IS BUILT, WHAT IS NOT, AND THE ASK

### Visual
- Large: `SHIP THE PRODUCT. BUILD THE CULT.`
- QR to `github.com/RAK2315/solar-proj`
- Three judge questions with one-line answers

### Content
```
This is not a concept. 23 phases, 508 tests, six screens, one trained model
that runs in front of you.

BUILT AND WORKING
✅ Live mode — 120 arrays, three faults, operator fault injection
✅ Six screens behind a working rail; light and dark; session persists
✅ Drone dispatch → 3D flight → on-station capture → detection → approval
✅ The detector runs LIVE in the browser and reproduces its committed 0.91
✅ Deterministic ranking with the arithmetic printed inside each row
✅ Runtime agent triage, cross-checked server-side before a word is returned
✅ Five gates, sixteen invariants, and two of them written to catch US

HONEST ABOUT WHAT IS NOT
◻ Two of 120 arrays carry photographed module textures — deliberately, so the
  difference is visible. The instanced field shares one material.
◻ The map zooms but does not pan.
◻ Inference time has been measured only through a software rasteriser. The
  console prints the real figure; we will read it on the demo machine.

JUDGE QUESTIONS WE ARE READY FOR
"Is any of this real?"            → Press Verify. Then open scripts/physics.py.
"Why an agent, not a dashboard?"  → Prognosis. Defect + mechanism + forecast = a
                                     deadline. No threshold produces an hour.
"Would you let it run unsupervised?" → No. That is what the approval gate is for.
"Did the LLM make up these numbers?" → It cannot. It is handed an array id; the
                                     route recomputes the facts and cross-checks
                                     every field before returning.

REPO: github.com/RAK2315/solar-proj
```

### Speaker Notes
- End on the thesis: "From anomaly to action."
- The honest-about-what-is-not block is not a weakness. Volunteering the limits is what makes the rest of the deck believable — and it pre-empts the one question that would otherwise land badly.

---

## IMAGE / ASSET CHECKLIST

All assets live in **`docs/deck-images/`**, numbered by slide. Regenerate the
console captures with `npm run demo` running, then `node scripts/shoot.mjs 1920 1080`.

| Slide | File | Source |
|-------|------|--------|
| 1 | `01-hero-flight.png` | Cinematic, drone on station over B-17 |
| 2 | `02-landing-gap.png` | The landing page's three derived stat cards |
| 3 | `03-loop.png` | **To draw** — 9-step flow. Excalidraw/Figma, ironbow connectors |
| 4 | `04-detector-verify.png` | The run ledger mid-verify |
| 4 | `04-annotated.png` | `data/evidence/b17_rgb_annotated.jpg` — the real box |
| 4 | `04-thermal.png` | `data/evidence/b17_thermal.png` — ironbow render |
| 4 | `04-training-curves.png` | `docs/training/training_curves.png` |
| 5 | `05-site-dark.png` · `05-site-light.png` | Site screen, both themes |
| 5 | `05-cinematic.png` | Cinematic with the PiP console visible |
| 6 | `06-fusion.png` | **To draw** — five signal boxes, left to right |
| 6 | `06-matrix.png` | The incident file's 5×7 anomaly matrix |
| 7 | `07-repairs.png` | Repairs screen, arithmetic visible in each row |
| 8 | `08-gates.png` | **To draw** — pipeline diagram, or paste `validate:data` output |
| 9 | — | Text only |
| 10 | `10-qr.png` | `qrenco.de/github.com/RAK2315/solar-proj` |

Three diagrams still need drawing: slides 3, 6 and 8. Everything else is captured.

---

## SPEAKER TIMING — 3 MINUTES 45

| Time | Slide | Beat |
|------|-------|------|
| 0:00–0:15 | 1 | Thesis. "Most systems tell you something is wrong. SURYA tells you what, why, what if, and what to do — then waits for yes." |
| 0:15–0:45 | 2 | Problem. 364 MW delivered of 500. Diagnosis takes days. Every day is MWh. |
| 0:45–1:15 | 3 | The loop. Nine steps, one decision chain. The drone is evidence acquisition. |
| 1:15–2:00 | 4 | **What is real — press Verify live.** Longest beat on the deck. Earn it. |
| 2:00–2:25 | 5 | The console. Live and demo, one clock, PiP proves unity. Offer them the mouse. |
| 2:25–2:55 | 6 | Evidence fusion. Five signals agree, and the mechanism predicted the measurement. |
| 2:55–3:15 | 7 | Ranking. Twelve lines, deterministic, 26.7× margin, arithmetic on screen. |
| 3:15–3:30 | 8 | Gates. Numbers cannot drift — the build fails before the demo does. |
| 3:30–3:40 | 9 | Stack. Shippable. Zero network calls in the demo path. |
| 3:40–3:45 | 10 | Ask. Built, not proposed. |

---

## RECORDING NOTES (FOR THE DEMO VIDEO)

- **Record at 1920×1080 if you can, but the console no longer depends on it.**
  Below the design size the whole thing is CSS-scaled to fit and above it, it scales
  up; the 3D canvas now fills its frame at every viewport (`check:layout` measures it).
  1920×1080 is still the sharpest capture, since nothing is being resampled.
- Use `npm run demo` — a production build served on :3000. **Never `npm run dev`**:
  measured dead on 1 load in 10, because the unminified scene chunk truncates.
- Demo script: 90 seconds exactly, the beats in `CLAUDE.md` §2.
- Live walkthrough, ~60 s: click an array, dispatch, watch the flight, press Verify,
  approve the work order, show the queue re-rank.
- Voiceover: terse and operator-facing. "B-17 critical. 15.02 against an expected
  36.10 kW. Dispatching DRONE 01."
- No music. Let the typewriter and the feed carry it.
