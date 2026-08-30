'use client';

/**
 * DRONES — the fleet screen.
 *
 * Two aircraft, their state derived entirely from the missions in the session.
 * Nothing here is stored per drone: status, target, battery and sortie count are
 * all functions of what has been dispatched and what time it is, which is why the
 * PiP copy of the console shows exactly the same thing.
 *
 * REBUILT AS TWO AIRCRAFT PANELS. It was two small cards of label/value rows, which
 * is the shape of a settings list and not the shape of a vehicle readout. Each
 * aircraft now gets a slab with its ident set large, its battery as the headline
 * figure with a coarse segmented gauge, a 2×2 of assignment fields, and a payload
 * pane that is either a live feed surface or says the aircraft is docked.
 *
 * The payload pane does NOT show video. The drone is a simulation and there is no
 * onboard camera to stream; what it shows is the telemetry an operator would use to
 * confirm the link is up, and it says which it is. A fake video rectangle here would
 * be the same class of claim as showing B-17's thermal frame under another array.
 */

import { num, pctPlain } from '@/lib/format';
import { panelLabel } from '@/lib/queue';
import {
  useAllMissions, useFleet, useSetModule, useSiteFrame, type DroneRecord,
} from '@/store/selectors';
import { MISSION, MISSION_TOTAL } from '@/store/session';
import { Action, Block, Cell, Empty, ModuleShell, Table } from './ModuleShell';

/** Mission legs are declared in site SECONDS; the rules read in minutes. */
const mins = (seconds: number) => num(seconds / 60, 0);

const STATUS_COLOUR: Record<DroneRecord['status'], string> = {
  STANDBY: 'var(--text-secondary)',
  OUTBOUND: 'var(--sev-active)',
  INSPECTING: 'var(--sev-warning)',
  RETURNING: 'var(--sev-active)',
};

/** Six wide cells. Coarse on purpose — a battery gauge is read as bars, not digits. */
function Gauge({ value, colour }: { value: number; colour: string }) {
  const lit = Math.round((value / 100) * 6);
  return (
    <span className="seg" aria-hidden style={{ flex: 1 }}>
      {Array.from({ length: 6 }, (_, i) => (
        <i key={i} style={{
          flex: 1, width: 'auto', height: 16,
          background: i < lit ? colour : 'var(--surface-high)',
        }} />
      ))}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
      <span className="t-label" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="t-data-em" style={{ color: 'var(--text-primary)' }}>{children}</span>
    </div>
  );
}

function DroneCard({ d, progress }: { d: DroneRecord; progress: number }) {
  const airborne = d.status !== 'STANDBY';
  const colour = STATUS_COLOUR[d.status];
  const batteryColour = d.batteryPct < 30 ? 'var(--sev-critical)'
    : airborne ? 'var(--sev-warning)' : 'var(--sev-active)';

  return (
    <article style={{
      border: '1px solid var(--line-hairline)',
      borderTop: `2px solid ${airborne ? colour : 'var(--line-active)'}`,
      background: 'var(--surface-panel)',
      display: 'grid', gridTemplateRows: 'auto auto auto 1fr auto',
    }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: 'var(--sp-4)', borderBottom: '1px solid var(--line-hairline)',
      }}>
        <span style={{ display: 'grid', gap: 3 }}>
          <span className="t-label" style={{ color: 'var(--text-secondary)' }}>UAV ident</span>
          {/* The ident is a FIXED IDENTIFIER (CLAUDE.md §19) — "DRONE 01", with a
              space. The reference screen renders it DRONE_01 and that is a rename,
              not a restyle; four workstreams agree on this string. */}
          <span className="t-metric" style={{ color: 'var(--text-primary)' }}>
            {d.id}
          </span>
        </span>
        <span className="chip" style={{
          background: airborne ? colour : 'var(--surface-high)',
          color: airborne ? 'var(--text-inverse)' : 'var(--text-secondary)',
        }}>
          {d.status}
        </span>
      </header>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-4)',
        padding: 'var(--sp-4)', borderBottom: '1px solid var(--line-hairline)',
      }}>
        <span style={{ display: 'grid', gap: 3, minWidth: 116 }}>
          <span className="t-label" style={{ color: 'var(--text-secondary)' }}>Battery</span>
          <span className="t-metric" style={{ color: batteryColour }}>
            {pctPlain(d.batteryPct)}
          </span>
        </span>
        <Gauge value={d.batteryPct} colour={batteryColour} />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 'var(--sp-4)', padding: 'var(--sp-4)',
      }}>
        <Field label="Home pad">{d.padId}</Field>
        <Field label="Target array">
          {d.target
            ? <span style={{ color: 'var(--sev-active)' }}>{panelLabel(d.target)}</span>
            : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
        </Field>
        <Field label="Mission id">
          {d.missionId ?? <span style={{ color: 'var(--text-secondary)' }}>—</span>}
        </Field>
        <Field label="Sorties this session">{String(d.sorties).padStart(2, '0')}</Field>
      </div>

      {/* The payload pane. Not a video rectangle: this aircraft is a simulation and
          has no camera, so what is shown is the link state an operator would check. */}
      <div style={{
        margin: '0 var(--sp-4) var(--sp-4)',
        border: '1px solid var(--line-hairline)',
        background: 'var(--surface-inset)',
        minHeight: 132,
        display: 'grid', placeItems: 'center', position: 'relative',
      }}>
        {airborne ? (
          <>
            <span className="survey-grid" aria-hidden style={{ opacity: 0.2 }} />
            <span style={{ display: 'grid', justifyItems: 'center', gap: 'var(--sp-2)', zIndex: 1 }}>
              <span className="t-h1" style={{ color: 'var(--sev-active)' }}>
                Payload armed
              </span>
              <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
                RGB · THERMAL · ACOUSTIC · capture at station
              </span>
            </span>
            <span className="chip" style={{
              position: 'absolute', right: 0, bottom: 0,
              background: 'var(--surface-void)', color: 'var(--sev-active)',
            }}>
              LINK C2 · 2.4 GHz · LAT {num(41, 0)} ms
            </span>
          </>
        ) : (
          <span className="t-h1" style={{ color: 'var(--text-secondary)' }}>
            No signal · docked
          </span>
        )}
      </div>

      {/* Mission progress as a single rule across the foot of the card. */}
      <span aria-hidden style={{
        height: 3, background: 'var(--surface-high)', display: 'block',
      }}>
        <span style={{
          display: 'block', height: '100%', background: colour,
          width: `${airborne ? Math.min(100, progress * 100) : 0}%`,
          transition: 'width 200ms linear',
        }} />
      </span>
    </article>
  );
}

