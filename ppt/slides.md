# SURYA AGENT: Round 1 deck, slide by slide

JSS AI FORGE 36, AI for Industry 4.0 track, team SIGMOID. 15 slides, 16:9 (13.333 in by 7.5 in).

Written by `ppt/build/build_deck.cjs` together with `SURYA-AGENT-Round1.pptx`, so the two agree.
Edit the script and rebuild; an edit made here alone will be overwritten.

For each slide: the section label above the title, the title, every piece of text on the slide in
reading order, the pictures and where each sits, and the speaker notes. Text is exact: do not
reword a figure, round it, or add one. Where every figure comes from is in `SOURCES.md`.

Pictures are in `images/`, named by slide number. All are captures of the running prototype
taken on 7 Oct 2026 at 1920 by 1080; some are cropped to one panel so the text in them can be read.

---

## Slide 1: SURYA AGENT: the plan, not the picture

**Section label:** Cover

**Title:** SURYA AGENT: the plan, not the picture

### Text on the slide

```
JSS AI FORGE 36  |  Round 1  |  AI for Industry 4.0
```

```
SURYA AGENT
```

```
The plan, not the picture.
```

```
An AI agent that watches a 500 MW block of Bhadla Solar Park, sends a drone to verify what telemetry cannot, and hands the operator a ranked repair plan with a computed deadline. A person approves it before anything is scheduled.
```

```
Team SIGMOID
Rehaan Ahmad Khan  |  Shantanu Singh
Lakshita Rawat  |  Krishna Agarwal
```

```
Picture: the running prototype, not a mock-up.
```

### Pictures

- `images/01-landing-field.png`: right half of the cover: the 3D field from the landing page, cropped to leave out the page's own text

### Speaker notes

Fifteen seconds. Surya watches a 500 MW block of Bhadla Solar Park, sends a drone to verify what telemetry cannot, and hands the operator a ranked, deadlined repair plan to approve. Say "a 500 MW block of Bhadla" out loud: it is accurate and it answers "why only 120 arrays" before it is asked. The picture is the product's own landing page: the 3D field with two drones flying inspection loops. Team departments are not on the slide because they were not supplied; add them here if the organisers want them.

---

## Slide 2: The plant knows its output fell, not why or how long it can wait

**Section label:** 1  Problem statement and target beneficiaries

**Title:** The plant knows its output fell, not why or how long it can wait

### Text on the slide

```
Annual
the usual cadence of aerial infrared inspection at utility-scale PV
```

```
Weeks to months
how long faults below the inverter go undetected between those flights
```

```
−41.7 %
one cracked array in our model: 3.07 MWh and ₹7,509 lost over 72 h if nobody acts
```

```
Source for the first two: Turbine Logic and EPRI, "Field Experience Detecting PV Underperformance in Real Time Using Existing Instrumentation", osti.gov/servlets/purl/1960134. Third: our PV model, tariff ₹2.446/kWh.
```

```
What plant monitoring sees, and what it cannot
SCADA reports that an inverter or string is short. It does not say which module, whether it is dirt or damage, or how urgent it is. In our model the two look the same from telemetry: only imaging separates them. So someone drives out to look, or the fault waits for the next survey.
```

```
Who this is for
Plant operators and O&M crews: which array, what repair, in what order, by when
Asset owners: lost energy stated in MWh and in rupees at the plant’s own tariff
The grid off-taker: more of the contracted energy actually delivered
```

### Pictures

None. This slide is native shapes, text and tables only.

### Speaker notes

The framing is continuous against annual, not fast against slow. The two quotations are from Sheppard, Cook and Perullo of Turbine Logic with Fregosi and Bolen of EPRI, "Field Experience Detecting PV Underperformance in Real Time Using Existing Instrumentation", hosted on OSTI. It is not an NREL paper; do not call it one. The three figures on the right come from our own model of one faulted array, B-17: 5 of its 7 strings are bypassed, so the array is 41.7 % down while the worst string is 58.4 % down. Those are two different quantities. The rupee figure is 3.07 MWh at the blended Bhadla Phase-III tariff of Rs 2.446 per kWh. Do not quote a soiling-loss percentage or a national rupee figure: we hold no source for one.

