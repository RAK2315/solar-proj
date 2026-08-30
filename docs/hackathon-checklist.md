# Hackathon checklist — CodeYourCult, 5–6 Sep 2026

Living document. Ticked as work lands. Companion to `docs/backlog.md` (which
tracks the product) — this one tracks the **event**.

**Positioning:** the hackathon is open innovation, no themes. We file ourselves
under *Climate & Energy Infrastructure — AI for renewable asset reliability*.

**The one-line product definition:**

> SURYA AGENT is a triage system for solar farm maintenance: it watches every
> array, works out which ones are losing the most money, proves why with physical
> evidence, and tells the operator which one to fix first — and by when.

**The judge moment:** the cost-of-waiting control. Measured on screen at 17:30
site time — **Now 0.00 · In 6 h 0.01 · Tomorrow 1.75 · In 3 days 4.02 MWh** — with
the sentence that crossing the deadline changes the mechanism from a derate to an
open circuit. It is the only moment in the demo where the software tells the
operator something a human could not have worked out, and it does it with
arithmetic, not with a language model.

**The credibility moment**, which turned out to matter as much: selecting a soiled
array and watching the agent DECLINE to fly a drone — *"imaging is not required to
confirm soiling; cleaning the array is the appropriate action"* — because an agent
that always dispatches has not decided anything.

---

## Where this stands

All of A–H are complete except items marked for the operator (hardware checks, the
recording, the deck, rehearsals, team details).

**465 tests · 29 files.** Gates: `tsc` · `eslint` · `validate:data` (I1–I16) ·
`check:literals` · `vitest` · `next build` · `check:live` 20/20 awake.

**Nine bugs were found by looking at the running product**, none by a test:
two live surfaces reading the scripted clock, a triage verdict that never expired,
the crack's escalation applied to dirt, a diagnosis that consulted ground truth,
a cross-check that forbade the right answer, a module grid that painted blocks
over each other on all five screens, and two workflow traps that make a demo look
broken when it is not.

---

## Group A — Don't let the demo die

- [x] **A1. Stop the 1.1 MB telemetry file shipping in the client bundle.**
      `data/telemetry_client.json` stores the 119 arrays that never change once
      instead of ninety-one times: **1617 kB → 52 kB**. `pack_telemetry.ts`
      refuses to write unless unpacking reproduces `telemetry.json` byte for
      byte, and a test asserts the same against the committed pair.
- [x] **A2. A liveness indicator.** The mode chip is the check: it reads
      `○ NOT READY — RELOAD` in red until an effect has run, so a page that
      rendered but never woke up says so instead of looking perfect and ignoring
      every click. `useHydrated()`.
- [x] **A3. The agent degrades honestly.** Two real gaps closed: a request that
      STALLED never resolved (the console pulsed "Triaging…" forever — a stall
      that looks like work), and a failure was FINAL until the array was
      deselected. There is now a 20 s deadline reported as a timeout, and a
      TRY AGAIN button. Six tests cover the offline path.
- [ ] A4. Projector + second-machine check *(operator task — needs the hardware)*
- [x] **A5. One key that resets everything.** `Shift+R` clears the session —
      work orders, missions, injected faults, site time — and rewinds both
      clocks. Plain `R` still only rewinds the recording, so a mid-rehearsal
      rewind does not throw away the operator's work.

### Also found and fixed in Group A

- [x] **Demo from a production build, never from `npm run dev`.** Measured with
      `npm run check:live`, which loads the real console in the real browser and
      presses a real key: dev was dead on 1 load in 10 (the scene chunk is 12 MB
      unminified), production was awake on **20 of 20**. `npm run demo` builds
      and serves in one command.

## Group B — Kill the jargon

The rule applied throughout: **nothing is renamed and nothing is softened.** The
precise term keeps its place, its unit and its identifier, and a plain sentence
goes next to it. Both, not either. The sentences that carry a quantity are DERIVED
in `src/lib/plain.ts`, not typed into components — a sentence with a number in it
is a headline figure like any other, and `check:literals` is right to care.

- [x] **B1. A plain sentence beside every headline figure.**
      "Producing about 42% less power than it should right now." ·
      "About 3.1 MWh of electricity never generated over the next 3 days, if
      nothing is done." · "That is one damaged group of panels, down 58%. 5 of the
      array's 7 groups are affected, which is why the array's own figure is
      smaller." That last one exists because two deviation figures about the same
      panel read as the console contradicting itself until you are told they
      measure different objects.
