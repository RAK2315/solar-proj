# Handoff — SURYA AGENT, UI overhaul from Stitch output

Written 2026-08-18. Project: `D:\Projects\12. project` (branch `main`, clean).
Next session: **port Stitch-generated designs into the console.**

---

## Read these first, in this order

| File | Why |
|---|---|
| `CLAUDE.md` | The status box at the top is current. It tells you what the rest of the file is wrong about. |
| `docs/ui-brief.md` | The region-by-region diagnosis of what is wrong with the UI, what must be preserved, what is free to change. |
| `docs/stitch-prompts.md` | **New this session.** Ten prompts for stitch.withgoogle.com, one per screen, plus the style preamble and the constraints list. |
| `docs/backlog.md` §5c | The redesign as a backlog item. §5b is now closed. |
| `git log -5` | The four commits below carry their own reasoning in the message bodies. Do not re-derive it. |

---

## Where the work stands

Recent commits, newest first — all **unpushed**, `github.com/RAK2315/solar-proj`:

```
81bd4f4  Docs: Stitch prompts for the UI overhaul, one per screen
c4273cc  UI: a type scale with three tiers, and the evidence out of the rail
754bdba  Fix: the signature element was blank in live mode, and so were the frames
232ef21  Docs: bring CLAUDE.md in line with what was actually built
0ab7492  Docs: write the UI complaint down as a brief, not as a passing remark
```

All six gates green as of `81bd4f4`: `npx tsc --noEmit`, `npx eslint src/`,
`npm run validate:data`, `npm run check:literals`, `npx vitest run` (**337 tests**),
`npm run build`.

### What changed in `754bdba` — four bugs, one cause

The anomaly matrix, both ΔT lists **and** the evidence thumbnails all derived from
the demo clock, which live mode never advances. An operator could fly a drone to
B-17 and get an empty 5×7 grid under a heading claiming the cells were measured,
with no thermal frame anywhere.

Fixed by `useInspectionClock()` in `src/store/selectors.ts` — returns `t` in demo
mode, the flight-cue scene-timeline position in live mode, holding at
`BEAT.thermalDone` once the array has genuinely been inspected.

**The lesson worth carrying forward:** 329 tests stayed green over all of it
because every one asserted a *heading* (`'Anomaly matrix'`, `'Cell defects'`), and
a heading renders whether or not anything is under it. Assert measured values.

### What changed in `c4273cc` — the redesign, stage one

- **Type scale rebuilt** in `src/app/globals.css`: `t-hero` 52 / `t-kpi` 44 /
  `t-value` 26 / `t-h1` 15 / `t-data` 14 / `t-micro` 11, plus a new `t-label`.
  The number that matters is now 4.3× the label beside it; it was 1.1×.
- **The rail was split by KIND.** `DetailPanel.tsx` keeps State, the triage
  verdict, Outlook and Decision. The captured frames, the cell grid and the full
  three-stage reasoning moved into a new **`Dossier.tsx`** — a modal over the map
  where `AnomalyMatrix` gets 64px cells instead of 22px.
- `AnomalyMatrix` takes a `cellSize` prop. `AgentReasoning` takes
  `stages={'triage' | 'all'}`. `LiveTriage` takes `compact`.
- `session.dossierOpen` + `setDossier()`, deliberately **not** persisted.
  `useDossierOpen()` derives it from `t` in demo mode.

---

## Constraints that bind the next session

These are not preferences. Breaking any of them breaks the product's argument.

1. **The data layer does not change.** `src/lib/`, `src/store/`, `scripts/` and
   `/data` stay as they are; every selector keeps its signature. This is a
   presentation swap inside `src/components/` plus `globals.css`.
2. **Never invent a number.** Everything on screen comes from `/data` or
   `src/lib/physics.ts`. `npm run check:literals` fails the build on a hardcoded
   headline figure.
3. **One clock.** Two time sources (`demoClock.t`, `session.siteSeconds`), exactly
   one `requestAnimationFrame` driver. `src/store/flightCue.ts` is the seam.
4. **Scope evidence to the array it was measured on.** Captured imagery exists for
   **B-17 and nothing else**. This has been violated in five separate components —
   it is the most repeated bug in the project. Anything new that renders a cell
   grid, detection, finding, recommendation or deadline must be gated on
   `hasCapturedEvidence(panelId)`. **Absent means absent from the DOM** — not
   greyed out, not a skeleton, not a placeholder.
5. **No local ML.** Never install torch or ultralytics on this machine, never run
   inference locally. The detector is trained and committed; all vision work
   happens on Colab per `plan/COLAB-NOTEBOOK.md`.
6. `.env.local` holds API keys. Never read it from `src/`, never commit it, never
   print a key.
7. `data/evidence/b17_cellgrid.json` and `b17_thermal.png` are measured from real
   data. Do not regenerate or overwrite them.
