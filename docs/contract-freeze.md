# Contract freeze — Phase 0

**Frozen 2026-07-28.** Every number the demo shows is settled here. From this point on you
do not renegotiate a number: if one turns out wrong, you change the generator and let
`npm run validate:data` catch the fallout.

Precedence, restated so it never has to be re-derived:

| Topic | Winner |
|---|---|
| Numbers, library versions | `plan/` — then this file, where it corrects `plan/` |
| The 90-second demo script (§2), design direction (§12) | `CLAUDE.md` |
| Thermal cell localisation and ΔT | **the measurement** — `docs/dataset-provenance.md` |
| Schema shapes | `src/lib/types.ts` (sole owner; `plan/schemas.ts` is now historical) |

---

## 1. Corrections C1–C8 from `plan/00-overview.md` — all applied

| # | Correction | Status |
|---|---|---|
| C1 | `P_RATED_STRING = 49.61` (not 40.0); `f_mismatch = 0.4160` (not "~0.42") | ✅ frozen in §3; CLAUDE.md §8 patched |
| C2 | Farm output **364 MW**, not 412 MW | ✅ CLAUDE.md §2/§13 patched |
| C3 | `−58.4%` = string, `−41.7%` = array — different objects | ✅ see **C10** below; CLAUDE.md §19 patched |
| C4 | Bhadla at **27.540° N, 71.915° E**; site is *a 500 MW block* of a 2,245 MW park | ✅ CLAUDE.md §1/§19 patched |
| C5 | Groq model `openai/gpt-oss-120b` (llama-3.3-70b-versatile deprecated 2026-06-17) | ✅ CLAUDE.md §7/§9 patched |
| C6 | `@react-three/fiber@^9` + `@react-three/drei@^10` + `three@^0.180` for React 19 | ✅ recorded; installed at Phase 8, pins in §5 below |
| C7 | AGPL-3.0 because YOLOv8 weights are contagious | ✅ `LICENSE` added (verbatim FSF text), `package.json` declares it |
| C8 | `--line-active: #2A3446` (the deliberate typo) | ✅ CLAUDE.md §12 patched |

## 2. New decisions — C9–C19

C9–C13 were taken at contract freeze; C16–C19 fell out of Phase 1, when the generators
first had to produce these numbers rather than quote them.

### C10 — the array deviation is **−41.7%**, not −41.8% ⚠️ supersedes plan/03 §4

The chain is exact. Every term in `P_ac` except `f_mismatch` is identical between the
healthy and faulted cases, so they cancel:

```
dev_string = f_mismatch − 1            = 0.4160 − 1     = −58.40 %   (exact)
dev_array  = dev_string × faulted/total = −58.40 × 5/7   = −41.714 %
```

`plan/03-data-model.md` §4 quoted `dev_string = −58.45` and therefore `−41.75 → "−41.8"`.
Recomputed: **−41.71 → displays −41.7%.** `STRINGS_PER_ARRAY = 7`, `FAULTED_STRINGS = 5`
is unchanged (resolution (a) is confirmed) — only the rounding of the result moves.

Invariant I4 now asserts `−41.71 ±0.05` instead of `−41.8 ±0.1`. The tighter tolerance is
the point: a 0.1 band was wide enough to hide the discrepancy that produced this note.

The mission-log line still reads `B-17 output is ~42% below expected.` — true at −41.7%,
and a judge who checks finds the underlying number is exact.

### C11 — **2** decorative warning arrays, not ~14

`plan/03` §7 asks for "~14 decorative `warning` panels" to make the map read as a real site.
`CLAUDE.md` §2 puts `ANOMALIES 2 → 3` and `CRITICAL 0 → 1` in the header at t=0 and t=6.
Both cannot be true if the header count is derived from panel status — and it must be
derived, not typed.

**§2 wins** (it is the authority on the demo script). `DECORATIVE_WARNING_ARRAYS = 2`.
They are still *generated* with a mild `f_soil` reduction that crosses the warning
threshold, never painted amber by hand. The map carries one red array and two amber
hatched ones, and the header count is `count(status ∈ {warning, critical})`.

