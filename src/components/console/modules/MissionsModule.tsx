'use client';

/**
 * MISSIONS — the flight log.
 *
 * Every dispatch this session has made, what it was sent to look at, and what came
 * back. The phase column is derived from site time on every render rather than
 * stored on the mission, which is why scrubbing time backwards rewinds the log
 * instead of leaving rows stuck at COMPLETE.
 *
 * THE PHASE COLUMN IS A TRACK, not a word. A mission has three legs and an operator
 * wants to know which one it is on and how far through — a text label gives the
 * first and not the second. The three segments light in order and the active one is
 * named, so the row reads as a progress readout without a second clock: the widths
 * come from `progress`, which is a function of site time.
 *
 * The FILTER control is a real filter over the log, and NEW MISSION goes to the map,
 * because a mission cannot be raised from a list — it needs an array selected and a
 * triage verdict asking for verification. A button here that opened a form would be
 * offering a capability the dispatcher does not have.
 */

import { useState } from 'react';
import { Filter, Plus } from 'lucide-react';

import { num } from '@/lib/format';
import { panelLabel } from '@/lib/queue';
import {
  useAllMissions, useSetModule, useSiteFrame, useWorkOrders,
} from '@/store/selectors';
import { MISSION, MISSION_TOTAL, type MissionPhase } from '@/store/session';
import { Action, Block, Cell, Empty, ModuleShell, Table } from './ModuleShell';

const PHASE_COLOUR: Record<MissionPhase, string> = {
  idle: 'var(--text-secondary)',
  outbound: 'var(--sev-active)',
  inspecting: 'var(--sev-warning)',
  returning: 'var(--sev-active)',
  complete: 'var(--text-secondary)',
};

/** Site seconds as a duration an operator would read off a stopwatch. */
const dur = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const LEGS = [
  ['Outbound', MISSION.outbound],
  ['Inspecting', MISSION.inspecting],
  ['Returning', MISSION.returning],
] as const;

/** Three segments, each filled by how far the sortie has come through that leg. */
function PhaseTrack({ elapsed, phase }: { elapsed: number; phase: MissionPhase }) {
  // The two phases with no legs to show. `idle` is a mission whose dispatch is
  // ahead of the current site time — scrub back before a sortie and it has not
  // happened yet, so an empty outbound bar would claim it is already flying.
  if (phase === 'complete' || phase === 'idle') {
    return (
      <span className="t-data" style={{ color: 'var(--text-secondary)' }}>
        {phase.toUpperCase()}
      </span>
    );
  }

  let consumed = 0;
  return (
    <span style={{ display: 'grid', gap: 4, minWidth: 260 }}>
      <span style={{ display: 'flex', gap: 'var(--sp-3)' }}>
        {LEGS.map(([name]) => (
          <span
            key={name}
            className="t-micro"
            style={{
              flex: 1,
              color: name.toLowerCase() === phase ? 'var(--sev-active)' : 'var(--text-secondary)',
            }}
          >
            {name.toUpperCase()}
          </span>
        ))}
      </span>
      <span style={{ display: 'flex', gap: 'var(--sp-3)' }} aria-hidden>
        {LEGS.map(([name, seconds]) => {
          const into = Math.max(0, Math.min(seconds, elapsed - consumed));
          consumed += seconds;
          return (
            <span key={name} style={{ flex: 1, height: 3, background: 'var(--surface-high)' }}>
              <span style={{
                display: 'block', height: '100%', background: 'var(--sev-active)',
                width: `${(into / seconds) * 100}%`,
              }} />
            </span>
          );
        })}
      </span>
    </span>
  );
}

type Outcome = 'ordered' | 'captured' | 'flying';

const OUTCOME: Record<Outcome, { label: string; colour: string }> = {
  ordered: { label: 'WORK ORDER RAISED', colour: 'var(--panel-scheduled)' },
  captured: { label: 'EVIDENCE CAPTURED', colour: 'var(--text-primary)' },
  flying: { label: 'IN FLIGHT', colour: 'var(--sev-active)' },
};

