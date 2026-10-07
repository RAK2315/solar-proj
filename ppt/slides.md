# SURYA AGENT: Round 1 deck, slide by slide

JSS AI FORGE 36, AI for Industry 4.0 track, team SIGMOID. 8 slides, 16:9 (13.333 in by 7.5 in), light theme.

Written by `ppt/build/build_deck.cjs` together with `SURYA-AGENT-Round1.pptx`, so the two agree.
Edit the script and rebuild; an edit made here alone will be overwritten.

Every slide has the same frame: a "Sigmoid" mark top left, the slide title centred, "JSS AI FORGE 36 /
AI for Industry 4.0" top right, a rule under them, and a blue footer band with the slide number.

For each slide: the title, which of the seven Round 1 sections it covers, every piece of text in
reading order, the pictures and where each sits, and the speaker notes. A line in [SQUARE BRACKETS]
is a blue section bar. A line starting "(icon: name)" is an icon row: the icon is
`images/icons/name.png`. Text is exact: do not reword a figure, round it, or add one. Where every
figure comes from is in `SOURCES.md`.

Pictures are in `images/`, named by slide number. All are captures of the running prototype in its
light theme, taken on 7 Oct 2026 at 1920 by 1080; most are cropped so the subject can be seen.
Slides 2, 4, 6 and 8 carry no picture on purpose.

---

## Slide 1: SURYA AGENT

**Covers:** Title slide

### Text on the slide

```
The plan, not the picture.
```

```
An AI agent that watches a 500 MW block of Bhadla Solar Park, sends a drone to verify what telemetry cannot, and hands the operator a ranked repair plan with a computed deadline. A person approves it before anything is scheduled.
```

| Event | JSS AI FORGE 36, Round 1 idea submission |
|---|---|
| Track | AI for Industry 4.0: predictive maintenance, automation, digital twins |
| Team | SIGMOID |
| Members | Rehaan Ahmad Khan, Shantanu Singh, Lakshita Rawat, Krishna Agarwal |
| Prototype | Built and running. github.com/RAK2315/solar-proj |

```
The running prototype: a 3D twin of 120 arrays. B-17 is the red one.
```

```
364 MW
delivered from 500 MW nameplate, at 62.8 °C cell temperature
```

```
−41.7 %
on array B-17: 5 of its 7 strings bypassed
```

```
3.07 MWh
lost over 72 h if nobody acts before 14:00
```

```
0.995
AP@50 for cracked panels, held-out test split
```

### Pictures

- `images/01-twin-field.png`: right: the 3D twin of the field from the Site screen, light theme, cropped to the field

### Speaker notes

Fifteen seconds. Surya watches a 500 MW block of Bhadla Solar Park, sends a drone to verify what telemetry cannot, and hands the operator a ranked, deadlined repair plan to approve. Say "a 500 MW block of Bhadla" out loud: it is accurate and it answers "why only 120 arrays" before it is asked. The four figures along the bottom are the four on the product's own landing page, and each is computed from the physics model or read from the committed detector result. 364 MW is 73 per cent of nameplate because the cells are at 62.8 degrees; that is the model, not a fault. The picture is the main view of the working prototype in its light theme: the 3D twin of the modelled block. Team departments are not on the slide because they were not supplied.

---

## Slide 2: PROBLEM STATEMENT

**Covers:** Round 1 sections 1 and 2: problem statement and target beneficiaries; existing gaps

### Text on the slide

```
[THE PROBLEM: the plant knows its output fell, not why or how long it can wait]
```

```
PLANT TELEMETRY (SCADA)
```

```
What it says
An inverter or a string is producing less than it should
```

```
What it cannot say
Which module?   Dirt or damage?   How urgent?
```

```
So someone drives out to look, or the fault waits for the next aerial survey. In our model, soiling and a cracked cell look the same from telemetry: only imaging separates them.
```

```
Annual
usual cadence of aerial infrared inspection
```

```
Weeks to months
faults below the inverter go undetected
```

```
−41.7 %
one cracked array in our model: 3.07 MWh, ₹7,509 in 72 h
```

