'use client';

/**
 * Timeline — the loop, as a receipt.
 *
 * Rows fill in progressively as their beat passes. It is derived from events.json
 * rather than hand-listed, so the timeline and the feed can never tell different
 * stories about when something happened.
 *
 * This is the element that makes the north-star metric visible: anomaly to
 * deadlined work order, unattended up to the gate, in under 90 seconds.
 */

import { useVisibleEvents } from '@/store/selectors';
import type { Severity } from '@/lib/types';

const SEVERITY_COLOUR: Record<Severity, string> = {
  info: 'var(--text-secondary)',
  active: 'var(--sev-active)',
  warning: 'var(--sev-warning)',
  critical: 'var(--sev-critical)',
};

/** The beats worth a timeline row — the loop, not every tick. */
const MILESTONES = new Set([
  'ev-03-shortfall', 'ev-05-dispatch', 'ev-08-lock', 'ev-09-rgb',
  'ev-10-thermal', 'ev-12-prognosis', 'ev-13-recommendation', 'ev-14-workorder',
]);

export function Timeline() {
  // useVisibleEvents is newest-first; a timeline reads oldest-first.
  const rows = useVisibleEvents().filter((e) => MILESTONES.has(e.id)).reverse();
  if (!rows.length) return null;

  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid' }}>
      {rows.map((e, i) => {
        const colour = SEVERITY_COLOUR[e.severity];
        const last = i === rows.length - 1;
        return (
          <li key={e.id} style={{ display: 'grid', gridTemplateColumns: '46px 14px 1fr', gap: 'var(--sp-2)' }}>
            <span className="t-micro" style={{ color: 'var(--text-secondary)', paddingTop: 3 }}>
              {e.timestamp}
            </span>
            <span style={{ display: 'grid', justifyItems: 'center' }}>
              <span style={{ width: 7, height: 7, background: colour, marginTop: 4 }} />
              {!last && <span style={{ width: 1, flex: 1, background: 'var(--line-hairline)', minHeight: 14 }} />}
            </span>
            <span className="t-data" style={{ color: 'var(--text-secondary)', paddingBottom: 'var(--sp-2)' }}>
              {e.title}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
