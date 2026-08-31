'use client';

/**
 * FlightSpeed — how fast the flight runs, from inside the flight.
 *
 * A mission is 56 minutes of site time. At 1x that is 56 minutes of YOUR time,
 * and the drone crawls across the map so slowly that the obvious reading is that
 * the simulation has frozen — which is exactly the reading it got. The cinematic
 * had no time control at all, so once the view cut you were committed to whatever
 * speed the console happened to be on, with no way to tell a slow flight from a
 * stopped one.
 *
 * So: the same speeds the console offers, in the corner of the viewfinder, plus
 * the one number that actually answers the question — how long this flight will
 * take in real seconds at the current setting.
 *
 * It writes to the same `timeScale` the console does. There is one site clock and
 * this is a second control on it, not a second clock.
 */

import { MISSION_TOTAL, useSession } from '@/store/session';

/** Matches TimeControl's, so the two controls cannot disagree about what exists. */
const SPEEDS = [
  { label: '1×', scale: 1 },
  { label: '60×', scale: 60 },
  { label: '600×', scale: 600 },
] as const;

export function FlightSpeed() {
  const timeScale = useSession((s) => s.timeScale);
  const setTimeScale = useSession((s) => s.setTimeScale);
  const running = useSession((s) => s.running);

  // How long the whole sortie takes at this setting, in real seconds.
  const realSeconds = MISSION_TOTAL / Math.max(1, timeScale);
  const duration = realSeconds >= 90
    ? `${Math.round(realSeconds / 60)} min`
    : `${Math.round(realSeconds)} s`;

  return (
    <div
      style={{
        // Above the status pill, not in the centre band. This is a CONTROL, and
        // it was sitting in the row of explanatory notes, overlapping them.
        position: 'absolute', bottom: 84, right: 32,
        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
        background: 'color-mix(in srgb, var(--surface-panel) 92%, transparent)',
        border: '1px solid var(--line-active)',
        padding: '6px var(--sp-3)',
        zIndex: 8,
      }}
    >
      <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>FLIGHT SPEED</span>

      <div style={{ display: 'flex' }}>
        {SPEEDS.map(({ label, scale }) => (
          <button
            key={scale}
            type="button"
            className="btn-reset t-h2"
            onClick={() => setTimeScale(scale)}
            aria-pressed={timeScale === scale}
            aria-label={`Run the flight at ${label} real time`}
            style={{
              padding: '3px 10px',
              background: timeScale === scale ? 'var(--sev-active)' : 'transparent',
              color: timeScale === scale ? 'var(--text-inverse)' : 'var(--text-secondary)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* The number that answers "is this broken or just slow". */}
      <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
        {running ? `sortie takes ${duration}` : 'site clock paused'}
      </span>
    </div>
  );
}
