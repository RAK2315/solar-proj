import { cellGrid } from './data';
import { CRACK_POLYLINES, hotCells } from './panelCells';
import { PANEL_H, PANEL_W } from './scene';

type Point = readonly [number, number];

interface SurfaceMesh { faces: number[]; bevels: number[]; recesses: number[]; splinters: number[] }

const GLASS_BOTTOM = 0.036;
const GLASS_TOP = 0.043;
const GROOVE_HALF_WIDTH = 0.022;
const RECESS_HALF_WIDTH = 0.006;
const EPSILON = 1e-10;
const SHARD_GAP = 0.0015;
const SHARD_BEVEL = 0.004;

/** The glass and heat share this transform; neither relies on box-face UVs. */
export function panelPoint(col: number, row: number): Point {
  return [(col / cellGrid.cols - 0.5) * PANEL_W, (row / cellGrid.rows - 0.5) * PANEL_H];
}

/** The shape is illustrative; the reference cells retain their measured position. */
export function fractureSpine(measured: boolean): Point[] {
  if (!measured) return [...CRACK_POLYLINES[0]];
  const cells = [...hotCells(true, true)].sort((a, b) => a.col - b.col);
  if (!cells.length) return [];
  const points: Point[] = cells.map((cell, i) => [cell.col - 0.5, cell.row - 0.5 + (i % 2 ? -0.2 : 0.2)]);
  return [
    [cells[0].col - 0.85, points[0][1] - 0.1],
    ...points,
    [cells[cells.length - 1].col - 0.15, points[points.length - 1][1] + 0.1],
  ];
}

export function fracturePaths(measured: boolean): readonly (readonly Point[])[] {
  return measured ? [fractureSpine(true)] : CRACK_POLYLINES;
}

function area(points: readonly Point[]): number {
  return points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + p[0] * q[1] - p[1] * q[0];
  }, 0) / 2;
}

function clipPolygon(polygon: readonly Point[], normal: Point, limit: number): Point[] {
  const out: Point[] = [];
  polygon.forEach((end, i) => {
    const start = polygon[(i + polygon.length - 1) % polygon.length];
    const a = start[0] * normal[0] + start[1] * normal[1] - limit;
    const b = end[0] * normal[0] + end[1] * normal[1] - limit;
    if ((a <= 0) !== (b <= 0)) {
      const k = a / (a - b);
      out.push([start[0] + (end[0] - start[0]) * k, start[1] + (end[1] - start[1]) * k]);
    }
    if (b <= 0) out.push(end);
  });
  return out;
}

/** Cover-glass branches can cross cold cells without implying electrical heat. */
function fragments(boundary: Point[], measured: boolean): Point[][] {
  const sites: Point[] = Array.from({ length: 28 }, (_, i) => panelPoint(
    (((i + 1) * 0.61803398875) % 1) * cellGrid.cols,
    (((i + 1) * 0.41421356237 + 0.19) % 1) * cellGrid.rows,
  ));
  // The cover-glass fracture field is independent of the electrical band.
  // Retaining its fine irregular edges makes damage legible between camera poses.
  const divisions = cellGrid.cols * 2 + 1;
  const reference = measured ? hotCells(true, true) : [];
  const meanRow = reference.reduce((sum, c) => sum + c.row - 0.5, 0) / Math.max(1, reference.length);
  const path = CRACK_POLYLINES[0];
  const spine: Point[] = Array.from({ length: divisions + 1 }, (_, i) => {
    const x = cellGrid.cols * i / divisions;
    if (measured) return [x, meanRow + Math.sin(i * 2.1) * 0.16];
    const next = path.findIndex((p) => p[0] >= x);
    if (next <= 0) return [x, path[next < 0 ? path.length - 1 : 0][1]];
    const a = path[next - 1];
    const b = path[next];
    return [x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])];
  });
  spine.slice(4, -4).forEach(([x, y], i) => {
    sites.push(panelPoint(x + Math.sin(i * 2.6) * 0.11, y - 0.22));
    sites.push(panelPoint(x + Math.cos(i * 3.1) * 0.12, y + 0.18));
  });
  return sites.map((site, i) => {
    let outline = boundary;
    sites.forEach((other, j) => {
      if (i === j) return;
      const normal: Point = [other[0] - site[0], other[1] - site[1]];
      const limit = ((site[0] + other[0]) * normal[0] + (site[1] + other[1]) * normal[1]) / 2;
      outline = clipPolygon(outline, normal, limit);
    });
    return outline;
  });
}

/** Limiting the inset prevents acute glass fragments from folding inside out. */
function insetPolygon(points: readonly Point[], distance: number): Point[] {
  const centre: Point = [
    points.reduce((sum, p) => sum + p[0], 0) / points.length,
    points.reduce((sum, p) => sum + p[1], 0) / points.length,
  ];
  const clearance = Math.min(...points.map((a, i) => {
    const b = points[(i + 1) % points.length];
    return Math.abs((b[0] - a[0]) * (centre[1] - a[1]) - (b[1] - a[1]) * (centre[0] - a[0]))
      / Math.hypot(b[0] - a[0], b[1] - a[1]);
  }));
  const amount = Math.min(0.32, distance / clearance);
  return points.map((p) => [p[0] + (centre[0] - p[0]) * amount, p[1] + (centre[1] - p[1]) * amount]);
}

