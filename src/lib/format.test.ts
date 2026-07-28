/**
 * Formatting is where the console either looks instrumented or looks mocked up.
 * The minus sign is the specific detail: at 12px monospace, U+2212 and a hyphen are
 * visibly different, and every negative number on screen goes through here.
 */

import { describe, expect, it } from 'vitest';

import { MINUS, deltaT, kW, pct, serviceDate, typographic } from './format';

describe('the minus sign is U+2212, never a hyphen', () => {
  it('signs deviations', () => {
    expect(pct(-58.4)).toBe(`${MINUS}58.4 %`);
    expect(pct(-58.4)).not.toContain('-');
  });

  it('signs power', () => {
    expect(kW(-1.5)).toBe(`${MINUS}1.50 kW`);
  });

  it('leaves positives alone', () => {
    expect(pct(0)).toBe('0.0 %');
    expect(pct(12.5)).toBe('12.5 %');
  });
});

describe('units are never dropped', () => {
  it('carries them on every metric', () => {
    expect(kW(15.0174)).toBe('15.02 kW');
    expect(pct(-41.7143)).toBe(`${MINUS}41.7 %`);
  });
});

describe('deltaT is always explicitly signed', () => {
  it('marks a rise with a plus, because +2.8 and 2.8 differ', () => {
    expect(deltaT(2.8)).toBe('+2.8 °C');
    expect(deltaT(-2.4)).toBe(`${MINUS}2.4 °C`);
    expect(deltaT(0)).toBe('+0.0 °C');
  });
});

describe('typographic() fixes glyphs in agent prose without touching content', () => {
  it('converts a leading hyphen-minus in front of a number', () => {
    expect(typographic('output is -58.4% below expected'))
      .toBe(`output is ${MINUS}58.4% below expected`);
  });

  it('handles a minus inside brackets', () => {
    expect(typographic('(-58.4% deviation)')).toBe(`(${MINUS}58.4% deviation)`);
  });

  it('LEAVES IDENTIFIERS ALONE — this is the one that would break the demo', () => {
    // B-17 is a name, not the number seventeen. Turning it into B−17 would be a
    // silent corruption of every component ID the agent mentions.
    expect(typographic('string B-17-S3 on INV-B, module B2-07'))
      .toBe('string B-17-S3 on INV-B, module B2-07');
    expect(typographic('ranked INC-B17 first')).toBe('ranked INC-B17 first');
  });

  it('changes no digit, word or unit', () => {
    const before = 'INV-B is delivering 15.02 kW versus an expected 36.10 kW';
    expect(typographic(before)).toBe(before);
  });
});

describe('service dates read like a maintenance log', () => {
  it('formats as day, month, year', () => {
    expect(serviceDate('2026-03-14')).toBe('14 MAR 2026');
  });
});
