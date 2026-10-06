// @vitest-environment node

/**
 * The scheduler, against the real solver.
 *
 * HiGHS runs under Node from the same package the browser loads, so the claims
 * the plan makes about it are tested here and not only in Chrome: it is
 * deterministic, it is never worse than the heuristic, and it is fast.
 */

import highsLoader from 'highs';
import { beforeAll, describe, expect, it } from 'vitest';

import { highsSolver } from './highsSolver';
import type { Job, Problem } from './lpModel';
import { repairFor } from './repair';
import {
  HEAT_WORK_LIMIT_C, HORIZON_SLOTS, SOLVE_BUDGET_MS, closedSlots, greedy, objectiveOf, problemFrom,
  problemKey, solve, type Solver,
} from './scheduler';
import type { LiveTask } from './queue';
import { scenario } from './live';

let highs: Solver;
beforeAll(async () => { highs = highsSolver(await highsLoader()); });

/**
 * What the exact model answers, with the clock taken out of it. A test runner
 * shares its cores with every other suite, so a solve that takes ten
 * milliseconds in a browser can take a hundred here; the tests of what the model
 * SAYS must not turn on that. The tests of the limit itself use the real budget.
 */
const UNTIMED = { budgetMs: 60_000 };
const exact = (p: Problem) => solve(p, highs, UNTIMED);

const job = (id: string, pri: number, dur: number, deadline = 99): Job => ({ id, panelId: id, pri, dur, deadline });
const problem = (jobs: Job[], over: Partial<Problem> = {}): Problem => ({
  jobs, crews: 2, slots: HORIZON_SLOTS, shiftCap: 8, closed: new Set(), ...over,
});

/** A day with no slack: two crews, a short shift, the afternoon closed by heat. */
const TIGHT = problem([
  job('a', 9, 3, 6), job('b', 8, 3, 7), job('c', 7, 2, 5), job('d', 6, 2, 12),
  job('e', 5, 4, 12), job('f', 4, 1, 4), job('g', 3, 2, 12), job('h', 2, 3, 12),
], { shiftCap: 5, closed: new Set([4, 5, 6, 7]) });

/** Checks a plan against every rule the model states, independently of the model. */
function violations(p: Problem, plan: ReturnType<typeof solve>): string[] {
  const out: string[] = [];
  const byId = new Map(p.jobs.map((j) => [j.id, j]));
  const seen = new Set<string>();
  const busy = Array.from({ length: p.crews }, () => new Set<number>());
  const load = Array.from({ length: p.crews }, () => 0);
  for (const a of plan.assignments) {
    const j = byId.get(a.jobId) as Job;
    if (seen.has(a.jobId)) out.push(`${a.jobId} planned twice`);
    seen.add(a.jobId);
    if (a.startSlot + j.dur > p.slots) out.push(`${a.jobId} runs past the horizon`);
    load[a.crew] += j.dur;
    for (let t = a.startSlot; t < a.startSlot + j.dur; t += 1) {
      if (p.closed.has(t)) out.push(`${a.jobId} works a closed slot`);
      if (busy[a.crew].has(t)) out.push(`crew ${a.crew} double-booked at ${t}`);
      busy[a.crew].add(t);
    }
  }
  load.forEach((l, c) => { if (l > p.shiftCap) out.push(`crew ${c} over its shift`); });
  return out;
}

describe('the heuristic', () => {
  it('breaks no rule', () => {
    expect(violations(TIGHT, solve(TIGHT, null))).toEqual([]);
  });

  it('takes the most valuable job first and gives it the earliest slot', () => {
    const plan = greedy(problem([job('low', 1, 2), job('high', 9, 2)]));
    expect(plan[0]).toEqual({ jobId: 'high', crew: 0, startSlot: 0 });
  });

  it('is the plan, marked as such, when there is no solver', () => {
    const plan = solve(TIGHT, null);
    expect(plan.optimal).toBe(false);
    expect(plan.objective).toBe(plan.baseline);
    expect(plan.assignments.length).toBeGreaterThan(0);
  });

  it('is the plan when the solver throws', () => {
    const broken: Solver = { solve: () => { throw new Error('wasm did not load'); } };
    expect(solve(TIGHT, broken).status).toBe('heuristic');
  });

  it('is the plan when the solver reports a failure', () => {
    const failing: Solver = { solve: () => ({ status: 'failed', values: {}, bound: null }) };
    const plan = solve(TIGHT, failing);
    expect(plan.status).toBe('heuristic');
    expect(plan.gapPct).toBeNull();
  });
});

