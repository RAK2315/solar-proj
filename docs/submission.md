# SURYA AGENT — CodeYourCult submission

**Build Cult · CodeYourCult · 5–6 September 2026 · Open innovation**

Category we file under: **Climate & Energy Infrastructure — AI for renewable asset
reliability.**

---

## Problem statement

India is installing solar faster than almost anyone. **Installed capacity is not
delivered capacity.**

A utility-scale solar park has tens of thousands of panels. The monitoring system
(SCADA) tells the operator that a string is producing less than it should. That is
all it tells them. It cannot say *why* — dirt, a cracked cell, a failed diode, row
shading and a passing cloud all look similar on a graph — so someone drives out
and looks. On a site spread across thousands of acres, in 45 °C heat.

The decision an operations manager is actually stuck on is not "is something
wrong". It is:

> *I have five things wrong, two crews and one hot week. Which do I do today,
> which can wait, and which one gets much worse if I leave it?*

Nobody sells them that. Detection companies sell "we found a crack". Monitoring
companies sell a dashboard. Neither answers a question about **sequence under
limited resources with a deadline**.

## Proposed solution

**SURYA AGENT is a triage system for solar farm maintenance.** It watches every
array, works out which ones are losing the most, proves why with physical
evidence, and tells the operator which to fix first — and by when.

The loop, end to end:

```
telemetry anomaly
  → what is wrong?          the shape of the loss, not its size
  → where is it?            one array of 120, one string of seven
  → why?                    evidence, gathered only when telemetry cannot say
  → how serious?            projected loss against the 72-hour forecast
  → what if we wait?        the cost of every deferral, and the cliff
  → what first?             a deterministic rank, then an actual day plan
  → HUMAN APPROVES          the agent raises no work order on its own
```

Three things distinguish it from a defect detector:

**It refuses to act when acting is pointless.** An array that is down evenly
across every string at fleet temperature is dirty. The agent books the wash crew
and explicitly declines to fly a drone, because imaging a dirty panel confirms
what the telemetry already established. An agent that always dispatches has not
decided anything.

**It computes a deadline rather than looking one up.** A cracked cell heating past
its propagation threshold is a cumulative thermal-dose problem against a weather
forecast. The system says *act before 14:00*, and can show the arithmetic.

**It says what waiting costs.** Fix now, in six hours, tomorrow, or in three days —
with the energy never generated for each, and the point where the mechanism
changes from a derate to an open circuit. That is the only moment in the product
where the software tells the operator something a human could not have worked out,
and it is arithmetic, not a language model.

## Technology stack

| Layer | What | Real or simulated |
|---|---|---|
| Physics | NREL PVWatts cell-temperature and power model, Python ↔ TypeScript, golden-tested against each other line for line | **Real model, simulated site** |
| Defect detection | YOLOv8n fine-tuned on 921 labelled images (Roboflow, CC BY 4.0). `Cracked` AP@50 **0.995**; evidence-frame confidence **0.9084** on a held-out test image the model never saw | **Really trained** |
| Thermal analysis | Classical CV (threshold + connected components) over a real UAV thermal frame from Raptor Maps `InfraredSolarModules` (MIT) | **Real measurement** |
| Agent | Groq, `openai/gpt-oss-120b`, server-side. Sent panel identity only; every figure recomputed server-side and cross-checked before a word is returned | **Real LLM, no LLM-sourced numbers** |
| Ranking & scheduling | Pure deterministic functions | **Calculated** |
| Frontend | Next.js 15, React 19, TypeScript strict, Zustand, react-three-fiber | — |
| Telemetry | Generated from the physics model, committed, reproducible | **Simulated, declared** |
| Drone flight | 3D simulation | **Simulated, declared** |

**What is not real, stated plainly:** the site telemetry is simulated on a
published performance model with stated coefficients; there is no live SCADA feed
and no physical drone. The RGB evidence frame is ground-level dataset photography,
not aerial imagery of Bhadla — the console says so on screen, beneath the
thumbnail.

## Expected impact

Every figure below is produced by the model in the repository. **No sourced
industry statistic is quoted anywhere in this project**, deliberately — an
assumption we declare is credible, a statistic we cannot show is not.

For the modelled 500 MW block, at the demonstrated fault:

- One cracked array is losing **1.01 MWh/day**, and **3.07 MWh over 72 hours** if
  nothing is done.
- Its intervention deadline is **14:00** — computed from cumulative thermal dose
  against the forecast, not looked up.
- Waiting until tomorrow costs a further **1.75 MWh**, most of it after the bypass
  diode is projected to fail and the affected strings go open rather than derated.
- Across the open queue, at an operator-set **₹3.00/kWh** — *an assumption, not a
  sourced tariff* — the exposure is about **₹5,370/day**.

The scalable claim is not the megawatt-hours. It is the **decision latency**:
median time from anomaly to a diagnosed, deadlined, human-approved work order is
measured in days today. This closes it to minutes, unattended up to the approval
gate, and it declines to spend an inspection sortie on a problem it has already
diagnosed.

## Implementation approach

**One principle, enforced mechanically rather than by discipline:**

> Every element on screen is traceable to a physics model, a trained model, or a
> deterministic function — and the operator can see which.

- `npm run validate:data` parses every committed JSON against Zod schemas and
  asserts invariants I1–I16. Wired into `prebuild`, so a drifted number **fails
  the build, not the demo**.
- `npm run check:literals` fails if a headline figure is hardcoded anywhere in
  `src/`.
- Three invariants are tripwires against the authors, not against bugs: **I10**
  rejects a ΔT outside the measured band so the thermal scaling cannot be tuned to
  a nicer number; **I11** rejects a detection confidence of exactly 0.84, the
  placeholder the spec was written with; **I12** requires the agent to justify the
  drone dispatch.
- The agent writes prose *about* numbers it was handed. It never sources one. The
  route recomputes every figure server-side and rejects a response containing a
  number the site did not produce.
- Every claim on the incident screen carries its **basis**: measured · from the
  model · calculated · declared assumption · written by the agent · operator.
- **465 tests**, and a browser harness that loads the real console and presses
  real keys, because every visual bug in this project was found by looking rather
  than by a test.

## Working prototype

Two modes over one console:

- **LIVE** (default) — the site runs on the physics model in real time. Click any
  of 120 arrays, read its actual telemetry, dispatch a drone, watch the mission,
  raise a work order. Faults develop over site time from a committed scenario, so
  a session is reproducible without being scripted.
- **DEMO** (press `M`) — the 90-second scripted incident with the cinematic and
  the drone POV, preserved intact. This is the demo video.

Six screens behind an icon rail: Site · Drones · Missions · Repairs · Analytics ·
Rehearsal.

**Run it:** `npm install && npm run demo` — cleans, builds, and serves on
`localhost:3000`. Never `npm run dev` for a demo; see the note in
`docs/hackathon-checklist.md`.

## The four questions judges ask

**"Is the data real?"** Telemetry is simulated on a published PV performance model
with stated coefficients — `scripts/physics.py`, mirrored in TypeScript and
golden-tested against it. The defect model is genuinely trained on real labelled
imagery and its confidence on screen is its actual output on an image it never
saw. The thermal band is measured from a real UAV frame. Three constants are
*solved* to reproduce an observable, and each says so on screen.

**"What did you actually train?"** YOLOv8n, 50 epochs on a Colab T4, on 921
labelled images. `Cracked` AP@50 0.995 on the held-out test split. `Dirty` has
*zero* test instances so its AP is undefined, not 0.0 — we report per class with
the split, never a rounded-up mean. `docs/dataset-provenance.md`.

**"Why an agent and not a threshold dashboard?"** Three answers. It decides what
evidence to gather rather than assuming it. It refuses to gather evidence that
would tell it nothing. And it produces a deadline by combining defect state,
degradation mechanism and a 72-hour forecast — which no threshold can produce.

**"Would you let this run unsupervised?"** No, and it does not. The approval gate
is real: the system raises no work order on its own, an operator can decline with
a recorded reason, and the decline is not an approval.

## Team

*(fill in before submission)*

---

## Deliverables checklist

- [x] Source code repository
- [x] README
- [x] Working prototype
- [ ] Project presentation — 8 slides, ending on the cost-of-waiting screen
- [ ] Demo video — the 90-second scripted run, `docs/recording.md`
- [ ] Team details
