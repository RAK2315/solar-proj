'use client';

/**
 * IconRail — the module strip down the left edge, and the console's navigation.
 *
 * It used to be five honest-but-inert labels, on the grounds that a fake page
 * behind one of them would be worse than a tab that says where you are. That was
 * the right call while there was nothing real to put behind them. There is now:
 * every screen here is derived from the operator's session and the physics model,
 * the same two sources the map reads.
 *
 * The active tab is a 2px teal edge plus a tinted cell, not just a coloured icon —
 * at 64px wide with 8px labels, an icon changing hue is not a strong enough signal
 * to say where you are from across a room.
 *
 * Demo mode pins the rail to SITE and says so, because the scripted incident plays
 * over the map and a beat cannot fire on a screen that has no map.
 */

import {
  Crosshair, Grid2x2, LineChart, Radar, SquareStack, Wrench,
} from 'lucide-react';

import { useMode, useModule, useSetModule } from '@/store/selectors';
import type { ModuleId } from '@/store/session';

/**
 * `label` is the operator-facing name and the accessible name; `tab` is what fits
 * in 64px. They differ for two entries and that is deliberate — a screen reader
 * should hear "Analytics", not "Data".
 */
const MODULES: Array<{ id: ModuleId; label: string; tab: string; Icon: typeof Grid2x2 }> = [
  { id: 'site', label: 'Site', tab: 'Site', Icon: Grid2x2 },
  { id: 'drones', label: 'Drones', tab: 'Drones', Icon: SquareStack },
  { id: 'missions', label: 'Missions', tab: 'Missions', Icon: Crosshair },
  { id: 'repairs', label: 'Repairs', tab: 'Repairs', Icon: Wrench },
  { id: 'analytics', label: 'Analytics', tab: 'Data', Icon: LineChart },
  // Not an operations screen — a rehearsal one. It injects scenario events so the
  // console can be exercised on cases the committed site does not happen to be in
  // right now, and everything it produces is marked as injected.
  { id: 'scenario', label: 'Rehearsal', tab: 'Rehearse', Icon: Radar },
];

export function IconRail() {
  const current = useModule();
  const setModule = useSetModule();
  const mode = useMode();
  const locked = mode === 'demo';

  return (
    <nav
      className="area-icons panel hair-r"
      aria-label="Modules"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
    >
      {MODULES.map(({ id, label, tab, Icon }) => {
        const active = locked ? id === 'site' : id === current;
        const disabled = locked && id !== 'site';
        return (
          <button
            key={id}
            type="button"
            className="btn-reset"
            aria-current={active ? 'page' : undefined}
            aria-label={disabled
              ? `${label}, unavailable while the scripted demo is playing`
              : label}
            disabled={disabled}
            onClick={() => setModule(id)}
            style={{
              display: 'grid', justifyItems: 'center', gap: 4,
              padding: 'var(--sp-3) 0',
              borderLeft: `2px solid ${active ? 'var(--sev-active)' : 'transparent'}`,
              background: active ? 'var(--surface-raised)' : 'transparent',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.3 : 1,
              color: active ? 'var(--sev-active)' : 'var(--text-secondary)',
            }}
          >
            <Icon size={20} strokeWidth={1.75} aria-hidden />
            <span className="t-micro" style={{ fontSize: 8, letterSpacing: '0.02em' }}>
              {tab.toUpperCase()}
            </span>
          </button>
        );
      })}

      {locked && (
        <span
          className="t-micro"
          style={{
            fontSize: 8, color: 'var(--text-secondary)', textAlign: 'center',
            lineHeight: 1.4, paddingTop: 'var(--sp-3)',
          }}
        >
          DEMO<br />PINNED
        </span>
      )}

      <div style={{
        marginTop: 'auto', paddingBottom: 'var(--sp-4)',
        display: 'grid', justifyItems: 'center', color: 'var(--text-secondary)',
      }}>
        {/* Compass. The map is north-up; saying so is a survey convention. */}
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          border: '1px solid var(--line-active)',
          display: 'grid', placeItems: 'center',
        }}>
          <span className="t-micro" style={{ fontSize: 9 }}>N</span>
        </div>
      </div>
    </nav>
  );
}
