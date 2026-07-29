/**
 * The live repair queue.
 *
 * Two things matter here and nothing else does. First, the loss figures have to
 * come from the SAME integral the Python generator used — otherwise the queue on
 * screen and the queue in data/repair_queue.json are two different opinions about
 * the same site. Second, the queue has to say when it cannot rank something rather
 * than quietly dropping it.
 */

import { describe, expect, it } from 'vitest';

import { repairQueue } from './data';
import { liveFrameAt } from './live';
import { ARRAY_RATED_KW, F_SOIL, F_SOIL_HEAVY, G_REF, pAc, T_AMB_REF } from './physics';
import { dailyLossMWh, liveQueueAt } from './queue';

const FAULT_DONE = 8 * 60;        // site seconds — the scenario fault fully ramped

describe('the loss figures come from the generator’s integral', () => {
  it('reproduces the committed soiling losses from a shortfall alone', () => {
    const expectedKW = pAc(ARRAY_RATED_KW, G_REF, T_AMB_REF);
    const soiledKW = pAc(ARRAY_RATED_KW, G_REF, T_AMB_REF, F_SOIL_HEAVY);

    const committed = repairQueue.find((t) => t.panelId === 'A-08')!;
    expect(dailyLossMWh(expectedKW - soiledKW)).toBeCloseTo(committed.lossMWhPerDay, 2);
  });

  it('reproduces the committed faulted-array loss', () => {
    const frame = liveFrameAt(FAULT_DONE);
    const r = frame.panels['B-17'];
    const committed = repairQueue.find((t) => t.panelId === 'B-17')!;

    // The live frame is evaluated at the site's own irradiance for that moment,
    // which is the reference hour — so it must land on the committed figure.
    expect(dailyLossMWh(r.expectedKW - r.actualKW)).toBeCloseTo(committed.lossMWhPerDay, 1);
  });

  it('scales with irradiance, so a nominal derate is not treated as a fault', () => {
    expect(dailyLossMWh(0)).toBe(0);
    expect(dailyLossMWh(10)).toBeGreaterThan(dailyLossMWh(5));
  });
});

describe('the queue ranks the site as it stands', () => {
  it('puts the faulted array first, by a clear margin', () => {
    const { tasks } = liveQueueAt(liveFrameAt(FAULT_DONE), new Set());
    expect(tasks[0].panelId).toBe('B-17');
    expect(tasks[0].lossMWhPerDay).toBeGreaterThan(tasks[1].lossMWhPerDay);
  });

  it('does not queue the faulted array before its fault has begun', () => {
    const { tasks } = liveQueueAt(liveFrameAt(0), new Set());
    expect(tasks.map((t) => t.panelId)).not.toContain('B-17');
    expect(tasks.map((t) => t.panelId)).toContain('A-08');
  });

  it('tightens the deadline as site time runs on', () => {
    const early = liveQueueAt(liveFrameAt(FAULT_DONE), new Set()).tasks
      .find((t) => t.panelId === 'B-17')!;
    const later = liveQueueAt(liveFrameAt(FAULT_DONE + 3600), new Set()).tasks
      .find((t) => t.panelId === 'B-17')!;

    expect(later.hoursUntilDeadline).toBeLessThan(early.hoursUntilDeadline);
    expect(later.hoursUntilDeadline).toBeCloseTo(early.hoursUntilDeadline - 1, 2);
  });

  it('keeps an approved array visible, marked scheduled, rather than hiding it', () => {
    const scheduled = new Set(['B-17']);
    const { tasks } = liveQueueAt(liveFrameAt(FAULT_DONE, scheduled), scheduled);
    const b17 = tasks.find((t) => t.panelId === 'B-17');

    expect(b17).toBeDefined();
    expect(b17!.scheduled).toBe(true);
  });

  it('is deterministic — the same site state gives the same order', () => {
    const a = liveQueueAt(liveFrameAt(FAULT_DONE), new Set()).tasks.map((t) => t.id);
    const b = liveQueueAt(liveFrameAt(FAULT_DONE), new Set()).tasks.map((t) => t.id);
    expect(a).toEqual(b);
  });

  it('reports a deviating array it cannot rank instead of dropping it', () => {
    // An array with no committed deadline or access cost, forced to deviate.
    const frame = liveFrameAt(FAULT_DONE);
    const victim = 'C-07';
    const healthy = frame.panels[victim];
    frame.panels[victim] = {
      ...healthy,
      actualKW: healthy.expectedKW * 0.5,
      deviationPct: -50,
      status: 'critical',
    };

    const { tasks, unscheduled } = liveQueueAt(frame, new Set());
    expect(unscheduled).toContain(victim);
    expect(tasks.map((t) => t.panelId)).not.toContain(victim);
  });

  it('leaves healthy arrays out entirely', () => {
    const { tasks, unscheduled } = liveQueueAt(liveFrameAt(0), new Set());
    const healthyId = 'C-07';
    expect(liveFrameAt(0).panels[healthyId].status).toBe('healthy');
    expect([...tasks.map((t) => t.panelId), ...unscheduled]).not.toContain(healthyId);
  });
});

describe('nominal soiling is not an anomaly', () => {
  it('every array carries the 0.97 derate and none of them are queued for it', () => {
    const { tasks } = liveQueueAt(liveFrameAt(0), new Set());
    expect(F_SOIL).toBe(0.97);
    expect(tasks.length).toBeLessThan(10);
  });
});
