# Handoff: Round 1 deck content, reader-first

Written 10 Oct 2026. Repo `D:\Projects\12. project`, branch `main`, level with
`origin/main` at `3a89589` plus uncommitted work of the owner's (see "Do not
touch"). **Do not push or commit unless the owner asks.**

## The job

Rewrite `ppt/round-1/content.md` so that a slide-maker who has never seen this
project (a person, or a tool such as ChatGPT, Gamma or Canva) can build the
Round 1 deck from it alone, and replace its two generated concept images with
real pictures taken from the running prototype.

**The output is a content specification, not a .pptx.** Do not build a deck.

## Why the current file is not good enough (the owner's words, paraphrased)

- **It is written for a speaker.** Each slide has a few short bullets and long
  speaker notes carrying the actual explanation. Round 1 is judged by people
  **reading** the deck. Nobody presents it. Whatever is in the notes and not on
  the slide is lost.
- **The on-slide content is too thin** for a reader to understand the problem,
  the solution, why it is different and that it works.
- **The pictures are concept art.** The owner wants pictures from the prototype.
- It must be **clear and complete enough to hand to any deck builder** and get
  the right deck back without a conversation.

## What "done" looks like

`ppt/round-1/content.md`, rewritten so that for each of the eight slides it
gives, with nothing left to interpret:

1. **The slide title** and, where useful, one opening line under it.
2. **Every block on the slide**, in reading order, each with its heading and its
   exact text. Blocks may be: a short paragraph, an icon row (bold lead plus one
   sentence), a table, a stat (big figure plus a caption), a labelled diagram
   described box by box and arrow by arrow, a chart with its exact values.
3. **Where each block sits** (left column, right column, top strip, and so on)
   and roughly how much of the slide it takes.
4. **Each picture**: file name, where it goes, how large, its caption, and what
   the reader should notice in it.
5. **A source note** wherever a figure is not the project's own arithmetic.

Speaker notes go. If a sentence matters, it is on the slide; if it does not, it
is cut. A short "why this slide exists" line for the deck builder is fine, kept
visibly separate from slide text.

Plus:

- `ppt/round-1/images/`: real captures, named by slide (`03-...png`), replacing
  the two concept images.
- A short **design brief** at the top of `content.md` (see "Format").
- A **"must not say" list** and a **sources table** at the end.
- A **ready-to-paste prompt** for a deck-building tool, at the end or in its own
  file, that tells it to follow `content.md` exactly and invent nothing.

## Read these first, in this order

1. `CLAUDE.md`, the red status box: every measured figure and decision, dated.
2. `ppt/round-1/content.md`: the file to rewrite. Its slide order, team block
   and event name are current; its framing and depth are what is wrong.
3. `ppt/slides.md` and `ppt/SOURCES.md`: the previous deck's exact on-slide text
   and where every figure came from. **This is the best source of ready,
   checked, reader-facing content**: dense blocks, risks against answers, the
   measured table, the tariff arithmetic. Reuse it.
4. `ppt/SURYA-AGENT-Round1.pdf`: that previous deck, rendered. The owner liked
   its format. Look at it before writing.
5. `plan/rework/01-hero.md`: the USP and the sourced problem statement.
6. `README.md`: the product described as it stands, with measured figures.

## A conflict to settle with the owner at the start, once

`content.md` describes the product as a **proposal**: "we propose", "planned
prototype", "will help", with generated concept visuals labelled as such. But a
working prototype exists, the owner now asks for pictures **from the prototype**,
and "Prototype quality" is 15 % of the final judging.

Ask the owner one question before rewriting: **is the deck to present a built,
working prototype (with what is simulated stated plainly), or a proposal?** The
answer changes the tense and the claims on every slide. If they say built, use
the honest framing below. Do not guess.

Also ask, in the same message, for anything still missing: team departments if
wanted, real logo files, and what they want said about patent and startup plans.

## The event

