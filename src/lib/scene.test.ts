/**
 * THE PHASE 8 ACCEPTANCE TEST — the half that does not need a GPU.
 *
 * The camera and the drone are pure functions of `t`, so the two claims that
 * actually matter can be checked without a WebGL context:
 *
 *   1. the camera hits the five marks in CLAUDE.md §14
 *   2. SEEKING BACKWARDS WORKS — sampling t twice gives identical output, which is
 *      only true because nothing integrates
 *
 * Frame rate is the one thing left for the browser.
 */

import { describe, expect, it } from 'vitest';

import {
  B17, CRUISE_ALT, INSPECT_ALT, M, ORBIT_DEG_PER_SEC, PANELS_PER_ARRAY, PAD,
  cameraAt, crackVisible, droneAt, panelInstances, thermalAmount,
} from './scene';

const dist = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);

describe('the panel field comes out of farm.json', () => {
  const panels = panelInstances();

  it('renders 120 arrays × 4 panels and stays under the 600 instance cap', () => {
    expect(panels).toHaveLength(120 * PANELS_PER_ARRAY);
    expect(panels.length).toBeLessThanOrEqual(600);
  });

  it('marks exactly one array as faulted', () => {
    const faulted = panels.filter((p) => p.faulted);
    expect(faulted).toHaveLength(PANELS_PER_ARRAY);
    expect(faulted.every((p) => p.id.startsWith('B-17-'))).toBe(true);
  });

  it('places every panel above ground, on its post', () => {
    expect(panels.every((p) => p.pos.y > 0)).toBe(true);
  });

  it('lays out 3 zones × 5 rows as 15 distinct rows, well separated', () => {
    const rows = [...new Set(panels.map((p) => p.pos.z))].sort((a, b) => a - b);
    expect(rows).toHaveLength(15);
    // Three clusters of five: the gap between zones is much larger than between rows.
    const gaps = rows.slice(1).map((z, i) => z - rows[i]);
    const zoneGaps = gaps.filter((g) => g > 10);
    expect(zoneGaps).toHaveLength(2);
  });

  it('puts 8 columns across, matching farm.json', () => {
    const cols = new Set(panels.map((p) => Math.round(p.pos.x / 1.6)));
    expect(cols.size).toBeGreaterThanOrEqual(8);
  });
});

describe('the drone flies the mission', () => {
  it('sits on the pad before dispatch', () => {
    expect(dist(droneAt(0), PAD)).toBeLessThan(0.01);
    expect(droneAt(0).y).toBeLessThan(1);
  });

  it('climbs to cruise by the end of launch', () => {
    expect(droneAt(M.transit).y).toBeCloseTo(CRUISE_ALT, 1);
  });

  it('is on station over B-17 at target lock', () => {
    expect(dist(droneAt(M.lock), B17)).toBeLessThan(0.5);
    expect(droneAt(M.lock).y).toBeCloseTo(INSPECT_ALT, 0);
  });

  it('holds station through the whole inspection', () => {
    for (const t of [36, 42, 48, 54]) {
      expect(dist(droneAt(t), B17), `drifted at t=${t}`).toBeLessThan(0.5);
    }
  });

  it('returns toward the pad after the evidence is in', () => {
    expect(dist(droneAt(M.recommendation), PAD)).toBeLessThan(0.5);
  });

  it('moves monotonically toward the target during transit', () => {
    let previous = dist(droneAt(M.transit), B17);
    for (let t = M.transit + 0.5; t <= M.lock; t += 0.5) {
      const d = dist(droneAt(t), B17);
      expect(d).toBeLessThanOrEqual(previous + 1e-6);
      previous = d;
    }
  });
});

