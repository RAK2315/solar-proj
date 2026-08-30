'use client';

/**
 * StatusChips — the diagnostic callout under the rail's header.
 *
 * IT USED TO BE CHIPS: two badges and three fragments stacked in a bordered box —
 * `● CRITICAL / suspect: INV-B`, `RISK HIGH / act before 14:00`, a mechanism line,
 * an override line. Five separate readings at equal weight, none of which was a
 * sentence, sitting where the operator looks for the verdict.
 *
 * It is one claim now, on a 4px edge keyed to the severity: what is suspected, by
 * what mechanism, and by when. That is what a diagnostic line in a control room
 * says, and it is the same facts.
 *
 * Every one of those facts is DERIVED, not written by the agent. The suspect
 * component comes from farm.json's wiring (which inverter drives this array), the
 * severity from the panel's status, the mechanism from the site record, and the
 * deadline from whichever calculation actually covers THIS array — see the note on
 * `doseComputed` below. The agent writes prose about these; it never sources them.
 */

import { AlertTriangle, CheckCircle2, MoonStar } from 'lucide-react';

import { getPanel, hasCapturedEvidence } from '@/lib/data';
import { hours } from '@/lib/format';
import {
  useArrayFault, useForecast, useIsDark, useLiveQueue, useMode, useOverride,
  usePanelStatus, useSelectedPanelId,
} from '@/store/selectors';

export function StatusChips() {
  const panelId = useSelectedPanelId();
  const status = usePanelStatus(panelId);
  const forecast = useForecast();
  const panel = getPanel(panelId);
  const dark = useIsDark();
  const fault = useArrayFault(panelId);
  const override = useOverride(panelId);
  const mode = useMode();
  const { tasks } = useLiveQueue();

  /**
   * WHOSE DEADLINE IS THIS. `forecast.actBefore` is a CLOCK HOUR computed from the
   * cracked cell's own thermal dose, and that calculation exists for the array we
   * hold a thermal capture of and for no other. This block used to print it under
   * every critical array — inject a fault on C-12 and the console would tell an
   * operator to act before an hour nobody had computed for it. That is the most
   * repeated bug in this project, in its fifth location.
   *
   * So: the clock hour only where the measurement behind it exists. Every other
   * critical array quotes ITS OWN deadline out of the ranked queue, in hours, which
   * is a figure `liveQueueAt` actually derives for it.
   */
  const doseComputed = mode === 'demo' || hasCapturedEvidence(panelId);
  const ownDeadlineH = tasks.find((t) => t.panelId === panelId)?.hoursUntilDeadline;

  if (!panel) return null;

  const critical = status === 'critical';
  const degraded = status === 'warning';

  const colour = critical ? 'var(--sev-critical)'
    : status === 'scheduled' ? 'var(--panel-scheduled)'
      : degraded ? 'var(--sev-warning)' : 'var(--sev-active)';
  const ink = critical ? 'var(--sev-critical-ink)'
    : status === 'scheduled' ? 'var(--panel-scheduled)'
      : degraded ? 'var(--sev-warning-ink)' : 'var(--sev-active)';

  const heading = critical ? 'Diagnostic: risk high'
    : status === 'scheduled' ? 'Diagnostic: work scheduled'
      : degraded ? 'Diagnostic: degraded'
        : dark ? 'Diagnostic: not evaluable' : 'Diagnostic: within tolerance';

  const Icon = critical || degraded ? AlertTriangle : dark ? MoonStar : CheckCircle2;

  return (
    <div className="keyed" style={{ color: colour, background: 'var(--surface-high)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <Icon size={15} strokeWidth={2} aria-hidden style={{ color: ink }} />
        <span className="t-h2" style={{ color: 'var(--text-primary)', letterSpacing: '0.12em' }}>
          {heading}
        </span>
      </span>

      <p className="t-prose" style={{
        color: 'var(--text-secondary)', margin: 0, fontSize: 12, lineHeight: 1.5,
      }}>
        Suspect{' '}
        <span className="t-data-em" style={{ color: 'var(--text-primary)' }}>
          {panel.inverterId}
        </span>
        {/* The mechanism, when the site record actually holds one. Named rather than
            inferred from the shape of the shortfall. */}
        {fault?.mechanism ? <> — {fault.mechanism.toLowerCase()}</> : null}
        {fault?.injected && (
          <span style={{ color: 'var(--sev-warning-ink)' }}> · injected by operator</span>
        )}
        {'. '}
        {/* A deadline only exists if something is actually degrading, and only in
            the units the calculation behind it supports. A healthy array gets no
            hour at all — printing one would be the clearest possible sign that this
            block is decoration rather than a readout. */}
        {critical && doseComputed ? (
          <>
            Act before{' '}
            <span className="t-data-em" style={{ color: ink }}>{forecast.actBefore}</span>
            {' '}— cell temperature crosses the crack-propagation threshold at that hour.
          </>
        ) : critical && ownDeadlineH !== undefined ? (
          <>
            Critical. Booked maintenance window closes in{' '}
            <span className="t-data-em" style={{ color: ink }}>{hours(ownDeadlineH)}</span>
            . No cell-level capture on file for {panelId}, so there is no
            crack-propagation hour computed for it.
          </>
        ) : critical ? (
          <>
            Critical on output. No capture and no booked window on the site record for{' '}
            {panelId}, so nothing here fixes an hour to act by.
          </>
        ) : status === 'scheduled'
          // WORK IS APPROVED. This branch did not exist, so a scheduled array fell
          // through to the healthy sentence and the console printed "Within
          // tolerance. No intervention scheduled." directly under a SCHEDULED badge,
          // beside a −41.7 % deviation and a named crack mechanism. Three claims,
          // two of them false, in one box.
          ? 'Work approved by an operator. A crew is assigned; the fault is still '
            + 'present until they reach it.'
          : dark
            // At zero irradiance `healthy` means "producing nothing, as expected",
            // which is not the same claim and must not be printed as if it were.
            ? 'No generation at this hour. Status cannot be evaluated from output until '
              + 'sunrise; any known fault is carried forward below.'
            : degraded
              ? 'Degraded. Monitor; no hard deadline yet.'
              : 'Within tolerance. No intervention scheduled.'}
      </p>

      {override && (
        <span className="t-micro" style={{ color: 'var(--sev-warning-ink)' }}>
          OVERRIDDEN by operator — {override.reason}
        </span>
      )}
    </div>
  );
}
