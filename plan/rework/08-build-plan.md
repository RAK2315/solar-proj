# 08 — Build plan

**Today:** 4 Oct 2026. **Hard milestone:** 13 Oct — UI shell, twin as main view, and
the sandbox must work, because the PPT (15 Oct, 13:04 IST) needs real screenshots.
Build continues to 24 Oct. The 36-hour round is **mentor-requested changes only**.

> **Team.** SIGMOID — solo builder plus Claude Code; Colab training runs in a
> parallel session. Recorded 4 Oct 2026 after the division of labour was left
> unspecified three times; the owner offered this as the fallback. **Correct it if
> wrong.** The only thing it changes is whether P3 training truly parallelises;
> this plan keeps it off the UI critical path either way.

---

## Ordering rule

Something demoable must exist at every point. More time moves the cut line, never the
order. Phases 1 and 2 deliver the hero; everything after is addition.

---

## P0 — Prepare (0.5 day) · by 5 Oct

Nothing visible ships. This is the phase that stops a confident refactor at hour four
from taking the demo down.

- Delete `beats.test.tsx`; retire demo mode (owner ruling A).
- Write the **seeded rehearsal test** that replaces it: a committed seed, asserting
  the seeded live run reproduces array deviation, the computed deadline, and queue
  ordering. This is the pitch's reproducibility guarantee.
- Apply the approved keep / rewrite / delete list to CLAUDE.md.
- **Verify `highs` WASM loads under the Next 15 app router.** Flagged in the
  compatibility matrix; cheap now, expensive at hour 30.
- **Verify the ONNX opset** the classifier will export against ORT 1.19.2 — before
  training finishes, not after.

**Verification:** `npm run build` green with 512 − (beats tests) + 1 new test.

## P1 — UI shell and the twin (3 days) · by 8 Oct

- Delete `useFitToWindow` and `--shell-w` / `--shell-h`. Move to `100dvh`.
- Rewrite the token and type layer in `globals.css` per `06-design-system.md` §2–§3.
- Twin becomes the main view: 120 arrays instanced, near-nadir default camera.
- Floating overlay panels; `components/twin/` and `components/overlay/`.
- Demote `FarmMap.tsx` to the fallback; add WebGL capability check and fps watchdog.
- Re-point `check:layout` at the new root; add 1366×768 as a second required pass.

**Verification:** 60 fps with all 120 arrays at both widths · `check:layout` green at
both · zero uppercase labels · nothing under 14 px · screenshot matches the
correct-render description in `06-design-system.md` §7.

**Risk:** the largest phase by far — ~7,000 LOC of components. If it slips, P2 slips,
and P2 is the hero. See `09-risks.md` R1.

## P2 — What-if sandbox (2 days) · by 10 Oct — THE HERO

- `lib/hazard.ts`, pure: `Hazard[] → per-array (g, tAmb)`. Unit-tested headless.
- Hazard variants added to the `ScenarioEvent` union in `session.ts`.
- `live.ts` applies the modifier before `evaluateArray`. **`physics.ts` untouched.**
- Drag interaction on the twin: footprint follows the pointer, drops as an event.
- One-key reset; one-key seeded rehearsal. Both must work mid-drag.

**Verification:** drop → full replan **under 150 ms**, measured, no loading state ·
seek backwards and the hazard rewinds · golden test against `scripts/physics.py`
still green · reset works from every state including mid-drag.

**This is the milestone.** At the end of P2 the PPT screenshots exist.

## P2b — Immersive 3D landing (1 day) · by 11 Oct

Owner request, 5 Oct. F6 in `03-features.md`. Starts only after P2 passes.

- Landing rebuilt on the twin's scene components: field, panels, a drone on a
  looping inspection pass, drifting camera, the headline and figures in glass.
- Still-frame fallback for reduced motion and for no WebGL.

**Verification:** 60 fps at 1366×768 · every figure still from `numbers.ts` ·
fallback renders with WebGL blocked · `view.test.tsx` updated and green.

---

### ◆ 13 Oct — PPT SCREENSHOT GATE ◆
### ◆ 15 Oct 13:04 IST — PPT DUE ◆

---

## P3 — Thermal classifier (2 days, training parallel from day 1) · by 17 Oct

- Colab: train on the full InfraredSolarModules set. **Starts day 1, runs throughout.**
- Export to ONNX; verify opset against the pinned runtime (done in P0).
- `store/classifier.ts`, mirroring `store/detector.ts`. Lazy-load after first paint.
- Thermal sweep across the twin; held-out metric printed beside it.
- **Forbidden-phrase pass added to `check:literals`** for the diagnosed/flagged rule.

**Verification:** full 120-array sweep under 2 s · real per-class metric on screen with
its split · detector still returns its committed numbers · build fails if "diagnosed"
appears against a modelled array · InfraredSolarModules credited on screen.

