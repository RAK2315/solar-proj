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

export const ARRAY_SPACING_X = 13;
export const ARRAY_SPACING_Z = 9;
export const ZONE_ORIGIN_Z: Record<string, number> = { A: -112, B: 0, C: 112 };

/** Panels per array in the 3D view. 120 arrays × 4 = 480 instances, cap is 600. */
export const PANELS_PER_ARRAY = 4;
export const PANEL_SPACING_X = 2.9;
export const PANEL_W = 2.6;
export const PANEL_H = 1.6;
export const PANEL_TILT = (25 * Math.PI) / 180;   // farm.json tilt
export const POST_HEIGHT = 1.5;

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
export const PAD: Vec3 = v(-104, 0, 136);

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

export const CRUISE_ALT = 46;
/** Low enough that ONE module fills a meaningful part of the frame. */
export const INSPECT_ALT = 7.5;
export const ORBIT_RADIUS = 2.6;

/** Index of the cracked module within the array's four panels. */
export const DAMAGED_INDEX = 1;

/** Offset of a module from its array centre. */
export const moduleOffsetX = (i: number) =>
  (i - (PANELS_PER_ARRAY - 1) / 2) * PANEL_SPACING_X;

/**
 * The damaged module itself, matching where CrackedPanel draws the crack. The
 * camera aims HERE rather than at the array centre, so the reticle frames one
 * module rather than the whole row of four.
 */
export const DAMAGED_MODULE: Vec3 = {
  x: B17.x + moduleOffsetX(DAMAGED_INDEX),
  y: POST_HEIGHT,
  z: B17.z,
};

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
    // On station over the DAMAGED MODULE, orbiting it slowly. The orbit is the
    // camera move from CLAUDE.md §14 — 15°/s — and because the camera rides the
    // drone from t=21, flying the orbit here IS the camera move.
    const angle = ((t - M.rgb) * ORBIT_DEG_PER_SEC * Math.PI) / 180;
    const enter = smooth(seg(t, M.lock, M.rgb));
    const radius = ORBIT_RADIUS * enter;
    const settle = smooth(seg(t, M.lock, M.lock + 2))
      * (1 - smooth(seg(t, M.thermalDone - 2, M.thermalDone)));
    return v(
      DAMAGED_MODULE.x + Math.sin(angle) * radius,
      INSPECT_ALT + Math.sin(t * 1.7) * 0.12 * settle,
      DAMAGED_MODULE.z + Math.cos(angle) * radius,
    );
  }

  if (t < M.recommendation) {
    // Climb out and start back.
    const k = smooth(seg(t, M.thermalDone, M.recommendation));
    const exitAngle = ((M.thermalDone - M.rgb) * ORBIT_DEG_PER_SEC * Math.PI) / 180;
    const from = v(
      DAMAGED_MODULE.x + Math.sin(exitAngle) * ORBIT_RADIUS,
      INSPECT_ALT,
      DAMAGED_MODULE.z + Math.cos(exitAngle) * ORBIT_RADIUS,
    );
    return v(
      lerp(from.x, PAD.x, k),
      lerp(INSPECT_ALT, CRUISE_ALT, smooth(clamp01(k * 1.6))),
      lerp(from.z, PAD.z, k),
    );
  }

  return v(PAD.x, CRUISE_ALT, PAD.z);
}

/* ── Camera ──────────────────────────────────────────────────────────────── */

export interface CameraSample { pos: Vec3; look: Vec3; fov: number }

export const ORBIT_DEG_PER_SEC = 15;   // CLAUDE.md §14

/** The camera rides the drone from here until the evidence is in. */
export const POV_IN = 21;
export const POV_OUT = M.thermalDone;

export const isPOV = (t: number) => t >= POV_IN && t < POV_OUT;

/** Hide the aircraft while we are inside it, or we would see its own shell. */
export const droneVisible = (t: number) => !isPOV(t);

/** Sit the eye slightly below the airframe, where a gimbal actually hangs. */
const GIMBAL_DROP = 0.4;

/**
 * Camera at `t`.
 *
 *   18–21  Establish  external, low and behind — you watch it leave the pad
 *   21–34  POV        RIDING THE DRONE, looking ahead and down, field streaming
 *   34–40  POV        gimbal pitches down onto the damaged module
 *   40–56  POV        near-nadir, orbiting that module at 15°/s
 *   56–74  Pull out   external again, rising and widening as it flies home
 *
 * The POV window is the change from the first cut. Three seconds of watching the
 * aircraft is enough to establish it; after that, being ON it is both how an
 * inspection is actually flown and what makes the reticle mean something, because
 * the thing in the crosshairs is the thing the camera is looking at.
 */
