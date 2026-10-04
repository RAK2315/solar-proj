# 09 — Risks

Ordered by expected damage. Each fallback's first move **keeps the hero moment** and
changes how it is achieved. Cutting it is the last option and the owner's call.

---

## R1 — P1 overruns and eats the hero · HIGH likelihood, HIGH damage

The UI rework is ~7,000 LOC of components, and it sits *before* the hero phase. If P1
slips two days, P2 lands on 12 Oct with no slack before the screenshot gate.

**Why it is survivable:** `selectors.ts` is a universal seam, so the rework is a
presentation swap and the data layer cannot break. The risk is schedule, not breakage.

**Mitigations**
- Build the twin and **one** panel first, then the hero, then the remaining panels.
  The hero does not need all five panels to exist.
- Panel treatment is a token group, so direction A↔B is a token change, not a rebuild.
- Do not restyle the 2D fallback beyond making it legible. Nobody will see it.

**Fallback, in order:** (1) ship P2 over half-rebuilt panels — an ugly panel next to a
working hero still screenshots; (2) use direction B unmodified with no A/B decision;
(3) cut panels to the three the demo journey touches.

## R2 — 60 fps at 1366×768 with 120 arrays · MEDIUM / HIGH

The current scene caps at 600 instances and has never been measured on a low-end
laptop at the smaller width. The showpiece assumes 120 arrays *plus* a thermal sweep.

**Mitigations**
- Instanced meshes only, hard cap retained. Measure on the demo laptop in P1, not P6.
- `dpr={[1, 1.5]}`. Never render at 2×.
- The fps watchdog already exists as F1a; it is a feature, not only a safety net.

**Fallback:** reduce array geometry detail before reducing array *count* — 120 arrays
is the claim. Last resort is the 2D fallback, which is honest and already built.

## R3 — The classifier is late or its metric is poor · MEDIUM / MEDIUM

Training is parallel, but an opset mismatch or a weak held-out score lands at the end.

**The real danger is not lateness — it is a bad number.** The project's rule is to
report the real metric, per class, with its split. A poor score must be shown, not
hidden or rounded.

**Mitigations**
- Verify the opset in P0, before training completes.
- Decide the honest framing early: a modest per-class AP is still a real result, and
  the *sweep* is a visualization of what it flags, not proof that it works.

**Fallback:** classify a labelled subset and say exactly which. "We classified 40 of
120 and here is the metric" is defensible; "120 classified" with a hidden score is not.

## R4 — The judge grabs the mouse · MEDIUM / MEDIUM

The owner's ruling is presenter-driven, but a judge may reach for it anyway.

**Mitigations**
- One-key reset, working from every state including mid-drag. Built in P2, not bolted on.
- Seeded rehearsal one keypress away.
- No state a judge can wedge: hazards are events on one clock, so any state is one
  reset away from the start.
- A demo-safety pass in P6 specifically for this.

## R5 — PIB link unconfirmed, so F5 ships unsourced · LOW / HIGH

The tariff was corroborated across four secondary sources but `pib.gov.in` returns 403
to automated fetches, so the primary page was never read directly.

**This is the one risk that damages credibility rather than the demo.** An unsourced
rupee figure in front of a judge is exactly the failure mode the project's rules exist
to prevent.

**Mitigation:** the owner opens the link once. Two minutes of work.

**Fallback:** cut F5 entirely. It is last on the cut line for this reason.

## R5b — Glassmorphism (mockup C) cannot hold the frame budget · MEDIUM / LOW

`backdrop-filter` over a live WebGL canvas is one of the most expensive things a
browser can be asked to composite, and it is being evaluated at the width with the
least headroom.

**Mitigation:** fps is measured per mockup at 1366×768 and reported beside it. The
measurement is the decision, not taste.

**Fallback:** if C is beautiful but slow, the panel treatment is a token group
(§1 of `06-design-system.md`), so its *look* can be approximated with an opaque tint
plus a light border and no blur. Do not ship a blur that costs the hero its frames.

## R6 — WASM under the Next 15 app router · LOW / MEDIUM

`highs` ships a `.wasm` asset, and bundler asset-path handling is a known friction
point. Discovered at hour 30 this is painful; discovered in P0 it is an afternoon.

**Mitigation:** verified in P0, before anything depends on it.
**Fallback:** the greedy baseline is already written and is a legitimate shipping
answer — the plan strip simply says "heuristic" instead of showing both scores.

## R7 — Scope creep from the 36-hour round · MEDIUM / MEDIUM

A mentor suggests a feature at hour 6 of 36 and it sounds easy.

**Mitigation:** P7 is **mentor-requested changes only, no first builds**, written into
the plan before anyone is in the room. Hold proposals against the scope rule in
`00-overview.md`: *does it make the operating plan more real, more legible, or more
defensible?*

## R8 — A confident refactor breaks the physics · LOW / CRITICAL

Someone moves hazard logic into `physics.ts` because it looks like it belongs there.
The golden test against `scripts/physics.py` fails, and every number on screen loses
its provenance — which is the entire product.

**Mitigation:** the do-not-touch list in `04-architecture.md` §2, and §7's table of
what breaks. `physics.ts` is frozen for the duration of the rework.

---

## Deliberately accepted

- **No work-order completion step** (`docs/backlog.md` §6f). Known, documented, out of
  scope. If a judge asks, the honest answer is that the array's status cannot become
  healthy while the scenario fault is still running in the physics, and retiring the
  fault with the order is real work we chose not to fake.
- **119 arrays are flagged, not diagnosed.** A limitation stated on screen rather than
  papered over.
- **Only two arrays textured.** Cosmetic; nobody has ever asked.
- **No mobile layout.** This runs on a projector.
