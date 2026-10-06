import { describe, expect, it } from 'vitest';

import { HAZARD_SPEC, type HazardEvent } from './hazard';
import { scenario } from './live';
import { FORECAST_BAND, LOSS_CAUSES, bandFractionAt, hazardCostMWh, outlook } from './outlook';
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

  it('widens its forecast band with lead time, from the declared start to the declared end', () => {
    expect(bandFractionAt(0)).toBeCloseTo(FORECAST_BAND.nowPct / 100, 12);
    expect(bandFractionAt(72)).toBeCloseTo(FORECAST_BAND.at72hPct / 100, 12);
    expect(bandFractionAt(36)).toBeGreaterThan(bandFractionAt(12));
    expect(bandFractionAt(500)).toBeCloseTo(FORECAST_BAND.at72hPct / 100, 12);
  });

  it('brackets every daylight sample, and the window\u2019s lost energy, with the band', () => {
    const { points, lostMWh, lostMWhLow, lostMWhHigh } = outlook(NONE, [], [], 72);
    const total = LOSS_CAUSES.reduce((sum, c) => sum + lostMWh[c], 0);
    expect(lostMWhLow).toBeLessThan(total);
    expect(lostMWhHigh).toBeGreaterThan(total);
    for (const p of points.filter((q) => q.expectedKW > 0)) {
      expect(p.low).toBeLessThan(1);
      expect(p.high).toBeGreaterThan(1);
    }
    // At night there is nothing to be uncertain about.
    for (const p of points.filter((q) => q.expectedKW === 0)) expect([p.low, p.high]).toEqual([1, 1]);
  });

  it('covers the whole 72 h the forecast does', () => {
    const { points, hours } = outlook(NONE, [], [], 72);
    expect(hours).toBe(72);
    expect(points[points.length - 1].hourOffset).toBe(72);
  });

  it('costs a hazard as the energy the site makes without it, less what it makes with it', () => {
    const base = outlook(NONE, [], [], 72, 2);
    const dust = hazardCostMWh(base, outlook(NONE, [], [dustOver('C-12', scenario.epochHour + 1)], 72, 2));
    expect(dust.mwh).toBeGreaterThan(0);
    expect(dust.low).toBeLessThan(dust.mwh);
    expect(dust.high).toBeGreaterThan(dust.mwh);

    const heat: HazardEvent = {
      kind: 'heatwave', id: 'hz-heat', intensity: HAZARD_SPEC.heatwave.intensity,
      startHour: scenario.epochHour, rampMinutes: 0, durationHours: null,
    };
    // A heatwave puts no array below the model, and still costs energy.
    const hot = outlook(NONE, [], [heat], 72, 2);
    expect(hot.lostMWh.hazard).toBe(0);
    expect(hazardCostMWh(base, hot).mwh).toBeGreaterThan(0);

    expect(hazardCostMWh(base, base).mwh).toBe(0);
  });

  it('is the same for the same inputs', () => {
    expect(outlook(NONE, [], [])).toEqual(outlook(NONE, [], []));
  });
});