---

## Slide 3: Today’s tools detect and report. None of them hands over a plan

**Section label:** 2  Existing gaps

**Title:** Today’s tools detect and report. None of them hands over a plan

### Text on the slide

| Approach | What it gives the operator | What is still missing |
|---|---|---|
| Plant SCADA and inverter monitoring | Output fell, at an inverter or a string | Which module, why, and how urgent |
| Periodic aerial infrared survey | A thermal map of the whole field | Typically flown once a year, so faults sit for weeks to months |
| Drone and AI inspection platforms (Raptor Maps, Zeitview, Sitemark) | Thermal imaging, AI defect classification, 3D twins under way | A report of defects. No deadline, no crew plan, no re-plan when conditions change |
| SURYA AGENT | A ranked work order with a computed deadline, re-derived live, with its arithmetic on screen | Built as a prototype on simulated telemetry. Not yet connected to a real plant |

```
We do not claim the twin or the detection as new. Our thermal evidence even comes from Raptor Maps’ own open dataset, InfraredSolarModules, and we say so on screen. What we add is the step after the picture.
```

```
Comparison from our prior-art sweep of 4 Oct 2026, from each company’s public material. Survey cadence: Turbine Logic and EPRI, on OSTI.
```

### Pictures

None. This slide is native shapes, text and tables only.

### Speaker notes

Be fair to the incumbents: Raptor Maps, Zeitview and Sitemark already do drone thermal imaging with AI classification at utility scale, and Raptor Maps and Sitemark are building georeferenced 3D twins. So the twin and the detection are table stakes and we do not pitch either as our difference. This comparison is from our own prior-art sweep of 4 October 2026, read from their public material; it is not a benchmark. The gap is what happens after detection: a deadline, a crew plan, a re-plan when the weather changes, and a person signing it off.

---

## Slide 4: One closed loop, from a telemetry anomaly to a work order

**Section label:** 3  Proposed AI solution

**Title:** One closed loop, from a telemetry anomaly to a work order

### Text on the slide

```
Loop, left to right: 1 Telemetry anomaly > 2 Agent triage > 3 Drone dispatch > 4 Evidence capture > 5 Vision analysis > 6 Prognosis and deadline > 7 Ranked plan > 8 Human approval
```

```
The prototype’s main view: a 3D twin of the block, 120 arrays, with the live repair queue.
```

```
Watches 120 arrays against a physics model of what each should produce in the current sun and heat
When telemetry cannot tell dirt from damage, it sends a drone instead of guessing
Reads the drone’s frames with a detector we trained, in the browser
Turns the defect and the 72 h forecast into a deadline, then a ranked crew plan
Stops. Nothing becomes a work order until an operator approves it
```

### Pictures

- `images/04-twin-site.png`: lower left: the twin at rest, the main view of the console

### Speaker notes

This is the product. Seven of the eight steps run without a person; the eighth is a person on purpose. The drone is not the product: it is how the agent gets evidence it cannot infer from telemetry. The picture is the main view of the prototype: a 3D twin of the modelled block, 120 arrays in three zones, with the repair queue on the right. At the moment captured, B-17 is critical and first in the queue, and the plan line reads "Optimal plan. The heuristic matched the optimum." The loop follows the RAISE-winning Robinsun solar agent, which we credit on the last slide. Where they had a physical drone, we put a trained defect model and a physics-grounded simulation.

---

## Slide 5: Four working parts, each doing the job it is suited to

**Section label:** 3  Proposed AI solution: where the AI is

**Title:** Four working parts, each doing the job it is suited to

### Text on the slide

```
1  Vision detector, trained by us
YOLOv8n fine-tuned on 921 labelled panel photographs. Cracked AP@50 0.995 on the held-out test split. It runs in the operator’s browser on ONNX Runtime Web: no server, no GPU.
```

