# SURYA AGENT — Selection Deck (9 slides)

**For**: CodeYourCult — Open Innovation, 5–6 Sep 2026
**Upload**: PDF or PPTX, hard limit 10 slides. This deck is 9.
**Format**: 1920×1080, projector-ready.
**Time**: about 3½ minutes of talking, plus the demo video.

> **How to use this file.** Each slide below has the exact text to put on it, the
> image to put beside that text, and notes for whoever is speaking. Every number
> was read out of `data/`, `docs/` or a passing build gate on 31 Aug 2026. None of
> them is aspirational.
>
> **Images are screenshots and graphs only.** No slide has a picture of words on
> it — if something is text, it is set as text so it stays sharp and editable.
> Every file named here exists in `docs/deck-images/`.
>
> The brief asks for problem, solution, implementation, stack, impact and team.
> Slides 2, 3, 7, 8 and 9 cover those in that order, and slide 9 names the team.

---

## SLIDE 1 — TITLE

### Image
`01-hero-flight.png`, full bleed. The drone on station over array B-17, the
detector's own box drawn on the module it found, the live console running in the
corner.

### Text on the slide
```
SURYA AGENT
From anomaly to action for utility-scale solar.

An agent that watches a 500 MW solar block, spots an array losing output,
sends a drone to find out why, works out how long the site can wait,
and hands the operator a ranked repair order — then stops and asks a person
to approve it.

Most monitoring tells an operator that something is wrong.
This tells them what is wrong, why it matters, what it costs to wait,
and what to do first.

Modelled on a 500 MW block of Bhadla Solar Park, Rajasthan.
```

### Speaker notes
- Fifteen seconds. Say the one-line thesis and move on.
- "A 500 MW block of Bhadla" is accurate and it heads off "why only 120 arrays?"
- The approval step is not a limitation. It is the strongest thing on the slide.

---

## SLIDE 2 — THE PROBLEM

### Image
`02-landing-gap.png` — the three figures the model produces: delivered share,
array shortfall, and energy lost per day.

### Text on the slide
```
Installed capacity is not delivered capacity.

At 35 °C and 890 W/m², a 500 MW block delivers 364 MW.
That is 73% of nameplate, and it is not a fault — the cells are at 62.8 °C
and silicon loses about 0.37% of its output per degree. It is the baseline
that everything recoverable sits on top of.

Now one string drops from 36.10 kW to 15.02 kW. A 58% shortfall.

  The monitoring system sees that the output fell.
  It does not see WHICH panel, WHY, or HOW URGENT.

So somebody drives out and looks. From alarm to diagnosis is measured in
days, and every one of those days is measurable lost energy.

The gap between "a string is down" and "array B-17, cracked cell in module
B2-07, act before 14:00" is the entire product.
```

### Speaker notes
- Every number here is produced by **our own** model of how a panel behaves — not quoted from an article. Say that out loud; it is the difference between a claim and a measurement.
- 364 MW, not 412: 412 MW would need a 4.2 °C afternoon in Rajasthan. The model refused to flatter us and we kept its answer.

---

## SLIDE 3 — WHAT IT DOES, END TO END

### Image
`03-incident-chain.png` — the incident file open on B-17, showing the reasoning
as the product itself renders it: each step badged with whether its answer is a
measurement, a model projection, a calculation, or a person's decision.

### Text on the slide
```
One chain of reasoning, not a list of features. Every step answers a question,
and every step says where its answer came from.

  1  Something is wrong          An array falls below what the sunlight and
                                 the cell temperature say it should produce.

  2  What is wrong, how bad      String B-17-S3 is 58.4% down. The array is
                                 41.7% down. Can telemetry tell dirt from
                                 damage? No — they look identical from here.

  3  So go and look              Drone 01 is dispatched to B-17. Real route,
                                 real flight, real time on station.

  4  Capture what was missing    Photographs and a thermal image of the module.

  5  Read the evidence           The trained detector finds the damaged module.
                                 Image processing resolves the heat to four
                                 individual cells in row 2.

  6  What if we wait             Three days of clear sky at 38 °C keeps that
                                 cracked cell above its safe temperature.
                                 3.07 MWh at risk. Act before 14:00.

  7  What first                  B-17 ranks first, ahead of the next job by 26×,
                                 by a fixed formula anyone can check.

  8  Who decides                 A person. Always. It is the loudest control
                                 on the screen and nothing moves without it.

  9  Then what                   Work order INC-B17 is filed, the array turns
                                 amber, and the queue re-ranks itself.
```

