'use client';

/**
 * The one container every panel is built from: a title, an optional aside, a body.
 *
 * A block carries no layout of its own. The screen it sits on places it; the block
 * only knows what it says.
 */

import type { ReactNode } from 'react';

import { useSession } from '@/store/session';

export function Blk({ b, title, sev, aside, children, className }: {
  /** Names the block for the stylesheet and for the layout check. */
  b: string;
  title: ReactNode;
  sev?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className ? `blk ${className}` : 'blk'} data-b={b} data-sev={sev}>
      <header className="blk-hd"><h2>{title}</h2>{aside}</header>
      <div className="blk-bd">{children}</div>
    </section>
  );
}

/**
 * The `?` on a panel. One switch for the whole console: it shows the working
 * behind every figure at once, because a judge who asks "how do you know that"
 * about one number is about to ask it about the next.
 */
export function Why() {
  const on = useSession((s) => s.showWorkings);
  const toggle = useSession((s) => s.toggleWorkings);
  return (
    <button
      type="button"
      className="why"
      aria-pressed={on}
      aria-label={on ? 'Hide the working' : 'Show the working'}
      onClick={toggle}
    >
      ?
    </button>
  );
}
