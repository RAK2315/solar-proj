'use client';

/**
 * DRONES — the fleet screen.
 *
 * Two aircraft, their state derived entirely from the missions in the session.
 * Nothing here is stored per drone: status, target, battery and sortie count are
 * all functions of what has been dispatched and what time it is, which is why the
 * PiP copy of the console shows exactly the same thing.
 */

import { num, pctPlain } from '@/lib/format';
import { panelLabel } from '@/lib/queue';
import { useFleet, useSetModule, useSiteFrame, type DroneRecord } from '@/store/selectors';
import { MISSION, MISSION_TOTAL } from '@/store/session';
import { Block, Empty, ModuleShell } from './ModuleShell';

/** Mission legs are declared in site SECONDS; the rules read in minutes. */
const mins = (seconds: number) => num(seconds / 60, 0);

const STATUS_COLOUR: Record<DroneRecord['status'], string> = {
  STANDBY: 'var(--text-muted)',
  OUTBOUND: 'var(--sev-active)',
  INSPECTING: 'var(--sev-warning)',
  RETURNING: 'var(--sev-active)',
};

function Bar({ value, colour }: { value: number; colour: string }) {
  const lit = Math.round((value / 100) * 10);
  return (
    <span className="seg" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} data-on={i < lit ? 1 : 0} style={i < lit ? { background: colour } : undefined} />
      ))}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)' }}>
      <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{label.toUpperCase()}</span>
      <span className="t-data" style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>
        {children}
      </span>
    </div>
  );
}

function DroneCard({ d }: { d: DroneRecord }) {
  const airborne = d.status !== 'STANDBY';
  const colour = STATUS_COLOUR[d.status];

  return (
    <article style={{
      border: '1px solid var(--line-hairline)',
      borderLeft: `2px solid ${colour}`,
      padding: 'var(--sp-4)',
      display: 'grid', gap: 'var(--sp-3)',
      background: 'var(--surface-raised)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-3)' }}>
        <span className="t-data-em" style={{ color: 'var(--text-primary)' }}>{d.id}</span>
        <span className="badge" style={{ color: colour }}>{d.status}</span>
      </div>

      <Field label="Home pad">{d.padId}</Field>
      <Field label="Assignment">
        {d.target ? panelLabel(d.target) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </Field>
      <Field label="Mission">{d.missionId ?? '—'}</Field>
      <Field label="Sorties this session">{d.sorties}</Field>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <span className="t-micro" style={{ color: 'var(--text-muted)', minWidth: 54 }}>
          BATTERY
        </span>
        <Bar value={d.batteryPct} colour={d.batteryPct < 30 ? 'var(--sev-critical)' : colour} />
        <span className="t-data" style={{ color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          {pctPlain(d.batteryPct)}
        </span>
      </div>

      <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
        LINK {airborne ? 'C2 · 2.4 GHz' : 'IDLE'} · LAT {num(airborne ? 41 : 12, 0)} ms
      </span>
    </article>
  );
}

export function DronesModule() {
  const fleet = useFleet();
  const frame = useSiteFrame();
  const setModule = useSetModule();
  const airborne = fleet.filter((d) => d.status !== 'STANDBY');

  return (
    <ModuleShell
      title="Drones"
      subtitle={`Fleet of ${fleet.length} · ${airborne.length} airborne · site clock ${frame.clock}`}
    >
      <Block title="Aircraft">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
          {fleet.map((d) => <DroneCard key={d.id} d={d} />)}
        </div>
      </Block>

      <Block title="Flight rules" note="enforced by the dispatcher">
        <ul className="t-data" style={{
          color: 'var(--text-secondary)', display: 'grid', gap: 'var(--sp-2)',
          paddingLeft: '1.1em', listStyle: 'disc',
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
          Nothing is flying. Select an array on the site map, run triage, and dispatch
          from there —{' '}
          <button
            className="btn-reset t-data"
            onClick={() => setModule('site')}
            style={{ color: 'var(--sev-active)', textDecoration: 'underline' }}
          >
            go to the site map
          </button>.
        </Empty>
      )}
    </ModuleShell>
  );
}