### C12 — `DemoEvent.logLine` added to the schema

The cinematic mission log and the console event feed were about to become two files
containing the same script at different lengths. Instead: one t-ordered `events.json`,
and an optional short-form `logLine` per event for the 28px log. Absent = the event never
appears in the log. 9 of the 14 events carry one.

`ev-14-workorder` (t=84, `WORK ORDER #INC-B17 CREATED`) is the one event that is **not**
purely `f(t)`: the selector must also require `approved`. Showing "work order created"
without the click would undercut the single most important claim in the demo. `approved`
is already the one legal piece of mutable state, so this costs nothing.

### C13 — I10 rebuilt on the measured thermal result

Superseded: `CLAUDE.md` §8's invented `(2,5)(2,6)` + `(4,5)(4,6)` at ΔT +8/+6/+5.

Measured by `scripts/thermal_hotspot.py` on Raptor Maps `7916.jpg` (`Hot-Spot-Multi`, σ=1.0):

```
        C1     C2     C3     C4     C5     C6     C7
  R1   -2.5    0.7    1.5    1.5    1.6    1.7    0.7
  R2   -1.9    1.9   [2.7]  [2.8]  [2.8]  [2.7]   1.5    <- 4 hot cells, ONE cluster
  R3   -2.4    0.2    0.8    1.0    1.1    0.8    0.0
  R4   -4.7   -2.2   -1.7   -1.4   -1.3   -1.5   -2.4
  R5   -6.3   -2.9   -2.4   -2.4   -2.2   -2.4   -3.3
```

**Hot cells: (2,3) (2,4) (2,5) (2,6)** — a contiguous band in row 2, ΔT ≈ +2.8 °C cell-mean.

This is better physics than the spec invented: module substrings are wired in rows, so a
bypassed substring heats as a *band*, which is the bypass-diode signature `CLAUDE.md` §8
describes in prose. The measurement matches the mechanism more faithfully than the made-up
coordinates did.

Propagates to: `generate_telemetry.py` fault injection (Phase 1), the §9.2 prognosis prompt
(Phase 6), the per-cell defect list under the matrix (Phase 4), and invariant I10 (done).

I10 also gained a **magnitude guard** (`DELTA_T_BAND_C = 1.0..5.0`) and a
`thermalSpanC === 25.0` assertion. Raising `THERMAL_SPAN_C` is the one-line edit that would
reproduce the spec's fictional +8 °C, and it must fail loudly — the same job I11 does for
detection confidence.

### C16 — projected 72-hour loss is **3.07 MWh**, not 1.44 ⚠️ resolved at Phase 1

`CLAUDE.md` §2/§19 and `plan/03` §5 (invariant I7) both carried **1.44 MWh/72h**. Nothing
in either pack derives it. It is 0.48 × 3, where 0.48 MWh/day was itself a seed value
typed into `plan/03` §7's repair-queue table.

The integral is fully determined by the frozen physics — there is no free parameter to
solve, unlike `f_mismatch` or `P_RATED_STRING`:

```
array shortfall at demo conditions = 5 faulted strings × (36.0996 − 15.0174)
                                   = 105.41 kW
integrated (trapezoidal) across the 72-hour forecast irradiance curve
                                   = 3,069.7 kWh = 3.07 MWh      (1.01 MWh/day)
```

I7 now asserts **3.07 ±0.05**, and `PROJECTED_72H_LOSS_MWH` in `src/lib/types.ts` carries
the derivation in a comment. Propagated to `CLAUDE.md` §2 (t=74), §8, §9.2, §12, §13, §16
and §19.

This is the one correction that changes a number a judge will see on screen, and it is
also the clearest demonstration that the gate works: the figure moved because the model
said so, not because anyone preferred it.

### C17 — inverter rows are a peer **string** comparison, not inverter aggregates

