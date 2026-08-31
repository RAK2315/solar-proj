'use client';

/**
 * The chrome every module screen sits in: a title set at hero size, a one-line
 * statement of what the screen is looking at, an action slot, and a scrolling body.
 *
 * Shared so the six screens cannot drift into six different-looking pages. The
 * title is 52px because these screens have no map to anchor them — on the site
 * screen the map tells you where you are at a glance, and a module screen needs
 * something to do that job or it reads as a table that appeared from nowhere.
 *
 * Same hairline sections and condensed caps headers as the detail rail: a module is
 * a different view of the same console, not a different application.
 */

import type { ReactNode } from 'react';

export function ModuleShell({ title, subtitle, purpose, action, children }: {
  title: string;
  /** What this screen is LOOKING AT right now — counts, the site clock, sources. */
  subtitle: string;
  /**
   * What this screen is FOR, in one plain sentence.
   *
   * `subtitle` answers "what am I seeing"; it does not answer "why would I open
   * this". Those are different questions and only the second one is any use to
   * somebody meeting the console for the first time — which, for a while yet, is
   * everybody who matters. One sentence, prose, no vocabulary that needs the
   * trade.
   */
  purpose: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="area-module"
      aria-label={title}
      style={{
        display: 'grid', gridTemplateRows: 'auto 1fr', minHeight: 0,
        background: 'var(--surface-void)',
      }}
    >
      <header className="panel hair-b" style={{
        display: 'grid', gap: 'var(--sp-2)',
        padding: 'var(--sp-4) var(--sp-5)',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)' }}>
        <h1 className="t-hero" style={{
          color: 'var(--sev-active)', margin: 0, letterSpacing: '0.02em',
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          {title}
        </h1>
        <span className="t-micro workings" style={{
          color: 'var(--text-secondary)', letterSpacing: '0.08em',
          textTransform: 'uppercase',
          borderLeft: '1px solid var(--line-active)', paddingLeft: 'var(--sp-5)',
          alignSelf: 'stretch', display: 'flex', alignItems: 'center',
        }}>
          {subtitle}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--sp-2)' }}>{action}</div>
      </div>
      <p className="t-prose" style={{
        color: 'var(--text-secondary)', margin: 0, maxWidth: '92ch',
      }}>
        {purpose}
      </p>
      </header>

      {/* A COLUMN, NOT A GRID. As a grid with auto rows this container sized its
          rows once and then stopped agreeing with its own children: a slab
          holding 400 px of content sat in a 135 px row, overflowed it visibly,
          and painted straight over the block beneath. Two blocks with very
          different content came out identical heights, which is the tell.

          A flex column has no row-sizing step to get wrong, each child takes its
          content height and the next one starts below it. `flex-shrink: 0` is the
          load-bearing half: without it an overflowing column squeezes its
          children instead of scrolling, which is the same bug wearing a hat. */}
      <div className="scroll-y module-body">
        {children}
      </div>
    </section>
  );
}

/**
 * A titled block inside a module screen.
 *
 * `wide` takes the full width of the body instead of sharing a line. Charts,
 * timelines and ranked tables are unreadable at half width; a four-row list is
 * wasteful at full width, and five of those stacked is a page you scroll three
 * times to read.
 */
export function Block({ title, note, wide, children }: {
  title: string; note?: string; wide?: boolean; children: ReactNode;
}) {
  return (
    <section className={wide ? 'slab wide' : 'slab'}>
      <header>
        <h2 className="t-h1" style={{ color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
        {note && (
          <span className="t-micro workings" style={{ color: 'var(--text-secondary)' }}>
            {note}
          </span>
        )}
      </header>
      <div className="slab-body" style={{ display: 'grid', gap: 'var(--sp-4)' }}>
        {children}
      </div>
    </section>
  );
}

/**
 * What a screen says when there is genuinely nothing on it.
 *
 * Not a placeholder and not a skeleton: a statement of fact, with the action that
 * would put something here. An empty mission list means no drone is flying, and
 * saying so is more useful than three greyed-out rows implying there should be.
 */
export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="t-prose" style={{
      color: 'var(--text-secondary)',
      background: 'var(--surface-inset)',
      borderLeft: '3px solid var(--line-active)',
      padding: 'var(--sp-4)',
      margin: 0,
    }}>
      {children}
    </p>
  );
}

/**
 * Dense monospace table. Every module that lists things uses this one.
 *
 * No row stripes, no vertical rules, 1px horizontal dividers only, condensed caps
 * in the header — the reference console's table rules, and the reason a 12-column
 * repair queue is readable at all.
 */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                className="t-label"
                style={{
                  textAlign: i === 0 ? 'left' : 'right',
                  color: 'var(--text-secondary)',
                  padding: '0 var(--sp-3) var(--sp-2) 0',
                  borderBottom: '1px solid var(--line-active)',
                  whiteSpace: 'nowrap',
                }}
              >
                {/* Uppercased in the STRING, not only by text-transform: a header
                    an operator reads as "LOSS MWH/D" should also be that in the
                    accessibility tree and in the acceptance tests. */}
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Cell({ children, first = false, colour, emphasis = false }: {
  children: ReactNode; first?: boolean; colour?: string; emphasis?: boolean;
}) {
  return (
    <td
      className={emphasis ? 't-data-em' : 't-data'}
      style={{
        textAlign: first ? 'left' : 'right',
        color: colour ?? (first ? 'var(--text-primary)' : 'var(--text-secondary)'),
        padding: 'var(--sp-2) var(--sp-3) var(--sp-2) 0',
        borderBottom: '1px solid var(--line-hairline)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </td>
  );
}

/** A button in a module header or a block. Solid slab, condensed caps, no radius. */
export function Action({ children, onClick, primary = false, ariaLabel }: {
  children: ReactNode; onClick: () => void; primary?: boolean; ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className="btn-reset t-h2"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
        padding: 'var(--sp-3) var(--sp-4)',
        background: primary ? 'var(--sev-active)' : 'var(--surface-high)',
        color: primary ? 'var(--text-inverse)' : 'var(--text-primary)',
      }}
    >
      {children}
    </button>
  );
}
