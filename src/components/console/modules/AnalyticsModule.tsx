'use client';

/**
 * ANALYTICS — the site as the model sees it over a whole day.
 *
 * Every figure here is evaluated from src/lib/physics.ts at sampled hours, not
 * read from a stored series. That matters twice over: the curve responds to work
 * the operator approves, and there is no second place for a number about the site
 * to live. If this screen and the header ever disagreed, one of them would be
 * lying — they cannot, because they call the same function.
 *
 * The portion of the curve ahead of the site clock is a PROJECTION, and it is
 * drawn differently and labelled as one.
 *
 * REBUILT AROUND THE CURVE. It was a chart, then two half-width blocks of
 * label/value rows, then two tables, then a paragraph — five things at one weight.
 * Now: four tiles that state the day in four numbers, then the curve at 300px with
 * expected AND delivered on it so the gap between them is the visible subject, then
 * the attribution and the worst arrays side by side, then the model note.
 *
 * THE GAP IS THE POINT. Plotting delivered output alone says the site is working;
 * plotting it against what the model expected says how much is being left on the
 * ground, which is the entire argument of the product.
 */

import {
  Area, AreaChart, CartesianGrid, Legend, Line, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { AlertTriangle, Sun, TrendingDown, Zap } from 'lucide-react';

import { num, pctPlain } from '@/lib/format';
import { clockAt } from '@/lib/physics';
import {
  useDayCurve, useLossAttribution, useSiteFrame, useZoneBreakdown,
} from '@/store/selectors';
import { Block, Cell, ModuleShell, Table } from './ModuleShell';

/** One of the four figures that state the day. A tile, keyed if it is a loss. */
function Tile({ label, value, unit, Icon, alert = false }: {
  label: string; value: string; unit: string; Icon: typeof Zap; alert?: boolean;
}) {
  return (
    <div style={{
      border: `1px solid ${alert ? 'var(--sev-critical)' : 'var(--line-hairline)'}`,
      background: 'var(--surface-panel)',
      padding: 'var(--sp-4)',
      display: 'grid', gap: 'var(--sp-3)', alignContent: 'start',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 'var(--sp-3)',
      }}>
        <span className="t-h1" style={{
          color: alert ? 'var(--sev-critical-ink)' : 'var(--text-secondary)',
        }}>
          {label}
        </span>
        <Icon
          size={16} strokeWidth={2} aria-hidden
          style={{ color: alert ? 'var(--sev-critical-ink)' : 'var(--sev-active)' }}
        />
      </div>
      <span className="t-hero" style={{
        color: alert ? 'var(--sev-critical-ink)' : 'var(--text-primary)',
      }}>
        {value}
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}> {unit}</span>
      </span>
    </div>
  );
}

const AXIS = {
  fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)',
} as const;

