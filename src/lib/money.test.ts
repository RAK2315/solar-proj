import { describe, expect, it } from 'vitest';

import {
  BHADLA_PHASE_III_LOTS, TARIFF_ARITHMETIC, TARIFF_BASIS, TARIFF_INR_PER_KWH, TARIFF_SOURCE,
  formatINR, inrForMWh, lostRevenue, tariffText,
} from './money';

describe('the tariff', () => {
  it('is the two auction lots blended by capacity, not either lot alone', () => {
    // (200 x 2.44 + 300 x 2.45) / 500, worked by hand.
    expect(TARIFF_INR_PER_KWH).toBeCloseTo(2.446, 9);
    for (const lot of BHADLA_PHASE_III_LOTS) expect(TARIFF_INR_PER_KWH).not.toBeCloseTo(lot.inrPerKWh, 4);
  });

  it('covers the whole 500 MW block', () => {
    expect(BHADLA_PHASE_III_LOTS.reduce((sum, lot) => sum + lot.mw, 0)).toBe(500);
  });

  it('is printed to three decimals, where the blend is exact', () => {
    expect(tariffText()).toBe('₹2.446/kWh');
  });

  it('shows its own arithmetic', () => {
    expect(TARIFF_ARITHMETIC).toBe('(200 MW × ₹2.44 + 300 MW × ₹2.45) ÷ 500 MW = ₹2.446/kWh');
  });

  it('travels with its attribution', () => {
    expect(TARIFF_BASIS).toContain('₹2.446/kWh');
    expect(TARIFF_BASIS).toContain('SECI Bhadla Phase-III');
    expect(TARIFF_SOURCE.urls).toHaveLength(2);
    expect(TARIFF_SOURCE.checked).toBe('6 Oct 2026');
  });
});

describe('lost revenue', () => {
  it('is lost energy times the tariff', () => {
    expect(inrForMWh(1)).toBeCloseTo(2446, 6);
    expect(inrForMWh(0)).toBe(0);
  });

  it('groups rupees the Indian way', () => {
    expect(formatINR(999)).toBe('₹999');
    expect(formatINR(7509.22)).toBe('₹7,509');
    expect(formatINR(1234567)).toBe('₹12,34,567');
    expect(formatINR(-2500)).toBe('−₹2,500');
  });

  it('formats an energy quantity in one step', () => {
    expect(lostRevenue(2)).toBe('₹4,892');
  });
});