```
Sources: first two, Turbine Logic and EPRI, osti.gov/servlets/purl/1960134. Third, our PV model at ₹2.446/kWh.
```

```
[WHO BENEFITS]
```

```
(icon: tools) O&M crews
Which array, what repair, in what order, by when
```

```
(icon: rupee) Asset owners
Loss stated in MWh and rupees at the plant’s tariff
```

```
(icon: bolt) Grid off-taker
More of the contracted energy actually delivered
```

```
EXISTING GAPS
```

| Approach | What it gives | What is still missing |
|---|---|---|
| Plant SCADA | Output fell, at an inverter or string | Which module, why, how urgent |
| Annual aerial infrared survey | A thermal map of the field | Flown once a year, so faults sit for weeks to months |
| Drone and AI platforms (Raptor Maps, Zeitview, Sitemark) | Thermal imaging, AI defect classes, 3D twins under way | A report of defects. No deadline, no crew plan, no re-plan |

```
FROM EACH GAP TO WHAT WE BUILT
```

| Actual problem | How SURYA AGENT answers it |
|---|---|
| Faults wait for a yearly survey | Every array watched continuously against a physics model |
| Telemetry cannot tell dirt from damage | A drone is sent only when imaging would add something |
| A defect report has no deadline | A deadline computed from the defect and the 72 h forecast |
| Priority is a judgement call | One fixed formula, with its arithmetic on screen |
| A plan goes stale when the weather turns | The queue and the crew day re-derive live |
| Automation nobody signed off | Nothing is scheduled until an operator approves |

```
Gaps from our prior-art sweep of 4 Oct 2026, read from each company’s public material. We do not claim the twin or the detection as new.
```

### Pictures

None. This slide is native shapes, text, tables and icons only.

### Speaker notes

The framing is continuous against annual, not fast against slow. The two quoted findings are from Sheppard, Cook and Perullo of Turbine Logic with Fregosi and Bolen of EPRI, "Field Experience Detecting PV Underperformance in Real Time Using Existing Instrumentation", hosted on OSTI. It is not an NREL paper; do not call it one. The third figure comes from our own model of one faulted array, B-17: 5 of its 7 strings are bypassed, so the array is 41.7 per cent down while the worst string is 58.4 per cent down. The rupee figure is 3.07 MWh at the blended Bhadla Phase-III tariff of 2.446 rupees per kWh. On gaps, be fair to the incumbents: Raptor Maps, Zeitview and Sitemark already do drone thermal imaging with AI classification at utility scale, and Raptor Maps and Sitemark are building 3D twins. So the twin and the detection are table stakes and we do not pitch either as our difference. The comparison is from our own prior-art sweep of 4 October 2026, read from their public material; it is not a benchmark. Do not quote a soiling-loss percentage or a national rupee figure: we hold no source for one.

---

## Slide 3: OUR SOLUTION

**Covers:** Round 1 section 3: proposed AI solution

### Text on the slide

```
[PROPOSED SOLUTION: one closed loop, from a telemetry anomaly to an approved work order]
```

```
Loop, left to right: 1 Telemetry anomaly > 2 Agent triage > 3 Drone dispatch > 4 Evidence capture > 5 Vision analysis > 6 Prognosis and deadline > 7 Ranked plan > 8 Human approval
```

```
Dispatch
Drone 01 leaves the pad for B-17 when telemetry cannot settle the cause.
```

```
Detection, in the browser
Cracked 0.89 on the frame the drone’s camera returned. The box is the model’s own.
```

```
Thermal pass
The same module in false colour. A rendering of the simulated scene, not a capture.
```

```
Measured thermal evidence: from a real UAV thermal frame (Raptor Maps, MIT), four hot cells in row 2, columns 3 to 6, about +2.8 °C, one connected band: the signature of a bypassed substring.
Honest wording: B-17 is diagnosed from a real thermal capture. The other 119 arrays are flagged from modelled signature. The build fails if the two are mixed.
```

```
WHERE THE AI IS
```

