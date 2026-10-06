'use client';

/** The drones screen: the two aircraft on the site and every flight this session. */

import { num, pctPlain, sentence } from '@/lib/format';
import { useAllMissions, useDroneLinks, useFleet } from '@/store/selectors';
import { MISSION, MISSION_TOTAL, useSession } from '@/store/session';
import { Blk } from './Block';

export function FleetPanel() {
  const fleet = useFleet();
  return (
    <Blk b="fleet" title={<>Drones<span className="count num">{fleet.length} on site</span></>}>
      <p className="one">Battery is derived from mission time and recharges on the pad.</p>
      <table className="tbl">
        <thead><tr><th>Drone</th><th>Status</th><th>Target</th><th>Sorties</th><th>Battery</th></tr></thead>
        <tbody>
          {fleet.map((d) => (
            <tr key={d.id} data-sev={d.status === 'STANDBY' ? undefined : 'scheduled'}>
              <td className="id">{d.id}</td><td>{sentence(d.status)}</td>
              <td className="id">{d.target ?? d.padId}</td><td className="num">{d.sorties}</td>
              <td className="num">{pctPlain(d.batteryPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Blk>
  );
}

/**
 * Drone status and comms. Range and altitude come off the flight splines; there
 * is no signal-strength figure because nothing in this build measures one.
 */
export function CommsPanel() {
  const links = useDroneLinks();
  const fleet = useFleet();
  return (
    <Blk b="comms" title="Drone status and comms">
      <p className="one">Each aircraft&apos;s link to the pad, from where the flight model puts it.</p>
      <table className="tbl">
        <thead><tr><th>Drone</th><th>Link</th><th>Range</th><th>Altitude</th></tr></thead>
        <tbody>
          {links.map((l) => {
            const status = fleet.find((d) => d.id === l.id)?.status ?? 'STANDBY';
            return (
              <tr key={l.id} data-sev={l.linked ? 'scheduled' : undefined}>
                <td className="id">{l.id}</td>
                <td>{l.linked ? `Command link, ${sentence(status).toLowerCase()}` : 'On the pad, idle'}</td>
                <td className="num">{l.linked ? `${num(l.rangeM, 0)} m` : 'at pad'}</td>
                <td className="num">{num(l.altitudeM, 0)} m</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Blk>
  );
}

const LEGS = [
  ['Outbound transit', MISSION.outbound],
  ['On station: visible, thermal, acoustic', MISSION.inspecting],
  ['Return to the pad', MISSION.returning],
] as const;

export function MissionProfilePanel() {
  return (
    <Blk b="profile" title={<>Mission profile<span className="count num">{num(MISSION_TOTAL / 60, 0)} min of site time</span></>}>
      <p className="one">Identical for every sortie. The approval gate arms at the end of the on-station leg.</p>
      <ol className="plan legs">
        {LEGS.map(([label, seconds]) => (
          <li key={label} data-sev="scheduled">
            <span>{label}</span>
            <span className="track"><i className="bar" style={{ left: 0, width: `${((seconds / MISSION_TOTAL) * 100).toFixed(1)}%` }} /></span>
            <span className="fig num">{num(seconds / 60, 0)} min</span>
          </li>
        ))}
      </ol>
      <ul className="work workings rules">
        <li>Two aircraft on site. A third dispatch is refused, not queued.</li>
        <li>One mission per array at a time.</li>
        <li>The agent says when imaging would add nothing. The operator can fly anyway.</li>
      </ul>
    </Blk>
  );
}

export function MissionsPanel() {
  const missions = useAllMissions();
  const select = useSession((s) => s.selectPanel);
  return (
    <Blk b="missions" title={<>Missions<span className="count num">{missions.length} this session</span></>}>
      <p className="one">Every phase is derived from site time, so scrubbing rewinds the flight.</p>
      {missions.length === 0
        ? <p className="empty well">No missions yet. Dispatch a drone from an array to see it here.</p>
        : (
          <table className="tbl">
            <thead><tr><th>Mission</th><th>Target</th><th>Phase</th><th>Elapsed</th></tr></thead>
            <tbody>
              {missions.map((m) => (
                <tr key={m.id}>
                  <td className="id">{m.id}</td>
                  <td><button type="button" className="id link" onClick={() => select(m.panelId)}>{m.panelId}</button></td>
                  <td>{sentence(m.phase)}</td><td className="num">{num(m.elapsed / 60, 0)} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </Blk>
  );
}
