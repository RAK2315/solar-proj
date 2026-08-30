/**
 * src/lib/agentCheck.ts — the numeric cross-check, at runtime.
 *
 * scripts/run_agent.py enforces one rule offline: THE MODEL WRITES PROSE ABOUT
 * NUMBERS, IT NEVER PRODUCES ONE. Live mode can triage any of 120 arrays, which
 * means calling the model at request time — so the rule has to move to request time
 * with it. This is that check, ported, and it runs on the SERVER before a single
 * word reaches the browser.
 *
 * The failure it exists to catch is specific and real: the reference implementation's
 * own agent output claims a "60% output drop" while its telemetry says 58.4 %, and
 * nothing caught it. A response containing a number that is not in the data is
 * rejected and retried; if it will not comply, the console says the agent is
 * unavailable rather than showing prose nobody checked.
 *
 * Pure and dependency-free so it can be unit-tested directly — see agentCheck.test.ts,
 * which includes that exact 60 % case.
 */

import { STRING_OUTLIER_MARGIN_PCT, THERMAL_RISE_THRESHOLD_C } from './causes';
import type { LiveTriageOutput } from './types';

/** Everything the model is told, and therefore everything it may say back. */
export interface TriageFacts {
  panelId: string;
  zone: string;
  inverterId: string;
  stringsPerArray: number;
  lastServiced: string;
  clock: string;

  ambientC: number;
  irradiance: number;
  windMs: number;
  cloudPct: number;

  actualKW: number;
  expectedKW: number;
  deviationPct: number;
  stringDeviationPct?: number;
  cellTempC: number;
  fleetMedianCellTempC: number;

  peakAmbientC: number;
  actBefore: string;
}

/**
 * Counts and durations that describe structure rather than measurement. A model
 * saying "5 of 7 strings" or "over 72 hours" is describing the site, not inventing
 * a reading.
 */
const STRUCTURAL = new Set([0, 1, 2, 3, 4, 5, 6, 7, 12, 24, 25, 35, 48, 72, 120]);

/** Component identifiers contain digits that are NOT measurements. */
const IDENTIFIER_RE = new RegExp(
  [
    '\\b(?:INV|PAD|INC|MSN)-[A-Z0-9]+\\b',   // INV-B, PAD-01, INC-B17
    '\\b[A-C]-\\d{2}(?:-S\\d+)?\\b',          // B-17, B-17-S3
    '\\bB\\d-\\d{2}\\b',                      // B2-07
    '\\b[RCS]\\d\\b',                         // R2, C3, S3
    '\\(\\s*\\d+\\s*,\\s*\\d+\\s*\\)',        // (2,3)
    '\\b\\d+-bit\\b',                         // 8-bit
    '\\d{1,2}:\\d{2}',                        // 14:00 — checked as an exact field
  ].join('|'),
  'gi',
);

const NUMBER_RE = /\d+(?:\.\d+)?/g;

/** Every number the model may legitimately write, built from the facts themselves. */
export function allowedNumbers(f: TriageFacts): number[] {
  const values = new Set<number>(STRUCTURAL);

  const add = (v: number | undefined) => {
    if (v === undefined || !Number.isFinite(v)) return;
    const a = Math.abs(v);
    values.add(Number(a.toFixed(2)));
    values.add(Number(a.toFixed(1)));
    values.add(Math.round(a));
  };

  add(f.ambientC); add(f.irradiance); add(f.windMs); add(f.cloudPct);
  add(f.actualKW); add(f.expectedKW); add(f.deviationPct);
  add(f.stringDeviationPct); add(f.cellTempC); add(f.fleetMedianCellTempC);
  add(f.peakAmbientC); add(f.stringsPerArray);

  return [...values];
}

/** Every measurement-shaped number in any string field of a response. */
export function proseNumbers(value: unknown): number[] {
  if (typeof value === 'string') {
    const stripped = value.replace(IDENTIFIER_RE, ' ');
    return [...stripped.matchAll(NUMBER_RE)].map((m) => Number(m[0]));
  }
  if (Array.isArray(value)) return value.flatMap(proseNumbers);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(proseNumbers);
  }
  return [];
}

export interface CheckResult {
  ok: boolean;
  /** Why it was rejected — fed back to the model as a correction, and logged. */
  reason?: string;
}

/**
 * Reject any number in the prose that is not in the data.
 *
 * Deliberately strict: the model is given every number it needs, so anything else
 * it writes, it made up.
 */
export function checkProse(payload: unknown, allowed: number[]): CheckResult {
  const bad = proseNumbers(payload).filter(
    (n) => !allowed.some((a) => Math.abs(n - a) < 0.005),
  );
  if (bad.length === 0) return { ok: true };
  return {
    ok: false,
    reason:
      `prose contains ${bad.length} number(s) not present in the data: `
      + `${[...new Set(bad)].sort((x, y) => x - y).join(', ')}. `
      + 'The model writes prose ABOUT numbers; it never produces one.',
  };
}

