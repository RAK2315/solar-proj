# CLAUDE.md — SURYA AGENT

**Autonomous inspection & triage console for utility-scale solar.**
Read this file completely before writing any code.

> ### 🟢 STATUS — 2 Aug 2026. Built. Read this box before §2.
>
> **This file was written as a hackathon spec for a 90-second recording. The product
> outgrew it.** The spec is still correct about physics, schemas, identifiers, agent
> prompts and design language. It is out of date about SCOPE, and §2 in particular
> now describes **one artefact the product can produce**, not the product.
>
> The operating instruction, from the project owner, is:
>
> > *"this isn't for a 90 second demo, this is supposed to be an end to end project…
> > I want an entire product where I can work and interact with everything mentioned."*
>
> So **§0 rule 2 — "never add a feature not in the demo script" — is REVOKED.**
> Everything else in §0 stands and is load-bearing.
>
> #### What exists that this spec does not describe
>
> | | |
> |---|---|
> | **Two modes** | `demo` replays the scripted 90 s; `live` runs the site from the physics model at any site time. One set of components serves both. Press `M`. |
> | **Live mode** | Operator selects any of 120 arrays, dispatches a drone to it, watches the 3D flight, approves or overrides work. Session persists across reload. |
> | **Six screens** | Site · Drones · Missions · Repairs · Analytics · Scenario, behind a working icon rail. |
> | **Three faults** | `A-31` (2 strings, −9.1 %), `B-17` (5, −41.7 %, frozen), `C-07` (6, −56.6 %) — plus operator fault injection on the Scenario screen. |
> | **Live agent** | `/api/triage` calls Groq per array, cross-checks every number server-side. `LIVE_AGENT` in `scripts/run_agent.py` verifies the committed cache offline. |
> | **Vision** | ✅ trained. `Cracked` AP@50 **0.995**, evidence confidence **0.9084**, test split. `docs/dataset-provenance.md`. |
> | **Gates** | `prebuild` = sync:artefacts → validate:data → check:literals → **329 tests** → build. |
>
> #### Where to look instead of guessing
>
> | Question | File |
> |---|---|
> | What is still not built, and why | **`docs/backlog.md`** |
> | What each phase changed, in order | **`report.txt`** |
> | Frozen numbers, corrections C1–C19 | `docs/contract-freeze.md` |
> | Schemas, invariants I1–I16 | `src/lib/types.ts` — sole owner |
> | Dataset, licence, real metrics | `docs/dataset-provenance.md` |
> | The PV model | `scripts/physics.py` ↔ `src/lib/physics.ts` (golden-tested against each other) |
>
> #### Known open bugs — see `docs/backlog.md` §6
>
> - **Anomaly matrix does not render in live mode.** `useMatrixFillCount()` derives
>   its fill from the demo clock, which live mode never advances.
> - **"Cell defects" heading appears twice** in the detail rail.
> - **The forecast band is unlabelled as site-wide weather**, so it reads as a bug
>   when it looks identical for every array.
> - **A UI redesign is in flight.** The console is too dense — 10–13 px type
>   throughout, no hierarchy. Treat §12/§13 as the *identity* to preserve (ironbow
>   ramp, IBM Plex, units on every number) and the *layout* as replaceable.

> ### ⚠️ Corrections applied 2026-07-28 — read `docs/contract-freeze.md` first
>
> This file's arithmetic did not add up. Corrections **C1–C8** from `plan/00-overview.md`
> have been applied **in place** below, plus **C9–C13** taken at contract freeze.
> The numbers you now read here are the frozen ones. Where anything still disagrees:
>
> | Topic | Winner |
> |---|---|
> | Numbers, library versions | `docs/contract-freeze.md`, then `plan/` |
> | The 90-second demo script (§2), design direction (§12) | **this file** |
> | Thermal cell localisation and ΔT | **the measurement** — `docs/dataset-provenance.md` |
> | Schema shapes | `src/lib/types.ts` (sole owner) |
>
> Headline changes: farm output **364 MW** (not 412) · array shortfall **−41.7 %**
> (not −42) · `P_RATED_STRING` **49.61** (not 40.0) · hot cells **(2,3)(2,4)(2,5)(2,6)**
> at **ΔT ≈ +2.8 °C** (not two pairs at +8/+6/+5) · Groq model **`openai/gpt-oss-120b`**
> · projected loss **3.07 MWh/72h** (not 1.44) · cell-temperature median **62.8 °C**
> (not 47) · **2** decorative warning arrays (not ~14).
>
> Every one of those is now emitted by `scripts/`, asserted by `npm run validate:data`,
> and printed by that command so you can check it in one line.

---

## 0. How to use this document

This is the single source of truth for the build. It contains the demo script, the data schemas, the physics model, the agent prompts, the design system, and the build order.

Rules for you (Claude Code):

1. **Never invent a number.** Every number that appears on screen must come from `/data` or from `src/lib/physics.ts`, and every value in `/data` must come from a script in `scripts/`. If you need a number and it isn't there, add it to the generator — don't hardcode it in a component. `npm run check:literals` enforces this.
2. ~~**Never add a feature not in the demo script (§2).**~~ **REVOKED** — see the status box above. The 90 seconds is one output of the product, not its scope. The replacement rule: *never add a surface that claims something the data cannot support.* A feature is fine; a feature that fabricates evidence is not.
3. **Never create a second source of time.** See §6. Any `setInterval`, `setTimeout`, `requestAnimationFrame` loop, or CSS animation that drives *state* is a bug. Presentational CSS animation (pulse, glow) is fine. There are two clocks — `demoClock.t` and `session.siteSeconds` — advanced by **one** rAF driver; `flightCue.ts` is the seam that lets one set of splines serve both.
4. **Ask before deviating from a schema in `src/lib/types.ts`.** §7 below is documentation; that file is the owner.
5. **Scope evidence to the array it was measured on.** We hold captured imagery for `B-17` and for nothing else. Any surface showing cell grids, detections, findings, recommendations or deadlines must be gated on `hasCapturedEvidence(panelId)`. This has been violated four separate times in four different components — it is the single most repeated bug in the project.
6. **Report the real metric, per class, with its split.** Never round up, never quote a validation figure as a test figure.
7. When a milestone is done, stop and report against its acceptance criteria before starting the next.

### Code quality, enforced by review not by lint

- **Comments explain WHY, never what.** A comment restating the line below it is noise.
  Delete it. The ones worth keeping record a decision, a constraint, or a bug that
  was already made once.
- **No decorative markup in comments.** Backticks around a plain word, ASCII boxes,
  and trailing punctuation runs add nothing. Backticks are for identifiers only,
  and only where the identifier would otherwise be ambiguous.
- **ASCII only in `.env*`, `scripts/*.py` string literals, and anything a shell reads.**
  An em dash written by a UTF-8 editor and read by a cp1252 shell becomes `â€"`.
  This has already happened once in `.env.local`.
- **No dead controls.** A `<span>` styled to look like a button is a lie about what
  the product does. Either wire it or delete it. This was true of six controls.

---

## 1. What we're building

### One-liner

> An AI agent that watches a 500 MW solar park, detects when a panel is underperforming, dispatches a drone to physically verify why, and hands the operator a ranked repair order with a deadline.

### The problem, stated for a judge

A utility-scale solar park has tens of thousands of panels. SCADA tells you an inverter string is down — it doesn't tell you *which panel*, *why*, or *how urgent*. Someone drives out and looks. Median time from anomaly to diagnosis is measured in days, and every day of a soiled or cracked string is measured in lost MWh.

Soiling and heat are the dominant loss mechanisms in Indian utility-scale solar specifically, which is what makes the forecast-aware urgency reasoning matter here.

> **Sourcing note for the pitch:** do not quote a specific soiling-loss percentage or ₹ figure unless you have pulled it from a named source and can show it. State assumptions out loud instead: "assuming a ₹X/kWh PPA tariff and the observed 58% string shortfall, the 72-hour exposure is ₹Y." An assumption you declare is credible; a statistic you can't source is a rejection signal.

### The loop (this is the product)

```
telemetry anomaly
  → agent triage        (what is wrong, how bad, which component)
  → dispatch drone      (physical verification — the agent takes an action in the world)
  → evidence capture    (RGB + thermal + acoustic)
  → vision analysis     (cell-level defect localisation)
  → prognosis           (defect state + 72h forecast + physics → a deadline)
  → ranked recommendation
  → HUMAN APPROVAL GATE
  → work order
```

The human approval gate is not a nice-to-have. It is the answer to the question every judge asks ("would you let this run unsupervised?") and it must be visibly, prominently in the UI.

### Site

**Bhadla Solar Park, Rajasthan** — real location, one of the largest solar installations in the world. **27.540° N, 71.915° E** (27°32′23″N 71°54′55″E) — verified, C4. Total park capacity is 2,245 MW across 5,700 ha, operational since 20 March 2020; **we model a 500 MW block of it**, which is also why the console shows 120 arrays rather than tens of thousands. Say "a 500 MW block of Bhadla" out loud in the pitch — it is accurate and it pre-empts the obvious question.

Three zones (A, B, C), 120 panel arrays, 3 inverters (INV-A, INV-B, INV-C).

---

## 2. The demo script — source of truth for DEMO MODE ONLY

