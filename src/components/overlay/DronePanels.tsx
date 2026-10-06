'use client';

/** The drones screen: the two aircraft on the site and every flight this session. */

import { num, pctPlain, sentence } from '@/lib/format';
import { useAllMissions, useFleet } from '@/store/selectors';
import { useSession } from '@/store/session';
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
