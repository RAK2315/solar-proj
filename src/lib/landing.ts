/**
 * src/lib/landing.ts — the landing page's camera and its two drones.
 *
 * Pure functions of elapsed seconds, like every other path in this product, so
 * the still frame shown without WebGL is a real sample of the same motion and
 * the paths can be asserted without a GPU.
 */

import type { CameraSample, Vec3 } from './scene';

/** The middle of the field: zone B, between A and C. */
const CENTRE: Vec3 = { x: 0, y: 0, z: 16 };

/** One slow circuit of the field. Long enough that it never reads as spinning. */
export const CAMERA_LAP_SECONDS = 140;
const CAMERA_RADIUS = 96;
const CAMERA_HEIGHT = 30;

export function landingCameraAt(seconds: number, aspect: number): CameraSample {
  const a = (seconds / CAMERA_LAP_SECONDS) * Math.PI * 2;
  // A portrait window sees a narrow slice of the field. Step back so it still
  // reads as a field and not as three rows of modules.
  const k = Math.max(1, 1.5 / Math.max(aspect, 0.1));
  return {
    pos: {
      x: CENTRE.x + Math.sin(a) * CAMERA_RADIUS * k,
      // Breathes a little, so the horizon is not ruler-flat for two minutes.
      y: (CAMERA_HEIGHT + Math.sin(a * 2) * 5) * k,
      z: CENTRE.z + Math.cos(a) * CAMERA_RADIUS * k,
    },
    look: { x: CENTRE.x, y: 2, z: CENTRE.z },
    fov: 50,
  };
}

/** Each aircraft flies its own inspection loop: an ellipse over the zones. */
const LOOPS = [
  { lap: 46, rx: 40, rz: 46, alt: 13, phase: 0 },
  { lap: 64, rx: 24, rz: 30, alt: 20, phase: 0.42 },
] as const;

export const LANDING_DRONES = LOOPS.length;

export function landingDroneAt(seconds: number, index: number): Vec3 {
  const loop = LOOPS[index % LOOPS.length];
  const a = (seconds / loop.lap + loop.phase) * Math.PI * 2;
  return {
    x: CENTRE.x + Math.cos(a) * loop.rx,
    // Dips over the rows it is reading, climbs across the corridors.
    y: loop.alt + Math.sin(a * 3) * 1.5,
    z: CENTRE.z + Math.sin(a) * loop.rz,
  };
}

/** The moment the still frame is taken at. Chosen for a drone in shot. */
export const STILL_SECONDS = 18;
