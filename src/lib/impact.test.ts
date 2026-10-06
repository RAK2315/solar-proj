import { describe, expect, it } from 'vitest';

import { hazardImpact } from './impact';
import type { LiveQueue, LiveTask } from './queue';

const task = (panelId: string, hoursUntilDeadline = 10): LiveTask => ({
  id: `INC-${panelId.replace('-', '')}`, panelId, lossMWhPerDay: 1, severity: 'warning',
  hoursUntilDeadline, accessCost: 1, shortfallKW: 10, scheduled: false, injected: false, hazard: false,
});
const queue = (...tasks: LiveTask[]): LiveQueue => ({ tasks, unscheduled: [] });

describe('hazardImpact', () => {
  it('reports nothing moved when the two queues are the same', () => {
    const q = queue(task('B-17'), task('A-08'));
    expect(hazardImpact(q, q, 0)).toEqual({
      affected: 0, added: 0, displaced: 0, first: 'B-17', firstHeld: true, firstDeadlineShiftH: 0,
      outputDeltaMW: 0,
    });
  });

  it('counts a new job as added and the jobs it pushed down as displaced', () => {
    const base = queue(task('B-17'), task('A-08'), task('C-31'));
    const now = queue(task('B-17'), task('B-09'), task('A-08'), task('C-31'));
    const impact = hazardImpact(base, now, 7);
    expect(impact.added).toBe(1);
    expect(impact.displaced).toBe(2);
    expect(impact.affected).toBe(7);
    expect(impact.firstHeld).toBe(true);
  });

  it('says when the top job changed and how far its deadline moved', () => {
    const base = queue(task('A-08', 20), task('B-17', 4));
    const now = queue(task('B-17', 2.5), task('A-08', 20));
    const impact = hazardImpact(base, now, 120);
    expect(impact.first).toBe('B-17');
    expect(impact.firstHeld).toBe(false);
    expect(impact.firstDeadlineShiftH).toBeCloseTo(-1.5, 9);
  });

  it('handles an empty queue', () => {
    expect(hazardImpact(queue(), queue(), 0).first).toBeNull();
  });
});