describe('the camera hits the five marks in CLAUDE.md §14', () => {
  it('launch: low, behind the drone, wide 65°', () => {
    const c = cameraAt(M.dispatch + 0.5);
    expect(c.fov).toBe(65);
    expect(c.pos.y).toBeLessThan(12);
  });

  it('transit: tracking the drone, still wide', () => {
    const c = cameraAt(28);
    expect(c.fov).toBe(65);
    expect(dist(c.pos, droneAt(28))).toBeLessThan(40);
  });

  it('approach: descends toward B-17 and narrows to 45°', () => {
    expect(cameraAt(M.lock).fov).toBeGreaterThan(60);
    expect(cameraAt(M.rgb).fov).toBeCloseTo(45, 0);
    expect(dist(cameraAt(M.rgb).look, B17)).toBeLessThan(1);
  });

  it('inspect: near-nadir, holding 45°, looking straight at the array', () => {
    for (const t of [42, 48, 54]) {
      const c = cameraAt(t);
      expect(c.fov).toBe(45);
      expect(c.pos.y).toBeGreaterThan(15);
      expect(dist(c.look, B17)).toBeLessThan(0.5);
    }
  });

  it('inspect: orbits at 15°/s, sampled from t rather than spun', () => {
    // 8 seconds after the orbit starts must be exactly 120° round.
    const start = cameraAt(M.rgb);
    const later = cameraAt(M.rgb + 8);
    const angle = (8 * ORBIT_DEG_PER_SEC * Math.PI) / 180;
    expect(later.pos.x - B17.x).toBeCloseTo(Math.sin(angle) * 11, 4);
    expect(later.pos.z - B17.z).toBeCloseTo(Math.cos(angle) * 11, 4);
    expect(start.pos.z - B17.z).toBeCloseTo(11, 4);
  });

  it('pull out: rises and widens back to 65°', () => {
    const c = cameraAt(M.recommendation);
    expect(c.fov).toBeCloseTo(65, 0);
    expect(c.pos.y).toBeGreaterThan(cameraAt(M.thermalDone).pos.y);
  });

  it('never produces a NaN, at any t across the whole demo', () => {
    for (let t = 0; t <= 90; t += 0.1) {
      const c = cameraAt(t);
      const d = droneAt(t);
      for (const n of [c.pos.x, c.pos.y, c.pos.z, c.look.x, c.look.y, c.look.z, c.fov,
        d.x, d.y, d.z]) {
        expect(Number.isFinite(n), `NaN at t=${t.toFixed(1)}`).toBe(true);
      }
    }
  });
});

describe('THE SEEK GUARANTEE — nothing integrates', () => {
  it('gives byte-identical camera and drone for the same t, every time', () => {
    for (const t of [0, 19, 25, 34, 41, 50, 55.5, 63, 74, 90]) {
      expect(cameraAt(t)).toEqual(cameraAt(t));
      expect(droneAt(t)).toEqual(droneAt(t));
    }
  });

  it('does not care what order t is sampled in', () => {
    const forwards = [20, 30, 40, 50, 60].map(cameraAt);
    const backwards = [60, 50, 40, 30, 20].map(cameraAt).reverse();
    expect(backwards).toEqual(forwards);
  });

  it('is continuous — no jump between adjacent samples', () => {
    let previous = cameraAt(18);
    for (let t = 18.05; t <= 74; t += 0.05) {
      const c = cameraAt(t);
      const jump = Math.hypot(c.pos.x - previous.pos.x, c.pos.y - previous.pos.y,
        c.pos.z - previous.pos.z);
      expect(jump, `camera jumps ${jump.toFixed(2)}m at t=${t.toFixed(2)}`).toBeLessThan(3);
      previous = c;
    }
  });
});

describe('thermal pass and crack decal follow the script', () => {
  it('is off outside the thermal window', () => {
    expect(thermalAmount(47)).toBe(0);
    expect(thermalAmount(60)).toBe(0);
  });

  it('is fully on across the scan', () => {
    expect(thermalAmount(50)).toBe(1);
    expect(thermalAmount(55)).toBe(1);
  });

  it('shows the crack from target lock, per §14', () => {
    expect(crackVisible(M.lock - 0.1)).toBe(false);
    expect(crackVisible(M.lock)).toBe(true);
  });
});
