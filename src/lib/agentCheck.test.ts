/**
 * The runtime cross-check, tested against the failure it exists to catch.
 *
 * The reference implementation's own agent output says "matching the client-reported
 * 60% output drop" while its telemetry says 58.4 %. Nothing caught it. That case is
 * the first test below, and it is the reason this file exists at all: once the model
 * is called at request time for any of 120 arrays, nobody is reading its output
 * before a user does.
 */

import { describe, expect, it } from 'vitest';

import {
  allowedNumbers, checkProse, checkTriage, proseNumbers, validateTriage,
  type TriageFacts,
} from './agentCheck';
import type { LiveTriageOutput } from './types';

const facts: TriageFacts = {
  panelId: 'B-17',
  zone: 'B',
  inverterId: 'INV-B',
  stringsPerArray: 7,
  lastServiced: '2026-03-14',
  clock: '10:04',
  ambientC: 35,
  irradiance: 890,
  windMs: 1.6,
  cloudPct: 0,
  actualKW: 147.29,
  expectedKW: 252.7,
  deviationPct: -41.71,
  stringDeviationPct: -58.4,
  cellTempC: 65.61,
  fleetMedianCellTempC: 62.81,
  peakAmbientC: 38.1,
  actBefore: '14:00',
};

const goodTriage: LiveTriageOutput = {
  severity: 'high',
  suspectComponent: 'String B-17-S3 on INV-B',
  reasoning: 'B-17 is 41.71% below expected, and string B-17-S3 shows −58.4%.',
  requiresPhysicalVerification: true,
  verificationRationale:
    'Heavy localised soiling and physical cell damage (a cracked cell driving its '
    + 'bypass diode into conduction) both produce this signature; only visual and '
    + 'thermal imaging can distinguish them.',
  confidence: 0.85,
};

describe('THE 60% CASE — the failure this file exists to catch', () => {
  it('rejects a fabricated figure that is close to a real one', () => {
    const fabricated: LiveTriageOutput = {
      ...goodTriage,
      reasoning:
        'INV-B is producing 15.02 kW against an expected 36.10 kW, matching the '
        + 'client-reported 60% output drop on one string.',
    };
    const result = validateTriage(fabricated, facts);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('60');
  });

  it('accepts the same sentence with the number the telemetry actually says', () => {
    const truthful: LiveTriageOutput = {
      ...goodTriage,
      reasoning: 'INV-B shows a 58.4% shortfall on one string.',
    };
    expect(validateTriage(truthful, facts).ok).toBe(true);
  });
});

describe('identifiers are names, not measurements', () => {
  it('does not read "17" out of B-17', () => {
    expect(proseNumbers('string B-17-S3 on INV-B, module B2-07')).toEqual([]);
  });

  it('does not read a clock time as a quantity', () => {
    expect(proseNumbers('act before 14:00')).toEqual([]);
  });

  it('does not read the bit depth as a quantity', () => {
    expect(proseNumbers('8-bit normalised imagery')).toEqual([]);
  });

  it('still reads a genuine measurement', () => {
    expect(proseNumbers('down 41.71% at 890 W/m²')).toEqual([41.71, 890]);
  });

  it('would be useless if it cried wolf — a clean response passes', () => {
    expect(checkProse(goodTriage, allowedNumbers(facts)).ok).toBe(true);
  });
});

describe('the allowed set is built from the facts, not hardcoded', () => {
  it('permits each fact at the precisions prose actually uses', () => {
    const allowed = allowedNumbers(facts);
    for (const n of [41.71, 41.7, 42, 58.4, 890, 35, 65.61, 65.6, 66, 38.1]) {
      expect(allowed.some((a) => Math.abs(a - n) < 0.005), `${n} should be allowed`).toBe(true);
    }
  });

  it('permits nothing invented', () => {
    const allowed = allowedNumbers(facts);
    for (const n of [60, 47, 1.44, 412, 0.84]) {
      expect(allowed.some((a) => Math.abs(a - n) < 0.005), `${n} should NOT be allowed`).toBe(false);
    }
  });

  it('moves with the array — another panel gets another set', () => {
    const other = allowedNumbers({ ...facts, deviationPct: -11.3, actualKW: 224.0 });
    expect(other.some((a) => Math.abs(a - 11.3) < 0.005)).toBe(true);
    expect(other.some((a) => Math.abs(a - 41.71) < 0.005)).toBe(false);
  });
});

