# 02 — Stack lock

**Locked 4 Oct 2026.** After lock, no change without a new decision record and the
owner's approval. Versions verified against the npm registry on 4 Oct 2026.

The existing stack is a **constraint, not a decision** — it is already built, tested
and deployed. This file selects only for the new layers.

---

## 1. Existing stack (starting constraint, from `package.json`)

| Layer | Pinned | Status |
|---|---|---|
| Framework | `next` 15.5.22 | keep |
| UI | `react` / `react-dom` 19.1.0 | keep |
| 3D | `@react-three/fiber` ^9.6.1, `three` ^0.180.0, `@react-three/drei` ^10.7.7 | keep — R3F v9 is the React 19 line |
| Post | `@react-three/postprocessing` ^3.0.4 | keep — thermal pass |
| State | `zustand` ^5.0.8 | keep |
| Schema | `zod` ^4.1.11 | keep — sole schema owner |
| Inference | `onnxruntime-web` ^1.19.2 | **keep, do not bump** — see DR-3 |
| Motion | `framer-motion` ^12.23.12 | keep |
| Charts | `recharts` ^2.15.4 | **candidate for removal** — see DR-5 |
| Icons | `lucide-react` ^0.544.0 | keep |

---

## 2. Decision records

### DR-1 — Scheduler solver: `highs` 1.15.3 (HiGHS compiled to WASM)

- **Requirement:** R3 — deterministic, under 50 ms, provably optimal, no new service (R6).
- **Candidates:** `highs` (HiGHS/WASM) · `yalps` 0.6.4 (pure TS) · hand-rolled greedy plus local search · `glpk.js` 5.0.0 · OR-Tools via a Python service.
- **Eliminated immediately:**
  - OR-Tools — needs a Python runtime. Owner ruling C: no Python serverless.
  - `glpk.js` — **GPL-3.0**. Disqualifying for a shipped product (R10).
- **Spike run 4 Oct 2026**, 4 instances, 15 solves each, deterministic seed:

  | case | MILP vars | optimal | greedy | gap | median solve |
  |---|---|---|---|---|---|
  | baseline 8 jobs / 3 crews / cap 8 / ban 3 | 117 | 53.15 | 53.15 | 0.0 % | 7.2 ms |
  | tight 12 / 2 / cap 5 / ban 4 | 106 | 41.65 | 39.99 | **4.0 %** | 12.5 ms |
  | harsh 16 / 2 / cap 4 / ban 5 | 98 | 39.82 | 38.20 | **4.1 %** | 21.9 ms |
  | extreme 20 / 3 / cap 4 / ban 6 | 123 | 45.78 | 42.48 | **7.2 %** | 32.5 ms |

- **Chosen because:** greedy ties only when the schedule has slack. The moment
  constraints bind it loses 4 to 7 per cent — and *binding constraints is exactly what
  the heatwave hazard produces*, since it widens the no-field-work window. The hero
  moment's second beat depends on that gap existing. 32.5 ms worst case is inside R3.
- **Gives us:** provable optimality as a judge answer; declarative constraints, so a
  new rule is a new line rather than a rewritten heuristic; a visible
  heuristic-versus-optimal delta.
- **Costs us:** a roughly 1 MB WASM payload, and LP-format string building, which is
  fiddly and must be unit-tested.
- **Keep greedy anyway** as the labelled baseline shown beside the optimum, and as the
  fallback if WASM fails to load. About 40 lines; already written in the spike.
- **Verified:** registry.npmjs.org/highs — 1.15.3, MIT, published 2026-09-11.
- **Determinism:** confirmed — identical objective across repeated solves.

### DR-2 — Thermal classifier: a second ONNX model on the same runtime

- **Requirement:** R4, R5, R6.
- **Candidates:** a separate ONNX classifier · extending the existing YOLO head with
  new classes · server-side inference.
- **Chosen:** a separate classifier exported to ONNX from the Colab notebook, loaded
  through the existing `store/detector.ts` pattern.
- **Why not extend the YOLO head:** retraining the detector risks the one number the
  project's credibility rests on (`Cracked` AP@50 0.995). A second model is additive
  and cannot regress the first.
- **Why not server-side:** R6, and the "it ran *here*" claim is the USP.
- **Costs us:** a second model download. Mitigate by lazy-loading the classifier after
  first paint — the detector is needed first in the demo journey anyway.
- **Spike:** not needed. `onnxruntime-web` is already proven in this codebase.

### DR-3 — `onnxruntime-web` stays at ^1.19.2, NOT bumped to 1.30.0

- Latest is 1.30.0 (verified 2026-09-14), but the committed detector works on the
  pinned line, and ORT has a history of breaking WASM asset paths between minors.
