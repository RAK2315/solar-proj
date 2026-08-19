'use client';

/**
 * ReturnToConsole — the way out of a live inspection.
 *
 * A dispatched mission takes the screen, because an inspection IS the thing the
 * operator just asked for. But taking the screen without offering a way back is
 * how software earns a reputation for fighting its user, so this sits top-centre
 * and hands the console back immediately. The flight keeps going: the mission is
 * state, not a video, and the map, the feed and the detail rail all carry on
 * showing it. Pressing C does the same thing.
 *
 * Not shown during the scripted run — the beats there are a recording, and a
 * button inviting someone to leave halfway through is an invitation to break it.
 */

import { useDemoClock } from '@/store/demoClock';
import { useFlightCue } from '@/store/flightCue';
import { useMode } from '@/store/selectors';

export function ReturnToConsole() {
  const mode = useMode();
  const cue = useFlightCue();
  const forceView = useDemoClock((s) => s.forceView);

  if (mode !== 'live' || !cue.active) return null;

  return (
    <button
      type="button"
      className="btn-reset t-h1"
      onClick={() => forceView('console')}
      style={{
        position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
        background: 'color-mix(in srgb, var(--surface-panel) 92%, transparent)',
        border: '1px solid var(--line-active)',
        color: 'var(--text-secondary)',
        padding: 'var(--sp-2) var(--sp-4)',
        cursor: 'pointer',
      }}
    >
      <span aria-hidden style={{ color: 'var(--sev-active)' }}>←</span>
      RETURN TO CONSOLE
      <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
        FLIGHT CONTINUES
      </span>
    </button>
  );
}
