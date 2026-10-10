'use client';

/**
 * The repair queue, and what a person decided about it.
 *
 * The order is arithmetic, never a language model's opinion, and the arithmetic
 * is one click away on every row: loss x severity x urgency / access.
 */

import { ArrowRight, CalendarClock, CircleAlert, ClipboardList, Zap } from 'lucide-react';
import { MWh, hours, num, sentence } from '@/lib/format';
import { scoreBreakdown } from '@/lib/ranking';
import type { Cause } from '@/lib/causes';
import {
  siteClockAt, useInspected, useLiveQueue, useOverrideList, useQueueCauses, useWorkOrders,
} from '@/store/selectors';
import { useSession } from '@/store/session';
import { Blk, Why } from './Block';
import { ImpactLine } from './HazardPalette';
import { PlanScores } from './PlanPanel';

export function QueueOverview() {
  const { tasks } = useLiveQueue();
  const open = tasks.filter((t) => !t.scheduled);
  const critical = open.filter((t) => t.severity === 'critical');
  const nearest = open.length ? Math.min(...open.map((t) => t.hoursUntilDeadline)) : null;
  const items = [
    { label: 'Awaiting a decision', value: `${open.length} ${open.length === 1 ? 'job' : 'jobs'}`, Icon: ClipboardList, hint: 'Ranked work still needs operator review.' },
    { label: 'Critical work', value: `${critical.length} ${critical.length === 1 ? 'job' : 'jobs'}`, Icon: CircleAlert, hint: 'Review evidence and available crew time.' },
    { label: 'Open energy exposure', value: MWh(open.reduce((sum, t) => sum + t.lossMWhPerDay, 0)), Icon: Zap, hint: 'Projected loss per day across open jobs.' },
    { label: 'Nearest deadline', value: nearest === null ? 'No open work' : hours(nearest), Icon: CalendarClock, hint: 'Time remaining on the site clock.' },
  ];
  return <dl className="workspace-metrics">{items.map(({ label, value, Icon, hint }) => <div key={label}><dt><Icon size={18} aria-hidden />{label}</dt><dd className="num">{value}</dd><p>{hint}</p></div>)}</dl>;
}

function QueueAction({ panelId, cause }: { panelId: string; cause: Cause }) {
  const inspected = useInspected(panelId);
  const select = useSession((s) => s.selectPanel);
  const setModule = useSession((s) => s.setModule);
  return <div className="queue-action"><strong>{cause.label}</strong><p>{inspected && cause.needsDrone ? 'Inspection completed. Review returned evidence and the proposed repair before approval.' : cause.action}</p><button type="button" className="tool quiet" onClick={() => { select(panelId); setModule('incident'); }}>Review incident <ArrowRight size={16} aria-hidden /></button></div>;
}

