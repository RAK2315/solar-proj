'use client';

/**
 * AnalysisBlock — the numbers that describe B-17, each bound to exactly one object.
 *
 * The array deviation and the string deviation are DIFFERENT QUANTITIES and are
 * labelled as such (correction C3/C10). Keeping them distinct is a credibility
 * marker: −41.7 % is the array, −58.4 % is the faulted string inside it, and
 * −58.40 × 5/7 = −41.71 is arithmetic anyone can check.
 */

import { MWh, degC, kW, pct, serviceDate, wm2 } from '@/lib/format';
import {
  getPanel, useForecast, usePanelReading, useWeather,
} from '@/store/selectors';

function Row({ label, value, colour, note }: {
  label: string; value: string; colour?: string; note?: string;
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--sp-3)',
      alignItems: 'baseline', padding: '3px 0',
    }}>
      <span className="t-data" style={{ color: 'var(--text-secondary)' }}>
        {label}
        {note && <span className="t-micro" style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{note}</span>}
      </span>
      <span className="t-data-em" style={{ color: colour ?? 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

export function AnalysisBlock() {
  const reading = usePanelReading('B-17');
  const weather = useWeather();
  const forecast = useForecast();
  const panel = getPanel('B-17');

  if (!reading || !panel) return null;

  return (
    <div>
      <Row
        label="Array deviation"
        note="B-17, 7 strings"
        value={pct(reading.deviationPct)}
        colour="var(--sev-critical)"
      />
      {reading.stringDeviationPct !== undefined && (
        <Row
          label="String deviation"
          note="B-17-S3"
          value={pct(reading.stringDeviationPct)}
          colour="var(--sev-critical)"
        />
      )}
      <Row label="Array output" value={kW(reading.actualKW)} />
      <Row label="Expected" value={kW(reading.expectedKW)} />
      <Row label="Cell temperature" value={degC(reading.cellTempC)} colour="var(--sev-warning)" />
      <Row label="Irradiance" value={wm2(weather.irradiance)} />
      <Row label="Ambient" value={degC(weather.ambientC)} />
      <Row
        label="Est. energy loss"
        note="72 h"
        value={MWh(forecast.projected72hLossMWh)}
        colour="var(--sev-warning)"
      />
      <Row label="Last serviced" value={serviceDate(panel.lastServiced)} />
      <Row label="Inverter" value={panel.inverterId} />
    </div>
  );
}
