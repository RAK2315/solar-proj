# Kickoff prompt for a fresh Claude Code session

Open a new session in `D:\Projects\12. project` and paste everything in the block below.

`CLAUDE.md` loads automatically in that directory, so the prompt's job is to (a) point at `plan/`, (b) override CLAUDE.md's broken numbers before anything depends on them, and (c) set the working agreements.

---

```
Build SURYA AGENT. Read `plan/README.md`, then `plan/00-overview.md`, then
`plan/05-build-plan.md` before writing any code.

CONTEXT
Solo build, no deadline, personal project. Colab free T4 for training. No sponsor
or track constraints. Target: a 90-second scripted demo console at fixed 1920x1080.
This is greenfield — the repo currently has only CLAUDE.md, images/, plan/, skills/.

`plan/` is the buildable expansion of CLAUDE.md and already contains the schemas,
the ADRs, the invariants, the design tokens and the phase-by-phase build order.
Do not re-derive any of it. `plan/schemas.ts` is runnable — copy it to
`src/lib/types.ts`, don't rewrite it.

CRITICAL — CLAUDE.md CONTAINS ARITHMETIC ERRORS
CLAUDE.md is the design bible but its physics section does not add up. I verified
this by executing it. Where the two disagree: plan/ wins on numbers and library
versions; CLAUDE.md wins on the 90-second demo script (§2) and the design
direction (§12). Apply corrections C1-C8 from plan/00-overview.md in Phase 0.
The four that block everything:

  C1  P_RATED_STRING = 49.61, NOT 40.0.
      CLAUDE.md's own sketch yields 29.11 kW while claiming 36.1 kW.
      Also f_mismatch = 0.4160, not "~0.42" (0.42 gives -58.0%, not -58.4%).
  C2  Farm output is 364 MW, NOT 412 MW.
      412 MW is unreachable at 890 W/m2 and 35C — it needs 4.2C ambient in Rajasthan.
  C3  -42% and -58.4% describe different objects, not the same one:
      string B-17-S3 = -58.4%, array B-17 = -41.8% (derived as dev_string * 5/7,
      with stringsPerArray=7, faultedStrings=5). Use resolution (a) in
      plan/03-data-model.md §4. -42.0% is not reachable on the lattice; -41.8% is exact.
  C5  Groq model is `openai/gpt-oss-120b`. `llama-3.3-70b-versatile` was
      deprecated 2026-06-17 and the model ID is rendered on screen.

WORKING AGREEMENTS
1. Never invent a number. Every number on screen comes from /data, and every
   value in /data comes from a script in scripts/. If a number is missing, add it
   to the generator — never hardcode it in a component.
2. One clock. `t` in `src/store/demoClock.ts` is the only source of time, with
   exactly one requestAnimationFrame loop in `src/hooks/useDemoClock.ts`. No
   setInterval/setTimeout/second rAF anywhere in src/components/. Everything
   visible is a pure function of `t`. The only mutable state outside the clock
   is `approved`.
3. Report the real metric. Whatever mAP@50 the training run produces is what goes
   in README.md. Never round up, never quote a leaderboard number as your own.
4. Build only what appears in CLAUDE.md §2's 90-second table. Anything else goes
   in README.md as a post-project TODO.

START WITH PHASE 0, then Phase 1. Stop at the end of each phase, report against
its Definition of done, and wait for me before starting the next.

Phase 0 is not code — it's the contract freeze:
  - apply C1-C8
  - copy plan/schemas.ts -> src/lib/types.ts
  - scaffold the Next.js 15 app (TypeScript strict, Tailwind v4, App Router)
  - add LICENSE (AGPL-3.0 — YOLOv8's licence is contagious to trained weights)
  - write data/events.json by hand as a stub against the schema

Phase 1 is data + physics, and it comes before any UI because the generator has
the most downstream dependents. It ends when `npm run validate:data` passes
invariants I1-I16 from plan/03-data-model.md §5, and deliberately corrupting one
value in telemetry.json fails the build with a named error.

I have not yet set up API keys or datasets (see plan/PREREQUISITES.md) — neither
is needed until Phase 3, so don't block on them.
```

---

## After Phase 1

Just say `continue to Phase 2` at each stop. The phases are self-describing in `plan/05-build-plan.md`, so you shouldn't need to re-explain anything.

Two places worth intervening:

- **Phase 3 (vision).** When the training run finishes, check the reported mAP@50 against the actual metrics table yourself. This is the one number in the project that cannot be repaired after the fact.
- **Phase 7 (cinematic).** The moment it passes its DoD, **record the full 90 seconds.** That recording is what makes Phase 8 optional rather than load-bearing — and on a project with no deadline, that distinction is the thing protecting you from scope creep.

## If a new session loses the thread

Point it at `plan/README.md` and name the phase. The pack is written so a cold agent can pick up at any phase boundary without re-reading the conversation.
