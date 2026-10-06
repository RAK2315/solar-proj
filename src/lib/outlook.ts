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

export interface OutlookPoint {
  hourOffset: number;
  /** The modelled arrays together, kW. */
  expectedKW: number;
  actualKW: number;
  /** Shortfall against the model by cause, kW. Sums to expected minus actual. */
  loss: Record<LossCause, number>;
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
  expectedMWh: number;
  hours: number;
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

    // Trapezoid ends count half, so the window's energy is not overstated by a sample.
    const weight = i === 0 || i === n ? 0.5 : 1;
    for (const c of LOSS_CAUSES) lostMWh[c] += (loss[c] * dtH * weight) / 1000;
    expectedMWh += (expectedKW * dtH * weight) / 1000;

    return { hourOffset, expectedKW, actualKW, loss };
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

  return { points, markers, lostMWh, expectedMWh, hours };
}