export function cameraAt(t: number): CameraSample {
  const drone = droneAt(t);

  // Before the cut, park behind the pad. Never seen, but a defined value means
  // seeking to t=0 cannot produce a NaN transform.
  if (t < M.dispatch) {
    return { pos: v(PAD.x - 16, 7, PAD.z + 16), look: v(PAD.x, 2, PAD.z), fov: 65 };
  }

  if (t < POV_IN) {
    // Establishing: external, low, closing on the aircraft as it climbs away.
    const k = smooth(seg(t, M.dispatch, POV_IN));
    return {
      pos: v(
        drone.x - lerp(11, 0.1, k),
        lerp(3, drone.y - GIMBAL_DROP, k),
        drone.z + lerp(15, 0.1, k),
      ),
      look: lerpVec(drone, v(B17.x, drone.y - 12, B17.z), k * 0.35),
      fov: 65,
    };
  }

  if (t < M.lock) {
    // POV. The look point is a FORWARD SAMPLE of the same pure function, so the
    // view leads the aircraft without anything being integrated, then swings onto
    // the target as it arrives.
    const ahead = droneAt(Math.min(t + 1.8, M.lock));
    const k = smooth(seg(t, POV_IN, M.lock));
    return {
      pos: v(drone.x, drone.y - GIMBAL_DROP, drone.z),
      look: lerpVec(
        v(ahead.x, ahead.y - 14, ahead.z),
        DAMAGED_MODULE,
        k,
      ),
      fov: lerp(65, 52, k),
    };
  }

  if (t < M.rgb) {
    // Still POV; the gimbal settles to nadir and narrows onto the module.
    const k = smooth(seg(t, M.lock, M.rgb));
    return {
      pos: v(drone.x, drone.y - GIMBAL_DROP, drone.z),
      look: DAMAGED_MODULE,
      fov: lerp(52, 45, k),
    };
  }

  if (t < M.thermalDone) {
    // Near-nadir inspection. The drone flies the 15°/s orbit and the camera rides
    // it, so the orbit from CLAUDE.md §14 and the flight path are the same thing.
    return {
      pos: v(drone.x, drone.y - GIMBAL_DROP, drone.z),
      look: DAMAGED_MODULE,
      fov: 45,
    };
  }

  // Pull out: hand back to an external view, rising and widening as it departs.
  const k = smooth(seg(t, M.thermalDone, M.recommendation));
  const exitAngle = ((M.thermalDone - M.rgb) * ORBIT_DEG_PER_SEC * Math.PI) / 180;
  return {
    pos: lerpVec(
      v(
        DAMAGED_MODULE.x + Math.sin(exitAngle) * ORBIT_RADIUS,
        INSPECT_ALT - GIMBAL_DROP,
        DAMAGED_MODULE.z + Math.cos(exitAngle) * ORBIT_RADIUS,
      ),
      v(B17.x - 62, 104, B17.z + 132),
      k,
    ),
    look: lerpVec(DAMAGED_MODULE, v(0, 0, 14), k),
    fov: lerp(45, 65, k),
  };
}

/* ── Projection — pure, so the overlays can frame real geometry ──────────── */

export const ASPECT = 1920 / 1080;

export interface Screen { x: number; y: number; visible: boolean }

/**
 * World point → normalised screen position (0..1, y down).
 *
 * Computed here rather than by reaching into the R3F canvas, so the reticle and
 * the panel ID tags are derived from the SAME pure camera the scene is drawn
 * with. They cannot drift out of register with the render, and they can be
 * unit-tested without a GPU.
 */
