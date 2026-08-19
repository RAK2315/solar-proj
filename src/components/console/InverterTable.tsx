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
 *
 * DENSITY RULES, from the reference console: no row stripes, no vertical borders,
 * 1px horizontal dividers only, condensed caps for the header, tabular mono for the
 * cells. The faulted row is the one exception — it gets a tinted ground and its own
 * top and bottom edge, because it is the point of the table.
 */

import { kW, pct } from '@/lib/format';
import { useInverterReadings, useSelectedPanelId } from '@/store/selectors';

const HEAD = ['Inverter', 'String', 'Actual', 'Expected', 'Dev'] as const;

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
          {HEAD.map((h, i) => (
            <th
              key={h}
              className="t-label"
              style={{
                color: 'var(--text-secondary)',
                textAlign: i < 2 ? 'left' : 'right',
                padding: '0 0 5px',
                borderBottom: '1px solid var(--line-active)',
                whiteSpace: 'nowrap',
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
          const colour = faulted ? 'var(--sev-critical-ink)' : 'var(--text-primary)';
          const cell = {
            padding: '6px 0',
            color: faulted ? colour : 'var(--text-secondary)',
            borderBottom: faulted
              ? '1px solid var(--sev-critical)'
              : '1px solid var(--line-hairline)',
            borderTop: faulted ? '1px solid var(--sev-critical)' : undefined,
            whiteSpace: 'nowrap' as const,
          };
          return (
            <tr
              key={id}
              style={{
                background: faulted
                  ? 'color-mix(in srgb, var(--sev-critical) 12%, transparent)'
                  : 'transparent',
              }}
            >
              <td className={faulted ? 't-data-em' : 't-data'}
                style={{ ...cell, color: colour, paddingLeft: faulted ? 6 : 0 }}>
                {id}
              </td>
              <td className="t-data" style={cell}>{stringLabel(id)}</td>
              <td className={faulted ? 't-data-em' : 't-data'}
                style={{ ...cell, textAlign: 'right', color: colour }}>
                {kW(r.actualKW)}
              </td>
              <td className="t-data" style={{ ...cell, textAlign: 'right' }}>
                {kW(r.expectedKW)}
              </td>
              <td className="t-data-em"
                style={{
                  ...cell, textAlign: 'right', color: colour,
                  paddingRight: faulted ? 6 : 0,
                }}>
                {pct(r.deviationPct)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