**JSS Noida, AI FORGE 2026** (the owner's earlier brief called it "JSS AI FORGE
36"; `content.md` has the current wording, use that). Team **Sigmoid**, JSS
University, Noida. Theme: **AI for Industry 4.0** (manufacturing, predictive
maintenance, quality control, automation, digital twins). Deck due
**15 Oct 2026, 13:04 IST**.

Team leader Rehaan Ahmad Khan; members Shantanu Singh, Lakshita Rawat,
Krishna Agarwal.

Round 1 is an idea-screening round, read not presented, shortlisting 50 teams.
It asks for seven things, each of which needs a visible home:

1. Problem statement and target beneficiaries
2. Existing gaps
3. Proposed AI solution
4. Innovation and uniqueness
5. Expected impact
6. Prototype architecture
7. Future scope: research, patent, startup

The owner's eight slides, in order, fixed: **title, problem statement, our
solution, tech stack and flow, our USP, feasibility and viability, impact and
benefits, research and references.** Existing gaps go on the problem slide;
future scope and third-party declarations go on the last.

Final-round weighting, which should decide how much space each thing gets:

| Criterion | Weight |
|---|---|
| Problem significance and relevance | 15 % |
| Innovation and originality | 15 % |
| Meaningful application of AI / emerging tech | 15 % |
| Technical feasibility | 15 % |
| Prototype quality and live demonstration | 15 % |
| Societal / industry impact | 10 % |
| Scalability | 5 % |
| Business / startup potential | 5 % |
| Presentation and pitch | 5 % |

Code of conduct: declare every third-party library, model, dataset and API; no
personal or proprietary data.

## What the product is, in six lines

- A browser console for a modelled 500 MW block of Bhadla Solar Park: 120
  arrays in a 3D twin, with a 2D map fallback.
- It watches each array against a physics model (NREL PVWatts), and when
  telemetry cannot tell dirt from damage it sends a simulated drone.
- A detector the team trained (YOLOv8n) runs in the browser on the drone's
  frame. A language model writes the triage in words and never supplies numbers.
- It computes a deadline from the defect and the 72 h forecast, ranks repairs by
  a fixed formula shown on screen, and plans the crew day with an exact solver.
- A what-if sandbox: drag a dust storm onto the field and the plan re-derives.
- Nothing becomes a work order until an operator approves it.

**USP, "the plan, not the picture":** others detect and report; this hands over
a computed deadline, a plan that re-derives live, the arithmetic, and a human
gate. Do not pitch the twin or the detection as new.

## What may and may not be claimed

Every figure must come from `CLAUDE.md`'s status box, `ppt/SOURCES.md`, the repo
or a cited source. Do not round, re-unit or add figures.

Safe, checked figures (source in `ppt/SOURCES.md`):

- 500 MW block, 120 arrays; delivers 364 MW at 62.8 °C cell temperature.
- Array B-17: 41.7 % below expected (5 of 7 strings bypassed); 3.07 MWh lost
  over 72 h; act before 14:00.
- Tariff ₹2.446/kWh = (200 MW × ₹2.44 + 300 MW × ₹2.45) ÷ 500 MW, the two SECI
  Bhadla Phase-III lots blended. So 3.07 MWh is ₹7,509. Never ₹2.44 alone.
- Detector: Cracked AP@50 0.995 on the held-out test split (42 images), trained
  on 921 labelled photographs. On the drone's own frame, Cracked 0.89 to 0.90.
- Measured in Chrome: 60.1 fps; a dropped hazard re-planned on screen in 31 to
  40 ms (budget 150 ms); crew plan solved in 10.8 ms, cut off at 50 ms.
- Thermal evidence for B-17: four hot cells, row 2 columns 3 to 6, about
  +2.8 °C, one band, measured from a real UAV frame (Raptor Maps, MIT).
- Problem source: aerial infrared inspection is usually annual, so faults go
  undetected for weeks to months. Turbine Logic / EPRI, on OSTI:
  https://www.osti.gov/servlets/purl/1960134 . **Not an NREL paper.**

Must not say:

- Any score for a thermal classifier. It is not built; no model, no metric.
- Any deviation settlement (DSM) charge.
- That telemetry comes from a real plant. It is simulated on a published model.
- That the solver beats the heuristic at the demo moment. They match there.
- "Diagnosed" for any array but B-17; the others are "flagged from modelled
  signature".
- Market sizes, national loss figures or soiling percentages: no source is held.

Stay labelled as assumptions wherever they appear: hazard strengths, crew hours
per repair, the forecast band, and the ₹74,114 thirty-day illustration (1.01
MWh/day × 30 days at the tariff, assuming a constant loss).

**The test count has moved.** It was 457 on 7 Oct; the owner has since reworked
the UI. Run the tests and use the number that comes out, or leave it off.

Owe the reference: the loop follows the RAISE-winning Robinsun solar agent.

## Pictures from the prototype

**The old pictures are stale.** The owner reworked the landing page, the console
shell and the twin on 10 Oct, so everything in `ppt/images/`, `docs/readme/`
and `public/landing/tour/` shows the previous look. Take new ones.

- `npm run demo` builds and serves on `http://localhost:3000`. It wipes and
  rebuilds `.next`, so stop any server on that port first.
- `ppt/build/shoot_deck.mjs` drives real Chrome and saves PNGs. Phases:
  `static`, `sandbox`, `flight`. `THEME=light` takes the light theme;
  `SHOT_DIR` sets the output folder. **It was written against the old UI and
  will probably need its selectors and steps repaired**: read the current
  `src/components/shell/` and `src/components/overlay/` first, and check each
  capture by eye.
- Shoot at 1920×1080. Fly the drone at **60×, not 600×**: at 600× the camera
  lags and the detector is handed the wrong frame.
- Open the console with `?twin=3d` when capturing a flight, or the frame-rate
  watchdog swaps in the 2D map mid-capture.
- Pick the theme that suits the deck. The previous deck was light, so used
  light-theme captures.
- Crop each picture to its subject so the text in it can be read at slide size,
  and say in `content.md` what was cropped. Never retouch, and never generate.

Wanted, at least: the twin of the field; a drone pass with the detector's box;
the thermal pass; the incident with its evidence chain and cost of waiting; the
queue with each job's arithmetic and the day plan; the sandbox after a hazard is
dropped; analytics with the tariff. Not every slide needs a picture; the owner
asked that pictures not be on every slide.

If the detector's score on the drone's frame differs from 0.89 after the UI
rework, report the figure that comes out. Do not tune anything to recover it.

## Format the owner likes

From decks of their own that they showed: white, dense, read like a one-page
brief per slide. A team mark top-left, a bold black serif title in capitals,
the event top-right, a blue footer band with the page number. Content in blocks
with heavy rounded outlines and a bold capital heading; rows of a coloured icon,
a bold coloured lead and a sentence; risks in red against answers in green;
small figures in pale blue boxes; a flow diagram with row labels for the
architecture; a table of "actual problem" against "proposed solution". Body text
is small because it is read, not projected.

`ppt/SURYA-AGENT-Round1.pdf` is that format applied to this project. Describe
the format in `content.md` in words a deck builder can follow; do not assume
they can open the PDF.

## Do not touch

- The owner's uncommitted work: `src/components/scene/CrackedPanel.tsx`,
  `ThermalPass.tsx`, `src/components/twin/*`, `src/lib/live.ts`,
  `src/components/overlay/WorkflowPanel.tsx`, and anything else `git status`
  shows as modified that you did not change.
- `docs/slides.md`, `gen_sentinel_report.py`, `two.tmp.mjs`.
- Product code in general. This task is `ppt/round-1/` and, if needed to take
  pictures, `ppt/build/shoot_deck.mjs`.
- The older deck files under `ppt/` (`SURYA-AGENT-Round1.pptx`, `.pdf`,
  `slides.md`, `SOURCES.md`, `build/build_deck.cjs`): read them, do not rebuild
  or overwrite them.

## Traps met before

- A heredoc mangles backslashes and newlines in patch scripts. Use the Write and
  Edit tools for anything with escapes.
- Python on this machine does not see Git Bash's `/tmp`. Keep scratch files in
  the project or the session scratchpad.
- `npm run demo` takes two to three minutes. Wait for "Ready" before shooting.
- Captured figures move with site time. A figure read off a screenshot is "as
  captured", must match the picture on the same slide, and must say so.
