/**
 * src/lib/scene.ts — world-space geometry and the camera spline.
 *
 * PURE. No React, no three, no store. Every function here takes `t` and returns a
 * position, which is the property that makes the 3D view seekable: the camera does
 * not integrate toward a target, it is SAMPLED at `t`. Seek to 50 and the camera is
 * where it would have been had you played there, first frame, every time.
 *
 * Being pure also means the five camera marks from CLAUDE.md §14 can be unit-tested
 * without a WebGL context — see scene.test.ts.
 *
 * Axes: X across the rows, Z along them, Y up. The site is north-up like the map.
 */

import { farm } from './data';

/* ── Site layout, metres ─────────────────────────────────────────────────── */

export const ARRAY_SPACING_X = 7;
export const ARRAY_SPACING_Z = 5;
export const ZONE_ORIGIN_Z: Record<string, number> = { A: -62, B: 0, C: 62 };

/** Panels per array in the 3D view. 120 arrays × 4 = 480 instances, cap is 600. */
export const PANELS_PER_ARRAY = 4;
export const PANEL_SPACING_X = 1.6;
export const PANEL_W = 1.45;
export const PANEL_H = 0.9;
export const PANEL_TILT = (25 * Math.PI) / 180;   // farm.json tilt
export const POST_HEIGHT = 1.2;

export interface Vec3 { x: number; y: number; z: number }

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

/** Centre of one array, in world metres. */
export function arrayPosition(zone: string, row: number, col: number, cols: number): Vec3 {
  return v(
    (col - 1 - (cols - 1) / 2) * ARRAY_SPACING_X,
    0,
    (ZONE_ORIGIN_Z[zone] ?? 0) + (row - 1) * ARRAY_SPACING_Z,
  );
}

/** Every panel instance in the field, derived from farm.json rather than invented. */
export function panelInstances(): Array<{ id: string; pos: Vec3; faulted: boolean }> {
  const out: Array<{ id: string; pos: Vec3; faulted: boolean }> = [];
  for (const zone of farm.zones) {
    for (const p of zone.panels) {
      const base = arrayPosition(zone.id, p.row, p.col, zone.cols);
      for (let i = 0; i < PANELS_PER_ARRAY; i += 1) {
        out.push({
          id: `${p.id}-${i}`,
          pos: v(
            base.x + (i - (PANELS_PER_ARRAY - 1) / 2) * PANEL_SPACING_X,
            POST_HEIGHT,
            base.z,
          ),
          faulted: p.id === FAULTED_ARRAY_ID,
        });
      }
    }
  }
  return out;
}

export const FAULTED_ARRAY_ID = 'B-17';

/** Where B-17 actually sits — read from farm.json, not typed. */
export function faultedArrayPosition(): Vec3 {
  for (const zone of farm.zones) {
    const p = zone.panels.find((x) => x.id === FAULTED_ARRAY_ID);
    if (p) return arrayPosition(zone.id, p.row, p.col, zone.cols);
  }
  return v(0, 0, 0);
}

export const B17 = faultedArrayPosition();

/** Launch pad, off the western edge of zone C. */
export const PAD: Vec3 = v(-58, 0, 74);

/* ── Interpolation helpers ───────────────────────────────────────────────── */

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Smoothstep — eases the ENDS of a segment without ever integrating. */
export const smooth = (k: number) => k * k * (3 - 2 * k);

export const lerpVec = (a: Vec3, b: Vec3, k: number): Vec3 =>
  v(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.z, b.z, k));

/** Progress through a segment, 0 before it and 1 after. */
export const seg = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));

/* ── The mission, in seconds. Mirrors BEAT in selectors.ts. ──────────────── */

export const M = {
  dispatch: 18,
  transit: 22,
  lock: 34,
  rgb: 40,
  thermal: 48,
  thermalDone: 56,
  prognosis: 62,
  recommendation: 74,
} as const;

export const CRUISE_ALT = 34;
export const INSPECT_ALT = 12;

/* ── Drone ───────────────────────────────────────────────────────────────── */

/**
 * Drone position at `t`. Pure — no velocity, no accumulation.
 *
 * Launch (18→22) climbs off the pad, transit (22→34) crosses to B-17 while
 * descending to inspection altitude, hold (34→56) hovers on station, return
 * (56→74) climbs out and heads home.
 */
export function droneAt(t: number): Vec3 {
  if (t < M.dispatch) return v(PAD.x, 0.4, PAD.z);

  if (t < M.transit) {
    // Straight up off the pad.
    const k = smooth(seg(t, M.dispatch, M.transit));
    return v(PAD.x, lerp(0.4, CRUISE_ALT, k), PAD.z);
  }

  if (t < M.lock) {
    // Cross to the target, shedding altitude on the way in.
    const k = seg(t, M.transit, M.lock);
    const e = smooth(k);
    return v(
      lerp(PAD.x, B17.x, e),
      lerp(CRUISE_ALT, INSPECT_ALT, smooth(clamp01((k - 0.45) / 0.55))),
      lerp(PAD.z, B17.z, e),
    );
  }

  if (t < M.thermalDone) {
    // On station. The bob is a pure function of t, so it is identical on a seek,
    // and it fades in and out so the hold does not begin or end with a step.
    const settle = smooth(seg(t, M.lock, M.lock + 2)) * (1 - smooth(seg(t, M.thermalDone - 2, M.thermalDone)));
    return v(B17.x, INSPECT_ALT + Math.sin(t * 1.7) * 0.18 * settle, B17.z);
  }

  if (t < M.recommendation) {
    // Climb out and start back.
    const k = smooth(seg(t, M.thermalDone, M.recommendation));
    return v(
      lerp(B17.x, PAD.x, k),
      lerp(INSPECT_ALT, CRUISE_ALT, smooth(clamp01(k * 1.6))),
      lerp(B17.z, PAD.z, k),
    );
  }

  return v(PAD.x, CRUISE_ALT, PAD.z);
}

