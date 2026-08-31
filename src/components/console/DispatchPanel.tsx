'use client';

/**
 * DispatchPanel — the operator sends a drone to the array they have selected.
 *
 * This is the thing the scripted demo could not have: an action that happens
 * because a person decided it should, to an array they chose, at a moment they
 * chose. The demo's dispatch is a beat at t=18; this is a decision.
 *
 * What it does NOT change: the physics. A drone arriving does not alter what the
 * array is producing — it produces evidence about WHY. The reading was already
 * true before anyone looked, which is the honest model of an inspection and also
 * why the detail panel shows telemetry immediately but withholds cell-level
 * findings until a drone has actually been.
 *
 * Live mode only. Demo mode has its own scripted dispatch.
 */

import { hasCapturedEvidence } from '@/lib/data';
import { hours, pctPlain } from '@/lib/format';
import {
  useActiveMissions, useIncident, useInspected, usePanelStatus, useSelectedPanelId,
  useSiteSeconds,
} from '@/store/selectors';
import { MISSION, MISSION_TOTAL, useSession } from '@/store/session';

const fmtSiteMinutes = (seconds: number) => `${Math.max(0, Math.round(seconds / 60))} min`;

export function DispatchPanel() {
  const panelId = useSelectedPanelId();
  const status = usePanelStatus(panelId);
  const siteSeconds = useSiteSeconds();
  const missions = useActiveMissions();
  const inspected = useInspected(panelId);
  const dispatch = useSession((s) => s.dispatch);
  // What is actually wrong, and therefore whether imaging would add anything.
  const { cause } = useIncident(panelId);

  const mission = missions.find((m) => m.panelId === panelId);
  const captured = hasCapturedEvidence(panelId);
  const dronesBusy = missions.length;
  const canDispatch = !mission && !inspected && dronesBusy < 2;

  if (inspected && !mission) {
    return (
      <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <span className="t-data" style={{ color: 'var(--panel-scheduled)' }}>
          ✓ {panelId} inspected, drone completed both passes
        </span>
        {/* This line used to read "evidence captured" for every array, and then sat
            directly above a paragraph explaining that no capture exists. Two
            statements, flatly contradictory, four lines apart. What the mission
            proves is that the drone went and looked; whether committed imagery
            came back is a separate fact and is now stated separately. */}
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
          {captured
            ? 'Cell-level findings below are from that inspection.'
            : `No committed imagery for ${panelId} in this build; see below.`}
        </span>
      </div>
    );
  }

  if (mission) {
    const elapsed = siteSeconds - mission.startedAt;
    const phaseLabel = {
      idle: 'PREPARING',
      outbound: 'OUTBOUND',
      inspecting: 'INSPECTING',
      returning: 'RETURNING',
      complete: 'COMPLETE',
    }[mission.phase];

    const pct = Math.min(100, (elapsed / MISSION_TOTAL) * 100);
    const remaining = mission.phase === 'outbound'
      ? MISSION.outbound - elapsed
      : MISSION.outbound + MISSION.inspecting - elapsed;

    return (
      <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="t-data-em">{mission.droneId}</span>
          <span className="chip" style={{ background: 'var(--sev-active)' }}>{phaseLabel}</span>
        </div>
        <span style={{ height: 6, background: 'var(--surface-high)', display: 'block' }}>
          <span style={{
            display: 'block', height: '100%', width: `${pct}%`,
            background: 'var(--sev-active)', transition: 'width 200ms linear',
          }} />
        </span>
        <div className="t-micro" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
          <span>{mission.id} → {mission.panelId}</span>
          <span>
            {mission.phase === 'returning'
              ? 'evidence uplinked'
              : `${fmtSiteMinutes(remaining)} to ${mission.phase === 'outbound' ? 'target' : 'complete'}`}
          </span>
        </div>
      </div>
    );
  }

  // THE AGENT'S ANSWER DECIDES HOW THIS READS. It used to say "dispatch to find
  // out which" for ANY deviating array — including one the console had just
  // diagnosed as dirt four lines above, with "do not fly a drone" written out in
  // full. Two flatly opposed instructions in one panel.
  //
  // The button never disappears: an operator can always overrule the agent, and a
  // recommendation you cannot ignore is an order. But when the agent does not
  // want the sortie, the panel says so and the button stops being the loud one.
  const wantsDrone = status === 'healthy' || cause.needsDrone;

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
      <p className="t-data" style={{ color: 'var(--text-secondary)', margin: 0 }}>
        {status === 'healthy'
          ? `${panelId} is within tolerance. Telemetry cannot rule out early soiling or a hairline crack, only imaging can.`
          : wantsDrone
            ? `${panelId} is deviating and telemetry cannot say which module. Imaging can.`
            : cause.action}
      </p>

      <button
        type="button"
        onClick={() => dispatch(panelId)}
        disabled={!canDispatch}
        className="btn-reset t-h1"
        style={{
          boxSizing: 'border-box',
          width: '100%',
          textAlign: 'center',
          padding: wantsDrone ? 'var(--sp-4)' : 'var(--sp-3)',
          background: canDispatch && wantsDrone ? 'var(--sev-active)' : 'transparent',
          border: canDispatch && !wantsDrone ? '1px solid var(--line-active)' : 'none',
          color: canDispatch && wantsDrone
            ? 'var(--text-inverse)'
            : 'var(--text-secondary)',
          letterSpacing: '0.12em',
        }}
      >
        {!canDispatch
          ? 'BOTH DRONES COMMITTED'
          : wantsDrone
            ? `DISPATCH DRONE → ${panelId}`
            : `FLY ANYWAY → ${panelId}`}
      </button>

      <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
        {dronesBusy > 0 && `${dronesBusy} of 2 airborne · `}
        round trip {hours(MISSION_TOTAL / 3600)} site time · battery {pctPlain(88)}
      </span>
    </div>
  );
}
