import { describe, expect, it } from 'vitest';

import { DIODE_SERVICE_FROM_STRINGS, REPAIR_PART_HOURS, repairFor } from './repair';

describe('the repair an array needs', () => {
  it('washes a soiled array', () => {
    expect(repairFor('soiling')).toEqual({ parts: ['cleaning'], hours: REPAIR_PART_HOURS.cleaning });
  });

  it('replaces a cracked module', () => {
    expect(repairFor('crack', { faultedStrings: 2, terminalMismatch: 0.68 }).parts).toEqual(['module']);
  });

  it('services the bypass diodes too once the crack has taken most of the array', () => {
    const r = repairFor('crack', { faultedStrings: DIODE_SERVICE_FROM_STRINGS, terminalMismatch: 0.416 });
    expect(r.parts).toEqual(['module', 'diode']);
    expect(r.hours).toBe(REPAIR_PART_HOURS.module + REPAIR_PART_HOURS.diode);
  });

  it('reconnects an open string and replaces nothing', () => {
    expect(repairFor('crack', { faultedStrings: 1, terminalMismatch: 0 }).parts).toEqual(['string']);
  });

  it('sends nobody to a shadow or to a healthy array', () => {
    expect(repairFor('shading').hours).toBe(0);
    expect(repairFor('none').hours).toBe(0);
  });

  it('gives different kinds of repair different lengths', () => {
    const lengths = new Set([
      repairFor('soiling').hours, repairFor('crack', { faultedStrings: 2 }).hours,
      repairFor('crack', { faultedStrings: 6 }).hours, repairFor('crack', { terminalMismatch: 0 }).hours,
    ]);
    expect(lengths.size).toBe(4);
  });
});
