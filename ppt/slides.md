# SURYA AGENT: Round 1 deck, slide by slide

JSS AI FORGE 36, AI for Industry 4.0 track, team SIGMOID. 8 slides, 16:9 (13.333 in by 7.5 in), light theme.

Written by `ppt/build/build_deck.cjs` together with `SURYA-AGENT-Round1.pptx`, so the two agree.
Edit the script and rebuild; an edit made here alone will be overwritten.

Every slide has the same frame: a "Sigmoid" mark in an outlined oval top left, the slide title centred in a
black serif, "JSS AI FORGE 36 / AI for Industry 4.0" top right, and a blue footer band with the slide number.
Blocks sit in heavy rounded outlines: navy by default, red for risks, green for how each is answered.

For each slide: the title, which of the seven Round 1 sections it covers, every piece of text in
reading order, the pictures and where each sits, and the speaker notes. A line in [SQUARE BRACKETS]
is the heading of an outlined block. A line starting "(icon: name-colour)" is an icon row: the icon is
`images/icons/name-colour.png`. Text is exact: do not reword a figure, round it, or add one. Where every
figure comes from is in `SOURCES.md`.

Pictures are in `images/`, named by slide number. All are captures of the running prototype in its
light theme, taken on 7 Oct 2026 at 1920 by 1080; most are cropped so the subject can be seen.
Slides 2, 4, 6 and 8 carry no picture on purpose. Slide 7 has one native chart.
Fonts: Montserrat throughout, Times New Roman for the slide title.

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
THE PROBLEM:  the plant knows its output fell, not why, or how long it can wait.
```

```
PLANT TELEMETRY (SCADA)
```

```
WHAT IT SAYS
An inverter or a string is producing less than it should
```

```
WHAT IT CANNOT SAY
Which module?    Dirt or damage?    How urgent?
```

```
SO THE FAULT WAITS  Someone drives out to look, or it sits until the next aerial survey. In our model, soiling and a cracked cell look the same from telemetry: only imaging separates them.
```

```
Annual
the usual cadence of aerial infrared inspection
```

```
Weeks to months
faults below the inverter go undetected
```

```
−41.7 %
one cracked array in our model: 3.07 MWh, ₹7,509 lost in 72 h
```

```
Sources: Turbine Logic and EPRI, osti.gov/servlets/purl/1960134; third figure, our PV model.
```

```
[WHO BENEFITS]
```

```
(icon: tools-navy) O&M crews
Which array, what repair, by when
```

```
(icon: rupee-green) Asset owners
Loss in MWh and in rupees
```

```
(icon: bolt-purple) Grid off-taker
More contracted energy delivered
```

```
[EXISTING GAPS]
```

| Approach | What it gives | What is still missing |
|---|---|---|
| Plant SCADA and inverter monitoring | Output fell, at an inverter or a string | Which module, why, and how urgent |
| Annual aerial infrared survey | A thermal map of the whole field | Flown once a year, so faults sit for weeks to months |
| Drone and AI inspection platforms (Raptor Maps, Zeitview, Sitemark) | Thermal imaging, AI defect classes, 3D twins under way | A report of defects. No deadline, no crew plan, no re-plan when conditions change |
| SURYA AGENT | A ranked work order with a computed deadline, re-derived live, arithmetic on screen | A prototype on simulated telemetry. Not yet connected to a real plant |

```
(icon: search-red) What nobody hands over
A defect report tells you a panel is bad. It does not tell you when the damage stops being recoverable, which job the crew should do first, or what changes when the weather turns.
```

```
(icon: scale-navy) What we do not claim
The twin and the detection already exist elsewhere, and our thermal evidence comes from Raptor Maps’ own open dataset. What we add is the step after the picture.
```

```
Gaps from our prior-art sweep of 4 Oct 2026, read from each company’s public material. Not a benchmark.
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
PROPOSED SOLUTION:  one closed loop, from a telemetry anomaly to an approved work order.
```

```
Loop, left to right: 1 Telemetry anomaly > 2 Agent triage > 3 Drone dispatch > 4 Evidence capture > 5 Vision analysis > 6 Prognosis and deadline > 7 Ranked plan > 8 Human approval
```

```
Actual problem
```

```
Proposed solution
```

| Actual problem | Proposed solution |
|---|---|
| Faults wait for a yearly aerial survey | Every array watched continuously against a physics model |
| Telemetry cannot tell dirt from damage | A drone is sent only when imaging would add something |
| A defect report carries no deadline | A deadline computed from the defect and the 72 h forecast |
| What to fix first is a judgement call | One fixed formula, with its arithmetic on screen |
| A plan goes stale when the weather turns | The queue and the crew day re-derive live |
| Automation nobody signed off | Nothing is scheduled until an operator approves |

```
Honest wording: B-17 is diagnosed from a real thermal capture. The other 119 arrays are flagged from modelled signature. The build fails if the two are mixed.
```

```
The running prototype
Not a mock-up. The detector we trained runs in the browser on the frame the drone’s camera returned: Cracked 0.89 on B-17. The thermal pass beside it is a rendering of the simulated scene.
```

```
github.com/RAK2315/solar-proj
```

```
Detection, in the browser
```

```
Thermal pass, rendered
```

```
[WHERE THE AI IS]
```

```
(icon: eye-navy) Vision detector, trained by us
YOLOv8n on 921 labelled photographs. Cracked AP@50 0.995, held-out test split.
```

```
(icon: robot-purple) Agent reasoning
openai/gpt-oss-120b on Groq writes the triage. It never supplies a number.
```

```
(icon: clock-orange) Prognosis that ends in an hour
A thermal-dose model and the 72 h forecast give "act before 14:00".
```

```
(icon: calc-green) Crew plan, exact optimisation
A mixed-integer program, HiGHS in WebAssembly, capped at 50 ms.
```

```
Not AI, on purpose: the queue order is a fixed formula.  In progress, no result claimed: a thermal classifier on Raptor Maps’ InfraredSolarModules.
```

### Pictures

- `images/03-drone-detection.png`: right, upper block: the drone’s camera frame over B-17 with the detector’s box
- `images/03-thermal-pass.png`: right, upper block, beside it: the thermal pass over the same module

### Speaker notes

This is the product. Seven of the eight steps run without a person; the eighth is a person on purpose. The drone is not the product: it is how the agent gets evidence it cannot infer from telemetry. The two pictures are from the running prototype on 7 October 2026, flown at 60 times site speed. First: the frame the drone's camera returned over B-17, with the box our detector drew on it in the browser. On this flight it returned Cracked at 0.89. On the photograph the committed figure was measured on, the same weights return 0.91 against a committed 0.9084. Second: the same pass in false colour; it is a rendering of the simulated scene, not a thermal capture. The real thermal evidence is a UAV frame from Raptor Maps' open dataset, processed into the panel's 5 by 7 cells: four hot cells in row 2, columns 3 to 6, about 2.8 degrees above the rest, one connected band. The detector: YOLOv8n fine-tuned on 921 images, CC BY 4.0. Cracked AP at 50 is 0.995 on the held-out test split. The language model, openai/gpt-oss-120b on Groq, writes the triage in words and never supplies a number: the server recomputes every fact and cross-checks the reply. The queue order is deliberately not AI. The thermal classifier is in progress: a notebook and 119 modelled frames exist, no model is trained and no score is quoted. Vocabulary: B-17 is diagnosed, because it has a real capture. The other 119 arrays are flagged from modelled signature. The loop follows the RAISE-winning Robinsun solar agent, credited on the last slide.

---

## Slide 4: TECH STACK AND FLOW

**Covers:** Round 1 section 6: prototype architecture

### Text on the slide

```
A physics model, a trained detector and an exact solver, all running in the browser, behind a build that fails if a number drifts.
```

```
Flow diagram, top to bottom, with a label at the left of each row:
```

```
BEFORE THE BUILD: PV model and generators, Python | Detector training, YOLOv8n to ONNX, on Colab | Thermal cell grid, classical image processing
```

```
BUILD GATE: Zod schemas and 16 invariants > scan for hardcoded numbers and wording > 457 tests, physics golden-tested against Python > compile
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

