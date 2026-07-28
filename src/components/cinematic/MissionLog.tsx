'use client';

/**
 * MissionLog — the typewriter caption bar, top-left.
 *
 * Reads the SAME events.json the console's feed reads, via each event's short-form
 * `logLine`. One t-ordered script, two renderings — which is why the log and the
 * feed can never tell different stories about when something happened.
 *
 * Colour by event class: anomaly/warning on the ironbow ramp, confirmations in
 * agent teal, status in plain text.
 */

import { typographic } from '@/lib/format';
import { useLogLines, useStreamedText } from '@/store/selectors';
import type { Severity } from '@/lib/types';

const LOG_COLOUR: Record<Severity, string> = {
  info: 'var(--text-primary)',
  active: 'var(--sev-active)',
  warning: 'var(--iron-80)',
  critical: 'var(--iron-80)',
};

export function MissionLog() {
  const lines = useLogLines();
  const current = lines[lines.length - 1];

  // The newest line types in; it is a pure function of t, so seeking backwards
  // un-types it rather than leaving a finished sentence on screen.
  const typed = useStreamedText(
    current ? typographic(`[${current.timestamp}] ${current.logLine}`) : '',
    current?.t ?? 0,
  );

  if (!current) return null;

  return (
    <div
      style={{
        position: 'absolute', top: 32, left: 32, width: '78%',
        background: 'color-mix(in srgb, var(--surface-panel) 92%, transparent)',
        border: '1px solid var(--line-hairline)',
        padding: 'var(--sp-4) var(--sp-5)',
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingBottom: 'var(--sp-3)', borderBottom: '1px solid var(--line-hairline)',
      }}>
        <span className="t-h1" style={{ color: 'var(--text-secondary)', letterSpacing: '0.14em' }}>
          SURYA AGENT — mission log
        </span>
        <span className="t-h1" style={{ color: 'var(--sev-critical)' }}>
          ● LIVE
        </span>
      </div>

      <p
        className="t-log"
        style={{
          margin: 'var(--sp-4) 0 0',
          color: LOG_COLOUR[current.severity],
          minHeight: '1.3em',
        }}
      >
        {typed}
        {typed.length < `[${current.timestamp}] ${current.logLine}`.length && (
          <span style={{
            display: 'inline-block', width: 13, height: '0.9em',
            background: 'var(--sev-active)', marginLeft: 3,
            verticalAlign: 'text-bottom',
          }} />
        )}
      </p>
    </div>
  );
}