```
2  Agent reasoning, language model
openai/gpt-oss-120b on Groq writes the triage and prognosis in words. It never supplies a number: the server recomputes every fact from the physics and cross-checks the reply.
```

```
3  Prognosis that ends in an hour
A thermal-dose model and the 72 h forecast give "act before 14:00" for B-17. The deadline is computed, never looked up, and it moves when the weather does.
```

```
4  Crew plan, exact optimisation
The crew day is a mixed-integer program solved by HiGHS in WebAssembly, cut off at 50 ms, beside a greedy heuristic scored by the same function. The screen says when they match.
```

```
Not AI, on purpose: the order of the repair queue is a fixed formula, never a language model’s opinion.
In progress, no result claimed: a thermal classifier on Raptor Maps’ InfraredSolarModules (20,000 images, 12 classes). The notebook exists; no model is trained and no metric is quoted.
```

### Pictures

None. This slide is native shapes, text and tables only.

### Speaker notes

This slide answers "meaningful application of AI". Each technique is used where it fits and nowhere else. The detector: YOLOv8n fine-tuned on the Roboflow solar panel fault detection dataset, version 2, CC BY 4.0, 921 images split 797 train, 82 validation, 42 test. Cracked AP at 50 is 0.995 on the held-out test split. The four-class mean is 0.9813; the fifth class, Dirty, has no test images so we report it as undefined, not zero. The language model, openai/gpt-oss-120b on Groq, writes the triage and the prognosis in words. It never supplies a number: the server recomputes every fact from the physics and rejects a reply whose figures disagree. The queue order is deliberately not AI: it is a fixed formula, because a ranking that changes between two runs is one nobody can trust. The thermal classifier is in progress. The training notebook and 119 modelled frames exist. There is no trained model and no metric, so no score appears anywhere in this deck.

---

## Slide 6: A drone flight, a live detection and a measured thermal band

**Section label:** 3  Proposed AI solution: the agent goes and looks

**Title:** A drone flight, a live detection and a measured thermal band

### Text on the slide

```
Detector, in the browser
Cracked 0.90 on the frame the drone’s camera returned on this flight. The box is the model’s own; none is drawn that it did not produce.
```

```
Thermal pass
The same flight in the ironbow palette. This view is a rendering of the simulated scene, not a thermal capture.
```

```
Measured thermal evidence
From a real UAV thermal frame (Raptor Maps, MIT): four hot cells, row 2, columns 3 to 6, about +2.8 °C, one connected band. Cell means under a declared 25 °C span, not peak pixels.
```

```
B-17 is diagnosed from a real thermal capture. The other 119 arrays are flagged from modelled signature. The build fails if the two are mixed.
```

### Pictures

- `images/06-drone-frame-detector.png`: left: the drone’s own camera frame over B-17 with the detector’s box, cropped to the 3D view
- `images/06-drone-thermal-pass.png`: middle: the thermal pass of the same flight, cropped to the 3D view
- `images/06-dossier-evidence-matrix.png`: right: the dossier, with the captured evidence and the 5 by 7 anomaly matrix

### Speaker notes

All three pictures are from the running prototype on 7 October 2026. The flight was flown at 60 times site speed. Left: the frame the drone's camera returned over B-17, with the box our detector drew on it in the browser. On this flight it returned Cracked at 0.90. On the photograph the committed figure was measured on, the same weights return 0.91 against a committed 0.9084, and there is a Verify button that reruns it in front of a judge. Middle: the same pass in false colour. It is a rendering of the 3D scene, not a thermal capture; say so. Right: the real evidence. A UAV thermal frame from Raptor Maps' open dataset, 24 by 40 pixels, processed with classical image processing into the panel's 5 by 7 cells. Four hot cells in row 2, columns 3 to 6, about 2.8 degrees above the rest, one connected band. That is the signature of a bypassed substring. The figure is a cell mean under a declared 25 degree span, which is why it is lower than a thermographer's peak-pixel figure. Vocabulary matters: B-17 is diagnosed, because it has a real capture. The other 119 arrays are flagged from modelled signature. The build fails if the word "diagnosed" is used for an array without a capture.