```
(icon: react-blue) Frontend: Next.js 15 + React 19 + TypeScript
```

```
(icon: cube-blue) 3D twin: three.js + React Three Fiber
```

```
(icon: eye-blue) Vision: YOLOv8n on ONNX Runtime Web
```

```
(icon: calc-blue) Optimiser: HiGHS in WebAssembly
```

```
(icon: robot-blue) Agent: openai/gpt-oss-120b on Groq
```

```
(icon: python-blue) Offline: Python + Colab T4 for training
```

```
[WHY THESE CHOICES]
```

```
(icon: globe-navy) Everything in the browser no GPU and no model server, so nothing can cold-start in front of a judge.
```

```
(icon: scale-green) An exact solver beside a heuristic a new rule is one line of a model, and the answer is provable.
```

```
(icon: shield-purple) The model writes words, not numbers every figure comes from the physics and is cross-checked.
```

```
(icon: sync-teal) One clock seek backwards and every screen is correct. Same input, same site.
```

### Pictures

None. This slide is native shapes, text, tables and icons only.

### Speaker notes

Read the left side top to bottom. Before the build: Python scripts hold the PV model and generate the site and its telemetry; a Colab notebook trained the detector and exported it to ONNX; an image-processing script turned a real thermal frame into the cell grid. The build gate runs in order: validate every data file against its Zod schema and 16 invariants, scan the source for hardcoded numbers and forbidden wording, run 457 tests, then compile. The TypeScript physics is golden-tested against the Python. If a headline figure moves, the build fails, not the demo. At run time, in the browser, there is one clock, the site time. Everything on screen is a pure function of that clock and the scenario events, which is why you can seek backwards and a dropped hazard un-happens. The detector and the solver both run as WebAssembly on the operator's machine. There is exactly one network call: the triage route, which calls Groq and cross-checks the reply against the physics on the server. There is no database. A work order is created only by the operator's click. On the choices: we refused a second service because a cold start on stage is a demo failure, so the solver is HiGHS compiled to WebAssembly and not OR-Tools behind a Python server. This diagram is drawn from native shapes so it can be edited.

