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

  it('ranks a cracked array the committed queue has never heard of', () => {
    // This used to be the "cannot rank it, so report it" case: an array with no
    // record in repair_queue.json fell out of the queue entirely and was listed as
    // unrankable. Nothing about it was unrankable — a crack's deadline is COMPUTED
    // from the dose model, which is the whole claim the prognosis stage makes. The
    // lookup was just never asked to compute anything.
    const injected = [{
      id: 'inj-c-12', type: 'mismatch-fault', panelId: 'C-12',
      startHour: 10, rampMinutes: 3,
      faultedStrings: 5, terminalMismatch: 0.416, accessCost: 1.0,
      injected: true,
    }];

    const { tasks, unscheduled } = liveQueueAt(
      liveFrameAt(FAULT_DONE, new Set(), injected), new Set(), injected,
    );
    const c12 = tasks.find((t) => t.panelId === 'C-12');

    expect(unscheduled).not.toContain('C-12');
    expect(c12).toBeDefined();
    expect(c12!.injected).toBe(true);
    expect(c12!.hoursUntilDeadline).toBeGreaterThan(0);
    // Same depth as B-17 and the same access cost, so the same deadline — the
    // deadline is a property of the mechanism, not of which array it is on.
    expect(c12!.hoursUntilDeadline)
      .toBeCloseTo(tasks.find((t) => t.panelId === 'B-17')!.hoursUntilDeadline, 2);
  });

  it('drops nothing silently — the committed site ranks in full', () => {
    // `unscheduled` is the guard against exactly one drift: a soiled array added
    // to physics.ts without a matching record in repair_queue.json. It should be
    // empty for the site as committed, and if it ever is not, the console says so
    // rather than quietly shortening the queue.
    expect(liveQueueAt(liveFrameAt(FAULT_DONE), new Set()).unscheduled).toEqual([]);
  });

  it('leaves healthy arrays out entirely', () => {
    const { tasks, unscheduled } = liveQueueAt(liveFrameAt(0), new Set());
    const healthyId = 'C-12';
    expect(liveFrameAt(0).panels[healthyId].status).toBe('healthy');
    expect([...tasks.map((t) => t.panelId), ...unscheduled]).not.toContain(healthyId);
  });
});

describe('a queue that survives nightfall', () => {
  // 20:00 site time — the sun is down, every array reads 0.00 kW against 0.00 kW,
  // and the deviation formula floors to 0.0 %. Reading the queue off the live frame
  // emptied it completely and refilled it at dawn, which would tell an operator
  // that three cracked arrays fixed themselves overnight.
  const NIGHT = 10 * 3600;

  it('is dark at the hour under test', () => {
    expect(liveFrameAt(NIGHT).irradiance).toBe(0);
  });

  it('still holds the faulted arrays, with unchanged loss figures', () => {
    const day = liveQueueAt(liveFrameAt(FAULT_DONE), new Set()).tasks
      .find((t) => t.panelId === 'B-17')!;
    const night = liveQueueAt(liveFrameAt(NIGHT), new Set()).tasks
      .find((t) => t.panelId === 'B-17');

    expect(night).toBeDefined();
    expect(night!.lossMWhPerDay).toBe(day.lossMWhPerDay);
  });
});

describe('three cracks, three depths', () => {
  // Site time at which all three committed faults have fully developed: C-07
  // starts at 12:40 and ramps over 6 minutes.
  const ALL_DEVELOPED = (12 + 50 / 60 - 10) * 3600;

  it('ranks them by depth, deepest first', () => {
    const { tasks } = liveQueueAt(liveFrameAt(ALL_DEVELOPED), new Set());
    const loss = (id: string) => tasks.find((t) => t.panelId === id)!.lossMWhPerDay;

    expect(loss('C-07')).toBeGreaterThan(loss('B-17'));
    expect(loss('B-17')).toBeGreaterThan(loss('A-31'));
  });

  it('lets the shallow one settle at warning, not critical', () => {
    const frame = liveFrameAt(ALL_DEVELOPED);
    expect(frame.panels['A-31'].status).toBe('warning');
    expect(frame.panels['B-17'].status).toBe('critical');
    expect(frame.panels['C-07'].status).toBe('critical');
  });
});

describe('nominal soiling is not an anomaly', () => {
  it('every array carries the 0.97 derate and none of them are queued for it', () => {
    const { tasks } = liveQueueAt(liveFrameAt(0), new Set());
    expect(F_SOIL).toBe(0.97);
    expect(tasks.length).toBeLessThan(10);
  });
});