---

## Slide 7: The plan, not the picture

**Section label:** 4  Innovation and uniqueness

**Title:** The plan, not the picture

### Text on the slide

```
The Queue screen: every job shows its working; the day plan is a proposal until a person approves.
```

```
score = loss per day × severity × urgency ÷ access
B-17 as captured, 10:23 site time:  1.01 MWh × 3.0 × 7.65 ÷ 1.0 = 23.17
Urgency is 1 + 24 ÷ hours left, so the score climbs as the deadline closes. A-08 is next at 0.81.
```

```
A computed deadline
not a flagged defect: an hour, from the defect, the mechanism and the forecast
```

```
A plan that re-derives live
change the conditions and the queue and the crew day are worked out again
```

```
Arithmetic on screen
the ranking formula with its inputs, and a ? on every number for where it came from
```

```
A human gate
the agent proposes; only an operator’s click creates a work order
```

### Pictures

- `images/07-queue-arithmetic-dayplan.png`: right: the Queue screen, each job with its arithmetic, and the day plan for two crews

### Speaker notes

This is our difference, and it is deliberately not the twin and not the detection. Four things the incumbents' reports do not give. One, a deadline that is computed from the defect, the mechanism and the forecast. Two, a plan that is derived, not stored, so it re-derives when conditions change. Three, the arithmetic on screen. Four, a human gate. The picture is the Queue screen. Every job prints its own working. At the moment captured, 10:23 site time, B-17 reads 1.01 MWh a day, times 3.0 for critical, times 7.65 urgency, divided by 1.0 access, equals 23.17. Urgency is 1 plus 24 over the hours left, so the score rises as the deadline closes; it will read differently at a different minute. Beside it is the day plan for two crews. It says honestly that B-17 finishes after its deadline, because the repair takes longer than the time left, and it is planned as early as it can be. If a judge asks how it prioritises, open src/lib/ranking.ts.

---

## Slide 8: Name a hazard, drag it onto the field, and the whole plan re-derives

**Section label:** 4  Innovation: the what-if sandbox

**Title:** Name a hazard, drag it onto the field, and the whole plan re-derives

### Text on the slide

```
Sandbox, after a dust storm is dropped on Zone B. Seeking back before the drop un-happens it.
```

```
What the screen said, as captured
8 arrays affected, 6 jobs added, 1 displaced, B-17 still first.
Cost over 72 h: 5.62 MWh, ₹13,742 at ₹2.446/kWh. Forecast band ₹12,544 to ₹14,911.
```

```
Measured in Chrome
31 to 40 ms
from drop to the re-planned frame on screen, against a 150 ms budget. 60.1 fps throughout.
```

```
Hazard strengths and the forecast band are declared assumptions, labelled as such behind the ? on screen.
```

```
Dust storm and cloud bank are dragged; heatwave is site-wide. The physics model is untouched: a hazard only changes the sunlight and air temperature each array is evaluated at.
```

### Pictures

- `images/08-sandbox-dust-dropped.png`: left: the Sandbox screen after a dust storm was dropped on Zone B

### Speaker notes

This is the live demonstration. A judge names a hazard; we drag it onto the field. In this capture a dust storm was dropped over part of Zone B. The line under the queue reads: 8 arrays affected, 6 jobs added, 1 displaced, site output 0.2 MW lower, B-17 still first. The queue went from 3 jobs to 9. The Hazards panel puts a cost on it: over the next 72 hours the dust costs the modelled arrays 5.62 MWh, 13,742 rupees at 2.446 rupees per kWh, with a forecast band of 12,544 to 14,911. Measured in Chrome on our laptop: from releasing the pointer to the re-planned frame being painted takes 31 to 40 milliseconds, against a budget of 150, and the twin holds 60.1 frames a second at both 1366 by 768 and 1920 by 1080. Be straight about three things. The hazard strengths are declared assumptions, printed behind the question mark; none is a measurement of Bhadla. The forecast band is a declared plus or minus 5 to 15 per cent on irradiance, not a fitted error model. And at this moment the heuristic matched the optimum; we do not claim the solver beats it here. A 5.8 per cent difference does exist on one ordinary afternoon, 14:17 site time, with three cracks queued against the end of the shift.

