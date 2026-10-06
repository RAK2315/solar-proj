import { describe, expect, it } from 'vitest';

import {
  AFFECTED_THRESHOLD, HAZARD_SPEC, attenuationAt, crackDeadlineUnder, footprintWeight,
  hazardStrengthAt, hazardsAt, siteWeather, weatherFor, type Hazard, type HazardEvent,
} from './hazard';
import { scenario } from './live';
import { G_REF, T_AMB_REF, crackDeadlineHour } from './physics';
import { arrayCentre } from './scene';

const B17 = arrayCentre('B-17');
const EPOCH = scenario.epochHour;

const dustAt = (x: number, z: number, startHour = EPOCH): HazardEvent => ({
  id: 'hz-dust', kind: 'dust', cx: x, cy: z,
  radius: HAZARD_SPEC.dust.radius, intensity: HAZARD_SPEC.dust.intensity,
  startHour, rampMinutes: HAZARD_SPEC.dust.rampMinutes, durationHours: HAZARD_SPEC.dust.durationHours,
});
const cloudAt = (x: number, z: number, startHour = EPOCH): HazardEvent => ({
  id: 'hz-cloud', kind: 'cloud', cx: x, cy: z,
  radius: HAZARD_SPEC.cloud.radius, intensity: HAZARD_SPEC.cloud.intensity,
  startHour, rampMinutes: HAZARD_SPEC.cloud.rampMinutes, durationHours: HAZARD_SPEC.cloud.durationHours,
});
const heatwave = (startHour = EPOCH): HazardEvent => ({
  id: 'hz-heat', kind: 'heatwave', intensity: HAZARD_SPEC.heatwave.intensity,
  startHour, rampMinutes: HAZARD_SPEC.heatwave.rampMinutes, durationHours: null,
});

describe('weatherFor', () => {
  it('returns the base weather untouched when no hazard is in force', () => {
    expect(weatherFor({ id: 'B-17' }, G_REF, T_AMB_REF, [])).toEqual({ g: G_REF, tAmb: T_AMB_REF });
  });

  it('keeps the declared share of irradiance off an array at the centre of a dust footprint', () => {
    const dust: Hazard = { kind: 'dust', cx: B17.x, cy: B17.z, radius: 30, intensity: 0.14 };
    const w = weatherFor({ id: 'B-17' }, G_REF, T_AMB_REF, [dust]);
    expect(w.g).toBeCloseTo(G_REF * 0.86, 6);
    expect(w.tAmb).toBe(T_AMB_REF);
  });

  it('leaves an array outside the footprint alone', () => {
    const dust: Hazard = { kind: 'dust', cx: B17.x + 400, cy: B17.z, radius: 30, intensity: 0.14 };
    expect(weatherFor({ id: 'B-17' }, G_REF, T_AMB_REF, [dust]).g).toBe(G_REF);
  });

  it('applies a heatwave to every array and to nothing but ambient', () => {
    const heat: Hazard = { kind: 'heatwave', intensity: 5 };
    for (const id of ['A-01', 'B-17', 'C-40']) {
      expect(weatherFor({ id }, G_REF, T_AMB_REF, [heat])).toEqual({ g: G_REF, tAmb: T_AMB_REF + 5 });
    }
    expect(siteWeather(G_REF, T_AMB_REF, [heat])).toEqual({ g: G_REF, tAmb: T_AMB_REF + 5 });
  });

  it('multiplies two footprints through, so they never block more than everything', () => {
    const a: Hazard = { kind: 'cloud', cx: 0, cy: 0, radius: 40, intensity: 0.5 };
    const b: Hazard = { kind: 'dust', cx: 0, cy: 0, radius: 40, intensity: 0.2 };
    expect(attenuationAt(0, 0, [a, b])).toBeCloseTo(1 - 0.5 * 0.8, 9);
    expect(attenuationAt(0, 0, [a, b], 'dust')).toBeCloseTo(0.2, 9);
  });
});