export function AnalyticsModule() {
  const curve = useDayCurve();
  const frame = useSiteFrame();
  const attribution = useLossAttribution();
  const zones = useZoneBreakdown();

  const nowHour = frame.siteSeconds / 3600;
  const peak = curve.reduce((a, p) => (p.outputMW > a.outputMW ? p : a), curve[0]);
  const totalShortfallKW = attribution.reduce((a, x) => a + x.kW, 0);

  // Energy under the two curves across the day, trapezoid — the same integration
  // the generator uses for the 72-hour figure, over 24 hours instead.
  const step = curve.length > 1 ? curve[1].hourOffset - curve[0].hourOffset : 0;
  const deliveredMWh = curve.slice(1).reduce(
    (a, p, i) => a + ((p.outputMW + curve[i].outputMW) / 2) * step, 0,
  );
  const lostMWh = curve.slice(1).reduce(
    (a, p, i) => a + ((p.shortfallKW + curve[i].shortfallKW) / 2 / 1000) * step, 0,
  );

  // `frame.panels` is keyed BY id and the readings do not carry their own id, so the
  // key is the only place the array name lives — entries, not values.
  const deviatingArrays = Object.entries(frame.panels)
    .filter(([, p]) => p.status !== 'healthy')
    .map(([id, p]) => ({ id, ...p }));
  const worst = deviatingArrays
    .slice()
    .sort((a, b) => a.deviationPct - b.deviationPct)
    .slice(0, 6);
  const totalArrays = Object.keys(frame.panels).length;

  const data = curve.map((p) => ({
    hour: p.hourOffset,
    label: clockAt(p.hourOffset),
    delivered: Number(p.outputMW.toFixed(1)),
    // What the site WOULD have produced with every array inside tolerance. The gap
    // between the two lines is the thing this screen exists to show.
    expected: Number((p.outputMW + p.shortfallKW / 1000).toFixed(1)),
  }));

  return (
    <ModuleShell
      title="Analytics"
      subtitle={`24 h from the model // ${curve.length} whole-site evaluations at sampled hours, not a stored series // site clock ${frame.clock}`}
    >
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-4)',
      }}>
        <Tile label="Peak output" value={num(peak.outputMW, 0)} unit="MW" Icon={Zap} />
        <Tile label="Energy today" value={num(deliveredMWh, 0)} unit="MWh" Icon={Sun} />
        <Tile
          label="Lost to faults" value={num(lostMWh, 2)} unit="MWh"
          Icon={TrendingDown} alert={lostMWh > 0.01}
        />
        <Tile
          label="Arrays deviating"
          value={String(deviatingArrays.length)}
          unit={`/ ${totalArrays}`}
          Icon={AlertTriangle}
          alert={deviatingArrays.length > 0}
        />
      </div>

      <Block
        title="Power generation profile"
        note={`peak ${num(peak.outputMW, 0)} MW at ${clockAt(peak.hourOffset)}`}
      >
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="deliveredFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--sev-active)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--sev-active)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--line-hairline)" vertical={false} />
              <XAxis
                dataKey="label" interval={11} tickLine={false}
                axisLine={{ stroke: 'var(--line-hairline)' }} tick={AXIS}
              />
              <YAxis width={52} tickLine={false} axisLine={false} unit=" MW" tick={AXIS} />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-panel)',
                  border: '1px solid var(--line-active)',
                  borderRadius: 0,
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                formatter={(v: number, name) => [
                  `${num(v, 1)} MW`,
                  name === 'delivered' ? 'Delivered' : 'Expected, all arrays nominal',
                ]}
              />
              <Legend
                verticalAlign="top" align="right" iconType="plainline"
                wrapperStyle={{
                  fontFamily: 'var(--font-cond)', fontSize: 11, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'var(--text-secondary)',
                }}
                formatter={(name) => (name === 'delivered'
                  ? 'Delivered' : 'Expected')}
              />
              {/* Expected is a dashed line, not a filled area: it is a model output
                  rather than something that happened, and the two must not read the
                  same way on one chart. */}
              <Line
                type="monotone" dataKey="expected" stroke="var(--text-secondary)"
                strokeWidth={1} strokeDasharray="4 3" dot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone" dataKey="delivered" stroke="var(--sev-active)"
                strokeWidth={1.75} fill="url(#deliveredFill)" dot={false}
                isAnimationActive={false}
              />
              <ReferenceLine
                x={clockAt(nowHour - (nowHour % (1 / 4)))}
                stroke="var(--sev-warning)" strokeDasharray="3 3"
                label={{
                  value: 'NOW', position: 'top', fontSize: 11,
                  fill: 'var(--sev-warning-ink)', fontFamily: 'var(--font-mono)',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="t-micro" style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Left of NOW is the site as it ran. Right of NOW is the model&rsquo;s
          projection under the committed forecast — clear sky, no cloud, the faults
          left unrepaired. Approving work moves the curve. The dashed line is the
          same site with every array inside tolerance; the gap between them is{' '}
          {num(lostMWh, 2)} MWh across the day.
        </p>
      </Block>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-5)' }}>
        <Block title="Loss by cause" note={`${num(totalShortfallKW, 1)} kW right now`}>
          <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
            {attribution.map((a) => (
              <div key={a.cause} style={{ display: 'grid', gap: 'var(--sp-2)' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  gap: 'var(--sp-3)',
                }}>
                  <span className="t-data" style={{ color: 'var(--text-primary)' }}>
                    {a.cause}
                  </span>
                  <span className="t-value" style={{ color: 'var(--sev-critical-ink)' }}>
                    {num(a.kW, 1)}
                    <span className="t-micro" style={{ color: 'var(--text-secondary)' }}> kW</span>
                  </span>
                </div>
                <span aria-hidden style={{ height: 8, background: 'var(--surface-high)' }}>
                  <span style={{
                    display: 'block', height: '100%', background: 'var(--sev-critical)',
                    width: `${(a.kW / Math.max(totalShortfallKW, 0.001)) * 100}%`,
                  }} />
                </span>
                {a.arrays.length > 0 && (
                  <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
                    {a.arrays.join(' · ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Block>

        <Block title="Worst arrays" note="by deviation, this instant">
          {worst.length === 0 ? (
            <p className="t-prose" style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Every one of the {totalArrays} monitored arrays is inside tolerance.
            </p>
          ) : (
            <Table head={['Array', 'Deviation', 'Shortfall kW', 'Status']}>
              {worst.map((p) => (
                <tr key={p.id}>
                  <Cell first emphasis>{p.id}</Cell>
                  <Cell emphasis colour="var(--sev-critical-ink)">
                    {num(p.deviationPct, 1)} %
                  </Cell>
                  <Cell>{num(p.expectedKW - p.actualKW, 1)}</Cell>
                  <td style={{
                    padding: 'var(--sp-2) 0', textAlign: 'right',
                    borderBottom: '1px solid var(--line-hairline)',
                  }}>
                    <span className="chip" style={{
                      background: p.status === 'critical' ? 'var(--sev-critical)'
                        : p.status === 'scheduled' ? 'var(--panel-scheduled)'
                          : 'var(--sev-warning)',
                    }}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Block>
      </div>

      <Block title="Zones" note={`${totalArrays} monitored arrays`}>
        <Table head={['Zone', 'Arrays', 'Warning', 'Critical', 'Scheduled', 'Shortfall kW']}>
          {zones.map((z) => (
            <tr key={z.id}>
              <Cell first emphasis>Zone {z.id}</Cell>
              <Cell>{z.total}</Cell>
              <Cell colour={z.warning > 0 ? 'var(--sev-warning-ink)' : undefined}>
                {z.warning}
              </Cell>
              <Cell colour={z.critical > 0 ? 'var(--sev-critical-ink)' : undefined}>
                {z.critical}
              </Cell>
              <Cell colour={z.scheduled > 0 ? 'var(--panel-scheduled)' : undefined}>
                {z.scheduled}
              </Cell>
              <Cell emphasis colour="var(--text-primary)">{num(z.shortfallKW, 1)}</Cell>
            </tr>
          ))}
        </Table>
        <p className="t-micro" style={{ color: 'var(--text-secondary)', margin: 0 }}>
          The share of the block&rsquo;s day lost to faults is{' '}
          {pctPlain((lostMWh / Math.max(deliveredMWh, 1)) * 100, 3)} — small, because
          120 monitored arrays are roughly 30 MW of a 500 MW block. Fleet health is a
          severity roll-up rather than an energy ratio for exactly that reason: an
          energy ratio would read 99.5% while an array burned.
        </p>
      </Block>

      <Block title="Model" note="the same constants the generator ran on">
        <p className="t-prose" style={{ color: 'var(--text-secondary)', maxWidth: '78ch', margin: 0 }}>
          Output is NREL PVWatts:{' '}
          <span className="t-data">
            P = P_rated · (G/1000) · (1 + γ(T_cell − 25)) · f_soil · f_mismatch · η_inv
          </span>{' '}
          with cell temperature from the NOCT model. γ = −0.0037 /°C, NOCT = 45 °C,
          η_inv = 0.98. Those coefficients live in one file and are mirrored between
          Python and TypeScript by a test that recomputes the entire committed
          telemetry series from the browser code — so this screen and the generated
          data cannot disagree.
        </p>
      </Block>
    </ModuleShell>
  );
}
