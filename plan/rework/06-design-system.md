# 06 — Design system

**Status:** direction NOT yet chosen. Everything in §2–§6 is settled either way.

> ### Design gate changed, 4 Oct 2026 — FOUR mockups, as live routes
>
> The two static directions were judged insufficient. Before P1 proper, build **four**
> mockups of the hero screen as **dev-only routes** `/mockups/a` … `/mockups/d`.
>
> **Live, not pictures.** Each route renders the real twin canvas and real selector
> values. A static image cannot answer the question that decides this — whether
> frosted panels stay readable over a *moving* field, and what they cost in frames.
>
> **Hero screen** = twin full-screen · B-17 panel · repair queue panel · hazard
> toolbar. Identical content in all four.
>
> | Route | Direction |
> |---|---|
> | `/mockups/a` | **Broadcast** — §1 below |
> | `/mockups/b` | **Instrument** — §1 below |
> | `/mockups/c` | **Glassmorphism, done properly** — frosted panels with real
>   `backdrop-filter` blur over the moving twin, layered depth, light borders, and
>   contrast verified against the artifact-design ban on decorative glass. Here it is
>   not decorative: the twin beneath is the subject, and a frosted panel is the one
>   treatment that lets the field read *through* the data. |
> | `/mockups/d` | **Builder's choice** — clearly distinct from the other three. |
>
> All four use the settled tokens in §2–§6: five sizes, 14 px floor, sentence case,
> mono for identifiers only, one line of copy per panel.
>
> **Measure fps for each at 1366×768 and report it beside the mockup.** C is the one
> at risk — `backdrop-filter` over a live WebGL canvas is expensive, and R2 already
> flags frame budget as a MEDIUM/HIGH risk. A direction that cannot hold 60 fps at
> 1366×768 is not a candidate, however good it looks.
>
> Screenshot each in Chrome, show all four, then **STOP and wait for the pick**.
> Mind the SwiftShader screenshot trap in `08-build-plan.md` — panels animate in over
> a live canvas, which is exactly the case that photographs blank.
>
> After the pick: record it here, **delete the `/mockups` routes**, then start P0.
>
> Superseded: the earlier two-direction artifact,
> https://claude.ai/artifact/RiP23wmRiLjGSSEzuQbFWa — still useful as the reference
> for A and B.

---

## 1. The directions

Both keep the ironbow ramp, the five-size scale, the 14 px floor, mono-for-IDs-only,
sentence case, and one line of copy per panel.

### A — Broadcast

Opaque slabs with a 3 px severity edge along the top, anchored hard to the screen
edges. Panels read as instrument modules bolted to the frame.

- **Severity lives in structure.** The top edge carries status, so an operator knows
  the state of a panel before reading a single number.
- Distinct header band separating chrome from data.
- **Best at distance** — this is the projector-safe choice.
- **Costs:** more visual weight over the twin; less of the field visible.

### B — Instrument

Recessive chrome, hairline rules, panels inset from the edges and floating clear.

- **The twin is the subject**; the data defers to it.
- Severity carried by chips and value colour rather than structure.
- **Best for the hazard drag** — the field stays legible while it recolours, which is
  the hero moment.
- **Costs:** weaker at distance; status takes a beat longer to locate.

### Recommendation

**B for the hero, A for the room.** The hero moment is the judge watching the *field*
change, and B keeps more field visible while it happens. But the demo may be
projected, where A wins outright.

**Proposed resolution: build B, and make the panel treatment a single token group**
(`--pnl-bg`, `--pnl-border`, `--pnl-edge-width`, `--pnl-radius`) so switching to A is
a token change rather than a rebuild. Decide after the first real screenshot at
1366×768.

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
--ink-3   #5f6b7e   tertiary; labels only, never body

--live    #3fd4b8   agent and system activity. The one off-ramp colour.

IRONBOW (kept - the same LUT the thermal camera uses)
--i20 #4a1d6e  --i40 #9b2a63  --i60 #d94a3d  --i80 #f08b2a  --i95 #ffc94d
--healthy #24406b   desaturated blue: reads as "off", not as "good"
```

- Severity and temperature read on **one ramp**, so the console and the thermal feed
  speak the same language. This is the project's signature and is not up for revision.
- `--live` is reserved for agent activity and current selection. Never decoration.
- **Dark only.** A control room is dark. The existing light theme is retained for the
  2D fallback and nothing else.

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
> and red. Four or five dark panels float over it, inset from the edges, each with a
> title, one headline figure, one line of plain copy, and a short list of label-value
> rows. One figure on the screen is clearly the largest. A dashed circle sits over
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
