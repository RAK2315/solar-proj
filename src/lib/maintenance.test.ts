import { describe, expect, it } from 'vitest';
import { arrayCentre } from './scene';
import { liveFrameAt, scenario } from './live';
import { compareFutures, crewAvailability, crewHoursSpent, planRepair, repairPhase, repairProgress, servicesFor, withCrewReturn } from './maintenance';
import { HAZARD_SPEC, type HazardEvent } from './hazard';
import { SHIFT_CAP_HOURS } from './scheduler';

describe('maintenance on the shared site clock', () => {
  it('keeps approval separate from a completed intervention and rewinds the repair', () => {
    const run = planRepair('B-17', 1800, 1800, 'crack', [], [])!;
    expect(run).toBeTruthy();
    const approved = liveFrameAt(run.arrivedAt, new Set(['B-17']));
    const before = liveFrameAt(run.completedAt - 1, new Set(['B-17']), [], [], servicesFor([run]));
    const after = liveFrameAt(run.completedAt, new Set(['B-17']), [], [], servicesFor([run]));
    expect(approved.panels['B-17'].actualKW).toBeLessThan(approved.panels['B-17'].expectedKW);
    expect(before.panels['B-17'].status).toBe('scheduled');
    expect(after.panels['B-17'].actualKW).toBeCloseTo(after.panels['B-17'].expectedKW);
    expect(after.panels['B-17'].cellTempC).toBeLessThan(liveFrameAt(run.completedAt).panels['B-17'].cellTempC);
    expect(after.panels['B-18']).toEqual(liveFrameAt(run.completedAt).panels['B-18']);
    expect(repairPhase(run, run.arrivedAt - 1)).toBe('travelling');
    expect(repairPhase(run, run.completedAt)).toBe('verification');
    expect(repairProgress(run, run.arrivedAt)).toBe(0);
    expect(repairProgress(run, run.completedAt)).toBe(1);
    expect(repairPhase({ ...run, closedAt: run.completedAt + 100 }, run.completedAt)).toBe('verification');
  });

  it('reserves a free crew and waits for the shift after nightfall', () => {
    const first = planRepair('B-17', 0, 0, 'crack', [], [])!;
    const second = planRepair('C-07', 0, 0, 'crack', [], [], [first])!;
    const third = planRepair('A-08', 0, 0, 'soiling', [], [], [first, second])!;
    expect(second.crew).not.toBe(first.crew);
    expect(third.departedAt).toBeGreaterThanOrEqual(Math.min(first.completedAt, second.completedAt));
    const night = (22 - scenario.epochHour) * 3600;
    const run = planRepair('B-17', night, night, 'crack', [], [])!;
    expect(run.departedAt).toBeGreaterThan(night);
    expect(repairPhase(run, night)).toBe('waiting');
    expect(planRepair('B-17', 0, 0, 'unexplained', [], [])).toBeNull();
  });

  it('keeps a returning crew reserved and queues a third job until it reaches base', () => {
    const first = planRepair('B-17', 0, 0, 'crack', [], [])!;
    const second = planRepair('C-07', 0, 0, 'crack', [], [], [first])!;
    expect(crewAvailability([first, second], 0).available).toBe(0);
    expect(crewAvailability([first], first.completedAt).available).toBe(1);
    expect(crewAvailability([first], first.returnedAt!).available).toBe(2);
    const third = planRepair('A-08', 0, 0, 'soiling', [], [], [first, second])!;
    expect(third.departedAt).toBeGreaterThanOrEqual(Math.min(first.returnedAt!, second.returnedAt!));
    expect(first.returnedAt! - first.returnStartedAt!).toBe(first.arrivedAt - first.departedAt);
    expect(liveFrameAt(first.completedAt, new Set(), [], [], servicesFor([first])).panels['B-17'].status).toBe('healthy');
    const hours = (first.completedAt - first.arrivedAt + first.arrivedAt - first.departedAt) / 3600;
    expect(crewHoursSpent([first], first.completedAt)[first.crew]).toBeCloseTo(hours);
    expect(crewHoursSpent([first], first.returnedAt!)[first.crew]).toBeCloseTo(hours + (first.arrivedAt - first.departedAt) / 3600);
  });

  it('adds a safe return to a saved job without rewriting its approval, repair or closure', () => {
    const run = planRepair('B-17', 1800, 1800, 'crack', [], [])!;
    const saved = { ...run, returnStartedAt: undefined, returnedAt: undefined, verifiedAt: run.completedAt, closedAt: run.completedAt };
    const upgraded = withCrewReturn(saved, []);
    expect(upgraded.returnedAt).toBe(run.returnedAt);
    expect(upgraded.completedAt).toBe(saved.completedAt);
    expect(upgraded.orderAt).toBe(saved.orderAt);
    expect(upgraded.closedAt).toBe(saved.closedAt);
  });

  it('holds work for excessive heat and never simulates a repair outside its safe window', () => {
    const hazard: HazardEvent = { ...HAZARD_SPEC.heatwave, id: 'heat', kind: 'heatwave', startHour: scenario.epochHour,
      intensity: 30, rampMinutes: 0, durationHours: null };
    expect(planRepair('B-17', 0, 0, 'crack', [], [hazard])).toBeNull();
  });

  it('counts travel and earlier jobs against each crew’s daily capacity', () => {
    const first = planRepair('B-17', 0, 0, 'crack', [], [])!;
    const second = planRepair('C-07', 0, 0, 'crack', [], [], [first])!;
    const third = planRepair('A-31', 0, 0, 'crack', [{ ...scenario.events[0], panelId: 'A-31' }], [], [first, second])!;
    const work = [first, second, third].filter((r) => r.crew === third.crew).flatMap((r) => [{ start: r.departedAt, end: r.arrivedAt }, ...r.work, { start: r.returnStartedAt!, end: r.returnedAt! }]);
    const midnight = (24 - scenario.epochHour) * 3600;
    const today = work.reduce((sum, w) => sum + Math.max(0, Math.min(midnight, w.end) - Math.max(0, w.start)), 0);
    expect(today).toBeLessThanOrEqual(SHIFT_CAP_HOURS * 3600);
    expect(third.completedAt).toBeGreaterThan(midnight);
  });

  it('removes settled dust only on the washed array, preserving clouds and later dust', () => {
    const p = arrayCentre('A-08');
    const dust: HazardEvent = { ...HAZARD_SPEC.dust, id: 'dust', kind: 'dust', cx: p.x, cy: p.z, startHour: scenario.epochHour };
    const cloud: HazardEvent = { ...HAZARD_SPEC.cloud, id: 'cloud', kind: 'cloud', cx: p.x, cy: p.z, startHour: scenario.epochHour, durationHours: null };
    const service = [{ panelId: 'A-08', at: 2000, kind: 'cleaning' as const }];
    const clean = liveFrameAt(2200, new Set(), [], [dust], service);
    expect(clean.panels['A-08'].actualKW).toBeCloseTo(clean.panels['A-08'].expectedKW);
    expect(liveFrameAt(2200, new Set(), [], [dust, cloud], service).panels['A-08'].actualKW).toBeLessThan(clean.panels['A-08'].actualKW);
    expect(liveFrameAt(4000, new Set(), [], [{ ...dust, id: 'later', startHour: scenario.epochHour + 1 }], service).panels['A-08'].deviationPct).toBeLessThan(0);
    expect(clean.panels['A-09']).toEqual(liveFrameAt(2200, new Set(), [], [dust]).panels['A-09']);
  });
  it('does not let washing erase an electrical fault', () => {
    const washed = liveFrameAt(3000, new Set(), [], [], [{ panelId: 'B-17', at: 2000, kind: 'cleaning' }]);
    expect(washed.panels['B-17'].stringDeviationPct).toEqual(liveFrameAt(3000).panels['B-17'].stringDeviationPct);
    expect(washed.panels['B-17'].status).toBe('critical');
  });
});

describe('parallel forecast decisions', () => {
  it('uses identical weather, accumulates loss monotonically and charges only the sourced tariff', () => {
    const future = compareFutures('B-17', 1800, 24, 'crack', [], []);
    expect(future.later.lossMWh).toBeGreaterThan(future.soon.lossMWh);
    expect(future.later.run!.completedAt).toBeGreaterThan(future.soon.run!.completedAt);
    expect(future.later.crossesDeadline).toBe(true);
    expect(future.deadline).not.toBeNull();
    for (let i = 1; i < future.later.samples.length; i++) expect(future.later.samples[i].lossMWh).toBeGreaterThanOrEqual(future.later.samples[i - 1].lossMWh);
    const same = compareFutures('B-17', 1800, 0, 'crack', [], []);
    expect(same.soon).toEqual(same.later);
    expect(compareFutures('A-01', 1800, 24, 'none', [], []).soon.lossMWh).toBe(0);
  });
});
