/**
 * The figures the landing page makes its argument with.
 *
 * WHY THIS FILE EXISTS. Rule 1 of CLAUDE.md §0 — never invent a number — applies to
 * marketing copy at least as hard as it applies to the console, because a landing
 * page is where a number is most likely to be rounded into a claim nobody can
 * source. Every figure below is EVALUATED from `src/lib/physics.ts`, `src/lib/queue.ts`
 * or the committed detector output at module scope, so the page cannot drift from
 * the console: change a coefficient and both move together, or the golden physics
 * test fails first.
 *
 * `npm run check:literals` would fail the build if any of these were typed as text
 * into the page instead.
 */

import { detection } from '@/lib/data';
import { forecast } from '@/lib/data';
import {
  DEV_ARRAY_PCT, DEV_STRING_PCT, FAULTED_STRINGS, PARK_NAMEPLATE_MW,
  STRINGS_PER_ARRAY, T_AMB_REF, G_REF, cellTemp, derate,
} from '@/lib/physics';
import { REFERENCE_SHORTFALL_KW, dailyLossMWh, projected72hLossMWh } from '@/lib/queue';

/** What the modelled 500 MW block is producing at the reference hour. */
export const OUTPUT_MW = PARK_NAMEPLATE_MW * derate();

/**
 * Delivered as a share of nameplate. The headline of the whole argument: the block
 * is not broken, it is simply hot, and 73% is what a correct PV model returns at
 * 890 W/m² with the cells at 63 °C. Framing it as a deficit would be dishonest;
 * framing it as the baseline the recoverable loss sits ON TOP of is the point.
 */
export const DELIVERED_SHARE_PCT = (OUTPUT_MW / PARK_NAMEPLATE_MW) * 100;

export const NAMEPLATE_MW = PARK_NAMEPLATE_MW;
export const CELL_TEMP_C = cellTemp(T_AMB_REF, G_REF);
export const IRRADIANCE = G_REF;
export const AMBIENT_C = T_AMB_REF;

/** One faulted array, in the three units an operator, a trader and a CFO each use. */
export const ARRAY_DEVIATION_PCT = DEV_ARRAY_PCT;
export const STRING_DEVIATION_PCT = DEV_STRING_PCT;
export const SHORTFALL_KW = REFERENCE_SHORTFALL_KW;
export const DAILY_LOSS_MWH = dailyLossMWh(REFERENCE_SHORTFALL_KW);
export const LOSS_72H_MWH = projected72hLossMWh(REFERENCE_SHORTFALL_KW);

export const FAULTED_STRING_COUNT = FAULTED_STRINGS;
export const STRINGS = STRINGS_PER_ARRAY;

/** The deadline the prognosis stage computes from the thermal-dose model. */
export const ACT_BEFORE = forecast.actBefore;
export const PEAK_AMBIENT_C = forecast.peakAmbientC;
export const CLEAR_HOURS = forecast.clearHours;

/**
 * The detector's real output. `Cracked` AP@50 on the held-out test split, and the
 * confidence it returned on an evidence image it had never seen. Reported per class
 * with its split — §0 rule 6, and the reason `apPerClass` is carried through the
 * artefact manifest rather than collapsed to a mean.
 */
export const DETECTION_CONFIDENCE = detection?.confidence ?? null;
export const CRACKED_AP50 = detection?.apPerClass?.Cracked ?? null;
export const DETECTOR_SPLIT = detection?.split ?? null;
export const DETECTOR_MODEL = detection?.model ?? null;