`CLAUDE.md` §2 needs `INV-B −58.4%` next to `INV-A 0.0%` and `INV-C 0.0%`. A true
inverter aggregate cannot show that: each inverter drives 40 arrays, so one array's
fault dilutes to about −1% and the table shows nothing.

`TelemetryFrame.inverters` therefore records, per inverter, **the reading of the string
at the inspected position on that inverter** — a like-for-like peer comparison, which is
what an operator actually looks at when a string alarms. `CLAUDE.md` §2 already calls it
"Inverter comparison table"; the UI labels the rows `INV-B · B-17-S3` so the object being
compared is never ambiguous. The inverter's own nameplate stays in `farm.json`.

### C9 — RESOLVED at Phase 1: the cell-temperature baseline was 47 °C ✅

`thermal_hotspot.py` declares `BASELINE_TEMP_C = 47.0` ("array median cell temperature at
demo conditions"), and `CLAUDE.md` §9.1's triage prompt says *"cell temperature 61 C against
a 47 C array median."* But the NOCT model at demo conditions gives:

```
T_cell = 35.0 + ((45 − 20)/800) × 890 = 62.81 °C
```

**62.81 °C is the array median, not 47 °C.** 62.8 °C is also the physical reason the crack
propagates and therefore the reason the 14:00 deadline is defensible — it is not a number
that can be softened.

**Done.** `thermal_hotspot.py` now reads `BASELINE_TEMP_C = P.CELL_TEMP_DEMO_C` — imported
from the model, not typed — and `b17_cellgrid.json` carries `62.8`. The measured ΔT matrix,
defect coordinates, cluster count and σ are **byte-identical**: `baselineTempC` is a single
declared field and nothing in the extraction reads it, so the measurement was never touched.

B-17's hot cells now read 62.8 + 2.8 = **65.6 °C** against a 62.8 °C median. `telemetry.json`
emits that as `panels['B-17'].cellTempC`, and the §9.1 triage prompt was updated to match.

### C18 — the 14:00 deadline is a cumulative thermal-dose crossing

`CLAUDE.md` §8 asks for "the hour at which projected cell temperature crosses the
crack-propagation threshold". A single crossing cannot produce 14:00: the cell-temperature
curve peaks near 12:30, so any threshold below the peak is crossed twice — once rising in
the morning and once falling in the afternoon — and the afternoon crossing is when the
module is *cooling*, which is not a deadline.

The model implemented instead is **cumulative thermal dose**, which is a real reliability
construct rather than a single-point trip:

```
T_cracked(h) = ambient(h) + (NOCT−20)/800 × G(h) + ΔT_hot_band
dose         = Σ hours where T_cracked(h) > T_PROP_C
deadline     = the first hour at which dose reaches DOSE_BUDGET_H

T_PROP_C      = 65.0 °C   cracked-cell propagation threshold
DOSE_BUDGET_H = 5.0 h     above threshold before diode-failure risk is material
```

**`DOSE_BUDGET_H` is solved to reproduce the frozen 14:00**, and is declared as such — the
same footing as `F_MISMATCH_FAULTED = 0.4160` (solved to reproduce −58.4%) and
`P_RATED_STRING = 49.61` (solved to reproduce 36.10 kW), both of which `plan/` explicitly
blesses. It is stated in `physics.py`, in this file, and belongs in the README.

Note the asymmetry with C16, and be ready to explain it: the deadline model *has* a free
parameter, so a frozen observable can be honoured by solving for it. The loss integral has
none, so its frozen value had to move. Solving a declared parameter is legitimate;
overriding a determined result is not.

### C19 — forecast ambient spread is 5.7 °C, and that is the honest consequence

Two frozen numbers over-determine the diurnal curve: ambient reads exactly **35.0 °C** at
the demo hour (10:00), and the 72-hour peak is exactly **38.1 °C**. Any curve passing
through 35 at 10:00 on the rising limb and topping out at 38.1 must have a small daily
range — the solver returns a half-amplitude of **2.83 °C**, i.e. a 5.7 °C spread, with day-3
lows near 32.4 °C.

That is narrow for a desert, and it is stated rather than hidden. It also *strengthens*
the prognosis: warm nights mean the module never sheds its heat, which is exactly why
72 clear hours is expensive. `CLAUDE.md` §9.2's "daily thermal cycling amplitude 19 C" was
another invented figure — the number that actually drives crack propagation is **cell**
cycling, which the model puts at roughly **32–35 °C** (≈68 °C at noon down to ambient at
night). Use the derived figure in the prognosis prompt at Phase 6.

## 3. Frozen identifiers — supersedes `CLAUDE.md` §19

| Thing | Value | Source |
|---|---|---|
| Product name | `SURYA AGENT` | — |
| Site | `BHADLA SOLAR PARK` · `RAJASTHAN, INDIA` — a 500 MW block | C4 |
| Coordinates | `27.540° N, 71.915° E` | C4, verified |
| Faulted array | `B-17` (zone B, row 3, col 1) | — |
| Faulted string | `B-17-S3` | C3 |
| Faulted module | `B2-07` | — |
| Faulted inverter | `INV-B` | — |
| Work order ref | `INC-B17` | — |
| Drones | `DRONE 01` (`PAD-01`), `DRONE 02` (`PAD-02`) | — |
| Demo timestamps | anomaly `09:48`, inspection `10:04`, result `10:05` | §2 |
| **String** shortfall | **−58.4 %** | `f_mismatch − 1`, exact |
| **Array** shortfall | **−41.7 %** | `−58.40 × 5/7` — C10 |
| Actual / expected (string) | **15.02 kW / 36.10 kW** | 15.0174 / 36.0996 |
| Farm output | **364 MW** | 363.83 — C2 |
| Farm health | `94` → `80` across t = 6..9 | §2 |
| Anomalies / critical | `2 → 3` / `0 → 1` | C11 |
| Irradiance | `890 W/m²` | §2 |
| Ambient | `35 °C`; forecast peak `38.1 °C` | §2 |
| Cell temperature | **62.8 °C** median, **65.6 °C** at the hot band | NOCT model — C9 |
| Hot cells | **(2,3) (2,4) (2,5) (2,6)**, ΔT ≈ **+2.8 °C**, 1 cluster | measured — C13 |
| Projected loss | **`3.07 MWh / 72 h`** (1.01 MWh/day) | integrated — C16 |
| Deadline | `act before 14:00` | thermal-dose crossing — C18 |
| Repair queue | 4 tasks, `INC-B17` #1 by **26.7×** | deterministic ranking |
| Detection confidence | **whatever the model returns** — I11 blocks 0.84 | Phase 3, Colab |
| Agent model ID | `openai/gpt-oss-120b` on Groq | C5 |
| Demo frame | `DEMO_FRAME_T = 12` | — |

## 4. The physics chain, frozen

```
NOCT = 45 °C   γ = −0.0037 /°C   η_inv = 0.98   f_soil = 0.97
G = 890 W/m²   T_amb = 35 °C
P_RATED_STRING = 49.61 kW   STRINGS_PER_ARRAY = 7   FAULTED_STRINGS = 5
f_mismatch: 1.0000 healthy / 0.4160 faulted
PARK_NAMEPLATE_MW = 500

T_cell   = 35.0 + (45−20)/800 × 890                        = 62.8125 °C
derate   = (890/1000) × (1 − 0.0037×37.8125) × 0.97 × 0.98 = 0.727669
expected = 49.61 × 0.727669                                = 36.0996 kW  → "36.10 kW"
actual   = 36.0996 × 0.4160                                = 15.0174 kW  → "15.02 kW"
dev_str  = 0.4160 − 1                                      = −58.400 %   → "−58.4 %"
dev_arr  = −58.400 × 5/7                                   = −41.714 %   → "−41.7 %"
park     = 500 × 0.727669                                  = 363.83 MW   → "364 MW"
array nameplate = 49.61 × 7                                = 347.27 kW
```

Verify with `python -c` before trusting any of it again. Nothing here is typed into a
component — `generate_telemetry.py` emits all of it at Phase 1.

## 5. Stack, pinned

```
next 15.5.22 · react 19.1.0 · tailwindcss ^4 · typescript ^5 (strict)
zustand ^5 · framer-motion ^12 · recharts ^2 · lucide-react ^0.544 · zod ^4
tsx ^4 (runs scripts/validate_data.ts)

Phase 8 only, not yet installed:
@react-three/fiber@^9 · @react-three/drei@^10 · three@^0.180        (C6 — React 19 pairing)

Python 3.10.11 — scripts/ only, never runtime
```

`create-next-app@latest` now ships **Next 16**. We are on **15.5.22** deliberately, because
`plan/` pins 15 and every version decision in `02-architecture.md` was reasoned against that
pairing. Revisit only if something in Phase 8 forces it.

`npm audit` reports 12 high findings, all transitive dev-toolchain (minimatch DoS via eslint,
postcss source-map disclosure, sharp/libvips). None is reachable: the app makes zero network
calls, loads no untrusted CSS, and does not use `next/image` optimisation at runtime.
`npm audit fix --force` would drag Next to 16 and break the pin. Left as-is, deliberately.

## 6. Files this phase produced

```
LICENSE                    AGPL-3.0, verbatim from gnu.org
package.json               deps, pins, validate:data + check:literals + prebuild
tsconfig.json              strict, @/* → src/*
eslint.config.mjs          scaffold default; the one-clock rules land at Phase 2
next.config.ts  postcss.config.mjs  next-env.d.ts
src/app/{layout,page}.tsx  scaffold boilerplate; replaced at Phase 2
src/lib/types.ts           THE schema owner — Zod + assertInvariants + rankQueue
data/events.json           14 events, frozen copy, parses against the schema
docs/contract-freeze.md    this file
```

## 7. Phase 1 — what the generators produce

```
scripts/physics.py            the model + every constant. Single source; nothing typed twice.
scripts/generate_farm.py      -> data/farm.json          120 arrays, 3 zones, 3 inverters, 2 pads
scripts/generate_telemetry.py -> data/telemetry.json     91 frames
                              -> data/forecast.json      73 points
                              -> data/repair_queue.json  4 unranked tasks
scripts/generate_events.py    -> data/events.json        14 events, numbers interpolated
scripts/thermal_hotspot.py    -> data/evidence/*         DONE, measurement untouched (C9 aside)
scripts/validate_data.ts      the build gate: Zod + assertInvariants, wired into prebuild
scripts/check_literals.mjs    fails if a headline number is hardcoded in src/
```

Regenerate in this order — each reads the one before it:

```
python scripts/generate_farm.py
python scripts/generate_telemetry.py
python scripts/generate_events.py
npm run validate:data
```

Invariant status at end of Phase 1:

| Checked | Skipped, and why |
|---|---|
| I1 I2 I3 I4 I5 I6 I7 I8 I9 I10 I13 I14 I16 | I9 agent cross-check + I12 — need `agent_cache.json` (Phase 6) |
| | I11 — needs `b17_detection.json` (Phase 3, Colab) |
| | I15 — manual; no build-time way to ask Groq whether an ID is live |

## 8. Definition of done — Phase 0

- [x] C1–C8 applied and propagated into `CLAUDE.md`
- [x] `STRINGS_PER_ARRAY = 7`, `FAULTED_STRINGS = 5` decided → −41.7%
- [x] §2's table filled with final copy — no TBDs — and written to `data/events.json`
- [x] `plan/schemas.ts` → `src/lib/types.ts`, I10 rebuilt on the measurement
- [x] `LICENSE` (AGPL-3.0)
- [x] Next.js 15 scaffolded, TypeScript strict, Tailwind v4, App Router
- [x] `npx tsc --noEmit` clean; `events.json` and `b17_cellgrid.json` both parse
- [x] **C9 resolved at Phase 1** — `BASELINE_TEMP_C` 47.0 → 62.8, imported from the model
