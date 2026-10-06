/**
 * src/lib/scheduler.ts — the day's crew plan: an exact solve, and a heuristic.
 *
 * BOTH, ON PURPOSE. The heuristic is what an operator would do by hand: take the
 * most valuable job, give it the earliest crew that can reach it, repeat. It ties
 * with the optimum while the day has slack and loses a few per cent once shift
 * limits and the heat rule bind, which is exactly what a heatwave does. Showing
 * the two scores side by side is how the solver earns its place on screen.
 *
 * The heuristic is also the fallback. If the solver's WebAssembly does not load,
 * the plan is the heuristic's and says so.
 *
 * THE SOLVER IS PASSED IN. This file never loads anything, so it is pure and the
 * tests can hand it the real HiGHS build under Node.
 *
 * THE SOLVER HAS 50 MS. The site's own days solve in about ten. A day larger and
 * looser than the site has yet posed can take several times the budget, and a
 * replan that stalls the screen is worse than one that admits where it stopped.
 * So the solve is cut off at the limit and reports what it holds: the best plan
 * found and the gap to the bound the solver had proved by then. THAT PLAN IS
 * NEVER CALLED OPTIMAL. Only a solve that finished is.
 *
 * A PLAN IS A PROPOSAL. Nothing here creates a work order. That takes an operator.
 */

import { siteWeather, hazardsAt, type HazardEvent } from './hazard';
import {
  buildModel, buildPooledModel, feasibleStarts, startValue, type Job, type Problem,
} from './lpModel';
import { ambientAt } from './physics';
import type { LiveTask } from './queue';
import { priorityScore } from './ranking';
import type { Repair } from './repair';
import { CREW_COUNT, TRAVEL_HOURS_BASE } from './schedule';

export { LATE_FACTOR, onTime } from './lpModel';
export type { Job, Problem } from './lpModel';

export interface Assignment { jobId: string; crew: number; startSlot: number }

/**
 * How far the plan can be trusted.
 *
 *   optimal    the solver finished: no better plan exists under these rules
 *   limit      the solver ran out of time: this is the best plan found, and
 *              `gapPct` says how far below the proved bound it sits
 *   heuristic  the solver did not run or failed, and the plan is the heuristic's
 */
export type PlanStatus = 'optimal' | 'limit' | 'heuristic';

export interface Plan {
  assignments: Assignment[];
  /** The plan's score. Equal to `baseline` when the heuristic is all there is. */
  objective: number;
  /** The heuristic's score on the same problem, shown beside the plan's. */
  baseline: number;
  solveMs: number;
  status: PlanStatus;
  /** True only when the solver proved it. Shorthand for `status === 'optimal'`. */
  optimal: boolean;
  /**
   * For a solve stopped at the time limit: how far the best plan found sits below
   * the bound HiGHS had proved, as a percentage of the plan's score. This is
   * HiGHS's own definition of the MIP gap. Null for any other status.
   */
  gapPct: number | null;
}

export interface SolverResult {
  /** `limit` is a solve stopped at the time limit; it may still hold a plan. */
  status: 'optimal' | 'limit' | 'failed';
  /** Column values by name. Empty when the solver holds no feasible plan. */
  values: Record<string, number>;
  /** The best objective the solver has proved possible, or null if it has none. */
  bound: number | null;
}

/** What the scheduler needs of a solver. Structural, so a test can fake one. */
export interface Solver {
  solve(lp: string, timeLimitSeconds: number): SolverResult;
}

/** The whole replan's budget for the exact solve. Owner's ruling, 6 Oct 2026. */
export const SOLVE_BUDGET_MS = 50;
/** Less than this left after the first model and a second is not worth starting. */
const MIN_SECOND_SOLVE_MS = 5;
/** Scores closer than this are the same score. */
const SAME_SCORE = 1e-9;

/* ── The site's rules. Declared assumptions, printed behind the `?`. ──────── */

/** One-hour slots, this many ahead of now. */
export const HORIZON_SLOTS = 12;
/** The most hours one crew works in the horizon. */
export const SHIFT_CAP_HOURS = 8;
/** Crews are in the field between these hours of the day. */
export const SHIFT_START_HOUR = 6;
export const SHIFT_END_HOUR = 20;
/**
 * At or above this ambient, no field work. A site rule, not a regulation. The
 * forecast day peaks a little above 37 °C, so on an ordinary day it closes
 * nothing, and under the sandbox heatwave it closes the middle of the day.
 */
export const HEAT_WORK_LIMIT_C = 40;

/* ── Scoring, shared by both planners so the two numbers are comparable ──── */

