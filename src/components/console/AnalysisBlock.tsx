'use client';

/**
 * AnalysisBlock — the numbers that describe the selected array.
 *
 * REBUILT FOR WEIGHT. This was ten label/value rows at 12px with no grouping and
 * no emphasis, so a 0.0 % reading and a −41.7 % CRITICAL reading looked identical
 * and the two figures that matter were buried among eight that support them. Now
 * there is one hero pair, one second-tier row, and a grid of supporting readings —
 * three tiers instead of one.
 *
 * The array deviation and the string deviation are DIFFERENT QUANTITIES and are
 * labelled as such (correction C3/C10). Keeping them distinct is a credibility
 * marker: −41.7 % is the array, −58.4 % is the faulted string inside it, and
 * −58.40 × 5/7 = −41.71 is arithmetic anyone can check. That is why the string
 * figure keeps its own line at its own size rather than joining the grid.
 */

import { MWh, degC, kW, pct, serviceDate, wm2 } from '@/lib/format';
import {
  getPanel, useIsDark, usePanelReading, useProjectedLossMWh, useSelectedPanelId,
  useWeather,
} from '@/store/selectors';

/** The headline. One or two per rail, never more — three heroes is no hero. */
function Hero({ label, value, note, colour }: {
  label: string; value: string; note?: string; colour: string;
}) {
  return (
    <div style={{ display: 'grid', gap: 'var(--sp-1)', minWidth: 0 }}>
      <span className="t-label" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="t-hero" style={{ color: colour }}>{value}</span>
      {note && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{note}</span>}
    </div>
  );
}

/** Supporting reading. Quiet label, readable number. */
function Cell({ label, value, colour }: {
  label: string; value: string; colour?: string;
}) {
  return (
    <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
      <span className="t-label" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="t-value" style={{ color: colour ?? 'var(--text-primary)' }}>{value}</span>
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

  const deviating = reading.deviationPct < -1;
  const deviationColour = deviating ? 'var(--sev-critical)' : 'var(--text-primary)';

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
      {/* After sunset actual and expected are both zero, the deviation formula
          floors to 0.0 %, and every array on the site reads clean. Printing those
          rows anyway is how a console tells an operator that a cracked array is
          fine — so at night the deviation is declared unobservable instead. */}
      {dark ? (
        <div style={{
          border: '1px solid var(--sev-warning)', padding: 'var(--sp-3) var(--sp-4)',
        }}>
          <span className="t-h1" style={{ color: 'var(--sev-warning)' }}>
            No generation — after sunset
          </span>
          <p className="t-data" style={{ color: 'var(--text-secondary)', margin: '6px 0 0' }}>
            Deviation is not measurable at zero irradiance. Known faults are still
            tracked; the projection below is quoted at reference conditions, not at
            this hour.
          </p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: projectedLoss > 0.01 ? '1fr 1fr' : '1fr',
            gap: 'var(--sp-4)',
            background: 'var(--surface-inset)',
            border: '1px solid var(--line-hairline)',
            padding: 'var(--sp-4)',
          }}>
            <Hero
              label="Array deviation"
              value={pct(reading.deviationPct)}
              note={`${id} · ${panel.stringsPerArray} strings`}
              colour={deviationColour}
            />
            {/* The projected loss is an integral over THIS array's shortfall. An
                array that is not losing anything has no projected loss, and
                printing one would be inventing a number for it. */}
            {projectedLoss > 0.01 && (
              <Hero
                label="Est. energy loss"
                value={MWh(projectedLoss)}
                note="72 h, from the forecast curve"
                colour="var(--sev-warning)"
              />
            )}
          </div>

          {reading.stringDeviationPct !== undefined && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              gap: 'var(--sp-3)', borderBottom: '1px solid var(--line-hairline)',
              paddingBottom: 'var(--sp-3)',
            }}>
              <span className="t-label" style={{ color: 'var(--text-secondary)' }}>
                String deviation
                <span className="t-micro" style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                  {id}-S3
                </span>
              </span>
              <span className="t-value" style={{ color: 'var(--sev-critical)' }}>
                {pct(reading.stringDeviationPct)}
              </span>
            </div>
          )}
        </>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 'var(--sp-4) var(--sp-3)',
      }}>
        {!dark && <Cell label="Array output" value={kW(reading.actualKW)} />}
        {!dark && <Cell label="Expected" value={kW(reading.expectedKW)} />}
        <Cell label="Cell temperature" value={degC(reading.cellTempC)} colour="var(--sev-warning)" />
        <Cell label="Ambient" value={degC(weather.ambientC)} />
        <Cell label="Irradiance" value={wm2(weather.irradiance)} />
        <Cell label="Last serviced" value={serviceDate(panel.lastServiced)} />
        <Cell label="Inverter" value={panel.inverterId} />
      </div>
    </div>
  );
}
