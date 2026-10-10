# SURYA AGENT: Round 1 deck, complete content specification

This file and the `images/` folder beside it are everything needed to build the
deck. Build it exactly as written. Do not add, reword, round or re-unit any
figure, and do not add a slide, a block or a picture that is not listed here.

| | |
|---|---|
| Event | JSS AIFORGE 36, a 36-hour AI hackathon, JSS University, Noida, 23 to 24 October 2026 |
| Round | Round 1, idea submission. **Read by judges with nobody presenting.** |
| Theme | AI for Industry 4.0: manufacturing, predictive maintenance, quality control, automation, digital twins |
| Team | Sigmoid, JSS University, Noida |
| Slides | Eight, 16:9, in the fixed order below. No speaker notes anywhere. |
| Framing | **A proposal.** The idea is written as "we propose" and "will". An early prototype exists and is shown only as evidence that the idea is feasible; everything it does is labelled "early prototype" and what is simulated is said plainly. |

How to read this file:

- **Text inside a code block is exact slide text.** Copy it character for character.
- A line starting `Builder note:` is an instruction to you and never appears on a slide.
- `[OWNER TO FILL: ...]` marks the only blanks. Leave the bracketed text visible in
  the draft so the owner can see and replace it. Never invent a value for one.
- Every block has an id such as `2-C`, a position and a share of the slide.
  Positions are given on the content area, which is the slide minus the header
  and the footer (section A).

---

## A. Design brief

**Look.** White, dense, built to be read at a desk and not projected. Each slide
reads like a one-page brief. No dark slides, no gradients, no stock photographs,
no clip art, no decorative shapes, no animation, no transitions.

**Canvas.** 16:9, 13.333 in by 7.5 in. Margins 0.3 in.

**Frame, identical on all eight slides.**

| Part | Where | What |
|---|---|---|
| Team mark | Top left, about 2.0 in by 0.6 in | The word `Sigmoid` in bold navy inside an outlined navy oval, white fill. No logo file exists for the team; draw it. |
| Title | Top centre | The slide title in capitals, bold black serif (Times New Roman), about 30 pt. |
| Event mark | Top right, right-aligned | Line 1 `JSS AIFORGE 36` bold navy 16 pt. Line 2 `AI for Industry 4.0` bold teal 11 pt. If the owner supplies the event brochure as `images/brochure.jpg`, the JSS University crest from its top left may be placed, small, to the left of line 1. Do not redraw or approximate any logo. |
| Footer | Full-width band along the bottom, 0.4 in high, solid blue | Centred, white bold 10 pt: `JSS AIFORGE 36 · Round 1 idea submission · Team Sigmoid`. Right, white bold: the slide number. |

**Type.** Montserrat for everything except the slide title. Body 10 to 11 pt bold
or semibold in near-black; captions and source notes 8 to 9 pt in blue; block
headings 16 to 18 pt bold capitals in navy. If Montserrat is unavailable use
Calibri or Arial, never a serif, and keep the sizes.

**Colour.**

| Name | Hex | Used for |
|---|---|---|
| Navy | `#0B3C6F` | Block outlines, block headings, default lead text |
| Blue | `#1565C0` | Footer band, captions, source notes |
| Teal | `#00796B` | Second accent, the "in the browser" row of the architecture |
| Red | `#C62828` | Risks, problems, the human-approval step |
| Green | `#2E7D32` | Answers to risks, benefits |
| Orange | `#E07A10` | Third accent, numbers in step labels |
| Purple | `#6A3FB5` | Fourth accent |
| Pale blue | `#EAF2FB` | Fill of small figure boxes and note boxes |
| Ink | `#111111` | Body text |

**Block.** A rounded rectangle, white fill, 2.25 pt outline, navy unless this file
says red, green or teal. The heading sits inside at top left in bold capitals.

**Icon row.** A flat single-colour icon about 0.4 in square on the left, then a
bold coloured lead, then one or two sentences in ink. Use one consistent icon
family (Font Awesome solid or similar). Each row below names its icon in plain
words, for example `icon: clock, navy`. If an icon is not available use the
nearest plain one; never use an emoji.

**Stat box.** Pale blue fill, thin navy outline. A large bold figure (20 to 24 pt)
in the stated colour with a two-line caption in ink under it.

**Tables.** Navy header row with white bold text, thin navy rules, white body rows.

**Pictures.** Every picture is a real capture of the early prototype, taken on
10 Oct 2026 in Chrome at 1920 by 1080 in its light theme, and cropped. Place each
with a thin navy outline, keep its aspect ratio, never stretch, recolour, retouch
or redraw it, and never generate a picture. Put its caption directly under it in
blue 9 pt. Pictures appear on slides 1, 3, 5 and 7 only. Slides 2, 4, 6 and 8 are
shapes, text, tables and icons.

**Everything else is native.** Diagrams, tables and stat boxes are drawn from
editable shapes and text, never pasted as images.

---

## B. Slide 1: title

**Slide title:** `SURYA AGENT`

Builder note: this slide says what the idea is in one glance, shows that an early
prototype exists, and gives the team.

### 1-A. Headline. Left column, top. About 55 % of the width, 30 % of the height.

Large bold navy, about 30 pt:

```
The plan, not the picture.
```

Under it, bold ink 13 pt:

```
We propose an AI agent that watches a utility-scale solar plant, sends a drone to verify what telemetry cannot, and hands the operator a ranked repair plan with a computed deadline. A person approves it before anything is scheduled, and the repair is checked afterwards.
```

### 1-B. Submission table. Left column, middle. About 55 % of the width, 22 % of the height.

Two columns, no header row; the first column has a pale blue fill.