---

## Slide 9: What it costs to wait, and who decides

**Section label:** 4  Innovation: the deadline and the human gate

**Title:** What it costs to wait, and who decides

### Text on the slide

```
B-17: −41.7 %, 3.07 MWh and ₹7,509 over 72 h, act before 14:00
Waiting is priced at four points
Work order INC-B17 exists only after a person clicks Approve, or declines with a reason
```

```
The B-17 incident after the drone returned. Figures in the pictures are as captured and move with site time.
```

### Pictures

- `images/09-incident-approval-gate.png`: left: the B-17 incident, with the reading, the Approve button and the evidence chain
- `images/09-cost-of-waiting.png`: top right: the cost-of-waiting table from the same incident screen

### Speaker notes

This is the incident file for B-17 after the drone has returned. Left to right: the reading, the evidence chain in six plain steps, and the cost of waiting. B-17 is 41.7 per cent below expected. Over 72 hours that is 3.07 MWh, 7,509 rupees at 2.446 rupees per kWh. The deadline is 14:00: it is the hour at which the cracked cell has spent its 5-hour budget above 65 degrees. Both of those are declared engineering thresholds, and the budget is solved to reproduce the 14:00 figure; say so if asked. The cost-of-waiting table is the thing a detector cannot give you: start now, in 6 hours, tomorrow, or in 3 days, each with the energy and rupees lost. The figures in the picture are as captured and move with site time. The last step of the evidence chain is "What a person decided: waiting for an operator. Nothing is scheduled until a person approves it." The red Approve button is the loudest control on the screen. Clicking it creates work order INC-B17 and the array turns to scheduled. The operator can also override with a reason. That gate is our answer to "would you let this run unsupervised": no.

---

## Slide 10: Lost energy in MWh and in rupees, with the working shown

**Section label:** 5  Expected impact

**Title:** Lost energy in MWh and in rupees, with the working shown

### Text on the slide

```
Analytics for the modelled arrays, and the tariff panel beneath it. As captured, 7 Oct 2026.
```

```
One fault, left to the next survey
₹74,114
B-17 for 30 days: 1.01 MWh/day × 30 = 30.3 MWh, at ₹2.446/kWh. An illustration that assumes the loss stays constant, not a measurement.
```

```
For industry and beyond
More of the installed clean capacity actually delivered
Crews kept out of the field above 40 °C by the planner
No drone flown where imaging adds nothing, such as soiling
```

```
Tariff: (200 MW × ₹2.44 + 300 MW × ₹2.45) ÷ 500 MW = ₹2.446/kWh, SECI Bhadla Phase-III, 2017. No deviation charge is computed.
```

### Pictures

- `images/10-analytics-expected-actual.png`: top left: Analytics, expected against actual with the forecast band and the loss by cause
- `images/10-tariff-arithmetic.png`: under it: the tariff arithmetic and its sources, from the same screen

### Speaker notes

