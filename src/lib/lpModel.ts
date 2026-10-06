/**
 * src/lib/lpModel.ts — the crew schedule as a mixed-integer program, as text.
 *
 * Split from the solver wrapper on purpose (plan/rework/04-architecture.md §6):
 * building LP-format text is fiddly and deserves tests that need no WebAssembly.
 *
 * THE MODEL. Time is cut into slots of one hour. A binary variable says "this
 * job starts on this crew in this slot". The constraints are the site's rules,
 * one line each, which is the point of using a solver: a new rule is a new line,
 * not a rewritten heuristic.
 *
 *   once      a job is done at most once
 *   overlap   a crew is in one place at a time
 *   shift     a crew works at most its shift cap
 *   heat      no field work in a slot the heat rule closes   (pruned, see below)
 *   deadline  a job finished after its deadline is worth less (in the objective)
 *
 * The heat rule is enforced by never creating the variable: a start that would
 * run through a closed slot simply does not exist, which is both smaller and
 * impossible to get wrong in a constraint.
 *
 * The deadline is NOT a hard rule, and that is deliberate. B-17's deadline is
 * under four hours away and its repair takes four: a model that refused to plan
 * late work would drop the most valuable job on the site from the plan and say
 * nothing. A crew still goes. The plan marks it late, and scores it as late.
 */

export interface Job {
  id: string;
  panelId: string;
  /** What finishing this job is worth. The queue's own priority score. */
  pri: number;
  /** Whole slots of crew time: travel plus the work. */
  dur: number;
  /** The job should END by this slot. Past the horizon means no deadline in view. */
  deadline: number;
}

export interface Problem {
  jobs: readonly Job[];
  crews: number;
  /** Slots in the planning horizon. */
  slots: number;
  /** The most slots one crew may work. */
  shiftCap: number;
  /** Slots no field work may touch: the heat rule, and hours outside the shift. */
  closed: ReadonlySet<number>;
}

/** `crew` is -1 in the pooled model, where crews are not told apart. */
export interface StartVar { name: string; job: number; crew: number; start: number }

/**
 * How much of a job's worth is kept by starting it in a given slot. Sooner is
 * better, because every hour an array waits is energy not generated, but the
 * job itself matters far more than the hour: the last slot keeps nine tenths.
 */
export const EARLY_WEIGHT = 0.1;

/**
 * What a job is still worth when it finishes after its deadline. A declared
 * assumption: past the deadline the damage the deadline was about has happened,
 * and the repair recovers the energy but no longer prevents it.
 */
export const LATE_FACTOR = 0.5;

/** Does a job started in this slot finish by its deadline? */
export const onTime = (job: Job, start: number): boolean => start + job.dur <= job.deadline;

export const startValue = (job: Job, start: number, slots: number): number =>
  job.pri * (1 - (EARLY_WEIGHT * start) / Math.max(1, slots)) * (onTime(job, start) ? 1 : LATE_FACTOR);

/** The slots a job could start in: inside the horizon, and never touching a closed slot. */
export function feasibleStarts(job: Job, problem: Pick<Problem, 'slots' | 'closed'>): number[] {
  const out: number[] = [];
  if (job.dur <= 0) return out;
  const last = problem.slots - job.dur;
  for (let s = 0; s <= last; s += 1) {
    let open = true;
    for (let t = s; t < s + job.dur; t += 1) if (problem.closed.has(t)) { open = false; break; }
    if (open) out.push(s);
  }
  return out;
}

/** LP format wants short lines. A sum is broken after this many terms. */
const TERMS_PER_LINE = 6;

const sum = (terms: string[]): string => {
  const lines: string[] = [];
  for (let i = 0; i < terms.length; i += TERMS_PER_LINE) {
    lines.push(terms.slice(i, i + TERMS_PER_LINE).join(' + '));
  }
  return lines.join('\n   + ');
};

/** Coefficients are printed at fixed precision so the same problem is the same text. */
const coef = (v: number): string => v.toFixed(6);

const EMPTY = 'Maximize\n obj: 0 x0\nSubject To\n none: x0 <= 0\nBinary\n x0\nEnd\n';

