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
  Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
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
    delivered: Number(p.outputMW.toFixed(1)),
    // WHAT THE FAULTS COST, IN kW, ON ITS OWN SCALE.
    //
    // This used to be `expected = delivered + shortfall`, plotted as a second
    // line in MW so the GAP was the subject. The gap is 0.11 MW on a 400 MW
    // axis — a tenth of a pixel. The caption described a difference nobody could
    // see, which is worse than not drawing it. The loss is the same quantity
    // measured against a scale it is actually visible on.
    lostKW: Number(p.shortfallKW.toFixed(1)),
  }));

  // Ticks every three hours across whatever the curve covers.
  const lastHour = data.length ? data[data.length - 1].hour : 0;
  const hourTicks: number[] = [];
  for (let h = Math.ceil(data[0]?.hour ?? 0); h <= lastHour; h += 3) hourTicks.push(h);

  return (
    <ModuleShell
      title="Analytics"
      purpose={`
        The whole site across a day, and where the losses come from, worked out
        from the physics model as you look at it, so this screen and the map cannot
        disagree.
      `}
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
        title="Power generation profile" wide
        note={`peak ${num(peak.outputMW, 0)} MW at ${clockAt(peak.hourOffset)}`}
      >
        {/* 220, not 300. At full width this curve is legible well below the height
            it had, and every pixel it gives back is a pixel of the four blocks
            beneath it that an operator was scrolling to reach. */}
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            {/* ComposedChart, not AreaChart. An `AreaChart` renders only its Area
                children: the dashed line and the NOW marker were in the markup,
                in the DOM tree, and drawn nowhere, verified by querying the SVG,
                which held zero line curves and zero reference lines. */}
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="deliveredFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--sev-active)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--sev-active)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--line-hairline)" vertical={false} />
              {/* A NUMERIC time axis, not a categorical one. Categories were the
                  hour labels, and a curve spanning a full day starts and ends at
                  the same clock time, so "10:00" appeared twice in the domain,
                  the band scale could not resolve it, and the NOW marker was
                  discarded without a word. Verified by querying the SVG: no
                  reference-line layer at all. */}
              <XAxis
                dataKey="hour" type="number" domain={['dataMin', 'dataMax']}
                ticks={hourTicks} tickFormatter={clockAt} tickLine={false}
                axisLine={{ stroke: 'var(--line-hairline)' }} tick={AXIS}
              />
              <YAxis
                yAxisId="mw" width={52} tickLine={false} axisLine={false}
                unit=" MW" tick={AXIS}
              />
              {/* The loss keeps its own scale, on the right, in kW. Sharing the
                  MW axis is what made it invisible. */}
              <YAxis
                yAxisId="loss" orientation="right" width={56} tickLine={false}
                axisLine={false} unit=" kW" tick={AXIS}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-panel)',
                  border: '1px solid var(--line-active)',
                  borderRadius: 0,
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                labelFormatter={(h: number) => clockAt(h)}
                formatter={(v: number, name) => (name === 'Lost to faults'
                  ? [`${num(v, 1)} kW`, name]
                  : [`${num(v, 1)} MW`, name])}
              />
              <Legend
                verticalAlign="top" align="right" iconType="plainline"
                wrapperStyle={{
                  fontFamily: 'var(--font-cond)', fontSize: 11, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'var(--text-secondary)',
                }}
                // No formatter: the series carry their own `name`, and mapping
                // dataKeys here is what printed "Delivered" twice.

              />
              <Area
                yAxisId="mw" name="Delivered"
                type="monotone" dataKey="delivered" stroke="var(--sev-active)"
                strokeWidth={1.75} fill="url(#deliveredFill)" dot={false}
                isAnimationActive={false}
              />
              {/* Dashed, and not filled: this is what the site FAILED to make.
                  Drawing it the same way as the output would read as more power. */}
              <Line
                yAxisId="loss" name="Lost to faults"
                type="monotone" dataKey="lostKW" stroke="var(--sev-critical)"
                strokeWidth={1.5} strokeDasharray="4 3" dot={false}
                isAnimationActive={false}
              />
              <ReferenceLine
                yAxisId="mw"
                x={nowHour}
                stroke="var(--sev-warning)" strokeDasharray="3 3"
                label={{
                  value: 'NOW', position: 'top', fontSize: 11,
                  fill: 'var(--sev-warning-ink)', fontFamily: 'var(--font-mono)',
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="t-micro" style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Left of NOW is the site as it ran. Right of NOW is the model&rsquo;s
          projection under the committed forecast, clear sky, no cloud, the faults
          left unrepaired. Approving work moves the curve. The dashed red line is
          what the faults are costing, in kW on the right-hand scale: it integrates
          to {num(lostMWh, 2)} MWh across the day. It has its own axis because at
          the site&rsquo;s own scale the loss is a tenth of a pixel.
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
          {pctPlain((lostMWh / Math.max(deliveredMWh, 1)) * 100, 3)}, small, because
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
          telemetry series from the browser code, so this screen and the generated
          data cannot disagree.
        </p>
      </Block>
    </ModuleShell>
  );
}