/* ── Camera ──────────────────────────────────────────────────────────────── */

export interface CameraSample { pos: Vec3; look: Vec3; fov: number }

export const ORBIT_DEG_PER_SEC = 15;   // CLAUDE.md §14

/**
 * Camera at `t`, hitting the five marks in CLAUDE.md §14.
 *
 *   18–22  Launch    low, behind the drone, wide FOV 65°
 *   22–34  Transit   tracking side-on, panels streaming past
 *   34–40  Approach  descend and pitch down toward B-17, FOV narrows to 45°
 *   40–56  Inspect   near-nadir, ~12 m, slow orbit at 15°/s around B-17
 *   56–74  Pull out  rise and pitch up, FOV back to 65°
 */
export function cameraAt(t: number): CameraSample {
  const drone = droneAt(t);

  // Before the cut, park behind the pad looking at the site. Never seen, but a
  // defined value means seeking to t=0 cannot produce a NaN transform.
  if (t < M.dispatch) {
    return { pos: v(PAD.x - 14, 6, PAD.z + 14), look: v(PAD.x, 2, PAD.z), fov: 65 };
  }

  if (t < M.transit) {
    // Ends exactly where the transit segment begins. Segment boundaries are where
    // a spline sampled from `t` shows its seams, so each one is solved rather than
    // eyeballed — scene.test.ts asserts no jump above 3 m anywhere in the run.
    const k = smooth(seg(t, M.dispatch, M.transit));
    return {
      pos: v(drone.x - lerp(9, 17, k), lerp(2.5, drone.y + 7, k), drone.z + lerp(11, 13, k)),
      look: drone,
      fov: 65,
    };
  }

  if (t < M.lock) {
    // Side-on chase: offset perpendicular to travel, drone in the right third.
    const k = seg(t, M.transit, M.lock);
    return {
      pos: v(drone.x - 17, drone.y + 7, drone.z + 13),
      look: v(lerp(drone.x, B17.x, k * 0.5), drone.y - 2, lerp(drone.z, B17.z, k * 0.5)),
      fov: 65,
    };
  }

  if (t < M.rgb) {
    // Approach: swing above and pitch down onto the array, narrowing to 45°.
    const k = smooth(seg(t, M.lock, M.rgb));
    return {
      // Ends on the orbit's own starting point, so the handover is exact.
      pos: lerpVec(v(B17.x - 17, INSPECT_ALT + 7, B17.z + 13), v(B17.x, 21, B17.z + 11), k),
      look: lerpVec(v(B17.x, INSPECT_ALT - 2, B17.z), v(B17.x, 1, B17.z), k),
      fov: lerp(65, 45, k),
    };
  }

  if (t < M.thermalDone) {
    // Near-nadir slow orbit. Angle is (t - start) × 15°/s — sampled, not spun, so
    // seeking to t=50 puts the camera at exactly 150° every time.
    const angle = ((t - M.rgb) * ORBIT_DEG_PER_SEC * Math.PI) / 180;
    const radius = 11;
    return {
      pos: v(B17.x + Math.sin(angle) * radius, 21, B17.z + Math.cos(angle) * radius),
      look: v(B17.x, 1, B17.z),
      fov: 45,
    };
  }

  // Pull out: rise, widen, and let the site open up again.
  const k = smooth(seg(t, M.thermalDone, M.recommendation));
  const angle = ((M.thermalDone - M.rgb) * ORBIT_DEG_PER_SEC * Math.PI) / 180;
  return {
    pos: lerpVec(
      v(B17.x + Math.sin(angle) * 11, 21, B17.z + Math.cos(angle) * 11),
      v(B17.x - 26, 58, B17.z + 62),
      k,
    ),
    look: lerpVec(v(B17.x, 1, B17.z), v(0, 0, 6), k),
    fov: lerp(45, 65, k),
  };
}

/** 0 outside the thermal window, 1 inside. Drives the ironbow post-process. */
export function thermalAmount(t: number): number {
  if (t < M.thermal || t > M.thermalDone + 1) return 0;
  const fadeIn = clamp01((t - M.thermal) / 0.6);
  const fadeOut = 1 - clamp01((t - M.thermalDone) / 1);
  return Math.min(fadeIn, fadeOut);
}

/** The crack decal becomes visible at target lock, per CLAUDE.md §14. */
export const crackVisible = (t: number) => t >= M.lock;
