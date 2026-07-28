# 04 — Design system

Direction is pinned by `CLAUDE.md` §12 and I'm not relitigating it: **a dark grid-operations console, not a SaaS dashboard.** Dense, monospaced, every number labelled with its unit, nothing rounder than 3px, no cards floating in whitespace. It should look like something that has been running in a control room for three years and had features bolted on by people who needed them at 3am.

**The one aesthetic bet:** the entire semantic colour ramp *is* the ironbow thermal LUT — the false-colour palette thermographers actually use. Black → deep purple → magenta → red → orange → amber → white. This is not decoration. It means the console's colour language and the thermal camera's colour language are the same language, so when the thermal feed cuts in at t=48 it does not read as a different application. Severity, temperature, and load all sit on one ramp.

---

## 1. Tokens

```css
/* src/app/globals.css */
:root {
  /* Surfaces — cool, near-black, slightly blue so the ironbow ramp sits on top of it */
  --surface-void:    #070A0F;   /* page background */
  --surface-panel:   #0E1219;   /* cards, rails */
  --surface-raised:  #151A24;   /* hover, nested */
  --surface-inset:   #05070B;   /* map background, code blocks */

  /* Structure */
  --line-hairline:   #1A2130;
  --line-active:     #2A3446;   /* ← CORRECTED. CLAUDE.md §12 ships "#2A3span" on purpose. */
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

  /* Semantic aliases — components reference THESE, never a raw hex, never --iron-* directly */
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
  --radius-none: 0px;  --radius-sm: 2px;  --radius-md: 3px;   /* nothing rounder, anywhere */

  /* Rhythm — 4px base */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
  --sp-5: 24px; --sp-6: 32px; --sp-7: 48px;
}
```

**Why `--sev-active` is the one colour off the ramp.** Teal is the only hue that reads as "a machine is doing something" without competing with the thermal ramp for the temperature meaning. If agent activity were on the ironbow ramp it would imply *heat*, which is a lie — the agent thinking is not a thermal event. One deliberate exception, stated, is a design decision; two would be an accident.

**Why `--panel-healthy` is desaturated blue and not green.** Green means "good", which invites the operator to scan for green. A control room scans for *anomalies*. Healthy panels should recede to nearly-background so the amber hatch and the red critical rect are the only things that attract the eye. This is the same reason the map has no gradients.

### Token rules

1. **No raw hex in `src/components/`.** Enforced by `npm run check:literals`.
2. **Components use `--sev-*` and `--panel-*`, not `--iron-*`.** The ramp is the implementation; the semantics are the interface. If you later reshade the ramp, components don't change.
3. **`--iron-*` is used directly only in two places:** the `ironbow()` interpolator in `AnomalyMatrix.tsx`, and the GLSL LUT in `ThermalPass.tsx`. Those two must produce the same colour for the same normalised value — that identity is the whole bet.

## 2. Type

Two families, three roles. Both open-source, both drawn for technical interfaces — which is the point.

| Role | Face | Usage |
|---|---|---|
| **Data / display** | `IBM Plex Mono` | Every number, every ID, the mission log, the timecode. 400 / 600 / 700. |
| **Label / chrome** | `IBM Plex Sans Condensed` | Section headers, KPI captions, buttons. 600, uppercase, `letter-spacing: 0.12em`. |
| **Prose** | `IBM Plex Sans` | Agent reasoning paragraphs **only**. 400, `line-height: 1.55`. |

```css
--type-kpi:      34px / 1.0  / 700  'IBM Plex Mono';            /* 364 MW, 80/100 */
--type-kpi-unit: 12px / 1.0  / 600  'IBM Plex Sans Condensed';  /* MW, /100 */
--type-h1:       13px / 1.2  / 600  'IBM Plex Sans Condensed';  /* LIVE EVENTS */
--type-h2:       11px / 1.2  / 600  'IBM Plex Sans Condensed';  /* ANALYSIS */
--type-data:     12px / 1.45 / 400  'IBM Plex Mono';            /* table cells */
--type-data-em:  12px / 1.45 / 600  'IBM Plex Mono';            /* the number that matters */
--type-prose:    13px / 1.55 / 400  'IBM Plex Sans';            /* agent reasoning */
--type-micro:    10px / 1.3  / 500  'IBM Plex Mono';            /* timestamps, model IDs */
--type-log:      28px / 1.3  / 700  'IBM Plex Mono';            /* cinematic mission log */
```

