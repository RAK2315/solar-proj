# UI brief — the console is too dense to read

Written 2 Aug 2026, from the project owner's own report on the running app.
Companion to `docs/backlog.md` §5c.

---

## The complaint, verbatim

> *"the dashboard ui looks so cluttered, text so small, so much small text stuff —
> could we have a ui upgrade"*

> *"right now the right panel has too much info, seems unorganised, not telling a
> story… so have it organised structure, visually looks cluttered"*

This has been said more than once, across weeks, about different parts of the same
screen. It is not a preference. **It is the product's biggest remaining weakness**,
and it outranks every feature on the backlog.

## What is actually wrong, by region

Diagnosed from a 1920×1080 screenshot of live mode with `B-17` selected.

### Everywhere — no typographic hierarchy

The type scale in `globals.css` runs **10 px → 13 px** for almost everything on
screen, with one 34 px KPI. In practice:

- Section headers (`t-h1`, 13 px) are the same size as body data (`t-data`, 12 px).
  **Structure is therefore invisible** — you cannot see where one section ends.
- A `0.0 %` reading and a `−41.7 % CRITICAL` reading are rendered at identical weight
  and size. The most important number on the screen does not look like it.
- `t-micro` (10 px) carries real content — timestamps, model IDs, provenance
  sentences, the ΔT scaling note — not just captions. At 10 px on a projector that
  content is decorative in practice, because nobody reads it.

**The fix is a scale, not a font.** The number that matters should be ~4× the label
next to it. Right now it is 1.1×.

### The right rail — a wall, not an argument

Restructured in Phase 15 from twelve peer sections into five groups (State,
Assessment, Inspection, Outlook, Decision), which fixed the *ordering* problem and
did nothing for the *density* problem. With `B-17` selected it still renders roughly
**25 discrete facts stacked vertically at equal weight**, plus three prose paragraphs,
a 5×7 grid, a chart, a four-step list and the approval gate — all expanded, all at
once, in a 448 px column.

Specific offenders:

- `AnalysisBlock` is 10 label/value rows with no grouping and no emphasis on the two
  that matter (array deviation, string deviation).
- Agent prose is a 5-line justified paragraph in 13 px sans, immediately followed by
  a 10 px provenance line and a 10 px staleness warning.
- `Findings` and `Recommendation` are more prose, in the same register, further down.
- Nothing is collapsible. There is no way to see the shape of the rail.

### The anomaly matrix — undersized for what it is

This is **the signature element**: a 5×7 physical map of one panel's cells, with four
hot cells in row 2 that localise the fault. It is the thing the product should be
remembered by.

It currently renders at 22 px cell height inside the same 448 px column as everything
else, with 10 px axis labels, and its ΔT list duplicated beneath it. It should be
larger and quieter around than anything near it.

*(It is also currently blank in live mode — bug B1 in the backlog. Fix that first;
a redesign of an element that does not render is guesswork.)*

### The event feed — six near-identical blocks

Every row is: uppercase source, severity badge, timestamp, two lines of body. No
visual difference between an `info` boot message and a `critical` shortfall except a
2 px border colour and a small badge. Severity should be legible at a glance and
from across a room.

### The map — the one part that works

120 hatched rectangles in three zone blocks reads as an engineering drawing rather
than a heatmap, which is exactly right. **Do not redesign this.** If anything it
should get more of the screen.

---

## Constraints — the identity, which does not change

These are what make the console look like an instrument rather than a dashboard
template. A redesign that drops them has redesigned a different product.

**The ironbow ramp as the semantic colour language.** This is the actual false-colour
LUT thermographers use, and it is why the console's colours and the thermal camera's
colours are the same colours. Values in `src/app/globals.css`; shared with the GLSL
LUT in `ThermalPass` and checked by `ironbow.test.ts`.

**IBM Plex in three roles, and only three:** Mono for every number and identifier
(`tabular-nums`, always); Sans Condensed uppercase for headers and buttons; Sans for
agent prose *only*.

**Every number carries its unit. Every component carries its ID.** `−41.7 %`, not
`41.7`. `INV-B`, not "the inverter".

**Dark only.** No light mode, no theme toggle, no onboarding. Radius never above 3 px.
Fixed 1920×1080 — this runs on a projector, not a phone.

**Voice:** terse, operator-facing, active. `APPROVE — CREATE WORK ORDER`, not
`Submit`. `Est. energy loss 3.07 MWh/72h`, not `Impact: High`.

## Free to change — be opinionated

Layout, spacing, the type scale, density, what is visible at once versus progressively
disclosed, tabs or accordions or panels, chart styling, iconography, motion, and the
three-fixed-column structure itself.

## The hard rule a redesign must not break

**No surface may claim something the data cannot support.** See CLAUDE.md §0 rule 5.
We hold captured imagery for `B-17` and for no other array; findings, recommendations,
cell grids, detections and deadlines are all gated on that. A new component that
renders a placeholder where evidence should be — or borrows B-17's evidence to fill a
layout — reintroduces the most repeated bug in this project.

Absent means **absent from the DOM**, not greyed out and not a skeleton.

## Scope of the port

The data layer does not change. `src/lib/`, `src/store/`, `scripts/` and `/data` stay
exactly as they are; every hook in `src/store/selectors.ts` keeps its signature. This
is a presentation swap inside `src/components/` plus `globals.css`.

The 329 tests assert **text and behaviour**, not pixels, so most should survive a
redesign untouched. Ones that break because a label was reworded should be updated to
the new wording — not deleted.