- [x] **B2. The worst phrases.** The ΔT note leads with "each figure is how much
      hotter that cell runs than the rest of the panel" and keeps the radiometric
      caveat after it. The evidence provenance — the project declining to
      overclaim, in the one place overclaiming would be easiest — was at 11 px
      where nobody read it; promoted, and led with "This photo came from the
      training dataset, not from our drone." Provenance that cannot be read is not
      provenance.
- [x] **B3. A purpose line on every module screen.** The old subtitle said what
      the screen was LOOKING AT; it never said why you would open it. Both now.
- [x] **B4. "Agent reasoning" → "Why the system thinks this."** The note now says
      the model *explains the figures above, never sources them*. Giving the
      weakest component the best real estate was overselling it; naming it for
      what it does is both more honest and more persuasive.
- [x] **B5. "Scenario" → "Rehearsal."**
- [x] **B6. A purpose line on the Site screen** — the one screen everybody meets
      first. It disappears after the first click: it is an instruction, it floats
      over the map, and an instruction you have already followed is clutter.

### Two bugs found by looking at the screen, not by the tests

Both were live surfaces still reading the SCRIPTED clock — instances **seven and
eight** of this project's most repeated bug. 380 tests stayed green through both,
because each renders a heading and well-formed rows whichever clock it reads.

- [x] **The peer-string table showed the demo's frame zero in live mode.** Three
      inverters at 36.10 kW and 0.0 %, two hundred pixels under a heading saying
      the array was down 41.7 % — the console contradicting itself in one
      screenful, about its single most persuasive number. `inverterComparison()`
      had been written for exactly this in Phase 11 and never connected to
      anything.
- [x] **The footer ranked the wrong array.** It read the committed demo queue,
      filtered by `t >= BEAT.recommendation`. Live mode never advances `t`, so
      B-17 was filtered out **permanently**: the footer of a console showing a
      critical array with a computed 14:00 deadline announced that the next job
      was a soiled array at −9 %. The one number this product exists to produce.
      It now reads `useLiveQueue()`, which the Repairs screen has used since
      Phase 15 — the two disagreed with each other on the same screen.
- [x] Consequence caught by `night.test.tsx` the same hour: with the table on the
      live model, at night it printed 0.0 % on three zeros. Withheld after dark,
      like the deviation above it.
- [x] The footer's two counts read as a contradiction — "0 tasks · NEXT INC-B17
      CRITICAL". They count different things, and the gap between them is the
      product's whole point, so they now say which: **"0 approved — nothing
      dispatched yet · AGENT RECOMMENDS INC-B17."**
- [x] Four regression tests, asserted against the components that were wrong
      rather than against the whole rail — searching the full rail's text for
      "−58.4 %" passes with the bug still in place. Verified by reverting both
      fixes: three of the four fail.

## Group C — Make the incident one thing

- [x] **C1. `src/lib/incident.ts`.** Derived, never stored — a pure function of the
      site at a moment plus what the operator has done, so scrubbing time
      backwards rewinds the incident and there is nowhere for a stale one to hide.
- [x] **C2. The timeline is the chain**, filtered to steps that actually happened
      and sorted by when. One structure, two views, so they cannot disagree about
      what occurred.
- [x] **C3. The evidence chain**, rendered in the dossier above the material:
      observed → checked → wrong → what happens → what to do → who decided.
- [x] **C4. Six bases, not three.** measured · from the model · calculated ·
      declared assumption · written by the agent · operator. Deliberately NOT
      colour-ranked by trustworthiness — that would be the component making an
      argument of its own.
- [x] **C5. Convergence.** The chain names four independent sources agreeing:
      telemetry shortfall, the detector on a held-out frame, the UAV thermal band,
      and the physics that explains why a bypassed cell runs hot.
- [x] **The dossier became the incident file.** It was gated on captured imagery,
      which would have hidden the product's central argument behind the one array
      that has a photograph. The gate MOVED to the imagery column — the only part
      that was ever scoped — rather than lifting.

### A serious bug this surfaced

- [x] **The agent's verdict never expired.** Triage was cached per array and never
      re-asked. Select B-17 at 10:00, its crack begins at 10:04, and the console
      then carried *"all metrics are within tolerance… physical inspection is
      unnecessary — confidence 1.00"* under a CRITICAL badge and a −41.7 %
      deviation, permanently. The cache is now keyed on the array's CONDITION as
      well as its id: a change in what there is to judge invalidates the judgement.
      After the fix the live agent produces exactly the claim CLAUDE.md §9.1
      demands — *"telemetry alone cannot distinguish them… physical verification
      REQUIRED"*, confidence 0.93.

## Group D — Cost of waiting  ← the judge moment  ✅

