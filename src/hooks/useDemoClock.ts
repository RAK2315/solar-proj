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
import { useSession } from '@/store/session';

/**
 * THE ONE LOOP. It advances whichever clock the current mode uses:
 *
 *   demo  → `t`, the scripted 0..90 timeline
 *   live  → site time, which the live console derives everything from
 *
 * Adding a second loop for live mode would have been the obvious move and the
 * wrong one: two loops means two answers to "what time is it", which is the exact
 * failure the single-clock rule exists to prevent. One loop, two destinations.
 */
export function useDemoClockDriver(): void {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      // Guard against a background tab returning with a multi-second delta and
      // teleporting past the beats.
      const clamped = Math.min(dt, 0.1);

      if (useSession.getState().mode === 'demo') {
        useDemoClock.getState()._tick(clamped);
      } else {
        useSession.getState()._tickLive(clamped);
      }

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
 *   Shift+R FULL reset — the session as well as the clock
 *   C V     force console / cinematic (press again to hand the view back to t)
 *   D       show / hide the debug readout
 *   M       switch between LIVE and DEMO
 *   Esc     close the dossier
 *
 * In live mode only Space (pause site time), Shift+R, D and M apply — seeking a
 * live site would be a lie about what a console can do.
 *
 * WHY Shift+R EXISTS SEPARATELY. `R` rewinds the recording. It does not touch the
 * operator's session, and the session PERSISTS across reload — work orders,
 * missions, injected faults and site time all survive. So a rehearsal that went
 * wrong stays wrong through a refresh, and the way back was to clear browser
 * storage by hand. In front of an audience that is not a recovery, it is a stall.
 * Shift+R puts both clocks and the whole session back to first-run state.
 *
 * These write only to rehearsal state. Nothing the audience sees reads them.
 */
export function useRehearsalKeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useDemoClock.getState();
      const session = useSession.getState();

      // Escape closes the dossier before anything else looks at the key, so it
      // works in both modes and never falls through to a rehearsal control.
      // Escape closes the topmost thing: the dossier if it is open, otherwise the
      // array panel. Without the second half the only way back to a clear map was
      // to reload, which is not a thing an operator should have to discover.
      if (e.key === 'Escape') {
        if (session.dossierOpen) session.setDossier(false);
        else if (session.mode === 'live' && session.selectedPanelId) session.selectPanel(null);
        return;
      }

      // `M` swaps between the live console and the scripted demo. Everything below
      // it only makes sense in demo mode, where `t` is the timeline.
      if (e.key === 'm' || e.key === 'M') {
        session.setMode(session.mode === 'demo' ? 'live' : 'demo');
        return;
      }
      // The panic key. Works in BOTH modes, and before the mode check, because
      // the state it clears is exactly the state that makes a mode misbehave.
      if (e.key === 'R' && e.shiftKey) {
        session.resetSession();
        s.reset();
        return;
      }

      if (session.mode === 'live') {
        // Live mode: space pauses site time rather than a recording.
        if (e.key === ' ') { e.preventDefault(); session.toggleRunning(); }
        if (e.key === 'd' || e.key === 'D') s.toggleDebug();
        return;
      }

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