---

## Slide 5: OUR USP

**Covers:** Round 1 section 4: innovation and uniqueness

### Text on the slide

```
THE PLAN, NOT THE PICTURE:  others detect and report. We hand over a deadline and a plan.
```

```
[INNOVATION AND UNIQUENESS]
```

```
(icon: clock-navy) A computed deadline
Not a flagged defect: an hour, worked out from the defect, its mechanism and the 72 h forecast.
```

```
(icon: sync-teal) A plan that re-derives live
Change the conditions and the queue, the deadlines and the crew day are worked out again.
```

```
(icon: calc-purple) Arithmetic on screen
The ranking formula with its inputs on every job, and a ? on every number for its source.
```

```
(icon: user-red) A human gate
The agent proposes. Only an operator’s click creates a work order.
```

```
(icon: plane-green) It says no
A dirty array gets a wash crew and no flight: imaging it would add nothing.
```

```
score = loss per day × severity × urgency ÷ access
B-17 as captured: 1.01 MWh × 3.0 × 7.69 ÷ 1.0 = 23.29
Urgency is 1 + 24 ÷ hours left. Next is A-08 at 0.81.
```

```
Every job shows its working.
```

```
The what-if sandbox: a dust storm dropped on Zone B.
```

```
[THE LIVE DEMONSTRATION]
```

```
Name a hazard, drag it onto the field, and the whole plan re-derives.
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
from drop to the re-planned frame, in Chrome. Budget 150 ms. 60.1 fps.
```

### Pictures

- `images/05-queue-arithmetic.png`: right, upper block: the repair queue on the Queue screen, each job with its arithmetic
- `images/05-sandbox-hazard.png`: right, upper block, beside it: the Sandbox screen after a dust storm was dropped on Zone B

### Speaker notes