- [x] **D1. Four choices: now / in 6 hours / tomorrow / in 3 days.** Not "next
      week" — the forecast is 72 hours, and there is no honest answer past the
      last hour we can forecast.
- [x] **D2. Loss per option**, from `src/lib/defer.ts`. A FRACTION of the
      committed integral, never a second integral: recomputing gives 3.058 where
      the committed figure is 3.07, and two answers for B-17's loss on one screen
      would cost more than the third decimal is worth. The full window reproduces
      the committed 3.07 exactly, and a test asserts it.
- [x] **D3. The step at the deadline is the argument.** The curve is not a line.
      Up to the deadline the array is derated; past it the declared mechanism is
      that the bypass diode fails, which OPENS the strings rather than derating
      them — modelled exactly as `string-outage` is modelled everywhere else,
      `terminalMismatch: 0` through the same `evaluateArray`. Drawn as a second
      bar segment and stated in words.
- [x] **D4. Live selection, numbers move.** Measured on screen at 17:30 site time:
      **Now 0.00 · In 6 h 0.01 · Tomorrow 1.75 · In 3 days 4.02 MWh.** The 6-hour
      figure is near zero because those six hours are night — which is the model
      being right, not a bug.
- [x] An array with no computed deadline never gets a cliff. A soiled array gets
      worse linearly and nothing catastrophic is claimed for it.

## Group E — Make "triage" honest  ✅

`src/lib/causes.ts`. Triage means sorting DIFFERENT problems; until this existed
the site had one mechanism at three depths, every incident ended in "fly the
drone, replace the module", and a system that always reaches the same conclusion
is a detector with extra steps.

- [x] **E1. Soiling is diagnosed, not looked up.** The first version read the
      array's `f_soil` out of the committed scenario — which is CIRCULAR: that
      value is the answer, not the evidence, and no operator on a real site can
      see it. It now discriminates on the SHAPE of the loss, from readings an
      instrument actually produces: dirt derates the whole array evenly and
      lowers heat input, a crack bypasses one string and that string runs hot.
      A test greps the module to assert it never reaches for `soilFor`.
- [x] **E2. Shading is a geometry question, and that is why the 3D earns its
      place.** Whether a row can shade the one behind it is decided by tilt, row
      pitch and solar elevation — none of which a flat map has. At this site
      (25°, 8 m pitch, 1.6 m collector) the limit is **5.9°**, so shading is a
      dawn-and-dusk phenomenon and is RULED OUT at midday by geometry. That
      elimination is a real deduction from real site data, and it narrows the
      diagnosis without adding a loss term to the frozen physics.
- [x] **E3. A different action per cause.** Dirt → book the wash crew. Shading →
      nothing to repair, it is a design cost. Crack → fly the drone to find which
      module, then replace before the deadline. A test asserts the crack and the
      soiled array never reach the same action.
- [x] **E4. The eliminations are on screen**, each with what eliminated it. A
      console that only states its conclusion is asking to be trusted; one that
      shows what it discarded is showing its work.
- [x] **E5. The drone gets declined.** Measured on screen for A-08, from the live
      model: *"All seven strings show a similar ~11.34 % power shortfall while
      cell temperature matches the fleet median… imaging is not required to
      confirm soiling; cleaning the array is the appropriate action."* —
      confidence 0.92, **physical verification NOT REQUIRED**.

### Three things that had to change for that to be possible

- [x] **The cross-check forbade the right answer.** `agentCheck` demanded
      `requiresPhysicalVerification: true` for ANY materially deviating array —
      the rule you write when the site has one fault type. It made "book the wash
      crew instead of flying" an answer the model was not allowed to give. It now
      enforces the same signature rule the deterministic diagnosis uses,
      importing the thresholds rather than restating them.
- [x] **The prompt instructed the model to claim ambiguity it could resolve.**
      It said soiling and cell damage always look alike and only imaging can tell
      them apart. Rewritten around the two signatures, with an explicit line: do
      not claim ambiguity you have the evidence to resolve — it wastes a sortie.
- [x] **The crack's escalation was being applied to dirt.** The forecast step told
      a soiled array that "the cell crosses its heat threshold in 25.9 hours", and
      the cost-of-waiting would have warned that its bypass diode was about to
      fail. A soiled array has no cell to crack and no diode to fail. The cliff is
      now gated on the cause; dirt gets a linear cost and no catastrophe.

## Group F — Scarcity and money  ✅

`src/lib/schedule.ts` and `src/lib/money.ts`.

