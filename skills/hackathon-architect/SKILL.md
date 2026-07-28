---
name: hackathon-architect
description: Produce an extremely detailed, end-to-end technical plan and architecture for a hackathon project - grilling the user for context and researching the web before writing. Use whenever the user wants to plan, architect, design, or scope a hackathon project or idea, asks for a build plan / system design / tech-stack decision for a hackathon, says "plan my hackathon build", "design the architecture for this idea", "what should I build and how", or hands over a hackathon theme/problem and wants a buildable blueprint. Covers any hackathon domain (AI/ML, web, mobile, data, bio, fintech, hardware).
---

# Hackathon Architect

Turn a hackathon idea, theme, or requirement into an **extremely detailed, end-to-end technical plan and architecture** that a team can build from. You are optimizing for a plan that is (1) ambitious and feature-rich, (2) technically concrete enough to start coding immediately, and (3) ordered MVP-first so there is always something demo-able.

This is a **technical** plan - features, architecture, build order. It deliberately does not produce pitch/demo/judging strategy.

Core stance: **don't guess the important things.** A hackathon plan lives or dies on a handful of facts (the exact problem, the time window, the team, hard constraints like a sponsor API). Extract those from the user before architecting. Depth over speed - the user has said time is not a constraint, so go deep, research thoroughly, and detail everything.

## Workflow

### 1. Ingest all provided context

Read everything the user has given in the conversation: the theme/problem, any requirements, constraints, tech preferences, provided files, and prior messages. Note what you already know so you don't ask for it again.

### 2. Grill the user for what's missing (use the grill-me skill)

Before planning, interview the user to nail down the decision-shaping facts. If the `grill-me` skill is available, use it so the questioning is relentless and resolves each branch; otherwise ask one question at a time with `AskUserQuestion`, giving your recommended answer each time.

Work through `references/grilling-checklist.md` - it lists exactly what to extract (problem, users, time window, team size/skills, hard constraints, data/API availability, deployment target, success criteria). Skip anything already answered. Stop grilling once you have enough to architect with conviction; don't interrogate for its own sake.

### 3. Research the web

This is what separates a generic plan from a sharp one. Use `WebSearch` / `WebFetch` (spawn research subagents in parallel if available) to find, for this specific domain:
- **Prior art** - what similar projects/products exist, and the angle that makes this one distinct.
- **Best tools for the job** - the fastest-to-build, most reliable libraries, APIs, models, and datasets for each component. Prefer things buildable in a hackathon window.
- **Gotchas** - known pitfalls, rate limits, licensing, setup friction that could sink a weekend build.
- **Benchmarks / feasibility** - is the hard technical bet actually achievable? Cite real numbers where they exist.

Consult `references/hackathon-stacks.md` for durable fast-to-build stack defaults per domain, then let research update them. Cite sources in the plan so choices are defensible.

### 4. Write the plan pack

