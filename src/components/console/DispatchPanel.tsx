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

import { hours, pctPlain } from '@/lib/format';
import {
  useActiveMissions, useInspected, usePanelStatus, useSelectedPanelId, useSiteSeconds,
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

  const mission = missions.find((m) => m.panelId === panelId);
  const dronesBusy = missions.length;
  const canDispatch = !mission && !inspected && dronesBusy < 2;

  if (inspected && !mission) {
    return (
      <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <span className="t-data" style={{ color: 'var(--panel-scheduled)' }}>
          ✓ Inspected — evidence captured
        </span>
        <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
          Cell-level findings below are from that inspection.
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
          <span className="badge" style={{ color: 'var(--sev-active)' }}>{phaseLabel}</span>
        </div>
        <span style={{ height: 4, background: 'var(--surface-inset)', display: 'block' }}>
          <span style={{
            display: 'block', height: '100%', width: `${pct}%`,
            background: 'var(--sev-active)', transition: 'width 200ms linear',
          }} />
        </span>
        <div className="t-micro" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
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

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
      <p className="t-data" style={{ color: 'var(--text-secondary)', margin: 0 }}>
        {status === 'healthy'
          ? `${panelId} is within tolerance. Telemetry cannot rule out early soiling or a hairline crack — only imaging can.`
          : `${panelId} is deviating. Telemetry alone cannot separate soiling from physical damage; dispatch to find out which.`}
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
          padding: 'var(--sp-3) var(--sp-4)',
          background: canDispatch ? 'var(--sev-active)' : 'var(--surface-raised)',
          color: canDispatch ? 'var(--text-inverse)' : 'var(--text-muted)',
          border: canDispatch ? 'none' : '1px solid var(--line-active)',
          fontSize: 13,
          letterSpacing: '0.12em',
        }}
      >
        {canDispatch ? `DISPATCH DRONE → ${panelId}` : 'BOTH DRONES COMMITTED'}
      </button>

      <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
        {dronesBusy > 0 && `${dronesBusy} of 2 airborne · `}
        round trip {hours(MISSION_TOTAL / 3600)} site time · battery {pctPlain(88)}
      </span>
    </div>
  );
}