> **Scope note, 2 Aug 2026.** This table is the contract for `mode === 'demo'`, and
> `beats.test.tsx` still asserts every row of it. It is **not** the scope of the
> product — live mode has no script, and the six module screens have no beats.
> Build for live mode first; the recording is what live mode looks like when you
> drive it along a fixed path.


Ninety seconds. Every beat maps to `t` in seconds on the demo clock. Build only what appears here.

| t | Beat | Console shows | Cinematic shows |
|---|---|---|---|
| 0–6 | **At rest** | Farm health 94/100, output 364 MW, 2 anomalies (0 critical). Event feed idle-ticking. Map blue, two amber. | — |
| 6–10 | **Anomaly fires** | New CRITICAL event enters feed. Panel B-17 flashes red on map. Header anomaly count 2→3, critical 0→1. Farm health drops 94→80. | — |
| 10–18 | **Triage** | Right panel opens on B-17. String B-17-S3: actual 15.02 kW vs expected 36.10 kW, **−58.4%**; array B-17 **−41.7%**. Irradiance 890 W/m². Inverter comparison table: INV-A 0.0%, INV-B −58.4%, INV-C 0.0%. `AGENT REASONING → TRIAGE` card streams in. | — |
| 18–22 | **Decision + dispatch** | Agent concludes telemetry is insufficient to distinguish soiling from physical damage. `DISPATCH DRONE` fires. Drone 01 status STANDBY→ACTIVE. Route line draws on map from pad to B-17. | Cut to cinematic. Status pill: `ANOMALY DETECTED`. |
| 22–34 | **Transit** | (console visible in PiP, still updating) | Drone flying over array. Log: `[10:04] B-17 output is ~42% below expected.` → `[10:04] Drone reaching Zone B.` Pill: `FLYING TO ZONE B`. |
| 34–40 | **Target lock** | Map shows drone marker arriving at B-17. | Reticle snaps to panel. Log: `[10:04] Target lock: B-17.` |
| 40–48 | **RGB inspect** | `SURFACE SCAN` WARNING event enters feed. RGB thumbnail appears in evidence strip. | Bounding box + label `B-17 — surface crack suspected (0.84)`. Pill: `INSPECTING B-17`. |
| 48–56 | **Thermal scan** | Thermal thumbnail appears. Anomaly matrix (5×7) populates cell by cell. Per-cell ΔT list writes in — **R2 C3–C6, ΔT ≈ +2.8 °C, one cluster**. | Camera feed switches to ironbow false-colour. Hotspot glows. Log: `[10:04] Thermal scan: hotspot confirmed.` Pill: `THERMAL SCAN` |
| 56–62 | **Evidence returns** | Inverter audio player appears. Flyover clip appears. | Log: `[10:05] Evidence of physical damage found.` Pill: `ROBINSUN ANALYZING` → rename to `SURYA ANALYZING` |
| 62–74 | **Prognosis** | `AGENT REASONING → PROGNOSIS` card streams. 72h forecast band appears (38.1 °C peak). `RISK HIGH · act before 14:00` badge appears. `72H CLEAR — DELAY IS COSTLY` chip. | Log: `[10:05] Inspection result: needs human intervention.` Pill: `RECOMMENDATION READY` |
| 74–84 | **Recommendation** | `RECOMMENDATION` block writes in. Repair queue updates: 4 tasks, B-17 ranked #1, est. loss 3.07 MWh/72h. Timeline block fills. | Cut back to full console. |
| 84–90 | **Human gate** | Big red `APPROVE — CREATE WORK ORDER →` button. Operator clicks. Status → `WORK ORDER #INC-B17 CREATED`. Panel B-17 goes from CRITICAL red to amber `SCHEDULED`. | — |

**Freeze this table at hour 2.** If it changes after that, the four workstreams desync.

---

## 3. Hard rules

- Data is **never invented in the browser**. `Math.random()` is banned across `src/`.
  Demo mode replays 91 committed frames; live mode *computes* from `src/lib/physics.ts`,
  which is golden-tested against the Python line for line. Both are reproducible: the
  same input gives the same site, every reload.
- **Demo-mode LLM output is pre-run and cached.** Live mode calls Groq per array through
  `/api/triage`, which recomputes the facts server-side and cross-checks every number
  before returning a word. `LIVE_AGENT=true` in `scripts/run_agent.py` regenerates the
  committed cache; unset, it verifies that cache against the physics offline.
- The **vision model is real** and its weights are in the repo. ✅ Trained 1 Aug 2026 —
  `Cracked` AP@50 0.995 on the held-out test split.
- **One clock.** §6 — updated for two modes.
- The **repair queue ranking is deterministic**, never LLM-decided. §10.
- **A deadline is computed, never looked up.** `crackDeadlineHour()` derives it from the
  thermal-dose model for any faulted array, in both languages.
- No auth, no database, no user accounts, no settings page, no dark/light toggle, no
  onboarding. A work order writes to Zustand; `persist` keeps the operator's own session
  across reload and stores nothing derived.
- Desktop only, fixed 1920×1080 target. Do not spend time on responsive layouts — this runs on a projector.

---

## 4. Stack

```
Next.js 15 (App Router, TypeScript, strict)
Tailwind CSS v4
shadcn/ui              — Card, Badge, Button, ScrollArea, Tabs, Separator, Progress
Zustand                — demo clock + derived selectors
@react-three/fiber@^9  — 3D scene. C6: v8 does NOT work on React 19. Pin, don't float.
@react-three/drei@^10  — Instances, useGLTF, PerspectiveCamera, Environment
three@^0.180           — r128 constraints do not apply here; use current stable
framer-motion          — entrance transitions on cards and feed items only
recharts               — sparklines and the 72h forecast band
lucide-react           — icons

Python 3.10            — scripts/ only, never runtime
  numpy, pandas        — telemetry generation
  ultralytics          — YOLOv8n fine-tune
  opencv-python        — thermal hotspot extraction
  matplotlib           — thermal image rendering with ironbow LUT

Deployment: Vercel. Vision inference runs offline at build time; no GPU at runtime.
```

**No Convex, no Supabase, no Prisma.** There is no persistence requirement in §2. A work order "creation" writes to Zustand and nothing else.

---

## 5. Repo structure

> **Planned, not actual.** The tree below is what was drawn at kickoff. Run
> `git ls-files src scripts` for the truth. What it does not show, and you will need:
>
> ```
> src/store/session.ts      live mode: site time, selection, missions, work
>                           orders, overrides, injected faults. Persisted.
> src/store/flightCue.ts    THE SEAM. Both modes emit a FlightCue { t, targetId,
>                           cracked } and the 3D scene reads that, never a clock.
> src/store/triage.ts       runtime agent results, cached per array
> src/lib/live.ts           the site evaluated at any site time
> src/lib/liveEvents.ts     the event feed, derived from what actually happened
> src/lib/queue.ts          the live repair queue, ranked as the site stands
> src/lib/physics.ts        the PV model — mirror of scripts/physics.py
> src/lib/scene.ts          camera + drone splines, parametrised by target
> src/app/api/triage/       the ONE runtime network call in the product
> src/components/console/modules/   the six module screens
> ```

```
surya/
├── CLAUDE.md                          ← this file
├── README.md
├── package.json
│
├── data/                              ← generated, committed
│   ├── farm.json                      ← static geometry
│   ├── telemetry.json                 ← time series, fault injected
│   ├── events.json                    ← scripted event feed
│   ├── agent_cache.json               ← pre-run LLM outputs
│   ├── forecast.json                  ← 72h weather
│   └── evidence/
│       ├── b17_rgb.jpg                ← real photo, real detection run on it
│       ├── b17_rgb_annotated.jpg      ← with YOLO box burned in
│       ├── b17_thermal.png            ← ironbow render
│       ├── b17_cellgrid.json          ← per-cell ΔT, 5×7
│       ├── b17_inverter_audio.wav     ← 6s clip
│       └── b17_flyover.mp4            ← 8s clip
│
├── scripts/                           ← Python, run once, output committed
│   ├── generate_farm.py
│   ├── generate_telemetry.py          ← the physics model, §8
│   ├── generate_events.py
│   ├── run_agent.py                   ← calls LLM, writes agent_cache.json
│   ├── thermal_hotspot.py             ← ✅ DONE. threshold + components → cellgrid
│   ├── validate_data.ts               ← the build gate: Zod + assertInvariants
│   └── check_literals.mjs             ← greps src/components/ for hardcoded numbers
│   (NO train_defect_model.py / detect_on_evidence.py locally — both live in the
│    Colab notebook, plan/COLAB-NOTEBOOK.md. This laptop never installs torch.)
│
├── models/
│   └── defect_yolov8n.pt              ← committed weights
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   ← the console
│   │   └── globals.css                ← design tokens, §12
│   │
│   ├── store/
│   │   ├── demoClock.ts               ← §6 — THE clock
│   │   └── selectors.ts               ← everything derives from here
│   │
│   ├── lib/
│   │   ├── types.ts                   ← §7 schemas
│   │   ├── physics.ts                 ← expected-output model, mirrors the Python
│   │   ├── ranking.ts                 ← §10 deterministic queue ranking
│   │   └── format.ts                  ← number/unit formatters
│   │
│   ├── components/
│   │   ├── console/
│   │   │   ├── HeaderBar.tsx          ← KPIs, weather, 72h outlook
│   │   │   ├── EventFeed.tsx          ← left rail
│   │   │   ├── EventCard.tsx
│   │   │   ├── DroneStatus.tsx
│   │   │   ├── SignalQuality.tsx
│   │   │   ├── FarmMap.tsx            ← centre, SVG
│   │   │   ├── PanelCell.tsx
│   │   │   ├── DroneRoute.tsx
│   │   │   ├── DetailPanel.tsx        ← right rail container
│   │   │   ├── EvidenceStrip.tsx      ← thermal/RGB thumbs
│   │   │   ├── InverterAudio.tsx
│   │   │   ├── FlyoverPlayer.tsx
│   │   │   ├── AnomalyMatrix.tsx      ← SIGNATURE ELEMENT, §12
│   │   │   ├── AnalysisBlock.tsx
│   │   │   ├── InverterTable.tsx
│   │   │   ├── AgentReasoning.tsx     ← the labelled stage cards
│   │   │   ├── ForecastBand.tsx
│   │   │   ├── Timeline.tsx
│   │   │   ├── ApprovalBar.tsx        ← the human gate
│   │   │   └── RepairQueueBar.tsx     ← bottom strip
│   │   │
│   │   ├── cinematic/
│   │   │   ├── CinematicView.tsx      ← full-bleed 3D + overlays
│   │   │   ├── MissionLog.tsx         ← typewriter caption bar
│   │   │   ├── Timecode.tsx           ← REC / T+00:00 / LIVE
│   │   │   ├── StatusPill.tsx
│   │   │   ├── PiPConsole.tsx         ← CMD FEED · OPERATOR · SLAVED
│   │   │   └── TargetReticle.tsx      ← bounding box + confidence label
│   │   │
│   │   └── scene/
│   │       ├── SolarFarmScene.tsx     ← R3F canvas root
│   │       ├── PanelField.tsx         ← instanced meshes
│   │       ├── Drone.tsx
│   │       ├── CameraRig.tsx          ← spline driven by demo clock
│   │       ├── ThermalPass.tsx        ← post-process false colour
│   │       └── Ground.tsx
│   │
│   └── hooks/
│       ├── useDemoClock.ts
│       └── useTypewriter.ts
```