Impact is argued from arithmetic a judge can check, not from a market statistic we cannot source. The picture is the Analytics screen: expected against actual for the modelled arrays over the next 72 hours, with a forecast band, and the gap drawn again by cause. As captured: 178 kW short of the model now, which is 0.6 per cent of the arrays' output; 9.66 MWh lost over the 72 hours out of 903 expected; 23,623 rupees, band 21,529 to 25,665. The two lines nearly coincide because the shortfall is small against total output, and the screen says so. The tariff: Bhadla Phase-III was auctioned by SECI in 2017 as two lots, 200 MW to ACME at 2.44 and 300 MW to SBG Cleantech at 2.45 rupees per kWh. Blended by capacity that is 2.446. We never quote 2.44 alone. No deviation settlement charge is computed or claimed: the CERC formula depends on a parameter the regulation does not publish. The 30-day line is an illustration and is labelled as one: B-17 loses 1.01 MWh a day, so 30 days is 30.3 MWh, which is 74,114 rupees at 2.446. It assumes the loss stays constant, which our own prognosis says it would not; the diode is projected to fail and the strings go open. It is there to show why continuous matters against an annual survey. Wider benefit, stated qualitatively: more of the installed clean capacity is delivered; crews are not sent out in the hottest hours, the planner has a 40 degree rule; and no drone is flown where imaging would add nothing, for example a soiled array.

---

## Slide 11: In the browser, behind a build that fails if a number drifts

**Section label:** 6  Prototype architecture

**Title:** In the browser, behind a build that fails if a number drifts

### Text on the slide

```
Before the build (Python and Colab, never at run time): PV model and generators scripts/physics.py; Detector training YOLOv8n to ONNX, opset 12; Thermal cell grid classical image processing
```

```
Build gate (fails the build, not the demo): Zod schemas and 16 invariants; Literal and wording scan; 463 tests, physics golden-tested
```

```
In the browser, at run time (Next.js, React, TypeScript. No database): One clock: site time. Every screen is a pure function of it and the scenario events; PV model per array, plus hazards; Ranked queue, fixed formula; Crew plan, HiGHS in WASM; Detector, ONNX Runtime Web; 3D twin, React Three Fiber; Glass overlay, six screens
```

```
The one network call: /api/triage to Groq. Reply cross-checked on the server
```

```
Operator: approves or declines. Only then a work order
```

```
Arrows: Before the build > Build gate > In the browser; browser <> the one network call; browser > Operator
```

```
Data files in data/ are generated by scripts and committed. The site is 120 arrays in three zones on three inverters, modelled on a 500 MW block of Bhadla.
```

### Pictures

None. This slide is native shapes, text and tables only.

### Speaker notes

Read it left to right. Before the build: Python scripts hold the PV model and generate the site and its telemetry; a Colab notebook trained the detector and exported it to ONNX; a classical image-processing script turned a real thermal frame into the cell grid. The build gate runs in order: sync artefacts, validate every data file against its Zod schema and 16 invariants, scan the source for hardcoded numbers and forbidden wording, run 463 tests, then compile. The TypeScript physics is golden-tested against the Python line for line. At run time, in the browser, there is one clock, the site time. Everything on screen is a pure function of that clock and the scenario events, which is why you can seek backwards and a dropped hazard un-happens. The detector and the solver both run as WebAssembly on the operator's machine. There is exactly one network call in the product: the triage route, which calls Groq and cross-checks the reply against the physics on the server. There is no database and no second service. A work order is created only by the operator's click. This diagram is drawn from native shapes so it can be edited.

---

## Slide 12: It is built, and these are measurements, not targets

**Section label:** 6  Prototype: technical feasibility, measured

**Title:** It is built, and these are measurements, not targets

### Text on the slide

| What | Result | How it was measured |
|---|---|---|
| Automated tests | 463 passing | Run on every build, before it compiles |
| 3D twin frame rate | 60.1 fps, no frame over 20 ms | Chrome, at 1366×768 and 1920×1080, idle and mid-drag |
| Hazard drop to re-planned frame | 31 to 40 ms | Real pointer in Chrome. Budget was 150 ms |
| Crew-plan solve, the site’s own days | 10.8 ms; 1.1 ms under a heatwave | HiGHS in WebAssembly in Chrome. Cut off at 50 ms |
| Detector, class Cracked | AP@50 0.995 | Held-out test split, 42 images |
| Physics in the browser | Matches the Python model | Golden test, on every build |
| Layout at two screen sizes | Passes | No text under 14 px, nothing clipped, both widths |

