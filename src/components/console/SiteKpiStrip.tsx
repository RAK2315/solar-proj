'use client';

/**
 * SiteKpiStrip — the four figures the operator reads first, at the size that says
 * so.
 *
 * These were four 34px numbers wedged into a 72px chrome bar between the logo and
 * a notification bell. The complaint the redesign exists to answer was that the
 * number that matters looked exactly like the label beside it; here a figure is
 * 52px against an 11px caption, which is 4.7×.
 *
 * Four cells sharing edges rather than four cards with gaps: this is a tiled slab,
 * the way a SCADA header is built, and the shared rule is what stops it reading as
 * a dashboard of widgets.
 *
 * Every figure is derived. Health and output tween between telemetry frames, the
 * anomaly counts come from panel STATUS which comes from deviation which comes from
 * the physics, and the conditions are the current frame's weather. Nothing here is
 * a typed pair.
 */

import { degC, ms, num, pctPlain, wm2 } from '@/lib/format';
import {
  pickOutput, useAnomalyCounts, useFarmHealth, useFarmOutputMW, useSparkline,
  useWeather, useZoneBreakdown,
} from '@/store/selectors';

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <span className="t-h1" style={{ color: 'var(--text-secondary)' }}>{children}</span>
  );
}

/** Figure + unit, baseline-aligned so the unit hangs off the digits. */
function Figure({ value, unit, colour = 'var(--text-primary)' }: {
  value: string; unit?: string; colour?: string;
}) {
  return (
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span className="t-hero" style={{ color: colour }}>{value}</span>
      {unit && (
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>{unit}</span>
      )}
    </span>
  );
}

/** A filled rule under a figure. Reads as a gauge without being a progress bar. */
function Rule({ pct, colour }: { pct: number; colour: string }) {
  return (
    <span className="underline-rule" style={{ color: colour }} aria-hidden>
      <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </span>
  );
}

/** Trend, drawn as a filled area so it reads at a glance rather than as a hairline. */
function Trend({ values, colour }: { values: number[]; colour: string }) {
  if (values.length < 2) return <span style={{ height: 26 }} aria-hidden />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = 100 / (values.length - 1);
  const pts = values
    .map((v, i) => `${(i * step).toFixed(2)},${(20 - ((v - min) / span) * 18).toFixed(2)}`)
    .join(' ');

  return (
    <svg viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden
      style={{ width: '100%', height: 26, display: 'block', color: colour }}>
      <polygon points={`0,20 ${pts} 100,20`} fill="currentColor" opacity={0.12} />
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1}
        vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * The anomaly count, keyed to where the anomalies are. Six bars, one per zone
 * half, each lit by the worst status in it — so the count has a shape as well as a
 * value and an operator can see that the trouble is in B before reading a word.
 */
function ZoneBars() {
  const zones = useZoneBreakdown();
  const bars = zones.flatMap((z) => [
    { key: `${z.id}-crit`, on: z.critical > 0, warn: z.warning > 0, h: z.critical > 0 ? 100 : 30 },
    { key: `${z.id}-warn`, on: false, warn: z.warning > 0, h: z.warning > 0 ? 68 : 22 },
  ]);

  return (
    <span aria-hidden style={{
      display: 'flex', alignItems: 'flex-end', gap: 3, height: 26,
    }}>
      {bars.map((b) => (
        <span
          key={b.key}
          style={{
            flex: 1, height: `${b.h}%`,
            background: b.on ? 'var(--sev-critical)'
              : b.warn ? 'var(--sev-warning)' : 'var(--line-active)',
          }}
        />
      ))}
    </span>
  );
}

function Condition({ value, unit, label, colour = 'var(--text-primary)' }: {
  value: string; unit?: string; label: string; colour?: string;
}) {
  return (
    <span style={{ display: 'grid', alignContent: 'end', gap: 3, minWidth: 0 }}>
      <span className="t-value" style={{ color: colour, whiteSpace: 'nowrap' }}>
        {value}
        {unit && (
          <span className="t-micro" style={{ color: 'var(--text-secondary)', marginLeft: 2 }}>
            {unit}
          </span>
        )}
      </span>
      <span className="t-micro" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </span>
  );
}

export function SiteKpiStrip() {
  const health = useFarmHealth();
  const output = useFarmOutputMW();
  const { total, critical } = useAnomalyCounts();
  const weather = useWeather();
  const outputSpark = useSparkline(pickOutput);

  const warn = Math.max(0, total - critical);
  const healthColour = health < 85 ? 'var(--sev-critical-ink)' : 'var(--sev-active)';

  return (
    <section className="area-kpi panel hair-b" aria-label="Site status"
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr' }}>

      <div className="kpi-cell">
        <Caption>Farm health</Caption>
        <Figure value={num(health, 0)} unit="/ 100" colour={healthColour} />
        <Rule pct={health} colour={healthColour} />
      </div>

      <div className="kpi-cell">
        <Caption>Output</Caption>
        <Figure value={num(output, 0)} unit="MW" colour="var(--sev-active)" />
        {/* A trend, not a gauge: output has no honest denominator on screen — the
            block's nameplate is 500 MW and 73% of it is the correct reading, not a
            three-quarters-empty bar. */}
        <Trend values={outputSpark} colour="var(--sev-active)" />
      </div>

      <div className="kpi-cell">
        <Caption>Anomalies</Caption>
        <span style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--sp-3)' }}>
          <span className="t-hero" style={{
            color: critical > 0 ? 'var(--sev-critical-ink)' : 'var(--text-primary)',
          }}>
            {total}
          </span>
          <span style={{ display: 'grid', gap: 3, paddingBottom: 4 }}>
            <span className="chip" style={{
              background: critical > 0 ? 'var(--sev-critical)' : 'var(--surface-high)',
              color: critical > 0 ? 'var(--text-inverse)' : 'var(--text-secondary)',
            }}>
              Critical {critical}
            </span>
            <span className="chip" style={{
              background: warn > 0 ? 'var(--sev-warning)' : 'var(--surface-high)',
              color: warn > 0 ? 'var(--text-inverse)' : 'var(--text-secondary)',
            }}>
              Warn {warn}
            </span>
          </span>
        </span>
        <ZoneBars />
      </div>

      <div className="kpi-cell">
        <Caption>Site conditions</Caption>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--sp-3)', height: '100%', paddingBottom: 2,
        }}>
          <Condition value={degC(weather.ambientC, 0).replace(' °C', '°')} label="TEMP" />
          <Condition value={pctPlain(weather.cloudPct).replace(' %', '%')} label="CLOUD" />
          <Condition value={ms(weather.windMs).replace(' m/s', '')} label="M/S WND" />
          <Condition
            value={wm2(weather.irradiance).replace(' W/m²', '')}
            label="W/m² IRR"
            colour="var(--sev-active)"
          />
        </div>
      </div>
    </section>
  );
}