Produce a `plan/` directory of Markdown files (create the directory next to the user's project or in the working dir). The bar is **buildable, not just descriptive**: a coding agent should be able to open `plan/` and start writing code without asking questions - real table names with column types, enumerated enums, real API payloads, real file names, and the *why* behind every non-obvious choice. Read `references/buildable-detail-standards.md` first (it has before/after examples), then follow `references/plan-template.md` for the full section spec. The files:

- **`plan/00-overview.md`** - problem, the **one principle** that judges every feature, north-star metric, users/roles, scope (in/out), constraints, and success stated as **one complete end-to-end journey**.
- **`plan/01-features.md`** - the exhaustive, ambitious feature list (grouped by role if multi-role). Every feature tagged **[MVP]/[V2]/[STRETCH]** with a user story, checkable acceptance criteria, and dependencies. The maximalist vision.
- **`plan/02-architecture.md`** - components, ASCII **and** Mermaid architecture + data-flow diagrams, real API/interface contracts, tech-stack decisions **ADR-style**, the **file/module layout & conventions** (the seams that keep it navigable), external deps/data sources with fallbacks + the **demo-safe rule**, and the exact env var names.
- **`plan/03-data-model.md`** *(only if it persists data)* - ER diagram, table-by-table schema with column types, every **enum enumerated**, a read/write **permissions matrix**, and seed data. Emit a runnable **`plan/schema.sql`** (or Prisma/Drizzle/Mongoose equivalent) alongside it, kept in sync.
- **`plan/04-design-system.md`** *(only if it has a UI)* - exact design tokens, layout/shell, the full component-state set (loading/empty/error/**stale/partial/offline**), accessibility, and a screen inventory.
- **`plan/05-build-plan.md`** - MVP-first phases where **each ends in a demoable vertical slice with an explicit "Definition of done"**; optional timeline; task split with integration points; **"Decisions made (override if you disagree)"**; and **"What NOT to build (yet)"**.
- **`plan/06-risks.md`** - risks with likelihood/impact, early signals, and a concrete fallback for every high-risk bet (each must still yield a demo).

Skip `03` and `04` when they don't apply - don't pad a project with files it doesn't need.

### 5. Iterate as context grows

The user will feed more context over time. Fold it in and update the affected files rather than restarting. Keep the MVP/V2/STRETCH tagging and the always-demo-able build order intact through every revision.

## Companion skills (combine when the moment calls for it)

This skill produces the plan. Building and hardening it often pulls in other skills - reach for them at the right moment rather than doing everything inline. Don't force them; invoke only when the situation actually matches.

- **`grill-me`** *(already core to step 2)* - the requirements interrogation before planning.
- **`improve-codebase-architecture`** - when the hackathon builds on an **existing codebase** (not greenfield), run this first to find deepening/refactor opportunities, then let its findings shape the architecture in `02`. Also useful post-build to consolidate what got hacked together under time pressure.
- **`tdd`** - when a component has a **verifiable core** (a scoring function, a parser, an API contract, an ML metric gate), hand that piece to the tdd red-green-refactor loop so the build has a safety net. Point it at the acceptance criteria you wrote in `01-features.md`. Best for the parts that must not silently break during a frantic build.
- **`diagnose`** - the moment something **breaks or regresses** mid-build (a failing integration, a perf cliff, a flaky demo), switch into the diagnose reproduce→minimise→hypothesise→fix loop instead of guessing. Hackathon time is too scarce for shotgun debugging.
- **`zoom-out`** *(user-invoked only)* - when you or the user are **unfamiliar with a section of an existing codebase** and need a higher-level module/caller map before planning changes. Because it's user-triggered, **recommend** the user run `/zoom-out` rather than invoking it yourself.

A natural end-to-end flow on an existing codebase: `zoom-out` (map it) → `improve-codebase-architecture` (find the seams) → this skill (plan the build) → `tdd` (build the verifiable core) → `diagnose` (when something breaks).

## What "extremely detailed" means here

A coding agent should be able to open `plan/` and build the whole thing without asking you questions. That means: named files/modules, chosen libraries, concrete data schemas with column types, enumerated enums, actual API endpoints and payloads, design tokens, and diagrams - not "use a database" but "Postgres with these three tables, here's the schema and who can read each." When a choice has real alternatives, record why you picked one (ADR-style), and explain the *why* behind every non-obvious decision so the agent inherits the intent, not just the instruction. When time is not a limit, spend it on **more concreteness**, not more prose. `references/buildable-detail-standards.md` is the bar.

## Reference files

- `references/buildable-detail-standards.md` - what "buildable, not just descriptive" means, with before/after examples. Read first.
- `references/grilling-checklist.md` - the facts to extract before architecting.
- `references/plan-template.md` - the full section-by-section spec for each plan file, incl. ADR, Mermaid, data-model and design-system formats.
- `references/hackathon-stacks.md` - durable fast-to-build stack defaults per domain (starting point, refined by research).