| | |
|---|---|
| Event | JSS AIFORGE 36, Round 1 idea submission |
| Theme | AI for Industry 4.0: predictive maintenance, automation, digital twins |
| College | JSS University, Noida |
| Stage | A proposal, with an early prototype running in the browser on simulated telemetry |

### 1-C. Team table. Left column, under 1-B. About 55 % of the width, 20 % of the height.

Heading above the table, bold navy 12 pt:

```
Team Sigmoid
```

| Name | Department | Year |
|---|---|---|
| Rehaan Ahmad Khan (team leader) | [OWNER TO FILL: department] | [OWNER TO FILL: year] |
| Shantanu Singh | [OWNER TO FILL: department] | [OWNER TO FILL: year] |
| Lakshita Rawat | [OWNER TO FILL: department] | [OWNER TO FILL: year] |
| Krishna Agarwal | [OWNER TO FILL: department] | [OWNER TO FILL: year] |

### 1-D. Picture. Right column, top to middle. About 42 % of the width, 60 % of the height, inside a navy block.

- File: `images/01-twin-field.png` (1230 by 570).
- Caption:

```
Early prototype: a 3D twin of 120 arrays in three zones. The red array in Zone B is B-17. Simulated plant, captured 10 Oct 2026.
```

- What the reader should notice: one red array in a field of blue, and two orange ones.
- Cropped from the Site screen: the navigation rail, the event list, the camera
  tools, the legend and the queue panel were cut away so the field fills the frame.

### 1-E. Four stat boxes. One row across the full width at the bottom. About 18 % of the height.

Box 1, navy figure:

```
120 arrays
a modelled 500 MW block of Bhadla Solar Park, Rajasthan, watched against a physics model
```

Box 2, red figure:

```
−41.7 %
the shortfall on one cracked array in the model, B-17: 5 of its 7 strings bypassed
```

Box 3, orange figure:

```
3.07 MWh
lost over 72 h, ₹7,509, if nobody acts before 14:00
```

Box 4, green figure:

```
0.995
AP@50 for cracked panels, our trained detector, held-out test split of 42 photographs
```

---

## C. Slide 2: problem statement

**Slide title:** `PROBLEM STATEMENT`

Builder note: covers Round 1 items 1 and 2, the problem with its beneficiaries and
the existing gaps. No picture.

### 2-A. Lead line. Full width, top. One line.

`THE PROBLEM:` in bold navy 18 pt, the rest in bold ink 15 pt.

```
THE PROBLEM:  a solar plant knows its output fell, not why, or how long it can wait.
```

### 2-B. Diagram. Left half, upper. About 48 % of the width, 38 % of the height.

Draw from shapes:

1. Top box, centred, pale blue fill, navy outline: `PLANT TELEMETRY (SCADA)`
2. Two navy arrows down from it, one to each box below.
3. Lower left box, **green** outline, heading in green:

```
WHAT IT SAYS
An inverter or a string is producing less than it should
```

4. Lower right box, **red** outline, heading in red:

```
WHAT IT CANNOT SAY
Which module?    Dirt or damage?    How urgent?
```

5. One red arrow down from the red box to a full-width **red**-outlined box.
   `SO THE FAULT WAITS` in bold red, the rest in ink:

```
SO THE FAULT WAITS  Someone drives out to look, or it sits until the next aerial survey. In our model, soiling and a cracked cell look the same from telemetry: only imaging separates them.
```

### 2-C. Three stat boxes. Left half, under 2-B. One row. About 14 % of the height.

Box 1, navy figure:

```
Annual
the usual cadence of aerial infrared inspection
```

Box 2, orange figure:

```
Weeks to months
faults below the inverter go undetected
```

Box 3, red figure:

```
−41.7 %
one cracked array in our model: 3.07 MWh, ₹7,509 lost in 72 h
```

Source note directly under the row, blue 8 pt:

```
Sources: boxes 1 and 2, Sheppard et al., Turbine Logic and EPRI, osti.gov/servlets/purl/1960134. Box 3, our own PV model at ₹2.446/kWh (reference 3).
```

### 2-D. Block `WHO BENEFITS`. Left half, bottom. About 48 % of the width, 20 % of the height.

Three icon rows side by side.

- `icon: wrench and screwdriver, navy`

```
O&M crews
Which array, what repair, by when
```

- `icon: rupee sign, green`

```
Asset owners
Loss in MWh and in rupees
```

- `icon: lightning bolt, purple`

```
Grid off-taker
More contracted energy delivered
```

### 2-E. Block `EXISTING GAPS`. Right half, top. About 50 % of the width, 52 % of the height.

| Approach | What it gives | What is still missing |
|---|---|---|
| Plant SCADA and inverter monitoring | Output fell, at an inverter or a string | Which module, why, and how urgent |
| Annual aerial infrared survey | A thermal map of the whole field | Flown once a year, so faults sit for weeks to months |
| Drone and AI inspection platforms (Raptor Maps, Zeitview, Sitemark) | Thermal imaging, AI defect classes, 3D twins under way | A report of defects. No deadline, no crew plan, no re-plan when conditions change |
| SURYA AGENT, proposed | A ranked work order with a computed deadline, re-derived live, arithmetic on screen, checked after the repair | An early prototype on simulated telemetry. Not yet connected to a real plant |

Builder note: `SURYA AGENT, proposed` in bold navy.

### 2-F. Two icon rows and a note. Right half, bottom. About 50 % of the width, 34 % of the height. No outline.

- `icon: magnifying glass, red`, lead in red:

```
What nobody hands over
A defect report tells you a panel is bad. It does not tell you when the damage stops being recoverable, which job the crew should do first, or what changes when the weather turns.
```

- `icon: balance scale, navy`, lead in navy:

```
What we do not claim
The twin and the detection already exist elsewhere, and our thermal evidence comes from Raptor Maps' own open dataset. What we add is the step after the picture.
```

Note, blue 8 pt:

```
Gaps from our own reading of each company's public material, 4 Oct 2026. Not a benchmark.
```

---

## D. Slide 3: our solution

**Slide title:** `OUR SOLUTION`

Builder note: covers Round 1 item 3, the proposed AI solution. Two pictures.

### 3-A. Lead line. Full width, top.

```
PROPOSED SOLUTION:  one closed loop, from a telemetry anomaly to an approved, verified repair.
```

### 3-B. Loop strip. Full width, under 3-A. About 10 % of the height.

Nine boxes in one row, left to right, joined by navy arrows. Boxes 1 to 7 and 9:
pale blue fill, navy outline, the number in bold orange, the label in bold navy.
Box 8: solid red fill, white text.

```
1 Telemetry anomaly
2 Agent triage
3 Drone dispatch
4 Evidence capture
5 Vision analysis
6 Prognosis and deadline
7 Ranked plan
8 Human approval
9 Repair and verify
```

### 3-C. Problem and answer table. Left column. About 46 % of the width, 52 % of the height.

Two columns with a dash between them. Left column in bold red italic, right in
bold ink. Thin red rules under each left cell and navy rules under each right cell.

Column headings:

```
Actual problem
Problems faced today
```

```
Proposed solution
How we will answer each one
```

| Actual problem | Proposed solution |
|---|---|
| Faults wait for a yearly aerial survey | Every array watched continuously against a physics model |
| Telemetry cannot tell dirt from damage | A drone is sent only when imaging would add something |
| A defect report carries no deadline | A deadline computed from the defect and the 72 h forecast |
| What to fix first is a judgement call | One fixed formula, with its arithmetic on screen |
| A plan goes stale when the weather turns | The queue and the crew day re-derive live |
| Automation nobody signed off | Nothing is scheduled until an operator approves |
| A repair is closed without proof | Output is compared with the model at the same weather before the incident is closed |

### 3-D. Note box. Left column, bottom. About 46 % of the width, 16 % of the height. Pale blue fill.

`Honest wording:` in bold red, the rest in ink.

```
Honest wording: in the early prototype the plant, its telemetry, the drone flight and the repair crew are simulated. One array, B-17, carries real thermal evidence and is called diagnosed. The other 119 are flagged from modelled signature. The build fails if the two are mixed.
```

### 3-E. Block `EARLY PROTOTYPE: THE EVIDENCE FOR ONE ARRAY`. Right column, top. About 52 % of the width, 44 % of the height.

Two pictures side by side inside the block, the first about twice the width of the second.

**Picture 1**

- File: `images/03-evidence-dossier.png` (1080 by 557).
- Caption:

```
The B-17 dossier. Left: a simulated drone frame with our detector's own box. Middle: a real UAV thermal frame from Raptor Maps' open dataset. Right: that frame as the panel's 5 by 7 cells, four hot cells in one band across row 2, about +2.8 °C.
```

- What the reader should notice: the hot band in row 2 of the matrix lines up as
  one cluster, and the label on the box reads `Cracked 0.48`.
- Cropped from the Incident screen, Dossier view: the navigation rail, the page
  header and the evidence-chain column on the left were cut away.

**Picture 2**

- File: `images/03-thermal-pass.png` (1050 by 600).
- Caption:

```
The thermal pass in the 3D scene. A rendering that illustrates the measured band, not a thermal capture.
```

- What the reader should notice: a bright band across one row of the cracked module.
- Cropped from the Site screen during a followed flight: the rail, the event list
  and the array panel were cut away.

Under the two pictures, ink 9 pt:

```
Captured 10 Oct 2026. Detection on simulated drone frames is not yet reliable: on this pass 2 of 6 frames returned a box (0.33 and 0.48), and a second pass returned none. On real held-out photographs the same weights score AP@50 0.995. Code: github.com/RAK2315/solar-proj
```

### 3-F. Block `WHERE THE AI IS`. Right column, bottom. About 52 % of the width, 30 % of the height.

Four icon rows in a two by two grid.

- `icon: eye, navy`, lead in navy:

```
Vision detector, trained by us
YOLOv8n on 921 labelled photographs, running in the browser. Cracked AP@50 0.995, held-out test split.
```

- `icon: robot, purple`, lead in purple:

```
Agent reasoning
A language model writes the triage in words. It never supplies a number: the server recomputes every fact.
```

- `icon: clock, orange`, lead in orange:

```
Prognosis that ends in an hour
A thermal-dose model and the 72 h forecast give "act before 14:00".
```

- `icon: calculator, green`, lead in green:

```
Crew plan, exact optimisation
A mixed-integer program solved by HiGHS in WebAssembly, cut off at 50 ms.
```

Last line of the block, 9 pt. `Not AI, on purpose:` in bold navy, `Planned, no result yet:` in bold red, the rest in ink.

```
Not AI, on purpose: the queue order is a fixed formula.  Planned, no result yet: a thermal classifier on Raptor Maps' InfraredSolarModules.
```

---

## E. Slide 4: tech stack and flow

**Slide title:** `TECH STACK AND FLOW`

Builder note: covers Round 1 item 6, the prototype architecture. No picture. The
flow diagram is the main thing on the slide and is drawn from shapes.

### 4-A. Lead line. Left, top. About 62 % of the width.

Bold navy 12 pt:

```
Proposed architecture, as it runs in the early prototype: a physics model, a trained detector and an exact solver, all in the browser, behind a build that fails if a number drifts.
```

### 4-B. Flow diagram. Left. About 62 % of the width, 82 % of the height.

Four rows, top to bottom. Each row has a label at its left in bold navy capitals,
and a navy arrow points down from each row to the next.

**Row 1, label `BEFORE THE BUILD`.** Three boxes side by side, pale blue fill, navy
outline. First line bold navy, second line ink.

