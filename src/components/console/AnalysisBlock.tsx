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
  getPanel, useIsDark, usePanelReading, useProjectedLossMWh, useSelectedPanelId,
  useWeather,
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
  const id = useSelectedPanelId();
  const reading = usePanelReading(id);
  const weather = useWeather();
  const panel = getPanel(id);
  const dark = useIsDark();
  const projectedLoss = useProjectedLossMWh(id);

  if (!reading || !panel) return null;

  return (
    <div>
      {/* After sunset actual and expected are both zero, the deviation formula
          floors to 0.0 %, and every array on the site reads clean. Printing those
          rows anyway is how a console tells an operator that a cracked array is
          fine — so at night the deviation is declared unobservable instead. */}
      {dark ? (
        <div style={{
          border: '1px solid var(--sev-warning)', padding: 'var(--sp-2) var(--sp-3)',
          marginBottom: 'var(--sp-2)',
        }}>
          <span className="t-h2" style={{ color: 'var(--sev-warning)' }}>
            No generation — after sunset
          </span>
          <p className="t-micro" style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Deviation is not measurable at zero irradiance. Known faults are still
            tracked; the projection below is quoted at reference conditions, not at
            this hour.
          </p>
        </div>
      ) : (
        <>
          <Row
            label="Array deviation"
            note={`${id}, ${panel.stringsPerArray} strings`}
            value={pct(reading.deviationPct)}
            colour="var(--sev-critical)"
          />
          {reading.stringDeviationPct !== undefined && (
            <Row
              label="String deviation"
              note={`${id}-S3`}
              value={pct(reading.stringDeviationPct)}
              colour="var(--sev-critical)"
            />
          )}
          <Row label="Array output" value={kW(reading.actualKW)} />
          <Row label="Expected" value={kW(reading.expectedKW)} />
        </>
      )}
      <Row label="Cell temperature" value={degC(reading.cellTempC)} colour="var(--sev-warning)" />
      <Row label="Irradiance" value={wm2(weather.irradiance)} />
      <Row label="Ambient" value={degC(weather.ambientC)} />
      {/* The projected loss is an integral over THIS array's shortfall. An array
          that is not losing anything has no projected loss, and printing one would
          be inventing a number for it. */}
      {projectedLoss > 0.01 && (
        <Row
          label="Est. energy loss"
          note="72 h"
          value={MWh(projectedLoss)}
          colour="var(--sev-warning)"
        />
      )}
      <Row label="Last serviced" value={serviceDate(panel.lastServiced)} />
      <Row label="Inverter" value={panel.inverterId} />
    </div>
  );
}
