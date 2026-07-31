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

import { crackDeadlineHour, evaluateArray, irradianceAt, G_REF, T_AMB_REF } from './physics';
import { rankQueue, type RepairTask } from './ranking';
import { forecast, getPanel, repairQueue } from './data';
import {
  allPanels, eventFor, referenceReadingAt, scenario,
  type LiveFrame, type ScenarioEvent,
} from './live';

/**
 * Scale a shortfall measured at reference conditions across one day's irradiance
 * profile. Mirrors `daily_loss_mwh` in scripts/generate_telemetry.py, so every
 * loss figure in the product — committed or live — comes from the same integral.
 */
const DAY_SCALE = Array.from({ length: 24 }, (_, h) => irradianceAt(h))
  .reduce((a, b) => a + b, 0) / G_REF;

export const dailyLossMWh = (shortfallAtRefKW: number): number =>
  (shortfallAtRefKW * DAY_SCALE) / 1000;

/**
 * B-17's shortfall at reference conditions, from the model rather than typed.
 * This is the denominator the committed 72-hour integral was computed over.
 */
export const REFERENCE_SHORTFALL_KW = (() => {
  const r = evaluateArray(G_REF, T_AMB_REF, { faultProgress: 1 });
  return r.expectedKW - r.actualKW;
})();

/**
 * The 72-hour projected loss for ANY array, in MWh.
 *
 * Deliberately the committed integral SCALED, not `dailyLossMWh × 3`. The two
 * differ — 3.03 against 3.07 — because the committed figure is a trapezoidal
 * integral over 73 hourly points with the forecast's day-to-day irradiance trend
 * in it, and the daily figure is a single day's shape. Shortfall enters that
 * integral linearly, so scaling it is exact; recomputing it a second way would
 * put two different answers for B-17's loss on the same screen.
 */
export const projected72hLossMWh = (shortfallAtRefKW: number): number =>
  forecast.projected72hLossMWh * (shortfallAtRefKW / REFERENCE_SHORTFALL_KW);

/** The committed record for an array, if the site holds one. */
const committed = new Map(repairQueue.map((t) => [t.panelId, t]));

/**
 * `forecast.actBefore` is a wall clock ("14:00"); the queue counts in hours since
 * the scenario epoch. Converted once, here, rather than parsed per array per frame.
 */
const ACT_BEFORE_ELAPSED_H = (() => {
  const [h, m] = forecast.actBefore.split(':').map(Number);
  return h + m / 60 - scenario.epochHour;
})();

/**
 * When a cracked array becomes unrecoverable, in hours since the epoch.
 *
 * A crack's deadline is COMPUTED — the hour its cumulative time above the
 * propagation threshold reaches the declared dose budget — which is the whole
 * claim the prognosis stage makes. It used to be a lookup that only B-17 could
 * satisfy, so a second cracked array fell out of the queue entirely and was
 * reported as "unrankable". Nothing about it was unrankable; the deadline was
 * just never asked for.
 *
 * B-17's answer is checked against the committed forecast rather than trusted:
 * the two are computed by the same dose model in two languages, and if they ever
 * disagree the committed value wins and the divergence is a build failure
 * (queue.test.ts).
 */
function crackDeadlineElapsedH(event: ScenarioEvent): number {
  const startOffset = event.startHour - scenario.epochHour;
  return crackDeadlineHour(startOffset) ?? ACT_BEFORE_ELAPSED_H;
}

export interface LiveTask extends RepairTask {
  /**
   * Shortfall at REFERENCE conditions, in kW — what the loss figure is scaled
   * from, and why the queue does not empty itself every night.
   */
  shortfallKW: number;
  /** True once an operator has approved work on this array. */
  scheduled: boolean;
  /** True when the fault was injected by the operator rather than committed. */
  injected: boolean;
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
  injected: readonly ScenarioEvent[] = [],
): LiveQueue {
  const tasks: LiveTask[] = [];
  const unscheduled: string[] = [];
  // Hours since the scenario epoch. Every deadline is quoted from there, so this
  // is the one subtraction the countdown needs.
  const elapsedH = frame.siteSeconds / 3600;

  for (const panel of allPanels) {
    const panelId = panel.id;
    const isScheduled = scheduledIds.has(panelId);
    const event = eventFor(panelId, injected);

    // Both the shortfall and the status come from the array evaluated at
    // REFERENCE conditions, not at the current hour. A cracked array is cracked
    // at midnight; reading it off the live frame emptied the whole queue at
    // sunset and refilled it at dawn.
    const ref = referenceReadingAt(panelId, frame.siteSeconds, injected);
    const shortfallKW = ref.expectedKW - ref.actualKW;

    if (ref.status === 'healthy' && !isScheduled) continue;
    if (shortfallKW <= 0 && !isScheduled) continue;

    const record = committed.get(panelId);

    // A crack's deadline is computed from the dose model; a soiling deadline is a
    // cleaning window already booked, which only the committed record knows.
    // Neither is guessed at, and an array with neither is reported rather than
    // given a made-up one. Floored just above zero so the urgency term stays
    // finite once a deadline is blown.
    const deadlineElapsedH = event
      ? crackDeadlineElapsedH(event)
      : record?.hoursUntilDeadline;
    if (deadlineElapsedH === undefined) { unscheduled.push(panelId); continue; }

    const accessCost = event?.accessCost ?? record?.accessCost ?? 1.0;

    tasks.push({
      id: record?.id ?? `INC-${panelId.replace('-', '')}`,
      panelId,
      accessCost,
      severity: isScheduled && record
        ? record.severity
        : severityFor(ref.status, record?.severity ?? 'warning'),
      lossMWhPerDay: Number(dailyLossMWh(shortfallKW).toFixed(2)),
      hoursUntilDeadline: Number(Math.max(0.25, deadlineElapsedH - elapsedH).toFixed(2)),
      shortfallKW,
      scheduled: isScheduled,
      injected: Boolean(event?.injected),
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