```
PV model and data generators
Python
```

```
Detector training
YOLOv8n to ONNX, on Google Colab
```

```
Thermal cell grid
classical image processing, no model
```

**Row 2, label `BUILD GATE`.** One full-width bar, solid navy fill, white bold text:

```
Zod schemas and 16 invariants   >   scan for hardcoded numbers and wording   >   511 tests, physics checked against the Python   >   compile
```

**Row 3, label `IN THE BROWSER`.** First a full-width bar, solid teal fill, white bold text:

```
ONE CLOCK: site time. Every screen is a pure function of it and of the scenario events
```

Then six boxes in two rows of three, white fill, teal outline. First line bold teal, second line ink.

```
PV model per array
plus dropped hazards
```

```
Ranked queue
one fixed formula
```

```
Crew plan
HiGHS in WebAssembly
```

```
Detector
ONNX Runtime Web
```

```
3D twin
React Three Fiber
```

```
Glass overlay
six screens, 2D map fallback
```

**Row 4, label `WHAT LEAVES IT`.** Two boxes side by side. Left: pale blue fill, navy
outline, navy text. Right: solid red fill, white text. First line bold.

```
ONE NETWORK CALL
/api/triage to a language model on Groq. The server recomputes the facts and cross-checks the reply
```

```
THE OPERATOR
approves or declines. Only then does a work order exist
```

### 4-C. Block `TECHNOLOGY STACK`. Right, top. About 35 % of the width, 44 % of the height.

Six rows: icon, a bold ink label, then the value in bold navy.

| Icon | Label | Value |
|---|---|---|
| `icon: atom, blue` | Frontend: | Next.js 15 + React 19 + TypeScript |
| `icon: cube, blue` | 3D twin: | three.js + React Three Fiber |
| `icon: eye, blue` | Vision: | YOLOv8n on ONNX Runtime Web |
| `icon: calculator, blue` | Optimiser: | HiGHS in WebAssembly |
| `icon: robot, blue` | Agent: | openai/gpt-oss-120b on Groq |
| `icon: code brackets, blue` | Offline: | Python + Google Colab T4 for training |

### 4-D. Block `WHY THESE CHOICES`. Right, bottom. About 35 % of the width, 44 % of the height.

Four icon rows. The lead runs straight into the sentence on the same line.

- `icon: globe, navy`, lead in navy:

```
Everything in the browser: no GPU and no model server, so there is nothing to host and nothing to cold-start.
```

- `icon: balance scale, green`, lead in green:

```
An exact solver beside a heuristic: a new rule is one line of a model, and the screen says when the two agree.
```

- `icon: shield, purple`, lead in purple:

```
The model writes words, not numbers: every figure comes from the physics and is cross-checked.
```

- `icon: circular arrows, teal`, lead in teal:

```
One clock: seek backwards and every screen is still correct. Same input, same site.
```

---

## F. Slide 5: our USP

**Slide title:** `OUR USP`

Builder note: covers Round 1 item 4, innovation and uniqueness. Two pictures. The
claim is what happens after detection; the twin and the detection are not pitched
as new.

### 5-A. Lead line. Full width, top.

```
THE PLAN, NOT THE PICTURE:  others detect and report. We propose to hand over a deadline and a plan.
```

### 5-B. Block `INNOVATION AND UNIQUENESS`. Left column. About 40 % of the width, 84 % of the height.

Six icon rows, then a formula box.

- `icon: clock, navy`, lead in navy:

```
A computed deadline
Not a flagged defect: an hour, worked out from the defect, its mechanism and the 72 h forecast.
```

- `icon: circular arrows, teal`, lead in teal:

```
A plan that re-derives live
Change the conditions and the queue, the deadlines and the crew day are worked out again.
```

- `icon: calculator, purple`, lead in purple:

```
Arithmetic on screen
The ranking formula with its inputs on every job, and a ? on every number for its source.
```

- `icon: person with a tick, red`, lead in red:

```
A human gate
The agent proposes. Only an operator's click creates a work order.
```

- `icon: paper plane, green`, lead in green:

```
It says no
A dirty array gets a wash crew and no flight: imaging it would add nothing.
```

- `icon: clipboard with a tick, orange`, lead in orange:

```
It checks its own repair
After the crew finishes, output is compared with the model at the same weather before a person closes the incident.
```

Formula box at the bottom of the block, pale blue fill. Line 1 bold navy, line 2 bold red, line 3 ink.

```
score = loss per day × severity × urgency ÷ access
B-17 as captured: 1.01 MWh × 3.0 × 7.33 ÷ 1.0 = 22.22
Urgency is 1 + 24 ÷ hours left. The next job, A-08, scores 0.81.
```

### 5-C. Block with two pictures. Right column, top. About 58 % of the width, 54 % of the height.

Stack them: picture 1 on top taking about two thirds of the block's height,
picture 2 as a wide strip under it.

**Picture 1**

- File: `images/05-sandbox-dust.png` (1305 by 880).
- Caption:

```
Early prototype, the what-if sandbox: a dust storm dragged onto Zone B. The arrays under it change colour and the queue on the right is re-ranked.
```

- What the reader should notice: the dashed oval labelled `Dust storm` over Zone B
  with the arrays under it turned orange and red, and on the right the lines
  `10 arrays affected now` and `6.67 MWh, ₹16,318`.
- Cropped from the Sandbox screen: the navigation rail, the hazard tools and the
  event list on the left, and the camera tools along the top, were cut away.

**Picture 2**

- File: `images/05-queue-day-plan.png` (1715 by 333).
- Caption:

```
Early prototype: every job prints its own working (left), and the crew day beside it is a proposal until a person approves (right).
```

- What the reader should notice: the row `1.01 MWh × 3.0 × 7.33 ÷ 1.0 = 22.22`
  under B-17, and the two crew rows of the day plan.