/** Structural and semantic checks on a triage response. */
/**
 * A deviation this size or worse is ambiguous between soiling and damage, so it
 * cannot be resolved from telemetry and a drone is justified. Above it, an array is
 * doing what the model predicts and there is nothing to go and look at.
 */
export const MATERIAL_DEVIATION_PCT = -2;

export const isMaterial = (deviationPct: number) => deviationPct <= MATERIAL_DEVIATION_PCT;

/**
 * What the facts say about whether a drone is justified.
 *
 *   refused   the soiling signature — down evenly, no thermal rise. Imaging adds
 *             nothing the telemetry has not already said.
 *   required  anything else that is materially down: a localised hot string, or
 *             signatures that do not agree with each other.
 *
 * Uses the same two thresholds the deterministic diagnosis uses, imported rather
 * than restated. Two copies of a threshold is two answers waiting to happen.
 */
export function verificationExpectedFor(f: TriageFacts): 'required' | 'refused' {
  const localised = f.stringDeviationPct !== undefined
    && f.stringDeviationPct < f.deviationPct - STRING_OUTLIER_MARGIN_PCT;
  const runningHot = f.cellTempC - f.fleetMedianCellTempC >= THERMAL_RISE_THRESHOLD_C;
  return !localised && !runningHot ? 'refused' : 'required';
}

export function checkTriage(payload: LiveTriageOutput, f: TriageFacts): CheckResult {
  const material = isMaterial(f.deviationPct);

  // WHETHER A DRONE SHOULD FLY IS DECIDED BY THE SHAPE OF THE LOSS, not its size.
  //
  // This used to demand `true` for ANY materially deviating array, which is the
  // rule you write when the site has one fault type. It is wrong as soon as the
  // site has two: an evenly-down, fleet-temperature array is dirty, imaging it
  // confirms what the telemetry already established, and a sortie is spent for
  // nothing. The agent that says "book the wash crew" is the useful one, and the
  // cross-check has to permit it or the model can never be right.
  //
  // The thresholds come from `causes.ts` rather than being restated, so the
  // deterministic diagnosis and the check on the model's answer cannot drift into
  // demanding different things of the same array.
  const expectation = verificationExpectedFor(f);

  if (material && expectation === 'required' && payload.requiresPhysicalVerification !== true) {
    return {
      ok: false,
      reason:
        `${f.panelId} is ${f.deviationPct.toFixed(2)}% below expected and the loss is not `
        + 'the even, fleet-temperature signature of soiling. Telemetry cannot establish '
        + 'a root cause on its own, so requiresPhysicalVerification must be true.',
    };
  }

  if (material && expectation === 'refused' && payload.requiresPhysicalVerification === true) {
    return {
      ok: false,
      reason:
        `${f.panelId} is down evenly across its strings at fleet temperature, which is `
        + 'soiling. Imaging would confirm what the telemetry has already established, so '
        + 'requiresPhysicalVerification must be false and the array should be cleaned.',
    };
  }

  if (!material && payload.requiresPhysicalVerification === true) {
    return {
      ok: false,
      reason:
        `${f.panelId} is within tolerance at ${f.deviationPct.toFixed(2)}%. There is `
        + 'nothing to verify; requiresPhysicalVerification must be false.',
    };
  }

  const suspect = String(payload.suspectComponent ?? '');
  if (!suspect.includes(f.panelId) && !suspect.includes(f.inverterId)) {
    return {
      ok: false,
      reason:
        `suspectComponent is "${suspect}"; it must name a real component in this `
        + `array's chain (${f.panelId}, one of its strings, or ${f.inverterId}).`,
    };
  }

  if (!(payload.confidence >= 0 && payload.confidence <= 1)) {
    return {
      ok: false,
      reason: `confidence is ${payload.confidence}; it must be a probability between 0 and 1.`,
    };
  }

  // THE LOAD-BEARING CLAIM. Only demanded when a dispatch is actually being
  // justified — a nominal array does not need an argument for a drone.
  if (!material) return { ok: true };

  const rationale = String(payload.verificationRationale ?? '').toLowerCase();
  const missing: string[] = [];
  if (!rationale.includes('soil')) missing.push('soiling as a candidate mechanism');
  if (!/crack|physical damage|cell damage|delamination/.test(rationale)) {
    missing.push('physical damage as the competing mechanism');
  }
  if (!/imag|thermal|visual|camera|inspect/.test(rationale)) {
    missing.push('imaging as the thing that distinguishes them');
  }
  if (missing.length) {
    return {
      ok: false,
      reason:
        `verificationRationale is missing: ${missing.join('; ')}. Soiling and physical `
        + 'cell damage produce similar signatures under these conditions, and only '
        + 'imaging separates them. Say exactly that.',
    };
  }

  return { ok: true };
}

/** Both checks, in the order that produces the most useful correction message. */
export function validateTriage(payload: LiveTriageOutput, f: TriageFacts): CheckResult {
  const structural = checkTriage(payload, f);
  if (!structural.ok) return structural;
  return checkProse(payload, allowedNumbers(f));
}