Our difference is deliberately not the twin and not the detection. It is what happens after the picture: a deadline, a plan that re-derives, the arithmetic, and a human gate. The first picture is the Queue screen. Every job prints its own working. At the moment captured, B-17 reads 1.01 MWh a day, times 3.0 for critical, times 7.69 urgency, divided by 1.0 access, equals 23.29. Urgency is 1 plus 24 over the hours left, so the score rises as the deadline closes and reads differently at a different minute. If a judge asks how it prioritises, open src/lib/ranking.ts. The second picture is the live demonstration. A judge names a hazard; we drag it onto the field. Here a dust storm was dropped over part of Zone B. The screen reads: 8 arrays affected, 6 jobs added, 1 displaced, B-17 still first. Over the next 72 hours the dust costs the modelled arrays 5.61 MWh, 13,714 rupees at 2.446 rupees per kWh, forecast band 12,518 to 14,880. Measured in Chrome on our laptop: from releasing the pointer to the re-planned frame being painted takes 31 to 40 milliseconds against a budget of 150, and the twin holds 60.1 frames a second. Be straight about three things. The hazard strengths are declared assumptions; none is a measurement of Bhadla. The forecast band is a declared plus or minus 5 to 15 per cent on irradiance, not a fitted error model. And at this moment the heuristic matched the optimum; we do not claim the solver beats it here. A 5.8 per cent difference does exist on one ordinary afternoon, 14:17 site time.

---

## Slide 6: FEASIBILITY AND VIABILITY

**Covers:** Round 1 section 6, continued: technical feasibility, and scalability and business viability

### Text on the slide

```
[FEASIBILITY]
```

```
(icon: code-navy) Technical: it is built. 457 tests on every build, 60.1 fps, a hazard re-planned in 31 to 40 ms, detector AP@50 0.995 on a held-out split.
```

```
(icon: coins-green) Financial: no GPU and no model server. The detector and the solver run in the browser; the one outside call is to a language model.
```

```
(icon: desktop-purple) Operational: one view in any modern browser. It is built to sit beside existing SCADA: the simulator is the one part to replace.
```

```
[VIABILITY]
```

```
(icon: users-navy) Adoption: for O&M contractors and plant owners. Nothing to install, and every figure is in MWh and in rupees at the plant’s own tariff.
```

```
(icon: calendar-green) Sustained: a build gate of 16 invariants fails the build, not the demo, if a number drifts. The same input always gives the same site.
```

```
(icon: puzzle-purple) Grows: every array is evaluated by the same function, so a larger plant is more rows, not a new design. Tested to 120 arrays.
```

```
[POTENTIAL CHALLENGES AND RISKS]
```

```
[HOW WE ADDRESSED THEM]
```

```
The telemetry is simulated, not from a real plant. There is no live site behind the prototype.
```

```
Every coefficient is stated and the equations are NREL PVWatts. The browser model is tested against the Python on every build.
```

```
A language model can invent a number, or be rate-limited on the day. It is the one outside service we depend on.
```

```
It writes words, never numbers. The server recomputes every fact and rejects a reply that disagrees. Without it, the rest still works.
```

```
The detector learned from ground-level photographs. And we hold real thermal evidence for one array only.
```

```
Reported per class on a held-out split, and scored on the drone’s own frame: 0.89. Only B-17 is called diagnosed.
```

```
An assumption can pass for a fact. Hazard strengths, crew hours and the forecast band are ours.
```

```
Each is labelled on screen as an assumption. The thermal classifier is not built, so no score is claimed for it.
```

```
A weak laptop may not hold the 3D twin. A demo that stutters is worse than none.
```

```
A 2D map takes over by itself below 30 frames a second, on the same data. The detector’s AGPL licence is one script away from a permissive one.
```

### Pictures

None. This slide is native shapes, text, tables and icons only.

### Speaker notes

