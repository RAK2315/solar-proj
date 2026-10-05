/**
 * The seeded rehearsal. This replaces beats.test.tsx: where that pinned a recording
 * second by second, this pins the three things the pitch promises are reproducible.
 */

import { describe, expect, it } from 'vitest';

import { forecast } from './data';
import { liveFrameAt, scenario } from './live';
import { DEV_ARRAY_PCT } from './physics';
import { liveQueueAt } from './queue';
import { REHEARSAL_SEED } from './rehearsal';

function run() {
  const frame = liveFrameAt(REHEARSAL_SEED.siteSeconds, new Set(), REHEARSAL_SEED.injected);
  const queue = liveQueueAt(frame, new Set(), REHEARSAL_SEED.injected);
  return { frame, queue };
}

describe('the seeded rehearsal run', () => {
  it("reproduces B-17's array deviation from the model", () => {
    expect(run().frame.panels['B-17'].deviationPct).toBeCloseTo(DEV_ARRAY_PCT, 1);
    expect(run().frame.panels['B-17'].status).toBe('critical');
  });

  it('reproduces the computed deadline', () => {
    const task = run().queue.tasks.find((t) => t.panelId === 'B-17');
    expect(task).toBeDefined();
    const deadlineHour = scenario.epochHour + REHEARSAL_SEED.siteSeconds / 3600 + (task?.hoursUntilDeadline ?? 0);
    const [h, m] = forecast.actBefore.split(':').map(Number);
    expect(deadlineHour).toBeCloseTo(h + m / 60, 1);
  });

  it('reproduces the queue order, with B-17 first', () => {
    expect(run().queue.tasks.map((t) => t.panelId)).toEqual(['B-17', 'A-08', 'C-31']);
  });

  it('gives the same site on every run', () => {
    expect(run()).toEqual(run());
  });
});