```
(icon: eye) Vision detector, trained by us
YOLOv8n fine-tuned on 921 labelled photographs. Cracked AP@50 0.995, held-out test split. Runs in the browser: no server, no GPU.
```

```
(icon: robot) Agent reasoning, a language model
openai/gpt-oss-120b on Groq writes the triage in words. It never supplies a number: the server recomputes every fact and cross-checks.
```

```
(icon: clock) Prognosis that ends in an hour
A thermal-dose model and the 72 h forecast give "act before 14:00". Computed, never looked up.
```

```
(icon: calc) Crew plan, exact optimisation
A mixed-integer program solved by HiGHS in WebAssembly, capped at 50 ms, beside a heuristic scored the same way.
```

```
Not AI, on purpose: the queue order is a fixed formula, never a model’s opinion.
In progress, no result claimed: a thermal classifier on Raptor Maps’ InfraredSolarModules. No model is trained and no metric is quoted.
```

### Pictures

- `images/03-drone-in-flight.png`: left: the drone in flight toward B-17
- `images/03-drone-detection.png`: middle: the drone’s camera frame over B-17 with the detector’s box
- `images/03-thermal-pass.png`: right: the thermal pass over the same module

### Speaker notes

This is the product. Seven of the eight steps run without a person; the eighth is a person on purpose. The drone is not the product: it is how the agent gets evidence it cannot infer from telemetry. The three pictures are from the running prototype on 7 October 2026, flown at 60 times site speed. Left: drone 01 on its way to B-17. Middle: the frame the drone's camera returned over B-17, with the box our detector drew on it in the browser. On this flight it returned Cracked at 0.89. On the photograph the committed figure was measured on, the same weights return 0.91 against a committed 0.9084. Right: the same pass in false colour; it is a rendering of the simulated scene, not a thermal capture. The real thermal evidence is a UAV frame from Raptor Maps' open dataset, processed into the panel's 5 by 7 cells: four hot cells in row 2, columns 3 to 6, about 2.8 degrees above the rest, one connected band. The detector: YOLOv8n fine-tuned on 921 images, CC BY 4.0. Cracked AP at 50 is 0.995 on the held-out test split. The language model, openai/gpt-oss-120b on Groq, writes the triage in words and never supplies a number: the server recomputes every fact and cross-checks the reply. The queue order is deliberately not AI. The thermal classifier is in progress: a notebook and 119 modelled frames exist, no model is trained and no score is quoted. Vocabulary: B-17 is diagnosed, because it has a real capture. The other 119 arrays are flagged from modelled signature. The loop follows the RAISE-winning Robinsun solar agent, credited on the last slide.

---

## Slide 4: TECH STACK AND FLOW

**Covers:** Round 1 section 6: prototype architecture

### Text on the slide

```
A physics model, a trained detector and an exact solver, all running in the browser behind a build that fails if a number drifts.
```

```
Flow diagram, top to bottom, with a label at the left of each row:
```

```
BEFORE THE BUILD: PV model and data generators, Python | Detector training, YOLOv8n to ONNX, Colab | Thermal cell grid, classical image processing
```

```
BUILD GATE: Zod schemas and 16 invariants > scan for hardcoded numbers and wording > 453 tests, physics golden-tested against Python > compile
```

```
IN THE BROWSER: ONE CLOCK: site time. Every screen is a pure function of it and the scenario events | PV model per array, plus dropped hazards | Ranked queue, one fixed formula | Crew plan, HiGHS in WebAssembly | Detector, ONNX Runtime Web | 3D twin, React Three Fiber | Glass overlay, six screens, 2D fallback
```

```
WHAT LEAVES IT: ONE NETWORK CALL, /api/triage to Groq. The server recomputes the facts and cross-checks the reply | THE OPERATOR approves or declines. Only then does a work order exist
```

```
[TECHNOLOGY STACK]
```

| Frontend | Next.js 15, React 19, TypeScript |
|---|---|
| 3D twin | three.js, React Three Fiber |
| Vision | YOLOv8n, run on ONNX Runtime Web |
| Optimiser | HiGHS, compiled to WebAssembly |
| Agent | openai/gpt-oss-120b on Groq |
| State, schema | Zustand, Zod |
| Offline | Python; training on a Colab T4 |

