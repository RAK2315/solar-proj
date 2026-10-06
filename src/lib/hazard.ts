/**
 * src/lib/hazard.ts — the what-if sandbox, as arithmetic.
 *
 * A hazard is a scenario event: something the presenter declares about the site's
 * weather, at a place and from a moment. This file turns a list of them into the
 * irradiance and ambient temperature one array actually experiences, and nothing
 * else. `physics.ts` is not touched: `evaluateArray(g, tAmb, ...)` already takes
 * both per array, so a hazard is a change to its arguments.
 *
 * PURE, like everything in lib/. Every effect is a function of the hour asked
 * about, so seeking the site clock backwards un-happens a hazard by construction.
 *
 * WHAT IS DECLARED. `HAZARD_SPEC` below is a set of scenario inputs, in the same
 * sense as `INJECTABLE` in session.ts: the presenter chooses to drop a dust storm,
 * and these are what "a dust storm" means here. They are assumptions, they are
 * printed behind the `?` wherever a hazard is on screen, and none of them is a
 * measurement of Bhadla.
 */

import {
  DOSE_BUDGET_H, FORECAST_HOURS, HOT_BAND_DELTA_T_C, T_PROP_C, ambientAt, cellTemp, irradianceAt,
} from './physics';
import { arrayCentre } from './scene';

export type HazardKind = 'dust' | 'cloud' | 'heatwave';

/** `intensity` is the fraction of irradiance kept from the cells, or °C for a heatwave. */
export type Hazard =
  | { kind: 'dust'; cx: number; cy: number; radius: number; intensity: number }
  | { kind: 'cloud'; cx: number; cy: number; radius: number; intensity: number }
  | { kind: 'heatwave'; intensity: number };   // site-wide: no footprint

/** A hazard with the moment it was dropped. This is what the session stores. */
export type HazardEvent = Hazard & {
  id: string;
  /** Hour of day it begins, on the scenario's own clock. */
  startHour: number;
  rampMinutes: number;
  /** Null means it stays: dust does not leave a module until someone washes it. */
  durationHours: number | null;
};

export const HAZARD_SPEC = {
  dust: {
    label: 'Dust storm',
    radius: 20,
    intensity: 0.14,
    rampMinutes: 3,
    durationHours: null,
  },
  cloud: {
    label: 'Cloud bank',
    radius: 42,
    intensity: 0.55,
    rampMinutes: 2,
    durationHours: 1.5,
  },
  heatwave: {
    label: 'Heatwave',
    radius: 0,
    intensity: 5,
    rampMinutes: 20,
    durationHours: null,
  },
} as const;

/**
 * How long a dust-soiled array may wait for a wash before it is overdue, counted
 * from the storm. A declared assumption, in the same class as the cleaning
 * windows the committed queue already carries for A-08 and C-31.
 */
export const DUST_WASH_WINDOW_H = 48;

/** An array this far below the site reference is worth saying something about. */
export const AFFECTED_THRESHOLD = 0.01;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (k: number) => k * k * (3 - 2 * k);

/** 0 before it starts, ramping to 1, and back to 0 once a transient one has passed. */
export function hazardStrengthAt(h: HazardEvent, hourOfDay: number): number {
  const since = hourOfDay - h.startHour;
  if (since < 0) return 0;
  if (h.durationHours !== null && since > h.durationHours) return 0;
  return h.rampMinutes <= 0 ? 1 : clamp01((since * 60) / h.rampMinutes);
}

/** The hazards in force at an hour, with intensity scaled by how far each has developed. */
export function hazardsAt(events: readonly HazardEvent[], hourOfDay: number): Hazard[] {
  const out: Hazard[] = [];
  for (const e of events) {
    const k = hazardStrengthAt(e, hourOfDay);
    if (k <= 0) continue;
    out.push(e.kind === 'heatwave'
      ? { kind: 'heatwave', intensity: e.intensity * k }
      : { kind: e.kind, cx: e.cx, cy: e.cy, radius: e.radius, intensity: e.intensity * k });
  }
  return out;
}

/** Full strength across the inner half of the radius, easing to nothing at the edge. */
export function footprintWeight(h: { cx: number; cy: number; radius: number }, x: number, z: number): number {
  const d = Math.hypot(x - h.cx, z - h.cy);
  const core = h.radius / 2;
  if (d <= core) return 1;
  if (d >= h.radius) return 0;
  return smooth(1 - (d - core) / (h.radius - core));
}

/**
 * The fraction of irradiance kept off one array. Footprints multiply through,
 * so a cloud over a dusty array blocks a share of what the dust let pass.
 */
export function attenuationAt(
  x: number, z: number, hazards: readonly Hazard[], only?: 'dust' | 'cloud',
): number {
  let pass = 1;
  for (const h of hazards) {
    if (h.kind === 'heatwave' || (only && h.kind !== only)) continue;
    pass *= 1 - clamp01(h.intensity) * footprintWeight(h, x, z);
  }
  return 1 - pass;
}

/** The part of the weather every array shares: the site reference a model is read against. */
export function siteWeather(
  baseG: number, baseTAmb: number, hazards: readonly Hazard[],
): { g: number; tAmb: number } {
  let tAmb = baseTAmb;
  for (const h of hazards) if (h.kind === 'heatwave') tAmb += h.intensity;
  return { g: baseG, tAmb };
}

/** The weather one array experiences. The whole sandbox is this function. */
export function weatherFor(
  panel: { id: string }, baseG: number, baseTAmb: number, hazards: readonly Hazard[],
): { g: number; tAmb: number } {
  if (hazards.length === 0) return { g: baseG, tAmb: baseTAmb };
  const p = arrayCentre(panel.id);
  const site = siteWeather(baseG, baseTAmb, hazards);
  return { g: site.g * (1 - attenuationAt(p.x, p.z, hazards)), tAmb: site.tAmb };
}

/**
 * When a cracked array becomes unrecoverable, with hazards in force.
 *
 * The same dose model as `crackDeadlineHour` in physics.ts, hour for hour: count
 * the hours the hot band spends above the propagation threshold and stop at the
 * budget. That function reads the site forecast directly and cannot be told about
 * a heatwave, and it is frozen, so the loop is repeated here with the weather
 * passed through `weatherFor`. hazard.test.ts holds the two equal when there is
 * no hazard, which is what stops them drifting.
 */
export function crackDeadlineUnder(
  panel: { id: string },
  faultStartHourOffset: number,
  events: readonly HazardEvent[],
  epochHour: number,
  deltaTC: number = HOT_BAND_DELTA_T_C,
): number | null {
  let dose = 0;
  for (let h = Math.max(0, Math.floor(faultStartHourOffset)); h <= FORECAST_HOURS; h += 1) {
    const w = weatherFor(panel, irradianceAt(h), ambientAt(h), hazardsAt(events, epochHour + h));
    if (cellTemp(w.tAmb, w.g) + deltaTC > T_PROP_C) dose += 1;
    if (dose >= DOSE_BUDGET_H) return h;
  }
  return null;
}
