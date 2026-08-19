'use client';

/**
 * ApprovalBar — THE HUMAN GATE.
 *
 * This is not a nice-to-have. It is the answer to the question every judge asks
 * ("would you let this run unsupervised?"), and it must be visibly, prominently in
 * the UI. Everything upstream is autonomous; nothing enters the work queue without
 * this click.
 *
 * `approve()` is the ONLY legitimate mutable state outside the clock in the entire
 * application. If a second one ever appears, that is a design bug.
 */

import { CheckCircle2, ShieldCheck } from 'lucide-react';

import {
  BEAT, useAgentCache, useApproved, useDemoClockT, useInspected, useMode,
  useOverride, useSelectedPanelId,
} from '@/store/selectors';
import { useDemoClock } from '@/store/demoClock';
import { useSession } from '@/store/session';

/** Why an operator declines. Fixed reasons, so the record is queryable later. */
const OVERRIDE_REASONS = [
  'deferred — crew already on site next cycle',
  'false positive — array inspected manually',
  'accepted risk — scheduled at next outage',
] as const;

export function ApprovalBar() {
  const mode = useMode();
  const t = useDemoClockT();
  const demoApproved = useApproved();
  const cache = useAgentCache();
  const approveDemo = useDemoClock((s) => s.approve);

  const panelId = useSelectedPanelId();
  const inspected = useInspected(panelId);
  const workOrders = useSession((s) => s.workOrders);
  const createWorkOrder = useSession((s) => s.createWorkOrder);
  const override = useOverride(panelId);
  const overrideRecommendation = useSession((s) => s.overrideRecommendation);
  const clearOverride = useSession((s) => s.clearOverride);

  // The gate arms only once there is something real to approve. In demo mode that
  // is the recommendation beat; in live mode it is a drone having actually been
  // and looked. An approval button that works before either would be theatre.
  const armed = mode === 'demo' ? t >= BEAT.recommendation : inspected;
  if (!armed) return null;

  const liveOrder = workOrders.find((w) => w.panelId === panelId);
  const approved = mode === 'demo' ? demoApproved : Boolean(liveOrder);
  const ref = mode === 'demo'
    ? (cache?.recommendation.workOrderRef ?? 'INC-B17')
    : `INC-${panelId.replace('-', '')}`;

  const approve = () => {
    if (mode === 'demo') approveDemo();
    else createWorkOrder(panelId, `Inspection evidence captured for ${panelId}.`);
  };

  return (
    <div
      style={{
        /* A grid row of the rail now, not a sticky overlay — the rail is
           header / scroll / gate, so the gate is structurally pinned and cannot
           overlap the content it sits under. */
        background: 'var(--surface-void)',
        borderTop: '1px solid var(--line-active)',
        padding: 'var(--sp-3) var(--sp-4) var(--sp-4)',
        display: 'grid', gap: 'var(--sp-3)',
      }}
    >
      {/* THE loudest element in the application, and the only saturated fill in the
          rail. Everything above it is a reading; this is the one thing that changes
          the world, so it is the one thing that looks like a button. */}
      <button
        type="button"
        onClick={approve}
        disabled={approved}
        className="btn-reset t-h1"
        style={{
          boxSizing: 'border-box',
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 'var(--sp-2)',
          padding: 'var(--sp-4)',
          cursor: approved ? 'default' : 'pointer',
          background: approved ? 'var(--panel-scheduled)' : 'var(--sev-critical-ink)',
          color: 'var(--text-inverse)',
          letterSpacing: '0.12em',
          transition: 'background 200ms linear',
        }}
      >
        {approved
          ? <CheckCircle2 size={17} strokeWidth={2.25} aria-hidden />
          : <ShieldCheck size={17} strokeWidth={2.25} aria-hidden />}
        {approved ? `✓ WORK ORDER #${ref} CREATED` : `APPROVE — CREATE WORK ORDER → ${mode === 'live' ? panelId : ''}`}
      </button>

      {/* These three were spans off the reference screenshot: they looked like
          controls, sat where controls sit, and did nothing. QUEUED is a STATUS and
          is now rendered as one; the other two are buttons that do what they say. */}
      <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'stretch' }}>
        <button
          type="button"
          className="btn-reset t-h2"
          onClick={() => document.getElementById('rail-inspection')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          style={{
            flex: 1.6, textAlign: 'center', padding: 'var(--sp-3) var(--sp-2)',
            background: 'var(--surface-high)',
            color: 'var(--text-primary)', cursor: 'pointer',
          }}
        >
          INSPECT EVIDENCE
        </button>

        {override ? (
          <button
            type="button"
            className="btn-reset t-h2"
            onClick={() => clearOverride(panelId)}
            style={{
              flex: 1.4, textAlign: 'center', padding: 'var(--sp-3) var(--sp-2)',
              border: '1px solid var(--sev-warning)', color: 'var(--sev-warning-ink)',
              cursor: 'pointer',
            }}
          >
            CLEAR OVERRIDE
          </button>
        ) : (
          <label
            className="t-h2"
            style={{
              flex: 1.4, display: 'grid', placeItems: 'center',
              background: 'var(--surface-high)', color: 'var(--text-secondary)',
            }}
          >
            <span className="sr-only">Override — decline with a reason</span>
            <select
              className="btn-reset t-h2"
              value=""
              disabled={approved}
              onChange={(e) => e.target.value
                && overrideRecommendation(panelId, e.target.value)}
              style={{
                width: '100%', height: '100%', textAlign: 'center',
                padding: 'var(--sp-3) var(--sp-2)', background: 'transparent',
                color: 'inherit', cursor: approved ? 'default' : 'pointer',
              }}
            >
              <option value="">OVERRIDE</option>
              {OVERRIDE_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        gap: 'var(--sp-2)',
      }}>
        <span className="t-micro" style={{
          color: approved ? 'var(--panel-scheduled)' : 'var(--text-secondary)',
        }}>
          {approved ? '✓ QUEUED' : 'NOT QUEUED'}
        </span>
        <span className="t-micro" style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>
          {override
            ? `Declined by operator — ${override.reason}.`
            : approved
              ? `${mode === 'demo' ? 'B-17' : panelId} scheduled. Autonomous up to this point; a person authorised the work.`
              : 'Nothing enters the work queue without operator approval.'}
        </span>
      </div>
    </div>
  );
}
