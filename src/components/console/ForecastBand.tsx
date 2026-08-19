'use client';

/**
 * ForecastBand — the 72-hour outlook, and the risk badge that carries the deadline.
 *
 * This chart is the answer to "why an agent and not a threshold dashboard?". A rule
 * engine tells you a string is down. This combines the confirmed defect state, the
 * degradation mechanism and the forecast to say *when it becomes unrecoverable* —
 * and that produces a deadline no threshold can produce.
 *
 * recharts earns its place here (band + reference line + axis), unlike the header
 * sparklines where it would be 90 kB to draw one polyline.
 */

import {
  Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis,
} from 'recharts';

import { MWh, degC } from '@/lib/format';
import { useForecast, useProjectedLossMWh, useSelectedPanelId } from '@/store/selectors';

/**
 * `showRisk` — the forecast curve is the SITE's weather and applies to every
 * array. The RISK HIGH badge and the act-before hour are not: they come from the
 * cracked cell's own thermal-dose calculation, and hanging them off a soiled array
 * would be claiming a deadline nobody computed for it.
 */
export function ForecastBand({ showRisk = true }: { showRisk?: boolean }) {
  const forecast = useForecast();
  const panelId = useSelectedPanelId();
  // The committed 3.07 MWh belongs to B-17. This block printed it under every
  // array in the site, which told an operator that a healthy array in zone C was
  // about to lose three megawatt-hours to a crack it does not have.
  const projectedLoss = useProjectedLossMWh(panelId);

  const data = forecast.points.map((p) => ({
    h: p.hourOffset,
    ambientC: p.ambientC,
    irradiance: p.irradiance,
  }));

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
      <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        {showRisk && (
          <span
            className="t-h2"
            style={{
              background: 'var(--sev-critical)', color: 'var(--text-inverse)',
              padding: '3px var(--sp-2)',
            }}
          >
            RISK HIGH · ACT BEFORE {forecast.actBefore}
          </span>
        )}
        <span
          className="t-h2"
          style={{
            border: '1px solid var(--sev-warning)', color: 'var(--sev-warning)',
            padding: '3px var(--sp-2)',
          }}
        >
          {forecast.summary}
        </span>
      </div>

      {/* The chart is IDENTICAL for all 120 arrays and nothing said so, which read
          as a bug: an operator clicks through four arrays, sees the same curve, and
          concludes it is stuck. It is the site's weather. Say that on the chart. */}
      <p className="t-micro" style={{ color: 'var(--text-secondary)', margin: 0 }}>
        Site ambient forecast — the same curve for every array.
        {showRisk
          ? ` Risk, deadline and projected loss below are computed for ${panelId}.`
          : ` Projected loss below is computed for ${panelId}.`}
      </p>

      <div style={{ height: 96, marginLeft: -8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="ambient-band" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--iron-80)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--iron-80)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="h"
              ticks={[0, 24, 48, 72]}
              tickFormatter={(h) => `+${h}h`}
              tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--line-hairline)' }}
              tickLine={false}
            />
            <YAxis
              domain={['dataMin - 1', 'dataMax + 1']}
              width={30}
              tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v.toFixed(0)}°`}
            />
            <ReferenceLine
              y={forecast.peakAmbientC}
              stroke="var(--sev-critical)"
              strokeDasharray="3 3"
              label={{
                value: `PEAK ${degC(forecast.peakAmbientC)}`,
                fill: 'var(--sev-critical)',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                position: 'insideTopRight',
              }}
            />
            <Area
              type="monotone"
              dataKey="ambientC"
              stroke="var(--iron-80)"
              strokeWidth={1.5}
              fill="url(#ambient-band)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="t-data" style={{
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--sp-2)',
      }}>
        <span style={{ color: 'var(--text-secondary)' }}>Clear hours</span>
        <span className="t-data-em">{forecast.clearHours} h</span>
        {projectedLoss > 0.01 ? (
          <>
            <span style={{ color: 'var(--text-secondary)' }}>
              Projected loss
              <span className="t-micro" style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>
                {panelId}
              </span>
            </span>
            <span className="t-data-em" style={{ color: 'var(--sev-warning)' }}>
              {MWh(projectedLoss)} / 72 h
            </span>
          </>
        ) : (
          <>
            <span style={{ color: 'var(--text-secondary)' }}>Projected loss</span>
            <span className="t-data-em" style={{ color: 'var(--text-secondary)' }}>
              none — {panelId} is not deviating
            </span>
          </>
        )}
      </div>
    </div>
  );
}