**Non-negotiable:** every numeric value on screen is monospace and `font-variant-numeric: tabular-nums`. Farm health tweens 94→80 and output counts during the fault ramp — without tabular figures the digits jitter and the whole thing reads as a toy. Set it globally on `:root` and never unset it.

Load Plex via `next/font/google` with `display: 'swap'` and subset `latin`. Three families is 3 requests; preload only Mono (it's above the fold everywhere).

## 3. Layout & shell

Fixed 1920×1080. `body { overflow: hidden }` — a scrollbar on a projector is a bug.

```
┌──────────────────────────────────────────────────────────────────────────────┐  72px
│ HEADER  logo │ FARM HEALTH 80/100 │ OUTPUT 364 MW │ ANOMALIES 3 CRITICAL 1   │
│              │ 35°C / 0% CLOUD / 1.6 m/s │ 72H OUTLOOK: 37° 37° 38°          │
├──────────┬─────────────────────────────────────────────┬─────────────────────┤
│  LIVE    │ BHADLA SOLAR PARK · RAJASTHAN               │ EVIDENCE            │
│  EVENTS  │ 27.540° N, 71.915° E · 25° / 180°           │  [THERM] [RGB]      │
│          │                                             │ ▶ INVERTER AUDIO    │
│  ┌────┐  │   ┌───────────────────────┐                 │ [ DRONE FLYOVER ]   │
│  │····│  │   │ ▪▪▪▪▪▪▪▪  ZONE A      │                 │ ANOMALY MATRIX      │
│  └────┘  │   └───────────────────────┘                 │  ▪▪▪▪▪▪▪ R1         │
│          │   ┌───────────────────────┐                 │  ▪▪▪▪██▪ R2         │
│  DRONE   │   │ ▪▪██▪▪▪▪  ZONE B  ◄crit│                │  ▪▪▪▪▪▪▪ R3         │
│  STATUS  │   └───────────────────────┘                 │  ▪▪▪▪██▪ R4         │
│          │   ┌───────────────────────┐                 │  ▪▪▪▪▪▪▪ R5         │
│  SIGNAL  │   │ ▪▪▪▪▪▪▪▪  ZONE C      │                 │ ANALYSIS            │
│  QUALITY │   └───────────────────────┘                 │ FINDINGS            │
│          │   ⌂ PAD-01                                  │ RECOMMENDATION      │
│          │   [HEALTHY][WARNING][CRITICAL][--ROUTE]     │ INVERTER TABLE      │
│          │                                             │ AGENT REASONING     │
│          │                                             │ TIMELINE            │
│          │                                             │ ┌─────────────────┐ │
│          │                                             │ │ APPROVE — CREATE│ │
│          │                                             │ │  WORK ORDER   → │ │
│          │                                             │ └─────────────────┘ │
├──────────┴─────────────────────────────────────────────┴─────────────────────┤  40px
│ REPAIR QUEUE · 4 TASKS · NEXT: B-17 (CRITICAL)              VIEW QUEUE →     │
└──────────────────────────────────────────────────────────────────────────────┘
   304px  │                    1fr                       │       448px
```

```css
.console-root {
  display: grid;
  grid-template-columns: 304px 1fr 448px;
  grid-template-rows: 72px 1fr 40px;
  grid-template-areas: "header header header" "left map right" "footer footer footer";
  height: 1080px; width: 1920px;
}
```

The right rail scrolls internally (`overflow-y: auto`), sections separated by 1px `--line-hairline` with uppercase condensed headers. **Sections appear progressively per the demo script, never all at once** — an empty right rail at t=0 that fills up is the visual proof that the agent is working.

The cinematic view is a sibling that occupies the same 1920×1080 box; `view` from the clock decides which renders. Both stay mounted so the PiP's console instance never remounts mid-demo.

## 4. Component states

Most dashboards only build the happy path. Here the *sequencing* is the product, so "not yet" is a first-class state and there are more of them than usual.

| State | When | Treatment |
|---|---|---|
| **Not yet** | `t` is before the section's reveal beat | Section is **absent from the DOM**, not greyed. The rail is genuinely shorter. |
| **Streaming** | Agent text mid-typewriter | Text + a 2px `--sev-active` block caret. No skeleton. |
| **Filling** | Anomaly matrix t=48..56 | Filled cells coloured; unfilled at `--surface-inset` with a 1px hairline. |
| **Partial** | Evidence strip with RGB but not thermal | Present slots render; absent slots are absent. Never a placeholder box. |
| **Live** | Default post-reveal | Normal. |
| **Stale** | *N/A* | No live data exists. Do not build a stale state. |
| **Offline / error** | *N/A at runtime* | All data is committed and imported at build time. A missing file is a **build** failure via `validate:data`, never a runtime state. |
| **Approved** | after the gate | Button → `✓ WORK ORDER #INC-B17 CREATED`, B-17 → `--panel-scheduled`, queue 4→3. |

**Why there is no loading spinner anywhere in this app.** Nothing loads. Every byte is imported at build time. A spinner would be a lie about the architecture, and worse, it would break the illusion that the console is *live* rather than fetching. If something appears to need a spinner, you have accidentally introduced a runtime fetch — that is a bug in the architecture, not a missing state.

## 5. Motion

Restrained and mechanical, never bouncy. Instruments don't ease.

| Element | Motion |
|---|---|
| Feed items | 120ms slide-in from left, `ease-out`, **no spring** |
| Agent reasoning | Typewriter 45 cps, pure function of `t` |
| Panel status change | 200ms colour crossfade + a single 400ms border pulse, `critical` only |
| Drone route | SVG `stroke-dashoffset` from `t` — **not** a CSS keyframe |
| Anomaly matrix | Sequential cell fill in scan order, clock-driven |
| Status pill | **Hard cut, no transition** |
| KPI counters | Linear tween, tabular numerals, no spring |
| Drone rotors (3D) | Free-spinning — presentational, explicitly *not* clock-locked |

The rotor exception is worth stating: it's the one thing allowed to have its own animation, because nothing reads its state. Anything a selector reads must come from `t`.

`prefers-reduced-motion: reduce` → skip the typewriter (show full text immediately at the reveal beat), keep everything else. The sequential matrix fill stays; it's information, not decoration.

## 6. Accessibility

Judged on a projector, not by an auditor — but a few of these also make it *read* better at distance, which is why they're here.

- **Contrast:** `--text-primary` on `--surface-panel` is ~13.5:1. `--text-secondary` on `--surface-panel` ~5.4:1. Both clear AA. `--text-muted` (~2.8:1) is for decorative chrome only — never a number, never a label that matters.
- **Colour is never the only signal.** Critical panels carry a diagonal hatch *and* a dashed border *and* an ID tag, not just red. This is also why the map reads as an engineering drawing rather than a heatmap — the accessibility fix and the aesthetic win are the same move.
- **The ironbow ramp is not colourblind-safe** at the 40–60 range (magenta→red). Mitigated because ΔT is *also* printed numerically in the per-cell defect list directly beneath the matrix. The list is the accessible channel; the grid is the fast one.
- **Keyboard:** the demo runs entirely on the §6 rehearsal keys. The approval button is a real `<button>`, reachable by Tab, with a visible `--line-focus` ring.
- **Motion:** honour `prefers-reduced-motion` as above.
- No i18n. Interface language is English, operator-register.

## 7. Copy rules

Terse, operator-facing, active. Name things the way a field technician would.

| ✅ | ❌ |
|---|---|
| `APPROVE — CREATE WORK ORDER` | `Submit` |
| `Est. energy loss  1.44 MWh/72h` | `Impact: High` |
| `Drone 01 dispatched to B-17. Battery 88%.` | `Drone deployment initiated successfully` |
| `INV-B is producing 15.02 kW against an expected 36.10 kW.` | `Anomaly detected in inverter B` |

Every metric carries its unit. Every panel and component carries its ID. Negative numbers use the real minus sign **U+2212 (−)**, not a hyphen — at 12px monospace the difference is visible and it's the kind of detail that makes an interface look instrumented. Handle it once in `format.ts`.

## 8. Screen inventory

There is one route (`/`) and two views. That's the whole app.

| View | When | Contents | Features |
|---|---|---|---|
| **Console** | t ∈ [0,18) ∪ [74,90] | Header, event feed, drone status, signal, farm map, detail rail, repair queue bar | D1–D13 |
| **Cinematic** | t ∈ [18,74) | Full-bleed background (video → 3D), mission log, timecode, status pill, **PiP console**, target reticle | F1–F5, G1–G4 |
| *PiP console* | inside cinematic | The **real** `<ConsoleRoot />` at `scale(0.31)` | F3 |

The PiP is not a third screen — it is the console screen, rendered smaller, driven by the same clock. That is the entire reason it's persuasive, and it's why `ConsoleRoot` must be a pure function of the store with no route-level state.