---

## 6. Architecture: the demo clock

**This is the most important section in the file.**

Console, 3D scene, event feed, mission log, PiP, camera, and drone position all derive from one number: `t`, in seconds since demo start. Nothing has its own timer.

```ts
// src/store/demoClock.ts
import { create } from 'zustand';

const DEMO_DURATION = 90; // seconds, matches §2

interface DemoClockState {
  t: number;
  playing: boolean;
  speed: number;          // 0.5 | 1 | 2 — for rehearsal
  view: 'console' | 'cinematic';
  approved: boolean;      // set by the human gate at t≈84

  play: () => void;
  pause: () => void;
  seek: (t: number) => void;
  setSpeed: (s: number) => void;
  approve: () => void;
  reset: () => void;
  _tick: (dt: number) => void;
}

export const useDemoClock = create<DemoClockState>((set, get) => ({
  t: 0,
  playing: false,
  speed: 1,
  view: 'console',
  approved: false,

  play:  () => set({ playing: true }),
  pause: () => set({ playing: false }),
  seek:  (t) => set({ t: Math.max(0, Math.min(DEMO_DURATION, t)) }),
  setSpeed: (speed) => set({ speed }),
  approve: () => set({ approved: true }),
  reset: () => set({ t: 0, playing: false, approved: false, view: 'console' }),

  _tick: (dt) => {
    const { t, playing, speed } = get();
    if (!playing) return;
    const next = Math.min(DEMO_DURATION, t + dt * speed);
    set({ t: next, view: next >= 18 && next < 74 ? 'cinematic' : 'console' });
    if (next >= DEMO_DURATION) set({ playing: false });
  },
}));
```

The **one** driver, mounted once in `layout.tsx`:

```ts
// src/hooks/useDemoClock.ts
export function useDemoClockDriver() {
  const tick = useDemoClock((s) => s._tick);
  useEffect(() => {
    let raf: number;
    let last = performance.now();
    const loop = (now: number) => {
      tick((now - last) / 1000);
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick]);
}
```

Everything else is a **pure selector of `t`**:

```ts
// src/store/selectors.ts
export const useVisibleEvents = () => {
  const t = useDemoClock((s) => s.t);
  return useMemo(() => events.filter((e) => e.t <= t), [t]);
};

export const useFarmHealth = () => {
  const t = useDemoClock((s) => s.t);
  return t < 6 ? 94 : lerp(94, 80, clamp01((t - 6) / 3));
};

export const useDronePosition = () => {
  const t = useDemoClock((s) => s.t);
  return sampleRoute(DRONE_ROUTE, clamp01((t - 18) / 16)); // dispatch→arrival
};

export const useAgentStage = () => {
  const t = useDemoClock((s) => s.t);
  if (t >= 62) return 'prognosis';
  if (t >= 10) return 'triage';
  return null;
};
```

**Rehearsal controls** (keyboard, no visible UI):

| Key | Action |
|---|---|
| `Space` | play / pause |
| `←` `→` | seek ∓5s |
| `1` `2` `3` | speed 0.5× / 1× / 2× |
| `R` | reset |
| `C` | force console view |
| `V` | force cinematic view |

---

## 7. Data schemas

> **Superseded as of Phase 0.** `src/lib/types.ts` is the sole schema owner — Zod schemas with
> TypeScript inferred via `z.infer`, plus `assertInvariants()` (I1–I16) and `rankQueue()`.
> The interfaces below are kept for readability; **do not implement from them**, and never
> hand-write a type that mirrors a schema. Deltas: `PanelReading.stringDeviationPct`,
> `PanelArray.stringsPerArray`, `DemoEvent.logLine`, `CellGrid`'s provenance fields,
> `Forecast.projected72hLossMWh` / `.actBefore`, `Detection.mAP50`.

Every Python generator writes JSON matching these exactly.

```ts
// ─── farm.json ──────────────────────────────────────────────────────────────

export interface Farm {
  id: string;
  name: string;               // "Bhadla Solar Park"
  region: string;             // "Rajasthan, India"
  lat: number;
  lon: number;
  azimuth: number;            // degrees, panel orientation
  tilt: number;               // degrees
  capacityMW: number;
  zones: Zone[];
  inverters: Inverter[];
  dronePads: DronePad[];
}

export interface Zone {
  id: 'A' | 'B' | 'C';
  label: string;
  health: number;             // 0-100
  rows: number;
  cols: number;
  originX: number;            // SVG layout coords
  originY: number;
  panels: PanelArray[];
}

export interface PanelArray {
  id: string;                 // "B-17"
  zone: 'A' | 'B' | 'C';
  row: number;
  col: number;
  inverterId: string;         // "INV-B"
  ratedKW: number;            // 36.1
  moduleCount: number;
  cellRows: number;           // 5  — for the anomaly matrix
  cellCols: number;           // 7
  installDate: string;        // ISO
  lastServiced: string;       // ISO
}

export interface Inverter {
  id: string;                 // "INV-A"
  zone: 'A' | 'B' | 'C';
  ratedKW: number;
  efficiency: number;         // 0.98
}

export interface DronePad {
  id: string;                 // "PAD-01"
  x: number;
  y: number;
}

// ─── telemetry.json ─────────────────────────────────────────────────────────

export interface TelemetryFrame {
  t: number;                  // demo-clock seconds
  timestamp: string;          // "09:47" — display only
  ambientC: number;
  irradiance: number;         // W/m²
  windMs: number;
  cloudPct: number;
  farmOutputMW: number;
  farmHealth: number;
  inverters: Record<string, InverterReading>;
  panels: Record<string, PanelReading>;
}

export interface InverterReading {
  actualKW: number;
  expectedKW: number;
  deviationPct: number;       // negative = shortfall
}

export interface PanelReading {
  actualKW: number;
  expectedKW: number;
  deviationPct: number;
  cellTempC: number;
  status: 'healthy' | 'warning' | 'critical' | 'scheduled';
}

// ─── events.json ────────────────────────────────────────────────────────────

export type Severity = 'info' | 'active' | 'warning' | 'critical';

export interface DemoEvent {
  id: string;
  t: number;                  // when it enters the feed
  timestamp: string;          // "09:48"
  source: string;             // "PANEL B-17" | "DRONE 01" | "SURFACE SCAN" | "SYSTEM"
  severity: Severity;
  title: string;
  body: string;
  expandable: boolean;
  linkedPanelId?: string;
}

// ─── forecast.json ──────────────────────────────────────────────────────────

export interface ForecastPoint {
  hourOffset: number;         // 0..72
  ambientC: number;
  irradiance: number;
  cloudPct: number;
}

export interface Forecast {
  points: ForecastPoint[];
  peakAmbientC: number;       // 38.1
  clearHours: number;         // 72
  summary: string;            // "72H CLEAR — DELAY IS COSTLY"
}

// ─── evidence ───────────────────────────────────────────────────────────────

export interface CellDefect {
  row: number;                // 1-indexed to match UI labels R1..R5
  col: number;
  type: 'dead' | 'crack' | 'hotspot' | 'soiling';
  deltaTC: number;            // +8
}

export interface CellGrid {
  panelId: string;
  rows: number;
  cols: number;
  baselineTempC: number;
  defects: CellDefect[];
  matrix: number[][];         // [rows][cols] of ΔT — drives AnomalyMatrix
}

export interface Detection {
  label: string;              // "surface crack"
  confidence: number;         // 0.84
  bbox: [number, number, number, number]; // normalised xywh
  model: string;              // "yolov8n-solar-defect"
}

// ─── agent_cache.json ───────────────────────────────────────────────────────

export interface AgentCache {
  triage: TriageOutput;
  prognosis: PrognosisOutput;
  recommendation: RecommendationOutput;
  meta: {
    model: string;            // "openai/gpt-oss-120b" — C5, rendered on screen
    provider: string;         // "groq"
    generatedAt: string;
    promptVersion: string;
  };
}

export interface TriageOutput {
  severity: 'low' | 'medium' | 'high' | 'critical';
  suspectComponent: string;   // "INV-B"
  reasoning: string;          // 2-3 sentences, rendered in the TRIAGE card
  requiresPhysicalVerification: boolean;
  verificationRationale: string;
  confidence: number;
}

export interface PrognosisOutput {
  degradationMechanism: string;
  projected72hLossMWh: number;
  riskLevel: 'low' | 'medium' | 'high';
  actBefore: string;          // "14:00"
  reasoning: string;
  confidence: number;
}

export interface RecommendationOutput {
  primaryAction: string;
  steps: string[];
  costOfDelayNote: string;
  workOrderRef: string;       // "INC-B17"
}
```

