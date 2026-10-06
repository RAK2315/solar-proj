/**
 * src/lib/twinCamera.ts — where the twin's camera sits when no drone is flying.
 *
 * The mission camera in lib/scene.ts parks behind the drone pad until a flight
 * starts, which is right for a flight and useless as the main view. This is the
 * resting view of the whole field. Pure, like every other camera here, so the
 * framing can be asserted without a GPU.
 */

import type { CameraSample } from './scene';

export type TwinView = 'perspective' | 'top';

/** The point on the ground both views look at. Zone B sits at z = 0..32. */
export const TWIN_LOOK = { x: 0, y: 0, z: 38 } as const;
export const TWIN_FOV = 58;

const HEIGHT = 84;
const BACK = 84;
/** Top view: high and almost overhead, with enough offset to keep north up. */
const TOP_HEIGHT = 168;
const TOP_BACK = 14;
const TOP_LOOK_Z = 16;

const SWAY_RAD = 0.3;
/** Real seconds per full sway at any site speed. */
const SWAY_SECONDS = 30;
/** Below this the field's width no longer fits a fixed vertical lens. */
const MIN_ASPECT = 1.5;

/**
 * The field camera.
 *
 * The sway is a function of site time, so it pauses and seeks with everything
 * else. It is divided by the time scale because the site runs anywhere from 1x to
 * 600x: a sway keyed to raw site seconds takes three real seconds at full speed.
 */
export function fieldCameraAt(
  siteSeconds: number,
  timeScale: number,
  aspect: number,
  view: TwinView = 'perspective',
): CameraSample {
  // A narrow box crops the field's width, so pull back until it fits again.
  const k = Math.max(1, MIN_ASPECT / Math.max(aspect, 0.1));

  if (view === 'top') {
    return {
      pos: { x: 0, y: TOP_HEIGHT * k, z: TOP_LOOK_Z + TOP_BACK * k },
      look: { x: 0, y: 0, z: TOP_LOOK_Z },
      fov: TWIN_FOV,
    };
  }

  const phase = siteSeconds / (SWAY_SECONDS * Math.max(1, timeScale));
  const a = Math.sin(phase * Math.PI * 2) * SWAY_RAD;
  return {
    pos: {
      x: TWIN_LOOK.x + Math.sin(a) * BACK * k,
      y: HEIGHT * k,
      z: TWIN_LOOK.z + Math.cos(a) * BACK * k,
    },
    look: { ...TWIN_LOOK },
    fov: TWIN_FOV,
  };
}