- Cropped from the Queue screen: the rail, the page header and the four summary
  tiles above, and the second and third jobs below, were cut away.

### 5-D. Block `THE WHAT-IF DEMONSTRATION`. Right column, bottom. About 58 % of the width, 30 % of the height.

One line under the heading, bold ink:

```
Name a hazard, drag it onto the field, and the whole plan re-derives. As captured on the early prototype, 10 Oct 2026:
```

Then three stat boxes in a row.

Box 1, heading in navy:

```
What the screen said
10 arrays affected, 6 jobs added, 1 displaced, site output 0.2 MW lower, B-17 still first.
```

Box 2, heading in green:

```
What it costs, in rupees
6.67 MWh, ₹16,318 over 72 h at ₹2.446/kWh. Forecast band ₹14,895 to ₹17,706.
```

Box 3, figure in red:

```
48 to 81 ms
from letting go of the hazard to the re-planned frame, four runs in Chrome. Budget 150 ms.
```

Note under the row, blue 8 pt:

```
The hazard's strength and the forecast band are declared assumptions, not measurements of Bhadla. The plan here was the exact optimum, and the simple heuristic matched it.
```

---

## G. Slide 6: feasibility and viability

**Slide title:** `FEASIBILITY AND VIABILITY`

Builder note: covers technical feasibility, scalability and business viability, and
says the risks before a judge has to ask. No picture. Four blocks in a two by two
grid, then one strip.

### 6-A. Block `FEASIBILITY`. Top left. About 49 % of the width, 30 % of the height.

Three icon rows. The lead runs straight into the sentence.

- `icon: code brackets, navy`, lead in navy:

```
Technical: an early prototype already runs the whole loop on a simulated plant. 511 automated tests on every build, a hazard re-planned in 48 to 81 ms, detector AP@50 0.995 on a held-out split.
```

- `icon: stack of coins, green`, lead in green:

```
Financial: no GPU and no model server. The detector and the solver run in the browser; the one outside call is to a language model.
```

- `icon: desktop monitor, purple`, lead in purple:

```
Operational: one view in any modern browser. It is designed to sit beside existing SCADA: the simulator is the one part to replace.
```

### 6-B. Block `VIABILITY`. Top right. About 49 % of the width, 30 % of the height.

Three icon rows.

- `icon: group of people, navy`, lead in navy:

```
Adoption: for O&M contractors and plant owners. Nothing to install, and every figure is in MWh and in rupees at the plant's own tariff.
```

- `icon: calendar with a tick, green`, lead in green:

```
Sustained: a build gate of 16 invariants fails the build if a number drifts. The same input always gives the same site.
```

- `icon: puzzle piece, purple`, lead in purple:

```
Grows: every array is evaluated by the same function, so a larger plant is more rows, not a new design. Run so far on 120 arrays.
```

### 6-C. Block `POTENTIAL CHALLENGES AND RISKS`. Bottom left. **Red** outline, red heading. About 49 % of the width, 40 % of the height.

Five bullets. Each must sit level with its answer in 6-D.

```
• The telemetry is simulated, not from a real plant. There is no live site behind the early prototype.
```

```
• A language model can invent a number, or be unavailable on the day. It is the one outside service we depend on.
```

```
• The detector learned from ground-level photographs. On simulated drone frames it returned a box on 2 of 6 frames (0.33 and 0.48) on one pass and none on another, and real thermal evidence is held for one array only.
```

```
• An assumption can pass for a fact. Hazard strengths, crew hours per repair and the forecast band are ours.
```

```
• A weak laptop may not hold the 3D twin. At 1920 by 1080 we measured 55 to 56 frames a second, at 1366 by 768, 60.
```

### 6-D. Block `HOW WE WILL ADDRESS THEM`. Bottom right. **Green** outline, green heading. About 49 % of the width, 40 % of the height.

Five bullets, level with 6-C.

```
• Every coefficient is stated and the equations are NREL's PVWatts. The browser model is tested against the Python on every build. A pilot replaces the simulator with a plant's own feed.
```

```
• It writes words, never numbers. The server recomputes every fact and rejects a reply that disagrees. Without it, every other screen still works.
```

```
• Reported as it is. An empty detection is never treated as proof a module is intact, only B-17 is called diagnosed, and validating on real aerial imagery is the next stage.
```

```
• Each is labelled on screen as an assumption. The thermal classifier is not built, so no score is claimed for it.
```

```
• A 2D map takes over by itself below 30 frames a second, on the same data.
```

### 6-E. Roadmap strip. Full width, bottom. About 12 % of the height.

Four boxes in one row joined by navy arrows, pale blue fill. First line bold navy, second line ink.

```
1 Now
Early prototype: simulated plant, public datasets
```

```
2 Validate
Thermal classifier; detection on real aerial imagery and varied viewpoints
```

```
3 Pilot
One plant's own SCADA feed and tariff, with its operators
```

```
4 Integrate
A real drone and a live work-order system
```

---

## H. Slide 7: impact and benefits

**Slide title:** `IMPACT AND BENEFITS`

Builder note: covers Round 1 item 5, expected impact. Impact is argued from
arithmetic a reader can check, never from a market statistic. One picture.

### 7-A. Block `EXPECTED IMPACT`. Left column, top. About 44 % of the width, 44 % of the height.

Four icon rows, all leads in navy.

- `icon: magnifying glass, navy`:

```
Faults found as they develop, not at the next survey
Aerial surveys are usually yearly, so faults sit for weeks to months. This will watch every array all the time.
```

- `icon: clock, navy`:

```
A deadline in place of an alarm
In the model, B-17 must be acted on before 14:00. After that the damage is projected to stop being recoverable.
```

- `icon: rupee sign, navy`:

```
Every loss priced, with its working
3.07 MWh over 72 h is ₹7,509 at ₹2.446/kWh: (200 MW × ₹2.44 + 300 MW × ₹2.45) ÷ 500 MW, the two SECI Bhadla Phase-III lots blended by capacity.
```

- `icon: rising line chart, navy`:

```
One fault, left for a month
₹74,114: 1.01 MWh a day × 30 days. An illustration that assumes a constant loss, not a measurement.
```

### 7-B. Block `EXPECTED BENEFITS`. Left column, bottom. About 44 % of the width, 42 % of the height.

Four icon rows.

- `icon: wrench and screwdriver, navy`, lead in navy:

```
Operational: the crew knows what to do first
A ranked list with reasons, and a day plan for two crews. No guessing which alarm matters.
```

- `icon: stack of coins, green`, lead in green:

```
Economic: more energy from capacity already built
Loss stated in rupees at the plant's own tariff, and no drone flown where imaging adds nothing.
```

- `icon: leaf, teal`, lead in teal:

```
Environmental: more clean energy delivered
A plant that loses less to faults delivers more of what it was built for.
```

- `icon: hard hat, purple`, lead in purple:

```
Social: safer field work
The planner will keep crews out of the field in the hours above 40 °C.
```

### 7-C. Block `THE COST OF WAITING: ARRAY B-17`. Right column. About 54 % of the width, 88 % of the height.

**Picture, top of the block, about 60 % of the block's height.**

- File: `images/07-two-futures.png` (1715 by 785).
- Caption:

```
Early prototype, "two futures" for B-17: the same weather and the same model, with the crew requested now (green) or after 24 hours (orange).
```

- What the reader should notice: the orange line climbs to more than three times
  the green one, and the two totals, `0.46 MWh` and `1.51 MWh`.
- Cropped from the Incident screen, Workflow view, Two futures tab: the rail, the
  page header and the workflow tabs above, and the lower half of the two summary
  cards, were cut away.

**Sentence under the picture.** Bold navy 13 pt:

```
Ask for the crew now and 0.46 MWh, ₹1,128, is lost before the repair is done. Ask tomorrow and it is 1.51 MWh, ₹3,693.
```

**Table under it.** Heading above the table, bold ink 10 pt:

```
If the repair itself starts then, energy lost on B-17 by that point
```

| Repair starts | Energy lost | Revenue lost | Against the 14:00 deadline |
|---|---|---|---|
| Now | 0.00 MWh | ₹0 | In time |
| In 6 hours | 0.77 MWh | ₹1,888 | Past it |
| Tomorrow | 1.52 MWh | ₹3,719 | Past it |
| In 3 days | 4.81 MWh | ₹11,772 | Past it |

**Notes under the table.** Blue 8 pt, then one line in bold red 10 pt.

```
Both read off the early prototype at 11:11 site time, 10 Oct 2026, at ₹2.446/kWh; they move with site time. The picture's totals include 0.5 h of crew travel and 4 h of declared repair work, so even "now" finishes after the deadline. Simulated outcomes, not guaranteed savings. No deviation settlement charge is computed: rupees are lost energy times the tariff, and nothing else.
```

```
A defect report cannot give this.
```

---

## I. Slide 8: research and references

**Slide title:** `RESEARCH AND REFERENCES`

Builder note: covers Round 1 item 7, future scope, plus the references and the
code-of-conduct declaration of every third-party dataset, model, library and API.
No picture.

### 8-A. Block `FUTURE SCOPE`. Left column, top. About 49 % of the width, 34 % of the height.

Three icon rows. The lead runs straight into the sentence.

- `icon: laboratory flask, navy`, lead in navy:

```
Research: train the thermal classifier on InfraredSolarModules and report its held-out metric per class. Validate detection on real aerial imagery. Fit the forecast band to real misses. Radiometric thermal data, and field validation of the deadline model.
```

- `icon: plug, teal`, lead in teal:

```
Product: an adapter for a plant's own SCADA feed in place of the simulator, a live path for prognosis and recommendation, and a detector under a permissive licence.
```

- `icon: rocket, green`, lead in green:

```
Patent and startup: nothing is filed and nothing is registered. If shortlisted we would take both questions to the event's own post-event track: incubation, patent screening, industry pilots and startup mentoring.
```

### 8-B. Block `REFERENCES`. Left column, bottom. About 49 % of the width, 52 % of the height.

Numbered list, ink 9 pt. Web addresses as live hyperlinks if the tool supports
them; otherwise plain text.

```
1. Sheppard, Cook, Perullo (Turbine Logic); Fregosi, Bolen (EPRI). Field Experience Detecting PV Underperformance in Real Time Using Existing Instrumentation. osti.gov/servlets/purl/1960134
2. Dobos, A. P. PVWatts Version 1 Technical Reference. NREL/TP-6A20-60272, October 2013. docs.nlr.gov/docs/fy14osti/60272.pdf
3. SECI auction, Bhadla Phase-III Solar Park, 2017. iea.org/policies/6373-auction-of-solar-corporation-of-india-seci and pv-magazine-india.com/?p=1613
4. Raptor Maps. InfraredSolarModules. github.com/RaptorMaps/InfraredSolarModules
5. Solar Panel Fault Detection, version 2. Roboflow Universe. universe.roboflow.com/solarvision-gwljt/solar-panel-fault-detection
6. HiGHS, open-source optimisation software. highs.dev
7. CERC Deviation Settlement Mechanism Regulations, 2024: context only. No charge is computed from it.
```

### 8-C. Block `WHAT WE BUILD ON`. Right column, top. About 49 % of the width, 56 % of the height.