---

## 8. Telemetry generation — the physics

`scripts/generate_telemetry.py`. **Do not skip this and hardcode numbers.** This is what turns "mock data" into "simulated on a documented PV performance model," which is a completely different sentence in front of a judge.

### Model

Standard single-diode-lite / PVWatts-style approach:

```
T_cell = T_amb + ((NOCT - 20) / 800) * G

P_dc = P_rated * (G / 1000) * (1 + γ * (T_cell - 25)) * f_soil * f_mismatch

P_ac = P_dc * η_inv
```

Constants — state these in the pitch, they are standard and defensible:

| Symbol | Value | Meaning |
|---|---|---|
| `NOCT` | 45 °C | Nominal operating cell temperature |
| `γ` | −0.0037 /°C | Power temperature coefficient, crystalline silicon |
| `η_inv` | 0.98 | Inverter efficiency |
| `f_soil` | 0.97 nominal | Soiling derate |
| `f_mismatch` | 1.0000 healthy / **0.4160** faulted | Cell mismatch derate. Solved to reproduce −58.4%. |
| `P_RATED_STRING` | **49.61 kW** | String nameplate. Solved so expected = 36.10 kW at demo conditions. |

Note `γ` for c-Si is typically in the −0.0035 to −0.0040 /°C band and varies by module. −0.0037 is a reasonable mid-value; if a judge pushes, say it's a representative figure, not a datasheet value for a specific module.

### Fault injection

Panel B-17 gets a physically coherent fault chain, not a random number. **The fault chain below was rewritten to match the measured thermal image (C13) — the measurement leads and the story follows:**

1. **Cracked cell** in module B2-07, row 2 of the array's 5×7 cell grid → that cell's series resistance rises → it becomes current-limiting for its substring.
2. **Bypass diode activates** → the whole substring is bypassed → step loss in string voltage.
3. **Reverse bias across the bypassed substring** → it dissipates power as heat. Substrings are wired **in rows**, so the thermal signature is a **contiguous horizontal band**, not isolated cells: **ΔT ≈ +2.8 °C across (2,3) (2,4) (2,5) (2,6) — one connected cluster.**
4. Net effect at the inverter: `f_mismatch` drops to **0.4160** for the affected string.

> The band, the cluster count and the ΔT are **measured** by `scripts/thermal_hotspot.py` from a real Raptor Maps UAV thermal frame — they are not authored. ΔT is a *cell mean* under a declared 8-bit→°C scaling (`THERMAL_SPAN_C = 25.0`), which is why it reads +2.8 and not the +8 a thermographer would quote for a *peak pixel*. Full rationale: `docs/dataset-provenance.md`. **Do not tune the span to reach a nicer number** — invariant I10 will fail the build if you do.

Result at the demo's irradiance and temperature: **string B-17-S3 produces 15.02 kW against an expected 36.10 kW, a 58.4% shortfall.** The array-level headline figure is **−41.7%** because the array deviation and the string deviation are different quantities — 5 of the array's 7 strings are faulted, so `dev_array = dev_string × 5/7`. Keep them distinct in the UI and be ready to explain the difference. That distinction is a credibility marker, and now it is arithmetically true rather than asserted.

INV-A and INV-C are held at 0.0% deviation so the contrast is unmistakable on screen.

### Generator sketch

```python
import json, numpy as np

NOCT, GAMMA, ETA_INV = 45.0, -0.0037, 0.98

def cell_temp(t_amb, g):
    return t_amb + ((NOCT - 20.0) / 800.0) * g

def p_ac(p_rated, g, t_amb, f_soil=0.97, f_mismatch=1.0):
    t_c = cell_temp(t_amb, g)
    p_dc = p_rated * (g / 1000.0) * (1 + GAMMA * (t_c - 25.0)) * f_soil * f_mismatch
    return p_dc * ETA_INV

# Demo conditions
G, T_AMB = 890.0, 35.0
P_RATED_STRING = 49.61            # C1 — 40.0 yields 29.11 kW, not 36.1
STRINGS_PER_ARRAY, FAULTED_STRINGS = 7, 5

t_cell   = cell_temp(T_AMB, G)                                 # 62.8125 C
expected = p_ac(P_RATED_STRING, G, T_AMB)                      # 36.0996 kW -> "36.10"
faulted  = p_ac(P_RATED_STRING, G, T_AMB, f_mismatch=0.4160)   # 15.0174 kW -> "15.02"
dev_str  = (faulted - expected) / expected * 100.0             # -58.400 %  (= f_mismatch - 1)
dev_arr  = dev_str * FAULTED_STRINGS / STRINGS_PER_ARRAY       # -41.714 %  -> "-41.7"
park_mw  = 500.0 * p_ac(1.0, G, T_AMB)                         # 363.83 MW  -> "364"
```

Every term except `f_mismatch` cancels between the healthy and faulted cases, so `dev_string = f_mismatch − 1` **exactly**. That is why 0.4160 is not "~0.42": it is solved to land on −58.4%.

The 62.81 °C cell temperature is **not** incidental — it is the physical reason the crack propagates, and therefore the reason the 14:00 deadline is defensible. Never soften it to make another number rounder.

Emit one `TelemetryFrame` per demo second, `t` from 0 to 90. Pre-fault frames use nominal derates; the fault ramps in over `t = 6..9` so the health metric animates rather than jumping.

Farm output is `500 MW × derate = 363.83 MW`, rendered **364 MW**. C2: 412 MW is unreachable at 890 W/m² and 35 °C — it would need a 566 MW nameplate or a 4.2 °C ambient, in Rajasthan, at midday. The 73%-of-nameplate ratio is itself a talking point: *"we show 364 because the cells are at 63 °C, and that's the model, not a fudge."*

Also compute and emit:
- `projected72hLossMWh` — integrate the shortfall across the forecast irradiance curve. **Computed: 3.07 MWh/72h** (1.01 MWh/day). Correction C16: this spec and `plan/` both carried **1.44**, which is not derivable from the frozen physics — it was 0.48 MWh/day × 3, and 0.48 was itself a seed value typed into `plan/03` §7's queue table. The array's 105.4 kW shortfall across the forecast irradiance curve integrates to 3.07 MWh. The generator produced it; nobody reverse-engineered it.
- `actBefore` — the hour at which projected cell temperature crosses the crack-propagation threshold given the forecast. Lands at **14:00**.

---

## 9. Agent layer

Three calls, three cards, each labelled with its model in the UI. `scripts/run_agent.py` runs them once and writes `data/agent_cache.json`.

**Provider:** Groq free tier, model **`openai/gpt-oss-120b`** (C5 — `llama-3.3-70b-versatile` was deprecated 2026-06-17 and the ID is *rendered on screen*). Model string goes in `AgentCache.meta.model` and is rendered in the UI header of each card — the exposure is deliberate, it's part of what makes the agent visible rather than magic.

### 9.1 TRIAGE

Fires at `t = 10`. Input: telemetry delta, inverter comparison, panel metadata, current weather.

```
SYSTEM
You are the triage stage of an autonomous solar-farm maintenance agent.
You receive SCADA telemetry and site conditions. You decide what is wrong,
how severe it is, and critically — whether telemetry alone is sufficient
to diagnose, or whether physical verification is required.

Be specific and quantitative. Never speculate beyond the data given.
If two failure modes are consistent with the telemetry, say so explicitly
and state what observation would distinguish them.

Respond with JSON only. No markdown, no preamble.

Schema:
{
  "severity": "low|medium|high|critical",
  "suspectComponent": string,
  "reasoning": string,          // 2-3 sentences, operator-facing
  "requiresPhysicalVerification": boolean,
  "verificationRationale": string,
  "confidence": number
}

USER
Site: a 500 MW block of Bhadla Solar Park, Rajasthan. 27.540N 71.915E.
Conditions: ambient 35.0 C, irradiance 890 W/m2, cloud 0%, wind 1.6 m/s.

Inverter readings (actual / expected kW, deviation):
  INV-A: 36.10 / 36.10    0.0%
  INV-B: 15.02 / 36.10  -58.4%
  INV-C: 36.10 / 36.10    0.0%

Panel array B-17 (zone B, on INV-B), 7 strings:
  string B-17-S3 deviation -58.4%
  array deviation -41.7% (5 of 7 strings faulted)
  cell temperature 65.6 C against a 62.8 C array median
  last serviced 2026-03-14

Expected output is modelled as
  P = P_rated * (G/1000) * (1 + gamma*(T_cell - 25)) * f_soil * f_mismatch * eta_inv
with gamma = -0.0037/C, NOCT 45 C, eta_inv 0.98.
```