- [x] **F1. 2 crews, 2 aircraft, travel time.** The fleet is the one the console
      already has rather than an invented shortage, and travel scales by
      `accessCost` — a field the committed queue has carried since the beginning
      that until now only ever divided a priority score. Here it moves a clock.
- [x] **F2. The queue is a day.** A greedy pass down the existing ranking, each
      job taking whichever resource frees up first. **Deliberately not an
      optimiser**: a solver gives a better schedule and an unarguable one, and the
      whole value of `priorityScore` is that a person can read it and disagree.
      This is explainable in one sentence.
- [x] **F3. What the plan costs.** Measured on screen: *"With 2 crews and 2
      aircraft, 2 of 4 jobs finish after their deadline — B-17, A-31. They are not
      late because they are unimportant; they are late because higher-ranked work
      has both crews."* The "what would another crew buy" answer re-runs the
      identical model rather than estimating.
- [x] **F4. A tariff the operator owns.** Money cannot appear as a FACT — we have
      no sourced tariff and CLAUDE.md §1 forbids inventing one. It appears as an
      assumption: shown next to every figure derived from it, changeable with a
      slider, persisted, and captioned *"an assumption you set, not a sourced
      tariff."* Rupees are grouped the Indian way (₹12,34,567), because the site
      is in Rajasthan.
- [x] **F5. The site line, in plain words:** *"The open work is costing about
      ₹5,370 a day in electricity never generated, at ₹3.00/kWh."*
- [x] The declared inputs — crews, aircraft, travel, time on site — are printed
      beside the plan so a plant manager can say "ours take four hours" and know
      exactly which number to argue with.
- [x] **The triage work pays off here.** A soiled array skips the aircraft
      entirely and its crew leaves immediately, so dirt clears the list in a
      fraction of the time a crack does. That is the scheduling consequence of
      knowing what is actually wrong.

### A layout bug found on the way, affecting all five module screens

- [x] **Module bodies were a grid whose rows stopped agreeing with their
      children.** A slab holding 400 px of content sat in a 135 px row, overflowed
      it visibly, and painted straight over the block beneath — two blocks with
      very different content came out identical heights, which was the tell. It
      was there before this session on Analytics, Drones, Missions and Rehearsal
      too; a note in `globals.css` records the same failure being fixed once
      already, one layer further in. The body is a flex column now: no row-sizing
      step to get wrong. Verified on all five screens by measuring content height
      against rendered height in a real browser.

- [x] **`npm run demo` kills the port, wipes `.next`, builds, then serves — in
      that order.** Rebuilding underneath a running `next start` cost real time
      twice this session: the old server keeps serving HTML referencing chunk
      hashes the rebuild deleted, `next start` fails with EADDRINUSE and leaves
      the stale server alive, and the page goes blank or renders perfectly and
      ignores every click. It looks exactly like a code fault and is not one.

## Group G — Keep the six screens, guard them

- [x] **G1. A purpose line on all six screens** — what each is FOR, not just what
      it is showing.
- [x] **G2. The demo path is Site → Incident file → Repairs.** The other three
      screens are answers to judge questions, not stops on the tour.
- [x] **G3. Every screen has real content in the demo's state**, verified in a
      real browser across all five.
- [ ] G4. A safe way to skip a screen that misbehaves *(the rail already lets you
      not open one; nothing further is needed unless the day says otherwise)*

## Group H — Submission

Written up in **[`docs/submission.md`](submission.md)**.

- [x] H1. Problem statement, plain language — the decision an operations manager
      is actually stuck on, which is sequence under limited resources
- [x] H2. Proposed solution, with the three things that make it more than a
      defect detector
- [x] H3. Tech stack, in a table with a **real-or-simulated column**, plus an
      explicit paragraph on what is NOT real
- [x] H4. Expected impact — every figure produced by the model in the repo, no
      sourced industry statistic anywhere, the tariff declared as an assumption
- [x] H5. Implementation approach — the one principle and the gates that enforce
      it, including the three invariants that are tripwires against the authors
- [x] H6. README rewritten: a plain paragraph for anyone, then the technical
      detail below it
- [x] H10. Answers to the four questions judges always ask, written out
- [ ] H7. Demo video — the 90-second run exists; record it (`docs/recording.md`)
- [ ] H8. Deck, 8 slides, ending on the cost-of-waiting screen
- [ ] H9. Five timed rehearsals
- [ ] Team details *(operator)*

---

## Not doing — protects against feature creep

No more 3D beyond making shading real · no second ML model · no new screens ·
no live APIs / hardware / real drone · no optimisation solver · no chat ·
no login, settings, mobile, second site · **no invented numbers, ever**.

---

