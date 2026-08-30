/**
 * src/lib/panelCells.ts — the crack, in cell coordinates.
 *
 * PURE. No React, no three. It exists so the crack polyline is written down ONCE
 * and two things read it: the stroke drawn into the panel's albedo texture, and
 * the set of cells that fracture runs through. Those had drifted apart the moment
 * they were two lists.
 *
 * `hotCells` lives here rather than inside CrackedPanel for one reason: choosing
 * between a measurement and an illustration is the decision this project gets
 * wrong most often, and a pure function can be unit-tested where a private helper
 * in a client component cannot.
 *
 * Coordinates are (col, row) in CELL WIDTHS, origin at the module's top-left, so
 * the same path draws correctly at any texture resolution.
 *
 * WHAT KIND OF CLAIM THIS IS. The polyline is an illustration of a MECHANISM the
 * site record declares for an array — "cracked" — not a measurement of where that
 * array's fracture actually runs. `crackCells` inherits exactly that status: the
 * cells it returns may be drawn hot, because reverse-bias heating on a bypassed
 * substring is physics that holds for any cracked module, but they are never a
 * measurement and must never be presented as one. The one MEASURED cell set in
 * this project is B-17's, in data/evidence/b17_cellgrid.json, and it is gated on
 * `hasCapturedEvidence`. See CrackedPanel.tsx's docstring for the full three-way
 * split.
 */

import { cellGrid } from './data';

export interface Cell {
  /** 1-indexed, matching the R1..R5 / 1..7 labels the anomaly matrix draws. */
  row: number;
  col: number;
}

/**
 * The fracture: a main branching run plus one spur, in cell coordinates.
 *
 * Deterministic, and deliberately so — `Math.random()` is banned across src/
 * precisely because a crack that reshaped itself on reload would be the clearest
 * possible sign that the scene is decoration.
 */
export const CRACK_POLYLINES: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[2.1, 0.6], [2.6, 1.15], [3.4, 1.5], [4.2, 1.35], [5.1, 1.75], [5.8, 2.4]],
  [[3.4, 1.5], [3.7, 2.3], [3.3, 2.9]],
];

/**
 * Step along each segment, in cell widths. Small enough that a segment cannot skip
 * a cell it clips the corner of — the shortest segment above is ~0.5 cells long,
 * so this samples it 25 times.
 */
const STEP = 0.02;

/**
 * Which cells the fracture passes through, 1-indexed, ordered top-left to
 * bottom-right. Same input, same output, every run.
 */
export function crackCells(rows: number, cols: number): Cell[] {
  const seen = new Set<string>();
  const out: Cell[] = [];

  const add = (colFloat: number, rowFloat: number) => {
    const col = Math.floor(colFloat) + 1;
    const row = Math.floor(rowFloat) + 1;
    if (col < 1 || col > cols || row < 1 || row > rows) return;
    const key = `${row}:${col}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ row, col });
  };

  for (const line of CRACK_POLYLINES) {
    for (let i = 1; i < line.length; i += 1) {
      const [x0, y0] = line[i - 1];
      const [x1, y1] = line[i];
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / STEP));
      for (let s = 0; s <= steps; s += 1) {
        const k = s / steps;
        add(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k);
      }
    }
  }

  return out.sort((a, b) => a.row - b.row || a.col - b.col);
}

/** A cell that runs hot, and how hot relative to the hottest one on the module. */
export interface HotCell extends Cell {
  /** 0..1, peak-relative. Never a temperature — see `hotCells`. */
  weight: number;
}

/**
 * Which cells of a module run hot, and where that answer came from.
 *
 * THIS IS THE GATE, and it is the whole reason this function exists on its own.
 *
 *   measured  = hasCapturedEvidence(panelId)  -> B-17 and nobody else. The four
 *               cells come out of the real UAV thermal frame in
 *               data/evidence/b17_cellgrid.json.
 *   otherwise = the cells the illustrated fracture crosses. Reverse-bias heating
 *               on a bypassed substring is physics that holds for any cracked
 *               module, so drawing heat there is the same category of claim the
 *               crack line already is — but it is NOT a measurement, and
 *               `cellGrid.defects` must never be read on this path.
 *
 * Reading `cellGrid.defects` for an array other than B-17 is the most repeated bug
 * in this project. It has been found in six places. `panelCells.test.ts` asserts
 * the two branches are structurally what they claim to be.
 */
export function hotCells(cracked: boolean, measured: boolean): HotCell[] {
  if (!cracked) return [];

  if (measured) {
    // Weighted by their own dT so the band is not flat, though the four were
    // measured within 0.1 C of each other and it should barely show.
    const peak = Math.max(...cellGrid.defects.map((d) => d.deltaTC));
    return cellGrid.defects.map((d) => ({
      row: d.row, col: d.col, weight: peak > 0 ? d.deltaTC / peak : 1,
    }));
  }

  // One intensity across the path: there is no per-cell magnitude to claim here,
  // and fading them differently would be inventing a measurement to justify the
  // gradient.
  return crackCells(cellGrid.rows, cellGrid.cols).map((c) => ({ ...c, weight: 1 }));
}