```
Six screens, all working: Site, Incident, Queue, Analytics, Drones, Sandbox. Light and dark themes, a 2D map fallback when 3D cannot hold 30 fps, and a session that survives a reload.
```

### Pictures

None. This slide is native shapes, text and tables only.

### Speaker notes

Every row is a measurement taken on our own laptop, in Chrome, and each is recorded in the repository. The frame rate and the drop-to-re-plan time come from a script that drives a real pointer in a real Chrome window on the real GPU; headless Chrome would measure a software renderer. The solver times are for the site's own days. Two synthetic stress days of 12 to 20 loosely constrained jobs took 60 to 170 ms, which is why the solve is cut off at 50 ms and then reports "best plan found, gap to the solver's bound" and is never called optimal. The detector figure is per class on the held-out test split of 42 images, not a mean and not a validation figure. The layout check fails the build on any text under 14 pixels, anything clipped, or a 3D canvas that does not fill the window, at both 1920 by 1080 and 1366 by 768. If a judge asks to see any of these, each has a command: npm test, npm run measure:hero, npm run check:layout.

---

## Slide 13: What is real, what is simulated, what is assumed, what is not built

**Section label:** 6  Prototype: what is real and what is not

**Title:** What is real, what is simulated, what is assumed, what is not built

### Text on the slide

```
Real
Detector trained by us, measured on a held-out test split
Thermal band measured from a real UAV frame
Tariffs as awarded by SECI for Bhadla Phase-III
PV equations from NREL PVWatts
```

```
Simulated
Telemetry for all 120 arrays, from the PV model with stated coefficients
The drone flight, in the 3D scene
The 72 h weather forecast
```

```
Declared assumption
Hazard strengths in the sandbox
Crew hours for each kind of repair
Forecast band, ±5 % widening to ±15 %
Thermal span and the dose threshold behind the deadline
```

```
Not built
Thermal classifier: no model, no metric
Connection to a real SCADA system or drone
Any deviation settlement charge
```

```
Evidence stays with the array it was captured on. We hold real imagery for B-17 only, and no other array is allowed to show it.
```

### Pictures

None. This slide is native shapes, text and tables only.

### Speaker notes

Say this before a judge has to ask. It is the reason the rest of the deck can be believed. Real: the detector is trained and measured; the thermal band comes from a real UAV frame; the tariffs are the awarded SECI figures; the PV equations are NREL PVWatts. Simulated: there is no live plant behind this. Telemetry for the 120 arrays is generated from the PV model with stated coefficients: temperature coefficient minus 0.0037 per degree, NOCT 45 degrees, inverter efficiency 0.98, soiling derate 0.97. The drone flight is a 3D simulation and the 72-hour forecast is generated. Declared assumptions, each labelled on screen: the hazard strengths; crew hours per repair, for example 3 hours for a module replacement and 1 hour for a wash; the forecast band; the 25 degree thermal span; the 65 degree threshold and 5-hour budget behind the deadline. Three coefficients are solved to reproduce the fault we demonstrate, and the README says which. Not built: the thermal classifier has no model and no metric. Nothing is connected to a real SCADA system or a real drone. No deviation settlement charge is computed. Only B-17 has captured evidence; the product refuses to show evidence on any other array.

---

## Slide 14: What comes next, and how far it can go

**Section label:** 7  Future scope: research, patent, startup

**Title:** What comes next, and how far it can go

### Text on the slide

```
Scales by design
Every array is evaluated by the same function, so a larger plant is more rows, not a new design
Reasoning runs in the browser: a new site needs no new server
The simulator is the one part to replace, with the plant’s own SCADA feed
```

```
Research
Finish the thermal classifier and report its held-out metric per class
Fit the forecast band to real forecast misses
Radiometric thermal data, and field validation of the deadline model
```

```
Patent
None filed
Candidate for a novelty search: defect, mechanism and forecast turned into a repair deadline and a crew plan that re-derives live
```

