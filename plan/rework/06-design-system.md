# 06 — Design system

**Status:** direction CHOSEN, 5 Oct 2026 — **E · Glass with rail**, dark by default.

> ### Design gate closed, 5 Oct 2026
>
> Five directions were mocked as live routes over the real scene: nine screens each,
> dark and light, 90 captures at 1366×768. The owner picked **E**: Instrument's left
> rail with Glass's visuals. The routes are deleted; they survive in history at
> commit `2138fad` (`src/app/mockups/`, sections C and E of `mockups.css` are the
> working reference for everything in §1). The browsable record is
> https://claude.ai/artifact/SPP15yeyK5psvLEAC2Ydot
>
> **Assumed, not stated by the owner:** dark is the default mode. They asked for both
> modes to be mocked and did not name a default; the plan's own reasoning (a control
> room is dark) decided it. Light stays as an operator toggle. Correct this if wrong.

---

## 1. The direction — E · Glass with rail

One frosted sheet per screen over the live twin, a slim glass rail on the left.

### Shell

- **Rail.** Left 12, top 12, bottom 12, width 92, radius 20. Top to bottom: the
  wordmark, six destinations as icon over label (Site, Incident, Queue, Analytics,
  Drones, Sandbox), the site clock controls (pause, 1×, 60×, 600×), then the site
  figures (site time, output, health, anomalies). The active destination is a well
  fill with a 1 px glass line. There is no bottom dock and no top bar.
- **Site screen.** The twin is the whole viewport. One sheet on the right, 404 wide,
  inset 16, holding the selected array and the repair queue. The hazard palette
  (196 wide) and the live event feed (300 wide) sit just right of the rail at
  left 120, each its own small glass panel.
- **Every other screen.** One sheet from left 120 to right 16, top and bottom 16,
  padding 26×30, with an internal grid of two or three columns (gap 22×32). The twin
  keeps running behind it and reads through the glass.
- **Dossier.** Three columns, 1.15 / 1 / 1: evidence chain, captures above detector,
  anomaly matrix. The matrix is the signature element and is never dropped for space.
- **2D fallback.** The Site layout with the 120-array map in place of the canvas.
- **Landing.** No rail. See F6 in `03-features.md`.

### Material

```
dark    --glass      rgb(26 33 46 / 0.5)
        --glass-fx   blur(22px) saturate(1.6)
        --glass-line rgb(255 255 255 / 0.14)
        --well       rgb(255 255 255 / 0.055)
        shadow       inset 0 1px 0 rgb(255 255 255 / 0.12), 0 20px 48px -16px rgb(0 0 0 / 0.5)

light   --glass      rgb(255 255 255 / 0.68)
        --glass-fx   blur(22px) saturate(1.4) brightness(1.12)
        --glass-line rgb(255 255 255 / 0.7)
        --well       rgb(16 21 31 / 0.05)
        shadow       inset 0 1px 0 rgb(255 255 255 / 0.8), 0 20px 48px -20px rgb(16 21 31 / 0.35)
```

Radii: rail 20, sheet 18, wells and controls 10, chips fully round. Lists and
label-value rows sit in a well; a sheet never nests a second sheet.

### Type roles and density

| Role | Token | Weight |
|---|---|---|
| Body, labels, the one line of copy | `--t1` | 400, line-height 1.45 |
| Block titles | `--t3` | 500 |
| Row figures | `--t2` | 600 |
| The headline figure, one per screen | `--t5` | 600 |

Row padding 6 px, block gap 11 px.

### Rules the mockups taught

- **Put the blur on a pseudo-element when the container has fixed children.** A
  `backdrop-filter` makes its element the containing block for `position: fixed`
  descendants, which trapped the palette and the feed inside the sheet.
- **Contrast is measured, not assumed.** Secondary text must clear 4.5:1 against the
  brightest thing the glass can sit over. Over the daylit ground that needed the
  backdrop darkened by half (measured 5.1:1 at worst); over the dark ground it needs
  nothing. Re-measure whenever the ground or the tint changes.
