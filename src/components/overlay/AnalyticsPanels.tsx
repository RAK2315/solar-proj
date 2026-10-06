'use client';

/** The analytics screen: the day's output from the model, and where the loss goes. */

import { HAZARD_SPEC, type HazardKind } from '@/lib/hazard';
import { MW, MWh, clockOf, degC, kW, ms, num, pctPlain, sentence, wm2 } from '@/lib/format';
import { lostRevenue } from '@/lib/money';
import { FORECAST_BAND, LOSS_CAUSES, LOSS_LABEL, type LossCause, type OutlookPoint } from '@/lib/outlook';
import {
  OUTLOOK_HOURS, useForecast, useHeatwaveC, useLossAttribution, useModelConstants, useOutlook,
  useScenarioEpochHour, useSiteFrame, useZoneBreakdown,
} from '@/store/selectors';
import { Blk, Why } from './Block';
import { TariffBasis } from './Tariff';

const W = 480;
const H = 120;
/** The chart's own drawing space. It is stretched to the panel, so only ratios matter. */
const CHART_W = 960;
const OUTPUT_H = 150;
const LOSS_H = 110;
/** Stacked bottom to top. The fault is the base because it is the part that stays. */
const STACK: readonly LossCause[] = ['fault', 'soiling', 'hazard'];

const xOf = (hourOffset: number, hours: number) => (hourOffset / hours) * CHART_W;
const path = (pts: Array<[number, number]>) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/** One cause's band of the stacked shortfall, as a closed polygon. */
function band(points: OutlookPoint[], hours: number, upTo: number, peak: number): string {
  const y = (kWValue: number) => LOSS_H - (kWValue / peak) * (LOSS_H - 8);
  const below = (p: OutlookPoint) => STACK.slice(0, upTo).reduce((s, c) => s + p.loss[c], 0);
  const top = points.map((p): [number, number] => [xOf(p.hourOffset, hours), y(below(p) + p.loss[STACK[upTo]])]);
  const base = points.map((p): [number, number] => [xOf(p.hourOffset, hours), y(below(p))]).reverse();
  return path([...top, ...base]);
}

/**
 * Expected against actual for the modelled arrays, and the gap between them.
 *
 * It covers the 72 hours the forecast does and no further, because there is no
 * honest figure beyond the forecast. The band around the expected line is how far
 * the forecast may be out; it is a declared assumption and is labelled as one.
 *
 * TWO SCALES, AND THE PANEL SAYS SO. The arrays' whole shortfall is about one
 * per cent of what they produce, so on the output chart the two lines all but
 * coincide: that is the true picture and it is drawn as it is. The gap is then
 * drawn again below at its own scale, split by cause, because that is the part
 * an operator can act on.
 */
