import { describe, expect, it } from 'vitest';

import { cellGrid } from './data';
import { hotCells } from './panelCells';
import { fracturePaths, fractureSpine, panelSurfaceMesh, panelPoint } from './panelSurface';
import { PANEL_H, PANEL_W } from './scene';

describe('the physical panel surface', () => {
  it('places cell centres inside their own surface region with no UV flip', () => {
    const [left, front] = panelPoint(0, 0);
    const [right, back] = panelPoint(cellGrid.cols, cellGrid.rows);
    expect([left, front]).toEqual([-PANEL_W / 2, -PANEL_H / 2]);
    expect([right, back]).toEqual([PANEL_W / 2, PANEL_H / 2]);
    for (const cell of hotCells(true, true)) {
      const [x, z] = panelPoint(cell.col - 0.5, cell.row - 0.5);
      expect(x).toBeGreaterThan(left);
      expect(x).toBeLessThan(right);
      expect(z).toBeGreaterThan(front);
      expect(z).toBeLessThan(back);
    }
  });

  it('leaves healthy and soiled surfaces unfractured, even on the reference array', () => {
    for (const measured of [false, true]) {
      const mesh = panelSurfaceMesh(false, measured);
      expect(mesh.bevels).toEqual([]);
      expect(mesh.recesses).toEqual([]);
      expect(mesh.splinters).toEqual([]);
    }
  });

  it('keeps the primary reference fracture inside its thermal band and other paths independent', () => {
    const rows = new Set(cellGrid.defects.map((c) => c.row));
    for (const [, y] of fractureSpine(true)) expect(rows.has(Math.floor(y) + 1)).toBe(true);
    expect(fractureSpine(false)).not.toEqual(fractureSpine(true));
    expect(new Set(fractureSpine(false).map(([, y]) => Math.floor(y) + 1)).size).toBeGreaterThan(1);
  });

  it('produces finite, upward facing glass triangles and actual fracture depth', () => {
    for (const measured of [false, true]) {
      const mesh = panelSurfaceMesh(true, measured);
      expect(mesh.faces.every(Number.isFinite)).toBe(true);
      expect(mesh.bevels.every(Number.isFinite)).toBe(true);
      const heights = new Set(mesh.bevels.filter((_, i) => i % 3 === 1));
      expect(heights.size).toBeGreaterThan(1);
      for (let i = 0; i < mesh.faces.length; i += 9) {
        const [ax, , az, bx, , bz, cx, , cz] = mesh.faces.slice(i, i + 9);
        const upward = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
        expect(upward).toBeGreaterThan(0);
      }
      for (const positions of [mesh.faces, mesh.bevels, mesh.recesses, mesh.splinters]) {
        expect(positions.every(Number.isFinite)).toBe(true);
        for (let i = 0; i < positions.length; i += 3) {
          expect(Math.abs(positions[i])).toBeLessThanOrEqual(PANEL_W / 2);
          expect(Math.abs(positions[i + 2])).toBeLessThanOrEqual(PANEL_H / 2);
        }
      }
    }
  });

  it('opens gaps instead of painting lines across a continuous sheet', () => {
    const area = (faces: number[]) => {
      let result = 0;
      for (let i = 0; i < faces.length; i += 9) {
        const [ax, , az, bx, , bz, cx, , cz] = faces.slice(i, i + 9);
        result += ((bz - az) * (cx - ax) - (bx - ax) * (cz - az)) / 2;
      }
      return result;
    };
    expect(area(panelSurfaceMesh(false, false).faces)).toBeCloseTo(PANEL_W * PANEL_H);
    for (const measured of [false, true]) {
      const remaining = area(panelSurfaceMesh(true, measured).faces);
      expect(remaining).toBeLessThan(PANEL_W * PANEL_H);
      expect(remaining).toBeGreaterThan(PANEL_W * PANEL_H * 0.88);
    }
  });

  it('keeps the large fracture on the hot band independently of the cover-glass branches', () => {
    for (const measured of [false, true]) {
      const crossed = new Set<string>();
      for (const line of fracturePaths(measured)) {
        for (let i = 1; i < line.length; i += 1) {
          const a = line[i - 1];
          const b = line[i];
          for (let step = 0; step <= 100; step += 1) {
            const k = step / 100;
            crossed.add(`${Math.floor(a[1] + (b[1] - a[1]) * k) + 1}:${Math.floor(a[0] + (b[0] - a[0]) * k) + 1}`);
          }
        }
      }
      expect([...crossed].sort()).toEqual(hotCells(true, measured).map((c) => `${c.row}:${c.col}`).sort());
    }
    const heated = new Set(hotCells(true, true).map((c) => `${c.row}:${c.col}`));
    for (const mesh of [panelSurfaceMesh(true, true).bevels, panelSurfaceMesh(true, true).recesses]) {
      for (let i = 0; i < mesh.length; i += 3) {
        const col = Math.floor((mesh[i] / PANEL_W + 0.5) * cellGrid.cols) + 1;
        const row = Math.floor((mesh[i + 2] / PANEL_H + 0.5) * cellGrid.rows) + 1;
        expect(heated.has(`${row}:${col}`)).toBe(true);
      }
    }
    const branches = panelSurfaceMesh(true, true).splinters;
    expect(branches.length).toBeGreaterThan(0);
    expect(branches.some((value, i) => i % 3 === 2 && Math.floor((value / PANEL_H + 0.5) * cellGrid.rows) + 1 !== 2)).toBe(true);
  });
});
