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
- The twin rests in perspective, low enough that the modules' tilt and the stands
  under them read. (Was "near-nadir default"; superseded at the design gate on
  5 Oct and confirmed by the owner on 6 Oct.) The rail carries a 2D / 3D switch,
  the operator's own choice, in place of the earlier top view.
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

Automatic, and since 6 Oct also the operator's choice from the rail. The
automatic switch and its line in the feed are unchanged. Asking for 3D after the
frame-rate watchdog has tripped overrules it; a browser with no WebGL cannot be
overruled.

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
- Solve **< 50 ms** (measured 32.5 ms worst case in the spike). **Enforced as a
  time limit since 6 Oct (owner ruling).** A solve that reaches it is shown as
  "best plan found", with the gap to HiGHS's proved bound, and is never called
  optimal. Identical input gives an identical plan whenever the solve finishes
  inside the limit, which every day the site itself has posed does.
- Jobs take crew time by repair type, from a declared table in `lib/repair.ts`
  (module replacement, bypass diode service, array wash, string reconnection).
  Declared assumptions, printed behind the `?`. Not sourced.
- Constraints: shift cap, no field work inside the heat window, crew non-overlap,
  per-job deadline.
- **Shows both scores** — greedy baseline and optimum — whatever the difference
  is. On the hero's own state the heuristic matches the optimum and the screen
  says so; no gap is manufactured (owner ruling, 6 Oct).
- Greedy also serves as the fallback if WASM fails to load.
- **Proposes only.** No plan reaches a work order without the approval gate.
- Re-solves on every hazard change, inside the F2 budget.

**Dependencies** — F2 (replan trigger), ranking inputs from `lib/ranking.ts`.

## F5 — Forecast to rupees [MVP, last] — reframed

**Lost MWh × ₹2.446/kWh = lost revenue.** Not a DSM charge. **Built 6 Oct 2026.**

**Acceptance**
- The tariff is the two auction lots blended by capacity, with the arithmetic on
  screen: (200 MW × ₹2.44 + 300 MW × ₹2.45) ÷ 500 MW = ₹2.446/kWh. **Never a bare
  ₹2.44 for the whole block** (owner ruling, 6 Oct). Every rupee figure carries
  its attribution inline.
- 72 h forecast carries **uncertainty bands**, drawn as bands and labelled as such.
- The CERC DSM regulation is cited as context only. **Any code path computing a DSM
  charge is a build failure** — `X` is unpublished and NR is a live market price.
- **Gate cleared 6 Oct 2026.** The owner verified the tariff and gave the two
  sources recorded in `02-stack.md` §7. It was gated from 4 Oct until then.
- The band is a declared assumption, ±5 % on irradiance now to ±15 % at 72 h,
  and says so on screen. It is not a fitted error model.
- `check:literals` fails the build on either lot's figure outside
  `src/lib/money.ts`, and on any deviation-charge identifier anywhere.

**Dependencies** — F2 for the forecast surface.

---

## F6 — Immersive 3D landing page [owner request, 5 Oct 2026]

The owner asked for the landing page to become a 3D environment: the field, panels
and drones in motion, not a text page with a link.

- Built from the twin's own scene components, so it is the same site the console
  shows and costs no new dependency.
- A drone flies a looping inspection pass over the field behind the headline; the
  camera drifts. Motion is derived from one clock, like everything else.
- Every figure on it still comes through `src/app/numbers.ts`. No new claims.
- Reduced motion and WebGL failure fall back to a still frame of the same scene.
- Instanced meshes only, `dpr` capped at 1.5, 60 fps at 1366×768 or it does not ship.
- Scheduled after the hero (P2), before the 13 Oct screenshot gate. It is on the
  cut list: if P2 slips, the existing landing is restyled to direction E instead.

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
