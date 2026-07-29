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

import {
  BEAT, useAgentCache, useApproved, useDemoClockT, useInspected, useMode,
  useSelectedPanelId,
} from '@/store/selectors';
import { useDemoClock } from '@/store/demoClock';
import { useSession } from '@/store/session';

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
        position: 'sticky', bottom: 0,
        background: 'var(--surface-panel)',
        borderTop: '1px solid var(--line-hairline)',
        paddingTop: 'var(--sp-3)',
        display: 'grid', gap: 'var(--sp-2)',
      }}
    >
      <button
        type="button"
        onClick={approve}
        disabled={approved}
        className="btn-reset t-h1"
        style={{
          boxSizing: 'border-box',
          width: '100%',
          textAlign: 'center',
          padding: 'var(--sp-3) var(--sp-4)',
          cursor: approved ? 'default' : 'pointer',
          background: approved ? 'var(--panel-scheduled)' : 'var(--sev-critical)',
          color: 'var(--text-inverse)',
          fontSize: 13,
          letterSpacing: '0.12em',
          transition: 'background 200ms linear',
        }}
      >
        {approved ? `✓ WORK ORDER #${ref} CREATED` : `APPROVE — CREATE WORK ORDER → ${mode === 'live' ? panelId : ''}`}
      </button>

      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
        <span
          className="t-h2"
          style={{
            flex: 1, textAlign: 'center', padding: 'var(--sp-3) var(--sp-2)',
            border: `1px solid ${approved ? 'var(--panel-scheduled)' : 'var(--line-active)'}`,
            color: approved ? 'var(--panel-scheduled)' : 'var(--text-muted)',
          }}
        >
          {approved ? '✓ QUEUED' : 'QUEUED'}
        </span>
        <span
          className="t-h2"
          style={{
            flex: 1.6, textAlign: 'center', padding: 'var(--sp-3) var(--sp-2)',
            border: '1px solid var(--line-active)', background: 'var(--surface-raised)',
            color: 'var(--text-secondary)',
          }}
        >
          INSPECT EVIDENCE
        </span>
        <span
          className="t-h2"
          style={{
            flex: 1, textAlign: 'center', padding: 'var(--sp-3) var(--sp-2)',
            border: '1px solid var(--line-active)', color: 'var(--text-muted)',
          }}
        >
          OVERRIDE
        </span>
      </div>

      <span className="t-micro" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
        {approved
          ? `${mode === 'demo' ? 'B-17' : panelId} scheduled. Autonomous up to this point; a person authorised the work.`
          : 'Nothing enters the work queue without operator approval.'}
      </span>
    </div>
  );
}