- **`--ink-3` is not a text colour.** It measures about 3.1:1 on a panel and fails AA
  at 14 px. Labels use `--ink-2`.
- **Glass costs the most while a hazard is dragged.** All five directions held
  60 fps at 1366×768 on integrated graphics, idle and mid-drag, but with vsync off
  glass lost the most throughput during the drag. `09-risks.md` R5b stands: if the
  hero drops frames, swap the blur for an opaque tint during the drag before
  touching anything else.
- **Overflow is found by script.** Every screen was checked for clipped blocks and
  for text under 14 px at 1366×768. `check:layout` should carry the same two
  assertions when it is re-pointed in P1.

### Modes

Dark is the default and runs over the near-black ground of §7. Light is an operator
toggle and runs over the daylit scene. The ironbow ramp does not invert in either.

Light surface tokens, new at this gate:

```
--void #edf0f4  --panel #ffffff  --raised #f3f5f8  --high #e2e7ee
--line #d3d9e3  --line-hi #9aa6b8
--ink #10151f   --ink-2 #4a5567
--live #0a7c69  critical text #b0261b  warning text #8a4700
```

---

## 2. Type scale — settled

Five sizes. Floor 14 px. Ratio ≈ 1.22.

| Token | Size | Weight | Role |
|---|---|---|---|
| `--t1` | **14px** | 400/500 | Labels, secondary values, the one-line panel copy |
| `--t2` | **17px** | 600 | Panel titles; secondary figures |
| `--t3` | **21px** | 600 | Row figures that must carry a table |
| `--t4` | **26px** | 600 | A panel's headline figure |
| `--t5` | **36px** | 700 | The single most important number on screen. **One per screen, never two.** |

**Replaces** 52 / 42 / 32 / 24 / 14 / 13 / 12 / 11 / 10.

**Migration is concentrated, not spread.** Counted 4 Oct 2026 — six classes carry 327
of the 352 usages, so the type rewrite is six find-and-replaces plus a token block,
not a sweep through every component:

| class | usages | becomes |
|---|---|---|
| `t-micro` | 120 | `--t1` — **the big one.** Every usage is currently 10 px and must come up to 14 |
| `t-data` | 65 | `--t1` |
| `t-prose` | 39 | `--t1`, line-height 1.5 |
| `t-h1` | 37 | `--t2`, sentence case, tracking removed |
| `t-h2` | 36 | `--t1` or `--t2` by role; sentence case |
| `t-data-em` | 30 | `--t1` weight 600, or `--t3` where it carries a table |
| `t-label` | 11 | `--t1`, sentence case |
| `t-hero` / `t-kpi` / `t-metric` | 15 | collapse into `--t5` (one per screen) and `--t4` |
| `t-value` | 3 | `--t3` |
| `t-kpi-unit` / `t-log` | 3 | `--t1` |

`t-h1`, `t-h2` and `t-label` (84 usages) are where every tracked-caps label lives.

**Rules**
- **Nothing below 14 px anywhere**, including micro-labels and timestamps.
- **Sentence case throughout.** Zero `text-transform: uppercase`. Zero tracked caps.
  This deletes `.t-h1`, `.t-h2`, `.t-label` as they exist (84 usages).
- **Mono only for identifiers and codes**: `B-17`, `INV-B`, `B-17-S3`, `INC-B17`,
  model names, dataset names. Never for prose, labels, or headings.
- `font-variant-numeric: tabular-nums` on every figure that can change.
- Fixed px/rem scale, not fluid. A console is viewed at a known DPI; clamp-sized type
  in a floating panel looks worse, not better.

**Faces:** IBM Plex Sans for everything, IBM Plex Mono for identifiers. Keeping Plex
preserves the existing identity; the change is in *how* it is used, not which face.
IBM Plex Sans Condensed is **dropped** — it existed to make tracked caps fit.

## 3. Colour — settled

Strategy: **restrained**. Tinted near-black neutrals, one live accent, plus the
ironbow ramp carrying semantic state only.

