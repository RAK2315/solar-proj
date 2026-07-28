# Buildable Detail Standards

The point of the plan is that a coding agent can build from it directly. Descriptive is not enough; it must be **buildable**. Here is the bar, with before/after examples drawn from real, well-built project docs.

## The test

For every sentence in the plan, ask: *could someone open a file and start typing code from this, without guessing?* If they'd have to invent a name, a type, a shape, or a value - it's not done yet.

## 1. Name things concretely

- Not buildable: "Store the data in a database."
- Buildable: "Postgres table `forecasts` (ward_id fk, pollutant text, horizon_hours int, value numeric, local_excess numeric, confidence numeric, model_version text). One row per ward per horizon."

## 2. Spell out enums and states - never imply them

Agents reliably get implied sets wrong. Enumerate them.
- Not buildable: "reports move through a few statuses."
- Buildable: "`report_status = submitted | verified | acted | resolved | rejected`. A report starts `submitted`; only a field officer moves it forward; `rejected` is terminal."

## 3. Give real API contracts

- Not buildable: "An endpoint to classify a report."
- Buildable: "`POST /classify` → body `{ text: string, photo_url?: string }` → `200 { source_category: source_category, advisory_hi: string }`. If no model key is configured, return `{ source_category: 'other', advisory_hi: '' }` and never block the caller."

## 4. Explain the *why* on every non-obvious choice

This is what separates a plan an agent follows blindly from one it can extend correctly. The agent (or teammate) inherits the intent, not just the instruction.
- Thin: "Forecast local excess, not raw AQI."
- Rich: "Forecast *local excess above the city baseline*, not raw AQI, because a field officer cannot move the regional baseline - only the local load (dust, burning, construction) is theirs to act on and to measure success against. So the model's target is the delta, not the absolute."

## 5. Name the architectural seams

State the conventions that keep the codebase navigable, so extensions don't break it.
- Example: "All Supabase access lives in `lib/data.ts` and `lib/incidents.ts`. Components never query the DB directly - so every table/column name exists in exactly those two files. Workflow rules live in `lib/rules.ts` as pure functions (no I/O) so they're unit-testable and the UI can explain a rule instead of surfacing a raw DB error."

## 6. Make scope decisions explicit and vetoable

- "Decisions made (override if you disagree): single Postgres as the system of record, not DuckDB+Postgres - one source of truth. Build the loop before the ML - the loop is demoable without a model."
- "What NOT to build (yet): multi-city, auth beyond a hardcoded demo user, anything regional, a replacement for the existing complaint app."

## 7. Every phase ends in something demoable

- Not useful: "Phase 2: build the backend."
- Useful: "Phase 1 - the loop (ships without ML): citizen reports with photo+geotag → lands in field queue → officer logs action → report flips to resolved → citizen sees status move. **Definition of done:** one report goes end-to-end and `report_events` holds the timestamps. This alone is demoable and pilotable."

## 8. Plan for the demo failing gracefully

- "Demo-safe rule: cache a static snapshot of every external feed so a rate limit or provider outage on the day cannot kill the live pull. Show an explicit 'demo data' badge rather than faking a live integration."

---

Hold the whole pack to this bar. When "time is not a limit," the right use of that time is *more concreteness* - real schemas, real payloads, real file names, and the reasoning behind them - not more prose.
