/**
 * src/lib/queue.ts — the repair queue, derived from the site as it is right now.
 *
 * The committed `repair_queue.json` is a snapshot at the demo's reference hour.
 * That is the right thing for the scripted replay and the wrong thing for a live
 * console, where an array's shortfall changes hour by hour and a queue that never
 * moves is a picture of a queue.
 *
 * So live mode recomputes the one field that is a measurement — the energy being
 * lost — from the model at the current moment, and takes the two fields that are
 * SITE FACTS rather than physics from the committed record:
 *
 *   hoursUntilDeadline  the cleaning window a crew is already booked for, or the
 *                       computed crack-propagation deadline for the faulted array
 *   accessCost          how far the truck has to drive
 *
 * Neither of those is derivable from irradiance, and inventing them per-frame
 * would be exactly the failure this project is built to avoid. An anomalous array
 * with no committed record is REPORTED, not guessed at — see `unscheduled`.
 *
 * Ranking itself is untouched: `rankQueue` from lib/ranking, the same pure
 * function the build-time invariant uses.
 */

import { irradianceAt, G_REF } from './physics';
import { rankQueue, type RepairTask } from './ranking';
import { forecast, getPanel, repairQueue } from './data';
import { scenario, type LiveFrame } from './live';

/**
 * Scale a shortfall measured at reference conditions across one day's irradiance
 * profile. Mirrors `daily_loss_mwh` in scripts/generate_telemetry.py, so every
 * loss figure in the product — committed or live — comes from the same integral.
 */
const DAY_SCALE = Array.from({ length: 24 }, (_, h) => irradianceAt(h))
  .reduce((a, b) => a + b, 0) / G_REF;

export const dailyLossMWh = (shortfallAtRefKW: number): number =>
  (shortfallAtRefKW * DAY_SCALE) / 1000;

/** The committed record for an array, if the site holds one. */
const committed = new Map(repairQueue.map((t) => [t.panelId, t]));

/** The array carrying the scenario's mismatch fault — the one with a computed deadline. */
const FAULTED_ARRAY = 'B-17';

/**
 * `forecast.actBefore` is a wall clock ("14:00"); the queue counts in hours since
 * the scenario epoch. Converted once, here, rather than parsed per array per frame.
 */
const ACT_BEFORE_ELAPSED_H = (() => {
  const [h, m] = forecast.actBefore.split(':').map(Number);
  return h + m / 60 - scenario.epochHour;
})();

export interface LiveTask extends RepairTask {
  /** Shortfall right now, in kW — what the loss figure is scaled from. */
  shortfallKW: number;
  /** True once an operator has approved work on this array. */
  scheduled: boolean;
}

export interface LiveQueue {
  tasks: LiveTask[];
  /**
   * Arrays that are deviating but carry no committed deadline or access cost, so
   * they cannot be ranked against the others. Surfaced in the UI as exactly that,
   * because a queue that silently drops work is worse than one that says it did.
   */
  unscheduled: string[];
}

/**
 * The queue at a moment. `scheduledIds` are arrays with an approved work order —
 * they stay in the list, marked, rather than vanishing: a crew is on the way and
 * the operator should still see the energy at stake until it is fixed.
 */
export function liveQueueAt(
  frame: LiveFrame,
  scheduledIds: ReadonlySet<string>,
): LiveQueue {
  const tasks: LiveTask[] = [];
  const unscheduled: string[] = [];
  // Hours since the scenario epoch. Every committed deadline is quoted from there,
  // so this is the one subtraction the countdown needs.
  const elapsedH = frame.siteSeconds / 3600;

  for (const [panelId, reading] of Object.entries(frame.panels)) {
    const shortfallKW = reading.expectedKW - reading.actualKW;
    const isScheduled = scheduledIds.has(panelId);

    // A healthy array with no approved work is not queue material. Scheduled ones
    // stay visible even though their reading now reads `scheduled`.
    if (reading.status === 'healthy' && !isScheduled) continue;
    if (shortfallKW <= 0 && !isScheduled) continue;

    const record = committed.get(panelId);
    if (!record) { unscheduled.push(panelId); continue; }

    // Every deadline counts down in real site time. The faulted array's is the
    // computed crack-propagation hour from the forecast; the soiling ones are the
    // cleaning windows already booked in the committed record. Floored just above
    // zero so the urgency term stays finite once a deadline is blown.
    const deadlineElapsedH = panelId === FAULTED_ARRAY
      ? ACT_BEFORE_ELAPSED_H
      : record.hoursUntilDeadline;
    const hoursUntilDeadline = Math.max(0.25, deadlineElapsedH - elapsedH);

    tasks.push({
      ...record,
      severity: isScheduled ? record.severity : severityFor(reading.status, record.severity),
      lossMWhPerDay: Number(dailyLossMWh(shortfallKW).toFixed(2)),
      hoursUntilDeadline: Number(hoursUntilDeadline.toFixed(2)),
      shortfallKW,
      scheduled: isScheduled,
    });
  }

  return { tasks: rankQueue(tasks) as LiveTask[], unscheduled: unscheduled.sort() };
}

/** Queue severity follows the array's live status, not a stored label. */
function severityFor(
  status: string,
  fallback: RepairTask['severity'],
): RepairTask['severity'] {
  if (status === 'critical') return 'critical';
  if (status === 'warning') return 'warning';
  return fallback;
}

/** Human label for an array, for screens that list work without a map next to it. */
export const panelLabel = (id: string): string => {
  const p = getPanel(id);
  return p ? `${id} · Zone ${p.zone} · ${p.inverterId}` : id;
};
