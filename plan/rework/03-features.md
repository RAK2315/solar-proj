# 03 — Features

Tags: **[MVP]** the demo journey or hero breaks without it · **[V2]** builds if MVP
lands early · **[STRETCH]** impresses, never blocking.
🛡 = protected from cuts (serves the hero moment or a USP amplifier).

---

## F1 — UI shell, twin as the main view 🛡 [MVP]

Full-screen R3F twin at `100dvh`. Panels float over it. No separate cinematic mode.

**Acceptance**
- 60 fps at 1920×1080 **and** 1366×768 with all 120 arrays rendered.
- No wasted margin: the canvas is the viewport, panels overlay it.
- Near-nadir default camera; operator can pitch into perspective.
- `check:layout` passes at both widths.
- Type system: ≤ 5 sizes, nothing under 14 px, mono only for IDs and codes,
  sentence case throughout. Zero `text-transform: uppercase` on labels.
- One line of copy per panel. Everything else behind the `?` toggle.

**Dependencies** — none. First thing built.

**Gotchas**
- `useFitToWindow` and `--shell-w/--shell-h` are deleted. R3F's `getBoundingClientRect`
  reads post-transform pixels, which is what caused the phase-24 canvas bug; removing
  the scale wrapper removes the whole class of problem.
- `.t-*` classes have **352 usages**. Rewrite the scale, keep the class names where
  the semantics still hold, so the change is mostly in `globals.css`.
- The 2D `FarmMap.tsx` is **not deleted** — it becomes the F2a fallback.

## F1a — Fallback to 2D map [MVP]

Automatic, not a user setting.

**Acceptance**
- WebGL context creation fails → 2D SVG map, no error dialog, console still usable.
- Sustained fps below threshold → same. Threshold **CONFIRMED 4 Oct 2026: 30 fps
  averaged over 3 s.** Not a user setting; the switch is automatic.
- The fallback reads the same selectors, so no second data path exists.
- Switching is announced in the log line, not silent.

## F2 — What-if sandbox 🛡 [MVP] — THE HERO

Drag a dust storm, cloud bank or heatwave onto the twin; everything replans.

**Acceptance**
- Dust and cloud are **spatial**: `{cx, cy, radius, intensity}`. Heatwave is
  **site-wide intensity only**.
- Each hazard enters as a `ScenarioEvent`. No new store, no timer, no `setState`
  in an animation frame.
- Drop → full replan in **< 150 ms**, no loading state.
- Everything downstream re-derives: array status, queue order, deadlines, schedule.
- Seek backwards and the hazard's effect rewinds. It is a function of `t`, not an
  accumulated mutation.
- One-key reset. One-key seeded rehearsal. Both work mid-drag.
- `physics.ts` unchanged; golden test green.

**Dependencies** — F1.

**Gotcha** — the whole feature is a per-array `(g, tAmb)` modifier applied in
`lib/live.ts` before `evaluateArray`. Resist any urge to push it into `physics.ts`.

## F3 — Whole-field thermal classifier 🛡 [MVP] — THE SHOWPIECE

Classifier trained on the full InfraredSolarModules set; all 120 arrays classified;
shown as a thermal sweep across the twin.

**Acceptance**
- Trained in Colab, exported to ONNX, **opset verified against ORT 1.19.2 before
  training completes**.
- Held-out metric printed on screen beside the sweep. Real number, per class, with
  its split. Never rounded up.
- Full 120-array sweep completes in **< 2 s**, lazy-loaded after first paint.
- **Vocabulary enforced:** B-17 *diagnosed*; all others *flagged from modelled
  signature*. A forbidden-phrase check in `check:literals` fails the build otherwise.
- The existing detector is untouched and still returns its committed numbers.
- InfraredSolarModules credited as Raptor Maps' open dataset, on screen.

**Dependencies** — F1 for the sweep surface. Training is independent and starts day 1.

## F4 — Crew and drone scheduler [MVP]

Exact MILP over jobs, 2 drones, 2–3 crews, shift limits, heat threshold.

**Acceptance**
- `highs` WASM. Deterministic: identical input gives an identical plan, every time.
- Solve **< 50 ms** (measured 32.5 ms worst case in the spike).
- Constraints: shift cap, no field work inside the heat window, crew non-overlap,
  per-job deadline.
- **Shows both scores** — greedy baseline and optimum — so the gap is visible.
- Greedy also serves as the fallback if WASM fails to load.
- **Proposes only.** No plan reaches a work order without the approval gate.
- Re-solves on every hazard change, inside the F2 budget.

**Dependencies** — F2 (replan trigger), ranking inputs from `lib/ranking.ts`.

## F5 — Forecast to rupees [MVP, last] — reframed

**Lost MWh × ₹2.44/kWh = lost revenue.** Not a DSM charge.

**Acceptance**
- Tariff rendered with its attribution inline: "₹2.44/kWh — SECI Bhadla Phase-III
  auction, fixed 25 years (MNRE, 12 May 2017)".
- 72 h forecast carries **uncertainty bands**, drawn as bands and labelled as such.
- The CERC DSM regulation is cited as context only. **Any code path computing a DSM
  charge is a build failure** — `X` is unpublished and NR is a live market price.
- **GATED, 4 Oct 2026.** The owner is verifying the PIB tariff personally and will
  report back. F5 does not start until they do. Do not substitute another tariff, do
  not proceed on the corroborating secondary sources, and do not quietly drop the
  attribution to unblock it.

**Dependencies** — F2 for the forecast surface.

---

## V2

- **V2-1 — Real plant dataset with a learned anomaly detector.** Replaces modelled
  signatures with measured ones, which would upgrade 119 arrays from *flagged* to
  *diagnosed*. The single highest-value V2 item.
- **V2-2 — Cleaning and water optimizer.** Soiling recovery against water cost. Fits
  the Industry 4.0 track and the sustainability angle.
- **V2-3 — Work order completion.** Closes `docs/backlog.md` §6f. Needs the scenario
  fault retired with the order, which is why it was never trivial.

## STRETCH

- Hazard **replay** — scrub a stored perturbation back and forth.
- Multi-hazard composition (dust *and* heatwave interacting).
- Export the plan as a shift sheet.

---

## Protected from cuts

F2 (hero), F3 (showpiece), and the arithmetic-on-screen parts of F4. Cuts come off
the bottom: STRETCH, then V2, then F5, then F4's polish. **Never F2 or F3.**