Feasibility is argued from measurements taken on our own laptop, in Chrome, each recorded in the repository: 457 automated tests on every build; the twin at 60.1 frames a second at both 1366 by 768 and 1920 by 1080; a dropped hazard re-planned on screen in 31 to 40 milliseconds against a budget of 150; the crew plan solved in 10.8 milliseconds on the site's own days and cut off at 50; the detector at AP at 50 of 0.995 for cracked panels on the held-out test split of 42 images, and 0.89 on the drone's own frame. Viability. Each array is evaluated by the same pure function, so a larger plant is more rows, not a new design; we have tested to 120 arrays and claim no larger figure. Then the risks, said before a judge has to ask. There is no live plant behind this: telemetry for the 120 arrays is generated from the PV model with stated coefficients, temperature coefficient minus 0.0037 per degree, NOCT 45 degrees, inverter efficiency 0.98. The drone flight is a 3D simulation. Declared assumptions, each labelled on screen: hazard strengths; crew hours per repair, for example 3 hours for a module replacement and 1 hour for a wash; the forecast band; the 25 degree thermal span; the 65 degree threshold and 5-hour budget behind the deadline. The thermal classifier has no model and no metric, so no score is claimed. The detector is trained with Ultralytics YOLOv8, which is AGPL-3.0 and makes this repository AGPL-3.0. A commercial version would retrain on a permissively licensed detector; the README notes that switching to RF-DETR, Apache-2.0, touches one script.

---

## Slide 7: IMPACT AND BENEFITS

**Covers:** Round 1 section 5: expected impact

### Text on the slide

```
[IMPACT]
```

```
(icon: search-navy) Faults found as they develop, not at the next survey
Aerial surveys are usually yearly, so faults sit for weeks to months. This watches every array all the time.
```

```
(icon: clock-navy) A deadline in place of an alarm
B-17 must be acted on before 14:00. After that the damage is projected to stop being recoverable.
```

```
(icon: rupee-navy) Every loss priced, with its working
3.07 MWh over 72 h is ₹7,509 at ₹2.446/kWh: the two SECI Bhadla Phase-III lots, blended by capacity.
```

```
(icon: chart-navy) One fault, left for a month
₹74,114: 1.01 MWh/day × 30 days. An illustration that assumes a constant loss, not a measurement.
```

```
[BENEFITS]
```

```
(icon: tools-navy) Operational: the crew knows what to do first
A ranked list with reasons, and a day plan for two crews. No guessing which alarm matters.
```

```
(icon: coins-green) Economic: more energy from capacity already built
Loss stated in rupees at the plant’s own tariff, and no drone flown where imaging adds nothing.
```

```
(icon: leaf-teal) Environmental: more clean energy delivered
A plant that loses less to faults delivers more of what it was built for.
```

```
(icon: hat-purple) Social: safer field work
The planner keeps crews out of the field in the hours above 40 °C.
```

```
[THE COST OF WAITING: ARRAY B-17]
```

```
Native bar chart, "Energy lost if the repair starts then (MWh)": Repair now 0.00 | In 6 hours 0.77 | Tomorrow 1.51 | In 3 days 4.82
```

```
Fix it now and nothing more is lost. Wait three days and it is 4.82 MWh, ₹11,795.
From the B-17 incident screen, as captured on 7 Oct 2026: ₹1,894 at 6 hours, ₹3,704 tomorrow. All three delays run past the 14:00 deadline. The figures move with site time.
A defect report cannot give this.
```

```
Analytics, in the prototype: expected against actual for the modelled arrays over 72 h, and the shortfall by cause. No deviation settlement charge is computed: rupees are lost energy times the tariff, and nothing else.
```

### Pictures

- `images/07-analytics-outlook.png`: right block, under the chart: the Analytics screen, expected against actual over 72 hours and the loss by cause

### Speaker notes

Impact is argued from arithmetic a judge can check, not from a market statistic we cannot source. The tariff: Bhadla Phase-III was auctioned by SECI in 2017 as two lots, 200 MW to ACME at 2.44 and 300 MW to SBG Cleantech at 2.45 rupees per kWh. Blended by capacity that is 2.446. We never quote 2.44 alone. No deviation settlement charge is computed or claimed: the CERC formula depends on a parameter the regulation does not publish. One cracked array, B-17, loses 3.07 MWh over the 72-hour forecast, 7,509 rupees. The 30-day figure is an illustration and is labelled as one: B-17 loses 1.01 MWh a day, so 30 days is 30.3 MWh, which is 74,114 rupees. It assumes the loss stays constant, which our own prognosis says it would not: the diode is projected to fail and the strings go open. It shows why continuous matters against an annual survey. The chart is the cost-of-waiting table from the B-17 incident, as captured on 7 October 2026: repair now and nothing more is lost; start in 6 hours and it is 0.77 MWh, 1,894 rupees; tomorrow 1.51 MWh, 3,704 rupees; in 3 days 4.82 MWh, 11,795 rupees. The figures move with site time. All three delays are past the 14:00 deadline. This is the thing a defect report cannot give you. The picture under it is the Analytics screen: expected against actual for the modelled arrays over 72 hours, with the loss by cause. The modelled arrays are 178 kW short of the model now, 0.6 per cent of their output, and lose 9.66 MWh over 72 hours out of 903 expected. Wider benefit, stated qualitatively: more of the installed clean capacity is delivered; crews are not planned into the field above 40 degrees; and no drone is flown where imaging would add nothing.