describe('the exact solve', () => {
  it('breaks no rule', () => {
    expect(violations(TIGHT, exact(TIGHT))).toEqual([]);
  });

  it('is never worse than the heuristic, and is better when the day binds', () => {
    const plan = exact(TIGHT);
    expect(plan.optimal).toBe(true);
    expect(plan.objective).toBeGreaterThanOrEqual(plan.baseline - 1e-9);
    expect(plan.objective).toBeGreaterThan(plan.baseline);
  });

  it('ties with the heuristic when the day has slack', () => {
    const easy = problem([job('a', 9, 2), job('b', 5, 2)]);
    const plan = exact(easy);
    expect(plan.status).toBe('optimal');
    expect(plan.objective).toBeCloseTo(plan.baseline, 9);
  });

  it('is deterministic: the same problem gives the same plan, every time', () => {
    const first = exact(TIGHT);
    for (let i = 0; i < 10; i += 1) {
      const again = exact(TIGHT);
      expect(again.assignments).toEqual(first.assignments);
      expect(again.objective).toBe(first.objective);
    }
  });

  it('reports the same score the heuristic is scored by, not the solver’s own', () => {
    const plan = exact(TIGHT);
    expect(plan.objective).toBe(objectiveOf(plan.assignments, TIGHT));
  });

  /** Median of fifteen, after one to warm up, so a cold run does not decide. */
  const median = (p: Problem) => {
    solve(p, highs);
    return Array.from({ length: 15 }, () => solve(p, highs).solveMs).sort((a, b) => a - b)[7];
  };

  it('proves the day a dust storm makes optimal, well inside the budget when nothing else is running', () => {
    // What the site's queue looks like after the hero: two established cracks at
    // five slots, a hairline at four, two soiled arrays and eight dust washes at two.
    const day = problem([
      job('B-17', 22, 5, 4), job('A-31', 6, 4, 9), job('C-07', 9, 5, 11),
      job('A-08', 0.8, 2), job('C-31', 0.45, 2),
      ...Array.from({ length: 8 }, (_, i) => job(`dust${i}`, 0.7 - i * 0.02, 2)),
    ], { closed: new Set([5, 10, 11]) });
    expect(exact(day).status).toBe('optimal');
    // Timing under a shared test runner is a smoke test, not the measurement.
    // The measured figure is taken in Chrome and recorded in CLAUDE.md.
    const ms = Array.from({ length: 15 }, () => exact(day).solveMs).sort((a, b) => a - b)[7];
    expect(ms).toBeLessThan(250);
  });

  /** Two synthetic days larger and looser than the site's queue has produced.
      Untimed, each takes HiGHS several times the budget. */
  const STRESS = [
    problem(Array.from({ length: 12 }, (_, i) => job(`j${i}`, 20 - i * 0.7, 1 + (i % 3) + (i % 5 === 0 ? 1 : 0), 6 + (i % 7))), { closed: new Set([5]) }),
    problem(Array.from({ length: 20 }, (_, i) => job(`j${i}`, 20 - i * 0.7, 1 + (i % 3), 6 + (i % 7))), { crews: 3, shiftCap: 4, closed: new Set([3, 4, 5, 6, 7, 8]) }),
  ];

  it('never calls a plan optimal when the real solver is stopped short', () => {
    // A budget no machine can finish these days in, so the outcome does not turn
    // on how fast this one is. With the real budget a quick machine may finish.
    for (const day of STRESS) {
      const plan = solve(day, highs, { budgetMs: 1 });
      expect(plan.status).not.toBe('optimal');
      expect(plan.optimal).toBe(false);
      // Still a legal plan, and never worse than the heuristic's.
      expect(violations(day, plan)).toEqual([]);
      expect(plan.objective).toBeGreaterThanOrEqual(plan.baseline - 1e-9);
      if (plan.status === 'limit') expect(plan.gapPct as number).toBeGreaterThanOrEqual(0);
      else expect(plan.gapPct).toBeNull();
    }
  });

  it('keeps a stopped solve near its budget', () => {
    // The limit is checked by the solver between steps, and the model has to be
    // built and read back around it, so this allows for both and still fails on
    // an unbounded solve, which is what these days cost without the limit.
    for (const day of STRESS) expect(median(day)).toBeLessThan(SOLVE_BUDGET_MS * 3);
  });

  it('reports a gap from the solver\u2019s bound when it is stopped, and the heuristic\u2019s plan if that is the best in hand', () => {
    // A solver that ran out of time holding nothing feasible, but with a bound.
    const stopped: Solver = { solve: () => ({ status: 'limit', values: {}, bound: 40 }) };
    const plan = solve(TIGHT, stopped);
    expect(plan.status).toBe('limit');
    expect(plan.assignments).toEqual(solve(TIGHT, null).assignments);
    expect(plan.gapPct).toBeCloseTo(((40 - plan.baseline) / plan.baseline) * 100, 9);
  });

  it('gives the pooled model\u2019s answer only when it deals out to crews', () => {
    // Two four-slot jobs and a five-slot shift: the pooled model has ten crew
    // hours and would happily take both on paper, and each crew can take one.
    const p = problem([job('a', 9, 4), job('b', 8, 4), job('c', 7, 4)], { shiftCap: 5 });
    const plan = exact(p);
    expect(violations(p, plan)).toEqual([]);
    expect(plan.assignments).toHaveLength(2);
  });

  it('plans nothing, optimally, when the whole day is closed', () => {
    const shut = problem([job('a', 5, 2)], { closed: new Set(Array.from({ length: HORIZON_SLOTS }, (_, k) => k)) });
    const plan = exact(shut);
    expect(plan.assignments).toEqual([]);
    expect(plan.objective).toBe(0);
  });

  it('still sends a crew to a job that cannot finish in time, and scores it as late', () => {
    // B-17's shape: the most valuable job on the site, due before it can be done.
    const p = problem([job('late', 20, 4, 2), job('easy', 1, 2)]);
    const plan = exact(p);
    const late = plan.assignments.find((a) => a.jobId === 'late');
    expect(late).toBeDefined();
    expect(late?.startSlot).toBe(0);
    expect(plan.objective).toBeLessThan(20 + 1);
  });
});

