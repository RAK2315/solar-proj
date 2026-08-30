/**
 * Three causes, told apart by different evidence, leading somewhere different.
 *
 * This is what makes "triage" an honest word for what the product does, so the
 * assertions here are about DISCRIMINATION rather than about output: that dirt
 * and damage are distinguished by the shape of the loss, that geometry rules
 * shading in and out by the sun's height, and — the one that matters most — that
 * a soiled array does NOT get a drone. An agent that always dispatches has not
 * decided anything.
 */

import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

import {
  ROW_PITCH_M, diagnose, shadingLimitDeg, shadingPossibleAt, solarElevationDeg,
} from './causes';
import { farm } from './data';
import { G_REF, irradianceAt } from './physics';
import { scenario } from './live';

/** The site's own peak irradiance across the forecast day. */
const PEAK = Math.max(...Array.from({ length: 24 }, (_, h) => irradianceAt(h)));

/** Read a source file, to assert what the module does NOT reach for. */
const io_read = (path: string): string => readFileSync(path, 'utf8');

/**
 * A healthy array's cell temperature at these conditions — the baseline a
 * thermal rise is measured against.
 */
const FLEET_MEDIAN_C = 62.8;

/** Instrument readings only. No scenario, no soiling value, no ground truth. */
const base = {
  hourOffset: 2,                    // near midday on the scenario's day
  peakIrradiance: PEAK,
  cellTempC: FLEET_MEDIAN_C,
  fleetMedianCellTempC: FLEET_MEDIAN_C,
};

describe('inter-row shading is a geometry question', () => {
  it('the limit falls where tilt and row pitch put it', () => {
    // 25 deg tilt, 8 m pitch, 1.6 m collector -> about 5.9 deg. A dawn-and-dusk
    // phenomenon, not a midday one, which is the whole reason it discriminates.
    const limit = shadingLimitDeg();
    expect(limit).toBeGreaterThan(3);
    expect(limit).toBeLessThan(10);
    expect(farm.tilt).toBe(25);
  });

  it('gets worse as rows are packed closer, which is the real trade-off', () => {
    expect(shadingLimitDeg(farm.tilt, ROW_PITCH_M / 2)).toBeGreaterThan(shadingLimitDeg());
  });

  it('cannot happen when the sun is high', () => {
    // The deduction that matters: at midday, geometry RULES SHADING OUT, so a
    // shortfall has to be dirt or damage.
    expect(solarElevationDeg(2, PEAK)).toBeGreaterThan(shadingLimitDeg());
    expect(shadingPossibleAt(2, PEAK)).toBe(false);
  });

  it('is not claimed in the dark either', () => {
    // Zero irradiance is night, not a low sun. Nothing is shading anything.
    expect(shadingPossibleAt(12, PEAK)).toBe(false);
  });

  it('reads elevation off the same sun the rest of the product uses', () => {
    // A second ephemeris would be a second answer to "how high is the sun".
    expect(solarElevationDeg(2, PEAK)).toBeGreaterThan(0);
    expect(solarElevationDeg(2, PEAK)).toBeLessThanOrEqual(90);
    expect(G_REF).toBeGreaterThan(0);
  });
});

describe('the diagnosis looks only at what an instrument reports', () => {
  it('never consults the committed soiling value', () => {
    // THE RULE THAT KEEPS THIS HONEST. `f_soil` is the answer, not the evidence.
    // A triage engine that reads ground truth is looking up, not triaging — so
    // the input type must not even offer it.
    const source = io_read('src/lib/causes.ts');
    expect(source).not.toMatch(/soilFor/);
    expect(source).not.toMatch(/eventFor/);
  });
});

describe('a healthy array', () => {
  it('is diagnosed as no fault, and nothing is scheduled', () => {
    const c = diagnose({ ...base, panelId: 'C-29', deviationPct: 0 });
    expect(c.id).toBe('none');
    expect(c.needsDrone).toBe(false);
    expect(c.ruledOut).toEqual([]);
  });
});

