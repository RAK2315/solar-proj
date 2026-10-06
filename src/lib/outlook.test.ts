import { describe, expect, it } from 'vitest';

import { HAZARD_SPEC, type HazardEvent } from './hazard';
import { scenario } from './live';
import { LOSS_CAUSES, outlook } from './outlook';
import { arrayCentre } from './scene';

const NONE = new Set<string>();

const dustOver = (panelId: string, startHour: number): HazardEvent => {
  const c = arrayCentre(panelId);
  return {
    kind: 'dust', id: 'hz-test', cx: c.x, cy: c.z, radius: HAZARD_SPEC.dust.radius,
    intensity: HAZARD_SPEC.dust.intensity, startHour, rampMinutes: 0, durationHours: null,
  };
};

describe('the outlook', () => {
  it('splits the whole shortfall by cause and loses none of it', () => {
    const { points } = outlook(NONE, [], [dustOver('C-12', scenario.epochHour + 1)]);
    for (const p of points) {
      const split = LOSS_CAUSES.reduce((sum, c) => sum + p.loss[c], 0);
      expect(split).toBeCloseTo(p.expectedKW - p.actualKW, 1);
    }
  });

  it('shows no fault loss before the first fault begins, and some after', () => {
    const { points } = outlook(NONE, [], []);
    const first = Math.min(...scenario.events.map((e) => e.startHour)) - scenario.epochHour;
    expect(points.filter((p) => p.hourOffset < first).every((p) => p.loss.fault === 0)).toBe(true);
    expect(points.some((p) => p.loss.fault > 0)).toBe(true);
  });

  it('attributes nothing to a hazard when none was dropped', () => {
    const { lostMWh, points } = outlook(NONE, [], []);
    expect(lostMWh.hazard).toBe(0);
    expect(points.every((p) => p.loss.hazard === 0)).toBe(true);
  });

  it('books a dust storm as hazard loss from the hour it lands', () => {
    const at = scenario.epochHour + 2;
    const { points, lostMWh, markers } = outlook(NONE, [], [dustOver('C-12', at)]);
    expect(points.filter((p) => p.hourOffset < 2).every((p) => p.loss.hazard === 0)).toBe(true);
    expect(lostMWh.hazard).toBeGreaterThan(0);
    expect(markers).toContainEqual({ hourOffset: 2, kind: 'hazard', label: 'dust' });
  });

  it('marks where every committed fault begins', () => {
    const { markers } = outlook(NONE, [], []);
    for (const e of scenario.events) {
      expect(markers.some((m) => m.kind === 'fault' && m.label === e.panelId)).toBe(true);
    }
  });

  it('is the same for the same inputs', () => {
    expect(outlook(NONE, [], [])).toEqual(outlook(NONE, [], []));
  });
});
