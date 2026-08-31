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

import { cellGrid, hasCapturedEvidence } from './data';
import { clockAt } from './physics';
import {
  allEvents, faultProgressAt, forecastOffset, liveFrameAt, scenario,
  type ScenarioEvent,
} from './live';
import type { DemoEvent, Severity } from './types';
import type { Mission } from '@/store/session';
import { MISSION, missionPhaseAt } from '@/store/session';

/** The band's mean rise, formatted. Measured, never authored - see I10. */
function hotBand(grid: typeof cellGrid): string {
  const rises = grid.defects.map((d) => d.deltaTC);
  if (!rises.length) return 'no measurable rise';
  const mean = rises.reduce((a, b) => a + b, 0) / rises.length;
  return `+${mean.toFixed(1)} °C`;
}

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
  injected: readonly ScenarioEvent[] = [],
  /**
   * Arrays an operator has already raised a work order on.
   *
   * Their alarms leave the feed. An alarm is a request for a decision, and once
   * the decision is made it is answered: the array reads SCHEDULED on the map,
   * the order is on the Repairs screen, and the footer counts it. Leaving four
   * red cards about B-17 at the top of the rail after approving B-17 makes the
   * feed look like the approval did nothing.
   *
   * One line replaces them, so the thread ends where a reader can see it end
   * rather than simply vanishing.
   */
  scheduled: ReadonlySet<string> = new Set(),
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
        `OUTPUT DEVIATION · ${event.panelId}`,
        `${event.panelId} is ${Math.abs(reading.deviationPct).toFixed(1)}% below expected `
        + `at ${frame.irradiance.toFixed(0)} W/m².${provenance}`,
        event.panelId));
    }

    // Only if it ACTUALLY reaches critical. A two-string hairline tops out in
    // warning, and announcing a critical shortfall over it would be the feed
    // asserting a severity the physics never produced.
    if (siteSeconds >= crossedCritical && progress > 0.4 && reading.status === 'critical') {
      out.push(ev(`live-${event.id}-crit`, crossedCritical, source, 'critical',
        `CRITICAL SHORTFALL · ${event.panelId}`,
        'Telemetry cannot separate soiling from physical damage. '
        + 'Physical verification required.',
        event.panelId));
    }
  }

  // Missions, as the operator flew them. Sourced to the drone that actually flew.
  for (const m of missions) {
    const phase = missionPhaseAt(m, siteSeconds);
    out.push(ev(`${m.id}-dispatch`, m.startedAt, m.droneId, 'active',
      `${m.droneId} DISPATCHED, ${m.panelId}`,
      `Operator dispatched ${m.droneId} to ${m.panelId}. Battery 88%.`,
      m.panelId));

    if (phase === 'inspecting' || phase === 'returning' || phase === 'complete') {
      out.push(ev(`${m.id}-lock`, m.startedAt + MISSION.outbound, m.droneId, 'active',
        `TARGET LOCK · ${m.panelId}`,
        `${m.droneId} on station. RGB and thermal passes starting.`,
        m.panelId));
    }

    if (phase === 'returning' || phase === 'complete') {
      out.push(ev(`${m.id}-evidence`,
        m.startedAt + MISSION.outbound + MISSION.inspecting,
        m.droneId, 'warning',
        `EVIDENCE UPLINKED · ${m.panelId}`,
        'RGB, thermal and inverter acoustic captured. Returning to pad.',
        m.panelId));

      // WHAT THE PASS FOUND, not only that it ran. The log read "RGB and thermal
      // passes starting" and then never said what came back, so the one moment
      // the product exists for - a physical finding a spreadsheet cannot produce
      // - went unannounced on the biggest text on screen.
      //
      // Scoped, as everything about captured imagery is: a measured thermal
      // result exists for B-17 and for no other array. Everywhere else this says
      // what is true there, which is that the diagnosis rests on telemetry.
      out.push(ev(`${m.id}-finding`,
        m.startedAt + MISSION.outbound + MISSION.inspecting + 1,
        'SURFACE SCAN', hasCapturedEvidence(m.panelId) ? 'critical' : 'info',
        // The title has to be true of the array too. "THERMAL FINDING" over
        // "no thermal capture is held" is the heading arguing with the body.
        hasCapturedEvidence(m.panelId)
          ? `THERMAL FINDING · ${m.panelId}`
          : `INSPECTION RESULT · ${m.panelId}`,
        hasCapturedEvidence(m.panelId)
          ? `Thermal: ${cellGrid.defects.length} cells hot in row `
            + `${cellGrid.defects[0]?.row ?? 2}, ${hotBand(cellGrid)} above the array `
            + 'median, one connected cluster - the signature of a bypassed substring.'
          : `No thermal capture is held for ${m.panelId}. The diagnosis rests on `
            + 'per-string telemetry and the site record, and says so.',
        m.panelId));
    }
  }

  // The approved arrays, collapsed to one line each. The events themselves are
  // dropped below; this is what is left of the thread.
  for (const panelId of scheduled) {
    out.push(ev(`scheduled-${panelId}`, siteSeconds, `PANEL ${panelId}`, 'info',
      `SCHEDULED · ${panelId}`,
      `An operator approved the work on ${panelId}. Its alarms are answered and `
      + 'have left this feed; the job is on the Repairs screen.',
      panelId));
  }

  return out
    .filter((e) => e.t <= siteSeconds)
    // An array with a work order keeps only its SCHEDULED line.
    .filter((e) => !e.linkedPanelId
      || !scheduled.has(e.linkedPanelId)
      || e.id.startsWith('scheduled-'))
    .sort((a, b) => b.t - a.t);
}
