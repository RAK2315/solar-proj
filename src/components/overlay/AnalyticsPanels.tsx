'use client';

/** The analytics screen: the day's output from the model, and where the loss goes. */

import { MW, clockOf, degC, kW, ms, num, pctPlain, sentence, wm2 } from '@/lib/format';
import {
  useDayCurve, useForecast, useHeatwaveC, useLossAttribution, useModelConstants,
  useScenarioEpochHour, useSiteFrame, useZoneBreakdown,
} from '@/store/selectors';
import { Blk, Why } from './Block';

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

/** The committed summary is upper case with a dash in it; the console is neither. */
const plainSummary = (s: string) => `${sentence(s.replace(/\s*[\u2014-]\s*/g, ', '))}.`;

/** Site weather now, and the 72 h the deadlines are computed against. */
export function WeatherPanel() {
  const frame = useSiteFrame();
  const forecast = useForecast();
  const heat = useHeatwaveC();
  const pts = forecast.points;
  const lo = Math.min(...pts.map((p) => p.ambientC));
  const hi = Math.max(...pts.map((p) => p.ambientC));
  const span = Math.max(1, pts[pts.length - 1].hourOffset);
  const line = pts
    .map((p) => `${((p.hourOffset / span) * W).toFixed(1)},${(H - 4 - ((p.ambientC - lo) / Math.max(1, hi - lo)) * (H - 12)).toFixed(1)}`)
    .join(' ');
  const nowX = Math.min(W, (frame.siteSeconds / 3600 / span) * W);
  return (
    <Blk b="weather" title={<>Weather<span className="count">site-wide, not per array</span></>}>
      <p className="one">
        {plainSummary(forecast.summary)} Peak ambient {degC(forecast.peakAmbientC)} over {num(span, 0)} h.
        {heat > 0 && ` A sandbox heatwave is adding ${degC(heat)}.`}
      </p>
      <dl className="rows">
        <div><dt>Ambient</dt><dd className="num">{degC(frame.ambientC)}</dd></div>
        <div><dt>Irradiance</dt><dd className="num">{wm2(frame.irradiance)}</dd></div>
        <div><dt>Wind</dt><dd className="num">{ms(frame.windMs)}</dd></div>
        <div><dt>Cloud</dt><dd className="num">{pctPlain(frame.cloudPct)}</dd></div>
      </dl>
      <svg className="curve short" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Forecast ambient temperature over 72 hours">
        <polyline className="line" points={line} />
        <line className="now" x1={nowX} x2={nowX} y1="0" y2={H} />
      </svg>
      <div className="axis num"><span>{degC(lo)} low</span><span>forecast ambient</span><span>{degC(hi)} high</span></div>
    </Blk>
  );
}

/** The model, stated. The same coefficients the generator ran on. */
export function ModelPanel() {
  const m = useModelConstants();
  return (
    <Blk b="model" title="The model" aside={<Why />}>
      <p className="one">Every reading on this console is this formula, evaluated per array at site time.</p>
      <p className="well formula id">P = P_rated × (G / 1000) × (1 + γ (T_cell − 25)) × f_soil × f_mismatch × η_inv</p>
      <dl className="rows">
        <div><dt>Temperature coefficient γ</dt><dd className="num">{num(m.gamma, 4)} /°C</dd></div>
        <div><dt>Nominal operating cell temperature</dt><dd className="num">{degC(m.noct, 0)}</dd></div>
        <div><dt>Inverter efficiency</dt><dd className="num">{num(m.etaInv, 2)}</dd></div>
        <div><dt>Nominal soiling derate</dt><dd className="num">{num(m.fSoil, 2)}</dd></div>
      </dl>
      <p className="work workings">
        A PVWatts-style model with cell temperature from NOCT. The coefficients live in one file, mirrored
        between Python and TypeScript by a test that recomputes the committed telemetry from the browser code.
        γ is a representative figure for crystalline silicon, not a datasheet value for a specific module.
      </p>
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
