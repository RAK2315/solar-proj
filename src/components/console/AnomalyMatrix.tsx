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
 * IT USED TO RENDER AT 22px PER CELL inside the 448px rail — smaller than the text
 * beside it, for the one element this product should be remembered by. It lives in
 * the dossier now and `cellSize` is a prop, so the room it gets is the caller's
 * decision rather than a constant buried here.
 *
 * THE GRID IS DRAWN AS A DRAWING, not as a chart: one shared 1px lattice, labelled
 * C1–C7 across the top and R1–R5 down the side, and the measured ΔT printed INSIDE
 * every cell the scan has reached. Printing the value in the cell is what stops the
 * ramp being the only channel — the ironbow is not colourblind-safe through the
 * magenta→red range, so the number has to be there, and putting it in the cell
 * rather than only in a list below binds it to its position.
 *
 * Cells fill ONE AT A TIME in scan order across the thermal beat. Do not fade the
 * whole grid in — the sequential fill is what sells that a sensor is reading it.
 *
 * The per-cell defect list sits directly beneath, so the grid and the text are
 * visibly the same data, and it is the ONLY copy of that list: a second one used
 * to live in Findings.tsx under a duplicate heading.
 *
 * The ramp itself lives in src/lib/ironbow.ts, shared with the GLSL LUT in
 * ThermalPass and checked against globals.css by ironbow.test.ts. Both must
 * produce the same colour for the same normalised value — that identity is the
 * whole aesthetic bet, and it used to be three hand-typed copies.
 */

import { deltaT } from '@/lib/format';
import { ironbowForDeltaT } from '@/lib/ironbow';
import { useCellGrid, useMatrixFillCount } from '@/store/selectors';

/** Above this the cell prints its own ΔT; below it the value is lattice noise. */
const LABEL_ABOVE_C = 0.9;

export function AnomalyMatrix({ cellSize = 62 }: { cellSize?: number }) {
  const grid = useCellGrid();
  const filled = useMatrixFillCount();

  const isDefect = (r: number, c: number) =>
    grid.defects.some((d) => d.row === r + 1 && d.col === c + 1);

  const gutter = 40;

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-5)' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `${gutter}px repeat(${grid.cols}, ${cellSize}px)`,
        border: '1px solid var(--line-active)',
        background: 'var(--surface-inset)',
        justifySelf: 'start',
      }}>
        {/* Column header row. The empty corner cell keeps the lattice square. */}
        <span style={{
          background: 'var(--surface-raised)',
          borderRight: '1px solid var(--line-active)',
          borderBottom: '1px solid var(--line-active)',
          height: 26,
        }} />
        {Array.from({ length: grid.cols }, (_, c) => (
          <span
            key={`c${c}`}
            className="t-micro"
            style={{
              color: 'var(--text-secondary)', textAlign: 'center',
              background: 'var(--surface-raised)',
              borderRight: c < grid.cols - 1 ? '1px solid var(--line-hairline)' : undefined,
              borderBottom: '1px solid var(--line-active)',
              height: 26, lineHeight: '26px',
            }}
          >
            C{c + 1}
          </span>
        ))}

        {grid.matrix.map((row, r) => (
          <MatrixRow
            key={r}
            r={r}
            row={row}
            rows={grid.rows}
            cols={grid.cols}
            filled={filled}
            cellSize={cellSize}
            isDefect={isDefect}
          />
        ))}
      </div>

      {/* The list makes the grid legible, and is the accessible channel. */}
      <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          borderBottom: '1px solid var(--line-hairline)', paddingBottom: 4,
        }}>
          <span className="t-h1" style={{ color: 'var(--text-primary)' }}>Cell defects</span>
          <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
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
              <div key={`${d.row}-${d.col}`}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--surface-raised)',
                  borderLeft: `3px solid ${ironbowForDeltaT(d.deltaTC)}`,
                  padding: '6px var(--sp-3)',
                }}>
                <span className="t-data" style={{ color: 'var(--text-primary)' }}>
                  R{d.row} · C{d.col}
                  <span className="t-micro" style={{ color: 'var(--text-secondary)', marginLeft: 10 }}>
                    {d.type}
                  </span>
                </span>
                <span className="t-data-em" style={{ color: ironbowForDeltaT(d.deltaTC) }}>
                  {deltaT(d.deltaTC)}
                </span>
              </div>
            );
          })}
        {/* Two sentences doing two different jobs. The first says what the reader
            is looking at; the second is the provenance caveat, which is precise,
            load-bearing and completely opaque to anyone outside the trade. Neither
            can replace the other — dropping the caveat would overclaim, and
            leading with it means nobody reads either. */}
        <span className="t-prose" style={{
          color: 'var(--text-secondary)', marginTop: 4, fontSize: 12, lineHeight: 1.45,
        }}>
          Each figure is how much hotter that cell runs than the rest of the panel.
        </span>
        <span className="t-micro workings" style={{ color: 'var(--text-secondary)' }}>
          ΔT is a cell mean under a declared {grid.thermalSpanC} °C span — the source is
          normalised 8-bit, not radiometric.
        </span>
      </div>
    </div>
  );
}

function MatrixRow({
  r, row, rows, cols, filled, cellSize, isDefect,
}: {
  r: number; row: number[]; rows: number; cols: number; filled: number;
  cellSize: number; isDefect: (r: number, c: number) => boolean;
}) {
  const lastRow = r === rows - 1;
  return (
    <>
      <span
        className="t-micro"
        style={{
          color: 'var(--text-secondary)',
          display: 'grid', placeItems: 'center',
          background: 'var(--surface-raised)',
          borderRight: '1px solid var(--line-active)',
          borderBottom: lastRow ? undefined : '1px solid var(--line-hairline)',
        }}
      >
        R{r + 1}
      </span>
      {row.map((dt, c) => {
        const index = r * cols + c;
        const on = index < filled;
        const defect = isDefect(r, c);
        const fill = ironbowForDeltaT(dt);
        return (
          <span
            key={c}
            title={on ? `R${r + 1} C${c + 1} ${deltaT(dt)}` : undefined}
            style={{
              height: cellSize,
              display: 'grid', placeItems: 'center',
              background: on ? fill : 'var(--surface-inset)',
              // A defect keeps the near-white outline it always had; the lattice is
              // what everything else is separated by, so the outline still reads as
              // "this one" rather than as a border weight.
              outline: on && defect ? '2px solid var(--iron-100)' : undefined,
              outlineOffset: -2,
              borderRight: c < cols - 1 ? '1px solid var(--line-hairline)' : undefined,
              borderBottom: lastRow ? undefined : '1px solid var(--line-hairline)',
              transition: 'background 120ms linear',
            }}
          >
            {on && Math.abs(dt) >= LABEL_ABOVE_C && (
              <span className="t-data-em" style={{ color: 'var(--text-inverse)' }}>
                {deltaT(dt).replace(' °C', '')}
              </span>
            )}
          </span>
        );
      })}
    </>
  );
}
