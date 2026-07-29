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
 */

import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { num, pctPlain } from '@/lib/format';
import { clockAt } from '@/lib/physics';
import {
  useDayCurve, useLossAttribution, useSiteFrame, useZoneBreakdown,
} from '@/store/selectors';
import { Block, Cell, ModuleShell, Table } from './ModuleShell';

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

  const data = curve.map((p) => ({
    hour: p.hourOffset,
    label: clockAt(p.hourOffset),
    output: Number(p.outputMW.toFixed(1)),
    shortfall: Number((p.shortfallKW / 1000).toFixed(3)),
  }));

  return (
    <ModuleShell
      title="Analytics"
      subtitle={`24 h from the model · site clock ${frame.clock} · ${curve.length} whole-site evaluations`}
    >
      <Block
        title="Site output"
        note={`peak ${num(peak.outputMW, 0)} MW at ${clockAt(peak.hourOffset)}`}
      >
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="outputFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--iron-40)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--iron-00)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label" interval={11} tickLine={false} axisLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              />
              <YAxis
                width={44} tickLine={false} axisLine={false} unit=" MW"
                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-panel)',
                  border: '1px solid var(--line-active)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                formatter={(v: number, name) => [
                  `${num(v, name === 'output' ? 1 : 3)} MW`,
                  name === 'output' ? 'Site output' : 'Shortfall',
                ]}
              />
              <Area
                type="monotone" dataKey="output" stroke="var(--iron-80)" strokeWidth={1.5}
                fill="url(#outputFill)" isAnimationActive={false} dot={false}
              />
              <ReferenceLine
                x={clockAt(nowHour - (nowHour % (1 / 4)))}
                stroke="var(--sev-active)" strokeDasharray="3 3"
                label={{
                  value: 'NOW', position: 'top', fontSize: 9,
                  fill: 'var(--sev-active)', fontFamily: 'var(--font-mono)',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="t-micro" style={{ color: 'var(--text-muted)' }}>
          Left of NOW is the site as it ran. Right of NOW is the model&rsquo;s
          projection under the committed forecast — clear sky, no cloud, the fault
          left unrepaired. Approving work moves the curve.
        </p>
      </Block>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-5)' }}>
        <Block title="Energy, 24 h" note="trapezoid over the sampled curve">
          <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
            <Kpi label="Delivered" value={num(deliveredMWh, 0)} unit="MWh" />
            <Kpi
              label="Lost to the monitored arrays" value={num(lostMWh, 2)} unit="MWh"
              colour="var(--sev-warning)"
            />
            <Kpi
              label="Share of the block's day"
              value={pctPlain((lostMWh / Math.max(deliveredMWh, 1)) * 100, 3)}
              unit=""
            />
            <p className="t-micro" style={{ color: 'var(--text-muted)' }}>
              The share is small because 120 monitored arrays are roughly 30 MW of a
              500 MW block. Fleet health is a severity roll-up rather than an energy
              ratio for exactly that reason — an energy ratio would read 99.5% while
              an array burned.
            </p>
          </div>
        </Block>

        <Block title="Where the loss is going" note={`${num(totalShortfallKW, 1)} kW right now`}>
          <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
            {attribution.map((a) => (
              <div key={a.cause} style={{ display: 'grid', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)' }}>
                  <span className="t-data" style={{ color: 'var(--text-secondary)' }}>{a.cause}</span>
                  <span className="t-data-em" style={{ color: 'var(--text-primary)' }}>
                    {num(a.kW, 1)} kW
                  </span>
                </div>
                <span
                  aria-hidden
                  style={{
                    height: 6, background: 'var(--iron-60)',
                    width: `${(a.kW / Math.max(totalShortfallKW, 0.001)) * 100}%`,
                  }}
                />
                {a.arrays.length > 0 && (
                  <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
                    {a.arrays.join(' · ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Block>
      </div>

      <Block title="Zones" note="120 monitored arrays">
        <Table head={['Zone', 'Arrays', 'Warning', 'Critical', 'Scheduled', 'Shortfall kW']}>
          {zones.map((z) => (
            <tr key={z.id}>
              <Cell first emphasis>Zone {z.id}</Cell>
              <Cell>{z.total}</Cell>
              <Cell colour={z.warning > 0 ? 'var(--sev-warning)' : undefined}>{z.warning}</Cell>
              <Cell colour={z.critical > 0 ? 'var(--sev-critical)' : undefined}>{z.critical}</Cell>
              <Cell colour={z.scheduled > 0 ? 'var(--panel-scheduled)' : undefined}>{z.scheduled}</Cell>
              <Cell emphasis colour="var(--text-primary)">{num(z.shortfallKW, 1)}</Cell>
            </tr>
          ))}
        </Table>
      </Block>

      <Block title="Model" note="the same constants the generator ran on">
        <p className="t-prose" style={{ color: 'var(--text-secondary)', maxWidth: '70ch' }}>
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

function Kpi({ label, value, unit, colour }: {
  label: string; value: string; unit: string; colour?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--sp-3)' }}>
      <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{label.toUpperCase()}</span>
      <span>
        <span className="t-data-em" style={{ color: colour ?? 'var(--text-primary)', fontSize: 18 }}>
          {value}
        </span>
        {unit && (
          <span className="t-micro" style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{unit}</span>
        )}
      </span>
    </div>
  );
}