export function objectiveOf(assignments: readonly Assignment[], problem: Problem): number {
  const byId = new Map(problem.jobs.map((j) => [j.id, j]));
  let total = 0;
  for (const a of assignments) {
    const job = byId.get(a.jobId);
    if (job) total += startValue(job, a.startSlot, problem.slots);
  }
  return total;
}

/**
 * The heuristic: jobs in order of worth, each on the crew and slot that keeps the
 * most of it. Deterministic: ties go to the earlier job, the earlier slot, the
 * lower crew.
 */
export function greedy(problem: Problem): Assignment[] {
  const busy = Array.from({ length: problem.crews }, () => new Set<number>());
  const load = Array.from({ length: problem.crews }, () => 0);
  const out: Assignment[] = [];

  const order = problem.jobs
    .map((job, i) => ({ job, i }))
    .sort((a, b) => b.job.pri - a.job.pri || a.i - b.i);

  for (const { job } of order) {
    let placed = false;
    for (const start of feasibleStarts(job, problem)) {
      for (let crew = 0; crew < problem.crews && !placed; crew += 1) {
        if (load[crew] + job.dur > problem.shiftCap) continue;
        let free = true;
        for (let t = start; t < start + job.dur; t += 1) if (busy[crew].has(t)) { free = false; break; }
        if (!free) continue;
        for (let t = start; t < start + job.dur; t += 1) busy[crew].add(t);
        load[crew] += job.dur;
        out.push({ jobId: job.id, crew, startSlot: start });
        placed = true;
      }
      if (placed) break;
    }
  }
  return out;
}

/**
 * Deal a pooled plan's jobs out to crews: each to the free crew with the least
 * work so far that can still take it inside its own shift. Null when some job
 * finds no crew, which is the one way the pooled model can be wrong.
 */
export function dealToCrews(
  chosen: ReadonlyArray<{ job: Job; start: number }>, problem: Problem,
): Assignment[] | null {
  const busy = Array.from({ length: problem.crews }, () => new Set<number>());
  const load = Array.from({ length: problem.crews }, () => 0);
  const out: Assignment[] = [];
  // Longest first within a slot: the hard ones to fit get first pick of a crew.
  const order = [...chosen].sort((a, b) => a.start - b.start || b.job.dur - a.job.dur || a.job.id.localeCompare(b.job.id));

  for (const { job, start } of order) {
    let best = -1;
    for (let crew = 0; crew < problem.crews; crew += 1) {
      if (load[crew] + job.dur > problem.shiftCap) continue;
      let free = true;
      for (let t = start; t < start + job.dur; t += 1) if (busy[crew].has(t)) { free = false; break; }
      if (free && (best < 0 || load[crew] < load[best])) best = crew;
    }
    if (best < 0) return null;
    for (let t = start; t < start + job.dur; t += 1) busy[best].add(t);
    load[best] += job.dur;
    out.push({ jobId: job.id, crew: best, startSlot: start });
  }
  return out;
}

const byCrewThenStart = (a: Assignment, b: Assignment) =>
  a.crew - b.crew || a.startSlot - b.startSlot || a.jobId.localeCompare(b.jobId);

/**
 * The plan. With a solver that finishes it is provably the best one. With a
 * solver stopped at the time limit it is the best found, with its gap. Without a
 * solver, or if it fails, it is the heuristic's. Each is marked as what it is.
 */
