'use client';

/**
 * StatusPill — bottom-right mission state.
 *
 * HARD CUTS between states. No transition, no fade, no easing. Instrument readouts
 * do not ease, and a pill that cross-fades reads as a marketing animation rather
 * than a machine reporting where it is.
 */

import { useStatusPill } from '@/store/selectors';

export function StatusPill() {
  const label = useStatusPill();

  return (
    <div
      style={{
        position: 'absolute', bottom: 32, right: 32,
        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
        background: 'color-mix(in srgb, var(--surface-panel) 92%, transparent)',
        border: '1px solid var(--line-hairline)',
        borderRadius: 999,          // the ONE rounded thing in the app, it is a pill
        padding: 'var(--sp-3) var(--sp-5)',
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: '50%', background: 'var(--sev-active)',
        flexShrink: 0,
      }} />
      <span className="t-h1" style={{ color: 'var(--text-primary)', fontSize: 15 }}>
        {label}
      </span>
    </div>
  );
}