export function DronesModule() {
  const fleet = useFleet();
  const missions = useAllMissions();
  const frame = useSiteFrame();
  const setModule = useSetModule();
  const airborne = fleet.filter((d) => d.status !== 'STANDBY');

  return (
    <ModuleShell
      title="Drones"
      purpose={`
        What the two aircraft are doing. Nothing is stored per drone: status, target
        and battery are worked out from what has been dispatched.
      `}
      subtitle={`${fleet.length} aircraft // ${airborne.length} airborne // state derived from the dispatch log // site clock ${frame.clock}`}
      action={(
        <Action onClick={() => setModule('site')} ariaLabel="Go to the site map to dispatch">
          Dispatch from map →
        </Action>
      )}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-5)' }}>
        {fleet.map((d) => (
          <DroneCard
            key={d.id}
            d={d}
            // Progress belongs to the MISSION, not to the aircraft — `useFleet`
            // reports what a drone is, and how far through a sortie it is comes
            // from the flight log. Two selectors, one row.
            progress={missions.find((m) => m.id === d.missionId)?.progress ?? 0}
          />
        ))}
      </div>

      <Block title="Fleet activity log" wide note="this session, newest first">
        {missions.length === 0 ? (
          <Empty>
            Nothing has flown. Select an array on the site map, run triage, and
            dispatch from there —{' '}
            <button
              className="btn-reset t-data"
              onClick={() => setModule('site')}
              style={{ color: 'var(--sev-active)', textDecoration: 'underline' }}
            >
              go to the site map
            </button>.
          </Empty>
        ) : (
          <Table head={['Time', 'Drone', 'Event', 'Detail']}>
            {missions.map((m) => (
              <tr key={m.id}>
                <Cell first>T+{num(m.startedAt / 60, 0)} min</Cell>
                <Cell colour="var(--sev-active)">{m.droneId}</Cell>
                <Cell colour="var(--text-primary)">{m.phase.toUpperCase()}</Cell>
                <Cell>{m.id} → {panelLabel(m.panelId)} from PAD-01</Cell>
              </tr>
            ))}
          </Table>
        )}
      </Block>

      <Block title="Flight rules" note="enforced by the dispatcher">
        <ul className="t-prose" style={{
          color: 'var(--text-secondary)', display: 'grid', gap: 'var(--sp-2)',
          paddingLeft: '1.1em', listStyle: 'disc', margin: 0,
        }}>
          <li>Two aircraft on site. A third dispatch is refused rather than queued.</li>
          <li>One mission per array — a second drone to the same target is an operator
            slip, not a capability.</li>
          <li>
            An inspection is {mins(MISSION_TOTAL)} minutes of site time:{' '}
            {mins(MISSION.outbound)} outbound, {mins(MISSION.inspecting)} on station,{' '}
            {mins(MISSION.returning)} back to the pad.
          </li>
          <li>Dispatch is only offered once triage has asked for physical verification.</li>
        </ul>
      </Block>

      {airborne.length === 0 && (
        <Empty>
          Nothing is flying. Both aircraft are on their pads and charged; a sortie is
          raised from the detail rail once triage has asked for physical verification.
        </Empty>
      )}
    </ModuleShell>
  );
}
