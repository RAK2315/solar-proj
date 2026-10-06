'use client';

/**
 * The repair queue and the day plan built from it.
 *
 * The order is arithmetic, never a language model's opinion, and the arithmetic
 * is one click away on every row: loss x severity x urgency / access.
 */

import { MWh, hours, num, sentence } from '@/lib/format';
import { scoreBreakdown } from '@/lib/ranking';
import { useDayPlan, useLiveQueue, useWorkOrders } from '@/store/selectors';
import { useSession } from '@/store/session';
import { Blk, Why } from './Block';
import { ImpactLine } from './HazardPalette';

export function QueuePanel({ footer = false }: { footer?: boolean }) {
  const { tasks, unscheduled } = useLiveQueue();
  const orders = useWorkOrders();
  const select = useSession((s) => s.selectPanel);
  const setModule = useSession((s) => s.setModule);
  const next = tasks.find((t) => !t.scheduled);

  return (
    <Blk
      b="queue" sev={tasks[0]?.severity}
      title={<>Repair queue<span className="count num">{tasks.length} {tasks.length === 1 ? 'job' : 'jobs'}</span></>}
      aside={<Why />}
    >
      <p className="one">Ranked by loss × severity × urgency ÷ access.</p>
      <ImpactLine />
      {tasks.length === 0 ? (
        <p className="empty well">Nothing is off nominal. A job appears here when an array falls below the model.</p>
      ) : (
        <ol className="q">
          {tasks.map((t, i) => {
            const s = scoreBreakdown(t);
            const sev = t.scheduled ? 'scheduled' : t.severity;
            return (
              <li key={t.id} data-sev={sev}>
                <button type="button" className="pick" aria-label={`Array ${t.panelId}`} onClick={() => select(t.panelId)}>
                  <span className="rank num">{i + 1}</span>
                  <span className="job">
                    <span className="id">{t.panelId}</span>
                    <span className="meta"><i className="dot" />{sentence(sev)}, {hours(t.hoursUntilDeadline)} left{t.injected ? ', rehearsal' : ''}{t.hazard ? ', dust' : ''}</span>
                  </span>
                  <span className="score num">{num(s.score, 2)}</span>
                </button>
                <span className="work num workings">{MWh(s.loss)}/day × {num(s.severity, 1)} × {num(s.urgency, 2)} ÷ {num(s.access, 1)}</span>
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

export function PlanPanel() {
  const { plan, savedByOneMoreCrew } = useDayPlan();
  const span = Math.max(plan.spanH, ...plan.jobs.map((j) => j.deadlineH), 1);
  const at = (h: number) => `${Math.min(100, (h / span) * 100).toFixed(1)}%`;
  return (
    <Blk b="plan" title={<>Day plan<span className="count num">{plan.jobs.length} jobs over {hours(plan.spanH)}</span></>}>
      <p className="one">
        Greedy schedule for two crews and two drones: {plan.slipping.length} past deadline,
        {' '}{savedByOneMoreCrew} recovered by one more crew.
      </p>
      {plan.jobs.length === 0 ? (
        <p className="empty well">No jobs to schedule.</p>
      ) : (
        <ol className="plan">
          {plan.jobs.map((j) => (
            <li key={j.taskId} data-sev={j.onTime ? 'scheduled' : 'critical'}>
              <span className="job"><span className="id">{j.panelId}</span><span className="meta">{sentence(j.assignedTo)}</span></span>
              <span className="track">
                <i className="bar" style={{ left: at(j.startH), width: `max(6px, calc(${at(j.endH)} - ${at(j.startH)}))` }} />
                <i className="tick" style={{ left: at(j.deadlineH) }} />
              </span>
              <span className="fig num">{j.onTime ? `Done in ${hours(j.endH)}` : `${hours(j.lateByH)} late`}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="work workings">The bar is travel plus repair for the assigned crew. The tick is the job&apos;s deadline.</p>
    </Blk>
  );
}