### Speaker notes
- Seven of the nine steps run unattended. The eighth is a human on purpose.
- The drone is not the product. It is how the agent gets evidence it cannot infer.
- Step 6 is the one a threshold alarm can never do: it produces an **hour**, not a flag.

---

## SLIDE 4 — THE PART YOU CAN CHECK IN THE ROOM

> **Give this slide the most time. It is the one that wins or loses the judging.**

### Images
`04-detector-verify.png` (the run ledger, showing live inferences and how many
milliseconds each took), with `04-annotated.jpg` (the model's box on the evidence
photograph) and `04-thermal.png` (the thermal image) beside it.

### Text on the slide
```
THE TRAINED MODEL RUNS LIVE, IN THE BROWSER, IN FRONT OF YOU.

The detector we trained is loaded into the page and run on the frame the
drone captured a second earlier. There is a button marked Verify: press it
and the same weights re-run on the committed evidence photograph, whose
answer — 0.9084 — was written down in a Colab notebook before this
interface existed. It comes back 0.91.

That one press proves every step between the pixels and the box. Nothing on
that panel is cached; the millisecond count is the proof it just happened,
and a ledger records each press as a new line.

WHAT WAS ACTUALLY TRAINED, AND ON WHAT

  YOLOv8n, fine-tuned on a public Roboflow dataset (CC BY 4.0):
  921 images, 1,067 labelled boxes — 797 train / 82 validate / 42 test.

  Accuracy on the held-out test split, reported per class, not averaged:
      Cracked 0.995 · Good 0.995 · Saglam 0.995 · BakimGereken 0.940
      Dirty — undefined. It has zero test images. We do not print it as 0.

  The evidence photograph comes from that held-out split, so its 0.9084 is
  a genuine result on an image the model had never seen.

THE THERMAL BAND WAS MEASURED, NOT DRAWN

  Image processing over a real drone thermal frame (Raptor Maps, MIT licence)
  found four hot cells — (2,3) (2,4) (2,5) (2,6) — about 2.8 °C above the rest
  of the panel, in one connected band.

  It reads lower than a thermographer would quote because it is an average
  across each cell under a stated temperature scale, not a peak pixel.
  The console says so on screen rather than quietly rounding up.
```

### Speaker notes
- **Press Verify live.** It takes 300 ms and it is the most persuasive two seconds available.
- Per-class matters: a five-class average would hide that one class has no test images at all.
- A build check fails if the detection confidence is ever exactly 0.84 — the placeholder the original spec was written with. Another fails if anyone re-tunes the thermal scale toward a nicer number. Those checks exist to catch **us**.
- If asked whether cropping to the module is cheating: cropping changes which pixels the model is asked about, never what it says about them. Whole frame → no cracked box. Cropped to the module → Cracked 0.92. We publish both.

---

## SLIDE 5 — FIVE SIGNALS THAT AGREE

### Image
`06-matrix.png` — the 5×7 grid of the panel's own cells, with the four hot ones
lit and the measured temperatures listed underneath.

### Text on the slide
```
One reading is a number. Five independent readings that agree is a diagnosis.

TELEMETRY     String B-17-S3: 15.02 kW against an expected 36.10 kW — 58.4% down.
              The array as a whole is 41.7% down, because 5 of its 7 strings are
              affected. Two different quantities; the console never mixes them.
              Inverter B is 58.4% down while A and C are at 0.0%.

PHOTOGRAPH    The trained detector finds the damaged module at 0.91 confidence.
              The box covers the whole panel, not the fracture, because every
              training example labels whole panels. Where on the panel is the
              thermal image's job, and we say so on screen.

THERMAL       Four hot cells in a single connected band across row 2,
              about 2.8 °C above the rest of the panel.

PHYSICS       Cells are wired in rows. A bypassed row sitting in reverse bias
              heats as a continuous band — exactly the shape the thermal image
              shows. The mechanism predicted the measurement.

FORECAST      72 hours of clear sky, peaking at 38.1 °C. The projected cell
              temperature crosses the safe limit at 14:00. Waiting costs
              3.07 MWh over those three days.
```

### Speaker notes
- The row-2 band was measured **first**, and the written specification was rewritten around it. The measurement led; the story followed. That ordering is worth stating.
- This is why the system can produce a deadline rather than an alert. Defect + mechanism + forecast = an hour.

---

## SLIDE 6 — HOW IT DECIDES WHAT TO FIX FIRST

### Image
`07-repairs.png` — the repair queue, where every row prints its own arithmetic.