const program = (problem: Problem, vars: StartVar[], rows: string[]): string => {
  const objective = vars.map((v) => `${coef(startValue(problem.jobs[v.job], v.start, problem.slots))} ${v.name}`);
  const names: string[] = [];
  for (let i = 0; i < vars.length; i += 12) names.push(` ${vars.slice(i, i + 12).map((v) => v.name).join(' ')}`);
  return ['Maximize', ` obj: ${sum(objective)}`, 'Subject To', ...rows, 'Binary', ...names, 'End', ''].join('\n');
};

/**
 * THE POOLED MODEL: the same day, with the crews not told apart.
 *
 * Crews are interchangeable, so most of the crew-by-crew model's work is proving
 * the same plan optimal under different names. This one only says how many crews
 * are busy in each slot, and how much crew time there is in total. It is a
 * relaxation in exactly one respect: it caps the crews' shifts together, not one
 * by one. So its answer is at least as good as the true optimum, and when its
 * jobs can be dealt out to crews without any one of them over its own shift, it
 * IS the true optimum. The scheduler checks that, and falls back to the exact
 * crew-by-crew model on the rare day it fails.
 *
 * Measured on a loose twelve-job day: 61 ms crew by crew.
 */
export function buildPooledModel(problem: Problem): { lp: string; vars: StartVar[] } {
  const vars: StartVar[] = [];
  problem.jobs.forEach((job, j) => {
    for (const start of feasibleStarts(job, problem)) vars.push({ name: `x${vars.length}`, job: j, crew: -1, start });
  });
  if (vars.length === 0) return { lp: EMPTY, vars };

  const rows: string[] = [];
  problem.jobs.forEach((_, j) => {
    const mine = vars.filter((v) => v.job === j).map((v) => v.name);
    if (mine.length > 1) rows.push(` once_${j}: ${sum(mine)} <= 1`);
  });
  for (let t = 0; t < problem.slots; t += 1) {
    const busy = vars
      .filter((v) => v.start <= t && t < v.start + problem.jobs[v.job].dur)
      .map((v) => v.name);
    if (busy.length > problem.crews) rows.push(` crews_${t}: ${sum(busy)} <= ${problem.crews}`);
  }
  rows.push(` hours: ${sum(vars.map((v) => `${problem.jobs[v.job].dur} ${v.name}`))} <= ${problem.crews * problem.shiftCap}`);

  return { lp: program(problem, vars, rows), vars };
}

export function buildModel(problem: Problem): { lp: string; vars: StartVar[] } {
  const vars: StartVar[] = [];
  problem.jobs.forEach((job, j) => {
    // CREWS ARE INTERCHANGEABLE, and a solver that does not know it proves the
    // same plan optimal once per way of naming them. So job 0 may only go on
    // crew 0, job 1 on crews 0 and 1, and so on. Any plan can be relabelled to
    // fit, by numbering the crews in order of the first job each one takes, so
    // nothing is lost. Measured: the slowest realistic day fell from 81 ms.
    const crews = Math.min(problem.crews, j + 1);
    for (const start of feasibleStarts(job, problem)) {
      for (let crew = 0; crew < crews; crew += 1) {
        vars.push({ name: `x${vars.length}`, job: j, crew, start });
      }
    }
  });

  // An empty model is still a valid program: nothing to plan, objective zero.
  if (vars.length === 0) return { lp: EMPTY, vars };

  const rows: string[] = [];

  problem.jobs.forEach((_, j) => {
    const mine = vars.filter((v) => v.job === j).map((v) => v.name);
    if (mine.length > 0) rows.push(` once_${j}: ${sum(mine)} <= 1`);
  });

  for (let crew = 0; crew < problem.crews; crew += 1) {
    const onCrew = vars.filter((v) => v.crew === crew);
    for (let t = 0; t < problem.slots; t += 1) {
      const busy = onCrew
        .filter((v) => v.start <= t && t < v.start + problem.jobs[v.job].dur)
        .map((v) => v.name);
      // A slot only one start could occupy cannot be double-booked.
      if (busy.length > 1) rows.push(` overlap_${crew}_${t}: ${sum(busy)} <= 1`);
    }
    if (onCrew.length > 0) {
      const load = onCrew.map((v) => `${problem.jobs[v.job].dur} ${v.name}`);
      rows.push(` shift_${crew}: ${sum(load)} <= ${problem.shiftCap}`);
    }
  }

  return { lp: program(problem, vars, rows), vars };
}
