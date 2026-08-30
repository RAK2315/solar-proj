import { describe, expect, it } from 'vitest';

import { CRACK_POLYLINES, crackCells, hotCells } from './panelCells';
import { cellGrid } from './data';

/**
 * The crack path is an ILLUSTRATION of a declared mechanism, and the cells it
 * crosses inherit exactly that status. These tests guard the two properties that
 * make it safe to draw heat on them: it is reproducible, and it is derived from
 * the polyline rather than from anybody's measurement.
 */
describe('the cells a fracture runs through', () => {
  const { rows, cols } = cellGrid;

  it('is the same set every run — nothing here is random', () => {
    const a = crackCells(rows, cols);
    const b = crackCells(rows, cols);
    expect(a).toEqual(b);
  });

  it('stays on the module', () => {
    for (const c of crackCells(rows, cols)) {
      expect(c.row).toBeGreaterThanOrEqual(1);
      expect(c.row).toBeLessThanOrEqual(rows);
      expect(c.col).toBeGreaterThanOrEqual(1);
      expect(c.col).toBeLessThanOrEqual(cols);
    }
  });

  it('lists each cell once', () => {
    const cells = crackCells(rows, cols);
    const keys = new Set(cells.map((c) => `${c.row}:${c.col}`));
    expect(keys.size).toBe(cells.length);
  });

  it('covers both ends of the drawn path, so the heat matches the line', () => {
    const cells = crackCells(rows, cols);
    const has = (row: number, col: number) =>
      cells.some((c) => c.row === row && c.col === col);
    for (const line of CRACK_POLYLINES) {
      for (const [x, y] of [line[0], line[line.length - 1]]) {
        expect(has(Math.floor(y) + 1, Math.floor(x) + 1),
          `path endpoint (${x},${y}) has no cell`).toBe(true);
      }
    }
  });

  it('samples finely enough to skip no cell along a run', () => {
    // Every step of the walk is at most one cell away from the last, so the set is
    // a connected chain rather than a dotted line with gaps in it.
    const cells = crackCells(rows, cols);
    expect(cells.length).toBeGreaterThan(3);
    for (const c of cells) {
      const touching = cells.some((o) =>
        (o.row !== c.row || o.col !== c.col)
        && Math.abs(o.row - c.row) <= 1 && Math.abs(o.col - c.col) <= 1);
      expect(touching, `cell R${c.row}C${c.col} is isolated`).toBe(true);
    }
  });

  it('is not B-17 measured evidence wearing a different name', () => {
    // The measured band is four cells in row 2 and nothing else. The crack path
    // wanders across three rows, so if these two ever coincide exactly, someone
    // has wired cellGrid.defects into the illustrated branch.
    const cells = crackCells(rows, cols);
    const measured = cellGrid.defects.map((d) => `${d.row}:${d.col}`).sort();
    const drawn = cells.map((c) => `${c.row}:${c.col}`).sort();
    expect(drawn).not.toEqual(measured);
    expect(new Set(cells.map((c) => c.row)).size).toBeGreaterThan(1);
  });
});

/**
 * THE GATE. Which cells are hot is a measurement for exactly one array and an
 * illustration for every other, and collapsing those two is the bug this project
 * has now reintroduced six times. These pin each branch to its own source.
 */
describe('hot cells carry their provenance', () => {
  const { rows, cols } = cellGrid;

  it('leaves an uncracked module cold, whatever else is true of it', () => {
    expect(hotCells(false, false)).toEqual([]);
    // Even B-17 itself: no declared crack, no heat. The capture does not license
    // heat on an array the site record calls healthy.
    expect(hotCells(false, true)).toEqual([]);
  });

  it('gives B-17 the MEASURED band and nothing else', () => {
    const hot = hotCells(true, true);
    expect(hot.map((c) => `${c.row}:${c.col}`).sort())
      .toEqual(cellGrid.defects.map((d) => `${d.row}:${d.col}`).sort());
    // One contiguous row-2 band, exactly as thermal_hotspot.py measured it.
    expect(new Set(hot.map((c) => c.row))).toEqual(new Set([2]));
    expect(cellGrid.clusters).toBe(1);
  });

  it('weights the measured band by its own dT, peak-relative', () => {
    const hot = hotCells(true, true);
    const peak = Math.max(...cellGrid.defects.map((d) => d.deltaTC));
    for (const c of hot) {
      const d = cellGrid.defects.find((x) => x.row === c.row && x.col === c.col)!;
      expect(c.weight).toBeCloseTo(d.deltaTC / peak, 6);
      expect(c.weight).toBeLessThanOrEqual(1);
    }
    expect(Math.max(...hot.map((c) => c.weight))).toBe(1);
  });

  it('gives every OTHER cracked array the crack path, derived, not the capture', () => {
    const hot = hotCells(true, false);
    // Structurally the polyline derivation — not a filtered copy of the capture.
    expect(hot).toEqual(crackCells(rows, cols).map((c) => ({ ...c, weight: 1 })));
  });

  it('claims no per-cell magnitude on an array it never measured', () => {
    // A gradient across illustrated cells would be a temperature reading nobody
    // took. One flat weight is the honest rendering.
    expect(new Set(hotCells(true, false).map((c) => c.weight))).toEqual(new Set([1]));
  });
});
