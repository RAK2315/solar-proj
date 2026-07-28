'use client';

/**
 * HeaderBar — farm health, output, anomaly counts, weather, 72h outlook.
 *
 * Health tweens 94 → 80 across t=6..9, interpolated between telemetry frames so it
 * counts down mechanically rather than stepping once a second. Every numeral is
 * tabular, which is what stops the digits jittering while it moves.
 *
 * The anomaly counts are derived from panel STATUS, which is derived from
 * deviation, which is derived from the physics. Nothing here is a typed pair.
 */

import { Bell, Cloud } from 'lucide-react';

import { degC, ms, num, pctPlain, wm2 } from '@/lib/format';
import {
  pickHealth, pickOutput, useAnomalyCounts, useFarmHealth, useFarmOutputMW,
  useForecast, useSparkline, useWeather,
} from '@/store/selectors';
import { Sparkline } from './Sparkline';

function Kpi({
  label, value, unit, spark, colour = 'var(--text-primary)', after,
}: {
  label: string; value: string; unit?: string; spark?: number[];
  colour?: string; after?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
      <span className="t-h2" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-3)' }}>
        <span className="t-kpi" style={{ color: colour }}>
          {value}
          {unit && (
            <span className="t-kpi-unit" style={{ marginLeft: 4, color: 'var(--text-secondary)' }}>
              {unit}
            </span>
          )}
        </span>
        {after}
        {spark && <span style={{ alignSelf: 'center' }}><Sparkline values={spark} colour={colour} /></span>}
      </div>
    </div>
  );
}

/** Daily maxima for the next three days, read off the forecast curve. */
function useDailyHighs(): number[] {
  const forecast = useForecast();
  const highs: number[] = [];
  for (let day = 0; day < 3; day += 1) {
    const slice = forecast.points.filter(
      (p) => p.hourOffset >= day * 24 && p.hourOffset < (day + 1) * 24,
    );
    if (slice.length) highs.push(Math.max(...slice.map((p) => p.ambientC)));
  }
  return highs;
}

const DAY_LABEL = ['Today', 'Tomorrow', 'Day 3'];

export function HeaderBar() {
  const health = useFarmHealth();
  const output = useFarmOutputMW();
  const { total, critical } = useAnomalyCounts();
  const weather = useWeather();
  const highs = useDailyHighs();
  const healthSpark = useSparkline(pickHealth);
  const outputSpark = useSparkline(pickOutput);

  const healthColour = health < 85 ? 'var(--sev-critical)' : 'var(--text-primary)';

  return (
    <header
      className="area-header panel hair-b"
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-6)',
        padding: '0 var(--sp-5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', minWidth: 168 }}>
        <span style={{
          width: 26, height: 26, borderRadius: '50%',
          border: '1px solid var(--sev-active)', display: 'grid', placeItems: 'center',
        }}>
          <span style={{
            width: 9, height: 9, borderRadius: '50%', background: 'var(--sev-active)',
          }} />
        </span>
        <span style={{ display: 'grid' }}>
          <span className="t-h1" style={{ fontSize: 17, letterSpacing: '0.16em' }}>SURYA</span>
          <span className="t-micro" style={{ color: 'var(--sev-active)', letterSpacing: '0.22em' }}>
            AGENT
          </span>
        </span>
      </div>

      <Kpi
        label="Farm health"
        value={num(health, 0)}
        unit="/100"
        spark={healthSpark}
        colour={healthColour}
      />

      <Kpi label="Output" value={num(output, 0)} unit="MW" spark={outputSpark} />

      <Kpi
        label="Anomalies"
        value={String(total)}
        after={critical > 0 ? (
          <span
            className="badge badge-solid"
            style={{ background: 'var(--sev-critical)' }}
          >
            Critical {critical}
          </span>
        ) : (
          <span className="badge" style={{ color: 'var(--text-muted)' }}>Critical 0</span>
        )}
      />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
        color: 'var(--text-secondary)', paddingLeft: 'var(--sp-4)',
        borderLeft: '1px solid var(--line-hairline)',
      }}>
        <Cloud size={15} strokeWidth={1.5} aria-hidden style={{ color: 'var(--text-muted)' }} />
        <span className="t-data">
          {degC(weather.ambientC, 0)} / {pctPlain(weather.cloudPct)} cloud / {ms(weather.windMs)}
        </span>
        <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
          {wm2(weather.irradiance)}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 4 }}>
        <span className="t-h2" style={{ color: 'var(--text-muted)' }}>72h solar outlook</span>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          {highs.map((h, i) => (
            <span
              key={i}
              className="t-data"
              style={{
                padding: '3px var(--sp-3)',
                background: i === 0 ? 'var(--surface-raised)' : 'transparent',
                border: `1px solid ${i === 0 ? 'var(--line-active)' : 'transparent'}`,
                color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: 'var(--sev-warning)', marginRight: 5 }}>·</span>
              {DAY_LABEL[i].toUpperCase()}{' '}
              <span style={{ color: 'var(--text-muted)' }}>{num(h, 0)}°</span>
            </span>
          ))}
        </div>
      </div>

      <div style={{
        marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--sp-4)',
      }}>
        <span style={{ position: 'relative', color: 'var(--text-muted)' }}>
          <Bell size={17} strokeWidth={1.5} aria-hidden />
          {critical > 0 && (
            <span style={{
              position: 'absolute', top: -1, right: -1, width: 6, height: 6,
              borderRadius: '50%', background: 'var(--sev-active)',
            }} />
          )}
        </span>
        <span className="t-micro" style={{ color: 'var(--text-muted)', textAlign: 'right', lineHeight: 1.35 }}>
          SOLAR TO EARTH<br />OPERATIONS
        </span>
      </div>
    </header>
  );
}
