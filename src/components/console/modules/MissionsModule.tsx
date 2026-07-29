'use client';

/**
 * MISSIONS — the flight log.
 *
 * Every dispatch this session has made, what it was sent to look at, and what came
 * back. The phase column is derived from site time on every render rather than
 * stored on the mission, which is why scrubbing time backwards rewinds the log
 * instead of leaving rows stuck at COMPLETE.
 */

import { num } from '@/lib/format';
import { panelLabel } from '@/lib/queue';
import {
  useAllMissions, useSetModule, useSiteFrame, useWorkOrders,
} from '@/store/selectors';
import { MISSION, MISSION_TOTAL, type MissionPhase } from '@/store/session';
import { Block, Cell, Empty, ModuleShell, Table } from './ModuleShell';

const PHASE_COLOUR: Record<MissionPhase, string> = {
  idle: 'var(--text-muted)',
  outbound: 'var(--sev-active)',
  inspecting: 'var(--sev-warning)',
  returning: 'var(--sev-active)',
  complete: 'var(--text-muted)',
};

/** Site seconds as a duration an operator would read off a stopwatch. */
const dur = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export function MissionsModule() {
  const missions = useAllMissions();
  const orders = useWorkOrders();
  const frame = useSiteFrame();
  const setModule = useSetModule();

  const flown = missions.length;
  const airborne = missions.filter((m) => m.phase !== 'complete').length;
  const orderedPanels = new Set(orders.map((o) => o.panelId));

  return (
    <ModuleShell
      title="Missions"
      subtitle={`${flown} flown · ${airborne} in progress · site clock ${frame.clock}`}
    >
      <Block
        title="Flight log"
        note={flown > 0 ? 'newest first' : undefined}
      >
        {flown === 0 ? (
          <Empty>
            No drone has been dispatched this session. Missions are raised from the
            detail rail after triage asks for physical verification —{' '}
            <button
              className="btn-reset t-data"
              onClick={() => setModule('site')}
              style={{ color: 'var(--sev-active)', textDecoration: 'underline' }}
            >
              go to the site map
            </button>.
          </Empty>
        ) : (
          <Table head={['Mission', 'Drone', 'Target', 'Dispatched', 'Elapsed', 'Phase', 'Outcome']}>
            {missions.map((m) => {
              const inspected = m.elapsed >= MISSION.outbound + MISSION.inspecting;
              return (
                <tr key={m.id}>
                  <Cell first emphasis>{m.id}</Cell>
                  <Cell>{m.droneId}</Cell>
                  <Cell>{panelLabel(m.panelId)}</Cell>
                  <Cell>T+{dur(m.startedAt)}</Cell>
                  <Cell>{dur(Math.min(m.elapsed, MISSION_TOTAL))}</Cell>
                  <Cell colour={PHASE_COLOUR[m.phase]} emphasis>
                    {m.phase.toUpperCase()}
                  </Cell>
                  <Cell colour={
                    orderedPanels.has(m.panelId) ? 'var(--panel-scheduled)'
                      : inspected ? 'var(--text-secondary)' : 'var(--text-muted)'
                  }>
                    {orderedPanels.has(m.panelId) ? 'WORK ORDER RAISED'
                      : inspected ? 'EVIDENCE CAPTURED' : 'IN FLIGHT'}
                  </Cell>
                </tr>
              );
            })}
          </Table>
        )}
      </Block>

      <Block title="Mission profile" note="site seconds, identical for every sortie">
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          {([
            ['Outbound transit', MISSION.outbound],
            ['On station — RGB, thermal, acoustic', MISSION.inspecting],
            ['Return to pad', MISSION.returning],
          ] as const).map(([label, seconds]) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--sp-3)', alignItems: 'center' }}>
              <span className="t-data" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <span
                aria-hidden
                style={{
                  width: `${(seconds / MISSION_TOTAL) * 240}px`, height: 6,
                  background: 'var(--line-active)',
                }}
              />
              <span className="t-data" style={{ color: 'var(--text-primary)', minWidth: 70, textAlign: 'right' }}>
                {num(seconds / 60, 0)} min
              </span>
            </div>
          ))}
        </div>
        <p className="t-micro" style={{ color: 'var(--text-muted)' }}>
          Evidence becomes available at the end of the on-station leg — that is the
          moment the approval gate arms, and it is why an array cannot be approved
          before it has actually been looked at.
        </p>
      </Block>
    </ModuleShell>
  );
}