- **Bumping buys nothing the hero moment needs.** Revisit only if the classifier export
  requires an opset the pinned runtime cannot load — and check that in the Colab
  notebook *before* training finishes, not after.

### DR-4 — Hazard model: a `ScenarioEvent` union, no new store

- **Requirement:** the one-clock rule; R2; R8.
- Spatial hazards (dust, cloud) carry a footprint `{cx, cy, radius, intensity}`.
  The heatwave carries intensity only, because that is what it physically is.
- Applied in `lib/live.ts` as a per-array `(g, tAmb)` modifier before `evaluateArray`.
  **`physics.ts` does not change** — verified: it already takes irradiance and ambient
  as per-array arguments (`live.ts:163`). The golden test against `scripts/physics.py`
  stays green.
- **This is the single most important architectural finding in the rework.** It is why
  the sandbox is cheap rather than a physics rewrite.

### DR-5 — Charts: drop `recharts`, draw with SVG

- Forecast bands and sparklines are the only consumers. The new art direction is
  F1-broadcast overlays — thin strokes, no chart chrome, no tooltips — which is mostly
  a fight against recharts' defaults.
- Dropping it removes a React 19 compatibility surface and roughly 100 KB.
- **Costs:** hand-drawn axes. Small; the data is already arrays of numbers.
- **Not blocking.** If the rework runs hot, keep recharts and restyle. Decide at the
  13 Oct milestone.

### DR-6 — Styling: stay on Tailwind v4 plus CSS custom properties

- The token layer in `globals.css` is sound. It is the *type scale* that is wrong, not
  the mechanism. Rewriting tokens is cheaper and far safer than changing tooling.
- No component kit. Floating overlay panels over a 3D canvas are not what shadcn is for.

### DR-7 — No new backend

- `/api/triage` (Groq) remains the only runtime network call. Scheduler, classifier and
  hazards are all client-side. Satisfies R6; nothing new can cold-start on stage.

---

## 3. Compatibility matrix

| Pair | Risk | Status |
|---|---|---|
| React 19 ↔ R3F v9 / drei v10 | the classic break | already running |
| `highs` WASM ↔ Next 15 bundler | WASM asset path under the app router | **verified in P0, 5 Oct 2026.** Loads and solves in Chrome (optimal, 23 ms on a toy MILP). Needed one fix: the ESM build names `node:module` and friends, which webpack cannot resolve for the browser; `next.config.ts` strips the scheme and resolves them to nothing. The `.wasm` must be served from `/public` and found through `locateFile`; P4 adds the copy step to `sync:artefacts`. |
| `highs` WASM ↔ `onnxruntime-web` | two WASM modules, memory | low; both well under budget |
| Next 15 ↔ Node 24.16 | — | already running |
| ONNX opset ↔ ORT 1.19.2 | classifier export | **checked in P0, 5 Oct 2026.** The detector that already runs here is opset 12, IR version 7 (read from `public/models/defect_yolov8n.onnx`). Export the classifier at **opset 12**: it is the one opset proven on this pinned runtime. Do not accept the exporter's default without reading it back. |

Two items are flagged, not resolved. Both are cheap to check now and expensive to
discover late.

---

## 4. Capability exploitation map

| Tool | Strongest capability | Used by | Deliberately unused |
|---|---|---|---|
| HiGHS | exact MILP with declarative constraints | scheduler; heuristic-versus-optimal display | continuous LP, QP |
| R3F / three | instanced geometry, post-processing | the 120-array twin, the thermal sweep | shadows, physics, HDRI |
| ONNX Runtime Web | in-browser inference | detector plus classifier | the WebGPU backend — uneven laptop support |
| Zustand | selector-level subscription | per-array updates without a whole-tree rerender | middleware beyond `persist` |
| Zod | parse-don't-validate at the boundary | scenario events, classifier output | branded types |

---

## 5. Judge-ready justifications

**Why HiGHS over OR-Tools?** OR-Tools needs a Python runtime, and we refused a second
service because a cold start on stage is a demo failure. HiGHS is the same class of
exact solver compiled to WebAssembly, so it runs in the browser inside our
single-clock model. We measured it: 32 ms worst case on our hardest instance.

**Why an exact solver for eight jobs?** Because a greedy heuristic ties with it only
while the schedule has slack. We measured a 4 to 7 per cent optimality gap once shift
limits and the heat window bind — precisely the regime the heatwave scenario creates.
We show both numbers so you can see the difference rather than take our word for it.

**Why a second model instead of retraining the detector?** The detector scores 0.995
AP@50 on `Cracked` on a held-out split. Retraining would risk the strongest number in
the project in order to add classes we can carry in a separate model instead.

