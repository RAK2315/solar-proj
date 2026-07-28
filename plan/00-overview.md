# 00 — Overview

**SURYA AGENT** — autonomous inspection & triage console for utility-scale solar.

This plan pack is the buildable expansion of `CLAUDE.md`. Where the two disagree, **this pack wins on numbers and library versions** (§"Corrections" below); `CLAUDE.md` still wins on the demo script (§2) and the design direction (§12).

---

## Problem

A utility-scale solar park has tens of thousands of panels. SCADA tells you an inverter string is underperforming; it does not tell you *which panel*, *why*, or *how urgent*. Someone drives out and looks. Median time from anomaly to diagnosis is measured in days, and every day of a cracked or soiled string is lost MWh.

We are building the closed loop: **telemetry anomaly → agent triage → drone dispatch → evidence capture → vision analysis → prognosis with a deadline → ranked recommendation → human approval → work order.**

## The one principle

> **Every element on screen must be traceable to either a physics model, a trained model, or a deterministic function — and the operator must be able to see which.**

This is the test for every feature. A number that can't be traced to `scripts/` gets cut, not faked. It's also the answer to the only question that decides this project ("is any of this real?"), so the principle and the pitch are the same sentence.

## North-star metric

**Time from anomaly to actionable, deadlined work order: under 90 seconds, unattended up to the approval gate.** Everything in the build exists to make that number true and visible on a clock.

## Target user & surface

One role: **the control-room operator.** Desktop web console, fixed 1920×1080, driven from a projector. No auth, no accounts, no mobile, no settings. The operator's only input in the entire demo is one click on the approval gate — that is deliberate and is the point.

## The angle

Prior art (the reference demo in `images/`, and the commercial tools — SkyVisor, DroneDeploy, Averroes) all stop at **detection**: they tell you a panel is bad. This stops at **a deadline**: it combines the confirmed defect state, the degradation mechanism, and the 72-hour forecast to say *when the string becomes unrecoverable*, then gates the action behind a human.

A threshold dashboard can tell you a string is down. It cannot tell you that you have until 14:00. That gap is the whole product.

Secondary differentiators from the reference demo, all visible on screen:
- The reference runs on **Paris Sud, Île-de-France**. We run on **Bhadla, Rajasthan** — where soiling and heat are the actual dominant loss mechanisms, which is what makes forecast-aware urgency reasoning load-bearing rather than decorative.
- The reference's colour language is a generic blue/amber dashboard. Ours is the **ironbow thermal LUT end to end**, so the console and the thermal camera speak one language.
- The reference shows no evidence of a trained model. Ours ships **committed weights, a recorded mAP, and named dataset provenance**.

## Scope

**In scope**
- The 90-second scripted demo in `CLAUDE.md` §2, beat for beat.
- Physics-generated telemetry (PVWatts/NOCT model, documented coefficients).
- A genuinely fine-tuned defect detector with real, recorded metrics.
- Classical-CV thermal hotspot extraction → the 5×7 anomaly matrix.
- Three cached LLM reasoning stages, each labelled with its model ID on screen.
- Deterministic (non-LLM) repair-queue ranking.
- The human approval gate.
- Cinematic view with mission log, timecode, status pill, PiP console, target reticle.
- R3F 3D scene (**now in scope** — see below).

**Explicitly out of scope**
- Auth, accounts, database, persistence, settings, onboarding, theme toggle.
- Responsive/mobile layout.
- Live telemetry generation in the browser.
- Live LLM calls during the demo (cached; `LIVE_AGENT=true` is a dev escape hatch).
- Multi-site, multi-day, historical browsing.
- Any feature not visible during the 90 seconds.

## Hard constraints

| Constraint | Value | Source |
|---|---|---|
| Team | **Solo** | user |
| Time | **No limit** (personal project) | user |
| Training hardware | **Colab free T4** | user |
| Sponsor/track requirements | **None** | user |
| Deploy target | Vercel; vision inference offline at build time, no runtime GPU | `CLAUDE.md` §4 |
| Display | Fixed 1920×1080, desktop only | `CLAUDE.md` §3 |