## P4 — Scheduler (1.5 days) · by 19 Oct

- `lib/lpModel.ts` (pure, unit-tested alone) and `lib/scheduler.ts` (wraps HiGHS).
- Greedy baseline retained, both as fallback and as the number shown beside the optimum.
- Re-solve on every hazard change, inside the P2 budget.

**Verification:** deterministic across repeated runs · under 50 ms · both scores
displayed · **no plan reaches a work order without the approval gate** · greedy
fallback works with WASM blocked.

## P5 — Forecast to rupees (1 day) · by 21 Oct

**Blocked until the owner confirms the PIB link.**

- Lost MWh × ₹2.44/kWh, attribution rendered inline.
- 72 h forecast with uncertainty bands, drawn and labelled as bands.
- CERC DSM cited as context only. **Any DSM charge computation is a build failure.**

## P6 — Quality passes (2 days) · by 23 Oct

In this order, per CLAUDE.md:

1. `deslop` — the rework will touch many files
2. `simplify`
3. `/code-review`
4. Full browser walk of the demo journey with the console open, both widths, including
   the non-happy paths: WebGL blocked, WASM blocked, agent unavailable, mid-drag reset.

## P7 — 24 Oct, the 36-hour round

**Mentor-requested changes only.** No first builds. If something is not working by
23 Oct it is cut, not started.

---

## Running cut list

Cuts come off the bottom. **F2 and F3 are never cut.**

| Order | Cut | Trigger |
|---|---|---|
| 1 | STRETCH items | any slip |
| 2 | `recharts` removal (DR-5) | P1 running hot |
| 2b | P2b 3D landing — restyle the existing landing to direction E instead | P2 not passed by 11 Oct |
| 3 | P5 rupees | PIB unconfirmed, or P1 slips > 1 day |
| 4 | P4 scheduler polish — keep the solve, drop the plan strip | P1 slips > 2 days |
| 5 | P3 sweep across all 120 — classify a subset, say so | training late |
| **never** | **P2 sandbox, P1 twin** | — |

## Standing rules during the build

- Typecheck, lint and tests as you go. Not at the end.
- When a phase passes verification: update CLAUDE.md status, commit, and say in two
  lines what is demoable now.
- **Never `npm run dev`** — measured dead on ~1 load in 10. Use `npm run demo`.
- A build interrupted partway leaves no build at all. Kill the port, wipe `.next`,
  build, then serve.
- `npm run demo` needs network for `next/font`. A DNS blip fails the build; retry
  before debugging. Seen once on 4 Oct: `getaddrinfo ENOTFOUND fonts.googleapis.com`,
  green on retry with no code change.

---

## Browser verification — learned the hard way, 4 Oct 2026

### SwiftShader stalls animations, and a screenshot then lies

Running Chrome with `--use-angle=swiftshader` blocks the main thread hard enough that
**CSS animations do not advance during a `waitForTimeout`**. A screenshot taken
"after" a 150 ms animation can capture its `from` keyframe — so an element that
animates `opacity: 0 → 1` photographs **completely blank**.

This cost a false bug report on 4 Oct: a module screen was diagnosed as broken when
the animation had simply never ticked. Without the SwiftShader flags the same screen
settled correctly in under 600 ms.

**Rules when screenshotting anything animated:**
- Assert the settled state before capturing: poll `getComputedStyle(el).opacity` or
  `el.getAnimations().length === 0`, do not trust a fixed wait.
- A blank capture under SwiftShader is a timing artifact until proven otherwise.
  Re-check without the GL flags before believing it.
- **This matters immediately for the four mockup routes**, which screenshot panels
  that animate in over a live 3D canvas.

### `check:layout` already takes the width

`scripts/check_layout.mjs` reads `process.argv[2]` and `[3]`, defaulting to 1512×900.
Adding the second required pass in P1 is a second invocation, not a rewrite:

```
node scripts/check_layout.mjs 1920 1080
node scripts/check_layout.mjs 1366 768
```

### Harness specifics

- Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`, driven by
  `playwright-core` (already a dependency).
- 3D needs `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, with
  the caveat above.
- Arrays are clickable via `[data-panel-id]`; the 2D fallback carries the same hook.
- Write throwaway scripts to the **repo root** — ESM resolves packages from the
  file's own location — and delete them afterwards.
- `npm run demo` writes nothing to stdout you can block on; wait with
  `until grep -q "Ready in" <log>; do sleep 3; done` in a backgrounded shell.

### The `impeccable` skill

- Its `context.mjs` lives at `~/.claude/skills/impeccable/scripts/`, **not** in the
  project. The documented `node .claude/skills/...` invocation fails here.
- `PRODUCT.md` now exists at the repo root, so the skill will not re-trigger `init`.
  It is deliberately thin and points at this pack.
