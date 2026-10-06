/**
 * src/lib/outlook.ts — the modelled arrays across the hours ahead: what they
 * should produce, what they will, and where the difference goes.
 *
 * A PREDICTION, not a recording. Every sample is the same whole-site evaluation
 * the console runs for the present moment, at a later site second, so the chart
 * cannot disagree with the readings beside it.
 *
 * The shortfall is split by CAUSE, read off the site record and never guessed
 * from the shape of the loss: a scenario fault is a fault, a hazard footprint is
 * weather or dust, and anything else below the model is soiling.
 */

import type { HazardEvent } from './hazard';
import { evaluateArray } from './physics';
import {
  allEvents, eventFor, faultProgressAt, liveFrameAt, scenario, type ScenarioEvent,
} from './live';

export type LossCause = 'fault' | 'soiling' | 'hazard';
export const LOSS_CAUSES: readonly LossCause[] = ['fault', 'soiling', 'hazard'];

export const LOSS_LABEL: Record<LossCause, string> = {
  fault: 'Cell mismatch and bypass diode',
  soiling: 'Soiling above nominal',
  hazard: 'Sandbox hazard footprint',
};

/**
 * How far the forecast may be out, as a band on irradiance that widens with how
 * far ahead it looks.
 *
 * A DECLARED ASSUMPTION, NOT A FITTED ERROR MODEL. The forecast this product runs
 * on is generated, so there is no record of its misses to fit one to. The band
 * says, in the open, how much room the figures downstream of it should be given,
 * and the screen labels it as an assumption wherever it is drawn.
 */
export const FORECAST_BAND = { nowPct: 5, at72hPct: 15, hours: 72 } as const;

/** Half-width of the band on irradiance at a lead time, as a fraction. */
export const bandFractionAt = (hourOffset: number): number => {
  const k = Math.max(0, Math.min(1, hourOffset / FORECAST_BAND.hours));
  return (FORECAST_BAND.nowPct + (FORECAST_BAND.at72hPct - FORECAST_BAND.nowPct) * k) / 100;
};

export interface OutlookPoint {
  hourOffset: number;
  /** The modelled arrays together, kW. */
  expectedKW: number;
  actualKW: number;
  /** Shortfall against the model by cause, kW. Sums to expected minus actual. */
  loss: Record<LossCause, number>;
  /**
   * What the low and high edges of the forecast band do to every power figure at
   * this sample, as multipliers. Irradiance is pushed through the same model, so
   * the band is not symmetric: a hotter cell gives a little of the gain back.
   */
  low: number;
  high: number;
}

export interface OutlookMarker {
  hourOffset: number;
  kind: 'fault' | 'hazard';
  /** An array id for a fault, the hazard's kind for a hazard. */
  label: string;
}

export interface Outlook {
  points: OutlookPoint[];
  markers: OutlookMarker[];
  /** Energy lost across the window by cause, MWh. */
  lostMWh: Record<LossCause, number>;
  /** All causes together at the low and high edges of the forecast band, MWh. */
  lostMWhLow: number;
  lostMWhHigh: number;
  expectedMWh: number;
  hours: number;
}

/**
 * Energy the modelled arrays produce across an outlook, MWh, at the forecast or
 * at one edge of its band.
 */
export function producedMWh(o: Outlook, edge?: 'low' | 'high'): number {
  const last = o.points.length - 1;
  const dtH = o.hours / last;
  return o.points.reduce((sum, p, i) => {
    const weight = i === 0 || i === last ? 0.5 : 1;
    return sum + (p.actualKW * (edge ? p[edge] : 1) * dtH * weight) / 1000;
  }, 0);
}

/**
 * What a set of hazards costs: the energy the site makes without them, less what
 * it makes with them, over the same window and the same faults.
 *
 * Taken on energy PRODUCED and not on shortfall against the model, because a
 * heatwave lowers what every array makes without one array falling short of a
 * model that has warmed up with it.
 */
export function hazardCostMWh(without: Outlook, withThem: Outlook): { mwh: number; low: number; high: number } {
  const at = (edge?: 'low' | 'high') => producedMWh(without, edge) - producedMWh(withThem, edge);
  return { mwh: at(), low: at('low'), high: at('high') };
}

/** Arrays below this are at the model, to rounding. */
const AT_MODEL_KW = 0.01;

export function outlook(
  scheduled: ReadonlySet<string>,
  injected: readonly ScenarioEvent[],
  hazards: readonly HazardEvent[],
  hours = 24,
  samplesPerHour = 4,
): Outlook {
  const n = hours * samplesPerHour;
  const dtH = 1 / samplesPerHour;
  const lostMWh: Record<LossCause, number> = { fault: 0, soiling: 0, hazard: 0 };
  let expectedMWh = 0;
  let lostMWhLow = 0;
  let lostMWhHigh = 0;

  const points = Array.from({ length: n + 1 }, (_, i): OutlookPoint => {
    const hourOffset = i * dtH;
    const siteSeconds = hourOffset * 3600;
    const frame = liveFrameAt(siteSeconds, scheduled, injected, hazards);
    const loss: Record<LossCause, number> = { fault: 0, soiling: 0, hazard: 0 };
    let expectedKW = 0;
    let actualKW = 0;

    for (const [id, r] of Object.entries(frame.panels)) {
      expectedKW += r.expectedKW;
      actualKW += r.actualKW;
      const short = r.expectedKW - r.actualKW;
      if (short <= AT_MODEL_KW) continue;
      const event = eventFor(id, injected);
      const cause: LossCause = event && faultProgressAt(event, siteSeconds) > 0 ? 'fault'
        : frame.affected[id] !== undefined ? 'hazard' : 'soiling';
      loss[cause] += short;
    }

    // Every derate in the model multiplies power, so scaling irradiance moves
    // expected, actual and each loss by the same ratio. It is taken from the
    // model, at this sample's own weather.
    const u = bandFractionAt(hourOffset);
    const at = (g: number) => evaluateArray(g, frame.ambientC).expectedKW;
    const base = at(frame.irradiance);
    const low = base > 0 ? at(frame.irradiance * (1 - u)) / base : 1;
    const high = base > 0 ? at(frame.irradiance * (1 + u)) / base : 1;

    // Trapezoid ends count half, so the window's energy is not overstated by a sample.
    const weight = i === 0 || i === n ? 0.5 : 1;
    let short = 0;
    for (const c of LOSS_CAUSES) {
      lostMWh[c] += (loss[c] * dtH * weight) / 1000;
      short += loss[c];
    }
    lostMWhLow += (short * low * dtH * weight) / 1000;
    lostMWhHigh += (short * high * dtH * weight) / 1000;
    expectedMWh += (expectedKW * dtH * weight) / 1000;

    return { hourOffset, expectedKW, actualKW, loss, low, high };
  });

  const markers: OutlookMarker[] = [];
  for (const e of allEvents(injected)) {
    const at = e.startHour - scenario.epochHour;
    if (at >= 0 && at <= hours) markers.push({ hourOffset: at, kind: 'fault', label: e.panelId });
  }
  for (const h of hazards) {
    const at = h.startHour - scenario.epochHour;
    if (at >= 0 && at <= hours) markers.push({ hourOffset: at, kind: 'hazard', label: h.kind });
  }
  markers.sort((a, b) => a.hourOffset - b.hourOffset);

  return { points, markers, lostMWh, lostMWhLow, lostMWhHigh, expectedMWh, hours };
}