### What "no time limit + solo" changes

`CLAUDE.md` §20 prescribes a solo fallback ladder: *cut M8 (3D), cut acoustic, cut Zone C.* **That ladder does not apply here.** It exists to absorb schedule pressure, and there is none. Solo without a deadline means the constraint is *context-switching cost*, not hours.

So the build order changes shape:
- **M8 (the R3F scene) is promoted from "gated stretch" to a planned phase.** It is still sequenced *after* a complete video-backed demo ships (Phase 6), because "always demoable" is still the right discipline — but it is expected to be built, not expected to be cut.
- **Phases are re-cut around single-threaded flow**, not four parallel workstreams. `CLAUDE.md`'s "four people can now work without talking" framing in M0 is moot; what replaces it is *freeze the contracts early so you never have to re-derive them*.
- **The acoustic evidence stays.** It was first-to-cut under time pressure only.

## Success = one complete journey

> **Physics-generated telemetry frame shows INV-B shortfall → agent triages and concludes telemetry cannot distinguish soiling from damage → drone dispatched → RGB + thermal + acoustic evidence captured → the trained detector localises a crack and classical CV localises four hot cells → prognosis fuses defect state + 72h forecast into a 14:00 deadline → deterministic ranking puts B-17 at #1 → operator clicks APPROVE → work order INC-B17 exists and B-17 turns from CRITICAL to SCHEDULED.**

Every MVP feature exists to make one link in that chain real. If a feature doesn't sit on that arrow, it's V2 at best.

---

## Corrections to `CLAUDE.md` (apply these before writing code)

These are not stylistic preferences. Four are arithmetic errors that make the spec unsatisfiable, and two are dependency facts that changed after the spec was written.

### C1 — The physics sketch does not produce its own stated output ⚠️ blocking

`CLAUDE.md` §8's generator sketch sets `P_RATED_STRING = 40.0` and claims `expected ≈ 36.1 kW`. Run it:

```
T_cell   = 35 + (45-20)/800 × 890            = 62.81 °C
derate   = 0.89 × (1 - 0.0037×37.81) × 0.97 × 0.98 = 0.72767
P_ac     = 40.0 × 0.72767                    = 29.11 kW     ← not 36.1
```

**Fix:** `P_RATED_STRING = 49.61 kW`. That is the nameplate that actually yields 36.10 kW at demo conditions. Do not patch this by deleting the temperature term — the 62.8 °C cell temperature is *the physical reason the crack propagates*, and it is what makes the 14:00 deadline defensible. The nameplate is the free parameter; the physics is not.

Also fix `f_mismatch`: §8 says "~0.42", which yields −58.0%. **Use `0.4160`** for exactly −58.4%.

### C2 — 412 MW is unreachable at the stated conditions ⚠️ blocking

At 890 W/m² and 35 °C ambient, a 500 MW nameplate park produces **363.8 MW**. To show 412 MW you would need either a 566 MW nameplate or an ambient of **4.2 °C** — in Rajasthan, in the middle of a clear day.

**Fix: the headline output is `364 MW`.** Let the generator emit it. This is precisely the failure mode rule #1 was written to prevent, and 364 is no less impressive on a projector than 412.

