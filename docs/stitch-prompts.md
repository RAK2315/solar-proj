# Stitch prompts — SURYA AGENT UI overhaul

Prompts for **stitch.withgoogle.com**, one per screen. Paste the **Style preamble**
first (or into Stitch's theme/style field), then paste one screen prompt at a time.
Generate, export, and bring the result back to Claude Code to port.

Everything here describes a screen that already exists and already has real data
behind it. Nothing is aspirational — if Stitch draws a control, there is a selector
behind it already. What is being replaced is the **presentation only**.

**The rule Stitch cannot be told often enough:** this is a control-room instrument,
not a SaaS dashboard. If a design comes back with rounded cards floating in
whitespace, pastel gradients or a light background, regenerate it.

---

## 0. Style preamble — paste this first, every time

```
Design a dark, high-density control-room console for a solar power plant
operator. It runs full screen on a 1920x1080 projector in a control room, so
every number has to be readable from across the room.

Visual style: a SCADA industrial instrument, not a web dashboard. Near-black
background with a very slight cool blue tint. Panels are flat dark slabs
separated by thin 1px hairlines, never floating cards. Corners are square —
nothing rounder than about 2 or 3 pixels anywhere. No drop shadows, no glass
effects, no gradients except one subtle fill under a chart area. Dark theme
only, there is no light mode.

Colour language: the accent colours are a thermal camera's false-colour palette,
the ironbow ramp, running deep purple, magenta, red, orange, amber, then
near-white at the hottest. Use it for severity: purple for information, orange
for warning, red for critical, amber for peak. Healthy things are a dull
desaturated blue that recedes almost into the background, because an operator
scans for problems, not for confirmations. One single off-ramp colour, a bright
teal, is used only for "a machine is doing something right now" — agent
activity, live links, drone telemetry.

Typography: three roles only. A monospace face for every number, code and
identifier, with tabular figures so digits never shift. A condensed sans, all
caps with wide letter spacing, for section headings and buttons. A normal sans
for paragraphs of written reasoning, and nowhere else.

Type sizing is the most important part: there must be obvious hierarchy. The one
number that matters on a panel should be roughly four times the size of the
label next to it — think a 52px figure over a 12px caption. Section headings
must be clearly larger than body text and separated by a rule, so you can see
where one section ends and the next begins. Do not set everything between 10 and
13 pixels.

Every number carries its unit on screen: "-41.7 %", "36.10 kW", "890 W/m2",
"3.07 MWh". Every physical thing carries its ID: "B-17", "INV-B", "DRONE 01",
"PAD-01". Labels are terse and operator-facing: "APPROVE - CREATE WORK ORDER",
not "Submit".
```

---

## 1. Site screen — the main console

The default screen, and the one the whole product is judged on.

```
Design the main screen of a solar plant console called SURYA AGENT.

Across the top is a 72px header bar. On the left the product name SURYA AGENT.
Then a row of four big key figures, each a very large monospace number with a
small caption above it and its unit in smaller text beside it: FARM HEALTH
80/100, OUTPUT 364 MW, ANOMALIES 3 with CRITICAL 1 called out in red beneath,
and current site conditions 35 C / 0 % cloud / 1.6 m/s wind, 890 W/m2. Each big
figure has a tiny flat sparkline under it showing the last hour. On the far
right, the site name BHADLA SOLAR PARK, RAJASTHAN, INDIA with its coordinates
27.540 N, 71.915 E in small monospace, and a small 72-hour outlook strip reading
TODAY 37 deg, TOMORROW 38 deg, DAY 3 38 deg.

Below the header, four columns.

Far left, a narrow 64px vertical icon rail for navigation with six icons stacked
top to bottom: Site, Drones, Missions, Repairs, Analytics, Scenario. The active
one is marked with a bright bar and a filled icon. Small text labels under each
icon.

Next, a 304px column titled LIVE EVENTS. It is a feed of events, newest at the
top. Each event is a block with a thick 4px left border in its severity colour,
the source in caps like PANEL B-17 or DRONE 01, a severity badge, a right
aligned timestamp like 10:05, and one or two lines of body text. A critical
event must look obviously different from an informational one from across a
room — bigger badge, stronger border, a tinted background — not just a slightly
different border colour. Below the feed, two smaller boxed sections: DRONE
STATUS showing DRONE 01 ACTIVE 76% and DRONE 02 STANDBY 100%, each with a
segmented battery meter made of small blocks rather than a smooth bar, and
SIGNAL QUALITY showing Uplink 92% and Downlink 89%.

The centre column is the site map and it gets the most space. It is drawn like
an engineering drawing, not a heat map. A title line reads BHADLA SOLAR PARK,
then three labelled zone blocks A, B and C stacked vertically, each an 8 by 5
grid of small square panel arrays, 120 squares in total. Healthy arrays are dull
desaturated blue and almost recede. Warning arrays are filled with diagonal
orange and black hazard hatching. Critical arrays are filled with diagonal red
and black hatching and have a brighter outline. The selected array has a dashed
red selection box around it and a small label tag reading B-17. Two small drone
pad markers labelled PAD-01 and PAD-02 sit below. When a drone is flying there
is a thin dashed route line from the pad to the target array with a small drone
marker on it. A legend strip along the bottom reads Healthy, Warning, Critical,
Scheduled, Drone route, each with its swatch.

The right column is 448px wide and describes the one selected array. At the top,
sticky, a small caption SELECTED then the array name PANEL B-17 in large
monospace, then a line reading ZONE B - INV-B - CRITICAL. Under that a boxed
status strip with a solid red CRITICAL badge, the text "suspect: INV-B", an
outlined RISK HIGH badge and "act before 14:00", and a small line naming the
mechanism: "cracked cell driving its bypass diode into conduction".

Then the headline figures in an inset box: two very large numbers side by side,
ARRAY DEVIATION -41.7 % in red and EST. ENERGY LOSS 3.07 MWh in amber, each with
a small caption above and a tiny note beneath. Beneath the box, one medium row:
STRING DEVIATION, B-17-S3, -58.4 %. Then a two-column grid of six supporting
readings at medium size — ARRAY OUTPUT 15.02 kW, EXPECTED 36.10 kW, CELL
TEMPERATURE 65.6 C, AMBIENT 35.0 C, IRRADIANCE 890 W/m2, LAST SERVICED 14 MAR
2026 — each a small caps caption over a monospace value.

Below that a section headed PEER STRINGS with a compact three-row table:
INVERTER, STRING, ACTUAL, EXPECTED, DEVIATION, showing INV-A and INV-C at 0.0 %
and INV-B at -58.4 % highlighted in red.

Then a section headed ASSESSMENT containing one card with a teal left border, a
header reading TRIAGE - B-17 with the model name openai/gpt-oss-120b in small
text on the right, and a short paragraph of the agent's written reasoning.

Then a section headed INSPECTION with a wide teal outlined button reading OPEN
INSPECTION DOSSIER with an arrow, and one line under it reading "4 anomalous
cells in 1 cluster, with the captured thermal and RGB frames".

Then a section headed OUTLOOK with a red RISK HIGH - ACT BEFORE 14:00 chip, an
amber outlined 72H CLEAR - DELAY IS COSTLY chip, a small caption saying the
curve is the site's weather and is the same for every array, and a small area
chart of ambient temperature over 72 hours with a dashed red peak line labelled
PEAK 38.1 C.

Finally, pinned to the bottom of this column, a full-width solid red button
reading APPROVE - CREATE WORK ORDER with an arrow, and under it a row of three
smaller secondary controls: QUEUED, INSPECT EVIDENCE, OVERRIDE.

Along the very bottom of the whole screen, a 40px footer strip reading REPAIR
QUEUE - 4 TASKS - NEXT: B-17 (CRITICAL) on the left and VIEW QUEUE with an arrow
on the right.
```

---

## 2. Inspection dossier — the popup over the map

```
Design a large modal panel that opens over a control console's map, called the
inspection dossier. It is a wide dark slab about 1360px across and 900px tall,
centred, with a 1px border, over a dark dimmed backdrop. Industrial style,
square corners, no shadow.

Its header row has the words INSPECTION DOSSIER in small caps on the left, then
the array name B-17 in large monospace, then a small line reading "zone B -
INV-B". On the right a small outlined button reading CLOSE - ESC.

The body is split into two equal columns with a vertical hairline between them.

The left column is what a sensor measured. First a section headed CAPTURED
EVIDENCE showing two image thumbnails side by side in 4:3 frames, one labelled
THERMAL - ironbow and one labelled RGB - Cracked 0.9084, with a small paragraph
of provenance text beneath explaining what the frames are.

Below it, the most important element on the screen, a section headed ANOMALY
MATRIX with the note "5 x 7 cells - classical CV, not a model". It is a grid of
5 rows by 7 columns of large square cells, each cell about 64px, with column
numbers 1 to 7 above and row labels R1 to R5 down the left side. Each cell is
filled with a colour from the thermal ironbow palette according to its
temperature. Most cells are cool dark purple. Four adjacent cells in row 2,
columns 3 to 6, are hot orange and amber and have a bright near-white outline
marking them as defects. This grid is the centrepiece — big, confident, with
quiet space around it.

Directly beneath the grid, a list headed CELL DEFECTS with the note "1 cluster -
baseline 62.8 C", showing four rows separated by hairlines: "R2 - C3 hotspot"
with "+2.7 C" right aligned in a matching hot colour, then R2 - C4 at +2.8 C,
R2 - C5 at +2.8 C, R2 - C6 at +2.7 C. Under the list a small provenance sentence
about how the temperature delta was measured.

The right column is what a model reasoned. A section headed AGENT REASONING with
the model name on the right, containing three stacked cards, each with a teal
left border on a dark raised background: TRIAGE, PROGNOSIS and RECOMMENDATION.
Each card has its stage name in teal small caps, the model ID in tiny text on
the right, a readable paragraph of prose in a normal sans, a small metadata line
under it, and a "show more" link. The recommendation card also carries a short
numbered list of physical steps for a technician.

Below that a section headed FINDINGS with one short italic paragraph.
```

---

## 3. Drones screen

```
Design a fleet screen for two inspection drones, in a dark control-room style.
It fills the area to the right of a narrow icon rail, while a header bar, a live
events column and a bottom queue strip stay in place around it.

A page title DRONES with a subtitle "two aircraft, state derived from what has
been dispatched".

Two large cards side by side, one per drone. Each has the drone ID DRONE 01 in
large monospace at the top left, a status badge at the top right reading
STANDBY, OUTBOUND, INSPECTING or RETURNING in its own colour, then readings laid
out as caption-over-value pairs: BATTERY as a large percentage with a segmented
block meter beneath it, HOME PAD PAD-01, CURRENT TARGET B-17 or a dash, MISSION
MSN-001 or a dash, and SORTIES THIS SESSION 3.

Under the two cards, a wide panel headed FLEET ACTIVITY listing recent state
changes as timestamped one-line rows in monospace.
```

---

## 4. Missions screen

```
Design a flight log screen listing every drone mission flown this session, in a
dark control-room style.

A page title MISSIONS with the subtitle "every dispatch this session, and what
came back".

A wide table with column headings in small caps: MISSION, DRONE, TARGET,
DISPATCHED, ELAPSED, PHASE, RESULT. Rows are monospace with tabular figures,
separated by hairlines, with a very subtle alternating background. A typical row
reads MSN-001, DRONE 01, B-17, 10:00, 38 min, INSPECTING, and a result cell. The
PHASE cell is a small coloured badge. The row for the currently flying mission
has a teal left edge and a thin progress bar underneath showing how far through
its legs it is, with the three legs labelled OUTBOUND, INSPECTING, RETURNING.

When there are no missions yet, show a single quiet line of text saying no drone
has been dispatched this session — not an illustration, not an empty-state
graphic.
```

---

## 5. Repairs screen — the ranked queue with its maths shown

```
Design a work-queue screen that shows not just a ranking but the arithmetic
behind it, in a dark control-room style.

A page title REPAIRS with the subtitle "ranked by a pure function, not by a
model".

Below it, one line showing the formula in monospace: loss x severity weight x
urgency / access cost.

Then a ranked table, one row per task, largest score first. Columns: RANK as a
large number, TASK ID like INC-B17, ARRAY B-17, SEVERITY as a coloured badge,
LOSS 1.02 MWh/day, SEVERITY WEIGHT 3.0, URGENCY 1.92, ACCESS COST 1.0, then
SCORE as the largest number in the row, right aligned. The top row is emphasised
with a stronger background and a red left edge, and carries a small line beneath
reading "26.7x ahead of #2" and "deadline in 26.0 h".

Beneath the table, a panel headed APPROVED WORK ORDERS listing any orders the
operator has created, each with its ID, array, the site time it was created and
a short note.
```

---

## 6. Analytics screen

```
Design an analytics screen showing a whole solar site over a day, in a dark
control-room style.

A page title ANALYTICS with the subtitle "evaluated from the physics model at
sampled hours, not from a stored series".

At the top, a row of four large figures with small captions: PEAK OUTPUT 364 MW,
ENERGY TODAY, CURRENT LOSS TO FAULTS, and ARRAYS DEVIATING 3 of 120.

Below, a large area chart of site output in megawatts across the day from
sunrise to sunset, drawn as a thin bright line with a soft amber fill fading to
nothing beneath it, on a dark inset panel with hairline gridlines and monospace
axis labels. A second fainter line shows what output would have been with no
faults, and the gap between the two lines is filled in dull red and labelled as
the loss.

Beneath the chart, two panels side by side. On the left, LOSS BY ZONE as three
horizontal bars for zones A, B and C, each labelled with its megawatt-hours. On
the right, WORST ARRAYS as a compact table of the five worst arrays with their
deviation percentages, worst first, each deviation coloured by severity.
```

---

## 7. Scenario screen — operator fault injection

```
Design a scenario screen where an operator injects a fault into any array to
exercise the console, in a dark control-room style.

A page title SCENARIO with the subtitle "inject a fault, then watch the physics
evaluate it". A short paragraph explains that an injection writes a scenario
event and never writes a reading, so the array's output, status and queue
position are all computed by the same model that evaluates the built-in faults.

A control row: a labelled dropdown to pick a target array from 120, then four
selectable mechanism tiles in a row, each a bordered box with its name in caps
and its parameters in small monospace beneath — HAIRLINE CRACK 2 strings,
ESTABLISHED CRACK 5 strings, ADVANCED CRACK 6 strings, STRING OUTAGE 1 string
open. The selected tile has a bright border and a tinted background. Then a
solid amber button reading INJECT FAULT.

Below, a panel headed ACTIVE INJECTIONS listing what the operator has injected
this session — array, mechanism, the site time it started, its ramp duration —
each row with a small CLEAR button, plus a CLEAR ALL control.

At the bottom, a panel headed COMMITTED SCENARIO listing the three faults that
ship with the build, marked clearly as not removable.
```

---

## 8. Cinematic view — the drone's-eye screen

```
Design a full-screen cinematic overlay for a drone inspection flight. The
background is a 3D view of a solar farm seen from a drone, so design only the
transparent overlay elements that sit on top of it. Same dark instrument
language as the console.

Top left, a mission log panel about 78% of the screen width, a dark slab at
about 92% opacity with a 1px border. Its header row reads SURYA AGENT - MISSION
LOG on the left and a pulsing red LIVE dot on the right. Its body is one line of
large monospace text about 28px, like "[10:04] Thermal scan: hotspot confirmed.",
coloured by meaning: orange for anomalies, teal for confirmations, near-white
for neutral status.

Top right, a timecode block with corner bracket marks: a pulsing red REC dot,
then T+00:36, then LIVE in teal.

Bottom right, a status pill: a dark chip with a small teal dot and a short caps
label such as FLYING TO ZONE B, INSPECTING B-17, THERMAL SCAN, or
RECOMMENDATION READY.

Bottom left, a picture-in-picture frame about 38% of the screen width in 4:3,
with a 2px teal border and corner brackets, containing a shrunken copy of the
full console screen. A small label above it reads CMD FEED - OPERATOR on the
left and SLAVED on the right.

Centred over the target, a target reticle: four orange corner brackets around
the panel being inspected, with a small label tab below and to the right reading
"B-17 - Cracked (0.9084)" on a dark background in monospace.
```

---

## 9. The states that make it honest

These are the variants that keep the console from claiming things it cannot
support. Ask for them explicitly — they are the easiest thing for a generator to
"helpfully" fill in with placeholders, which is the exact bug this project keeps
having.

```
Design four variants of the right-hand detail column of the solar console, in
the same dark control-room style, so the console reads honestly when it has
nothing to show.

First, NOTHING SELECTED: the column shows only the caption SELECTED and the
words NO ARRAY SELECTED in large monospace, with one quiet line beneath reading
"Click any array on the map to inspect it." The rest of the column is empty — no
placeholder boxes, no skeletons, no greyed-out sections.

Second, A HEALTHY ARRAY: the same column for array C-29, showing a dull blue
HEALTHY badge, the line "Within tolerance. No intervention scheduled.", a
deviation of 0.0 % rendered in plain white rather than red, the supporting
readings, and no deadline, no risk chip, no projected loss and no approval
button at all.

Third, NO IMAGERY ON FILE: an array a drone has inspected but for which no
captured imagery exists. Where the evidence would be there is a single short
paragraph reading "No cell-level capture on file for A-03. The committed imagery
in this build covers B-17 only, so there is nothing measured to localise here."
No empty grid, no placeholder thumbnail, no greyed-out matrix.

Fourth, NIGHT: after sunset the site generates nothing, so the column shows an
amber-bordered notice reading "No generation - after sunset" with a short line
explaining that deviation is not measurable at zero irradiance, and the
deviation figures are absent rather than showing 0.0 %.
```

---

## 10. What must survive the redesign

Paste this as a constraint if Stitch drifts, and check every generated screen
against it before porting:

- Dark only. No light mode, no theme toggle, no onboarding.
- The ironbow ramp is the semantic colour language — it is the same palette the
  thermal camera uses, which is why the thermal frame does not look like a
  different application when it appears.
- Three type roles: mono for numbers and IDs, condensed caps for headings and
  buttons, normal sans for agent prose only.
- Every number has its unit. Every component has its ID.
- Square corners, hairlines, flat slabs. No floating rounded cards, no shadows,
  no glass.
- Absent means absent from the screen — never a placeholder, never a skeleton,
  never a greyed-out section.
- Fixed 1920x1080. Do not make it responsive; it runs on a projector.
- The map is the one region that already works. More room for it is welcome; a
  redesign of it is not.