```
Startup
Likely users: O&M contractors and owners of utility-scale plants
Commercial use needs a permissively licensed detector: today’s is AGPL-3.0 through Ultralytics
```

```
Tested to 120 arrays. No larger figure is claimed.
```

### Pictures

None. This slide is native shapes, text and tables only.

### Speaker notes

Scalability first. Each array is evaluated by the same pure function, so going from 120 arrays to a whole plant is more rows, not a new design. All of the reasoning runs on the operator's machine, so a new site does not need a new server. The simulator is the one part that would be replaced, by a feed from the plant's own SCADA. We have not tested above 120 arrays and we do not claim a figure. Research: finish the thermal classifier on InfraredSolarModules and report its held-out macro-F1 per class; replace the declared forecast band with an error model fitted to real forecast misses; move from 8-bit normalised thermal images to radiometric ones; and validate the deadline model against real field failures. Patent: nothing has been filed. If we pursue one, the candidate to examine first is the method that turns a defect, its mechanism and a forecast into a repair deadline and a crew plan that re-derives live. That needs a proper novelty search before any claim. Startup: the natural customers are O&M contractors and asset owners of utility-scale plants. One practical point we already know: the detector is trained with Ultralytics YOLOv8, which is AGPL-3.0 and makes this repository AGPL-3.0. A commercial version would retrain on a permissively licensed detector; the README notes that switching to RF-DETR, Apache-2.0, touches one script. OWNER TO CONFIRM: the patent and startup lines state only what the repository supports. Replace them with the team's actual intentions if there are any.

---

## Slide 15: Everything we did not write ourselves

**Section label:** Declarations and credits

**Title:** Everything we did not write ourselves

### Text on the slide

| Kind | What | Licence or terms |
|---|---|---|
| Dataset | Solar Panel Fault Detection v2, Roboflow Universe: 921 images | CC BY 4.0 |
| Dataset | InfraredSolarModules, Raptor Maps: 20,000 thermal images | MIT |
| Pre-trained model | Ultralytics YOLOv8n, fine-tuned by us | AGPL-3.0 |
| External API | Groq, model openai/gpt-oss-120b: the one network call | Groq terms |
| Libraries | Next.js 15.5, React 19.1, three 0.180, React Three Fiber 9.6, drei, zustand, zod, Tailwind 4 | MIT |
| Libraries | onnxruntime-web 1.19.2, highs 1.15.3 (HiGHS in WebAssembly) | MIT |
| Libraries | postprocessing; lucide-react; playwright-core and TypeScript (build only) | Zlib; ISC; Apache-2.0 |
| Method and data | NREL PVWatts equations; SECI Bhadla Phase-III tariffs; IBM Plex typeface | Cited; cited; OFL |

```
Reference we owe: the loop follows the RAISE-winning Robinsun solar agent. We rebuilt it with a trained defect model and a physics-grounded simulation in place of a physical drone. No personal or proprietary data is used.
```

```
Team SIGMOID
Rehaan Ahmad Khan, Shantanu Singh, Lakshita Rawat, Krishna Agarwal
```

### Pictures

None. This slide is native shapes, text and tables only.

### Speaker notes

This slide is the code-of-conduct declaration: every third-party library, model, dataset and external API. No personal data and no proprietary data is used. The two datasets are public and openly licensed. Versions are read from the installed packages. Credit two things out loud. The loop follows the RAISE-winning Robinsun solar agent: we rebuilt the loop, and where they had a physical drone we put a trained defect model and a physics-grounded simulation. And the thermal data is Raptor Maps' own open dataset. The repository is github.com/RAK2315/solar-proj, licensed AGPL-3.0 because the Ultralytics weights are.

---

## Spare pictures, not on a slide

- `images/01-landing.png`: the whole landing page, with its headline and four figures
- `images/04-map-2d.png`: the 2D map of the field, the fallback when 3D cannot hold 30 fps
- `images/08-sandbox-queue-cost.png`: the queue and the Hazards panel from slide 8, cropped so the rupee line can be read
