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
 * A PLAN IS A PROPOSAL. Nothing here creates a work order. That takes an operator.
 */

import type { CauseId } from './causes';
import { siteWeather, hazardsAt, type HazardEvent } from './hazard';
import {
  buildModel, buildPooledModel, feasibleStarts, startValue, type Job, type Problem,
} from './lpModel';
import { ambientAt } from './physics';
import type { LiveTask } from './queue';
import { priorityScore } from './ranking';
import { CREW_COUNT, REPAIR_HOURS, TRAVEL_HOURS_BASE } from './schedule';

export { LATE_FACTOR, onTime } from './lpModel';
export type { Job, Problem } from './lpModel';

export interface Assignment { jobId: string; crew: number; startSlot: number }

export interface Plan {
  assignments: Assignment[];
  /** The plan's score. Equal to `baseline` when the heuristic is all there is. */
  objective: number;
  /** The heuristic's score on the same problem, shown beside the optimum. */
  baseline: number;
  solveMs: number;
  /** False when the solver did not run and the plan is the heuristic's. */
  optimal: boolean;
}

/** The part of a HiGHS solution this needs. Structural, so a test can fake one. */
export interface Solver {
  solve(lp: string): {
    Status: string;
    ObjectiveValue: number;
    Columns: Record<string, { Primal: number }>;
  };
}

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
 * The plan. With a solver it is provably the best one; without, or if the solver
 * fails, it is the heuristic's, marked as such.
 */
export function solve(problem: Problem, solver?: Solver | null, now: () => number = () => performance.now()): Plan {
  const t0 = now();
  const fallback = greedy(problem).sort(byCrewThenStart);
  const baseline = objectiveOf(fallback, problem);
  const heuristicOnly = (): Plan => ({
    assignments: fallback, objective: baseline, baseline, solveMs: now() - t0, optimal: false,
  });

  if (!solver) return heuristicOnly();

  try {
    const pooled = buildPooledModel(problem);
    if (pooled.vars.length === 0) return { ...heuristicOnly(), optimal: true };
    const first = solver.solve(pooled.lp);
    if (first.Status !== 'Optimal') return heuristicOnly();

    // The pooled answer is the optimum whenever its jobs deal out to crews
    // without one of them over its own shift. When they do not, the exact
    // crew-by-crew model decides.
    let assignments = dealToCrews(
      pooled.vars
        .filter((v) => (first.Columns[v.name]?.Primal ?? 0) > 0.5)
        .map((v) => ({ job: problem.jobs[v.job], start: v.start })),
      problem,
    );
    if (!assignments) {
      const exact = buildModel(problem);
      const second = solver.solve(exact.lp);
      if (second.Status !== 'Optimal') return heuristicOnly();
      assignments = exact.vars
        .filter((v) => (second.Columns[v.name]?.Primal ?? 0) > 0.5)
        .map((v) => ({ jobId: problem.jobs[v.job].id, crew: v.crew, startSlot: v.start }));
    }
    assignments.sort(byCrewThenStart);
    // Scored by the same function as the heuristic, not read off the solver, so
    // the two figures on screen are the same arithmetic.
    return { assignments, objective: objectiveOf(assignments, problem), baseline, solveMs: now() - t0, optimal: true };
  } catch {
    return heuristicOnly();
  }
}

/* ── From the live queue to a problem ───────────────────────────────────── */

export interface ScheduleContext {
  tasks: readonly LiveTask[];
  causeFor: (panelId: string) => CauseId;
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
    const hours = REPAIR_HOURS[ctx.causeFor(t.panelId)];
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