export function CurvePanel() {
  const { points, markers, lostMWh, lostMWhLow, lostMWhHigh, expectedMWh, hours } = useOutlook(OUTLOOK_HOURS);
  const frame = useSiteFrame();
  const epochHour = useScenarioEpochHour();

  const nowH = Math.min(hours, frame.siteSeconds / 3600);
  const now = points.reduce((best, p) => (Math.abs(p.hourOffset - nowH) < Math.abs(best.hourOffset - nowH) ? p : best), points[0]);
  const shortNow = now.expectedKW - now.actualKW;
  const peakOut = Math.max(...points.map((p) => p.expectedKW * p.high), 1);
  const peakLoss = Math.max(...points.map((p) => p.expectedKW - p.actualKW), 1);
  const lostTotal = LOSS_CAUSES.reduce((s, c) => s + lostMWh[c], 0);

  const yOut = (v: number) => OUTPUT_H - (v / peakOut) * (OUTPUT_H - 8);
  const expected = points.map((p): [number, number] => [xOf(p.hourOffset, hours), yOut(p.expectedKW)]);
  const actual = points.map((p): [number, number] => [xOf(p.hourOffset, hours), yOut(p.actualKW)]);
  const bandHigh = points.map((p): [number, number] => [xOf(p.hourOffset, hours), yOut(p.expectedKW * p.high)]);
  const bandLow = points.map((p): [number, number] => [xOf(p.hourOffset, hours), yOut(p.expectedKW * p.low)]);
  const nowX = xOf(nowH, hours);
  const ticks = Array.from({ length: hours / 12 + 1 }, (_, i) => i * 12);

  return (
    <Blk b="curve" title={<>Expected against actual, next {hours} h<span className="count">modelled arrays, a prediction</span></>} aside={<Why />}>
      <div className="chart-hd">
        <div><div className="big num">{MW(frame.farmOutputMW)}</div><p className="one">site output now</p></div>
        <div><div className="fig num">{kW(shortNow, 0)}</div><p className="one">short of the model now, {pctPlain(now.expectedKW > 0 ? (shortNow / now.expectedKW) * 100 : 0, 1)} of the arrays&apos; output</p></div>
        <div><div className="fig num">{MWh(lostTotal)}</div><p className="one">lost over the {hours} h, of {MWh(expectedMWh, 0)} expected</p></div>
        <div>
          <div className="fig num">{lostRevenue(lostTotal)}</div>
          <p className="one">
            lost revenue over the {hours} h, <TariffBasis />. Forecast band {lostRevenue(lostMWhLow)} to {lostRevenue(lostMWhHigh)}.
          </p>
        </div>
      </div>

      <svg className="chart" viewBox={`0 0 ${CHART_W} ${OUTPUT_H}`} preserveAspectRatio="none" role="img" aria-label={`Expected and actual output of the modelled arrays over ${hours} hours`}>
        <polygon className="band" points={path([...bandHigh, ...bandLow.slice().reverse()])} />
        <polygon className="gap" points={path([...expected, ...actual.slice().reverse()])} />
        <polyline className="expected" points={path(expected)} />
        <polyline className="actual" points={path(actual)} />
        <line className="now" x1={nowX} x2={nowX} y1="0" y2={OUTPUT_H} />
      </svg>
      <ul className="key">
        <li><i className="swatch" data-k="expected" />Expected, the model at nominal soiling</li>
        <li><i className="swatch" data-k="actual" />Actual, with every fault, soiled array and hazard</li>
        <li>
          <i className="swatch" data-k="band" />Forecast band, ±{FORECAST_BAND.nowPct} % on irradiance now to ±{FORECAST_BAND.at72hPct} % at {FORECAST_BAND.hours} h. Declared, not fitted
        </li>
      </ul>

      <p className="one">The gap between those two lines, at its own scale and split by cause.</p>
      <div className="chart-wrap">
        <svg className="chart" viewBox={`0 0 ${CHART_W} ${LOSS_H}`} preserveAspectRatio="none" role="img" aria-label="Shortfall against the model by cause">
          {STACK.map((c, i) => <polygon key={c} className="loss" data-cause={c} points={band(points, hours, i, peakLoss)} />)}
          {markers.map((m) => (
            <line key={`${m.kind}-${m.label}-${m.hourOffset}`} className="mark" data-kind={m.kind} x1={xOf(m.hourOffset, hours)} x2={xOf(m.hourOffset, hours)} y1="0" y2={LOSS_H} />
          ))}
          <line className="now" x1={nowX} x2={nowX} y1="0" y2={LOSS_H} />
        </svg>
        {/* Labels are HTML over the drawing: text inside a stretched SVG stretches with it. */}
        {markers.map((m, i) => (
          <span key={`${m.kind}-${m.label}-${m.hourOffset}`} className="marklabel" data-kind={m.kind} data-row={i % 3} style={{ left: `${(m.hourOffset / hours) * 100}%` }}>
            {m.kind === 'fault' ? <span className="id">{m.label}</span> : HAZARD_SPEC[m.label as HazardKind].label}
          </span>
        ))}
      </div>
      <div className="axis num">
        {ticks.map((t) => <span key={t}>{t === 0 ? clockOf(epochHour) : clockOf(epochHour + t)}</span>)}
      </div>

      <table className="tbl">
        <thead><tr><th>Cause</th><th>Now</th><th>Over the {hours} h</th><th>Lost revenue</th></tr></thead>
        <tbody>
          {STACK.map((c) => (
            <tr key={c}>
              <td><i className="swatch" data-cause={c} />{LOSS_LABEL[c]}</td>
              <td className="num">{kW(now.loss[c], 1)}</td>
              <td className="num">{MWh(lostMWh[c])}</td>
              <td className="num">{lostRevenue(lostMWh[c])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="one">Lost revenue is lost energy <TariffBasis />. The arithmetic and its sources are in the panel below.</p>
      <p className="work workings">
        Peak shortfall on this chart {kW(peakLoss, 0)}, against a peak expected output of {MW(peakOut / 1000, 1)} for
        the 120 modelled arrays. Marks show where a fault or a hazard begins. Now is {frame.clock}; everything to
        its right is the model run forward on the forecast, not a measurement.
      </p>
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
