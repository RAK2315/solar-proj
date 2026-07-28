'use client';

/**
 * IconRail — the narrow module strip down the left edge.
 *
 * This is the affordance that makes the console read as one screen of a REAL
 * SYSTEM rather than a single-purpose dashboard: an operator's tool has other
 * places to be. DRONES is the active module because that is where an inspection
 * lives; the others are named honestly and are not wired to anything, exactly like
 * the FILTER control in the reference.
 *
 * Deliberately not built out: plan/05 "What NOT to build" rules out every other
 * module, and a fake page behind one of these would be worse than an honest tab
 * that says where you are.
 */

import { Activity, BarChart3, ClipboardList, Radio, Wrench } from 'lucide-react';

const MODULES = [
  { id: 'drones', label: 'Drones', Icon: Activity, active: true },
  { id: 'signal', label: 'Signal', Icon: Radio, active: false },
  { id: 'missions', label: 'Missions', Icon: ClipboardList, active: false },
  { id: 'repairs', label: 'Repairs', Icon: Wrench, active: false },
  { id: 'analytics', label: 'Analytics', Icon: BarChart3, active: false },
];

export function IconRail() {
  return (
    <nav
      className="area-icons panel hair-r"
      aria-label="Modules"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 'var(--sp-5)', paddingTop: 'var(--sp-4)',
      }}
    >
      {MODULES.map(({ id, label, Icon, active }) => (
        <div
          key={id}
          aria-current={active ? 'page' : undefined}
          style={{
            display: 'grid', justifyItems: 'center', gap: 3, width: '100%',
            position: 'relative',
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
        </div>
      ))}

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