> The numeric lines above are **interpolated by `run_agent.py` from `telemetry.json` and `farm.json`**, never typed into the prompt file. They are shown here filled in so the prompt is readable. Cell temperatures use the NOCT-model median of 62.8 °C (C9 resolved at Phase 1 — `thermal_hotspot.py` now imports it from `physics.py` instead of declaring 47 °C).

**The output must land on "requiresPhysicalVerification: true"** with a rationale along the lines of: soiling and physical cell damage produce similar string-level signatures under these conditions, and the elevated cell temperature is consistent with either heavy localised soiling or reverse-bias heating from a cracked cell. Only imaging distinguishes them.

That sentence is the justification for the drone existing. If the model doesn't produce something equivalent, tighten the prompt until it does — this is the load-bearing claim of the whole demo.

### 9.2 PROGNOSIS

Fires at `t = 62`, after evidence returns. Input: triage output + detection + cell grid + 72h forecast.

```
SYSTEM
You are the prognosis stage of an autonomous solar-farm maintenance agent.
Given a confirmed physical defect and a 72-hour weather forecast, project
how the defect will evolve and produce a hard deadline for intervention.

Ground every claim in the mechanism. Do not produce a deadline you cannot
justify from the forecast and the defect state.

Respond with JSON only.

Schema:
{
  "degradationMechanism": string,
  "projected72hLossMWh": number,
  "riskLevel": "low|medium|high",
  "actBefore": string,        // "HH:MM"
  "reasoning": string,        // 3-4 sentences
  "confidence": number
}

USER
Confirmed defect on B-17 from drone inspection:
  RGB detection: surface crack, confidence <REAL MODEL OUTPUT>
  Thermal: 4 anomalous cells, ONE connected cluster — a contiguous band in row 2
    (2,3) hotspot  dT +2.7 C
    (2,4) hotspot  dT +2.8 C
    (2,5) hotspot  dT +2.8 C
    (2,6) hotspot  dT +2.7 C
  dT is a cell-mean under a declared 25 C span on 8-bit normalised thermal imagery,
  not a radiometric peak-pixel reading.
  Inverter acoustic signature: irregular switching harmonics on INV-B

Current shortfall: 58.4% on string B-17-S3; 41.7% across the B-17 array.

72-hour forecast: clear, 0% cloud throughout.
  peak ambient 38.1 C on day 3
  daily thermal cycling amplitude 19 C
  irradiance peaks 940-970 W/m2
```

Expected shape of the output: a bypassed substring sitting in reverse bias — the contiguous row-2 hot band is the diode's own signature — plus forecast heat-soak and daily thermal cycling accelerate crack propagation and risk bypass-diode failure; once the diode fails the string is lost entirely rather than derated. Projected loss 3.07 MWh over 72h (C16). Act before 14:00 — the hour at which the cracked cell's cumulative time above the propagation threshold reaches the declared dose budget.

### 9.3 RECOMMENDATION

Fires at `t = 74`.

```
SYSTEM
You are the recommendation stage. Produce the specific physical actions a
field technician should take, in order. Be concrete: name components, name
the verification step. Respond with JSON only.

Schema:
{
  "primaryAction": string,
  "steps": string[],           // 2-4 items
  "costOfDelayNote": string,
  "workOrderRef": string
}
```

Target output:
- Replace cracked cell B2-07 and inspect adjacent hotspot cells, then verify inverter output.
- Replace panel B2-07 and inspect bypass diodes on the INV-B string before Sat 12:00 UTC to prevent catastrophic failure.

### 9.4 Caching and streaming

```ts
// Cached output is streamed into the UI character-by-character so it reads
// as live generation. The typewriter is a pure function of the demo clock.
export function useStreamedText(fullText: string, startT: number, cps = 45) {
  const t = useDemoClock((s) => s.t);
  const chars = Math.floor(Math.max(0, t - startT) * cps);
  return fullText.slice(0, chars);
}
```

Set `LIVE_AGENT=true` to bypass the cache and hit Groq directly. Off by default. Both paths must produce identical-shaped output.

---

## 10. Deterministic ranking

The repair queue ordering is **never** LLM-decided. LLM ranking is unstable run-to-run and a judge who re-runs the demo and sees a different order will notice.

```ts
// src/lib/ranking.ts

export interface RepairTask {
  id: string;              // "INC-B17"
  panelId: string;
  lossMWhPerDay: number;
  severity: Severity;
  hoursUntilDeadline: number;
  accessCost: number;      // 1.0 normal, higher = harder to reach
}

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 3.0,
  warning:  1.5,
  active:   1.0,
  info:     0.25,
};

export function priorityScore(task: RepairTask): number {
  const urgency = 1 + 24 / Math.max(1, task.hoursUntilDeadline);
  return (task.lossMWhPerDay * SEVERITY_WEIGHT[task.severity] * urgency) / task.accessCost;
}

export function rankQueue(tasks: RepairTask[]): RepairTask[] {
  return [...tasks].sort((a, b) => priorityScore(b) - priorityScore(a));
}
```

Four tasks in the queue. B-17 must rank #1 by a clear margin. Tune the other three so the ordering is stable and obvious, and so that the *reason* B-17 wins is visible (highest loss × critical × tightest deadline).

When a judge asks "how does it prioritise?", you show them this function. That answer is worth more than any LLM output in the demo.

---

## 11. Vision layer

The only genuinely trained component. Non-negotiable.

### 11.1 Defect detection

```
Runs on COLAB ONLY — never locally. See plan/COLAB-NOTEBOOK.md.

train_defect_model  (Colab)
  base:     YOLOv8n (ultralytics)
  task:     object detection
  classes:  ["BakimGereken", "Cracked", "Dirty", "Good", "Saglam"]   <- AS SHIPPED
  epochs:   ~50, imgsz 640, batch 16
  hardware: Colab T4, ~20-30 min
  output:   models/defect_yolov8n.pt   (downloaded and committed)
```

**Class names stay as the dataset ships them.** The four above (`crack`, `soiling`,
`delamination`, `hotspot`) were this spec's invention; the actual Roboflow dataset ships five
labels, two of them Turkish (`BakimGereken` = "maintenance required", `Saglam` = "intact").
Renaming them would describe a model that does not exist. Only `Cracked` reaches the UI.

**Report per-class AP@50, not just the five-class mean.** `Saglam` has 27 boxes and will score
near zero, dragging the mean down; `Dirty` has **zero test instances**, so its test AP is
undefined rather than 0.0. The number that matters here is **AP@50 for `Cracked`**, and it
deserves to be visible on its own. Provenance table: `docs/dataset-provenance.md`.

**Data — SETTLED, do not re-search.** `solarvision-gwljt/solar-panel-fault-detection` v2 on
Roboflow Universe. **CC BY 4.0** (attribution required, so the provenance table must ship in
the README). 921 images / 1,067 boxes, train 797 · valid 82 · test 42. Already downloaded to
`dataset/rgb-solar-panel-fault-v2/`. Thermal source is Raptor Maps `InfraredSolarModules`
(MIT, 20,000 images), already used and **done**. Every field of both was read off the
downloaded `data.yaml`, not off a web page: `docs/dataset-provenance.md`.

The evidence image is drawn from the **held-out `test/` split** — 42 images the model never
sees during training — so the confidence the UI displays is a genuine output on unseen data.

**Report real metrics.** Whatever mAP@50 you get, that's the number that goes on the slide. Do not round up, do not report a number from the dataset's leaderboard as if it were yours. Rehaan — this is the exact failure mode from the voice-detection CV discrepancy. Log the training run and screenshot the final metrics table.

Detection on the evidence image runs in the **same Colab notebook** (never locally — no torch,
no ultralytics on this laptop). It writes the annotated image and the real confidence into
`data/evidence/`, which are then downloaded and committed. **The 0.84 in §2 is a placeholder,
not a result** — invariant I11 fails the build if `detection.confidence` is exactly 0.84. If the
model returns 0.71, the UI says 0.71 and §2's caption changes to match.

### 11.2 Thermal hotspot extraction — ✅ DONE

`scripts/thermal_hotspot.py` is written, run, and its output committed to
`data/evidence/b17_cellgrid.json` + `b17_thermal.png`. **Do not regenerate or overwrite it.**
It uses PIL + numpy rather than the OpenCV sketch below (same algorithm, one fewer dependency).
The measured result — a contiguous 4-cell band in row 2, ΔT ≈ +2.8 °C, one cluster — is what
§8 and §9.2 above were rewritten around.

No model needed — this is classical CV and it's more defensible than an ML approach here.

