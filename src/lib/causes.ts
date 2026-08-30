/**
 * src/lib/causes.ts — what is actually wrong, and what to do about it.
 *
 * THIS IS THE MODULE THAT MAKES "TRIAGE" AN HONEST WORD. Triage means sorting
 * DIFFERENT problems. Until this existed the site had one mechanism at three
 * depths — a cracked cell, more or less far along — so every incident ended in
 * "send the drone, then replace the module", and a system that always reaches the
 * same conclusion is a detector with extra steps, not a triage system.
 *
 * There are three causes an array's shortfall can have here, they are told apart
 * by different evidence, and each one leads somewhere different:
 *
 *   SOILING    a derate on the whole array. Dirt. → book the wash crew. Do NOT
 *              fly a drone: imaging a dirty panel tells you it is dirty, which
 *              the telemetry already said.
 *   SHADING    geometry, not a fault. Row-to-row shading at low sun. → nothing to
 *              repair; the cost is a design fact and the fix is a spacing change.
 *   CRACK      a cell driving its bypass diode into conduction. → fly the drone,
 *              then replace the module before the deadline.
 *
 * THE REFUSAL MATTERS MORE THAN THE DISPATCH. An agent that always sends the
 * drone has not decided anything. The moment this product is most credible is the
 * moment it says "this is dirt — don't fly, book the wash", because that is a
 * judgement with a cost attached, and it is the one thing a threshold alarm can
 * never do.
 *
 * ── WHY SHADING IS A GEOMETRY QUESTION, AND WHY THAT NEEDS THE 3D ───────────
 *
 * Row-to-row shading happens when the sun is low enough that the row in front
 * casts its shadow onto the row behind. Whether that is possible at a given hour
 * is decided by three numbers — panel tilt, row pitch, and solar elevation — and
 * NONE of them is visible on a flat map. A 2D plan has no height and no tilt, so
 * it cannot answer the question at all. The site's own geometry is what answers
 * it, and that geometry is three-dimensional.
 *
 * So the 3D view is not a picture of the answer. It is where part of the answer
 * comes from, and this module is the seam.
 *
 * WHAT IS CLAIMED AND WHAT IS NOT. This computes whether inter-row shading is
 * GEOMETRICALLY POSSIBLE at the current hour. It does not compute a shading loss
 * and it deliberately does not add one to the physics — that would move numbers
 * every invariant is asserted against, for a mechanism the committed scenario
 * does not contain. What it does is NARROW THE DIAGNOSIS, which is exactly what a
 * triage stage is for: at high sun, shading is ruled OUT by geometry, so a
 * shortfall must be dirt or damage. That is a real deduction from real site data
 * and it is the shape triage should have.
 *
 * ── THE RULE THAT KEPT THIS HONEST ──────────────────────────────────────────
 *
 * The first version of this module diagnosed soiling by reading the array's
 * soiling derate out of the committed scenario. That is CIRCULAR: `f_soil` is the
 * answer, not the evidence, and no operator on a real site can see it. A triage
 * engine that consults ground truth is not triaging, it is looking up.
 *
 * So the inputs here are restricted to what an instrument on the site actually
 * produces, and the discrimination is done on the SHAPE of the loss:
 *
 *   SOILING   derates the whole array evenly. Every string is down by the same
 *             amount, and cell temperature is NOT raised — dirt reduces the light
 *             going in, so it reduces heat as well as power.
 *   A CRACK   bypasses SPECIFIC strings. One string is far below the others, and
 *             the bypassed section runs HOT, because a reverse-biased substring
 *             dissipates the power it is no longer exporting.
 *
 * A string-level outlier plus a thermal rise is a localised electrical fault. An
 * even derate with no thermal rise is dirt. Both signatures come off equipment
 * that exists — per-string monitoring and a thermal sensor — and both are in the
 * physics model already, which is why this can be done without inventing a field.
 */

import { farm } from './data';
import { irradianceAt } from './physics';

/**
 * Row pitch, metres — centre to centre between array rows.
 *
 * DECLARED, like `THERMAL_SPAN_C` and `DOSE_BUDGET_H`, and for the same reason:
 * the committed `farm.json` records tilt and azimuth but not spacing, and adding
 * a field to it would mean regenerating the file every invariant is checked
 * against. It matches the spacing the 3D scene builds the site from, so the
 * geometry an operator looks at and the geometry this reasons about are one site.
 */
export const ROW_PITCH_M = 8.0;

export type CauseId = 'crack' | 'soiling' | 'shading' | 'unexplained' | 'none';

