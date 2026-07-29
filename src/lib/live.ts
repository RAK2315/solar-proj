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
  ambientAt, clockAt, irradianceAt, parkOutputMW, statusFor,
} from './physics';

export interface ScenarioEvent {
  id: string;
  type: string;
  panelId: string;
  startHour: number;
  rampMinutes: number;
  moduleId?: string;
  stringId?: string;
  mechanism?: string;
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

/** The active fault on a given array, if any. */
export function eventFor(panelId: string): ScenarioEvent | undefined {
  return scenario.events.find((e) => e.panelId === panelId);
}

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
    const event = eventFor(p.id);
    const progress = event ? faultProgressAt(event, siteSeconds) : 0;
    const fSoil = SOIL.get(p.id);

    const reading = evaluateArray(g, tAmb, {
      faultProgress: progress,
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
    const terminal: PanelStatusValue = scheduledIds.has(p.id)
      ? 'scheduled'
      : event
        ? 'critical'
        : statusFor(evaluateArray(g, tAmb, { fSoil }).deviationPct);

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
