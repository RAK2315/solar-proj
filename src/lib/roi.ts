/**
 * src/lib/roi.ts — the part of the drone's camera frame the detector is handed.
 *
 * The detector was trained on photographs of one panel filling the picture.
 * Scored offline on a real capture: tight on the module, Cracked 0.92; the same
 * frame with generous margin, 0.81; the whole frame, nothing at all. So the
 * module is cropped, with a small margin, before the model sees it.
 *
 * Cropping changes WHICH PIXELS the model is asked about, never what it says
 * about them.
 */

import { ASPECT, reticleRect, type Vec3 } from './scene';

export interface FrameRegion { x: number; y: number; w: number; h: number }

/** Margin around the module, as a fraction of its own projected size. */
const MODULE_MARGIN = 0.06;

export function moduleRoi(t: number, target: Vec3, aspect = ASPECT): FrameRegion | undefined {
  const r = reticleRect(t, target, aspect);
  if (!r.visible || r.width <= 0.02 || r.height <= 0.02) return undefined;
  const padX = r.width * MODULE_MARGIN;
  const padY = r.height * MODULE_MARGIN;
  const x = Math.max(0, r.left - padX);
  const y = Math.max(0, r.top - padY);
  // Clamped against the origin, not independently of it: `w` capped at 1 while
  // `x` sat at 0.6 described a region running off the right of the frame.
  return { x, y, w: Math.min(1 - x, r.width + padX * 2), h: Math.min(1 - y, r.height + padY * 2) };
}
