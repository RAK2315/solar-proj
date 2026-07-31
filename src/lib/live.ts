/**
 * src/lib/live.ts — the live site, evaluated at any moment.
 *
 * Where the demo replays 91 committed frames, this computes a frame from the model
 * for whatever site time it is asked about. Pure: given the same site time it
 * returns the same site, so live mode is reproducible and testable — the same
 * property `t` gave the demo, applied to wall time instead.
 *
 * Nothing here is random. Faults come from data/scenario.json, which is generated
 * and committed; soiling comes from the same committed site state the frozen
 * telemetry uses. Reload the page and you get the same site.
 */

import scenarioJson from '@data/scenario.json';

import { farm } from './data';
import {
  type ArrayReading, type PanelStatusValue, evaluateArray, fleetHealth,
  ambientAt, clockAt, irradianceAt, parkOutputMW, statusFor, G_REF, T_AMB_REF,
} from './physics';

export interface ScenarioEvent {
  id: string;
  type: string;
  panelId: string;
  startHour: number;
  rampMinutes: number;
  /** How many of the array's seven strings the fault reaches. */
  faultedStrings?: number;
  /** Mismatch derate on those strings once fully developed. */
  terminalMismatch?: number;
  /** Site fact: how far the truck drives. Used by the live queue's ranking. */
  accessCost?: number;
  moduleId?: string;
  stringId?: string;
  mechanism?: string;
  /**
   * Raised by an operator at runtime rather than read from the committed
   * scenario. Marked so the console can always say which of the two it is —
   * an injected fault is a rehearsal, and presenting it as site history would
   * be the same class of lie as showing B-17's evidence under another array.
   */
  injected?: boolean;
}

export const scenario = scenarioJson as {
  epochHour: number;
  defaultTimeScale: number;
  soiling: Array<{ panelId: string; fSoil: number }>;
  events: ScenarioEvent[];
};

const SOIL = new Map(scenario.soiling.map((s) => [s.panelId, s.fSoil]));

/** Every array on the site, in map order. */
export const allPanels = farm.zones.flatMap((z) => z.panels);

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Site hour-of-day for a session offset in site seconds. */
export const siteHour = (siteSeconds: number): number =>
  scenario.epochHour + siteSeconds / 3600;

/** Hours since the reference hour — what the forecast profiles are indexed by. */
export const forecastOffset = (siteSeconds: number): number => siteSeconds / 3600;

/**
 * How far a scheduled fault has developed at this moment: 0 before it starts,
 * ramping to 1 across its declared window. The same shape the Python generator
 * uses for the demo's t=6..9 ramp, so health animates rather than stepping.
 */
export function faultProgressAt(event: ScenarioEvent, siteSeconds: number): number {
  const startSeconds = (event.startHour - scenario.epochHour) * 3600;
  const rampSeconds = event.rampMinutes * 60;
  return clamp01((siteSeconds - startSeconds) / rampSeconds);
}

/**
 * The active fault on a given array, if any.
 *
 * `extra` carries faults an operator injected this session. They are merged
 * ahead of the committed schedule so an injection on an array that already
 * carries one wins — though the store refuses that case anyway, because two
 * simultaneous faults on one array is an operator mistake, not a scenario.
 */
export function eventFor(
  panelId: string,
  extra: readonly ScenarioEvent[] = [],
): ScenarioEvent | undefined {
  return extra.find((e) => e.panelId === panelId)
    ?? scenario.events.find((e) => e.panelId === panelId);
}

/** Every fault in force this session, committed and injected. */
export const allEvents = (extra: readonly ScenarioEvent[] = []): ScenarioEvent[] =>
  [...scenario.events, ...extra.filter(
    (e) => !scenario.events.some((c) => c.panelId === e.panelId),
  )];

export interface LiveFrame {
  siteSeconds: number;
  clock: string;
  ambientC: number;
  irradiance: number;
  windMs: number;
  cloudPct: number;
  farmOutputMW: number;
  farmHealth: number;
  panels: Record<string, ArrayReading>;
  anomalies: number;
  critical: number;
}

/**
 * The whole site at one moment.
 *
 * `scheduledIds` are arrays an operator has already approved work on — the one
 * piece of state that is genuinely the user's rather than the model's.
 */
