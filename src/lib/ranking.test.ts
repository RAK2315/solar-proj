/**
 * The repair queue must rank identically on every run, forever.
 *
 * This is the file a judge is shown when they ask "how does it prioritise?", so
 * these tests are less about catching regressions than about being able to say
 * "it is deterministic" and then prove it in one command.
 */

import { describe, expect, it } from 'vitest';

import { repairQueue } from './data';
import { leadMargin, rankQueue, scoreBreakdown } from './ranking';
import { priorityScore, type RepairTask } from './types';

const task = (over: Partial<RepairTask> = {}): RepairTask => ({
  id: 'T', panelId: 'A-01', lossMWhPerDay: 0.2, severity: 'warning',
  hoursUntilDeadline: 24, accessCost: 1, ...over,
});

describe('priorityScore', () => {
  it('scales linearly with energy loss', () => {
    const a = priorityScore(task({ lossMWhPerDay: 0.2 }));
    const b = priorityScore(task({ lossMWhPerDay: 0.4 }));
    expect(b / a).toBeCloseTo(2, 10);
  });

  it('weights critical 2x a warning and 3x an active task', () => {
    const critical = priorityScore(task({ severity: 'critical' }));
    const warning = priorityScore(task({ severity: 'warning' }));
    const active = priorityScore(task({ severity: 'active' }));
    expect(critical / warning).toBeCloseTo(2, 10);
    expect(critical / active).toBeCloseTo(3, 10);
  });

  it('grows urgency hyperbolically, so a tight deadline dominates', () => {
    // 1 + 24/4 = 7 against 1 + 24/24 = 2. A 4-hour deadline is worth 3.5x a
    // 24-hour one, not the 6x a linear term would give.
    const tight = priorityScore(task({ hoursUntilDeadline: 4 }));
    const loose = priorityScore(task({ hoursUntilDeadline: 24 }));
    expect(tight / loose).toBeCloseTo(3.5, 10);
  });

  it('divides by access cost, so a hard-to-reach task ranks lower', () => {
    const near = priorityScore(task({ accessCost: 1 }));
    const far = priorityScore(task({ accessCost: 1.4 }));
    expect(far).toBeLessThan(near);
    expect(near / far).toBeCloseTo(1.4, 10);
  });

  it('never divides by zero on an overdue task', () => {
    expect(Number.isFinite(priorityScore(task({ hoursUntilDeadline: 0.001 })))).toBe(true);
  });
});

describe('rankQueue', () => {
  it('does not mutate its input', () => {
    const input = [task({ id: 'A' }), task({ id: 'B', lossMWhPerDay: 9 })];
    const before = input.map((t) => t.id);
    rankQueue(input);
    expect(input.map((t) => t.id)).toEqual(before);
  });

  it('is stable across repeated calls — the whole point', () => {
    const once = rankQueue(repairQueue).map((t) => t.id);
    for (let i = 0; i < 50; i += 1) {
      expect(rankQueue(repairQueue).map((t) => t.id)).toEqual(once);
    }
  });
});

describe('the committed queue', () => {
  const ranked = rankQueue(repairQueue);

  it('puts INC-B17 first', () => {
    expect(ranked[0].id).toBe('INC-B17');
  });

  it('leads #2 by far more than the 1.5x invariant I13 demands', () => {
    expect(leadMargin(ranked)).toBeGreaterThan(1.5);
    expect(leadMargin(ranked)).toBeCloseTo(26.7, 0);
  });

  it('wins on all three factors, so the REASON is visible in the inputs', () => {
    const b17 = scoreBreakdown(ranked[0]);
    const second = scoreBreakdown(ranked[1]);
    expect(b17.loss).toBeGreaterThan(second.loss);          // most energy bleeding
    expect(b17.severity).toBeGreaterThan(second.severity);  // critical, not warning
    expect(b17.urgency).toBeGreaterThan(second.urgency);    // tightest deadline
  });

  it('orders the remaining three by score, descending', () => {
    const scores = ranked.map(priorityScore);
    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });
});