# Round two — the owner looked at it on a laptop

Reported 30 Aug, from the running product on a real screen rather than from a
1920x1080 screenshot. Four bugs and one standing complaint: *"nothing looks good,
I don't even know where to start, we need to really reduce the amount of text and
jargon spam everywhere every single page."*

That is the same complaint `docs/ui-brief.md` recorded in August and the redesign
answered only halfway: it fixed HIERARCHY and left DENSITY alone.

## Group P0 — things that are simply wrong  ✅

- [x] P0.1 A SCHEDULED array said *"Within tolerance. No intervention scheduled."*
      `status === 'scheduled'` had no branch and fell through to the healthy
      sentence — printed under a SCHEDULED badge, beside a −41.7 % deviation and a
      named crack mechanism. Three claims, two false, in one box. It now says work
      is approved and the fault is still present until a crew reaches it.
- [x] P0.2 **B-17's findings printed under A-08.** `Findings` renders the committed
      cache, which is B-17's; the dossier gated it on `agent` alone. Tenth instance
      of this project's most repeated bug, and I introduced it by adding a section
      without asking whose data it was.
- [x] P0.3 **The agent argued with the console about temperature, and the agent was
      right.** We measure an ARRAY average, not per-string. The prompt told the
      model to look for a hot STRING, so it correctly objected that it could not
      tell, and confidence fell to 0.70 on a case it should be sure about. The
      prompt, the cross-check and `causes.ts` now all describe the array-level
      rise that is actually measured.
- [x] P0.4 Four regression tests, asserting the sentences rather than the headings.

## Group I — take the clutter out  ✅

- [x] **I1. Fit to the window.** The console is still 1920×1080 by design and is
      now SCALED to whatever window it has, like a slide fitting a projector.
      Reflowing would have meant rebuilding every screen and re-pinning every test
      that asserts what is on screen at a given second; scaling keeps the hierarchy
      the redesign fought for, at 79 % on a 1512×900 laptop.
      *Centred by absolute position, not by grid alignment: `place-items: center`
      leaves an item WIDER than its container at x=0, which put the console 204 px
      in and off the right edge — very nearly the bug it was meant to fix.*
- [x] **I2. A "show workings" switch, OFF by default.** Every grey provenance line
      — `expected output from physics.ts`, `as at 12:03 · openai/gpt-oss-120b`,
      `Every number above was checked…`, `priorityScore() — loss × severity…`, the
      declared-site-facts row — is behind it. The claim stays; the receipt is one
      click away, which is the second it is actually wanted.
- [x] **I3. The right rail is a pop-out.** The map takes the full width and the
      panel arrives when an array is clicked. It used to hold a third of the screen
      permanently, including when nothing was selected and it read "NO ARRAY
      SELECTED" — furniture rather than a response.
- [x] **I4. The event rail only on the Site screen**, where an event and the array
      it names sit next to each other.
- [x] **I5. The dossier stops making you scroll.** Reasoning down the left,
      evidence and the agent down the right, both visible at once. It was a
      full-width band of reasoning with the columns beneath, which on a laptop put
      the captured frames below the fold — the operator had to scroll to reach the
      photograph the drone was sent for.
- [x] **I6. Said once.** The agent's paragraph appeared in the chain AND in the
      card beside it. The chain is the deterministic reading; the card is the
      model's prose about it. Two kinds of claim, once each.
- [x] **I7. Evidence scrolling.** Fixed by I5 — the frames are in a column of their
      own rather than at the bottom of a shared scroll.
- [x] **I8. Intro paragraphs to one sentence.**
- [x] The map's "pick one to see what is wrong" hint disappears after the first
      click. It floats over the map, so every line in it costs three arrays.

## Group J — light mode  ✅

Explicitly forbidden by CLAUDE.md §3 ("no dark/light toggle"). The owner asked for
it on 30 Aug after using the product on a laptop in daylight — a case the spec did
not consider. That is the decision; the spec line is superseded, and the CSS says
so rather than quietly diverging.

- [x] J1. A light palette over the same tokens. **The ironbow ramp does not
      invert** — it is the false-colour LUT a thermal camera uses, and it is the
      whole reason the console's colours and the camera's colours are the same
      colours. Only surfaces, lines and text change.
- [x] J2. A toggle in the header, persisted with the operator's other settings.
- [x] J3. Contrast chosen against the ground each token sits on, with the ratios
      recorded in the CSS. `--text-muted` is held above 4.5:1 from the start —
      its dark twin had to be promoted once for failing at 2.8:1.
- [x] J4. Verified on all six screens in both themes.

