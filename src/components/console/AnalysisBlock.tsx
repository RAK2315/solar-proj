'use client';

/**
 * AnalysisBlock — the numbers that describe the selected array.
 *
 * REBUILT FOR WEIGHT, TWICE. This was ten label/value rows at 12px with no grouping
 * and no emphasis, so a 0.0 % reading and a −41.7 % CRITICAL reading looked
 * identical. It is now two 42px figures, each on a rule coloured by its own
 * severity, then a 2×2 of supporting readings at 24px, then a hairline table of the
 * rest. Three tiers where there was one.
 *
 * The two figures on top are the two the decision turns on, and no third figure is
 * allowed to join them at that size — two heroes is a hierarchy, three is a wall.
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

/**
 * The headline. A caption, a 42px figure with its unit hung off the baseline, and a
 * 2px rule in the figure's own colour. The rule is what binds the three together
 * without a box — a box around each would make two cards, and this is one reading
 * next to another.
 */
function Hero({ label, value, unit, colour, note }: {
  label: string; value: string; unit: string; colour: string; note?: string;
}) {
  return (
    <div style={{ display: 'grid', gap: 'var(--sp-2)', minWidth: 0, color: colour }}>
      <span className="t-label" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      {/* The unit is NESTED, with the separating space inside it, so the rendered
          text is still "−41.7 %" — one string an operator (and the acceptance test)
          reads as a quantity — while the glyphs take two different sizes. Two
          sibling spans with a flex gap would drop the space from the text. */}
      <span className="t-kpi" style={{ color: 'currentColor' }}>
        {value}
        <span className="t-data-em" style={{ color: 'currentColor' }}> {unit}</span>
      </span>
      <span className="underline-rule" aria-hidden><i style={{ width: '100%' }} /></span>
      {note && (
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>{note}</span>
      )}
    </div>
  );
}

/** Second tier: a reading worth scanning, not worth 42px. */
function Reading({ label, value, colour }: {
  label: string; value: string; colour?: string;
}) {
  return (
    <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
      <span className="t-label" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="t-value" style={{
        color: colour ?? 'var(--text-primary)', whiteSpace: 'nowrap',
      }}>
        {value}
      </span>
    </div>
  );
}

/** Third tier: a fact you look up rather than scan. Label left, value right. */
function Row({ label, value, colour }: {
  label: string; value: string; colour?: string;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      gap: 'var(--sp-3)', borderBottom: '1px solid var(--line-hairline)', paddingBottom: 4,
    }}>
      <span className="t-label" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="t-data" style={{ color: colour ?? 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

/** Splits "−41.7 %" into the digits and the unit, so they can take different sizes. */
function splitUnit(formatted: string): [string, string] {
  const at = formatted.lastIndexOf(' ');
  return at === -1 ? [formatted, ''] : [formatted.slice(0, at), formatted.slice(at + 1)];
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
  const [devValue, devUnit] = splitUnit(pct(reading.deviationPct));
  const [lossValue, lossUnit] = splitUnit(MWh(projectedLoss));
  const losing = projectedLoss > 0.01;

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
      {/* After sunset actual and expected are both zero, the deviation formula
          floors to 0.0 %, and every array on the site reads clean. Printing those
          rows anyway is how a console tells an operator that a cracked array is
          fine — so at night the deviation is declared unobservable instead. */}
      {dark ? (
        <div className="keyed" style={{ color: 'var(--sev-warning)' }}>
          <span className="t-h2" style={{ color: 'var(--sev-warning-ink)' }}>
            No generation — after sunset
          </span>
          <p className="t-prose" style={{
            color: 'var(--text-secondary)', margin: 0, fontSize: 12, lineHeight: 1.5,
          }}>
            Deviation is not measurable at zero irradiance. Known faults are still
            tracked; the projection below is quoted at reference conditions, not at
            this hour.
          </p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: losing ? '1fr 1fr' : '1fr',
            gap: 'var(--sp-4)',
          }}>
            <Hero
              label="Array deviation"
              value={devValue}
              unit={devUnit}
              note={`${id} · ${panel.stringsPerArray} strings`}
              colour={deviating ? 'var(--sev-critical-ink)' : 'var(--text-primary)'}
            />
            {/* The projected loss is an integral over THIS array's shortfall. An
                array that is not losing anything has no projected loss, and
                printing one would be inventing a number for it. */}
            {losing && (
              <Hero
                label="Est. energy loss"
                value={lossValue}
                unit={lossUnit}
                note="72 h, from the forecast curve"
                colour="var(--sev-warning-ink)"
              />
            )}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)',
          }}>
            <Reading label="Array output" value={kW(reading.actualKW)} />
            <Reading label="Expected" value={kW(reading.expectedKW)}
              colour="var(--text-secondary)" />
            <Reading label="Cell temperature" value={degC(reading.cellTempC)}
              colour="var(--sev-warning-ink)" />
            <Reading label="Irradiance" value={wm2(weather.irradiance)} />
          </div>

          {reading.stringDeviationPct !== undefined && (
            <Row
              label={`String deviation · ${id}-S3`}
              value={pct(reading.stringDeviationPct)}
              colour="var(--sev-critical-ink)"
            />
          )}
        </>
      )}

      <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        {dark && <Row label="Cell temperature" value={degC(reading.cellTempC)} />}
        {dark && <Row label="Irradiance" value={wm2(weather.irradiance)} />}
        <Row label="Ambient" value={degC(weather.ambientC)} />
        <Row label="Inverter" value={panel.inverterId} />
        <Row label="Last serviced" value={serviceDate(panel.lastServiced)} />
      </div>
    </div>
  );
}