```
[WHY THESE CHOICES]
```

```
(icon: globe) Everything in the browser
No GPU and no model server, so nothing can cold-start in front of a judge.
```

```
(icon: scale) An exact solver beside a heuristic
A new rule is one line of a model, and the answer is provable. Both scores are shown.
```

```
(icon: shield) The model writes words, not numbers
Every figure comes from the physics and is cross-checked on the server.
```

```
(icon: sync) One clock
Seek backwards and every screen is correct. The same input gives the same site.
```

### Pictures

None. This slide is native shapes, text, tables and icons only.

### Speaker notes

Read the left side top to bottom. Before the build: Python scripts hold the PV model and generate the site and its telemetry; a Colab notebook trained the detector and exported it to ONNX; an image-processing script turned a real thermal frame into the cell grid. The build gate runs in order: validate every data file against its Zod schema and 16 invariants, scan the source for hardcoded numbers and forbidden wording, run 453 tests, then compile. The TypeScript physics is golden-tested against the Python. If a headline figure moves, the build fails, not the demo. At run time, in the browser, there is one clock, the site time. Everything on screen is a pure function of that clock and the scenario events, which is why you can seek backwards and a dropped hazard un-happens. The detector and the solver both run as WebAssembly on the operator's machine. There is exactly one network call: the triage route, which calls Groq and cross-checks the reply against the physics on the server. There is no database. A work order is created only by the operator's click. On the choices: we refused a second service because a cold start on stage is a demo failure, so the solver is HiGHS compiled to WebAssembly and not OR-Tools behind a Python server. This diagram is drawn from native shapes so it can be edited.

---

## Slide 5: OUR USP

**Covers:** Round 1 section 4: innovation and uniqueness

### Text on the slide

```
[THE PLAN, NOT THE PICTURE: others detect and report. We hand over a deadline and a plan]
```

```
FOUR THINGS A DEFECT REPORT DOES NOT GIVE
```

```
(icon: clock) A computed deadline
Not a flagged defect: an hour, worked out from the defect, its mechanism and the 72 h forecast.
```

```
(icon: sync) A plan that re-derives live
Change the conditions and the queue, the deadlines and the crew day are worked out again.
```

```
(icon: calc) Arithmetic on screen
The ranking formula with its inputs, and a ? on every number for where it came from.
```

```
(icon: user) A human gate
The agent proposes. Only an operator’s click creates a work order.
```

```
score = loss per day × severity × urgency ÷ access
B-17 as captured: 1.01 MWh × 3.0 × 7.69 ÷ 1.0 = 23.29
Urgency is 1 + 24 ÷ hours left, so the score climbs as the deadline closes. Next is A-08 at 0.81.
```

```
Every job shows its working.
```

```
What-if sandbox: a dust storm dropped on Zone B.
```

```
[THE LIVE DEMONSTRATION: name a hazard, drag it onto the field, the plan re-derives]
```

```
What the screen said
8 arrays affected, 6 jobs added, 1 displaced, B-17 still first.
```

```
What it costs, in rupees
5.61 MWh, ₹13,714 over 72 h at ₹2.446/kWh. Band ₹12,518 to ₹14,880.
```

```
31 to 40 ms
from drop to the re-planned frame, measured in Chrome. Budget 150 ms. 60.1 fps.
```

### Pictures

- `images/05-queue-arithmetic.png`: middle: the repair queue on the Queue screen, each job with its arithmetic
- `images/05-sandbox-hazard.png`: right: the Sandbox screen after a dust storm was dropped on Zone B

### Speaker notes