### Text on the slide
```
The order of the queue is never decided by a language model.
It is one short formula, and the screen shows its working.

  score = (energy lost per day × severity weight × urgency) ÷ access cost

  severity weight   critical 3.0 · warning 1.5 · active 1.0 · info 0.25
  urgency           1 + 24 / hours until the deadline
                    A closing deadline outweighs a bigger but more distant loss.

  JOB        LOSS/DAY  SEVERITY  DEADLINE  ACCESS  URGENCY   SCORE
  INC-B17      1.01      3.0       3.9 h     1.0     7.11     21.53   ← first
  INC-A08      0.28      1.5        26 h     1.0     1.92      0.81
  INC-C31      0.28      1.5        48 h     1.4     1.50      0.45
  INC-A22      0.10      1.0        60 h     1.0     1.40      0.14

  B-17 wins on all three counts: most energy bleeding away, most severe,
  tightest deadline. The row on screen prints 1.01 × 3.00 × 7.11 ÷ 1.0 = 21.53,
  so there is nothing left to take on trust.
```

### Speaker notes
- This is the file to open if a judge asks how it prioritises: `src/lib/ranking.ts`.
- In live mode these scores are recomputed as the deadline closes, so the number on screen will be higher than the table. Same formula, later hour — say it before somebody spots it.
- A ranking that changes between two runs of the same demo is a ranking nobody can trust. This one cannot change.

---

## SLIDE 7 — HOW IT IS BUILT

### Images
`05-site-dark.png` and `05-site-light.png` side by side, with `05-cinematic.png`
inset — the same product in both themes, and the drone's view of it.

### Text on the slide
```
120 arrays. Six screens. Two modes that share one codebase.

LIVE MODE — this is the product
• The whole site is calculated from the physics model at any time of day
• Click any of the 120 arrays to inspect it
• Three faults are seeded — A-31 (−9.1%), B-17 (−41.7%), C-07 (−56.6%) —
  and an operator can inject more from the Scenario screen
• Dispatch a drone, watch the flight in 3D, approve or override the work
• Six screens: Site · Drones · Missions · Repairs · Analytics · Scenario
• The session survives a page reload. Light and dark are both first class.

DEMO MODE — press M
• The same components replaying a 90-second scripted incident, second by second

THREE RULES THE CODE IS HELD TO
• No number is ever invented in the browser. Random numbers are banned outright;
  every figure on screen traces back to the physics model or a generated file.
• There is exactly one clock. Nothing else has a timer, which is why you can
  scrub the demo backwards and every screen is correct rather than stuck.
• Evidence belongs to the array it was captured from. We hold real imagery for
  one array, and no other array is allowed to display it.

The picture-in-picture console inside the drone view is not a screenshot.
It is a second live copy of the real console, running from the same clock.
```

### Speaker notes
- Live mode is the product. Demo mode is what live mode looks like when you drive it along a fixed path.
- Nothing is on rails — offer a judge the mouse and let them pick an array.

---

## SLIDE 8 — TECHNOLOGY, AND WHY THE NUMBERS CANNOT DRIFT

### Image
`08-rehearsal.png` — the Rehearsal screen. Put a fault on any array on purpose and
the physics works out the rest; everything it produces is marked as a rehearsal.
It is the clearest picture of "these numbers are computed, not typed".

### Text on the slide
```
WHAT IT RUNS ON

  In the browser   Next.js 15, React 19, TypeScript
                   React Three Fiber for the 3D site and the drone flight
                   onnxruntime-web — the trained detector, running on the
                     operator's own machine, no server and no GPU
                   Tailwind, Recharts, Zustand

  Before it ships  Python — the physics model that generates the telemetry
                   Ultralytics YOLOv8n — trained once on a Colab T4
                   Pillow and NumPy — the thermal cell extraction

  Hosting          Vercel. One secret, server-side only. The demo path makes
                   zero network calls; live mode makes exactly one.

WHY THE NUMBERS CANNOT DRIFT

  Every build runs, in order: regenerate the data files → check every file
  against its schema and 16 stated invariants → scan the source for hardcoded
  numbers → run 509 tests → compile.

  If a headline figure moves, the BUILD fails, not the demo. Two of those
  sixteen checks exist specifically to stop us tuning a measurement toward a
  nicer slide.

  Two more checks drive a real browser: one walks all six screens in both
  themes and fails if any box is smaller than what is inside it, the other
  loads the console six times and confirms it is awake. Both were made to
  fail on a known bug before either was trusted.
```

### Speaker notes
- Vision training ran on Colab. Inference runs in the browser. There is no GPU at runtime and no model server.
- The telemetry file was 1.6 MB and was being shipped to every visitor. Storing one base frame plus the differences brought it to 52 kB, and the packer refuses to write unless unpacking reproduces the original exactly.

