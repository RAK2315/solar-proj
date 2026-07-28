# 06 — Risks

Ordered by threat to the demo. Every high-risk bet has a fallback that **still yields a demo**.

One framing note: because there is no deadline, "we ran out of time" is not a risk here. The real risks for a long solo build are different — **numeric drift**, **scope creep with no forcing function**, and **the credibility gap between what you claim and what you measured**. Those are weighted accordingly.

---

### R1 — A number on screen can't be traced back to a script

- **Likelihood / impact:** high / **fatal**
- **Why it's #1:** it is the single failure mode that destroys the project's only real claim. Everything else is a bug; this is a lie. It's also insidious on a solo project with no deadline — you fix a component at 1am, hardcode a value "just for now", and it survives to the demo.
- **Signal:** `npm run check:literals` finds a match in `src/components/`. Or a number in the UI differs from `data/` after you regenerate.
- **Fallback:** none needed — **prevention is the design**. `validate:data` in `prebuild` + the literal grep + invariant I11 (the deliberate tripwire on `0.84`). Run both before every commit. This is why Phase 1 builds the validator before any UI exists.

### R2 — The reported mAP isn't the mAP you measured

- **Likelihood / impact:** medium / **fatal**
- **Why:** `CLAUDE.md` §11 flags this by name as a repeat failure mode. It is unrecoverable after the fact — a judge who finds one inflated metric discounts every other number in the project, including the honest ones.
- **Signal:** you can't produce the training log that generated the number on your slide.
- **Fallback:** report the real number, whatever it is. A YOLOv8n fine-tune at mAP@50 = 0.41 on a small public dataset is a **completely respectable result honestly reported**, and it is worth more than 0.85 you can't defend. Commit the metrics screenshot to `docs/` in the same commit as the weights so the two can never drift apart.

### R3 — Numeric drift across a long solo build

- **Likelihood / impact:** high / high
- **Why:** with no deadline the project spans weeks. You will change `f_soil` for one reason and not notice that `projected72hLossMWh` moved off 1.44, or that the agent cache's prose now contradicts the telemetry.
- **Signal:** an invariant fails that passed last week.
- **Fallback:** the invariants I1–I16 *are* the fallback, and they're cheap. Additionally: **re-run `run_agent.py` whenever the physics changes**, because the cached prose quotes numbers. The cross-check in Phase 6 catches this, but only if you actually re-run it. Add a note in `README.md`: *"if you touch `generate_telemetry.py`, re-run `run_agent.py`."*

### R4 — Scope creep with no forcing function

- **Likelihood / impact:** high / medium
- **Why:** every deadline-driven discipline in `CLAUDE.md` (freeze §2 at hour 2, gate M8, the solo cut-ladder) assumes time pressure. Remove the deadline and the guardrails lose their teeth. The failure isn't missing the demo — it's a project that grows a settings page, a second site, and a login screen, and never gets recorded.
- **Signal:** you're building something that doesn't appear in the 90 seconds.
- **Fallback:** the "What NOT to build" list in `05-build-plan.md` is the replacement forcing function, and **Phase 7's recording is the real one**. Record a complete demo the moment Phase 7 passes. Once a finished artefact exists, later work is genuinely optional rather than load-bearing, and that changes how you make decisions.

### R5 — The demo desyncs between console and cinematic

- **Likelihood / impact:** medium / high
- **Signal:** the PiP shows a different beat than the mission log; or seeking backwards leaves something stuck.
- **Fallback:** grep `src/components/` for `setInterval|setTimeout|requestAnimationFrame|useState`. The cause is always the same: something got its own timer or accumulated state instead of deriving it. The ESLint rules in `02-architecture.md` §7 make this fail at lint time rather than at demo time. **Run the backwards-seek test after every phase**, not just when something looks wrong — it's a 5-second check that catches this class immediately.

### R6 — Seeking backwards breaks state

- **Likelihood / impact:** medium / high
- **Signal:** play to 90, seek to 40, and the UI shows post-approval state or a fully-filled anomaly matrix.
- **Fallback:** every visible thing must be a pure function of `t`. If a component has `useState` holding demo content, it's wrong. `approved` is the **only** legitimate exception — and note it deliberately does *not* reset on seek, because the operator's decision is a real event, not a timeline position. If you want it to reset, that's `reset()`, not `seek()`.

### R7 — The triage output won't justify the drone

- **Likelihood / impact:** medium / high
- **Why:** if the LLM returns `requiresPhysicalVerification: false`, or a rationale that doesn't name the ambiguity, the drone becomes decorative and the central claim of the demo collapses.
- **Signal:** invariant I12 fails, or the rationale is generic ("further inspection recommended").
- **Fallback:** three escalating steps. (1) Tighten the system prompt — `CLAUDE.md` §9.1 already instructs "if two failure modes are consistent with the telemetry, say so explicitly and state what observation would distinguish them"; make that the *first* line, not the third. (2) Add a one-shot example of the desired output shape. (3) If it still won't land, **constrain the schema** — make `verificationRationale` require naming both candidate mechanisms. The output is cached, so you only have to win this once.

