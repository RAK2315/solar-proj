import { describe, expect, it } from 'vitest';

import {
  LATE_FACTOR, buildModel, buildPooledModel, feasibleStarts, onTime, startValue,
  type Job, type Problem,
} from './lpModel';

const job = (id: string, over: Partial<Job> = {}): Job => ({
  id, panelId: id, pri: 10, dur: 2, deadline: 12, ...over,
});
const problem = (jobs: Job[], over: Partial<Problem> = {}): Problem => ({
  jobs, crews: 2, slots: 8, shiftCap: 6, closed: new Set(), ...over,
});

describe('feasibleStarts', () => {
  it('offers every slot a job fits in before the horizon ends', () => {
    expect(feasibleStarts(job('a'), { slots: 8, closed: new Set() })).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('still offers a start that finishes late, because late work is still work', () => {
    expect(feasibleStarts(job('a', { deadline: 3 }), { slots: 8, closed: new Set() })).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(onTime(job('a', { deadline: 3 }), 1)).toBe(true);
    expect(onTime(job('a', { deadline: 3 }), 2)).toBe(false);
  });

  it('never runs a job through a closed slot', () => {
    expect(feasibleStarts(job('a'), { slots: 8, closed: new Set([3]) })).toEqual([0, 1, 4, 5, 6]);
  });

  it('offers nothing to a job with no work in it, or with nowhere open to do it', () => {
    expect(feasibleStarts(job('a', { dur: 0 }), { slots: 8, closed: new Set() })).toEqual([]);
    expect(feasibleStarts(job('a'), { slots: 4, closed: new Set([1, 2]) })).toEqual([]);
  });
});

describe('startValue', () => {
  it('is worth most at once and nine tenths in the last slot', () => {
    const j = job('a', { pri: 20 });
    expect(startValue(j, 0, 10)).toBe(20);
    expect(startValue(j, 10, 10)).toBeCloseTo(18, 9);
  });

  it('halves what a job is worth once it finishes after its deadline', () => {
    const j = job('a', { pri: 20, deadline: 3 });
    expect(startValue(j, 1, 10)).toBeCloseTo(20 * 0.99, 9);
    expect(startValue(j, 2, 10)).toBeCloseTo(20 * 0.98 * LATE_FACTOR, 9);
  });
});

describe('buildModel', () => {
  it('creates one variable per job, crew and feasible start', () => {
    const { vars } = buildModel(problem([job('a'), job('b', { dur: 4 })]));
    // The first job is pinned to the first crew: see the next test.
    expect(vars.filter((v) => v.job === 0)).toHaveLength(7 * 1);
    expect(vars.filter((v) => v.job === 1)).toHaveLength(5 * 2);
  });

  it('does not let the solver tell interchangeable crews apart', () => {
    const { vars } = buildModel(problem([job('a'), job('b'), job('c')], { crews: 3 }));
    const crewsOf = (j: number) => [...new Set(vars.filter((v) => v.job === j).map((v) => v.crew))];
    expect(crewsOf(0)).toEqual([0]);
    expect(crewsOf(1)).toEqual([0, 1]);
    expect(crewsOf(2)).toEqual([0, 1, 2]);
  });

  it('writes the pooled model with no crews in it at all', () => {
    const { lp, vars } = buildPooledModel(problem([job('a'), job('b'), job('c')], { crews: 2 }));
    expect(vars.every((v) => v.crew === -1)).toBe(true);
    expect(vars).toHaveLength(7 * 3);
    expect(lp).toMatch(/crews_1: [\s\S]*?<= 2/);
    expect(lp).toMatch(/hours: [\s\S]*?<= 12/);
    expect(lp).not.toContain('shift_');
  });

  it('writes a program with every section a solver needs, in order', () => {
    const { lp } = buildModel(problem([job('a'), job('b')]));
    const sections = ['Maximize', 'Subject To', 'Binary', 'End'].map((s) => lp.indexOf(s));
    expect(sections.every((i) => i >= 0)).toBe(true);
    expect([...sections].sort((a, b) => a - b)).toEqual(sections);
  });

  it('says each job is done at most once, and caps each crew’s shift', () => {
    const { lp } = buildModel(problem([job('a'), job('b')]));
    expect(lp).toMatch(/once_0: [^\n]+/);
    expect(lp).toMatch(/once_1: /);
    expect(lp).toMatch(/shift_0: [\s\S]*?<= 6/);
    expect(lp).toMatch(/shift_1: [\s\S]*?<= 6/);
  });

  it('forbids a crew from being in two places in one slot', () => {
    const { lp } = buildModel(problem([job('a'), job('b')]));
    expect(lp).toMatch(/overlap_0_1: /);
    expect(lp).toMatch(/overlap_1_1: /);
  });

  it('keeps every line short enough for the LP format', () => {
    const many = Array.from({ length: 12 }, (_, i) => job(`j${i}`, { pri: 1 + i }));
    const { lp } = buildModel(problem(many, { slots: 12 }));
    expect(Math.max(...lp.split('\n').map((l) => l.length))).toBeLessThan(200);
  });

  it('is the same text for the same problem, every time', () => {
    const p = problem([job('a', { pri: 3.14159 }), job('b', { pri: 2.71828 })], { closed: new Set([2, 5]) });
    expect(buildModel(p).lp).toBe(buildModel(p).lp);
  });

  it('still writes a valid program when nothing can be planned', () => {
    const { lp, vars } = buildModel(problem([job('a')], { closed: new Set([1, 3, 5, 7]) }));
    expect(vars).toHaveLength(0);
    expect(lp).toContain('Maximize');
    expect(lp).toContain('End');
  });
});
