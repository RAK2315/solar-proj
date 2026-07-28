'use client';

/**
 * src/hooks/useDemoClock.ts — the ONE requestAnimationFrame loop in the application.
 *
 * Mounted exactly once, from src/app/ClockDriver.tsx in the root layout. ESLint bans
 * rAF, setInterval and setTimeout inside src/components/ so a second source of time
 * cannot appear by accident — that is the failure mode CLAUDE.md §17 ranks as most
 * likely, and it is the one that desyncs the console from the cinematic.
 *
 * If two things on screen ever disagree about what time it is, the cause is a timer
 * that is not this one.
 */

import { useEffect } from 'react';

import { DEMO_DURATION, SEEK_STEP, useDemoClock } from '@/store/demoClock';

/** Advances `t` by wall-clock delta × speed. The only writer of `t` besides seek. */
export function useDemoClockDriver(): void {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      // Guard against a background tab returning with a multi-second delta and
      // teleporting the demo past its own beats.
      useDemoClock.getState()._tick(Math.min(dt, 0.1));
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}

/**
 * Rehearsal keys. No visible UI — CLAUDE.md §6.
 *
 *   Space   play / pause
 *   ← →     seek ∓5s
 *   1 2 3   speed 0.5× / 1× / 2×
 *   R       reset
 *   C V     force console / cinematic (press again to hand the view back to t)
 *   D       show / hide the debug readout
 *
 * These write only to rehearsal state. Nothing the audience sees reads them.
 */
export function useRehearsalKeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useDemoClock.getState();

      switch (e.key) {
        case ' ':
          e.preventDefault();          // Space would otherwise scroll the page
          s.toggle();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          s.seekBy(-SEEK_STEP);
          break;
        case 'ArrowRight':
          e.preventDefault();
          s.seekBy(SEEK_STEP);
          break;
        case 'Home':
          s.seek(0);
          break;
        case 'End':
          s.seek(DEMO_DURATION);
          break;
        case '1':
          s.setSpeed(0.5);
          break;
        case '2':
          s.setSpeed(1);
          break;
        case '3':
          s.setSpeed(2);
          break;
        case 'r':
        case 'R':
          s.reset();
          break;
        case 'c':
        case 'C':
          s.forceView('console');
          break;
        case 'v':
        case 'V':
          s.forceView('cinematic');
          break;
        case 'd':
        case 'D':
          s.toggleDebug();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