describe('footprintWeight', () => {
  const h = { cx: 0, cy: 0, radius: 30 };
  it('is full strength across the inner half and nothing at the edge', () => {
    expect(footprintWeight(h, 0, 0)).toBe(1);
    expect(footprintWeight(h, 15, 0)).toBe(1);
    expect(footprintWeight(h, 30, 0)).toBe(0);
    expect(footprintWeight(h, 0, 45)).toBe(0);
  });
  it('falls monotonically between the two', () => {
    let last = 1;
    for (let d = 15; d <= 30; d += 1) {
      const w = footprintWeight(h, d, 0);
      expect(w).toBeLessThanOrEqual(last);
      last = w;
    }
  });
});

describe('a hazard is a function of the hour, so it rewinds', () => {
  it('has no effect before it was dropped', () => {
    const e = dustAt(B17.x, B17.z, EPOCH + 2);
    expect(hazardStrengthAt(e, EPOCH + 1.99)).toBe(0);
    expect(hazardsAt([e], EPOCH + 1)).toEqual([]);
  });

  it('ramps in across its declared window', () => {
    const e = dustAt(B17.x, B17.z, EPOCH);
    expect(hazardStrengthAt(e, EPOCH + 1.5 / 60)).toBeCloseTo(0.5, 9);
    expect(hazardStrengthAt(e, EPOCH + 1)).toBe(1);
  });

  it('lets a cloud pass and leaves dust where it fell', () => {
    const cloud = cloudAt(0, 0, EPOCH);
    const dust = dustAt(0, 0, EPOCH);
    const later = EPOCH + HAZARD_SPEC.cloud.durationHours + 0.5;
    expect(hazardStrengthAt(cloud, later)).toBe(0);
    expect(hazardStrengthAt(dust, later)).toBe(1);
  });

  it('gives the same answer at an hour whichever way the clock got there', () => {
    const events = [dustAt(B17.x, B17.z, EPOCH + 1), heatwave(EPOCH + 2)];
    const at = (h: number) => weatherFor({ id: 'B-17' }, G_REF, T_AMB_REF, hazardsAt(events, h));
    const forward = [EPOCH, EPOCH + 1.5, EPOCH + 3].map(at);
    const backward = [EPOCH + 3, EPOCH + 1.5, EPOCH].map(at).reverse();
    expect(backward).toEqual(forward);
    expect(forward[0]).toEqual({ g: G_REF, tAmb: T_AMB_REF });
  });
});

describe('crackDeadlineUnder', () => {
  it('equals the frozen physics deadline when no hazard is in force', () => {
    for (const start of [0, 0.07, 1.3, 2.7, 10, 30]) {
      expect(crackDeadlineUnder({ id: 'B-17' }, start, [], EPOCH)).toBe(crackDeadlineHour(start));
    }
  });

  // B-17's own deadline cannot move in: its fault starts at the hot end of the
  // morning and the budget is already spent in consecutive hours. A crack that
  // starts later in the day is where a heatwave bites.
  it('never moves a deadline later under a heatwave, and moves some of them in', () => {
    let moved = 0;
    for (let start = 0; start <= 30; start += 1) {
      const base = crackDeadlineHour(start) as number;
      const hot = crackDeadlineUnder({ id: 'B-17' }, start, [heatwave(EPOCH)], EPOCH) as number;
      expect(hot).toBeLessThanOrEqual(base);
      if (hot < base) moved += 1;
    }
    expect(moved).toBeGreaterThan(0);
  });

  it('never moves a deadline earlier under a cloud', () => {
    const base = crackDeadlineHour(0) as number;
    const shaded = crackDeadlineUnder({ id: 'B-17' }, 0, [cloudAt(B17.x, B17.z, EPOCH)], EPOCH) as number;
    expect(shaded).toBeGreaterThanOrEqual(base);
  });
});

describe('the declared presets', () => {
  it('put a dust core past the warning threshold and its edge below the affected one', () => {
    expect(HAZARD_SPEC.dust.intensity).toBeGreaterThan(0.08);
    expect(attenuationAt(HAZARD_SPEC.dust.radius, 0, [
      { kind: 'dust', cx: 0, cy: 0, radius: HAZARD_SPEC.dust.radius, intensity: HAZARD_SPEC.dust.intensity },
    ])).toBeLessThan(AFFECTED_THRESHOLD);
  });
});