/** Convex subtraction leaves no extra seams across the intact glass. */
function subtractPolygon(polygon: readonly Point[], cut: readonly Point[]): Point[][] {
  let inside = [...polygon];
  const outside: Point[][] = [];
  cut.forEach((start, i) => {
    const end = cut[(i + 1) % cut.length];
    const normal: Point = [end[1] - start[1], start[0] - end[0]];
    if (Math.hypot(...normal) <= EPSILON) return;
    const limit = start[0] * normal[0] + start[1] * normal[1];
    const remainder = clipPolygon(inside, [-normal[0], -normal[1]], -limit);
    if (area(remainder) > EPSILON) outside.push(remainder);
    inside = clipPolygon(inside, normal, limit);
  });
  return outside;
}

/** Mitered edges keep an angular crack continuous at its bends, with tapered tips. */
function ribbon(path: readonly Point[], width: number): { left: Point[]; right: Point[] } {
  const left: Point[] = [];
  const right: Point[] = [];
  const normal = (a: Point, b: Point): Point => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
  };
  path.forEach((p, i) => {
    const before = normal(path[Math.max(0, i - 1)], path[Math.max(1, i)]);
    const after = normal(path[Math.min(i, path.length - 2)], path[Math.min(i + 1, path.length - 1)]);
    const sum: Point = [before[0] + after[0], before[1] + after[1]];
    const length = Math.hypot(...sum);
    const miter: Point = [sum[0] / length, sum[1] / length];
    const taper = i === 0 || i === path.length - 1 ? 0 : 1;
    const scale = width * taper / Math.max(0.5, miter[0] * after[0] + miter[1] * after[1]);
    left.push([p[0] + miter[0] * scale, p[1] + miter[1] * scale]);
    right.push([p[0] - miter[0] * scale, p[1] - miter[1] * scale]);
  });
  return { left, right };
}

/** The recess is cut out of the cover glass; its sloped walls respond to light. */
export function panelSurfaceMesh(cracked: boolean, measured: boolean): SurfaceMesh {
  const boundary = [panelPoint(0, 0), panelPoint(cellGrid.cols, 0),
    panelPoint(cellGrid.cols, cellGrid.rows), panelPoint(0, cellGrid.rows)];
  let sheets: Point[][] = cracked ? fragments(boundary, measured) : [boundary];
  const faces: number[] = [];
  const bevels: number[] = [];
  const recesses: number[] = [];
  const splinters: number[] = [];
  const vertex = (p: Point, y: number) => [p[0], y, p[1]];
  const quad = (out: number[], a: Point, ay: number, b: Point, by: number, c: Point, cy: number, d: Point, dy: number) => {
    out.push(...vertex(a, ay), ...vertex(b, by), ...vertex(c, cy),
      ...vertex(a, ay), ...vertex(c, cy), ...vertex(d, dy));
  };
  if (cracked) {
    sheets = sheets.map((outline) => {
      const outer = insetPolygon(outline, SHARD_GAP);
      const top = insetPolygon(outline, SHARD_GAP + SHARD_BEVEL);
      outer.forEach((p, i) => {
        const next = (i + 1) % outer.length;
        quad(splinters, p, GLASS_BOTTOM, top[i], GLASS_TOP,
          top[next], GLASS_TOP, outer[next], GLASS_BOTTOM);
      });
      return top;
    });
    for (const path of fracturePaths(measured)) {
      const points = path.map(([col, row]) => panelPoint(col, row));
      if (points.length < 2) continue;
      const outer = ribbon(points, GROOVE_HALF_WIDTH);
      const inner = ribbon(points, RECESS_HALF_WIDTH);
      for (let i = 1; i < points.length; i += 1) {
        const cut = [outer.left[i - 1], outer.right[i - 1], outer.right[i], outer.left[i]];
        sheets = sheets.flatMap((fragment) => subtractPolygon(fragment, cut));
        quad(bevels, outer.left[i - 1], GLASS_TOP, outer.left[i], GLASS_TOP,
          inner.left[i], GLASS_BOTTOM, inner.left[i - 1], GLASS_BOTTOM);
        quad(bevels, inner.right[i - 1], GLASS_BOTTOM, inner.right[i], GLASS_BOTTOM,
          outer.right[i], GLASS_TOP, outer.right[i - 1], GLASS_TOP);
        quad(recesses, inner.left[i - 1], GLASS_BOTTOM, inner.left[i], GLASS_BOTTOM,
          inner.right[i], GLASS_BOTTOM, inner.right[i - 1], GLASS_BOTTOM);
      }
    }
  }
  for (const polygon of sheets) {
    for (let i = 1; i < polygon.length - 1; i += 1) {
      const triangle = [polygon[0], polygon[i], polygon[i + 1]];
      if (area(triangle) <= EPSILON) continue;
      faces.push(...vertex(triangle[0], GLASS_TOP), ...vertex(triangle[2], GLASS_TOP), ...vertex(triangle[1], GLASS_TOP));
    }
  }
  return { faces, bevels, recesses, splinters };
}
