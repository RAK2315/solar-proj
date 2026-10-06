/**
 * The one way out of the canvas: turn a pointer position into a point on the ground.
 *
 * The hazard palette lives in the DOM and a drag can start on one of its buttons,
 * so the pointer events never reach the canvas. The camera lives inside the
 * canvas. TwinCamera publishes this function while it is mounted and takes it
 * away when it is not; nothing else is shared.
 */

export interface GroundPoint { x: number; z: number }

export const twinProbe: { toGround: ((clientX: number, clientY: number) => GroundPoint | null) | null } = {
  toGround: null,
};