export interface Cause {
  id: CauseId;
  /** What it is, in the operator's words. */
  label: string;
  /** One plain sentence a non-specialist can act on. */
  says: string;
  /** What to do. Named actions, not "investigate further". */
  action: string;
  /** Does this cause justify flying a drone at it? */
  needsDrone: boolean;
  /** Causes ruled out, and by what. The refusals are half the reasoning. */
  ruledOut: Array<{ cause: string; because: string }>;
}

/**
 * Solar elevation, degrees, for an hour offset on the site's own day.
 *
 * Derived from the irradiance curve the whole product already runs on rather than
 * from a fresh ephemeris: a second sun model would be a second answer to "how high
 * is the sun", and the two would drift. Irradiance on a horizontal plane goes as
 * sin(elevation) under clear sky, and the forecast is clear throughout — which is
 * stated, not assumed quietly.
 */
export function solarElevationDeg(hourOffset: number, peakIrradiance: number): number {
  const g = irradianceAt(hourOffset);
  if (g <= 0 || peakIrradiance <= 0) return 0;
  return (Math.asin(Math.min(1, g / peakIrradiance)) * 180) / Math.PI;
}

/**
 * The elevation below which the row in front reaches the row behind.
 *
 * Standard inter-row geometry: a row of collector width `w` at tilt `β` casts a
 * shadow of length `w·cos β + w·sin β / tan(α)` along the ground. Shading begins
 * when that reaches the pitch `p`, i.e. below
 *
 *   α_crit = atan( w·sin β / (p − w·cos β) )
 *
 * With this site's 25° tilt, 1.6 m collector and 8 m pitch that lands around 5–6°,
 * which is why shading here is a dawn-and-dusk phenomenon rather than a midday one.
 */
export function shadingLimitDeg(
  tiltDeg = farm.tilt,
  pitchM = ROW_PITCH_M,
  collectorM = 1.6,
): number {
  const beta = (tiltDeg * Math.PI) / 180;
  const run = pitchM - collectorM * Math.cos(beta);
  if (run <= 0) return 90;
  return (Math.atan((collectorM * Math.sin(beta)) / run) * 180) / Math.PI;
}

/**
 * Can one row shade the next at this hour? A geometric fact about the site, not a
 * reading and not a guess.
 */
export function shadingPossibleAt(hourOffset: number, peakIrradiance: number): boolean {
  const elevation = solarElevationDeg(hourOffset, peakIrradiance);
  return elevation > 0 && elevation < shadingLimitDeg();
}

export interface CauseInput {
  panelId: string;
  /** The array's deviation now, percent. Negative is a shortfall. */
  deviationPct: number;
  /**
   * The worst individual string's deviation, when per-string monitoring reports
   * one materially below the rest. Undefined when the array is down evenly —
   * which is itself the observation that points at dirt.
   */
  stringDeviationPct?: number;
  /** This array's cell temperature, from the thermal sensor. */
  cellTempC: number;
  /** The fleet's median cell temperature at these conditions. */
  fleetMedianCellTempC: number;
  /** Hour offset on the forecast curve, for the geometry question. */
  hourOffset: number;
  /** Peak irradiance on the site's day — the denominator for elevation. */
  peakIrradiance: number;
}

/** Below this the array is doing what the model expects and nothing is claimed. */
const DEVIATION_FLOOR_PCT = -1;

/**
 * How much hotter than the fleet counts as a thermal rise.
 *
 * The measured hot band on B-17 sits about 2.8 °C above its own array median, and
 * the array's mean rise is smaller than that because only part of it is hot. One
 * degree is comfortably above sensor noise and comfortably below the measurement,
 * and it is declared here rather than tuned to make a case come out right.
 */
export const THERMAL_RISE_THRESHOLD_C = 1.0;

/**
 * How much worse a string has to be than its own array before it counts as an
 * outlier rather than as part of an even derate.
 *
 * An evenly soiled array has every string at the array figure, so any real gap is
 * evidence of localisation. Five points allows for ordinary spread.
 */
export const STRING_OUTLIER_MARGIN_PCT = 5.0;

/**
 * Work out the cause from what the instruments report, and say what was ruled out.
 *
 * The order is the order the evidence actually settles it in:
 *   1. Is the loss LOCALISED to a string, and is that string running hot? Then it
 *      is an electrical fault in that string, and only imaging says which module.
 *   2. Is the array down EVENLY with no thermal rise? Then it is dirt, and imaging
 *      it would confirm what is already established.
 *   3. Could the site's own geometry explain it at this hour? Then it is not a
 *      fault at all.
 *   4. Otherwise say the cause is not established, rather than picking a story.
 */
