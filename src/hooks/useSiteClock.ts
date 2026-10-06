'use client';

/**
 * src/hooks/useSiteClock.ts — the ONE requestAnimationFrame loop in the application.
 *
 * Mounted exactly once, from src/app/ClockDriver.tsx in the root layout. ESLint
 * bans rAF, setInterval and setTimeout inside src/components/ so a second source
 * of time cannot appear by accident.
 *
 * If two things on screen ever disagree about what time it is, the cause is a
 * timer that is not this one.
 */

import { useEffect } from 'react';

import { useSession } from '@/store/session';

/** A background tab returns with a multi-second delta. Do not teleport the site. */
const MAX_STEP_SECONDS = 0.1;

export function useSiteClockDriver(): void {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      useSession.getState()._tickLive(Math.min(dt, MAX_STEP_SECONDS));
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}

/** Ten site minutes per arrow press. */
const SEEK_SECONDS = 600;

/**
 * The console's keys. No visible list of them; the palette's buttons do the same
 * things for anyone who does not know them.
 *
 *   Space   pause or run site time
 *   R       reset: one key, from any state, including with a hazard in hand
 *   S       load the committed rehearsal state
 *   ← →     seek ten site minutes
 *   Esc     put a held hazard back, else close the dossier, else deselect
 *
 * R and S exist because plan/rework/09-risks.md R4 wants no state a judge can
 * wedge the console into that one press does not undo. The session persists
 * across a reload, so without them a rehearsal that went wrong stays wrong
 * through a refresh.
 */
export function useConsoleKeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const session = useSession.getState();

      // Escape closes the topmost thing, and works from inside a field too.
      if (e.key === 'Escape') {
        if (session.armedHazard) session.armHazard(null);
        else if (session.dossierOpen) session.setDossier(false);
        else if (session.selectedPanelId) session.selectPanel(null);
        return;
      }

      // A key typed into a field belongs to the field. The site-time slider
      // uses the arrow keys itself.
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();          // Space would otherwise scroll the page
          session.toggleRunning();
          break;
        case 'r':
        case 'R':
          session.resetSession();
          break;
        case 's':
        case 'S':
          session.loadRehearsal();
          break;
        case 'ArrowLeft':
          session.setSiteSeconds(session.siteSeconds - SEEK_SECONDS);
          break;
        case 'ArrowRight':
          session.setSiteSeconds(session.siteSeconds + SEEK_SECONDS);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
