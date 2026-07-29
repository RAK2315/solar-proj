'use client';

/**
 * Timecode — `● REC  T+00:0X  LIVE`, top-right, with corner bracket marks.
 *
 * The REC dot pulses via CSS. That is allowed: it is presentational, no selector
 * reads it, and it drives no state. Everything that carries meaning — the elapsed
 * count — comes from `t`.
 */

import { timecode } from '@/lib/format';
import { M } from '@/lib/scene';
import { useFlightCue } from '@/store/flightCue';

export function Timecode() {
  // Counts the cinematic's own seconds in both modes. In live mode that is site
  // time compressed by the same factor the flight is — the readout matches what
  // is on screen rather than a second, disagreeing clock.
  const elapsed = Math.max(0, useFlightCue().t - M.dispatch);

  return (
    <div style={{
      position: 'absolute', top: 24, right: 32,
      display: 'flex', alignItems: 'center', gap: 'var(--sp-4)',
      padding: 'var(--sp-2) var(--sp-3)',
    }}>
      {/* Corner brackets — a framing mark, the way a viewfinder is drawn. */}
      <span aria-hidden style={{
        position: 'absolute', top: 0, right: 0, width: 26, height: 26,
        borderTop: '1px solid var(--line-focus)', borderRight: '1px solid var(--line-focus)',
      }} />
      <span aria-hidden style={{
        position: 'absolute', bottom: 0, left: 0, width: 26, height: 26,
        borderBottom: '1px solid var(--line-focus)', borderLeft: '1px solid var(--line-focus)',
      }} />

      <span className="t-h1" style={{ color: 'var(--sev-critical)' }}>
        <span style={{ animation: 'rec-pulse 1.6s steps(2, end) infinite' }}>●</span> REC
      </span>
      <span className="t-h1" style={{ color: 'var(--text-primary)', letterSpacing: '0.1em' }}>
        {timecode(elapsed)}
      </span>
      <span className="t-h1" style={{ color: 'var(--sev-active)' }}>LIVE</span>
    </div>
  );
}
