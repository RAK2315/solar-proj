/**
 * src/lib/basis.ts — the verb the console is allowed to use about an array.
 *
 * Rule §0.5 of CLAUDE.md, as words. We hold one real thermal capture, of B-17.
 * So B-17 can be DIAGNOSED, once a drone has been and the capture is on file, and
 * every other array is FLAGGED from its modelled signature however certain the
 * model is. `check:literals` fails the build on the first verb appearing anywhere
 * but through this function.
 */

import { hasCapturedEvidence } from './data';

export type EvidenceBasis = 'captured' | 'telemetry' | 'modelled' | 'nominal';

export function basisFor(panelId: string, inspected: boolean, healthy: boolean): EvidenceBasis {
  if (healthy) return 'nominal';
  if (!hasCapturedEvidence(panelId)) return 'modelled';
  // The capture exists, but the console has no business quoting it before a
  // drone has flown the inspection that produced it.
  return inspected ? 'captured' : 'telemetry';
}

export const BASIS_PHRASE: Record<EvidenceBasis, string> = {
  captured: 'Diagnosed from a thermal capture',
  telemetry: 'Flagged from telemetry, not yet inspected',
  modelled: 'Flagged from modelled signature',
  nominal: 'Within tolerance',
};
