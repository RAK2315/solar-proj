'use client';

/**
 * RepairQueueBar — the footer strip, and the visible end of the deterministic
 * ranking.
 *
 * Ordering comes from `rankQueue()` in src/lib/ranking.ts — a pure function, never
 * LLM-decided. That matters because LLM ranking is unstable run to run, and a judge
 * who re-runs the demo and sees a different order has learned something you did not
 * want them to learn. This order is identical every single time.
 *
 * The bar shows the score factors for #1 on hover-free display, because when a judge
 * asks "how does it prioritise?" the answer should be visible in the inputs rather
 * than buried in a tie-break: highest loss × critical weight × tightest deadline.
 */

import { ChevronRight } from 'lucide-react';

import { MWh, hours, num } from '@/lib/format';
import { leadMargin, scoreBreakdown } from '@/lib/ranking';
import { useApproved, useMode, useRepairQueue, useSetModule } from '@/store/selectors';
import { useSession } from '@/store/session';
import type { Severity } from '@/lib/types';

const SEVERITY_COLOUR: Record<Severity, string> = {
  info: 'var(--text-secondary)',
  active: 'var(--sev-active)',
  warning: 'var(--sev-warning)',
  critical: 'var(--sev-critical)',
};

export function RepairQueueBar() {
  const mode = useMode();
  const queue = useRepairQueue();
  const approved = useApproved();
  const workOrders = useSession((s) => s.workOrders);
  const setModule = useSetModule();
  const next = queue[0];
  if (!next) return null;

  const b = scoreBreakdown(next);
  const margin = leadMargin(queue);
  // Approving moves B-17 out of "pending" and into scheduled work.
  // Live mode counts the orders the operator has actually raised; demo mode
  // counts the scripted queue.
  const pending = mode === 'live'
    ? workOrders.length
    : (approved ? queue.length - 1 : queue.length);

  return (
    <footer
      className="area-footer panel hair-t"
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-4)',
        padding: '0 var(--sp-5)',
      }}
    >
      <span className="t-h1" style={{ color: 'var(--text-secondary)' }}>
        {mode === 'live' ? 'Work orders' : 'Repair queue'}
      </span>
      <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>·</span>
      <span className="t-data" style={{ color: 'var(--text-primary)' }}>
        {pending} {pending === 1 ? 'task' : 'tasks'}
      </span>
      <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>·</span>

      <span className="t-data" style={{ color: 'var(--text-secondary)' }}>
        NEXT
        <span className="t-data-em" style={{ color: 'var(--text-primary)', margin: '0 var(--sp-2)' }}>
          {next.id} · {next.panelId}
        </span>
        <span className="chip" style={{ background: SEVERITY_COLOUR[next.severity] }}>
          {next.severity.toUpperCase()}
        </span>
      </span>

      {/* The ranking, shown as its factors rather than as a bare number. When a judge
          asks how it prioritises, the arithmetic is already on screen. */}
      <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
        {MWh(b.loss)}/day × {num(b.severity, 1)} severity × {num(b.urgency, 2)} urgency
        {b.access !== 1 && ` ÷ ${num(b.access, 1)} access`}
        {' = '}
        <span style={{ color: 'var(--text-primary)' }}>{num(b.score, 2)}</span>
        {Number.isFinite(margin) && `  ·  ${num(margin, 1)}× ahead of #2`}
      </span>

      <span className="t-micro" style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>
        deadline in {hours(next.hoursUntilDeadline)} · ranked by a pure function, not a model
      </span>
      <button
        type="button"
        className="btn-reset t-h2"
        disabled={mode === 'demo'}
        onClick={() => setModule('repairs')}
        aria-label={mode === 'demo'
          ? 'View queue — unavailable while the scripted demo is playing'
          : 'View the repair queue'}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          color: mode === 'demo' ? 'var(--text-secondary)' : 'var(--sev-active)',
          opacity: mode === 'demo' ? 0.5 : 1,
        }}
      >
        VIEW QUEUE
        <ChevronRight size={14} strokeWidth={2.5} aria-hidden />
      </button>
    </footer>
  );
}
