/**
 * src/lib/repair.ts — how long each kind of repair keeps a crew on an array.
 *
 * DECLARED ASSUMPTIONS, NOT SOURCED FIGURES. No primary source for crew times on
 * this site is held, so these are stated as assumptions and printed behind the
 * `?` on the day plan. What matters to the plan is that they differ: a wash, a
 * reconnection and a module swap do not take the same time, and a schedule in
 * which every job is the same length gives a heuristic nothing to get wrong.
 *
 * The kind of repair is read off the site record and the triage, never typed in:
 *
 *   cleaning   the cause is soiling, including dust a storm left behind
 *   string     a string open at the combiner, which is reconnected, not replaced
 *   module     a cracked module, which is replaced
 *   diode      added to a module job once the crack has held bypass diodes in
 *              conduction on most of the array, because they are then tested and
 *              replaced with it. This is the step the committed recommendation
 *              for B-17 names.
 */

import type { CauseId } from './causes';

export type RepairPart = 'module' | 'diode' | 'cleaning' | 'string' | 'inspection';

/** Hours on the array for each part of a repair, once a crew is there. */
export const REPAIR_PART_HOURS: Record<RepairPart, number> = {
  module: 3.0,
  diode: 1.0,
  cleaning: 1.0,
  string: 0.5,
  inspection: 1.0,
};

export const REPAIR_PART_LABEL: Record<RepairPart, string> = {
  module: 'Module replacement',
  diode: 'Bypass diode test and replacement',
  cleaning: 'Array wash',
  string: 'String reconnection at the combiner',
  inspection: 'Manual inspection, cause not established',
};

/** Strings past which a crack's bypass diodes are serviced with the module. */
export const DIODE_SERVICE_FROM_STRINGS = 5;

/** What the site record says about a fault, as far as the repair depends on it. */
export interface FaultShape { faultedStrings?: number; terminalMismatch?: number }

export interface Repair { parts: RepairPart[]; hours: number }

const NOTHING: Repair = { parts: [], hours: 0 };

export function repairFor(cause: CauseId, fault?: FaultShape): Repair {
  let parts: RepairPart[];
  if (cause === 'soiling') parts = ['cleaning'];
  else if (cause === 'unexplained') parts = ['inspection'];
  else if (cause !== 'crack') return NOTHING;                  // shading, or no fault: nothing to repair
  else if (fault?.terminalMismatch === 0) parts = ['string'];
  else if ((fault?.faultedStrings ?? 0) >= DIODE_SERVICE_FROM_STRINGS) parts = ['module', 'diode'];
  else parts = ['module'];
  return { parts, hours: parts.reduce((sum, p) => sum + REPAIR_PART_HOURS[p], 0) };
}
