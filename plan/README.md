# SURYA AGENT — plan pack

> ### ⚠️ Numbers here are superseded by `../docs/contract-freeze.md`
>
> This pack was written before anything was generated. Phase 0 and Phase 1 produced
> corrections **C9–C19** on top of this pack's own C1–C8. Where a number differs, the
> freeze doc wins — and where the freeze doc differs from the generator, the **generator**
> wins and the invariants say so.
>
> Known stale figures in these files: `1.44 MWh` (→ **3.07**), `−41.8 %` (→ **−41.7**),
> `baseline ~47 °C` (→ **62.8**), cell grid `(2,5)(2,6)(4,5)(4,6)` at ΔT +8/+6/+5
> (→ **(2,3)(2,4)(2,5)(2,6)** at **≈+2.8**), "~14 decorative warning panels" (→ **2**).
> `schemas.ts` is historical; `src/lib/types.ts` is the live schema owner.
>
> Everything else here — the architecture, the ADRs, the phase order, the design system,
> the risk register — stands.

Buildable expansion of `../CLAUDE.md`. Read in order; start coding from Phase 0 in `05`.

| File | What it settles |
|---|---|
| [`KICKOFF-PROMPT.md`](KICKOFF-PROMPT.md) | **Start here.** Copy-paste prompt for a fresh Claude Code session |
| [`PREREQUISITES.md`](PREREQUISITES.md) | API keys, datasets, media assets, toolchain — ~30 min of setup |
| [`00-overview.md`](00-overview.md) | Problem, the one principle, scope, **and the 8 corrections to `CLAUDE.md`** |
| [`01-features.md`](01-features.md) | Every feature, tagged MVP/V2/STRETCH, with checkable acceptance criteria |
| [`02-architecture.md`](02-architecture.md) | Components, diagrams, selector contracts, 7 ADRs, the code seams, env vars |
| [`03-data-model.md`](03-data-model.md) | JSON contracts, enums, **the deviation derivation**, invariants I1–I16, seed data |
| [`schemas.ts`](schemas.ts) | **Runnable.** Zod schemas + `assertInvariants()` + `rankQueue()`. Copy to `src/lib/types.ts`. |
| [`04-design-system.md`](04-design-system.md) | Tokens, type scale, layout, component states, motion, a11y, copy rules |
| [`05-build-plan.md`](05-build-plan.md) | 11 phases, each ending in a demoable slice; decisions; what NOT to build |
| [`06-risks.md`](06-risks.md) | 12 risks with fallbacks, plus the judge questions rehearsed |

## Read this first

**`CLAUDE.md` contains four arithmetic errors that make it unsatisfiable as written.** Its own generator sketch produces 29.11 kW where it claims 36.1 kW, and 412 MW is unreachable at the stated irradiance and ambient. `00-overview.md` §Corrections has the fixes (C1–C8). Apply them in Phase 0, before anything depends on a number.

Where this pack and `CLAUDE.md` disagree:
- **Numbers and library versions →** this pack wins.
- **The 90-second demo script (§2) and design direction (§12) →** `CLAUDE.md` wins.

## Context this was planned against

Solo builder · no deadline · Colab free T4 · no sponsor or track constraints.

That combination is why `CLAUDE.md` §20's solo cut-ladder (drop the 3D scene, the acoustic evidence, Zone C) **does not apply** — it exists to absorb schedule pressure, and there is none. All three are back in scope, and the R3F scene is a planned phase rather than a gated stretch.

## The one principle

> Every element on screen must be traceable to either a physics model, a trained model, or a deterministic function — and the operator must be able to see which.

It's the test for every feature, and it's also the answer to the only question that decides this project.