export function liveFrameAt(
  siteSeconds: number,
  scheduledIds: ReadonlySet<string> = new Set(),
  injected: readonly ScenarioEvent[] = [],
): LiveFrame {
  const offset = forecastOffset(siteSeconds);
  const g = irradianceAt(offset);
  const tAmb = ambientAt(offset);

  const panels: Record<string, ArrayReading> = {};
  const rollup: Array<{ terminalStatus: PanelStatusValue; progress: number }> = [];
  let shortfall = 0;
  let anomalies = 0;
  let critical = 0;

  for (const p of allPanels) {
    const event = eventFor(p.id, injected);
    const progress = event ? faultProgressAt(event, siteSeconds) : 0;
    const fSoil = SOIL.get(p.id);

    const reading = evaluateArray(g, tAmb, {
      faultProgress: progress,
      faultedStrings: event?.faultedStrings,
      terminalMismatch: event?.terminalMismatch,
      fSoil,
      scheduled: scheduledIds.has(p.id),
    });

    panels[p.id] = reading;
    shortfall += reading.expectedKW - reading.actualKW;
    if (reading.status !== 'healthy') anomalies += 1;
    if (reading.status === 'critical') critical += 1;

    // Health is deducted against the TERMINAL status scaled by how far the fault has
    // developed, so the index is continuous rather than lurching when a deviation
    // crosses a display threshold.
    // Terminal status is the status the array will REACH — the fully developed
    // fault, evaluated. It used to be hardcoded to `critical` for any scenario
    // event, which was true while B-17 was the only one; a two-string hairline
    // ends at `warning` and deducting 14 health points for it would overstate
    // the site by a factor of four.
    // Terminal status is the status the array will REACH — the fully developed
    // fault, evaluated at REFERENCE conditions rather than at the current hour.
    //
    // Two bugs in one line before this. It was hardcoded to `critical` for any
    // scenario event, which was true while B-17 was the only one; a two-string
    // hairline ends at `warning` and deducting 14 health points for it overstates
    // the site fourfold. And evaluating at the current hour meant that after
    // sunset every array divides 0 by 0, reads 0.0 %, and the fleet index climbs
    // back to 100 with three cracked arrays on it. A fault is a property of the
    // array, not of the time of day.
    const terminal: PanelStatusValue = scheduledIds.has(p.id)
      ? 'scheduled'
      : statusFor(evaluateArray(G_REF, T_AMB_REF, {
        faultProgress: event ? 1 : 0,
        faultedStrings: event?.faultedStrings,
        terminalMismatch: event?.terminalMismatch,
        fSoil,
      }).deviationPct);

    rollup.push({ terminalStatus: terminal, progress: event ? progress : 1 });
  }

  return {
    siteSeconds,
    clock: clockAt(offset),
    ambientC: tAmb,
    irradiance: g,
    windMs: 1.6,
    cloudPct: 0,
    farmOutputMW: parkOutputMW(g, tAmb, shortfall),
    farmHealth: fleetHealth(rollup),
    panels,
    anomalies,
    critical,
  };
}

/**
 * What one array is losing, measured at REFERENCE conditions rather than at the
 * current hour.
 *
 * Every loss figure in the product — the committed 3.07 MWh, the queue's
 * MWh/day, the rail's 72-hour projection — is an integral of a shortfall over a
 * day's irradiance curve, and that integral is defined against a shortfall
 * quoted at 890 W/m². Feeding it the CURRENT shortfall gives an answer that
 * shrinks through the afternoon and reads zero at midnight, which would tell an
 * operator a cracked array costs nothing overnight. It costs exactly the same;
 * the sun is simply not up yet to prove it.
 */
export function referenceReadingAt(
  panelId: string,
  siteSeconds: number,
  injected: readonly ScenarioEvent[] = [],
): ArrayReading {
  const event = eventFor(panelId, injected);
  const progress = event ? faultProgressAt(event, siteSeconds) : 0;
  return evaluateArray(G_REF, T_AMB_REF, {
    faultProgress: progress,
    faultedStrings: event?.faultedStrings,
    terminalMismatch: event?.terminalMismatch,
    fSoil: SOIL.get(panelId),
  });
}

export function referenceShortfallKW(
  panelId: string,
  siteSeconds: number,
  injected: readonly ScenarioEvent[] = [],
): number {
  const r = referenceReadingAt(panelId, siteSeconds, injected);
  return Math.max(0, r.expectedKW - r.actualKW);
}

/** Peer strings on each inverter at the inspected position — see correction C17. */
export function inverterComparison(
  frame: LiveFrame,
  panelId: string,
): Record<string, { actualKW: number; expectedKW: number; deviationPct: number }> {
  const target = frame.panels[panelId];
  const out: Record<string, { actualKW: number; expectedKW: number; deviationPct: number }> = {};

  for (const inv of farm.inverters) {
    const isTarget = allPanels.find((p) => p.id === panelId)?.inverterId === inv.id;
    const stringExpected = target ? target.expectedKW / 7 : 0;
    const dev = isTarget ? (target?.stringDeviationPct ?? target?.deviationPct ?? 0) : 0;
    out[inv.id] = {
      expectedKW: stringExpected,
      actualKW: stringExpected * (1 + dev / 100),
      deviationPct: dev,
    };
  }
  return out;
}
