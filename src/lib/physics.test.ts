/**
 * THE GOLDEN TEST — the TypeScript physics must reproduce the Python physics.
 *
 * src/lib/physics.ts exists so the browser can evaluate any array at any conditions,
 * which a live console needs and 91 frozen frames cannot give. That is only
 * legitimate if the port agrees with `scripts/physics.py` EXACTLY. Otherwise it is
 * not a mirror, it is a second opinion — and a second opinion about the numbers is
 * precisely what this project is built to prevent.
 *
 * So this recomputes the committed telemetry.json from the TypeScript and fails on
 * any divergence. `telemetry.json` is the Python's output, generated and committed;
 * it is the oracle here.
 */

import { describe, expect, it } from 'vitest';

import { farm, forecast, telemetry } from './data';
import {
  type PanelStatusValue,
  ARRAY_RATED_KW, CELL_TEMP_REF_C, DEV_ARRAY_PCT, DEV_STRING_PCT, EXPECTED_STRING_KW,
  F_SOIL, FORECAST_HOURS, PARK_NAMEPLATE_MW, ambientAt, cellTemp, derate,
  evaluateArray, fleetHealth, irradianceAt, pAc, parkOutputMW, soilFor, statusFor,
} from './physics';

const FAULT_START = 6;
const FAULT_END = 9;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const faultProgress = (t: number) => clamp01((t - FAULT_START) / (FAULT_END - FAULT_START));

describe('the reference figures match the frozen contract', () => {
  it('reproduces the physics chain in docs/contract-freeze.md §4', () => {
    expect(cellTemp(35, 890)).toBeCloseTo(62.8125, 6);
    expect(derate()).toBeCloseTo(0.727669, 6);
    expect(EXPECTED_STRING_KW).toBeCloseTo(36.0996, 3);
    expect(DEV_STRING_PCT).toBeCloseTo(-58.4, 6);
    expect(DEV_ARRAY_PCT).toBeCloseTo(-41.714286, 5);
    expect(ARRAY_RATED_KW).toBeCloseTo(347.27, 6);
    expect(PARK_NAMEPLATE_MW * derate()).toBeCloseTo(363.8343, 3);
    expect(CELL_TEMP_REF_C).toBeCloseTo(62.8125, 6);
  });
});

describe('every committed telemetry frame is reproducible from the TS model', () => {
  const panels = farm.zones.flatMap((z) => z.panels);
  const b17 = 'B-17';

  it('has an oracle to check against', () => {
    expect(telemetry).toHaveLength(91);
  });

  it('reproduces B-17 across the whole fault ramp, frame by frame', () => {
    for (const frame of telemetry) {
      const want = frame.panels[b17];
      const got = evaluateArray(frame.irradiance, frame.ambientC, {
        faultProgress: faultProgress(frame.t),
        fSoil: soilFor(b17),
      });

      expect(got.actualKW, `actual at t=${frame.t}`).toBeCloseTo(want.actualKW, 1);
      expect(got.expectedKW, `expected at t=${frame.t}`).toBeCloseTo(want.expectedKW, 1);
      expect(got.deviationPct, `deviation at t=${frame.t}`).toBeCloseTo(want.deviationPct, 1);
      expect(got.status, `status at t=${frame.t}`).toBe(want.status);
      expect(got.cellTempC, `cell temp at t=${frame.t}`).toBeCloseTo(want.cellTempC, 1);
      if (want.stringDeviationPct !== undefined && frame.t > FAULT_START) {
        expect(got.stringDeviationPct!, `string dev at t=${frame.t}`)
          .toBeCloseTo(want.stringDeviationPct, 1);
      }
    }
  });

  it('reproduces every OTHER array too, at the demo frame', () => {
    const frame = telemetry[12];
    for (const p of panels) {
      if (p.id === b17) continue;
      const want = frame.panels[p.id];
      const got = evaluateArray(frame.irradiance, frame.ambientC, { fSoil: soilFor(p.id) });
      expect(got.actualKW, `${p.id} actual`).toBeCloseTo(want.actualKW, 1);
      expect(got.deviationPct, `${p.id} deviation`).toBeCloseTo(want.deviationPct, 1);
      expect(got.status, `${p.id} status`).toBe(want.status);
    }
  });

  it('reproduces the soiled arrays specifically — the ones that are not nominal', () => {
    const frame = telemetry[0];
    for (const id of ['A-08', 'C-31', 'A-22']) {
      const want = frame.panels[id];
      const got = evaluateArray(frame.irradiance, frame.ambientC, { fSoil: soilFor(id) });
      expect(got.deviationPct, `${id}`).toBeCloseTo(want.deviationPct, 1);
      expect(got.status, `${id} status`).toBe(want.status);
    }
  });

  it('reproduces farm output and fleet health at the demo frame', () => {
    const frame = telemetry[12];
    let shortfall = 0;
    const rollup: Array<{ terminalStatus: PanelStatusValue; progress: number }> = [];

    for (const p of panels) {
      const isFaulted = p.id === b17;
      const r = evaluateArray(frame.irradiance, frame.ambientC, {
        faultProgress: isFaulted ? faultProgress(frame.t) : 0,
        fSoil: soilFor(p.id),
      });
      shortfall += r.expectedKW - r.actualKW;
      rollup.push({
        terminalStatus: isFaulted ? 'critical' : statusFor(
          evaluateArray(frame.irradiance, frame.ambientC, { fSoil: soilFor(p.id) }).deviationPct,
        ),
        progress: isFaulted ? faultProgress(frame.t) : 1,
      });
    }

    expect(parkOutputMW(frame.irradiance, frame.ambientC, shortfall))
      .toBeCloseTo(frame.farmOutputMW, 1);
    expect(fleetHealth(rollup)).toBeCloseTo(frame.farmHealth, 1);
  });
});

