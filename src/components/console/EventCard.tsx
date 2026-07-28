'use client';

/**
 * EventCard — one row in the live feed.
 *
 * 2px left border in the severity colour, uppercase condensed source label,
 * micro timestamp, one-line truncated body with a `›` chevron. 120ms slide-in
 * from the left, ease-out, no spring — instruments don't bounce.
 *
 * The expand toggle is genuinely local UI state, which is the ONLY kind of
 * useState allowed in this app. It holds no demo content: seek away and back and
 * the card is still correct, just possibly still expanded.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';

import type { DemoEvent, Severity } from '@/lib/types';

const SEVERITY_COLOUR: Record<Severity, string> = {
  info: 'var(--sev-info)',
  active: 'var(--sev-active)',
  warning: 'var(--sev-warning)',
  critical: 'var(--sev-critical)',
};

export function EventCard({ event }: { event: DemoEvent }) {
  const [open, setOpen] = useState(false);
  const colour = SEVERITY_COLOUR[event.severity];

  return (
    <motion.article
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      style={{
        borderLeft: `2px solid ${colour}`,
        background: 'var(--surface-raised)',
        padding: 'var(--sp-2) var(--sp-3)',
        display: 'grid',
        gap: 3,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-2)' }}>
        <span className="t-h2" style={{ color: colour }}>{event.source}</span>
        <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{event.timestamp}</span>
      </div>

      <div className="t-data-em" style={{ color: 'var(--text-primary)', lineHeight: 1.3 }}>
        {event.title}
      </div>

      <button
        type="button"
        onClick={() => event.expandable && setOpen((v) => !v)}
        aria-expanded={event.expandable ? open : undefined}
        disabled={!event.expandable}
        style={{
          all: 'unset',
          cursor: event.expandable ? 'pointer' : 'default',
          display: 'flex',
          gap: 'var(--sp-2)',
          alignItems: 'flex-start',
        }}
      >
        <span
          className="t-data"
          style={{
            color: 'var(--text-secondary)',
            ...(open ? {} : {
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }),
          }}
        >
          {event.body}
        </span>
        {event.expandable && (
          <span className="t-micro" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            {open ? '⌃' : '›'}
          </span>
        )}
      </button>
    </motion.article>
  );
}