| Kind | What | Licence |
|---|---|---|
| Dataset | Solar Panel Fault Detection v2, Roboflow Universe: 921 images | CC BY 4.0 |
| Dataset | InfraredSolarModules, Raptor Maps: 20,000 images | MIT |
| Pre-trained model | Ultralytics YOLOv8n, fine-tuned by us | AGPL-3.0 |
| External API | Groq, model openai/gpt-oss-120b | Groq terms |
| Libraries | Next.js, React, three, React Three Fiber, drei, zustand, zod, Tailwind | MIT |
| Libraries | onnxruntime-web, highs (HiGHS in WebAssembly) | MIT |
| Libraries | postprocessing; lucide-react; playwright-core, TypeScript | Zlib; ISC; Apache-2.0 |
| Typeface | IBM Plex, in the product | OFL |

### 8-D. Two icon rows. Right column, bottom. **Teal** outline. About 49 % of the width, 30 % of the height.

- `icon: shield, teal`, lead in teal:

```
Reference we owe: the loop follows the RAISE-winning Robinsun solar agent. Where that had a physical drone, we use a trained defect model and a physics-grounded simulation. No personal or proprietary data is used; all telemetry is simulated.
```

- `icon: group of people, navy`, lead in navy:

```
Team Sigmoid: Rehaan Ahmad Khan, Shantanu Singh, Lakshita Rawat, Krishna Agarwal. JSS University, Noida. Code: github.com/RAK2315/solar-proj (AGPL-3.0)
```

---

## J. Picture manifest

All files are in `images/`. Each is a crop of a 1920 by 1080 capture of the early
prototype (light theme, Chrome, 10 Oct 2026), cut by `crop.mjs` from the captures
that `shoot.mjs` takes. Nothing is retouched, resized or generated.

**Placed on slides**

| File | Slide and block | Size in px | Site time in the capture |
|---|---|---|---|
| `01-twin-field.png` | 1, block 1-D | 1230 × 570 | 10:12, clock held |
| `03-evidence-dossier.png` | 3, block 3-E, left | 1080 × 557 | 11:11 |
| `03-thermal-pass.png` | 3, block 3-E, right | 1050 × 600 | 10:53, flown at 60× |
| `05-sandbox-dust.png` | 5, block 5-C, top | 1305 × 880 | 10:20, clock held |
| `05-queue-day-plan.png` | 5, block 5-C, bottom | 1715 × 333 | 10:12, clock held |
| `07-two-futures.png` | 7, block 7-C | 1715 × 785 | 11:11 |

**Not placed. Do not use unless the owner asks.**

| File | What it is | Why it is here |
|---|---|---|
| `ref-07-cost-of-waiting.png` | The cost-of-waiting panel from the B-17 incident | The source of the table in 7-C, so its figures can be checked |
| `ref-07-tariff.png` | The tariff panel from the Analytics screen | The source of the tariff arithmetic in 7-A |
| `07-analytics-outlook.png` | Analytics: expected against actual over 72 h, and the shortfall by cause | Spare for slide 7 |
| `03-drone-detection.png` | The followed flight over B-17 with the detector's box, `Cracked 0.33` | Spare for slide 3. If used, its caption must give the score as shown |
| `spare-b17-array-panel.png` | B-17 selected on the twin, with its reading, deadline and rupee loss | Spare |
| `spare-electrical-cutaway.png` | The illustrated cutaway of why a cracked cell costs power | Spare. An illustration of the model, not a wiring survey |
| `spare-repair-crew.png` | The simulated repair crew at B-17 | Spare. Simulated maintenance |

---

## K. Must not say

Nothing in the deck, in any wording, may state or imply any of these.

1. Any score, accuracy or result for a thermal classifier. None is trained.
2. Any deviation settlement (DSM) charge, computed or estimated.
3. That the telemetry comes from a real plant. It is simulated on a published PV model.
4. That the drone, the flight or the repair crew is real. They are simulated in the 3D scene.
5. That the exact solver beats the heuristic at the moments shown. They match there.
6. "Diagnosed" for any array but B-17. The other 119 are "flagged from modelled signature".
7. ₹2.44 or ₹2.45 alone as the tariff. It is ₹2.446, the blend.
8. That the Turbine Logic and EPRI paper is an NREL paper.
9. "PVWatts Version 5" for report NREL/TP-6A20-60272. It is the Version 1 Technical Reference.
10. Any market size, national loss figure, soiling percentage, carbon figure, percentage saving or return on investment. No source is held.
11. A detector score on a drone frame other than the ones in this file (0.33 and 0.48 on one pass, none on another), and never 0.89 or 0.90: those were measured before the prototype's panel and crack rendering changed.
12. "31 to 40 ms", "60.1 fps" or "457 tests". Those were the figures before the interface was reworked; the current ones are in this file.
13. That a patent is filed, a company is registered, or any customer, partner or pilot exists.
14. That SURYA AGENT is finished, deployed or in use. It is a proposal with an early prototype.
15. That the thermal pass in the 3D scene is a thermal capture. It is a rendering.

**These stay labelled as assumptions wherever they appear:** the hazard strengths
in the sandbox, the crew hours per repair, the forecast band, and the ₹74,114
thirty-day illustration.

---

## L. Sources