describe('the problem, from the live queue', () => {
  const task = (panelId: string, over: Partial<LiveTask> = {}): LiveTask => ({
    id: `INC-${panelId.replace('-', '')}`, panelId, lossMWhPerDay: 1, severity: 'critical',
    hoursUntilDeadline: 6, accessCost: 1, shortfallKW: 100, scheduled: false, injected: false, hazard: false,
    ...over,
  });
  const ctx = (over = {}) => ({
    tasks: [task('B-17'), task('A-08', { severity: 'warning' as const, hoursUntilDeadline: 26 })],
    repairFor: (id: string) => (id === 'B-17' ? repairFor('crack', { faultedStrings: 5 }) : repairFor('soiling')),
    nowOffsetH: 0.2, epochHour: scenario.epochHour, ...over,
  });

  it('gives each job the crew time its cause needs', () => {
    const p = problemFrom(ctx());
    // Module and diodes, 4 h on site and half an hour to get there; a wash, 1 h and the same drive.
    expect(p.jobs.map((j) => [j.panelId, j.dur])).toEqual([['B-17', 5], ['A-08', 2]]);
  });

  it('leaves out an array with nothing to repair', () => {
    const p = problemFrom(ctx({ repairFor: () => repairFor('shading') }));
    expect(p.jobs).toEqual([]);
  });

  it('closes the hours outside the shift', () => {
    const { closed, heat } = closedSlots({ nowOffsetH: 9.5, epochHour: scenario.epochHour });
    // Slot 0 starts at 20:00, after the shift.
    expect(closed.has(0)).toBe(true);
    expect(heat.has(0)).toBe(false);
  });

  it('closes more of the day under a heatwave than without one', () => {
    const base = closedSlots({ nowOffsetH: 0, epochHour: scenario.epochHour });
    const hot = closedSlots({
      nowOffsetH: 0, epochHour: scenario.epochHour,
      hazards: [{ id: 'h', kind: 'heatwave', intensity: 5, startHour: scenario.epochHour, rampMinutes: 0, durationHours: null }],
    });
    expect(hot.heat.size).toBeGreaterThan(base.heat.size);
    expect(HEAT_WORK_LIMIT_C).toBeGreaterThan(30);
  });

  it('keys a problem by what the solver sees, so nothing is solved twice', () => {
    expect(problemKey(problemFrom(ctx()))).toBe(problemKey(problemFrom(ctx())));
    expect(problemKey(problemFrom(ctx()))).not.toBe(problemKey(problemFrom(ctx({ nowOffsetH: 3.2 }))));
  });
});
