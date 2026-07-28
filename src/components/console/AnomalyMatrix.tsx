'use client';

/**
 * AnomalyMatrix — THE SIGNATURE ELEMENT.
 *
 * A 5×7 grid rendering the array's actual physical cell layout, each cell filled
 * from the ironbow ramp by its measured ΔT. It works because it is *true*: it is a
 * physical map of a physical object, not an abstract visualisation. A judge looks
 * at it and understands instantly that the system localised the fault to specific
 * cells.
 *
 * Cells fill ONE AT A TIME in scan order across t=48..56, driven by the clock. Do
 * not fade the whole grid in — the sequential fill is what sells that a sensor is
 * reading it.
 *
 * The per-cell defect list sits directly beneath, so the grid and the text are
 * visibly the same data. That list is also the accessible channel: the ironbow ramp
 * is not colourblind-safe through the magenta→red range, so ΔT is always printed.
 *
 * This is ONE OF ONLY TWO places allowed to touch --iron-* directly (the other is
 * the GLSL LUT in ThermalPass). Both must produce the same colour for the same
 * normalised value — that identity is the whole aesthetic bet.
 */

import { deltaT } from '@/lib/format';
import { useCellGrid, useMatrixFillCount } from '@/store/selectors';

/** Ironbow stops, keyed by ΔT in °C. Mirrors IRONBOW_STOPS in thermal_hotspot.py. */
const STOPS: Array<[number, string]> = [
  [-6, 'var(--iron-00)'],
  [-2, 'var(--iron-20)'],
  [0, 'var(--iron-40)'],
  [1.5, 'var(--iron-60)'],
  [2.4, 'var(--iron-80)'],
  [2.8, 'var(--iron-95)'],
  [4, 'var(--iron-100)'],
];

/**
 * Nearest-stop rather than interpolated: CSS `var()` values cannot be mixed
 * arithmetically without resolving them, and resolving the ramp in JS would mean
 * the token stops live in two places. Seven discrete bands across a ~9 °C range
 * also reads as a quantised sensor, which is what it is.
 */
function ironbow(dt: number): string {
  let chosen = STOPS[0][1];
  for (const [threshold, colour] of STOPS) {
    if (dt >= threshold) chosen = colour;
  }
  return chosen;
}

export function AnomalyMatrix() {
  const grid = useCellGrid();
  const filled = useMatrixFillCount();

  const isDefect = (r: number, c: number) =>
    grid.defects.some((d) => d.row === r + 1 && d.col === c + 1);

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: 'var(--sp-2)' }}>
        <span />
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${grid.cols}, 1fr)`, gap: 3,
        }}>
          {Array.from({ length: grid.cols }, (_, c) => (
            <span key={c} className="t-micro"
              style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{c + 1}</span>
          ))}
        </div>

        {grid.matrix.map((row, r) => (
          <RowLabelAndCells
            key={r}
            r={r}
            row={row}
            cols={grid.cols}
            filled={filled}
            isDefect={isDefect}
          />
        ))}
      </div>

      {/* The list makes the grid legible, and is the accessible channel. */}
      <div style={{ display: 'grid', gap: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="t-h2" style={{ color: 'var(--text-muted)' }}>Cell defects</span>
          <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
            {grid.clusters} cluster · baseline {grid.baselineTempC.toFixed(1)} °C
          </span>
        </div>
        {grid.defects
          .slice()
          .sort((a, b) => a.row - b.row || a.col - b.col)
          .map((d) => {
            const index = (d.row - 1) * grid.cols + (d.col - 1);
            if (index >= filled) return null;
            return (
              <div key={`${d.row}-${d.col}`} className="t-data"
                style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  R{d.row} · C{d.col} <span style={{ color: 'var(--text-muted)' }}>{d.type}</span>
                </span>
                <span className="t-data-em" style={{ color: ironbow(d.deltaTC) }}>
                  {deltaT(d.deltaTC)}
                </span>
              </div>
            );
          })}
        <span className="t-micro" style={{ color: 'var(--text-muted)', marginTop: 2 }}>
          ΔT is a cell mean under a declared {grid.thermalSpanC} °C span — the source is
          normalised 8-bit, not radiometric.
        </span>
      </div>
    </div>
  );
}

function RowLabelAndCells({
  r, row, cols, filled, isDefect,
}: {
  r: number; row: number[]; cols: number; filled: number;
  isDefect: (r: number, c: number) => boolean;
}) {
  return (
    <>
      <span className="t-micro" style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>
        R{r + 1}
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 3 }}>
        {row.map((dt, c) => {
          const index = r * cols + c;
          const on = index < filled;
          const defect = isDefect(r, c);
          return (
            <span
              key={c}
              title={on ? `R${r + 1} C${c + 1} ${deltaT(dt)}` : undefined}
              style={{
                height: 22,
                background: on ? ironbow(dt) : 'var(--surface-inset)',
                border: on && defect
                  ? '1px solid var(--iron-100)'
                  : '1px solid var(--line-hairline)',
                transition: 'background 120ms linear',
              }}
            />
          );
        })}
      </div>
    </>
  );
}
