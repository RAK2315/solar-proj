'use client';

/**
 * EventCard — one row in the live feed.
 *
 * The severity is stated in WORDS on a badge as well as in the border colour.
 * Colour is never the only signal — that is the accessibility fix and the reason
 * the feed reads as an instrument log rather than a notification list.
 *
 * The expand toggle is genuinely local UI state, which is the only kind of
 * useState allowed in this app. It holds no demo content: seek away and back and
 * the card is still correct, just possibly still expanded.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';

import type { DemoEvent, Severity } from '@/lib/types';

const SEVERITY_COLOUR: Record<Severity, string> = {
  info: 'var(--text-muted)',
  active: 'var(--sev-active)',
  warning: 'var(--sev-warning)',
  critical: 'var(--sev-critical)',
};

export function EventCard({ event }: { event: DemoEvent }) {
  const [open, setOpen] = useState(false);
  const colour = SEVERITY_COLOUR[event.severity];
  const loud = event.severity === 'critical' || event.severity === 'warning';

  return (
    <motion.article
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      style={{
        borderLeft: `2px solid ${colour}`,
        paddingLeft: 'var(--sp-3)',
        paddingBottom: 'var(--sp-3)',
        display: 'grid',
        gap: 3,
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 'var(--sp-2)',
      }}>
        <span className="t-h2" style={{ color: 'var(--text-primary)' }}>{event.source}</span>
        <span
          className={loud ? 'badge badge-solid' : 'badge'}
          style={loud
            ? { background: colour }
            : { color: colour, borderColor: 'var(--line-active)' }}
        >
          {event.severity}
        </span>
      </div>

      <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{event.timestamp}</span>

      <span
        className="t-data"
        style={{
          color: 'var(--text-secondary)',
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

      {event.expandable && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Collapse event' : 'Expand event'}
          className="btn-reset t-micro"
          style={{
            color: 'var(--text-muted)',
            justifySelf: 'start', padding: '2px 0',
          }}
        >
          {open ? '⌃' : '›'}
        </button>
      )}
    </motion.article>
  );
}