## Group K — the detector runs live, in the browser

- [ ] **K1. Export `defect_yolov8n.pt` → ONNX. OWNER RUNS THIS.**
      One Colab cell, about two minutes: **`docs/colab-export-onnx.md`**. Drop the
      result into `public/models/`. Until then the console says the detector is not
      loaded and draws nothing — the designed state, not a broken one.
- [x] K2. `onnxruntime-web`, dynamically imported so its ~5 MB of WebAssembly
      stays out of the first-load bundle. `/console` went 323 → 336 kB.
- [x] K3. Letterbox, NCHW normalise, YOLOv8 decode and NMS, written here and
      covered by 16 unit tests against hand-worked cases. **The shape is the
      trap:** v8 emits `[1, 4+classes, anchors]`, the transpose of v5, and with no
      objectness column — reading it the other way round gives boxes that are
      plausible, wrong, and silent about it.
- [x] K4. The frame comes from the 3D scene itself — the drone's own camera —
      via `preserveDrawingBuffer` on the canvas. Not a committed file.
- [x] K5. Runs on that frame and draws what the model returns, with the inference
      time printed, because that is the proof it happened now.
- [x] K6. **Absent means absent.** No model → says so. No detection → says the
      model found nothing on this frame. **No box is ever drawn from anything but
      model output**, and a test asserts an empty tensor yields an empty result.
- [x] K7. The risk is on screen: the detector was trained on photographs and this
      is a render. If it finds nothing, the panel says so and the real photograph
      keeps its detection.

## Group L — verify by looking  ✅

- [x] L1. `scripts/shots.mjs` photographs all six screens at 1512×900.
- [x] L2. Both themes, twelve images.
- [x] L3. Workings off by default, verified in the DOM.
- [x] L4. All seven gates, plus `check:live` 10/10 awake.

---

## Where round two landed

**486 tests · 30 files** (was 470). `tsc` · `eslint` · `validate:data` I1–I16 ·
`check:literals` · `next build` · `check:live` 10/10 — all green.

The one thing outstanding is **K1**, which needs a Colab account and two minutes.


---

# Round three — the panel, the model, and the scrolling

## Fixed

- [x] **The detail panel is a box you can close.** "Pop out" was read as "off the
      grid"; what was meant was a rectangle that opens on a click and shuts on
      demand. Inset from every edge, its own border on all four sides, its own
      shadow, an `ESC ×` control in the header, and Escape bound to it. The map
      stays live underneath — picking another array swaps what the box is about,
      which is what an operator comparing two arrays actually does.
      *The close control was first pinned to the corner and rendered straight on
      top of the CRITICAL chip; it sits in the header row now.*
- [x] **The capture happens before the model loads.** With no export in the build
      the operator got "detector not loaded" and NO IMAGE, which reads as the
      capture being broken when it is the one part that works. The frame is grabbed
      first and stays on screen whatever happens next.
- [x] **The detector runs DURING the flight.** `LiveReticle` samples the drone's
      own camera every 2.5 scene-seconds while the aircraft is on station and draws
      what the model returns. Driven by the flight cue, so it starts and stops with
      the inspection and rewinds when time is scrubbed; never overlapping calls;
      renders nothing at all until the ONNX export exists.
- [x] **The dispatch control stopped contradicting the diagnosis.** It said
      "dispatch to find out which" for ANY deviating array — including one the
      console had just diagnosed as dirt, four lines above, with "do not fly a
      drone" written out in full. It now follows the cause: `DISPATCH DRONE` on a
      localised fault, `FLY ANYWAY` on a soiled array with the wash-crew action
      stated. The button never disappears — a recommendation you cannot ignore is
      an order.
- [x] **The agent stopped calling two agreeing signals "conflicting".** Given a
      string below the array AND the array above the fleet median, it was reporting
      the case as unresolvable and dropping to 0.70 confidence. The prompt now says
      explicitly that when both signals point the same way the remaining unknown is
      WHICH MODULE, not what kind of fault.
- [x] **Module screens wrap into columns.** Five blocks stacked in one column was a
      page you scrolled three times to read, with half the width empty. Small
      blocks sit two-up; charts, timelines and ranked tables keep the full width.
      The generation chart went 300 px → 220 px, which is four blocks' worth of
      scrolling returned.

## Still open — needs you

- [ ] **Run `docs/colab-export-onnx.md`.** Two minutes in Colab. Until then the
      console says the detector is not loaded, shows the captured frame, and draws
      no box — because a box we already know the answer to, labelled as a
      detection, is fabricated evidence.


---

# Round four — the popup, the flight, and the last of the queue

