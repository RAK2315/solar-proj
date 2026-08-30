'use client';

/**
 * HeaderBar — the chrome band. Identity on the left, where you are and what the
 * weather is doing on the right.
 *
 * IT USED TO CARRY THE KPIs TOO. Farm health, output, anomalies, the weather, the
 * 72h outlook, a bell and a mode badge were all in one 72px row, which made the
 * four figures an operator actually reads the smallest thing on it. They moved to
 * `SiteKpiStrip`, one band down, at 52px. This row is chrome again.
 *
 * The mode control is the only global control the console has, so it takes the
 * position a product would give an account menu. It is a real button — `M` and a
 * click do the same thing — because a round avatar that does nothing is a lie
 * about what the product is.
 */

import { Grid2x2, Moon, Power, Radio, Sun, TextSearch } from 'lucide-react';

import { useHydrated } from '@/hooks/useHydrated';
import { num } from '@/lib/format';
import { useFarm, useForecast, useMode } from '@/store/selectors';
import { useSession } from '@/store/session';
import { TimeControl } from './TimeControl';

/** Daily maxima for the next three days, read off the forecast curve. */
export function useDailyHighs(): number[] {
  const forecast = useForecast();
  const highs: number[] = [];
  for (let day = 0; day < 3; day += 1) {
    const slice = forecast.points.filter(
      (p) => p.hourOffset >= day * 24 && p.hourOffset < (day + 1) * 24,
    );
    if (slice.length) highs.push(Math.max(...slice.map((p) => p.ambientC)));
  }
  return highs;
}

const DAY_LABEL = ['Today', '+24h', '+48h'];

export function HeaderBar() {
  const mode = useMode();
  const running = useSession((s) => s.running);
  const setMode = useSession((s) => s.setMode);
  const highs = useDailyHighs();
  const farm = useFarm();
  const hydrated = useHydrated();
  const showWorkings = useSession((s) => s.showWorkings);
  const toggleWorkings = useSession((s) => s.toggleWorkings);
  const theme = useSession((s) => s.theme);
  const toggleTheme = useSession((s) => s.toggleTheme);

  const live = mode === 'live';

  return (
    <header
      className="area-header panel hair-b"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 var(--sp-4)', gap: 'var(--sp-5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        <span style={{
          width: 32, height: 32, display: 'grid', placeItems: 'center',
          background: 'var(--sev-active)', color: 'var(--text-inverse)',
        }}>
          <Grid2x2 size={18} strokeWidth={2.25} aria-hidden />
        </span>
        <span className="t-h1" style={{ color: 'var(--sev-active)', letterSpacing: '0.2em' }}>
          SURYA AGENT
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
        <div style={{ display: 'grid', justifyItems: 'end', gap: 1 }}>
          <span className="t-micro" style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}>
            {farm.name.toUpperCase()}, {farm.region.toUpperCase()}
          </span>
          <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
            {farm.lat.toFixed(3)} N, {farm.lon.toFixed(3)} E
          </span>
        </div>

        <span style={{ width: 1, height: 32, background: 'var(--line-hairline)' }} />

        {/* Three daily maxima off the forecast curve. The forecast is offsets from
            now, not calendar days, so the columns are labelled as offsets — a
            weekday here would be a name nobody generated. */}
        <div style={{ display: 'flex' }}>
          {highs.map((h, i) => (
            <span
              key={i}
              style={{
                display: 'grid', justifyItems: 'center', gap: 1,
                padding: '0 var(--sp-3)',
                borderRight: i < highs.length - 1 ? '1px solid var(--line-hairline)' : undefined,
              }}
            >
              <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
                {DAY_LABEL[i].toUpperCase()}
              </span>
              <span
                className="t-micro"
                style={{ color: i === 0 ? 'var(--sev-active)' : 'var(--text-primary)' }}
              >
                {num(h, 0)}°
              </span>
            </span>
          ))}
        </div>

        <span style={{ width: 1, height: 32, background: 'var(--line-hairline)' }} />

        {/* Site time is a CONTROL, not a readout. Without it the console walks into
            the night at 60x and there is no way back — see TimeControl. */}
        <TimeControl />

        <span style={{ width: 1, height: 32, background: 'var(--line-hairline)' }} />

        {/* SHOW WORKINGS. Every grey provenance line on the console is behind this,
            off by default. The claim stays on screen; the receipt is one click
            away. It is a control rather than a preference because the moment it
            matters is a specific one — somebody asking "how do you know that?" —
            and it should be answerable in a second. */}
        <button
          type="button"
          className="btn-reset"
          onClick={toggleWorkings}
          aria-pressed={showWorkings}
          aria-label={showWorkings
            ? 'Hide the sources and provenance lines'
            : 'Show the sources and provenance lines'}
          title="Show where every number came from"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px var(--sp-2)',
            border: `1px solid ${showWorkings ? 'var(--sev-active)' : 'var(--line-active)'}`,
            color: showWorkings ? 'var(--sev-active)' : 'var(--text-secondary)',
          }}
        >
          <TextSearch size={13} strokeWidth={2} aria-hidden />
          <span className="t-h2">WORKINGS</span>
        </button>

        <button
          type="button"
          className="btn-reset"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title="Light / dark"
          style={{
            width: 30, height: 30, display: 'grid', placeItems: 'center',
            border: '1px solid var(--line-active)', color: 'var(--text-secondary)',
          }}
        >
          {theme === 'dark'
            ? <Sun size={15} strokeWidth={2} aria-hidden />
            : <Moon size={15} strokeWidth={2} aria-hidden />}
        </button>

        {/* This chip is also the console's liveness check — see useHydrated. Until
            the page has actually woken up it says so, in red, with the fix. A
            hydration failure otherwise leaves a perfect-looking console that
            ignores every click, and nothing else on screen would give it away. */}
        <span
          className="chip"
          style={!hydrated
            ? { background: 'var(--sev-critical)' }
            : live
              ? { background: running ? 'var(--sev-active)' : 'var(--sev-warning)' }
              : { background: 'var(--sev-warning)' }}
        >
          {!hydrated
            ? '○ NOT READY — RELOAD'
            : live ? (running ? '● LIVE' : '❚❚ LIVE · PAUSED') : '▶ DEMO REPLAY'}
        </span>

        {/* Which world you are looking at, and the control that changes it. A live
            console and a recording of one must never be confusable — see the note
            in store/session.ts. */}
        <button
          type="button"
          className="btn-reset"
          onClick={() => setMode(live ? 'demo' : 'live')}
          aria-label={live
            ? 'Switch to the scripted demo replay (M)'
            : 'Switch to live site operation (M)'}
          title="Press M to switch"
          style={{
            width: 32, height: 32, display: 'grid', placeItems: 'center',
            borderRadius: '50%',
            background: live ? 'var(--sev-active)' : 'transparent',
            border: live ? 'none' : '1px solid var(--sev-warning)',
            color: live ? 'var(--text-inverse)' : 'var(--sev-warning)',
          }}
        >
          {live ? <Radio size={17} strokeWidth={2} aria-hidden />
            : <Power size={17} strokeWidth={2} aria-hidden />}
        </button>
      </div>
    </header>
  );
}
