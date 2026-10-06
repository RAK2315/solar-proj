'use client';

/** The analytics screen: the day's output from the model, and where the loss goes. */

import { MW, clockOf, kW, sentence } from '@/lib/format';
import {
  useDayCurve, useLossAttribution, useScenarioEpochHour, useSiteFrame, useZoneBreakdown,
} from '@/store/selectors';
import { Blk } from './Block';

const W = 480;
const H = 120;
const DAY_HOURS = 24;

export function CurvePanel() {
  const curve = useDayCurve();
  const frame = useSiteFrame();
  const epochHour = useScenarioEpochHour();
  const peak = Math.max(...curve.map((p) => p.outputMW), 1);
  const peakAt = curve.find((p) => p.outputMW === peak)?.hourOffset ?? 0;
  const pts = curve
    .map((p) => `${((p.hourOffset / DAY_HOURS) * W).toFixed(1)},${(H - (p.outputMW / peak) * (H - 6)).toFixed(1)}`)
    .join(' ');
  const nowX = Math.min(W, (frame.siteSeconds / 3600 / DAY_HOURS) * W);
  return (
    <Blk b="curve" title={<>Site output, first 24 h<span className="count">modelled</span></>}>
      <div className="big num">{MW(frame.farmOutputMW)}</div>
      <p className="one">Predicted from the forecast, peaking at {MW(peak)} around {clockOf(epochHour + peakAt)}.</p>
      <svg className="curve" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Site output across the day, from the model">
        <polygon className="area" points={`0,${H} ${pts} ${W},${H}`} />
        <polyline className="line" points={pts} />
        <line className="now" x1={nowX} x2={nowX} y1="0" y2={H} />
      </svg>
      <div className="axis num"><span>{clockOf(epochHour)}</span><span>now {frame.clock}</span><span>{clockOf(epochHour + DAY_HOURS)}</span></div>
    </Blk>
  );
}

export function LossPanel() {
  const loss = useLossAttribution();
  return (
    <Blk b="loss" title="Where the loss is going">
      <p className="one">Shortfall against the model right now, by mechanism.</p>
      <table className="tbl">
        <thead><tr><th>Cause</th><th>Arrays</th><th>Shortfall</th></tr></thead>
        <tbody>
          {loss.map((l) => (
            <tr key={l.cause}><td>{sentence(l.cause)}</td><td className="id">{l.arrays.slice(0, 3).join(' ')}</td><td className="num">{kW(l.kW, 1)}</td></tr>
          ))}
        </tbody>
      </table>
    </Blk>
  );
}

export function ZonesPanel() {
  const zones = useZoneBreakdown();
  return (
    <Blk b="zones" title="Zones">
      <p className="one">Arrays off nominal in each zone, of {zones[0]?.total}.</p>
      <table className="tbl">
        <thead><tr><th>Zone</th><th>Warning</th><th>Critical</th><th>Scheduled</th><th>Shortfall</th></tr></thead>
        <tbody>
          {zones.map((z) => (
            <tr key={z.id}>
              <td className="id">{z.id}</td><td className="num">{z.warning}</td><td className="num">{z.critical}</td>
              <td className="num">{z.scheduled}</td><td className="num">{kW(z.shortfallKW, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Blk>
  );
}
