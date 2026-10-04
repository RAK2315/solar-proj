# 00 — Overview

**Event:** JSS AI FORGE 36, Industry 4.0 track. **Team:** SIGMOID.
**Pack status:** `plan/rework/` supersedes `plan/` wherever they conflict.

---

## Problem

A utility-scale solar park tells you a string is down. It does not tell you which
panel, why, how urgent, or what it costs to wait. Aerial IR inspection is flown on
an **annual cadence**, so sub-inverter faults go undetected for weeks to months
(sourced in `01-hero.md`). Every undetected day of a cracked or soiled string is
lost generation nobody is accounting for.

## Users and surface

| Role | Surface |
|---|---|
| Control-room operator | Desktop web, 1920×1080 and 1366×768, dark, often projected |
| Field crew | Receives the approved work order (out of scope: no mobile app) |
| Judge / evaluator | Same console. The product is the demo. |

## USP

**"The plan, not the picture."** Prior art (Raptor Maps, Zeitview, Sitemark) already
does drone thermal with AI classification, and two of them already build
georeferenced 3D twins. The twin is table stakes. SURYA closes the loop: a computed
deadline, a plan that re-derives live under perturbation, and the arithmetic on
screen. Full statement and credit obligations in `01-hero.md`.

## Scope rule

> Does it make the operating plan more real, more legible, or more defensible?

If a proposed feature only makes the picture prettier, it is out. This rule gives a
clean yes/no and is the one to hold proposals against at hour 20.

## Scope cut line

**In, in build order:**

1. UI shell and the twin as the main view
2. What-if sandbox *(hero — protected from cuts)*
3. Whole-field thermal classifier *(showpiece — protected)*
4. Crew and drone scheduler
5. Forecast to rupees *(reframed; see `02-stack.md` §7)*

**Explicitly out:** mobile layouts · auth or accounts · a real database · multi-site ·
historical data warehouse · any DSM charge computation · retraining the existing
detector · texturing all 120 arrays · a completion step for work orders (still open
in `docs/backlog.md` §6f and deliberately not pulled into this rework).

## Hard constraints

Carried from CLAUDE.md and confirmed by the owner on 4 Oct 2026:

- **One clock.** Animation that drives state is a bug. Hazards are scenario events.
- **Never invent a number.** Every on-screen figure traces to `/data`, `physics.ts`,
  or a cited primary source with a URL and a date.
- **Zod plus invariants I1–I16.** `src/lib/types.ts` is the sole schema owner.
- **`check:literals`** stays, extended with a forbidden-phrase pass (see below).
- **The approval gate.** The optimizer proposes; a human commits. Always.
- **Evidence scoped to where it was measured.** B-17 is *diagnosed*; the other 119
  are *flagged from modelled signature*. Enforced, not stylistic.
- **No new runtime service.** `/api/triage` stays the only network call.
- **`physics.ts` does not change.** The golden test against `scripts/physics.py`
  must stay green through the entire rework.

## Success metric

At the 13 Oct milestone: a judge names a hazard, the presenter drags it, and the
field, the queue and the deadline all re-derive in **under 150 ms** with no loading
state — screenshot-ready at both 1920×1080 and 1366×768.

## Demo journey

Breadth first, then depth. The hero lands inside the first 60 seconds.

| # | Step | Notes |
|---|---|---|
| 1 | Twin at rest, near-nadir, thermal-tinted | Establishes the steady state |
| 2 | **HERO — judge names a hazard, presenter drags it** | Field recolours, queue reorders, B-17 deadline moves, scheduler re-solves showing heuristic vs optimal |
| 3 | Select B-17 | Panel floats over the twin. Transition, < 1 s |
| 4 | Dispatch drone | Camera follows the aircraft |
| 5 | Live ONNX detection | Box drawn on a frame captured a second ago |
| 6 | Incident and cost of waiting | Fix now / 6 h / tomorrow / 3 days |
| 7 | Approve → scheduled | The gate |
| 8 | Reset | One key. Works mid-drag. |

Everything in the MVP exists to make this path real.

## Milestones

| Date | Deliverable |
|---|---|
| **13 Oct** | UI shell + twin as main view + sandbox working. **Hard** — the PPT needs real screenshots. |
| 15 Oct, 13:04 IST | PPT due |
| 15–24 Oct | Features 3–5, polish, the quality passes |
| 24 Oct | 36-hour round. **Mentor-requested changes only, not first builds.** |