export function projectToScreen(world: Vec3, cam: CameraSample, aspect = ASPECT): Screen {
  const fx = cam.look.x - cam.pos.x;
  const fy = cam.look.y - cam.pos.y;
  const fz = cam.look.z - cam.pos.z;
  const fl = Math.hypot(fx, fy, fz) || 1;
  const f = { x: fx / fl, y: fy / fl, z: fz / fl };

  // right = forward × worldUp = (fz, 0, −fx), renormalised in the XZ plane. When
  // the camera looks straight down this degenerates, so it falls back to +X.
  let rx = f.z;
  let rz = -f.x;
  const rl = Math.hypot(rx, rz);
  if (rl < 1e-6) { rx = 1; rz = 0; } else { rx /= rl; rz /= rl; }
  const r = { x: rx, y: 0, z: rz };

  // up = right × forward
  const u = {
    x: r.y * f.z - r.z * f.y,
    y: r.z * f.x - r.x * f.z,
    z: r.x * f.y - r.y * f.x,
  };

  const dx = world.x - cam.pos.x;
  const dy = world.y - cam.pos.y;
  const dz = world.z - cam.pos.z;

  const depth = dx * f.x + dy * f.y + dz * f.z;
  if (depth <= 0.05) return { x: 0.5, y: 0.5, visible: false };

  const right = dx * r.x + dy * r.y + dz * r.z;
  const up = dx * u.x + dy * u.y + dz * u.z;

  const tanHalf = Math.tan((cam.fov * Math.PI) / 360);
  const ndcX = right / (depth * tanHalf * aspect);
  const ndcY = up / (depth * tanHalf);

  const x = (ndcX + 1) / 2;
  const y = (1 - ndcY) / 2;
  return { x, y, visible: x > -0.25 && x < 1.25 && y > -0.25 && y < 1.25 };
}

export interface Rect {
  left: number; top: number; width: number; height: number; visible: boolean;
}

/**
 * Screen rect around the DAMAGED MODULE ONLY — not the whole array.
 *
 * The first cut used a fixed screen box, which framed four arrays at once and
 * quietly undercut the claim the reticle is making. This projects that one
 * module's four corners, so the brackets sit on the thing the agent is discussing.
 */
export function reticleRect(t: number, aspect = ASPECT): Rect {
  const cam = cameraAt(t);
  const hw = PANEL_W / 2;
  const hh = PANEL_H / 2;
  const corners: Vec3[] = [
    { x: DAMAGED_MODULE.x - hw, y: DAMAGED_MODULE.y, z: DAMAGED_MODULE.z - hh },
    { x: DAMAGED_MODULE.x + hw, y: DAMAGED_MODULE.y, z: DAMAGED_MODULE.z - hh },
    { x: DAMAGED_MODULE.x - hw, y: DAMAGED_MODULE.y, z: DAMAGED_MODULE.z + hh },
    { x: DAMAGED_MODULE.x + hw, y: DAMAGED_MODULE.y, z: DAMAGED_MODULE.z + hh },
  ];

  const pts = corners.map((c) => projectToScreen(c, cam, aspect));
  if (pts.some((p) => !p.visible)) {
    return { left: 0, top: 0, width: 0, height: 0, visible: false };
  }

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  // Breathing room, so the brackets sit outside the module rather than on it.
  const padX = 0.024;
  const padY = 0.036;
  return {
    left: left - padX,
    top: top - padY,
    width: Math.max(...xs) - left + padX * 2,
    height: Math.max(...ys) - top + padY * 2,
    visible: true,
  };
}

export interface Label {
  id: string; x: number; y: number; faulted: boolean; near: number;
}

/**
 * Array ID tags for the arrays currently in shot.
 *
 * These answer a specific doubt out loud: "did the drone actually go to B-17, or
 * to a panel that merely looks right?" With the neighbours labelled too, the
 * answer is legible on screen instead of asserted in a caption.
 */
export function visibleLabels(t: number, aspect = ASPECT, max = 9): Label[] {
  const cam = cameraAt(t);
  const out: Label[] = [];

  for (const zone of farm.zones) {
    for (const p of zone.panels) {
      const base = arrayPosition(zone.id, p.row, p.col, zone.cols);
      const near = Math.hypot(base.x - DAMAGED_MODULE.x, base.z - DAMAGED_MODULE.z);
      if (near > ARRAY_SPACING_X * 2.4) continue;

      const s = projectToScreen({ x: base.x, y: POST_HEIGHT + 1.2, z: base.z }, cam, aspect);
      if (!s.visible || s.x < 0.03 || s.x > 0.97 || s.y < 0.05 || s.y > 0.95) continue;

      out.push({ id: p.id, x: s.x, y: s.y, faulted: p.id === FAULTED_ARRAY_ID, near });
    }
  }

  return out.sort((a, b) => a.near - b.near).slice(0, max);
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
