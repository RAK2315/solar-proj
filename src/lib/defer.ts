/**
 * src/lib/defer.ts — what waiting costs.
 *
 * THIS IS THE ONE THING THE PRODUCT DOES THAT A DETECTOR CANNOT. Everything else
 * on screen describes the present: this array is down, here is the photograph,
 * here is the hot band. All of it is describable by a good monitoring system and
 * a camera. None of it tells an operator the thing they actually have to decide,
 * which is not *whether* to fix it but *when*, against four other jobs and two
 * crews.
 *
 * So: fix it now, in six hours, tomorrow, or at the end of the forecast — and for
 * each, the energy that is never generated in the meantime.
 *
 * THE STEP IS THE POINT. The curve is not a straight line. Up to the deadline the
 * array is DERATED: the cracked cell drives its bypass diode into conduction and
 * the affected strings produce at the mismatch fraction. Past it the declared
 * mechanism is that the diode itself fails, and a failed diode does not derate a
 * string, it opens it — so the loss steps from "part of five strings" to "all of
 * five strings" and stays there. That discontinuity is what makes the deadline a
 * deadline rather than a suggestion, and it is why this is a decision-support
 * tool rather than a chart.
 *
 * WHAT IS COMPUTED AND WHAT IS DECLARED, stated plainly because the distinction is
 * the whole basis on which anyone should believe this:
 *
 *   COMPUTED   the loss in any window — the array's shortfall integrated across
 *              the committed forecast irradiance curve.
 *   COMPUTED   the deadline hour — `crackDeadlineHour`, cumulative thermal dose.
 *   DECLARED   that past the deadline the mechanism changes from derate to open
 *              circuit. This is the failure mode CLAUDE.md §9.2 names, and it is
 *              modelled here exactly as the `string-outage` scenario models it:
 *              the same strings at a mismatch of zero. It is an assumption about
 *              physics, it is stated as one on screen, and it is not tuned.
 *
 * NOTHING HERE IS RECOMPUTED THAT ALREADY EXISTS. The 72-hour figure is the
 * committed integral (`forecast.projected72hLossMWh`), and a window is a FRACTION
 * of it rather than a fresh integral — recomputing gives 3.058 where the committed
 * value is 3.07, and two different answers for B-17's loss on one screen would
 * cost more credibility than the third decimal place is worth.
 */

import { forecast } from './data';
import {
  FAULTED_STRINGS, FORECAST_HOURS, G_REF, T_AMB_REF, evaluateArray,
} from './physics';
import { projected72hLossMWh } from './queue';

/**
 * Trapezoidal integral of irradiance between two hour offsets on the committed
 * forecast curve. Units are W·h/m², and only ever used as a ratio.
 *
 * Interpolates at the ends rather than snapping to whole hours: the operator can
 * be at 10:26, and a "six hours from now" that silently meant "six hours from the
 * last whole hour" would put a figure on screen that is not the one asked for.
 */
export function irradianceIntegral(fromH: number, toH: number): number {
  const points = forecast.points;
  const lo = Math.max(0, Math.min(fromH, toH));
  const hi = Math.min(FORECAST_HOURS, Math.max(fromH, toH));
  if (hi <= lo) return 0;

  const at = (h: number): number => {
    const i = Math.min(points.length - 2, Math.max(0, Math.floor(h)));
    const a = points[i];
    const b = points[i + 1];
    const span = b.hourOffset - a.hourOffset || 1;
    return a.irradiance + ((b.irradiance - a.irradiance) * (h - a.hourOffset)) / span;
  };

  let total = 0;
  let cursor = lo;
  while (cursor < hi) {
    const next = Math.min(hi, Math.floor(cursor) + 1);
    total += ((at(cursor) + at(next)) / 2) * (next - cursor);
    cursor = next;
  }
  return total;
}

/** The whole forecast window, which the committed 72-hour figure covers. */
export const FULL_WINDOW_INTEGRAL = irradianceIntegral(0, FORECAST_HOURS);

/**
 * Energy an array fails to generate between two hour offsets, in MWh.
 *
 * A fraction of the committed integral, not a second integral — see the header.
 * Shortfall enters linearly, so the scaling is exact.
 */
