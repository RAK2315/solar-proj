/**
 * src/lib/impact.ts — what a set of hazards did to the plan, in one line.
 *
 * Two queues at the same site second, one with the hazards and one without, and
 * the difference between them. Nothing here is stored: the baseline is derived
 * every time, so removing a hazard restores the sentence along with the site.
 */

import type { LiveQueue } from './queue';

export interface HazardImpact {
  /** Arrays a footprint is over, or every array under a heatwave. */
  affected: number;
  /** Jobs in the queue that would not be there without the hazards. */
  added: number;
  /** Jobs that were already queued and now sit at a different rank. */
  displaced: number;
  /** The array at the top of the queue, and whether it was there before. */
  first: string | null;
  firstHeld: boolean;
  /** How far the top job's deadline moved, in hours. Negative is sooner. */
  firstDeadlineShiftH: number | null;
  /** Site output against the same second without the hazards, in MW. */
  outputDeltaMW: number;
}

export function hazardImpact(
  base: LiveQueue, now: LiveQueue, affected: number, outputDeltaMW = 0,
): HazardImpact {
  const before = new Map(base.tasks.map((t, i) => [t.panelId, { rank: i, hours: t.hoursUntilDeadline }]));
  let added = 0;
  let displaced = 0;
  now.tasks.forEach((t, i) => {
    const was = before.get(t.panelId);
    if (!was) added += 1;
    else if (was.rank !== i) displaced += 1;
  });

  const first = now.tasks[0] ?? null;
  const firstWas = first ? before.get(first.panelId) : undefined;
  return {
    affected,
    added,
    displaced,
    first: first?.panelId ?? null,
    firstHeld: Boolean(first) && base.tasks[0]?.panelId === first?.panelId,
    firstDeadlineShiftH: first && firstWas ? first.hoursUntilDeadline - firstWas.hours : null,
    outputDeltaMW,
  };
}