```python
# scripts/thermal_hotspot.py
import cv2, numpy as np

def extract_cellgrid(thermal_gray, rows=5, cols=7, sigma=2.5):
    """thermal_gray: uint8/float array, calibrated so pixel value maps to degC."""
    h, w = thermal_gray.shape
    ch, cw = h // rows, w // cols

    cell_means = np.array([
        [thermal_gray[r*ch:(r+1)*ch, c*cw:(c+1)*cw].mean() for c in range(cols)]
        for r in range(rows)
    ])

    baseline = np.median(cell_means)
    delta = cell_means - baseline

    thresh = delta.std() * sigma
    mask = (delta > thresh).astype(np.uint8)

    n, labels = cv2.connectedComponents(mask)   # group adjacent hot cells

    return {
        "baselineTempC": float(baseline),
        "matrix": delta.round(1).tolist(),
        "defects": [
            {"row": int(r)+1, "col": int(c)+1,
             "type": "hotspot", "deltaTC": float(round(delta[r, c], 1))}
            for r, c in zip(*np.where(mask))
        ],
        "clusters": int(n - 1),
    }
```

Output feeds `AnomalyMatrix` directly. The per-cell ΔT list in the UI is generated from this, not typed by hand.

### 11.3 Inverter acoustic (optional, cut first if behind)

A 6-second WAV plus a spectrogram thumbnail. If time allows, an FFT band-energy check flagging irregular switching harmonics. If not, it plays as recorded evidence and nobody asks. **This is the first thing to cut.**

---

## 12. Design system

The brief is pinned: a dark grid-operations console. Follow it. The room for a distinctive choice is *inside* that constraint, and it comes from the subject's own instruments.

### Direction

This is a SCADA console, not a SaaS dashboard. It should look like something that has been running in a control room for three years and has had features bolted onto it by people who needed them at 3am. Dense. Monospaced. Every number labelled with its unit. No rounded cards floating in whitespace.

**The one aesthetic risk:** the entire semantic colour ramp is the **ironbow thermal palette** — the actual false-colour LUT thermographers use. Black → deep purple → magenta → red → orange → amber → white. This is not decoration; it means the console's colour language and the thermal camera's colour language are the same language, so when the thermal feed appears at `t=48` it doesn't read as a different application. Severity, temperature, and load all read on one ramp.

### Tokens

```css
/* src/app/globals.css */
:root {
  /* Surfaces — cool, near-black, slightly blue to sit under the ironbow ramp */
  --surface-void:    #070A0F;   /* page background */
  --surface-panel:   #0E1219;   /* cards, rails */
  --surface-raised:  #151A24;   /* hover, nested */
  --surface-inset:   #05070B;   /* map background, code blocks */

  /* Structure */
  --line-hairline:   #1A2130;
  --line-active:     #2A3446;   /* C8 — was a deliberate typo, now corrected */
  --line-focus:      #3D4A63;

  /* Text */
  --text-primary:    #DDE4EE;
  --text-secondary:  #8A95A8;
  --text-muted:      #55606F;
  --text-inverse:    #070A0F;

  /* IRONBOW SEMANTIC RAMP — the signature choice */
  --iron-00:         #1B1035;   /* coldest / nominal-idle */
  --iron-20:         #4A1D6E;   /* healthy */
  --iron-40:         #9B2A63;   /* elevated */
  --iron-60:         #D94A3D;   /* warning */
  --iron-80:         #F08B2A;   /* high */
  --iron-95:         #FFC94D;   /* critical */
  --iron-100:        #FFF3D6;   /* peak / saturated */

  /* Semantic aliases — always reference the ramp, never raw hex in components */
  --sev-info:        var(--iron-20);
  --sev-active:      #3FD4B8;   /* the one off-ramp colour: agent/system activity */
  --sev-warning:     var(--iron-80);
  --sev-critical:    var(--iron-60);
  --sev-peak:        var(--iron-95);

  /* Panel status on the map */
  --panel-healthy:   #24406B;   /* desaturated blue — reads as "off", not "good" */
  --panel-warning:   var(--iron-80);
  --panel-critical:  var(--iron-60);
  --panel-scheduled: #3FD4B8;

  /* Geometry */
  --radius-none:  0px;
  --radius-sm:    2px;
  --radius-md:    3px;      /* nothing rounder than this anywhere */

  /* Rhythm — 4px base */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
  --sp-5: 24px; --sp-6: 32px; --sp-7: 48px;
}
```

> C8 applied. The literal above was deliberately broken (`#2A3span`) so you'd notice you were reading rather than pasting; it now carries the correct value, `#2A3446`.

### Type

Two families, three roles. Both are open-source and both were drawn for technical interfaces, which is the point.

| Role | Face | Usage |
|---|---|---|
| **Data / display** | `IBM Plex Mono` | Every number, every ID, the mission log, the timecode. Weights 400 / 600 / 700. |
| **Label / chrome** | `IBM Plex Sans Condensed` | Section headers, KPI captions, button text. Weight 600, `text-transform: uppercase`, `letter-spacing: 0.12em`. |
| **Prose** | `IBM Plex Sans` | Agent reasoning paragraphs only. Weight 400, `line-height: 1.55`. This is the *only* place non-condensed sans appears. |

Scale:

```css
--type-kpi:      34px / 1.0   / 700  IBM Plex Mono;      /* 364 MW, 80/100 */
--type-kpi-unit: 12px / 1.0   / 600  IBM Plex Sans Cond; /* MW, /100 */
--type-h1:       13px / 1.2   / 600  IBM Plex Sans Cond; /* LIVE EVENTS */
--type-h2:       11px / 1.2   / 600  IBM Plex Sans Cond; /* ANALYSIS */
--type-data:     12px / 1.45  / 400  IBM Plex Mono;      /* table cells */
--type-data-em:  12px / 1.45  / 600  IBM Plex Mono;      /* the number that matters */
--type-prose:    13px / 1.55  / 400  IBM Plex Sans;      /* agent reasoning */
--type-micro:    10px / 1.3   / 500  IBM Plex Mono;      /* timestamps, model IDs */
--type-log:      28px / 1.3   / 700  IBM Plex Mono;      /* cinematic mission log */
```

Rule: **every numeric value on screen is monospace and tabular** (`font-variant-numeric: tabular-nums`). Numbers must not jitter as they animate.

### Signature element — the Anomaly Matrix

The one thing this console is remembered by. A 5×7 grid rendering the panel's actual physical cell layout, each cell filled from the ironbow ramp by its ΔT, with row labels R1–R5 and column labels 1–7.

It works because it is *true*: it is a physical map of a physical object, not an abstract visualisation. Judges look at it and understand instantly that the system localised the fault to a specific cell.

```tsx
// src/components/console/AnomalyMatrix.tsx
const ironbow = (dt: number) => {
  const stops = [
    [0,   'var(--iron-00)'],  [2, 'var(--iron-20)'],
    [4,   'var(--iron-40)'],  [6, 'var(--iron-60)'],
    [8,   'var(--iron-80)'],  [10, 'var(--iron-95)'],
  ] as const;
  // linear interp between stops on ΔT in °C
};
```

Cells fill in **one at a time** between `t = 48` and `t = 56`, driven by the demo clock, in scan order. Do not fade the whole grid in at once — the sequential fill is what sells the idea that a sensor is reading it.

Everything around this element stays quiet. No gradients, no glows, no glassmorphism. One accessory removed.

### Motion

Restrained and mechanical, never bouncy.

- Feed items: 120ms slide-in from left, `ease-out`, no spring.
- Agent reasoning: typewriter at 45 chars/sec, clock-driven.
- Panel status change: 200ms colour crossfade, plus a single 400ms border pulse on `critical` only.
- Drone route: SVG `stroke-dashoffset` animation driven by clock position, not CSS keyframes.
- Cinematic status pill: hard cut, no transition. Instrument readouts don't ease.
- `prefers-reduced-motion`: skip typewriter (show full text), keep everything else.

### Copy rules

Interface voice: terse, operator-facing, active. Name things the way a field technician would.

- ✅ `APPROVE — CREATE WORK ORDER` ❌ `Submit`
- ✅ `Est. energy loss  3.07 MWh/72h` ❌ `Impact: High`
- ✅ `Drone 01 dispatched to B-17. Battery 88%.` ❌ `Drone deployment initiated successfully`
- ✅ `INV-B is producing 15.00 kW against an expected 36.10 kW.` ❌ `Anomaly detected in inverter B`

Every metric carries its unit. Every panel and component carries its ID.

---

## 13. Console layout spec

