'use client';

/**
 * InverterTable — the single most persuasive element in the console, and the
 * cheapest. Three rows where the contrast is self-evident in one glance.
 *
 * These rows are a PEER STRING COMPARISON, not inverter aggregates (correction
 * C17). Each inverter drives 40 arrays, so a true aggregate would dilute B-17's
 * fault to about −1% and the table would show nothing. What an operator actually
 * looks at when a string alarms is the same string position on neighbouring
 * inverters — which is what this is, and the row labels say so.
 */

import { kW, pct } from '@/lib/format';
import { useInverterReadings, useSelectedPanelId } from '@/store/selectors';

export function InverterTable() {
  const readings = useInverterReadings();
  const selected = useSelectedPanelId();

  // The peer comparison is at the INSPECTED position, so the row labels follow
  // whichever array the operator is looking at rather than always naming B-17's.
  const index = selected.split('-')[1] ?? '17';
  const faultedInverter = `INV-${selected[0]}`;
  const stringLabel = (inv: string) => `${inv.replace('INV-', '')}-${index}-S3`;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['Inverter', 'String', 'Actual', 'Expected', 'Deviation'].map((h, i) => (
            <th
              key={h}
              className="t-h2"
              style={{
                color: 'var(--text-muted)',
                textAlign: i < 2 ? 'left' : 'right',
                padding: '0 0 var(--sp-2)',
                fontWeight: 600,
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Object.entries(readings).map(([id, r]) => {
          const faulted = id === faultedInverter && r.deviationPct < -1;
          const colour = faulted ? 'var(--sev-critical)' : 'var(--text-primary)';
          return (
            <tr
              key={id}
              style={{
                borderTop: '1px solid var(--line-hairline)',
                background: faulted ? 'var(--surface-raised)' : 'transparent',
              }}
            >
              <td className={faulted ? 't-data-em' : 't-data'}
                style={{ padding: 'var(--sp-2) var(--sp-2) var(--sp-2) 0', color: colour }}>
                {id}
              </td>
              <td className="t-data" style={{ color: 'var(--text-secondary)' }}>
                {stringLabel(id)}
              </td>
              <td className={faulted ? 't-data-em' : 't-data'}
                style={{ textAlign: 'right', color: colour, padding: '0 var(--sp-2)' }}>
                {kW(r.actualKW)}
              </td>
              <td className="t-data"
                style={{ textAlign: 'right', color: 'var(--text-secondary)', padding: '0 var(--sp-2)' }}>
                {kW(r.expectedKW)}
              </td>
              <td className="t-data-em"
                style={{ textAlign: 'right', color: colour, paddingRight: 0 }}>
                {pct(r.deviationPct)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