---

## Slide 8: RESEARCH AND REFERENCES

**Covers:** Round 1 section 7: future scope (research, patent, startup); references; declaration of third-party work

### Text on the slide

```
[FUTURE SCOPE]
```

```
(icon: flask-navy) Research: finish the thermal classifier and report its held-out metric per class. Fit the forecast band to real misses. Radiometric thermal data, and field validation of the deadline model.
```

```
(icon: file-purple) Patent: none filed. Candidate for a novelty search: a defect, its mechanism and a forecast turned into a repair deadline and a crew plan that re-derives live.
```

```
(icon: rocket-green) Startup: software for O&M contractors and owners of utility-scale plants, fed by the plant’s own SCADA. Needs a permissively licensed detector first.
```

```
[REFERENCES]
```

```
1. Sheppard, Cook, Perullo (Turbine Logic); Fregosi, Bolen (EPRI). Field Experience Detecting PV Underperformance in Real Time Using Existing Instrumentation. osti.gov/servlets/purl/1960134
2. NREL. PVWatts Version 5 Manual, NREL/TP-6A20-60272. docs.nrel.gov/docs/fy14osti/60272.pdf
3. SECI auction, Bhadla Phase-III Solar Park, 2017. iea.org/policies/6373-auction-of-solar-corporation-of-india-seci; pv-magazine-india.com/?p=1613
4. Raptor Maps. InfraredSolarModules. github.com/RaptorMaps/InfraredSolarModules
5. Solar Panel Fault Detection v2, Roboflow Universe. universe.roboflow.com/solarvision-gwljt/solar-panel-fault-detection
6. CERC Deviation Settlement Mechanism Regulations, 2024: context only. No charge is computed from it.
```

```
[WHAT WE BUILT ON]
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
(icon: shield-teal) Reference we owe: the loop follows the RAISE-winning Robinsun solar agent. We rebuilt it with a trained defect model and a physics-grounded simulation in place of a physical drone. No personal or proprietary data is used; telemetry is simulated.
```

```
(icon: users-navy) Team SIGMOID: Rehaan Ahmad Khan, Shantanu Singh, Lakshita Rawat, Krishna Agarwal. Code: github.com/RAK2315/solar-proj (AGPL-3.0)
```

### Pictures

None. This slide is native shapes, text, tables and icons only.

### Speaker notes

Future scope first. Research: finish the thermal classifier on InfraredSolarModules and report its held-out metric per class; replace the declared forecast band with an error model fitted to real forecast misses; move from 8-bit normalised thermal images to radiometric ones; validate the deadline model against real field failures. Patent: nothing has been filed. If we pursue one, the candidate to examine first is the method that turns a defect, its mechanism and a forecast into a repair deadline and a crew plan that re-derives live. That needs a proper novelty search before any claim. Startup: the natural customers are O&M contractors and asset owners of utility-scale plants; a commercial version needs a permissively licensed detector. OWNER TO CONFIRM: the patent and startup lines state only what the repository supports. Replace them with the team's actual intentions if there are any. The right side is the code-of-conduct declaration: every third-party library, model, dataset and external API. No personal data and no proprietary data is used. Versions are read from the installed packages. Credit two things out loud. The loop follows the RAISE-winning Robinsun solar agent: we rebuilt the loop, and where they had a physical drone we put a trained defect model and a physics-grounded simulation. And the thermal data is Raptor Maps' own open dataset. The Turbine Logic and EPRI paper is hosted on OSTI. It is not an NREL paper.
