'use client';

/**
 * HeaderBar — farm health, output, anomaly counts, weather, 72h outlook.
 *
 * Health tweens 94 → 80 across t=6..9 with a linear interpolation between
 * telemetry frames, so it counts down mechanically rather than stepping once per
 * second. Every numeral is tabular (set globally on :root), which is what stops the
 * digits jittering while it moves.
 *
 * The anomaly counts are derived from panel STATUS, which is derived from
 * deviation, which is derived from the physics. Nothing here is a typed pair.
 */

import { MW, degC, ms, num, pctPlain, wm2 } from '@/lib/format';
import {
  pickHealth, pickOutput, useAnomalyCounts, useFarm, useFarmHealth, useFarmOutputMW,
  useForecast, useSparkline, useWeather,
} from '@/store/selectors';
import { Sparkline } from './Sparkline';

function Kpi({
  label, value, unit, spark, colour = 'var(--text-primary)',
}: {
  label: string; value: string; unit?: string; spark?: number[]; colour?: string;
}) {
  return (
    <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
      <span className="t-h2" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--sp-3)' }}>
        <span className="t-kpi" style={{ color: colour }}>
          {value}
          {unit && (
            <span className="t-kpi-unit" style={{ marginLeft: 5, color: 'var(--text-secondary)' }}>
              {unit}
            </span>
          )}
        </span>
        {spark && <Sparkline values={spark} colour={colour} />}
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

export function HeaderBar() {
  const farm = useFarm();
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
      <div style={{ display: 'grid', gap: 2, paddingRight: 'var(--sp-4)', borderRight: '1px solid var(--line-hairline)', minWidth: 190 }}>
        <span className="t-h1" style={{ color: 'var(--sev-active)', letterSpacing: '0.18em' }}>
          SURYA AGENT
        </span>
        <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
          {farm.name.toUpperCase()} · {farm.region.split(',')[0].toUpperCase()}
        </span>
        <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
          {num(farm.lat, 3)}° N, {num(farm.lon, 3)}° E · {farm.capacityMW} MW BLOCK
        </span>
      </div>

      <Kpi
        label="Farm health"
        value={num(health, 0)}
        unit="/100"
        spark={healthSpark}
        colour={healthColour}
      />

      <Kpi label="Output" value={MW(output)} spark={outputSpark} />

      <div style={{ display: 'grid', gap: 2 }}>
        <span className="t-h2" style={{ color: 'var(--text-muted)' }}>Anomalies</span>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--sp-4)' }}>
          <span className="t-kpi">{total}</span>
          <span className="t-kpi" style={{ color: critical > 0 ? 'var(--sev-critical)' : 'var(--text-muted)' }}>
            {critical}
            <span className="t-kpi-unit" style={{ marginLeft: 5, color: 'var(--text-secondary)' }}>
              critical
            </span>
          </span>
        </div>
      </div>

      <div style={{ marginLeft: 'auto', display: 'grid', gap: 'var(--sp-2)', textAlign: 'right' }}>
        <div className="t-data" style={{ color: 'var(--text-secondary)' }}>
          {degC(weather.ambientC)} · {pctPlain(weather.cloudPct)} cloud · {ms(weather.windMs)}
          <span style={{ color: 'var(--text-muted)' }}> · {wm2(weather.irradiance)}</span>
        </div>
        <div className="t-data" style={{ color: 'var(--text-secondary)' }}>
          <span className="t-h2" style={{ color: 'var(--text-muted)', marginRight: 'var(--sp-2)' }}>
            72h outlook
          </span>
          {highs.map((h, i) => (
            <span key={i} style={{ marginLeft: 'var(--sp-2)' }}>{num(h, 0)}°</span>
          ))}
        </div>
      </div>
    </header>
  );
}