*(Alternative if you're attached to 412: set park nameplate to 566 MW. I recommend against — 500 MW is a rounder claim and the derate ratio is itself a talking point: "we're showing 73% of nameplate because the cells are at 63 °C, and that's the model, not a fudge.")*

### C3 — `−42%` and `−58.4%` are assigned to the same object ⚠️ blocking

§2 (t=10–18) says B-17 is `15.0 / 36.1 = −58.4%`. §19 and the mission log say **panel −42%, string −58.4%**. Both cannot describe B-17. The reference screenshots show `Output deviation −42%` in the ANALYSIS block while the inverter table shows `58.4%`, so the reference has the same ambiguity.

**Fix — bind each number to exactly one object:**

| Object | Meaning | Actual | Expected | Deviation | Where it appears |
|---|---|---|---|---|---|
| **String `B-17-S3`** | the faulted string on INV-B | 15.02 kW | 36.10 kW | **−58.4%** | InverterTable, triage prompt |
| **Array `B-17`** | the array group containing it | — | — | **−42.0%** | DetailPanel ANALYSIS, mission log |
| **INV-B** | inverter aggregate | 15.02 kW | 36.10 kW | **−58.4%** | InverterTable |

The array sits at −42% because only part of it is faulted; the string sits at −58.4% because the fault is entirely inside it. **This is a feature, not a workaround** — `CLAUDE.md` §8 already calls the distinction "a credibility marker," and this makes it physically true instead of asserted. Derive `−42%` in the generator as the array-weighted mean so it is a computed number, not a typed one. See `03-data-model.md` §"Deviation derivation" for the exact formula.

### C4 — Bhadla coordinates are off; capacity is understated

`CLAUDE.md` §19 says `27.530° N, 71.910° E` and flags it "*(verify)*". Verified: Bhadla Solar Park is at **27.5397° N, 71.9153° E** (27°32′23″N 71°54′55″E), total capacity **2,245 MW**, 5,700 ha, operational 20 March 2020.

**Fix:** use `27.540° N, 71.915° E`. Describe the site as **"a 500 MW block of Bhadla Solar Park"** — accurate, and it explains why the console shows 120 arrays rather than tens of thousands.

### C5 — The named Groq model is deprecated ⚠️ visible on screen

`llama-3.3-70b-versatile` was **deprecated 2026-06-17**, including free and developer tiers. The model ID is rendered in the UI header of every agent card (`CLAUDE.md` §9), so a stale ID is visible to anyone reading the screen.

**Fix:** `openai/gpt-oss-120b` on Groq — Groq's own recommended migration target for Llama 3.3 70B, and on the free tier. Record it in `AgentCache.meta.model`. See the ADR in `02-architecture.md`.

### C6 — R3F v8 will not run on this stack

`CLAUDE.md` §4 specifies Next.js 15, which ships React 19. **@react-three/fiber v8 is incompatible with React 19**; v9 is the React 19 pairing.

**Fix:** pin `@react-three/fiber@^9`, `@react-three/drei@^10`. Known drei quirks under R3F v9 (`MeshPortalMaterial`, `RenderTexture` — the `__r3f` property restructured) — we use neither, so this is low risk, but pin exact versions in `package.json` rather than floating.

### C7 — YOLOv8 is AGPL-3.0 and it is contagious to the weights

Ultralytics is AGPL-3.0. Committing **custom-trained weights** to the repo means the whole project must be released under AGPL-3.0. For a public personal project that is fine — but it must be a decision, not an accident.

**Fix:** either add `LICENSE` (AGPL-3.0) and say so in the README, or switch to **RF-DETR (Apache 2.0)**. ADR in `02-architecture.md` recommends staying on YOLOv8n + AGPL for a personal project; the ADR records why.

### C8 — the typo in the design tokens

`CLAUDE.md` §12 ships `--line-active: #2A3span;` and admits it's deliberately broken. Correct value: **`#2A3446`**. Consider this acknowledged.

---

## Sources

- [Bhadla Solar Park — Wikipedia](https://en.wikipedia.org/wiki/Bhadla_Solar_Park)
- [PVWatts Version 1 Technical Reference — Dobos, NREL/TP-6A20-60272](https://docs.nrel.gov/docs/fy14osti/60272.pdf)
- [PVWatts — Sandia PV Performance Modeling Collaborative](https://pvpmc.sandia.gov/modeling-guide/2-dc-module-iv/point-value-models/pvwatts/)
- [Groq Model Deprecations](https://console.groq.com/docs/deprecations)
- [React Three Fiber — Installation / version pairing](https://r3f.docs.pmnd.rs/getting-started/installation)
- [Ultralytics License](https://www.ultralytics.com/license)
- [RF-DETR — Roboflow (Apache 2.0)](https://github.com/roboflow/rf-detr)
