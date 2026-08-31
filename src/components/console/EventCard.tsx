'use client';

/**
 * EventCard — one row in the live feed.
 *
 * REBUILT FOR DISTANCE. Every row used to be the same shape: uppercase source, a
 * small badge, a timestamp, two lines of body — an `info` boot message and a
 * `critical` shortfall differed by a 2px border colour. Severity now changes the
 * whole slab: a tinted ground, a 4px keyed edge, and the severity spelled out in
 * its own colour on the top line. You can sort the feed by eye from the back of a
 * room, which is the entire job of a feed on a projector.
 *
 * The severity is stated in WORDS as well as in colour. Colour is never the only
 * signal — that is the accessibility fix and the reason the feed reads as an
 * instrument log rather than a notification list.
 *
 * The expand toggle is genuinely local UI state, which is the only kind of
 * useState allowed in this app. It holds no demo content: seek away and back and
 * the card is still correct, just possibly still expanded.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';

import { useSession } from '@/store/session';
import type { DemoEvent, Severity } from '@/lib/types';

const SEVERITY_COLOUR: Record<Severity, string> = {
  info: 'var(--sev-active)',
  active: 'var(--sev-active)',
  warning: 'var(--sev-warning)',
  critical: 'var(--sev-critical-ink)',
};

/** The keyed edge is a fill, so it uses the ramp value rather than the ink one. */
const SEVERITY_EDGE: Record<Severity, string> = {
  info: 'var(--sev-active)',
  active: 'var(--sev-active)',
  warning: 'var(--sev-warning)',
  critical: 'var(--sev-critical)',
};

/** What the top line calls each severity, in operator language. */
const SEVERITY_WORD: Record<Severity, string> = {
  info: 'SYSTEM LOG',
  active: 'AGENT',
  warning: 'WARNING',
  critical: 'CRITICAL ALARM',
};

/** Small grey chips carrying the identifiers the row is about. */
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="chip chip-quiet">{children}</span>
  );
}

export function EventCard({ event }: { event: DemoEvent }) {
  const [open, setOpen] = useState(false);
  const selectPanel = useSession((s) => s.selectPanel);
  const colour = SEVERITY_COLOUR[event.severity];
  const critical = event.severity === 'critical';

  // A row that names an array is a way INTO that array. It read as a control
  // already — same hover, same cursor — so it may as well be one.
  const linked = event.linkedPanelId;

  return (
    // THE WHOLE ROW SELECTS THE ARRAY IT NAMES. An event is about an array and the
    // obvious thing to do with it is look at that array — but the only way to was
    // a small chip at the bottom of the card, which nobody finds. Clicking the row
    // now does exactly what clicking the array on the map does.
    //
    // A row about nothing in particular (a system boot line) stays inert rather
    // than pretending to be a control.
    <motion.article
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      role={linked ? 'button' : undefined}
      tabIndex={linked ? 0 : undefined}
      aria-label={linked ? `Inspect ${linked}, ${event.title}` : undefined}
      onClick={linked ? () => selectPanel(linked) : undefined}
      onKeyDown={linked
        ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPanel(linked); } }
        : undefined}
      style={{
        borderLeft: `4px solid ${SEVERITY_EDGE[event.severity]}`,
        borderBottom: '1px solid var(--line-hairline)',
        background: critical
          ? 'color-mix(in srgb, var(--sev-critical) 14%, var(--surface-panel))'
          : 'var(--surface-panel)',
        padding: 'var(--sp-3)',
        display: 'grid',
        gap: 'var(--sp-2)',
        cursor: linked ? 'pointer' : undefined,
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        gap: 'var(--sp-2)',
      }}>
        <span className="t-micro" style={{
          color: colour, fontWeight: 700, letterSpacing: '0.08em',
        }}>
          {SEVERITY_WORD[event.severity]}
        </span>
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
          {event.timestamp}
        </span>
      </div>

      <span className="t-data-em" style={{ color: 'var(--text-primary)', lineHeight: 1.3 }}>
        {event.title}
      </span>

      <span
        className="t-prose"
        style={{
          color: 'var(--text-secondary)', fontSize: 12,
          ...(open ? {} : {
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }),
        }}
      >
        {event.body}
      </span>

      <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
        {linked ? (
          <button
            type="button"
            className="btn-reset chip chip-quiet"
            onClick={() => selectPanel(linked)}
            aria-label={`Select array ${linked}`}
            style={{ color: 'var(--sev-active)' }}
          >
            {linked}
          </button>
        ) : (
          <Tag>{event.source}</Tag>
        )}
        {linked && <Tag>{event.source}</Tag>}

        {event.expandable && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Collapse event' : 'Expand event'}
            className="btn-reset t-micro"
            style={{ color: 'var(--text-secondary)', marginLeft: 'auto' }}
          >
            {open ? 'LESS ⌃' : 'MORE ›'}
          </button>
        )}
      </div>
    </motion.article>
  );
}