export function diagnose(input: CauseInput): Cause {
  const {
    panelId, deviationPct, stringDeviationPct, cellTempC, fleetMedianCellTempC,
    hourOffset, peakIrradiance,
  } = input;

  if (deviationPct >= DEVIATION_FLOOR_PCT) {
    return {
      id: 'none',
      label: 'No fault',
      says: `${panelId} is producing what the model expects. Nothing to schedule.`,
      action: 'Keep monitoring.',
      needsDrone: false,
      ruledOut: [],
    };
  }

  const shadingPossible = shadingPossibleAt(hourOffset, peakIrradiance);
  const thermalRise = cellTempC - fleetMedianCellTempC;
  const runningHot = thermalRise >= THERMAL_RISE_THRESHOLD_C;
  const localised = stringDeviationPct !== undefined
    && stringDeviationPct < deviationPct - STRING_OUTLIER_MARGIN_PCT;

  // Shading is ruled OUT by geometry whenever the sun is high, and that is a real
  // deduction rather than a shrug: it is why a midday shortfall must be dirt or
  // damage. The reason is quoted with the number that settles it.
  const geometryNote = shadingPossible
    ? `the sun is below ${shadingLimitDeg().toFixed(1)}°, so a row CAN shade the one behind it`
    : `the sun is above ${shadingLimitDeg().toFixed(1)}°, so no row can reach the one behind it`;

  const thermalNote = runningHot
    ? `this array runs ${thermalRise.toFixed(1)} °C above the fleet median, and dirt lowers `
      + 'heat input rather than raising it'
    : 'this array is at the fleet median temperature, and a bypassed substring would lift it';

  if (localised && runningHot) {
    return {
      id: 'crack',
      label: 'Localised electrical fault',
      // "that string is running hot" was an overclaim: the thermal reading is an
      // ARRAY average, not a per-string one, and the agent rightly objected that it
      // could not tell which string was hot. The signature is real either way — a
      // bypassed substring lifts the array's average — but the sentence has to say
      // what was actually measured.
      says: `The loss on ${panelId} is confined to one string, which is `
        + `${Math.abs(stringDeviationPct! - deviationPct).toFixed(0)} points below the array as a `
        + `whole, and the array is running ${thermalRise.toFixed(1)} °C above the fleet median. `
        + 'A bypassed substring dissipates the power it no longer exports, which is what '
        + 'lifts the average.',
      action: `Fly a drone to ${panelId} to find which module, then replace it before the deadline.`,
      needsDrone: true,
      ruledOut: [
        { cause: 'Row shading', because: geometryNote },
        {
          cause: 'Soiling',
          because: 'dirt derates a whole array evenly; this loss is confined to one string, '
            + 'and the rest are at full output',
        },
      ],
    };
  }

  if (!localised && !runningHot) {
    return {
      id: 'soiling',
      label: 'Soiling',
      says: `${panelId} is down evenly across every string with no thermal rise. That is the `
        + 'signature of dirt: less light reaching the cells, so less power and less heat.',
      // THE REFUSAL. An agent that always sends the drone has decided nothing.
      action: `Book the wash crew for ${panelId}. Do not fly a drone — imaging a dirty `
        + 'panel confirms it is dirty, which the telemetry already established.',
      needsDrone: false,
      ruledOut: [
        { cause: 'Row shading', because: geometryNote },
        { cause: 'Cell damage', because: thermalNote },
      ],
    };
  }

  if (shadingPossible) {
    return {
      id: 'shading',
      label: 'Row shading — geometry, not a fault',
      says: `${panelId} is losing output to the row in front of it. At this hour the sun is `
        + `below ${shadingLimitDeg().toFixed(1)}°, which is where ${ROW_PITCH_M} m of row pitch `
        + `at ${farm.tilt}° tilt stops clearing the row behind.`,
      action: 'Nothing to repair. This is a design cost, recovered by wider row pitch or '
        + 'accepted as a known dawn-and-dusk loss.',
      needsDrone: false,
      ruledOut: [
        {
          cause: 'A fault of any kind',
          because: 'the geometry accounts for it, and it will clear as the sun rises',
        },
      ],
    };
  }

  // Signatures that do not agree with each other: a localised loss that is cold,
  // or an even loss that is hot. Neither story fits, so neither is told.
  return {
    id: 'unexplained',
    label: 'Cause not established',
    says: `${panelId} is below expectation and the signatures do not agree. `
      + (localised
        ? 'The loss is confined to one string but that string is not running hot, '
          + 'which does not match a bypassed substring.'
        : 'The array is down evenly but running hot, which does not match dirt.'),
    action: `Fly a drone to ${panelId}. Telemetry has been exhausted.`,
    needsDrone: true,
    ruledOut: [{ cause: 'Row shading', because: geometryNote }],
  };
}
