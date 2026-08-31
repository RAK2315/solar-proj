'use client';

/**
 * src/hooks/useFitToWindow.ts — the console fits the screen it is actually on.
 *
 * WHY THIS EXISTS. CLAUDE.md §3 says "Desktop only, fixed 1920×1080 target. Do not
 * spend time on responsive layouts — this runs on a projector." That was the right
 * call for a recording and it is the wrong call for a product somebody opens on a
 * laptop: the console sat in a 1920×1080 box with black space around it, edges cut
 * off, and nothing could be reached below the fold.
 *
 * The fix is NOT a responsive layout, and deliberately so. Reflowing this console
 * at other widths would mean rebuilding every screen and re-pinning every test
 * that asserts what is on screen at a given second. Instead the whole thing is
 * SCALED, like a slide fitting a projector: the design stays exactly 1920×1080,
 * every proportion is preserved, and the browser draws it at whatever size the
 * window allows.
 *
 * Text scales with it, which is the point — at 70 % of a 1080p design on a 1440×900
 * laptop the 52 px figures are still 36 px, and the hierarchy that the redesign
 * fought for survives. A reflow would have broken it.
 *
 * NOT A SECOND CLOCK. `resize` is an event, not a timer. The single-rAF rule in
 * §6 is about anything that DRIVES state over time, and this fires only when the
 * user changes the window.
 */

import { useEffect, useState } from 'react';

/** The design's own size. Matches `--shell-w` / `--shell-h` in globals.css. */
export const SHELL_W = 1920;
export const SHELL_H = 1080;

/**
 * How much to scale the console so it fills the window, in either direction.
 *
 * The cap at 1 came off deliberately. Zooming out enlarges the CSS viewport and
 * shrinks the device pixel ratio by the same factor, so a capped fit answers a
 * zoom-out by drawing the console PHYSICALLY smaller inside a growing bezel.
 * Scaling past 1:1 cancels that exactly, which is what a fitted design should do.
 */
export function useFitToWindow(): number {
  // 1 on the server and on the first client render, so the markup the server sent
  // and the markup React first produces agree. The real value arrives in an
  // effect, exactly like `useHydrated`.
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => {
      const next = Math.min(
        window.innerWidth / SHELL_W,
        window.innerHeight / SHELL_H,
      );
      // Guard against a zero-height window (a background tab in some browsers),
      // which would otherwise collapse the console to nothing and leave it there.
      setScale(next > 0.05 ? next : 1);
    };

    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  return scale;
}