Our difference is deliberately not the twin and not the detection. It is what happens after the picture: a deadline, a plan that re-derives, the arithmetic, and a human gate. The left picture is the Queue screen. Every job prints its own working. At the moment captured, B-17 reads 1.01 MWh a day, times 3.0 for critical, times 7.69 urgency, divided by 1.0 access, equals 23.29. Urgency is 1 plus 24 over the hours left, so the score rises as the deadline closes and reads differently at a different minute. If a judge asks how it prioritises, open src/lib/ranking.ts. The right picture is the live demonstration. A judge names a hazard; we drag it onto the field. Here a dust storm was dropped over part of Zone B. The screen reads: 8 arrays affected, 6 jobs added, 1 displaced, B-17 still first. Over the next 72 hours the dust costs the modelled arrays 5.61 MWh, 13,714 rupees at 2.446 rupees per kWh, forecast band 12,518 to 14,880. Measured in Chrome on our laptop: from releasing the pointer to the re-planned frame being painted takes 31 to 40 milliseconds against a budget of 150, and the twin holds 60.1 frames a second. Be straight about three things. The hazard strengths are declared assumptions; none is a measurement of Bhadla. The forecast band is a declared plus or minus 5 to 15 per cent on irradiance, not a fitted error model. And at this moment the heuristic matched the optimum; we do not claim the solver beats it here. A 5.8 per cent difference does exist on one ordinary afternoon, 14:17 site time.

---

## Slide 6: FEASIBILITY AND VIABILITY

**Covers:** Round 1 section 6, continued: technical feasibility, and scalability and business viability

### Text on the slide

```
[FEASIBILITY: it is built, and these are measurements, not targets]
```

| What | Result | How it was measured |
|---|---|---|
| Automated tests | 453 passing | Every build, before it compiles |
| 3D twin frame rate | 60.1 fps, no frame over 20 ms | Chrome at 1366×768 and 1920×1080 |
| Hazard drop to re-planned frame | 31 to 40 ms | Real pointer, Chrome. Budget 150 ms |
| Crew-plan solve, the site’s own days | 10.8 ms; 1.1 ms in a heatwave | HiGHS, WebAssembly. Cut off at 50 ms |
| Detector, class Cracked | AP@50 0.995 | Held-out test split, 42 images |
| Detector on the drone’s own frame | Cracked 0.89 | Real-time flight of B-17, in browser |
| Physics in the browser | Matches the Python model | Golden test, on every build |

```
[VIABILITY: how far it can go]
```

```
(icon: cubes) Scales by design
Every array is evaluated by the same function: a larger plant is more rows, not a new design. Tested to 120 arrays; no larger figure claimed.
```

```
(icon: globe) Nothing to host per site
The reasoning runs in the browser, so a new site needs no new server. The simulator is the one part to replace, with the plant’s own SCADA feed.
```

```
(icon: industry) A route to a product
Likely users are O&M contractors and plant owners. Commercial use needs a permissively licensed detector: today’s is AGPL-3.0 through Ultralytics.
```

```
[WHAT IS REAL, AND WHAT IS NOT]
```

```
Real
Detector trained by us, measured on a held-out split
Thermal band measured from a real UAV frame
Tariffs as awarded by SECI
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
Evidence stays with the array it was captured on. We hold real imagery for B-17 only, and no other array may show it.
```

### Pictures

None. This slide is native shapes, text, tables and icons only.

### Speaker notes

Every row of the table is a measurement taken on our own laptop, in Chrome, and each is recorded in the repository. The frame rate and the drop-to-re-plan time come from a script that drives a real pointer in a real Chrome window on the real GPU. The solver times are for the site's own days; two synthetic stress days took 60 to 170 ms, which is why the solve is cut off at 50 ms and then reports "best plan found" with its gap and is never called optimal. The detector figure is per class on the held-out test split of 42 images. Then say what is real and what is not, before a judge has to ask. There is no live plant behind this: telemetry for the 120 arrays is generated from the PV model with stated coefficients, temperature coefficient minus 0.0037 per degree, NOCT 45 degrees, inverter efficiency 0.98. The drone flight is a 3D simulation. Declared assumptions, each labelled on screen: hazard strengths; crew hours per repair, for example 3 hours for a module replacement and 1 hour for a wash; the forecast band; the 25 degree thermal span; the 65 degree threshold and 5-hour budget behind the deadline. Not built: the thermal classifier has no model and no metric, and nothing is connected to a real SCADA system or drone. Viability. Each array is evaluated by the same pure function, so a larger plant is more rows, not a new design; we have tested to 120 arrays and claim no larger figure. One practical point for a product: the detector is trained with Ultralytics YOLOv8, which is AGPL-3.0 and makes this repository AGPL-3.0. A commercial version would retrain on a permissively licensed detector; the README notes that switching to RF-DETR, Apache-2.0, touches one script.