8. Leave the `rollup → @rollup/wasm-node` override in `package.json` alone — it is
   why the build works with Windows Smart App Control on.

### Two demo-script constraints that will trip you up

`beats.test.tsx` and `ConsoleRoot.test.tsx` pin exactly what must be in the DOM at
each second of the scripted 90 seconds. Two consequences for any layout change:

- `'Anomaly matrix'` must first appear at **t=48** and `'R2 · C3'` between 48 and
  56 — the sequential fill is asserted, not just the presence.
- At **t=80** the console must still contain `3.07 MWh`, `ACT BEFORE 14:00` and
  `72H CLEAR`. That is why `ForecastBand` stayed in the rail rather than moving
  into the dossier.

---

## The prompt to open the next chat with

Paste this:

> Continuing SURYA AGENT at `D:\Projects\12. project`. I have Stitch output to port.
>
> Read `CLAUDE.md` (the status box at the top is current and says what the rest is
> wrong about), `docs/ui-brief.md`, and `docs/stitch-prompts.md` before doing
> anything. `docs/backlog.md` §5b is closed; §5c is the live item.
>
> **Constraints, absolute:** no local ML, ever — the detector is trained and
> committed, all vision work is on Colab. Never read `.env.local` from `src/`.
> Never regenerate `data/evidence/b17_cellgrid.json` or `b17_thermal.png`. Leave
> the rollup → @rollup/wasm-node override in package.json alone.
>
> **Scope of this work:** presentation only. `src/lib/`, `src/store/`, `scripts/`
> and `/data` do not change and every selector keeps its signature. It is
> `src/components/` plus `globals.css`.
>
> **The rule that keeps getting broken:** we hold captured imagery for B-17 and
> nothing else. Any surface showing a cell grid, detection, finding,
> recommendation or deadline is gated on `hasCapturedEvidence(panelId)`, and
> absent means absent from the DOM — never a placeholder, never a skeleton, never
> greyed out. That has been violated in five components now. Check it in anything
> you add.
>
> Also: the 337 tests assert text and behaviour, not pixels, so most should
> survive. Update ones that break on reworded labels rather than deleting them.
> `beats.test.tsx` and `ConsoleRoot.test.tsx` pin the demo script second by second
> — read what they require before you move anything between the rail and the
> dossier. Run all six gates before claiming done: `npx tsc --noEmit`,
> `npx eslint src/`, `npm run validate:data`, `npm run check:literals`,
> `npx vitest run`, `npm run build`.
>
> Here is the Stitch output: [paste / attach]
>
> Port it screen by screen. Be opinionated — don't ask me to choose between six
> options. Show me what to look at in `npm run dev` after each screen.

---

## Open items not in scope for the port

- **Prognosis and recommendation have no live path** — only triage does, via
  `/api/triage`. For arrays other than B-17 those sections are correctly absent.
  Largest remaining feature gap. `docs/backlog.md` §4.
- **Rotate the Groq and Roboflow API keys.** Both were pasted into a chat
  transcript. Training is done, so the Roboflow key costs nothing to rotate.
- **`docs/training/metrics.png` is missing** — the Cell 4 screenshot. `results.csv`
  and `training_curves.png` are committed; this is corroboration only.
- **Five commits unpushed.** Nothing blocks pushing.

---

## Verified this session, so don't re-litigate

The trained model is real and nothing on screen is a hardcoded stand-in:

- `models/defect_yolov8n.pt` (6.25 MB) + `data/evidence/b17_detection.json` —
  `Cracked` at confidence **0.9084** on `IMG_0429_…jpg` from the **held-out test
  split**. `Cracked` AP@50 **0.995**. `Dirty` is *undefined*, not 0.0 — zero test
  instances. Invariant **I11 fails the build** if confidence is ever the spec's
  placeholder 0.84.
- The triage prose comes from `/api/triage` calling Groq (`openai/gpt-oss-120b`).
  The route sends the model **panel identity only, never the readings**,
  recomputes every figure server-side from `physics.ts`, and cross-checks before
  returning a word.
- The one honest caveat, already stated on screen: the RGB evidence frame is
  ground-level dataset photography, not aerial site imagery.

---

## Suggested skills for the next session

- **`run`** — launch the app and see the change working. Every recent bug in this
  project was found by looking at live mode on screen, not by a test. Use it after
  each screen is ported.
- **`diagnose`** — if a ported screen misbehaves. Reproduce, explain the cause,
  then fix. The project's standing rule is "diagnose before fixing, don't guess at
  a cause in prose."
- **`code-review`** — before pushing the port, at `high`. Ask it specifically to
  check evidence scoping (`hasCapturedEvidence`) and for any second source of time.
- **`simplify`** — after the port lands and gates are green, to clean up whatever
  the screen-by-screen porting left duplicated.

Do **not** reach for `hackathon-architect` — this is past planning and the spec
outgrew the hackathon framing months ago.