- [x] **The array panel is a WIDE CENTRED CARD.** Two earlier attempts kept the
      same shape — a 448 px column, first docked and then floating — and the shape
      was the problem: twenty-five facts in a strip narrower than a phone, which
      you scroll. A landscape card 1180 px wide lays the same content in columns
      and it fits. Close control in the header, Escape bound, map live underneath.
      *An absolutely positioned grid item is contained by its own GRID AREA, and
      `rail-over` sets that column to 0 — so `left: 50%` and `width: 100%` both
      resolved against nothing and the panel rendered two pixels wide, present in
      the DOM and invisible on screen. It spans every track now.*
- [x] **The cinematic is pinned to the dark palette.** In light mode it inherited
      the light one and became unreadable — mission log a white slab across the
      sky, REC and LIVE invisible, the PiP label and status pill gone. It looked
      like the simulation had broken, which is a fair reading of a screen you
      cannot see anything on. It is a camera viewfinder, not a document.
- [x] **A flight-speed control inside the cinematic**, with the one number that
      answers "is this broken or just slow": how long the sortie takes in real
      seconds at the current setting. A 56-minute mission at 1× is 56 minutes of
      your time, the drone crawls, and there was no way to change speed once the
      view had cut.
- [x] **The letterbox is a fixed dark bezel** rather than the theme's ground — it
      frames a light console and a dark camera feed, and a pale border around the
      scene read as the render failing to fill the screen.
- [x] **Live events are clickable.** The whole row selects the array it names,
      exactly as clicking the map does. A row about nothing in particular stays
      inert rather than pretending to be a control.
- [x] **Rehearsal: SOMEWHERE ELSE.** The picker defaulted to the selected array,
      so repeated injections landed on the same handful and the site stopped
      looking like a site. It now walks the block on a coprime stride —
      deterministic, so the third press always lands where the third press landed
      and a judge re-running the demo sees the same site, but far enough each step
      that it reads as arbitrary. `Math.random()` stays banned.
- [x] **A rate limit says it is a rate limit.** Running at 600× flips statuses
      constantly, every flip is a new question, and Groq's free tier counts per
      minute — so the console filled with AGENT UNAVAILABLE and the obvious
      reading was an expired key. It now names the limit AND the cause, which is
      the clock.
      *A blanket cooldown was tried first and reverted: it drops requests
      silently, so an array the operator has just selected can sit without a
      verdict for no visible reason. Better to ask, be told no, and say so.*


---

# Round five — the button that was working, and photographs on the panels

- [x] **K1 is done.** `public/models/defect_yolov8n.onnx` is in the build, the
      detector loads, and every state below is real rather than designed-for.

- [x] **"Run the detector on this captured frame" was never broken.** Measured in
      the running app: 520 ms the first press, 298 ms the second, real inference
      both times. What was broken was the feedback — the only visible trace was a
      millisecond count at y=962 in a 900 px window, below a full-width photograph,
      and the answer on identical pixels is identical by design. There is now a run
      ledger under the button: one line per run, with its number, clock time,
      inference time and verdict. No artificial delay was added; the printed figure
      is the measured one.

- [x] **"Verify — reproduce the committed 0.91" was dead, and that was worse.**
      The panel displayed `byPanel[panelId] ?? last`, so after any flight the
      filed capture won permanently and the verify run updated a value nothing was
      reading. A result now carries which array it is about and what it was run on;
      the panel shows the most recent run about this array and says which. Only the
      flight files into `byPanel`, so a re-run can no longer destroy the frame the
      aircraft brought back.

- [x] **Two modules are textured with real photographs, and the detector fires.**
      Cracked module: `IMG_0436`, test split, our weights score the written file
      `Cracked 0.91`. Intact neighbour: `IMG_0449`, scored `Good 0.79` and no
      cracked box — chosen that way on purpose, because half the `Good` crops in
      this dataset come back `Cracked` above 0.5 and picking by eye would have
      manufactured a false positive. Not `IMG_0429`: that is the frame the
      committed 0.9084 was measured on, and the generator refuses it by name.

- [x] **The ROI was why it still did not fire.** The module's projected rect was
      padded by 0.12 **of the frame** on each side, so the model got three modules
      and a field of sand and answered `Saglam 0.94` with no cracked box. Scored
      offline on the saved capture: whole frame nothing, cropped to the module
      `Cracked 0.85`, tight `Cracked 0.88`. The margin is now a fraction of the
      module's own size. Live in the app afterwards: **1 detection at 0.63**.