describe('an evenly-down, cool array — dirt, and the refusal', () => {
  // The soiling signature: every string down by the same amount, no thermal rise.
  const soiled = () => diagnose({
    ...base,
    panelId: 'A-08',
    deviationPct: -11.3,
    stringDeviationPct: undefined,   // per-string monitoring reports no outlier
    cellTempC: FLEET_MEDIAN_C,
  });

  it('is diagnosed as dirt, from the SHAPE of the loss', () => {
    expect(soiled().id).toBe('soiling');
    expect(soiled().says).toMatch(/down evenly/);
    expect(soiled().says).toMatch(/less power and less heat/);
  });

  it('DOES NOT get a drone, and says why not', () => {
    // The most credible moment in the product. An agent that always dispatches
    // has decided nothing; this one declines, with a reason and an alternative.
    expect(soiled().needsDrone).toBe(false);
    expect(soiled().action).toMatch(/wash crew/i);
    expect(soiled().action).toMatch(/Do not fly a drone/i);
  });

  it('rules out cell damage on the THERMAL evidence, not by assertion', () => {
    const reason = soiled().ruledOut.find((r) => r.cause === 'Cell damage')!;
    expect(reason.because).toMatch(/fleet median temperature/);
    // "would be hotter" became "would lift it": the reading is an ARRAY average,
    // so what a bypassed substring does is raise that average. Claiming to know
    // the string's own temperature was an overclaim the agent caught first.
    expect(reason.because).toMatch(/bypassed substring would lift it/);
  });

  it('rules out shading by the sun being high', () => {
    expect(soiled().ruledOut.find((r) => r.cause === 'Row shading')!.because)
      .toMatch(/above/);
  });
});

describe('a string outlier running hot — a localised fault', () => {
  // The crack signature: one string far below the array, and that string hot.
  const cracked = () => diagnose({
    ...base,
    panelId: 'B-17',
    deviationPct: -41.7,
    stringDeviationPct: -58.4,
    cellTempC: FLEET_MEDIAN_C + 2.8,
  });

  it('is diagnosed from the two signatures together', () => {
    expect(cracked().id).toBe('crack');
    expect(cracked().says).toMatch(/confined to one string/);
    expect(cracked().says).toMatch(/A bypassed substring dissipates/);
    // And it attributes the heat to the ARRAY, which is what was measured.
    expect(cracked().says).toMatch(/the array is running .* above the fleet median/);
    expect(cracked().says).not.toMatch(/that string is running/);
  });

  it('DOES get a drone, and the action says what imaging adds', () => {
    // Imaging is justified because it answers something telemetry cannot: WHICH
    // module. That is the whole reason the drone exists.
    expect(cracked().needsDrone).toBe(true);
    expect(cracked().action).toMatch(/find which module/);
  });

  it('rules out dirt on the SHAPE of the loss', () => {
    const reason = cracked().ruledOut.find((r) => r.cause === 'Soiling')!;
    expect(reason.because).toMatch(/derates a whole array evenly/);
    expect(reason.because).toMatch(/rest are at full output/);
  });

  it('reaches a DIFFERENT action from the soiled array', () => {
    // The entire point of the module. If these two ever converge, the product is
    // a detector again.
    const soiled = diagnose({ ...base, panelId: 'A-08', deviationPct: -11.3 });
    expect(cracked().action).not.toBe(soiled.action);
    expect(cracked().needsDrone).not.toBe(soiled.needsDrone);
  });
});

describe('signatures that disagree', () => {
  it('says the cause is not established rather than picking a story', () => {
    // An even loss that is nonetheless hot fits neither dirt nor a bypassed
    // substring. Guessing between them would be the model overreaching exactly
    // where it has least to go on.
    const c = diagnose({
      ...base, panelId: 'B-01', deviationPct: -20, cellTempC: FLEET_MEDIAN_C + 4,
    });
    expect(c.id).toBe('unexplained');
    expect(c.says).toMatch(/signatures do not agree/);
    expect(c.needsDrone).toBe(true);
    expect(c.action).toMatch(/Telemetry has been exhausted/);
  });

  it('and for a cold string outlier too', () => {
    const c = diagnose({
      ...base, panelId: 'B-01', deviationPct: -20, stringDeviationPct: -40,
      cellTempC: FLEET_MEDIAN_C,
    });
    expect(c.id).toBe('unexplained');
    expect(c.says).toMatch(/not running hot/);
  });
});

describe('the committed scenario still contains what these tests describe', () => {
  it('A-08 is soiled and carries no mechanism', () => {
    expect(scenario.soiling.some((x) => x.panelId === 'A-08')).toBe(true);
    expect(scenario.events.some((e) => e.panelId === 'A-08')).toBe(false);
  });

  it('B-17 carries a mechanism', () => {
    expect(scenario.events.some((e) => e.panelId === 'B-17')).toBe(true);
  });
});
