'use client';

/**
 * TimeControl — the site clock, and the controls that move it.
 *
 * WHY THIS EXISTS. Site time runs at 60x, so twenty minutes with the tab open puts
 * the site past midnight. At night irradiance is zero, so output is zero, every
 * deviation floors to 0.0 %, no array can be scored critical from output it cannot
 * observe, and the map goes uniformly blue. All of that is the physics being
 * CORRECT — and all of it looks identical to the product being broken.
 *
 * There was no way back. `siteSeconds` is persisted, nothing in the UI called
 * `resetSession()`, and the only escape was clearing browser storage. An operator
 * could lose the site to the dark and have no control that admitted it.
 *
 * So: the clock is stated, the daylight window is drawn, and the operator can
 * pause, change rate, or seek. Seeking is safe by construction — mission phases,
 * queue deadlines and the event feed are all DERIVED from site seconds, never
 * accumulated, which is the same guarantee that lets the demo clock scrub.
 *
 * Live mode only. Demo mode has `t` and the rehearsal keys.
 */

import { Pause, Play, Sunrise } from 'lucide-react';

import { clockAt } from '@/lib/physics';
import { forecastOffset, scenario } from '@/lib/live';
import { useIsDark, useMode, useSiteSeconds } from '@/store/selectors';
import { useSession } from '@/store/session';

/** Site hours per real second. The default is the one the scenario ships with. */
const RATES = [
  { label: '1×', scale: 1 },
  { label: '60×', scale: scenario.defaultTimeScale },
  { label: '600×', scale: 600 },
] as const;

const DAY_SECONDS = 24 * 3600;

export function TimeControl() {
  const mode = useMode();
  const siteSeconds = useSiteSeconds();
  const running = useSession((s) => s.running);
  const timeScale = useSession((s) => s.timeScale);
  const toggleRunning = useSession((s) => s.toggleRunning);
  const setTimeScale = useSession((s) => s.setTimeScale);
  const setSiteSeconds = useSession((s) => s.setSiteSeconds);
  const dark = useIsDark();

  if (mode !== 'live') return null;

  const clock = clockAt(forecastOffset(siteSeconds));
  // Which day of the run, so seeking within a day does not silently lose the fact
  // that the site has been running for three of them.
  const day = Math.floor(siteSeconds / DAY_SECONDS);
  const intoDay = siteSeconds % DAY_SECONDS;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
      <span style={{ display: 'grid', justifyItems: 'end', gap: 1 }}>
        <span
          className="t-data-em"
          style={{ color: dark ? 'var(--sev-warning-ink)' : 'var(--sev-active)' }}
        >
          {clock}
          {dark && <span className="t-micro"> NIGHT</span>}
        </span>
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
          SITE CLOCK · DAY {day + 1}
        </span>
      </span>

      <button
        type="button"
        className="btn-reset"
        onClick={toggleRunning}
        aria-label={running ? 'Pause the site clock' : 'Resume the site clock'}
        style={{
          width: 28, height: 28, display: 'grid', placeItems: 'center',
          background: 'var(--surface-high)', color: 'var(--text-primary)',
        }}
      >
        {running ? <Pause size={14} strokeWidth={2.25} aria-hidden />
          : <Play size={14} strokeWidth={2.25} aria-hidden />}
      </button>

      <span style={{ display: 'flex' }}>
        {RATES.map(({ label, scale }) => {
          const on = timeScale === scale;
          return (
            <button
              key={label}
              type="button"
              className="btn-reset t-micro"
              onClick={() => setTimeScale(scale)}
              aria-label={`Run site time at ${label} real time`}
              aria-pressed={on}
              style={{
                padding: '6px 8px',
                background: on ? 'var(--sev-active)' : 'var(--surface-high)',
                color: on ? 'var(--text-inverse)' : 'var(--text-secondary)',
                borderRight: '1px solid var(--surface-panel)',
              }}
            >
              {label}
            </button>
          );
        })}
      </span>

      {/* The day, as a scrub. The lit segment is the generating window, so the
          handle's position against it says at a glance why output is what it is. */}
      <label style={{ display: 'grid', gap: 2 }}>
        <span className="sr-only">Seek the site clock within the day</span>
        <input
          type="range"
          min={0}
          max={DAY_SECONDS}
          step={900}
          value={intoDay}
          onChange={(e) => setSiteSeconds(day * DAY_SECONDS + Number(e.target.value))}
          style={{ width: 148, accentColor: 'var(--sev-active)' }}
        />
        <span className="t-micro" style={{
          color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between',
        }}>
          <span>{clockAt(0)}</span>
          <span>+24H</span>
        </span>
      </label>

      <button
        type="button"
        className="btn-reset t-micro"
        onClick={() => setSiteSeconds(0)}
        aria-label="Return the site clock to the start of the scenario"
        title="Back to the start of the day, missions and work orders are kept"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px var(--sp-3)',
          background: dark ? 'var(--sev-warning)' : 'var(--surface-high)',
          color: dark ? 'var(--text-inverse)' : 'var(--text-secondary)',
        }}
      >
        <Sunrise size={13} strokeWidth={2.25} aria-hidden />
        {clockAt(0)}
      </button>
    </div>
  );
}