**Why is only one array "diagnosed"?** We hold one real thermal capture, for B-17. The
other 119 are *flagged from their modelled thermal signature* — the classifier is real
and its held-out metric is on screen, but the input is physics-derived and we say so.

---

## 6. Locked stack

```
NEW
  highs            1.15.3    MIT    scheduler (WASM MILP)
  greedy baseline  in-repo   —      fallback and labelled comparison

KEPT
  next 15.5.22 · react 19.1.0 · @react-three/fiber ^9.6.1 · three ^0.180.0
  @react-three/drei ^10.7.7 · @react-three/postprocessing ^3.0.4
  zustand ^5.0.8 · zod ^4.1.11 · onnxruntime-web ^1.19.2 (pinned, DR-3)
  framer-motion ^12.23.12 · lucide-react ^0.544.0 · tailwind v4

UNDER REVIEW
  recharts ^2.15.4 — drop at the 13 Oct milestone if the rework is on schedule (DR-5)

REJECTED
  glpk.js       GPL-3.0
  OR-Tools      needs a Python runtime
  yalps         pure TS, but no advantage over greedy where it matters
```

---

## 7. Feature 5 (forecast to rupees): VERIFICATION RESULT — **blocked**

Primary source read in full, not summarised:
`https://www.cercind.gov.in/regulations/192-Noti.pdf`
*CERC (Deviation Settlement Mechanism and Related Matters) Regulations, 2024*,
No. L-1/260/2021/CERC, dated **05 August 2024**. Checked 4 Oct 2026.

**Two independent blockers.**

1. **Regulation 6(2)(b)**, the regime in force since 01.04.2026:

   ```
   DWS (%) = 100 × [Actual Injection − Scheduled generation]
                 ÷ [(X% of Available Capacity) + (100−X)% of Scheduled Generation]

   Provided 'X' shall be stipulated by the Commission through separate order(s)
   after public consultation.
   ```

   **`X` is not in the regulation.** Without that separate order, the formula
   currently in force cannot be computed from the primary source.

2. **Regulation 7(1):** the Normal Rate is the highest of (A) the weighted-average ACP
   of the Integrated Day-Ahead Market, (B) the weighted-average ACP of the Real-Time
   Market, or (C) a one-third blend of those two plus ancillary service charges. That
   is **a live exchange price per time block**, not a constant — it needs an IEX or
   PXIL data feed.

**What IS citable right now:** Regulation 6(2)(b) itself, and the volume limits in
force from 01.04.2026 for solar — `VLws(1)` = deviation up to 5 % DWS, `VLws(2)` =
deviation beyond 5 % and up to 10 % DWS.

### RESOLVED 4 Oct 2026 — owner ruling: reframe

Feature 5 becomes **lost MWh × a cited PPA tariff = lost revenue**. The DSM
regulation is cited on screen as *context for why deviation matters*. The product
**never claims to compute a DSM charge**, because `X` is unpublished and NR is a
live market price. Treat any attempt to do so as a build failure.

### The tariff, from primary source

| Field | Value |
|---|---|
| Tariff | **₹2.44 / kWh** |
| Project | Bhadla Phase-III Solar Park, Rajasthan — **500 MW** |
| Auction | SECI |
| Winners | ACME Solar Holdings 200 MW @ ₹2.44; SBG Cleantech One 300 MW @ ₹2.45 |
| Terms | **fixed for 25 years, no escalation, no VGF** |
| Announced | MNRE, 12 May 2017 |
| Primary source | `https://www.pib.gov.in/newsite/printrelease.aspx?relid=161755&reg=48&lang=2` |
| Checked | 4 Oct 2026 |

**Why this tariff and not another:** Bhadla Phase-III *is* a 500 MW block of Bhadla,
which is exactly what this project models. The figure is not a market average
borrowed from elsewhere; it is the tariff discovered for this site at this scale.
Being fixed for 25 years from 2017, it remains in force through 2042, so quoting it
in 2026 is correct rather than historical.

**Caveat, must be cleared before the deck ships:** `pib.gov.in` returns HTTP 403 to
automated fetches, so this was verified through the search engine's extract of that
release plus four independent corroborations (IEA, Mercom, PV-Tech, Business
Standard) rather than by reading the page directly. **The owner must open the PIB
link once and confirm the figures.** Until that is done, treat the tariff as
corroborated-but-not-primary-read.

**On-screen wording:** "₹2.44/kWh — tariff discovered at the SECI Bhadla Phase-III
auction, fixed 25 years (MNRE, 12 May 2017)." Never an unattributed rupee figure.

---

## 8. Change control

Any change to the locked list requires a new decision record in this file and the
owner's approval. No mid-build substitutions.