| Figure or claim | Slides | Kind | Where it comes from |
|---|---|---|---|
| 500 MW block of Bhadla Solar Park, 120 arrays, three zones | 1 | Project | `data/farm.json`; Bhadla Phase-III is 500 MW (reference 3) |
| B-17 is 41.7 % below expected, 5 of 7 strings bypassed | 1, 2 | Project | The PV model, `scripts/physics.py` and `src/lib/physics.ts` |
| 3.07 MWh lost over 72 h; act before 14:00 | 1, 2, 7 | Project | `src/lib/queue.ts`, `data/forecast.json`; shown on the B-17 panel |
| ₹2.446/kWh and its arithmetic | 2, 5, 7 | Cited, then project | SECI auction lots (reference 3), blended in `src/lib/money.ts`; `ref-07-tariff.png` |
| ₹7,509 | 1, 2, 7 | Project | 3.07 MWh at ₹2.446/kWh; shown on the B-17 panel |
| Cracked AP@50 0.995, held-out test split, 42 images, 921 photographs | 1, 3, 6 | Project | `data/evidence/b17_detection.json`, `docs/dataset-provenance.md` |
| Aerial infrared inspection is usually annual; faults go undetected for weeks to months | 2, 7 | Cited | Reference 1: "This is usually performed on an annual cadence"; "many failures go undetected for weeks to months at a time" |
| Raptor Maps, Zeitview and Sitemark do drone thermal imaging with AI; twins under way | 2 | Project's reading | The team's reading of each company's public material, 4 Oct 2026. Not a benchmark |
| Four hot cells, row 2 columns 3 to 6, about +2.8 °C, one band | 3 | Project, measured | `data/evidence/b17_cellgrid.json`, from a real UAV frame in reference 4; `03-evidence-dossier.png` |
| Cracked 0.48 and 0.33 on 2 of 6 simulated drone frames; a second pass, none of 5 | 3, 6 | Captured 10 Oct 2026 | The dossier on two flights of B-17 at 60× in the early prototype |
| Language model never supplies a number; model openai/gpt-oss-120b on Groq | 3, 4 | Project | `src/app/api/triage/route.ts` |
| Solver cut off at 50 ms | 3 | Project | `src/lib/highsSolver.ts` |
| 16 invariants | 4, 6 | Project | `src/lib/types.ts` |
| 511 tests | 4, 6 | Run 10 Oct 2026 | `npx vitest run`: 511 passed in 39 files |
| Next.js 15, React 19 | 4 | Project | `package.json` |
| score = loss per day × severity × urgency ÷ access; urgency = 1 + 24 ÷ hours left | 5 | Project | `src/lib/ranking.ts` |
| 1.01 MWh × 3.0 × 7.33 ÷ 1.0 = 22.22; A-08 at 0.81 | 5 | Captured 10 Oct 2026 | `05-queue-day-plan.png`, site time 10:12 |
| 10 arrays affected, 6 jobs added, 1 displaced, 0.2 MW lower, B-17 still first | 5 | Captured 10 Oct 2026 | `05-sandbox-dust.png`, site time 10:20. Depends on where the dust is dropped |
| 6.67 MWh, ₹16,318, band ₹14,895 to ₹17,706 | 5 | Captured 10 Oct 2026 | `05-sandbox-dust.png` |
| 48 to 81 ms; budget 150 ms | 5, 6 | Measured 10 Oct 2026 | `scripts/measure_hero.mjs`, four runs in Chrome: 48.1, 60.5, 70.1 and 81.1 ms. Budget from `plan/rework/01-hero.md` |
| 55 to 56 frames a second at 1920 by 1080; 60 at 1366 by 768 | 6 | Measured 10 Oct 2026 | The same four runs |
| A 2D map takes over below 30 frames a second | 6 | Project | `src/components/twin/Watchdog.tsx` |
| ₹74,114 for thirty days | 7 | Derived, an illustration | 1.01 MWh a day × 30 = 30.3 MWh; × ₹2.446/kWh = ₹74,113.8. Assumes a constant loss |
| Crews kept out above 40 °C | 7 | Project | The crew planner's heat rule |
| 0.46 MWh, ₹1,128 against 1.51 MWh, ₹3,693 | 7 | Captured 10 Oct 2026 | `07-two-futures.png`, site time 11:11 |
| 0.00, 0.77, 1.52, 4.81 MWh; ₹0, ₹1,888, ₹3,719, ₹11,772 | 7 | Captured 10 Oct 2026 | `ref-07-cost-of-waiting.png`, site time 11:11 |
| Dataset sizes and licences; library licences | 8 | Project | `docs/dataset-provenance.md`; each package's own licence field, read 7 Oct 2026 |
| Title of NREL/TP-6A20-60272 | 8 | Cited | The report's own title page, read 10 Oct 2026 |
| Event name, dates, post-event track | Frame, 1, 8 | Owner | The event brochure supplied by the owner |

---

## M. Prompt for the deck builder

Paste this, then attach `content.md` and every file in `images/`.

```
Build an 8-slide 16:9 PowerPoint deck (.pptx) from the attached content.md and the attached pictures. content.md is a complete specification. Follow it exactly.

Rules:
1. Text inside a code block in content.md is exact slide text. Copy it character for character, including every number, unit, symbol and punctuation mark. Do not reword, shorten, round, convert or "improve" anything.
2. Do not add any slide, block, sentence, statistic, picture, icon caption or claim that is not in content.md. Do not invent anything. If something seems to be missing, leave it out and tell me.
3. Lines that begin "Builder note:" and everything in sections A, J, K, L and M are instructions for you and never appear on a slide.
4. Leave every "[OWNER TO FILL: ...]" marker exactly as written. Do not fill it in.
5. Follow section A for the layout, colours, fonts and the frame that repeats on every slide. Follow each block's stated position and share of the slide. Body text is small on purpose, 10 to 11 pt, because the deck is read, not presented. If a block does not fit, reduce its font by at most 1 pt and tighten spacing. Never cut text.
6. Use only the attached pictures, only on the slide and in the block content.md names, each with its caption. Keep each picture's aspect ratio. Do not crop, recolour, retouch, redraw or generate any picture. Do not use the files content.md lists as "not placed".
7. Draw every diagram, table and stat box from native, editable shapes and text. Do not paste them as images.
8. No speaker notes, no animations, no transitions.
9. Read section K, "Must not say", before you start and check the finished deck against it.

When you finish, list anything you could not fit or could not do exactly as specified.
```