---

## Slide 7: IMPACT AND BENEFITS

**Covers:** Round 1 section 5: expected impact

### Text on the slide

```
[WHAT A FAULT COSTS, AND WHAT WAITING COSTS: every figure with its working]
```

```
₹2.446/kWh
(200 MW × ₹2.44 + 300 MW × ₹2.45) ÷ 500 MW. The two SECI Bhadla Phase-III lots, blended by capacity
```

```
3.07 MWh  =  ₹7,509
what one cracked array, B-17, loses over the 72 h forecast if nobody acts
```

```
₹74,114
the same array left 30 days: 1.01 MWh/day × 30. An illustration that assumes a constant loss, not a measurement
```

```
Annual  >  continuous
aerial surveys are usually yearly, so faults sit for weeks to months. This watches every array all the time
```

```
THE COST OF WAITING, ON SCREEN
```

```
From the B-17 incident: repair now, in 6 h, tomorrow or in 3 days, in MWh and rupees. As captured; the figures move with site time. A defect report cannot give this.
```

```
[WHO GAINS, AND HOW]
```

```
(icon: tools) Operators and O&M crews
A ranked list with reasons: which array, what repair, by when. No guessing which alarm matters.
```

```
(icon: rupee) Asset owners
Loss in MWh and in rupees at the plant’s own tariff, with the source shown.
```

```
(icon: bolt) The grid and its off-taker
More of the contracted clean energy actually delivered from capacity already built.
```

```
(icon: hat) Crew safety
The planner keeps field work out of the hours above 40 °C.
```

```
(icon: plane) Fewer needless flights
No drone is sent where imaging adds nothing, such as a soiled array.
```

```
(icon: industry) Industry 4.0, end to end
A digital twin, predictive maintenance and automation, with a person in the loop.
```

```
No deviation settlement charge is computed or claimed. Rupees are lost energy times the tariff, and nothing else.
```

### Pictures

- `images/07-cost-of-waiting.png`: lower left: the cost-of-waiting table from the B-17 incident screen

### Speaker notes

Impact is argued from arithmetic a judge can check, not from a market statistic we cannot source. The tariff: Bhadla Phase-III was auctioned by SECI in 2017 as two lots, 200 MW to ACME at 2.44 and 300 MW to SBG Cleantech at 2.45 rupees per kWh. Blended by capacity that is 2.446. We never quote 2.44 alone. No deviation settlement charge is computed or claimed: the CERC formula depends on a parameter the regulation does not publish. One cracked array, B-17, loses 3.07 MWh over the 72-hour forecast, 7,509 rupees. The 30-day figure is an illustration and is labelled as one: B-17 loses 1.01 MWh a day, so 30 days is 30.3 MWh, which is 74,114 rupees. It assumes the loss stays constant, which our own prognosis says it would not: the diode is projected to fail and the strings go open. It shows why continuous matters against an annual survey. The picture is the cost-of-waiting table from the B-17 incident: repair now, in 6 hours, tomorrow or in 3 days, each with the energy and the rupees lost. Its figures are as captured and move with site time. This is the thing a detector cannot give you. Wider benefit, stated qualitatively: more of the installed clean capacity is delivered; crews are not planned into the field above 40 degrees; and no drone is flown where imaging would add nothing, for example a soiled array. On the Analytics screen, the modelled arrays are 178 kW short of the model now, 0.6 per cent of their output, and lose 9.66 MWh over 72 hours out of 903 expected.

---

## Slide 8: RESEARCH AND REFERENCES

**Covers:** Round 1 section 7: future scope (research, patent, startup); references; declaration of third-party work

### Text on the slide

```
[FUTURE SCOPE: research, patent, startup]
```

