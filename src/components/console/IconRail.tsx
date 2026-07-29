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
 * Demo mode pins the rail to SITE and says so, because the scripted incident plays
 * over the map and a beat cannot fire on a screen that has no map.
 */

import { Activity, BarChart3, ClipboardList, Map as MapIcon, Wrench } from 'lucide-react';

import { useMode, useModule, useSetModule } from '@/store/selectors';
import type { ModuleId } from '@/store/session';

const MODULES: Array<{ id: ModuleId; label: string; Icon: typeof Activity }> = [
  { id: 'site', label: 'Site', Icon: MapIcon },
  { id: 'drones', label: 'Drones', Icon: Activity },
  { id: 'missions', label: 'Missions', Icon: ClipboardList },
  { id: 'repairs', label: 'Repairs', Icon: Wrench },
  { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
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
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 'var(--sp-5)', paddingTop: 'var(--sp-4)',
      }}
    >
      {MODULES.map(({ id, label, Icon }) => {
        const active = locked ? id === 'site' : id === current;
        const disabled = locked && id !== 'site';
        return (
          <button
            key={id}
            type="button"
            className="btn-reset"
            aria-current={active ? 'page' : undefined}
            aria-label={disabled
              ? `${label} — unavailable while the scripted demo is playing`
              : label}
            disabled={disabled}
            onClick={() => setModule(id)}
            style={{
              display: 'grid', justifyItems: 'center', gap: 3, width: '100%',
              position: 'relative', paddingBlock: 2,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.35 : 1,
              color: active ? 'var(--sev-active)' : 'var(--text-muted)',
            }}
          >
            {active && (
              <span style={{
                position: 'absolute', left: 0, top: -4, bottom: -4, width: 2,
                background: 'var(--sev-active)',
              }} />
            )}
            <Icon size={18} strokeWidth={1.5} aria-hidden />
            <span className="t-micro" style={{ fontSize: 8, letterSpacing: '0.1em' }}>
              {label.toUpperCase()}
            </span>
          </button>
        );
      })}

      {locked && (
        <span
          className="t-micro"
          style={{ fontSize: 8, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}
        >
          DEMO<br />PINNED
        </span>
      )}

      <div style={{ marginTop: 'auto', paddingBottom: 'var(--sp-4)', color: 'var(--text-muted)' }}>
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