- [x] **It is said on screen.** The cinematic carries a line from target lock, and
      the incident file repeats it beside the verdict: the module surface is a
      photograph of a real panel, it is surface material and not a camera frame,
      and any box is still the model's own output. Source file, split and licence
      are behind SHOW WORKINGS.

## Still open — needs you

- [ ] **Look at the two textured panels and say whether to do all 120.** They are
      on the inspected array only, deliberately, so this is a decision you can make
      by looking rather than by reverting.
- [ ] **Read the inference time on the machine that will run the demo.** Every
      figure here came through headless Chrome on a software rasteriser.


---

# Round six — the box, and the page that explained nothing

- [x] **The live box was drawn against the screen instead of against its crop.**
      The model returns coordinates in the pixels of the region it was handed; the
      overlay treated them as percentages of the whole viewfinder, so a real 0.72
      detection became a rectangle across most of the picture. The result carries
      its `roi` now and the overlay sits on that rectangle first. 432×614 → 372×529.

- [x] **The box is the module, not the crack — and it says so.** Read off the
      dataset's own labels: median `Cracked` box is 30 % of its image, p90 is 47 %.
      Every training example boxes the whole panel. So a box hugging the module is
      the model working, and an unexplained rectangle would read as "the crack is
      here", which this model cannot say. Where on the module is the thermal grid's
      job — stated on screen in both the cinematic and the incident file.

- [x] **"Clearly the yolo is not working" — it was, on a bad frame.** Scored
      offline: whole camera frame `Good 0.33` and no cracked box; the same frame
      cropped to the module `Cracked 0.92`. Crop margin 15 % → 6 %, and **the pass
      now keeps its clearest frame instead of its last** — the camera orbits while
      the detector samples and legibility depends on the angle. Every candidate is
      a real capture; the panel says how many it chose from, and a new sortie
      clears the old one. Live box 0.40 → 0.70; filed capture 1 detection at 0.74.

- [x] **Work orders are out of the live event feed.** The operator's own approval
      was being reported back as an incoming alert. The footer counts it, the map
      turns the array SCHEDULED, and Repairs lists it — the feed is for things that
      happened to the site.

- [x] **Repairs explains itself now.** Each row prints its own arithmetic with the
      operators between the figures — `1.01 × 3.00 × 11.67 ÷ 1.0 = 35.35` — so
      there is nothing left to explain. The four words are defined once underneath
      the formula. The day plan gained an hour axis from `now` and one sentence on
      how to read it. The ranked list comes first and the plan reads as its
      consequence; it used to open on an unlabelled Gantt of jobs you had not seen.
      Severity chips no longer stretch into 150 px bars that look like a chart.


---

# Round seven — reviewed as code, swept as an application

- [x] **`npm run check:layout`** — a new gate. jsdom has no layout, so a box
      smaller than its contents renders identically to one that fits and every
      unit test stays green. Walks six screens in both themes plus the array panel
      and the incident file, and fails on any non-scrolling box whose content
      overflows it. Falsified before it was trusted: it reports the KPI spill at
      the old value and nothing at the new one.

- [x] **The site KPI strip was 118 px holding 137 px.** `.area-kpi` does not clip,
      so the anomaly zone bars painted 19 px down over the map — on every screen,
      in both themes, in every screenshot taken since the strip was built. Sized
      to its content, not clipped.

- [x] **The generation chart drew neither thing its caption promised.** The dashed
      line was an `Area`-only chart's `<Line>` child, in the markup and drawn
      nowhere; and it would have been invisible anyway at 0.11 MW on a 400 MW
      axis. The loss now has its own kW axis on the right, where it is legible.
      The NOW marker was discarded because the categorical x axis had "10:00"
      twice across a full day; the axis is numeric hours now.

- [x] **Nine of eleven review findings fixed.** The worst: the live overlay would
      have drawn the committed photograph's box across the viewfinder if you
      pressed Verify during a flight — a box the model never produced from those
      pixels. Also: the manual "run it on this live frame" button handed over the
      whole viewfinder rather than the module; a clamp that let the crop and the
      overlay disagree; a failed run permanently disabling the detector; `busy`
      documented and never read; and the surface-provenance note claiming
      photographed modules for arrays no drone had flown over.

- [x] **Measured end to end afterwards:** the pass runs four frames and keeps the
      best at 0.90, re-running on it finds the crack again, and Verify reproduces
      the committed **0.91** exactly.

## Still open — needs you

- [ ] Decide whether to texture all 120 arrays or leave the two.
- [ ] Read the inference time on the machine that will run the demo.
- [ ] `docs/backlog.md` §6d — a no-work job still books a crew's travel.