### R8 — The R3F scene eats the project

- **Likelihood / impact:** medium / **low** (was high under time pressure)
- **Why downgraded:** with no deadline, the scene consuming weeks costs nothing but weeks, and Phase 7 already shipped a complete demo.
- **Signal:** frame rate below 60 at 1920×1080, or the camera won't hit its marks on a backwards seek.
- **Fallback:** keep the `<video>` background path working until `<SolarFarmScene />` passes its DoD. The swap is one component boundary (`CinematicBackground`) precisely so reverting is a one-line change. Perf specifics: instanced meshes only (never 500 separate `<mesh>`), hard cap 600 instances, `dpr={[1, 1.5]}`, one blob shadow.

### R9 — Dataset licence or availability

- **Likelihood / impact:** low / medium
- **Why:** `CLAUDE.md` §11 flags ELPV specifically as uncertain on both licence and availability, and it's right to. Roboflow Universe datasets are mostly CC BY 4.0 but individually vary.
- **Signal:** the dataset page 403s, or the licence isn't stated.
- **Fallback:** several equivalents exist (`crack-solar-panel`, `solar-panel-fault-dataset`, `solar-panel-infrared-images`). Pick the first that loads and states a licence — **don't over-search; the model is a credibility artefact, not a research contribution.** Record name, size, split, and licence in `README.md` at download time. For thermal, the PVMD set (Mendeley `10.17632/5ssmfpgrpc.1`, DJI Mavic 3T) is public and covers hotspots/cracks/shadings.

### R10 — YOLOv8's AGPL licence surprises you later

- **Likelihood / impact:** low / medium
- **Why:** committing custom-trained Ultralytics weights makes the whole repo AGPL-3.0. Fine for a personal project — a problem if this later becomes a portfolio piece you want under MIT, or anything commercial.
- **Signal:** you want to relicense and can't.
- **Fallback:** retrain on **RF-DETR (Apache-2.0)**. The `detect_on_evidence.py` output contract is deliberately model-agnostic, so the swap touches one script and zero components. Decide now rather than discovering it later: add the `LICENSE` file in Phase 0.

### R11 — Groq deprecates the replacement model too

- **Likelihood / impact:** low / low
- **Why:** `llama-3.3-70b-versatile` was deprecated mid-2026; the same can happen to `gpt-oss-120b`.
- **Fallback:** **structurally immune.** Output is cached and committed, so the demo never calls Groq. A deprecation only affects your ability to *re-run* `run_agent.py`, and the fix is a one-line env-var change. This is the demo-safe rule paying for itself.

### R12 — Vercel build drops `/data` or `/models`

- **Likelihood / impact:** low / medium
- **Signal:** the deployed site renders but numbers are missing, or the annotated image 404s.
- **Fallback:** import JSON as ES modules (bundled) rather than fetching from `/public` — then the data is compile-time and cannot be missing at runtime. Binary evidence (jpg/png/wav/mp4) does go in `/public`; verify each one loads on the deployed URL, not just locally. `models/*.pt` is committed for provenance only and is never served — exclude it from the build output.

---

## Questions you will be asked

Rehearse these. The answer to each is a file you can open, not a claim.

**"Is this data real?"**
> Telemetry is simulated on NREL's PVWatts performance model with stated coefficients — here's `generate_telemetry.py`. The defect detector is fine-tuned on real labelled imagery from [dataset], mAP@50 of [real number]. The fault is a physically coherent chain — cracked cell → series resistance rise → bypass diode activation → reverse-bias heating → hotspot — not a random number. Answer this *before* it's asked, in the pitch.

**"What did you actually train?"**
> Open `train_defect_model.py`, the metrics screenshot in `docs/`, and the README's dataset provenance. This is why the vision phase is non-negotiable.

**"Why an agent and not a threshold dashboard?"**
> The prognosis stage. A rule engine tells you a string is down. This tells you *when it becomes unrecoverable* — by combining the confirmed defect state, the 72-hour forecast, and the degradation mechanism into a deadline no threshold can produce. **This is the question that decides the judging.** Rehearse it verbatim.

**"How does it prioritise?"**
> Show `ranking.ts`. Twelve lines, pure, deterministic, no LLM. Re-run the demo and the order is identical. That answer is worth more than any LLM output in the project.

**"Would you let this run unsupervised?"**
> No — and that's the approval gate. Point at it. The agent does everything up to the recommendation autonomously and then stops.

**"Why is output only 73% of nameplate?"**
> Because the cells are at 62.8 °C, and c-Si loses 0.37% per °C above 25. That's the model, not a fudge. *(This one is a gift — it's the question that proves the physics is load-bearing. C2 turned a bug into this answer.)*

**"Isn't this the Robinsun demo?"**
> Own it immediately and completely: *"That's the reference — we rebuilt the loop, and where they had a physical drone we put a real defect model and a physics-grounded simulation."* Denying looks far worse than the resemblance does.