Fixed 1920×1080. Three columns plus header and footer.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER  logo │ FARM HEALTH 80/100 │ OUTPUT 364 MW │ ANOMALIES 3 CRITICAL 1   │
│              │ 35°C / 0% CLOUD / 1.6 m/s │ 72H OUTLOOK: 37° 37° 38° │  ⌄     │
├──────────┬─────────────────────────────────────────────┬─────────────────────┤
│          │ BHADLA SOLAR PARK · RAJASTHAN · 27.53N …    │ EVIDENCE            │
│  LIVE    │                                     [MAP ⌄] │ ┌─────┐ ┌─────┐     │
│  EVENTS  │                                             │ │THERM│ │ RGB │     │
│          │   ┌───────────────────────────────┐         │ └─────┘ └─────┘     │
│ ┌──────┐ │   │  ▪▪▪▪▪▪▪▪  ZONE A             │         │ ▶ INVERTER AUDIO    │
│ │SYSTEM│ │   │  ▪▪▪▪▪▪▪▪                     │         │ ┌─────────────────┐ │
│ └──────┘ │   └───────────────────────────────┘         │ │  DRONE FLYOVER  │ │
│ ┌──────┐ │   ┌───────────────────────────────┐         │ └─────────────────┘ │
│ │B-17  │ │   │  ▪▪██▪▪▪▪  ZONE B  ◄ critical │         │ ANOMALY MATRIX      │
│ │CRIT  │ │   │  ▪▪▪▪▪▪▪▪                     │         │  ▪▪▪▪▪▪▪  R1        │
│ └──────┘ │   └───────────────────────────────┘         │  ▪▪████▪  R2 ◄ band │
│ ┌──────┐ │   ┌───────────────────────────────┐         │  ▪▪▪▪▪▪▪  R3        │
│ │DRONE │ │   │  ▪▪▪▪▪▪▪▪  ZONE C             │         │  ▪▪▪▪▪▪▪  R4        │
│ │01    │ │   │  ▪▪▪▪▪▪▪▪                     │         │  ▪▪▪▪▪▪▪  R5        │
│ └──────┘ │   └───────────────────────────────┘         │ ANALYSIS            │
│          │                                             │  Deviation  -41.7%  │
│ DRONE    │   ⌂ PAD-01                                  │  Irradiance  890W/m²│
│ STATUS   │                                             │  Loss 3.07 MWh/72h  │
│  01 ████ │   [HEALTHY][WARNING][CRITICAL][--ROUTE]     │  Confidence     95% │
│  02 ████ │                                             │ FINDINGS            │
│          │                                             │ CELL DEFECTS        │
│ SIGNAL   │                                             │ RECOMMENDATION      │
│  UP  92% │                                             │ INVERTER TABLE      │
│  DN  89% │                                             │ AGENT REASONING     │
│          │                                             │  ▸ TRIAGE  · model  │
│          │                                             │  ▸ PROGNOSIS· model │
│          │                                             │ TIMELINE            │
│          │                                             │ ┌─────────────────┐ │
│          │                                             │ │ APPROVE — CREATE│ │
│          │                                             │ │  WORK ORDER   → │ │
│          │                                             │ └─────────────────┘ │
├──────────┴─────────────────────────────────────────────┴─────────────────────┤
│ REPAIR QUEUE · 4 TASKS · NEXT: B-17 (CRITICAL)              VIEW QUEUE →     │
└──────────────────────────────────────────────────────────────────────────────┘
```

Column widths: `304px | 1fr | 448px`. Header `72px`. Footer `40px`.

### Component notes

**HeaderBar** — KPIs each get a 40px recharts sparkline. Farm health animates 94→80 over `t=6..9`; use a spring-free tween so it counts down mechanically.

**EventFeed** — newest at top, left border 2px in the severity colour, uppercase source label, timestamp in `--type-micro`, one-line truncated body with a `›` expand chevron. Items enter with the 120ms slide. Max 5 visible, scroll below.

**FarmMap** — SVG, not canvas. 120 `<rect>` panels. Diagonal hatch pattern (`<pattern>`) on warning/critical panels — this is what makes the screenshot read as an engineering drawing rather than a heatmap. Zone boundary strokes. B-17 gets a red dashed selection rect plus a label tag. Drone route is a `<path>` with animated `stroke-dashoffset`.

**DetailPanel** — vertical scroll, sections separated by hairlines with uppercase condensed headers. Sections appear progressively per the demo script, never all at once.

**AgentReasoning** — each stage is its own card with a coloured left border (teal `--sev-active`), a header reading `TRIAGE · <model-id>` in `--type-micro`, and the reasoning prose typewritten in. A `show more ›` link at the bottom that expands the full text. The visible model ID is deliberate.

**InverterTable** — three rows, monospace, tabular numerals, the −58.4% cell in `--sev-critical`. This is the single most persuasive element in the console because the contrast is self-evident.

**ApprovalBar** — sticky to the bottom of the right rail. Primary button full-width, `--sev-critical` fill, `--text-inverse` label. Secondary row: `✓ QUEUED` / `INSPECT EVIDENCE` / `OVERRIDE`. On approve: button becomes `✓ WORK ORDER #INC-B17 CREATED`, B-17 turns `--panel-scheduled`, queue count 4→3.

---

## 14. 3D scene spec

**Build the fallback first.** Milestone order in §16 puts a video-based cinematic ahead of the R3F scene. Only upgrade if the schedule allows.

### Scene

```
Ground        — 400×400 plane, sandy albedo (#B5A183), roughness 0.95
Panel field   — ~500 instanced boxes, 2×1×0.05, tilt 25°, azimuth 180°
                arranged in 3 zone blocks matching farm.json layout
                material: metalness 0.35, roughness 0.25, colour #2B4A7A
Support posts — instanced cylinders, r 0.05, h 1.2, colour #9AA0A8
Sky           — gradient shader, warm horizon → pale zenith. No HDRI (filesize).
Sun           — directional light, low elevation, warm #FFE8C4, intensity 2.2
Fill          — hemisphere light, sky #8FB0D9 / ground #B5A183, intensity 0.4
Fog           — linear, colour matched to horizon, near 80 far 320
Drone         — low-poly glTF, 4 rotors (spin is presentational, not clock-locked),
                orange payload block, green/red nav lights
```

Performance rules:
- **Instanced meshes only.** `<Instances>` / `<Instance>` from drei. Never 500 separate meshes.
- Hard cap 600 instances.
- No shadows except a single blob shadow under the drone.
- `dpr={[1, 1.5]}` — do not render at 2× on a 4K display.
- Target 60fps on integrated graphics.

### Camera

Driven by the demo clock along a scripted spline. Four segments matching §2:

| t | Segment | Camera |
|---|---|---|
| 18–22 | Launch | Low, behind drone, wide FOV 65° |
| 22–34 | Transit | Tracking side-on, drone in frame right third, panels streaming past |
| 34–40 | Approach | Descend and pitch down toward B-17, FOV narrows to 45° |
| 40–56 | Inspect | Near-nadir, ~12m altitude, slow orbit 15°/s around B-17 |
| 56–74 | Pull out | Rise and pitch up, FOV back to 65° |

```tsx
// CameraRig.tsx — position and lookAt are pure functions of t
useFrame(() => {
  const t = useDemoClock.getState().t;
  const { pos, look, fov } = sampleCameraSpline(t);
  camera.position.lerp(pos, 0.12);   // lerp smooths, does not drive
  camera.lookAt(look);
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
});
```

Note the `lerp` factor is for smoothing only — the *target* is always derived from `t`, so seeking still works.

### The cracked panel

One panel instance is swapped for a unique mesh with a crack decal — a dark branching polyline texture, alpha-mapped. Visible from `t = 34`.

### Thermal pass

Not a separate scene. A post-processing pass that maps luminance through the ironbow LUT, active `t = 48..56`.

```glsl
// fragment — simplified
vec3 sceneCol = texture2D(tDiffuse, vUv).rgb;
float lum = dot(sceneCol, vec3(0.299, 0.587, 0.114));
// bias the cracked panel's region hotter via a mask texture
lum = mix(lum, 1.0, texture2D(tHotspotMask, vUv).r * 0.7);
gl_FragColor = vec4(ironbowLUT(lum), 1.0);
```

Add slight scanline noise and reduce resolution to `dpr 0.75` during the thermal pass — real thermal sensors are lower-resolution than the visible camera, and the fidelity drop reads as authentic.

---

## 15. Cinematic overlay spec

These overlays carry most of the cinematic impact and cost almost nothing. Build them **before** the 3D scene — they work over a video just as well.

**MissionLog** — top-left, 78% width, `--surface-panel` at 92% opacity, 1px `--line-hairline` border. Header row: `SURYA AGENT — mission log` left, `● LIVE` right in `--sev-critical`. Body: `--type-log`, typewriter at 45cps. Colour by event class:
- anomaly / warning → `--iron-80`
- confirmation / success → `--sev-active`
- neutral / status → `--text-primary`

**Timecode** — top-right. `● REC` (pulsing) · `T+00:0X` · `LIVE` in `--sev-active`. Corner bracket marks in `--line-focus`.

**StatusPill** — bottom-right, pill shape, `--surface-panel`, small `--sev-active` dot, `--type-h1` label. Hard cuts between states. Sequence per §2.

**PiPConsole** — bottom-left, 38% width, 4:3, 2px `--sev-active` border with corner brackets. Label above: `⊡ CMD FEED · OPERATOR` left, `SLAVED` right.

> **This is the single smartest element in the entire design.** It renders the actual live console at reduced scale inside the cinematic frame, driven by the same clock, so the audience sees the software reacting in real time to the physical event. It proves the two halves are one system without anyone having to claim it. Implement it as the real `<ConsoleRoot />` inside a `transform: scale(0.31)` wrapper, not a screenshot.

**TargetReticle** — four orange corner brackets in `--iron-80`, screen-space, snapping to the panel's projected bounds. Label tab below-right: `B-17 — surface crack suspected (0.84)` on `--surface-panel`, `--type-data-em`. The confidence value comes from `data/evidence/` — the real model output.

---

## 16. Build order

> **All of M0–M10 shipped, plus five phases this section never anticipated.**
> `report.txt` is the record: what each phase changed, what it found, and what it
> broke. `docs/backlog.md` is what is left. Use those two; the milestone list below
> is history.
>
> Phases beyond M10: **11** live mode · **12** runtime agent triage · **13** evidence
> scoping, module screens, session persistence · **14** the flight cue (a dispatched
> drone flies the 3D scene, to the array it was sent to) · **15** dead controls wired,
> three faults, fault injection, the rail restructured, night handling · **16** the
> detector trained and the Vercel build fixed.