---

## SLIDE 9 — IMPACT, STATUS AND TEAM

### Image
`09-data.png` — the Data screen: the day's generation curve with the losses drawn
against it, what each cause is costing, and the worst arrays on the site.

### Text on the slide
```
WHAT IT IS WORTH

  On the modelled block, one cracked array is bleeding 1.01 MWh a day and
  3.07 MWh over the three-day forecast. Finding it takes minutes here instead
  of the days a site visit takes, and the system says which of four jobs the
  crew should be sent to first.

  Scale is the point: the reasoning is identical for 120 arrays or 12,000.
  Nothing in it depends on a person reading a chart.

WHAT IS BUILT — all of this works today
  ✅ 120 arrays, three faults, operator fault injection
  ✅ Six screens, both themes, session survives reload
  ✅ Dispatch → 3D flight → capture → detection → approval → work order
  ✅ The trained detector runs live in the browser and reproduces its own
     committed result
  ✅ A queue ranked by a fixed formula, with the arithmetic printed on screen
  ✅ 509 tests and five build gates

WHAT IS NOT — said out loud, because volunteering it is what makes the rest
believable
  ◻ Two of the 120 arrays carry photographed module surfaces; the rest share
    one material
  ◻ The site map zooms but does not pan
  ◻ Inference speed has only been measured through a software renderer so far

TEAM — SIGMOID
Rehaan Ahmad Khan
Shantana Singh
Vishnu Tripathi

  Repository: github.com/RAK2315/solar-proj
```

### Speaker notes
- End on the thesis: "From anomaly to action."
- The "what is not" block is not a weakness. Volunteering the limits is what makes everything above it credible, and it pre-empts the one question that would otherwise land badly.
- The team block is filled in. The brief asks for it explicitly, so do not drop it for space.

---

## IMAGE CHECKLIST

Every image below is a real screenshot or a real graph. There are no pictures of
text, and nothing on this list still needs drawing.

| Slide | File | What it is |
|-------|------|------------|
| 1 | `01-hero-flight.png` | Drone on station over B-17, detector box drawn, PiP console running |
| 2 | `02-landing-gap.png` | The three derived figures on the landing page |
| 3 | `03-incident-chain.png` | The incident file's reasoning chain, each step badged with its basis |
| 4 | `04-detector-verify.png` | The run ledger with live inferences and their timings |
| 4 | `04-annotated.jpg` | The detector's box on the committed evidence photograph |
| 4 | `04-thermal.png` | The thermal image of the same module |
| 4 | `04-training-curves.png` | Training run metrics, if a fourth image is wanted |
| 5 | `06-matrix.png` | The 5×7 cell grid with the row-2 band lit |
| 6 | `07-repairs.png` | Repair queue with the arithmetic in each row |
| 7 | `05-site-dark.png` · `05-site-light.png` · `05-cinematic.png` | The console in both themes, and the drone's view |
| 8 | `08-rehearsal.png` | The Rehearsal screen — inject a fault, the physics follows |
| 9 | `09-data.png` | The Data screen — day curve, loss by cause, worst arrays |

Spare, if a slide needs a fourth image: `02-landing-hero.png`,
`04-evidence-rgb.jpg`, `06-dossier-after-flight.png`.
`04-texture-cracked.jpg` is the photograph used as module surface material in the
3D scene — it is **not** evidence, so say so if it is ever shown.

---

## SPEAKER TIMING — 3 MINUTES 30

| Time | Slide | Beat |
|------|-------|------|
| 0:00–0:15 | 1 | Thesis. What it does in one sentence. |
| 0:15–0:45 | 2 | The problem. 364 delivered of 500, and diagnosis takes days. |
| 0:45–1:15 | 3 | The chain, end to end. The drone is how it gets evidence. |
| 1:15–2:00 | 4 | **What is real — press Verify live.** The longest beat. Earn it. |
| 2:00–2:25 | 5 | Five signals agree, and the mechanism predicted the measurement. |
| 2:25–2:50 | 6 | Ranking. One formula, 26× margin, arithmetic on screen. |
| 2:50–3:10 | 7 | The console. Offer them the mouse. |
| 3:10–3:20 | 8 | Stack and gates. A drifted number fails the build, not the demo. |
| 3:20–3:30 | 9 | Impact, status, team. Built, not proposed. |

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
- Set `GROQ_API_KEY` before recording, or the agent panel will honestly report that
  it is unavailable — which is correct behaviour and a bad look on camera.
