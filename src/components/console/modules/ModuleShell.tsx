'use client';

/**
 * The chrome every module screen sits in: a title, a one-line statement of what
 * the screen is looking at, and a scrolling body.
 *
 * Shared so the five screens cannot drift into five different-looking pages. Same
 * hairline sections and uppercase condensed headers as the detail rail — a module
 * is a different view of the same console, not a different application.
 */

import type { ReactNode } from 'react';

export function ModuleShell({ title, subtitle, action, children }: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="area-module panel"
      aria-label={title}
      style={{ display: 'grid', gridTemplateRows: 'auto 1fr', minHeight: 0 }}
    >
      <header style={{
        display: 'flex', alignItems: 'baseline', gap: 'var(--sp-3)',
        padding: 'var(--sp-4) var(--sp-5)',
        borderBottom: '1px solid var(--line-hairline)',
      }}>
        <h1 className="t-h1" style={{ color: 'var(--text-primary)' }}>
          <span style={{ color: 'var(--sev-active)', marginRight: 6 }}>●</span>
          {title}
        </h1>
        <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{subtitle}</span>
        <div style={{ marginLeft: 'auto' }}>{action}</div>
      </header>

      <div style={{
        overflowY: 'auto', padding: 'var(--sp-5)',
        display: 'grid', gap: 'var(--sp-5)', alignContent: 'start',
      }}>
        {children}
      </div>
    </section>
  );
}

/** A titled block inside a module screen. */
export function Block({ title, note, children }: {
  title: string; note?: string; children: ReactNode;
}) {
  return (
    <section style={{ display: 'grid', gap: 'var(--sp-3)' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        borderBottom: '1px solid var(--line-hairline)', paddingBottom: 'var(--sp-2)',
      }}>
        <h2 className="t-h2" style={{ color: 'var(--text-secondary)' }}>{title}</h2>
        {note && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{note}</span>}
      </div>
      {children}
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
    <p className="t-data" style={{
      color: 'var(--text-muted)',
      border: '1px dashed var(--line-hairline)',
      padding: 'var(--sp-4)',
    }}>
      {children}
    </p>
  );
}

/** Dense monospace table. Every module that lists things uses this one. */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                className="t-micro"
                style={{
                  textAlign: i === 0 ? 'left' : 'right',
                  color: 'var(--text-muted)', fontWeight: 500,
                  padding: '0 var(--sp-3) var(--sp-2) 0',
                  borderBottom: '1px solid var(--line-hairline)',
                  whiteSpace: 'nowrap',
                }}
              >
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