describe('the load-bearing claim is required, not hoped for', () => {
  it('rejects a rationale that does not name soiling', () => {
    const r = checkTriage({
      ...goodTriage,
      verificationRationale: 'A cracked cell is likely; thermal imaging would confirm.',
    }, facts);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('soiling');
  });

  it('rejects a rationale that does not name physical damage', () => {
    const r = checkTriage({
      ...goodTriage,
      verificationRationale: 'Soiling is likely; a visual inspection would confirm.',
    }, facts);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('physical damage');
  });

  it('rejects a rationale that does not say imaging separates them', () => {
    const r = checkTriage({
      ...goodTriage,
      verificationRationale: 'Could be soiling or a cracked cell. Send someone.',
    }, facts);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('imaging');
  });

  it('rejects a refusal to require verification — the drone must be justified', () => {
    const r = checkTriage({ ...goodTriage, requiresPhysicalVerification: false }, facts);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('requiresPhysicalVerification');
  });
});

describe('the suspect must be a real component of THIS array', () => {
  it('accepts the array, its string, or its inverter', () => {
    for (const suspect of ['B-17', 'String B-17-S3', 'INV-B']) {
      expect(checkTriage({ ...goodTriage, suspectComponent: suspect }, facts).ok).toBe(true);
    }
  });

  it('rejects a component from a different array', () => {
    const r = checkTriage({ ...goodTriage, suspectComponent: 'INV-C' }, facts);
    expect(r.ok).toBe(false);
  });
});

describe('confidence is a probability', () => {
  it('rejects a rating out of ten', () => {
    const r = checkTriage({ ...goodTriage, confidence: 5 }, facts);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('probability');
  });
});

/**
 * WHETHER A DRONE FLIES IS DECIDED BY THE SHAPE OF THE LOSS, not its size.
 *
 * The check used to demand `requiresPhysicalVerification: true` for any array
 * materially below expectation. That is the rule you write when the site has one
 * fault type, and it is wrong the moment it has two: it made "book the wash crew
 * instead of flying" an answer the model was forbidden to give, which is the one
 * answer that proves the agent is deciding rather than reacting.
 */
describe('the drone is justified by the signature, not by the deviation', () => {
  /** Down evenly, at fleet temperature. Dirt. */
  const soiled: TriageFacts = {
    ...facts,
    panelId: 'A-08',
    inverterId: 'INV-A',
    zone: 'A',
    deviationPct: -11.3,
    stringDeviationPct: undefined,
    cellTempC: facts.fleetMedianCellTempC,
  };

  it('REFUSES a drone for the soiling signature, and says what to do instead', () => {
    const r = checkTriage(
      { ...goodTriage, suspectComponent: 'A-08', requiresPhysicalVerification: true },
      soiled,
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/down evenly/);
    expect(r.reason).toMatch(/should be cleaned/);
  });

  it('accepts the model declining to fly at a dirty array', () => {
    // The answer that used to be impossible to give.
    const r = checkTriage(
      { ...goodTriage, suspectComponent: 'A-08', requiresPhysicalVerification: false },
      soiled,
    );
    expect(r.ok).toBe(true);
  });

  it('still REQUIRES a drone for a hot, localised loss', () => {
    // B-17: one string far below the array, running 2.8 °C hot. Telemetry cannot
    // say which module, and only imaging can.
    const r = checkTriage({ ...goodTriage, requiresPhysicalVerification: false }, facts);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not the even, fleet-temperature signature/);
  });

  it('requires one when the signatures disagree, rather than guessing', () => {
    // Down evenly but running hot: fits neither dirt nor a bypassed substring.
    const contradictory: TriageFacts = {
      ...soiled, cellTempC: soiled.fleetMedianCellTempC + 4, deviationPct: -20,
    };
    const r = checkTriage(
      { ...goodTriage, suspectComponent: 'A-08', requiresPhysicalVerification: false },
      contradictory,
    );
    expect(r.ok).toBe(false);
  });

  it('still refuses one for an array inside tolerance', () => {
    const fine: TriageFacts = { ...facts, deviationPct: -0.2, stringDeviationPct: undefined };
    expect(checkTriage({ ...goodTriage, requiresPhysicalVerification: true }, fine).ok)
      .toBe(false);
  });
});