export function solve(
  problem: Problem,
  solver?: Solver | null,
  /** The budget is a parameter so the exact model can be tested without a stopwatch deciding the result. */
  { budgetMs = SOLVE_BUDGET_MS, now = () => performance.now() }: { budgetMs?: number; now?: () => number } = {},
): Plan {
  const t0 = now();
  const fallback = greedy(problem).sort(byCrewThenStart);
  const baseline = objectiveOf(fallback, problem);
  const plan = (assignments: Assignment[], status: PlanStatus, gapPct: number | null = null): Plan => ({
    assignments,
    // Scored by the same function as the heuristic, not read off the solver, so
    // the two figures on screen are the same arithmetic.
    objective: objectiveOf(assignments, problem),
    baseline, solveMs: now() - t0, status, optimal: status === 'optimal', gapPct,
  });
  const heuristicOnly = (): Plan => plan(fallback, 'heuristic');

  if (!solver) return heuristicOnly();

  try {
    const pooled = buildPooledModel(problem);
    if (pooled.vars.length === 0) return plan(fallback, 'optimal');
    const first = solver.solve(pooled.lp, budgetMs / 1000);
    if (first.status === 'failed') return heuristicOnly();

    // The pooled model is a relaxation, so its bound holds for the real problem
    // whichever model ends up supplying the plan.
    let bound = first.bound;
    let found: Assignment[] | null = null;
    let proved = false;

    // The pooled answer is the optimum whenever its jobs deal out to crews
    // without one of them over its own shift. When they do not, the exact
    // crew-by-crew model decides, in whatever is left of the budget.
    const dealt = dealToCrews(
      pooled.vars
        .filter((v) => (first.values[v.name] ?? 0) > 0.5)
        .map((v) => ({ job: problem.jobs[v.job], start: v.start })),
      problem,
    );
    if (dealt) {
      found = dealt;
      proved = first.status === 'optimal';
    } else {
      const left = budgetMs - (now() - t0);
      if (left >= MIN_SECOND_SOLVE_MS) {
        const exact = buildModel(problem);
        const second = solver.solve(exact.lp, left / 1000);
        if (second.status !== 'failed') {
          found = exact.vars
            .filter((v) => (second.values[v.name] ?? 0) > 0.5)
            .map((v) => ({ jobId: problem.jobs[v.job].id, crew: v.crew, startSlot: v.start }));
          proved = second.status === 'optimal';
          if (second.bound !== null) bound = bound === null ? second.bound : Math.min(bound, second.bound);
        }
      }
    }

    if (proved && found) return plan(found.sort(byCrewThenStart), 'optimal');

    // Out of time. The best plan in hand is the solver's unless the heuristic's
    // is better, which it can be when the limit cut the search short.
    const best = found && objectiveOf(found, problem) > baseline + SAME_SCORE
      ? found.sort(byCrewThenStart)
      : fallback;
    if (bound === null) return plan(best, 'heuristic');
    const score = objectiveOf(best, problem);
    return plan(best, 'limit', score > 0 ? Math.max(0, ((bound - score) / score) * 100) : 0);
  } catch {
    return heuristicOnly();
  }
}

/* ── From the live queue to a problem ───────────────────────────────────── */

export interface ScheduleContext {
  tasks: readonly LiveTask[];
  /** The repair an array needs, from its likely cause and the site record. */
  repairFor: (panelId: string) => Repair;
  /** Hours since the scenario epoch, now. */
  nowOffsetH: number;
  /** The hour of day the scenario starts at. */
  epochHour: number;
  hazards?: readonly HazardEvent[];
  crews?: number;
}

/** Slot `k` covers the hour starting `k` whole hours after the next hour boundary. */
export const slotStartOffsetH = (nowOffsetH: number, slot: number): number => Math.ceil(nowOffsetH) + slot;

/** The slots closed to field work, and how many of those are the heat rule's. */
export function closedSlots(
  ctx: Pick<ScheduleContext, 'nowOffsetH' | 'epochHour' | 'hazards'>,
): { closed: Set<number>; heat: Set<number> } {
  const closed = new Set<number>();
  const heat = new Set<number>();
  for (let k = 0; k < HORIZON_SLOTS; k += 1) {
    const offset = slotStartOffsetH(ctx.nowOffsetH, k);
    const hourOfDay = (((ctx.epochHour + offset) % 24) + 24) % 24;
    if (hourOfDay < SHIFT_START_HOUR || hourOfDay >= SHIFT_END_HOUR) closed.add(k);
    // The middle of the slot, with any heatwave in force at that hour applied.
    const mid = offset + 0.5;
    const ambient = siteWeather(0, ambientAt(mid), hazardsAt(ctx.hazards ?? [], ctx.epochHour + mid)).tAmb;
    if (ambient >= HEAT_WORK_LIMIT_C) { closed.add(k); heat.add(k); }
  }
  return { closed, heat };
}

export function problemFrom(ctx: ScheduleContext): Problem {
  const lead = Math.ceil(ctx.nowOffsetH) - ctx.nowOffsetH;
  const jobs: Job[] = [];
  for (const t of ctx.tasks) {
    const { hours } = ctx.repairFor(t.panelId);
    if (hours <= 0) continue;                       // nothing to repair: shading, or no fault
    jobs.push({
      id: t.id,
      panelId: t.panelId,
      // Two decimals, so the problem is the same text until something real moves.
      pri: Math.round(priorityScore(t) * 100) / 100,
      dur: Math.max(1, Math.ceil(hours + TRAVEL_HOURS_BASE * t.accessCost)),
      deadline: Math.max(0, Math.floor(t.hoursUntilDeadline - lead)),
    });
  }
  return {
    jobs,
    crews: ctx.crews ?? CREW_COUNT,
    slots: HORIZON_SLOTS,
    shiftCap: SHIFT_CAP_HOURS,
    closed: closedSlots(ctx).closed,
  };
}

/** Identifies a problem. Two calls with the same key have the same plan. */
export const problemKey = (p: Problem): string => [
  p.crews, p.slots, p.shiftCap, [...p.closed].sort((a, b) => a - b).join(','),
  p.jobs.map((j) => `${j.id}:${j.pri}:${j.dur}:${j.deadline}`).join('|'),
].join('#');
