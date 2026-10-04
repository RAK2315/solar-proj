# 01 — Hero moment, showpiece, and the numbers the stack must hit

Supersedes nothing in `plan/`; this pack covers the UI rework and the four new
features. Where this pack and `plan/` conflict, this pack wins.

---

## USP — "the plan, not the picture"

Set 4 Oct 2026 after the prior-art sweep. Raptor Maps, Zeitview and Sitemark all do
drone thermal plus AI defect classification at utility scale, and Raptor Maps and
Sitemark are already building georeferenced 3D digital twins. **The twin is table
stakes; do not pitch it as the differentiator.**

The gap is that those platforms *detect and report*. SURYA closes the loop:

1. an approved work order with a **computed** deadline, not a flagged defect;
2. a plan that **re-derives live** when conditions are perturbed;
3. **arithmetic shown** — the ranking formula and its inputs, on screen.

Credit obligation: the thermal dataset is Raptor Maps' own open
**InfraredSolarModules** set. Say so on screen and in the deck, before a judge finds it.

---

## Problem statement — sourced

**Verified claim, use this wording:** periodic aerial IR inspection at utility-scale
PV is typically **annual**, so sub-inverter faults go undetected for weeks to months.
The framing is **continuous versus annual**, not fast versus slow.

> "Time-based aerial infrared (IR) imaging is one common detection method used to
> detect failures in the collector field. This is usually performed on an annual
> cadence."
>
> "Periodic IR and visual overscans help in this effort, but as they are often
> performed on an annual basis many failures go undetected for weeks to months at a
> time."
>
> "More subtle sub-inverter faults and failures can accumulate and go unnoticed for
> months or years." *(abstract)*

**Source:** Sheppard, Cook, Perullo (Turbine Logic) and Fregosi, Bolen (EPRI),
*Field Experience Detecting PV Underperformance in Real Time Using Existing
Instrumentation*. `https://www.osti.gov/servlets/purl/1960134` — read in full, 4 Oct 2026.

**Note the attribution.** This is a Turbine Logic / EPRI paper hosted on OSTI. It is
**not an NREL paper** and must not be cited as one.

**"Diagnosis takes days" is cut.** It was never sourced and the verified claim is
both stronger and structurally truer.

---

## Hero moment

**One sentence:** the judge names a hazard, the presenter drags it onto the field,
and the entire operating plan re-derives in front of them.

No rupee figure appears here. Forecast-to-rupees is cut-line item 5 and gated on
CERC verification (see `02-stack.md` §7), so the hero moment must stand without it.

### The beat, second by second

| t | On screen | Why it lands |
|---|---|---|
| −3 s | Twin at rest, near-nadir. 120 arrays, 2 amber. Queue shows 4 jobs, B-17 at 9.21. | Establishes a steady state the judge can hold in their head. |
| 0 s | Judge says "dust storm over the east side". | The input is theirs, not ours. |
| 0–1 s | Presenter drags the dust footprint onto Zone B. The region tints as it moves. | The hazard is a physical object with a position, not a slider. |
| 1 s | Drop. Arrays under the footprint recolour. | Cause and effect are spatially legible. |
| 1–2 s | Three arrays cross into warning. Queue reorders. B-17's deadline moves in. | The plan is derived, not stored. |
| 2–3 s | Scheduler re-solves. Plan strip redraws. **Both scores shown: heuristic vs optimal.** | The optimizer visibly earns its place (spike: 4–7 % gap under binding constraints). |
| +3 s | One line: "7 arrays affected, 2 jobs displaced, B-17 still first." | One sentence, per the copy rule. Detail behind `?`. |

### What must be true for this to work

- Everything on screen is a pure function of `(siteSeconds, scenarioEvents)`.
  The hazard is a `ScenarioEvent`, so the one-clock rule holds and the whole thing
  is seekable and reproducible.
- No loading state between drop and redraw. Budget below.
- Reset is one key. The seeded rehearsal run is one key. Both work mid-drag.

---

## Showpiece

**The full-screen 3D twin carrying a whole-field thermal sweep**, with the
classifier's real held-out metric on screen beside it.

- **Hard because:** 120 arrays classified, rendered as instanced geometry at
  60 fps, with a second ONNX model running in the browser alongside the existing
  detector, on a laptop with no GPU guarantee.
- **Judge sentence:** "The classifier is trained on the Raptor Maps
  InfraredSolarModules set and scores *<metric>* on its held-out split. The sweep
  shows what it flags from each array's modelled thermal signature; B-17 is the
  one array where it ran on a real capture."
- **Proven real by:** the metric is from the held-out split, printed on screen;
  B-17's real capture sits beside the modelled sweep so the difference is visible,
  not asserted.

### Vocabulary rule (load-bearing, lint-enforced)

| Arrays | Verb | Basis |
|---|---|---|
| B-17 | **diagnosed** | real thermal capture |
| the other 119 | **flagged from modelled signature** | physics-derived thermal frame |

"Diagnosed" applied to any array without a capture is a build failure, not a
copy nit. This is rule §0.5 expressed as vocabulary. Add to `check:literals`
as a forbidden-phrase pass.

---

## USP amplifiers

| Amplifier | USP claim it proves |
|---|---|
| Printed ranking formula with live inputs | The ranking is arithmetic, not an LLM opinion |
| Heuristic-vs-optimal score shown on replan | The optimizer is real and measurably better |
| `?` toggle revealing provenance per number | Every number traces to physics or a cited source |
| Seeded rehearsal reproducing B-17 exactly | Reproducible, not a scripted animation |
| Held-out metric beside the sweep | The model is trained, not invoked |

---

## Wow inventory (demo journey, breadth-first)

1. **Twin at rest** — the whole field in 3D, thermal-tinted. Wow: scale.
2. **HERO: hazard drag** — see above. Wow: causation.
3. Select B-17 — panel floats in over the twin. *Transition, < 1 s.*
4. **Drone dispatch** — camera follows the aircraft to the array. Wow: the agent acts in the world.
5. **Live ONNX detection** — box drawn on a frame captured a second ago. Wow: it ran *here*.
6. **Incident + cost of waiting** — fix now / 6 h / tomorrow / 3 days. Wow: the thing a detector cannot do.
7. Approve → array goes scheduled. *Transition, < 1 s.* Wow: the gate.
8. Reset. One key.

---

## Stack requirements (inputs to `02-stack.md`)

| # | Requirement | Number | Source |
|---|---|---|---|
| R1 | Twin renders 120 arrays | 60 fps at 1920×1080 and 1366×768 | hero + showpiece |
| R2 | Hazard drop → full replan | **< 150 ms**, no visible loading state | hero beat 1–3 s |
| R3 | Scheduler solve | deterministic, < 50 ms, provably optimal | hero beat 2–3 s |
| R4 | Thermal classification, 120 arrays | < 2 s for a full sweep, in-browser | showpiece |
| R5 | Existing detector keeps working | ONNX in-browser, unchanged | USP |
| R6 | No new runtime service | zero cold starts, no extra deploy | user ruling C |
| R7 | Graceful degrade | 2D SVG fallback on WebGL failure or sustained fps < target | user ruling (spatial view) |
| R8 | Physics untouched | `physics.ts` signature unchanged, golden test green | verified: `evaluateArray(g, tAmb, …)` is already per-array |
| R9 | Type system | ≤ 5 sizes, ≥ 14 px, mono for IDs only, sentence case | art direction |
| R10 | Licensing | no copyleft in shipped deps | product |