Each milestone has acceptance criteria. **Report against them and stop before starting the next.**

### M0 — Script freeze (2h, everyone)
Fill the §2 table with exact copy for every event and log line. Fix the panel IDs, the timestamps, the numbers. Write it into `data/events.json` by hand as a stub.

*Acceptance:* the table has no TBDs. Four people can now work without talking to each other.

### M1 — Data + physics (4h)
`generate_farm.py`, `generate_telemetry.py`, `generate_events.py`, `forecast.json`.

*Acceptance:* `data/telemetry.json` exists with 91 frames. `INV-B` deviation at the demo frame is within ±0.5 of −58.4%. Projected 72h loss lands within ±0.05 of 3.07 MWh (C16). Every number came out of the physics model.

### M2 — Clock + shell (4h)
`demoClock.ts`, driver hook, keyboard controls, three-column layout with placeholder boxes, design tokens in `globals.css`.

*Acceptance:* pressing Space advances `t`. `←`/`→` seek. A debug readout shows `t` and `view`. Layout is 1920×1080 with no scrollbars.

### M3 — Vision (5h, parallel with M2)
Dataset sourced, YOLOv8n trained, weights committed, detection run on the evidence image, thermal hotspot extraction producing `b17_cellgrid.json`.

*Acceptance:* `models/defect_yolov8n.pt` exists. `README.md` records dataset name, size, split, license, and **real** mAP@50. `b17_rgb_annotated.jpg` shows a box with the model's actual confidence.

### M4 — Console, static (8h)
Every component in `src/components/console/` rendering real data from `/data` at a fixed `t`. No animation yet.

*Acceptance:* set `t = 80` and the console matches the §2 table for that beat, including the anomaly matrix, the inverter table, and the approval bar.

### M5 — Console, clock-driven (5h)
Wire every component to selectors. Feed populates progressively, health drops, agent cards typewrite, matrix fills cell by cell.

*Acceptance:* play from 0 to 90 and every beat in §2 fires at the right second. Seek backwards to 40 and the state is correct — nothing is stuck from having played forward.

### M6 — Agent cache (3h, parallel)
`run_agent.py`, three prompts, cached output committed. Triage output must justify the drone dispatch.

*Acceptance:* `agent_cache.json` validates against the §7 types. Triage returns `requiresPhysicalVerification: true` with a mechanism-grounded rationale. `LIVE_AGENT=true` produces the same shape.

### M7 — Cinematic overlays over video (4h)
MissionLog, Timecode, StatusPill, PiPConsole, TargetReticle — over a CC-licensed solar farm flyover clip as the background layer.

*Acceptance:* full 90s plays through with the console→cinematic→console cuts at t=18 and t=74. The PiP visibly updates in sync. **This is a complete, presentable demo. Everything after this is upside.**

### M8 — 3D scene (10h) — ONLY IF M7 IS DONE
R3F scene, instanced panels, drone, camera spline, thermal pass. Swap in behind the existing overlays.

*Acceptance:* 60fps on the demo machine at 1920×1080. Camera hits its marks per §14. If it isn't hitting acceptance by the end of the allotted block, **revert to M7's video** and stop.

### M9 — Polish (4h)
Motion timing, colour pass, copy pass, the ironbow ramp consistency check, keyboard focus states.

### M10 — Deck + rehearsal
Record a full run. The deck should read as evidence of a built thing, not a proposal — a screenshot of the training metrics, a screenshot of the physics model, the ranking function, and the approval gate.

---

## 17. Problems I anticipate (and solutions)

**The demo desyncs between console and cinematic.**
Cause: something got its own timer. → Grep for `setInterval|setTimeout|useFrame.*state\.clock` in `src/components`. Only `CameraRig` and presentational effects may use `useFrame`, and only to read `demoClock.getState().t`.

**Seeking backwards breaks state.**
Cause: a component accumulated state instead of deriving it. → Every visible thing must be a pure function of `t`. If a component has `useState` holding demo content, it's wrong. The only legitimate mutable state outside the clock is `approved`.

**The 3D scene eats the schedule.**
Most likely failure mode by a wide margin. → M8 is explicitly gated behind M7 shipping. Hard stop and revert if acceptance isn't met.

**A judge asks "what did you actually train?"**
→ Open `train_defect_model.py`, the metrics screenshot, and `README.md`'s dataset provenance. This is why M3 is non-negotiable and why the reported mAP must be real.

**A judge asks "why an agent and not a threshold dashboard?"**
The question that decides the judging. → The prognosis stage. A rule engine tells you a string is down. This tells you *when it becomes unrecoverable* by combining defect state, the 72h forecast, and the degradation mechanism, and that produces a deadline no threshold can produce. Rehearse this answer verbatim.

**A judge asks "is this data real?"**
→ Answer before it's asked, in the pitch: telemetry is simulated on a published PV performance model with stated coefficients; the defect detection is trained on real labelled imagery; the fault is a physically coherent chain, not a random number. Have `generate_telemetry.py` open in a tab.

**A judge has seen the Robinsun demo.**
→ Own it immediately and completely. "The RAISE-winning solar agent is the reference — we rebuilt the loop, and where they had a physical drone we put a real defect model and a physics-grounded simulation." Denying looks far worse than the resemblance does.

**The LLM produces different reasoning on a re-run and the numbers shift.**
→ Cached by default, and the numbers were never LLM-produced in the first place. The LLM writes *prose about* numbers that came from the generator. Enforce this in the prompts — the schemas ask for reasoning strings, and every numeric field is cross-checked against `telemetry.json` at build time. Add that check to `run_agent.py`.

**Anomaly matrix reads as decoration.**
→ Label the axes R1–R5 / 1–7, and put the per-cell defect list *directly beneath it* so the grid and the text are obviously the same data. The list makes the grid legible.

**Two people edit `types.ts` simultaneously.**
→ One person owns `src/lib/types.ts` and `/data`. Everyone else reads. Schema changes go through them.

**Scope creep from "it'd be cool if…"**
→ §2 is frozen at hour 2. Anything not in the table is a post-hackathon TODO in `README.md`. Write it down, don't build it.

---

## 18. Anti-patterns — do not do these

- ❌ Generating telemetry in the browser with `Math.random()`
- ❌ Hardcoding `-58.4` in a component
- ❌ Letting the LLM emit numbers that then appear as data
- ❌ Letting the LLM rank the repair queue
- ❌ Adding a login page, a settings modal, or a theme toggle
- ❌ `localStorage` / `sessionStorage` anywhere
- ❌ 500 individual `<mesh>` elements instead of instances
- ❌ A second `requestAnimationFrame` loop that mutates state
- ❌ Rounded cards with drop shadows floating in whitespace — this is a SCADA console, not a landing page
- ❌ Reporting a metric you did not measure
- ❌ Building M8 before M7 ships
- ❌ Any colour not in the token list

---

## 19. Fixed identifiers

Use these exactly. They appear across four workstreams and must not drift.

| Thing | Value |
|---|---|
| Product name | `SURYA AGENT` |
| Site | `BHADLA SOLAR PARK` · `RAJASTHAN, INDIA` — a 500 MW block |
| Coordinates | `27.540° N, 71.915° E` *(verified — C4)* |
| Faulted array | `B-17` (zone B, row 3, col 1) |
| Faulted string | `B-17-S3` |
| Faulted module | `B2-07` |
| Faulted inverter | `INV-B` |
| Work order ref | `INC-B17` |
| Drones | `DRONE 01` (pad `PAD-01`), `DRONE 02` (pad `PAD-02`) |
| Demo timestamps | anomaly `09:48`, inspection `10:04`, result `10:05` |
| Headline shortfall | array `−41.7%`, string `−58.4%` *(C3, C10 — different objects)* |
| Actual / expected | `15.02 kW` / `36.10 kW` |
| Farm output | `364 MW` *(C2)* |
| Anomalies / critical | `2 → 3` / `0 → 1` *(C11 — 2 decorative warning arrays)* |
| Irradiance | `890 W/m²` |
| Ambient | `35 °C`, peak forecast `38.1 °C` |
| Cell temperature | `62.8 °C` healthy median, `65.6 °C` at the hot band *(C9)* |
| Hot cells | `(2,3) (2,4) (2,5) (2,6)`, ΔT ≈ `+2.8 °C`, 1 cluster *(measured — C13)* |
| Projected loss | `3.07 MWh / 72h` *(C16 — computed; 1.44 was not derivable)* |
| Deadline | `act before 14:00` |
| Agent model ID | `openai/gpt-oss-120b` on Groq *(C5)* |
| Detection confidence | **whatever the model actually returns** |

---

## 20. Solo / two-person fallback

If the team is one or two people, cut in this order:

1. **Cut M8 entirely.** No 3D. Licensed flyover video with overlays.
2. **Cut the inverter acoustic evidence.**
3. **Cut Zone C** and drop to 80 panels.
4. **Keep M3 (vision).** It is the last thing to go, not the first.

The console alone — with the exposed agent reasoning, the deterministic ranking, the anomaly matrix, and the approval gate — is roughly 70% of the impact. The cinematic is the other 30% and it's the expensive 30%.