export function MissionsModule() {
  const missions = useAllMissions();
  const orders = useWorkOrders();
  const frame = useSiteFrame();
  const setModule = useSetModule();

  // A view preference over a derived list — the same class of state as the feed's
  // SHOW ALL. It does not mirror the clock, so scrubbing cannot leave it wrong.
  const [onlyOpen, setOnlyOpen] = useState(false);

  const flown = missions.length;
  const airborne = missions.filter((m) => m.phase !== 'complete').length;
  const orderedPanels = new Set(orders.map((o) => o.panelId));
  const rows = onlyOpen ? missions.filter((m) => m.phase !== 'complete') : missions;

  return (
    <ModuleShell
      title="Missions"
      purpose={`
        Every inspection flown this session, and what came back, the record that
        shows the agent acted rather than just reported.
      `}
      subtitle={`${flown} flown // ${airborne} in progress // every dispatch this session, and what came back // site clock ${frame.clock}`}
      action={(
        <>
          <Action
            onClick={() => setOnlyOpen((v) => !v)}
            ariaLabel={onlyOpen
              ? 'Show every mission, including completed ones'
              : 'Show only missions still in progress'}
          >
            <Filter size={14} strokeWidth={2} aria-hidden />
            {onlyOpen ? 'In progress' : 'All missions'}
          </Action>
          <Action
            primary
            onClick={() => setModule('site')}
            ariaLabel="Go to the site map to raise a new mission"
          >
            <Plus size={14} strokeWidth={2.5} aria-hidden />
            New mission
          </Action>
        </>
      )}
    >
      <Block
        title="Flight log" wide
        note={flown > 0
          ? `newest first · showing ${rows.length} of ${flown}`
          : undefined}
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
        ) : rows.length === 0 ? (
          <Empty>
            Every mission this session has landed. {flown} in the log, clear the
            filter to read them.
          </Empty>
        ) : (
          <Table head={['Mission', 'Drone', 'Target', 'Dispatched', 'Elapsed', 'Phase', 'Result']}>
            {rows.map((m) => {
              const inspected = m.elapsed >= MISSION.outbound + MISSION.inspecting;
              const outcome: Outcome = orderedPanels.has(m.panelId) ? 'ordered'
                : inspected ? 'captured' : 'flying';
              return (
                <tr key={m.id}>
                  <Cell first emphasis colour="var(--sev-active)">{m.id}</Cell>
                  <Cell>{m.droneId}</Cell>
                  <Cell colour="var(--text-primary)">{panelLabel(m.panelId)}</Cell>
                  <Cell>T+{dur(m.startedAt)}</Cell>
                  <Cell colour={m.phase === 'complete' ? undefined : 'var(--sev-active)'}>
                    {dur(Math.min(m.elapsed, MISSION_TOTAL))}
                  </Cell>
                  <td style={{
                    padding: 'var(--sp-2) var(--sp-3) var(--sp-2) 0',
                    borderBottom: '1px solid var(--line-hairline)',
                    color: PHASE_COLOUR[m.phase],
                  }}>
                    <PhaseTrack elapsed={m.elapsed} phase={m.phase} />
                  </td>
                  <td style={{
                    padding: 'var(--sp-2) 0',
                    borderBottom: '1px solid var(--line-hairline)',
                    textAlign: 'right',
                  }}>
                    <span className="chip" style={{
                      background: 'var(--surface-high)', color: OUTCOME[outcome].colour,
                    }}>
                      {OUTCOME[outcome].label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Block>

      <Block title="Mission profile" note="site seconds, identical for every sortie">
        <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
          {([
            ['Outbound transit', MISSION.outbound],
            ['On station, RGB, thermal, acoustic', MISSION.inspecting],
            ['Return to pad', MISSION.returning],
          ] as const).map(([label, seconds]) => (
            <div key={label} style={{
              display: 'grid', gridTemplateColumns: '280px 1fr auto',
              gap: 'var(--sp-4)', alignItems: 'center',
            }}>
              <span className="t-data" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <span aria-hidden style={{ height: 8, background: 'var(--surface-high)' }}>
                <span style={{
                  display: 'block', height: '100%', background: 'var(--sev-active)',
                  width: `${(seconds / MISSION_TOTAL) * 100}%`,
                }} />
              </span>
              <span className="t-data-em" style={{
                color: 'var(--text-primary)', minWidth: 70, textAlign: 'right',
              }}>
                {num(seconds / 60, 0)} min
              </span>
            </div>
          ))}
        </div>
        <p className="t-micro" style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Evidence becomes available at the end of the on-station leg, that is the
          moment the approval gate arms, and it is why an array cannot be approved
          before it has actually been looked at.
        </p>
      </Block>
    </ModuleShell>
  );
}
