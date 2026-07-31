/**
 * src/lib/liveEvents.ts — the live console's event feed.
 *
 * Demo mode replays a written script. Live mode has no script: events are DERIVED
 * from what has actually happened — a fault crossing a threshold, a drone leaving,
 * a drone arriving, an operator raising a work order.
 *
 * Same shape as the scripted events, so the feed component does not care which it
 * is rendering. Pure: given the same site time and the same operator actions it
 * returns the same list, which is why live mode is still reproducible.
 */

import { clockAt } from './physics';
import {
  allEvents, faultProgressAt, forecastOffset, liveFrameAt, scenario,
  type ScenarioEvent,
} from './live';
import type { DemoEvent, Severity } from './types';
import type { Mission, WorkOrder } from '@/store/session';
import { MISSION, missionPhaseAt } from '@/store/session';

const ev = (
  id: string,
  siteSeconds: number,
  source: DemoEvent['source'],
  severity: Severity,
  title: string,
  body: string,
  linkedPanelId?: string,
): DemoEvent => ({
  id,
  t: siteSeconds,
  timestamp: clockAt(forecastOffset(siteSeconds)),
  source,
  severity,
  title,
  body,
  expandable: false,
  ...(linkedPanelId ? { linkedPanelId } : {}),
});

/**
 * Everything that has happened up to `siteSeconds`, newest first.
 *
 * Nothing here is stored per-frame: the feed is recomputed from site time plus the
 * operator's own actions, so it cannot drift out of step with the map or the
 * detail panel the way a separately-accumulated log would.
 */
export function liveEvents(
  siteSeconds: number,
  missions: Mission[],
  workOrders: WorkOrder[],
  injected: readonly ScenarioEvent[] = [],
): DemoEvent[] {
  const out: DemoEvent[] = [];

  out.push(ev('live-boot', 0, 'SYSTEM', 'info', 'MONITORING ACTIVE',
    '120 arrays polled on a 60-second cycle. Site model live.'));

  // One evaluation of the site, not one per fault. Hoisted when a second and third
  // fault landed and this became a 360-array loop inside a render.
  const frame = liveFrameAt(siteSeconds, new Set(), injected);

  // Faults, as they cross the thresholds that make them visible.
  for (const event of allEvents(injected)) {
    const startSeconds = (event.startHour - scenario.epochHour) * 3600;
    if (siteSeconds < startSeconds) continue;

    const progress = faultProgressAt(event, siteSeconds);
    const reading = frame.panels[event.panelId];
    if (!reading) continue;

    // The moment the deviation first became reportable, not the moment we noticed.
    const rampSeconds = event.rampMinutes * 60;
    const crossedWarning = startSeconds + rampSeconds * 0.2;
    const crossedCritical = startSeconds + rampSeconds * 0.4;

    // The source names the array the event is ABOUT. It used to read "PANEL B-17"
    // for every fault on the site, which was invisible while B-17 was the only one.
    const source = `PANEL ${event.panelId}`;
    const provenance = event.injected ? ' Injected by operator.' : '';

    if (siteSeconds >= crossedWarning) {
      out.push(ev(`live-${event.id}-warn`, crossedWarning, source, 'warning',
        `OUTPUT DEVIATION — ${event.panelId}`,
        `${event.panelId} is ${Math.abs(reading.deviationPct).toFixed(1)}% below expected `
        + `at ${frame.irradiance.toFixed(0)} W/m².${provenance}`,
        event.panelId));
    }

    // Only if it ACTUALLY reaches critical. A two-string hairline tops out in
    // warning, and announcing a critical shortfall over it would be the feed
    // asserting a severity the physics never produced.
    if (siteSeconds >= crossedCritical && progress > 0.4 && reading.status === 'critical') {
      out.push(ev(`live-${event.id}-crit`, crossedCritical, source, 'critical',
        `CRITICAL SHORTFALL — ${event.panelId}`,
        'Telemetry cannot separate soiling from physical damage. '
        + 'Physical verification required.',
        event.panelId));
    }
  }

  // Missions, as the operator flew them. Sourced to the drone that actually flew.
  for (const m of missions) {
    const phase = missionPhaseAt(m, siteSeconds);
    out.push(ev(`${m.id}-dispatch`, m.startedAt, m.droneId, 'active',
      `${m.droneId} DISPATCHED — ${m.panelId}`,
      `Operator dispatched ${m.droneId} to ${m.panelId}. Battery 88%.`,
      m.panelId));

    if (phase === 'inspecting' || phase === 'returning' || phase === 'complete') {
      out.push(ev(`${m.id}-lock`, m.startedAt + MISSION.outbound, m.droneId, 'active',
        `TARGET LOCK — ${m.panelId}`,
        `${m.droneId} on station. RGB and thermal passes starting.`,
        m.panelId));
    }

    if (phase === 'returning' || phase === 'complete') {
      out.push(ev(`${m.id}-evidence`,
        m.startedAt + MISSION.outbound + MISSION.inspecting,
        m.droneId, 'warning',
        `EVIDENCE UPLINKED — ${m.panelId}`,
        'RGB, thermal and inverter acoustic captured. Returning to pad.',
        m.panelId));
    }
  }

  // Work orders, as the operator raised them.
  for (const w of workOrders) {
    out.push(ev(`${w.id}-created`, w.createdAt, 'INSPECTION QUEUE', 'active',
      `WORK ORDER #${w.id} CREATED`,
      `${w.panelId} scheduled. ${w.note}`,
      w.panelId));
  }

  return out
    .filter((e) => e.t <= siteSeconds)
    .sort((a, b) => b.t - a.t);
}