```
--void    #070a0f   the ground the twin sits on
--panel   #0e1219   floating panels
--raised  #161c26   nested blocks, panel headers
--high    #1e2634   a pressed or selected control
--line    #222b3a   hairlines
--line-hi #36425a   focus, active borders

--ink     #e6ebf4   primary
--ink-2   #97a3b8   secondary - verified ≥4.5:1 on --panel
--ink-3   #5f6b7e   decoration only. Fails AA as text at 14 px; see §1.

--live    #3fd4b8   agent and system activity. The one off-ramp colour.

IRONBOW (kept - the same LUT the thermal camera uses)
--i20 #4a1d6e  --i40 #9b2a63  --i60 #d94a3d  --i80 #f08b2a  --i95 #ffc94d
--healthy #24406b   desaturated blue: reads as "off", not as "good"
```

- Severity and temperature read on **one ramp**, so the console and the thermal feed
  speak the same language. This is the project's signature and is not up for revision.
- `--live` is reserved for agent activity and current selection. Never decoration.
- **Dark by default.** A control room is dark. Light is kept as an operator toggle,
  with the tokens in §1; the owner asked for both modes at the design gate.

## 4. Copy rules — settled

- **One line per panel.** Everything else goes behind the `?` toggle, which reuses the
  existing `showWorkings` mechanism rather than introducing a second one.
- Sentence case. Terse, operator-facing, active voice.
- Every metric carries its unit; every component carries its ID.
- **Vocabulary is enforced, not stylistic:**
  - B-17 → **diagnosed** (real capture)
  - all other arrays → **flagged from modelled signature**
  - "Diagnosed" on a modelled array fails `check:literals`.
- Every rupee figure carries its attribution inline.
- No em dashes in anything the operator reads. Comments keep theirs.

## 5. Layout — settled

- `100dvh`, no fixed shell, no scale wrapper. `useFitToWindow` is deleted.
- The twin is the full viewport. Panels float over it, inset from the edges.
- Structural responsiveness, not fluid type: at 1366×768 panels keep their size and
  the field loses height. **Never** shrink the type to fit.
- Semantic z-index scale: `twin 0 · overlay 10 · panel 20 · dossier 30 · toast 40`.
  No arbitrary values.
- Flex for one dimension, grid for two. `repeat(auto-fit, minmax(…))` for panel
  interiors so they collapse without media queries.

## 6. Motion — settled

Carried from the current system, which was rebuilt this session and is correct.

- 140 ms `ease-out` on control background, border, colour, box-shadow, opacity.
- 150 ms rise-and-fade for panels arriving, `cubic-bezier(0.2, 0, 0, 1)`.
- 60 ms on press. Instruments acknowledge the finger; they do not ease into it.
- Hover is an inset `box-shadow` tint, because panel backgrounds are set inline and a
  class rule loses the cascade.
- **No springs, no overshoot, no orchestrated load sequence.**
- `prefers-reduced-motion` already zeroes every duration globally. No per-rule opt-outs.
- **Not animated:** map panel status crossfade. At 600× site speed it would leave 120
  rects permanently mid-fade.

## 7. Correct-render description

Used to check a build against intent.

> A near-black screen filled edge to edge by a solar field in perspective, tilted
> away from the viewer, arrays mostly desaturated blue with a handful burning amber
> and red. A slim frosted rail runs down the left edge. One frosted sheet sits on the
> right, the field reading faintly through it, with a title, one headline figure, one
> line of plain copy, and label-value rows set in rounded wells. Two small glass panels
> beside the rail hold the hazard tools and the latest events. One figure on the screen is clearly the largest. A dashed circle sits over
> part of the field where a hazard has been dropped, and the arrays under it are
> hotter than those outside it. No text is in capitals. No label is smaller than the
> body text. The only monospaced text on screen is array and inverter identifiers.

## 8. Component states

Every interactive element ships with: default, hover, focus-visible, active,
disabled, and where it applies loading and error. Half a set is not a set.

- Focus: 2 px `--line-hi` outline, 2 px offset. Never removed.
- Disabled: `opacity: 0.3`, `cursor: default`. Never a colour change alone.
- Loading: skeleton blocks at the final dimensions, never a centred spinner.
- Empty: states that say what will appear and how to make it appear.
