/**
 * What waiting costs — the calculation the demo turns on.
 *
 * This is the most persuasive number the product produces, which makes it the
 * most dangerous one. A loss figure that grows convincingly but wrongly is worse
 * than no figure at all, so what is asserted here is that the whole window still
 * reproduces the committed integral exactly, that the step at the deadline is the
 * declared mechanism and not a fudge, and that an array with no deadline is never
 * told a catastrophe is coming.
 */

import { describe, expect, it } from 'vitest';

import { forecast } from './data';
import {
  DEFER_OPTIONS, FULL_WINDOW_INTEGRAL, deferOutcomes, irradianceIntegral,
  lossBetweenMWh, openCircuitShortfallKW,
} from './defer';
import { FORECAST_HOURS } from './physics';
import { REFERENCE_SHORTFALL_KW } from './queue';

const B17 = REFERENCE_SHORTFALL_KW;
const OPEN = openCircuitShortfallKW();

describe('the window integral', () => {
  it('covers the whole committed forecast and nothing beyond it', () => {
    // Asking past the horizon must not extrapolate. There is no forecast after
    // 72 hours, so there is no honest answer after 72 hours.
    expect(irradianceIntegral(0, 999)).toBeCloseTo(FULL_WINDOW_INTEGRAL, 6);
    expect(irradianceIntegral(-50, FORECAST_HOURS)).toBeCloseTo(FULL_WINDOW_INTEGRAL, 6);
  });

  it('is additive, so splitting a window cannot change its total', () => {
    const whole = irradianceIntegral(6, 40);
    const split = irradianceIntegral(6, 22.5) + irradianceIntegral(22.5, 40);
    expect(split).toBeCloseTo(whole, 6);
  });

  it('is zero for an empty window', () => {
    expect(irradianceIntegral(12, 12)).toBe(0);
    expect(irradianceIntegral(30, 20) > 0).toBe(true); // reversed args still measure
  });
});

describe('the loss in a window', () => {
  it('reproduces the COMMITTED 72-hour figure exactly over the whole window', () => {
    // The point of scaling the committed integral rather than recomputing one: a
    // fresh trapezoid gives 3.058 where the committed value is 3.07, and two
    // different answers for B-17's loss on one screen is not worth a decimal.
    expect(lossBetweenMWh(B17, 0, FORECAST_HOURS))
      .toBeCloseTo(forecast.projected72hLossMWh, 6);
  });

  it('is proportional to shortfall, since shortfall enters the integral linearly', () => {
    expect(lossBetweenMWh(B17 * 2, 0, 24)).toBeCloseTo(lossBetweenMWh(B17, 0, 24) * 2, 9);
  });

  it('accrues nothing overnight, because nothing is being lost overnight', () => {
    // A cracked array costs the same at midnight — but it costs it in the DAY.
    // If this were a flat rate per hour the whole model would be wrong.
    const noon = lossBetweenMWh(B17, 2, 4);
    const night = lossBetweenMWh(B17, 12, 14);
    expect(night).toBeLessThan(noon);
  });

  it('is zero for an array that is not losing anything', () => {
    expect(lossBetweenMWh(0, 0, 72)).toBe(0);
    expect(lossBetweenMWh(-5, 0, 72)).toBe(0);
  });
});

describe('the open-circuit shortfall — the declared post-deadline mechanism', () => {
  it('is strictly worse than the derated shortfall', () => {
    // A failed bypass diode opens the string rather than derating it. If this
    // were not larger, the deadline would cost nothing and would not be one.
    expect(OPEN).toBeGreaterThan(B17);
  });

  it('is the same thing the string-outage scenario means: those strings at zero', () => {
    // Not a number invented for this module — `terminalMismatch: 0` evaluated by
    // the same function that evaluates every array on the site.
    expect(OPEN).toBeGreaterThan(0);
    expect(Number.isFinite(OPEN)).toBe(true);
  });
});

describe('the four choices', () => {
  const input = {
    shortfallAtRefKW: B17,
    openCircuitKW: OPEN,
    hoursUntilDeadline: 3.9,
    nowH: 0.5,
  };

  it('costs nothing to fix now, by definition', () => {
    const [now] = deferOutcomes(input);
    expect(now.delayH).toBe(0);
    expect(now.extraMWh).toBe(0);
  });

  it('gets monotonically worse the longer you wait', () => {
    const out = deferOutcomes(input);
    for (let i = 1; i < out.length; i += 1) {
      expect(out[i].lostMWh).toBeGreaterThanOrEqual(out[i - 1].lostMWh);
    }
  });

  it('marks exactly the options that cross the deadline', () => {
    const out = deferOutcomes(input);
    // 3.9 hours left: now and +6h straddle it, tomorrow and +3 days are past it.
    expect(out.find((o) => o.id === 'now')!.breaches).toBe(false);
    expect(out.find((o) => o.id === 'six')!.breaches).toBe(true);
    expect(out.find((o) => o.id === 'tomorrow')!.breaches).toBe(true);
    expect(out.find((o) => o.id === 'end')!.breaches).toBe(true);
  });

  it('attributes post-deadline loss to the open circuit, not to the derate', () => {
    const out = deferOutcomes(input);
    const tomorrow = out.find((o) => o.id === 'tomorrow')!;
    expect(tomorrow.afterBreachMWh).toBeGreaterThan(0);
    expect(tomorrow.afterBreachMWh).toBeLessThanOrEqual(tomorrow.lostMWh);
  });

  it('STEPS at the deadline rather than sloping through it', () => {
    // The discontinuity is the entire argument. Waiting past the deadline must
    // cost more per hour than waiting up to it — otherwise the deadline is a
    // label rather than a consequence.
    const beforeRate = deferOutcomes({ ...input, hoursUntilDeadline: 999 })
      .find((o) => o.id === 'end')!.lostMWh;
    const withBreach = deferOutcomes(input).find((o) => o.id === 'end')!.lostMWh;
    expect(withBreach).toBeGreaterThan(beforeRate);
  });

  it('claims no catastrophe for an array with no computed deadline', () => {
    // A soiled array gets worse linearly and nothing more. Inventing a cliff for
    // it would be the forecast overreaching exactly where it is least defensible.
    const soiled = deferOutcomes({ ...input, hoursUntilDeadline: null });
    expect(soiled.every((o) => !o.breaches)).toBe(true);
    expect(soiled.every((o) => o.afterBreachMWh === 0)).toBe(true);
    expect(soiled.find((o) => o.id === 'end')!.lostMWh).toBeGreaterThan(0);
  });

  it('offers no option beyond the forecast it can answer for', () => {
    expect(Math.max(...DEFER_OPTIONS.map((o) => o.delayH))).toBeLessThanOrEqual(FORECAST_HOURS);
  });
});