export function lossBetweenMWh(shortfallAtRefKW: number, fromH: number, toH: number): number {
  if (shortfallAtRefKW <= 0) return 0;
  return projected72hLossMWh(shortfallAtRefKW)
    * (irradianceIntegral(fromH, toH) / FULL_WINDOW_INTEGRAL);
}

/**
 * The shortfall once the bypass diode has failed: the same strings, open rather
 * than derated.
 *
 * `terminalMismatch: 0` is not a number invented here — it is what `string-outage`
 * means everywhere else in this codebase, evaluated by the same function that
 * evaluates every other array on the site.
 */
export function openCircuitShortfallKW(faultedStrings = FAULTED_STRINGS): number {
  const r = evaluateArray(G_REF, T_AMB_REF, {
    faultProgress: 1,
    faultedStrings,
    terminalMismatch: 0,
  });
  return r.expectedKW - r.actualKW;
}

export interface DeferOption {
  id: string;
  /** What the operator is choosing, in their own words. */
  label: string;
  /** Hours from now until the repair happens. Zero is "now". */
  delayH: number;
}

/**
 * The four choices. Bounded by the forecast: there is no honest answer beyond
 * 72 hours because there is no forecast beyond 72 hours, and inventing one is
 * exactly the kind of thing this product refuses to do elsewhere.
 */
export const DEFER_OPTIONS: DeferOption[] = [
  { id: 'now', label: 'Now', delayH: 0 },
  { id: 'six', label: 'In 6 hours', delayH: 6 },
  { id: 'tomorrow', label: 'Tomorrow', delayH: 24 },
  { id: 'end', label: 'In 3 days', delayH: 72 },
];

export interface DeferOutcome extends DeferOption {
  /** Energy never generated between now and the repair, MWh. */
  lostMWh: number;
  /** How much worse than fixing it now, MWh. */
  extraMWh: number;
  /** Does this choice cross the computed deadline? */
  breaches: boolean;
  /** Of `lostMWh`, how much accrues AFTER the diode has failed. */
  afterBreachMWh: number;
}

export interface DeferInput {
  /** The array's shortfall at reference conditions, while still derated. */
  shortfallAtRefKW: number;
  /** Its shortfall once the diode has failed and the strings are open. */
  openCircuitKW: number;
  /** Hours from now until the deadline. Null when none has been computed. */
  hoursUntilDeadline: number | null;
  /** Where the site clock is on the forecast curve, in hours. */
  nowH: number;
}

/**
 * What each choice costs.
 *
 * Loss accrues at the derated rate up to the deadline and at the open-circuit
 * rate after it. An array with no computed deadline simply never steps, which is
 * the honest answer for a soiled array: waiting costs more, linearly, and nothing
 * catastrophic is being claimed.
 */
export function deferOutcomes(input: DeferInput): DeferOutcome[] {
  const { shortfallAtRefKW, openCircuitKW, hoursUntilDeadline, nowH } = input;

  const lossTo = (delayH: number): { total: number; after: number } => {
    const end = nowH + delayH;

    if (hoursUntilDeadline === null || !Number.isFinite(hoursUntilDeadline)) {
      return { total: lossBetweenMWh(shortfallAtRefKW, nowH, end), after: 0 };
    }

    const breachH = nowH + Math.max(0, hoursUntilDeadline);
    if (end <= breachH) {
      return { total: lossBetweenMWh(shortfallAtRefKW, nowH, end), after: 0 };
    }

    const derated = lossBetweenMWh(shortfallAtRefKW, nowH, breachH);
    const opened = lossBetweenMWh(openCircuitKW, breachH, end);
    return { total: derated + opened, after: opened };
  };

  const base = lossTo(0).total;

  return DEFER_OPTIONS.map((option) => {
    const { total, after } = lossTo(option.delayH);
    return {
      ...option,
      lostMWh: total,
      extraMWh: total - base,
      breaches: hoursUntilDeadline !== null
        && Number.isFinite(hoursUntilDeadline)
        && option.delayH > hoursUntilDeadline,
      afterBreachMWh: after,
    };
  });
}