describe('the forecast profiles match the committed forecast.json', () => {
  it('reproduces ambient and irradiance at every one of the 73 points', () => {
    for (const p of forecast.points) {
      expect(ambientAt(p.hourOffset), `ambient at +${p.hourOffset}h`)
        .toBeCloseTo(p.ambientC, 1);
      expect(irradianceAt(p.hourOffset), `irradiance at +${p.hourOffset}h`)
        .toBeCloseTo(p.irradiance, 0);
    }
  });

  it('reproduces the peak ambient the console displays', () => {
    const peak = Math.max(...Array.from({ length: FORECAST_HOURS + 1 }, (_, h) => ambientAt(h)));
    expect(peak).toBeCloseTo(forecast.peakAmbientC, 1);
  });

  it('is dark at night and bright at noon, which a solar model had better be', () => {
    expect(irradianceAt(14)).toBe(0);     // midnight
    expect(irradianceAt(2)).toBeGreaterThan(900);   // noon day 1
  });
});

describe('evaluateArray generalises beyond B-17 — the point of the port', () => {
  it('scales with irradiance', () => {
    const noon = evaluateArray(950, 35);
    const evening = evaluateArray(300, 30);
    expect(noon.actualKW).toBeGreaterThan(evening.actualKW * 2.5);
  });

  it('loses power as cells heat, per the temperature coefficient', () => {
    const cool = evaluateArray(890, 20);
    const hot = evaluateArray(890, 45);
    expect(hot.actualKW).toBeLessThan(cool.actualKW);
  });

  it('reports zero output and no NaN in darkness', () => {
    const night = evaluateArray(0, 24);
    expect(night.actualKW).toBe(0);
    expect(Number.isFinite(night.deviationPct)).toBe(true);
  });

  it('derives status from deviation rather than being told', () => {
    expect(evaluateArray(890, 35, { fSoil: F_SOIL }).status).toBe('healthy');
    expect(evaluateArray(890, 35, { fSoil: 0.86 }).status).toBe('warning');
    expect(evaluateArray(890, 35, { faultProgress: 1 }).status).toBe('critical');
  });

  it('honours a scheduled repair without changing the physics', () => {
    const live = evaluateArray(890, 35, { faultProgress: 1 });
    const scheduled = evaluateArray(890, 35, { faultProgress: 1, scheduled: true });
    expect(scheduled.status).toBe('scheduled');
    expect(scheduled.actualKW).toBeCloseTo(live.actualKW, 6);
  });
});

describe('pAc is the documented equation and nothing else', () => {
  it('is linear in nameplate', () => {
    expect(pAc(2, 890, 35)).toBeCloseTo(pAc(1, 890, 35) * 2, 9);
  });

  it('makes deviation exactly f_mismatch − 1, because everything else cancels', () => {
    const expected = pAc(10, 890, 35);
    const faulted = pAc(10, 890, 35, F_SOIL, 0.416);
    expect(((faulted - expected) / expected) * 100).toBeCloseTo(-58.4, 9);
  });
});