```
(icon: flask) Research
Finish the thermal classifier and report its held-out metric per class. Fit the forecast band to real forecast misses. Radiometric thermal data, and field validation of the deadline model.
```

```
(icon: file) Patent
None filed. Candidate for a novelty search: a defect, its mechanism and a forecast turned into a repair deadline and a crew plan that re-derives live.
```

```
(icon: rocket) Startup
Software for O&M contractors and owners of utility-scale plants, fed by the plant’s own SCADA. Needs a permissively licensed detector first.
```

```
[REFERENCES]
```

```
1. Sheppard, Cook, Perullo (Turbine Logic); Fregosi, Bolen (EPRI). Field Experience Detecting PV Underperformance in Real Time Using Existing Instrumentation. osti.gov/servlets/purl/1960134
2. NREL. PVWatts Version 5 Manual, NREL/TP-6A20-60272. docs.nrel.gov/docs/fy14osti/60272.pdf
3. SECI auction, Bhadla Phase-III Solar Park, 2017. iea.org/policies/6373-auction-of-solar-corporation-of-india-seci and pv-magazine-india.com/?p=1613
4. Raptor Maps. InfraredSolarModules dataset. github.com/RaptorMaps/InfraredSolarModules
5. Solar Panel Fault Detection v2, Roboflow Universe. universe.roboflow.com/solarvision-gwljt/solar-panel-fault-detection
6. CERC Deviation Settlement Mechanism Regulations, 2024: cited as context only. No charge is computed from it.
```

```
[WHAT WE BUILT ON: third-party work, declared]
```

| Kind | What | Licence |
|---|---|---|
| Dataset | Solar Panel Fault Detection v2, Roboflow: 921 images | CC BY 4.0 |
| Dataset | InfraredSolarModules, Raptor Maps: 20,000 images | MIT |
| Pre-trained model | Ultralytics YOLOv8n, fine-tuned by us | AGPL-3.0 |
| External API | Groq, model openai/gpt-oss-120b | Groq terms |
| Libraries | Next.js, React, three, React Three Fiber, drei, zustand, zod, Tailwind | MIT |
| Libraries | onnxruntime-web, highs (HiGHS in WebAssembly) | MIT |
| Libraries | postprocessing; lucide-react; playwright-core, TypeScript | Zlib; ISC; Apache-2.0 |
| Typeface | IBM Plex, in the product | OFL |

```
Reference we owe: the loop follows the RAISE-winning Robinsun solar agent. We rebuilt it with a trained defect model and a physics-grounded simulation in place of a physical drone.
Data: no personal or proprietary data is used. Both datasets are public and openly licensed. Telemetry is simulated.
```

```
Team SIGMOID
Rehaan Ahmad Khan, Shantanu Singh, Lakshita Rawat, Krishna Agarwal
Code: github.com/RAK2315/solar-proj (AGPL-3.0)
```

### Pictures

None. This slide is native shapes, text, tables and icons only.

### Speaker notes

Future scope first. Research: finish the thermal classifier on InfraredSolarModules and report its held-out metric per class; replace the declared forecast band with an error model fitted to real forecast misses; move from 8-bit normalised thermal images to radiometric ones; validate the deadline model against real field failures. Patent: nothing has been filed. If we pursue one, the candidate to examine first is the method that turns a defect, its mechanism and a forecast into a repair deadline and a crew plan that re-derives live. That needs a proper novelty search before any claim. Startup: the natural customers are O&M contractors and asset owners of utility-scale plants; a commercial version needs a permissively licensed detector. OWNER TO CONFIRM: the patent and startup lines state only what the repository supports. Replace them with the team's actual intentions if there are any. The right side is the code-of-conduct declaration: every third-party library, model, dataset and external API. No personal data and no proprietary data is used. Versions are read from the installed packages. Credit two things out loud. The loop follows the RAISE-winning Robinsun solar agent: we rebuilt the loop, and where they had a physical drone we put a trained defect model and a physics-grounded simulation. And the thermal data is Raptor Maps' own open dataset. The Turbine Logic and EPRI paper is hosted on OSTI. It is not an NREL paper.