export function QueuePanel({ footer = false, scores = false, detail = false }: {
  /** The site screen's footer: the plan's score, the order count, a way in. */
  footer?: boolean;
  /** The plan's two scores under the queue, where a hazard is dropped. */
  scores?: boolean;
  /** The queue screen: every job with its cause and its arithmetic, unasked. */
  detail?: boolean;
}) {
  const { tasks, unscheduled } = useLiveQueue();
  const causes = useQueueCauses();
  const orders = useWorkOrders();
  const select = useSession((s) => s.selectPanel);
  const setModule = useSession((s) => s.setModule);
  const next = tasks.find((t) => !t.scheduled);
  const topScore = Math.max(...tasks.map((t) => scoreBreakdown(t).score), 1e-6);

  return (
    <Blk
      b="queue" sev={tasks[0]?.severity}
      title={<>Repair queue<span className="count num">{tasks.length} {tasks.length === 1 ? 'job' : 'jobs'}</span></>}
      aside={<Why />}
    >
      <p className="one">
        Ranked by loss × severity × urgency ÷ access{detail ? '. Review the highest-value work, check its evidence, then approve from the incident.' : '.'}
      </p>
      <ImpactLine />
      {tasks.length === 0 ? (
        <p className="empty well">Nothing is off nominal. A job appears here when an array falls below the model.</p>
      ) : (
        <ol className="q" data-detail={detail}>
          {tasks.map((t, i) => {
            const s = scoreBreakdown(t);
            const cause = causes.get(t.panelId);
            const sev = t.scheduled ? 'scheduled' : t.severity;
            return (
              <li key={t.id} data-sev={sev}>
                <button type="button" className="pick" aria-label={`Array ${t.panelId}`} onClick={() => select(t.panelId)}>
                  <span className="rank num">{i + 1}</span>
                  <span className="job">
                    <span className="id">{t.panelId}</span>
                    <span className="meta"><i className="dot" />{sentence(sev)}, {hours(t.hoursUntilDeadline)} left{t.injected ? ', rehearsal' : ''}{t.hazard ? ', dust' : ''}</span>
                  </span>
                  <span className="score num">{detail && <small>Priority score</small>}{num(s.score, 2)}</span>
                </button>
                {detail && <div className="queue-strength" aria-hidden><i style={{ width: `${s.score / topScore * 100}%` }} /></div>}
                {detail && cause && <QueueAction panelId={t.panelId} cause={cause} />}
                {detail ? (
                  <dl className="sum num">
                    <div><dd>{MWh(s.loss)}</dd><dt>lost a day</dt></div>
                    <div><dd>× {num(s.severity, 1)}</dd><dt>severity</dt></div>
                    <div><dd>× {num(s.urgency, 2)}</dd><dt>urgency</dt></div>
                    <div><dd>÷ {num(s.access, 1)}</dd><dt>access</dt></div>
                    <div><dd>= {num(s.score, 2)}</dd><dt>score</dt></div>
                  </dl>
                ) : (
                  <span className="work num workings">{MWh(s.loss)}/day × {num(s.severity, 1)} × {num(s.urgency, 2)} ÷ {num(s.access, 1)}</span>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {unscheduled.length > 0 && (
        <p className="work">
          Deviating with no deadline on file, so not ranked: <span className="id">{unscheduled.join(' ')}</span>.
        </p>
      )}
      {(footer || scores) && <PlanScores />}
      {footer && (
        <div className="foot-row">
          <span className="one">
            {orders.length === 0 ? 'No work orders yet' : `${orders.length} work ${orders.length === 1 ? 'order' : 'orders'} created`}
            {next && <>, next <span className="id">{next.panelId}</span></>}
          </span>
          <button type="button" className="tool" onClick={() => setModule('queue')}>Open queue</button>
        </div>
      )}
    </Blk>
  );
}

/** What a person decided: every approval and every refusal, with when and why. */
export function OrdersPanel() {
  const orders = useWorkOrders();
  const overrides = useOverrideList();
  const select = useSession((s) => s.selectPanel);
  const clearOverride = useSession((s) => s.clearOverride);
  return (
    <Blk b="orders" title={<>Work orders<span className="count num">{orders.length} approved, {overrides.length} declined</span></>}>
      <p className="one">Nothing reaches this list without an operator. The agent proposes; a person commits.</p>
      {orders.length + overrides.length === 0 ? (
        <p className="empty well">No decisions yet. Approve or decline a job from its array panel.</p>
      ) : (
        <ol className="events orders">
          {orders.map((w) => (
            <li key={w.id} data-sev="scheduled">
              <span className="num">{siteClockAt(w.createdAt)}</span>
              <button type="button" className="id link" onClick={() => select(w.panelId)}>{w.id}</button>
              <span className="says">Approved. {w.note}</span>
            </li>
          ))}
          {overrides.map((o) => (
            <li key={o.panelId} data-sev="warning">
              <span className="num">{siteClockAt(o.createdAt)}</span>
              <button type="button" className="id link" onClick={() => select(o.panelId)}>{o.panelId}</button>
              <span className="says">
                Declined: {o.reason.toLowerCase()}.{' '}
                <button type="button" className="link" onClick={() => clearOverride(o.panelId)}>Clear</button>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Blk>
  );
}
