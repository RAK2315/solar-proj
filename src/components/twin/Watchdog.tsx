'use client';

/**
 * Watchdog: hands the screen to the 2D map when this machine cannot hold the twin.
 *
 * Threshold confirmed 4 Oct 2026: below 30 fps averaged over 3 s. The switch is
 * automatic and one-way for the session, because a view that flips back and forth
 * is worse than either.
 *
 * This measures frames; it is not a clock. Nothing on screen reads the numbers it
 * accumulates. The one thing it ever writes is the decision to stop rendering 3D.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

import { useSession } from '@/store/session';

const WINDOW_SECONDS = 3;
const MIN_FPS = 30;
/** Shader compilation and the first layout make the opening frames meaningless. */
const SETTLE_SECONDS = 2;
/** A frame this long is a hidden tab or a breakpoint, not a slow GPU. */
const STALL_SECONDS = 0.5;

export function Watchdog() {
  const settle = useRef(0);
  const elapsed = useRef(0);
  const frames = useRef(0);

  useFrame((_, delta) => {
    if (delta > STALL_SECONDS || document.hidden) {
      elapsed.current = 0;
      frames.current = 0;
      return;
    }
    if (settle.current < SETTLE_SECONDS) { settle.current += delta; return; }

    elapsed.current += delta;
    frames.current += 1;
    if (elapsed.current < WINDOW_SECONDS) return;

    if (frames.current / elapsed.current < MIN_FPS) {
      useSession.getState().setTwinFallback('fps');
    }
    elapsed.current = 0;
    frames.current = 0;
  });

  return null;
}
