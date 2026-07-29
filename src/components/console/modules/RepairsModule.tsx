'use client';

/**
 * REPAIRS — the ranked work queue, with the ranking shown.
 *
 * THIS IS THE SCREEN YOU OPEN when someone asks how the system prioritises. The
 * queue is not LLM-ordered and never has been: `priorityScore` is a pure function
 * of four inputs and this table shows all four next to the score they produce, so
 * the reason the top task is on top is readable rather than asserted.
 *
 *   loss × severity weight × urgency ÷ access cost
 *
 * Loss is recomputed from the model at the current site time. Deadline and access
 * cost come from the committed site record, because neither is derivable from
 * irradiance — see lib/queue.ts.
 */

import { num } from '@/lib/format';
import { scoreBreakdown, leadMargin } from '@/lib/ranking';
import { panelLabel } from '@/lib/queue';
import { useLiveQueue, useSetModule, useSiteFrame, useWorkOrders } from '@/store/selectors';
import { Block, Cell, Empty, ModuleShell, Table } from './ModuleShell';

const SEV_COLOUR: Record<string, string> = {
  critical: 'var(--sev-critical)',
  warning: 'var(--sev-warning)',
  active: 'var(--sev-active)',
  info: 'var(--sev-info)',
};

export function RepairsModule() {
  const { tasks, unscheduled } = useLiveQueue();
  const orders = useWorkOrders();
  const frame = useSiteFrame();
  const setModule = useSetModule();

  const margin = leadMargin(tasks);
  const totalLoss = tasks.reduce((a, t) => a + t.lossMWhPerDay, 0);

  return (
    <ModuleShell
      title="Repairs"
      subtitle={`${tasks.length} open · ${orders.length} approved · site clock ${frame.clock}`}
    >
      <Block
        title="Ranked queue"
        note={tasks.length > 1 ? `#1 leads #2 by ${num(margin, 1)}×` : undefined}
      >
        {tasks.length === 0 ? (
          <Empty>
            Every monitored array is inside tolerance. Nothing to schedule.
          </Empty>
        ) : (
          <Table head={[
            '#', 'Task', 'Array', 'Loss MWh/d', 'Severity', '×', 'Deadline h', 'Urgency',
            'Access', 'Score', 'State',
          ]}>
            {tasks.map((t, i) => {
              const b = scoreBreakdown(t);
              return (
                <tr key={t.id}>
                  <Cell first emphasis colour={i === 0 ? 'var(--sev-critical)' : undefined}>
                    {i + 1}
                  </Cell>
                  <Cell colour="var(--text-primary)">{t.id}</Cell>
                  <Cell>{panelLabel(t.panelId)}</Cell>
                  <Cell emphasis colour="var(--text-primary)">{num(t.lossMWhPerDay, 2)}</Cell>
                  <Cell colour={SEV_COLOUR[t.severity]}>{t.severity.toUpperCase()}</Cell>
                  <Cell>{num(b.severity, 2)}</Cell>
                  <Cell>{num(t.hoursUntilDeadline, 1)}</Cell>
                  <Cell>{num(b.urgency, 2)}</Cell>
                  <Cell>{num(b.access, 1)}</Cell>
                  <Cell emphasis colour={i === 0 ? 'var(--sev-critical)' : 'var(--text-primary)'}>
                    {num(b.score, 2)}
                  </Cell>
                  <Cell colour={t.scheduled ? 'var(--panel-scheduled)' : 'var(--text-muted)'}>
                    {t.scheduled ? 'SCHEDULED' : 'OPEN'}
                  </Cell>
                </tr>
              );
            })}
          </Table>
        )}
        <p className="t-micro" style={{ color: 'var(--text-muted)' }}>
          score = loss × severity × urgency ÷ access · urgency = 1 + 24 ÷ hours to
          deadline, so a tightening deadline dominates a larger but distant loss.
          Deterministic: the same site state produces the same order every time.
        </p>
      </Block>

      <Block title="Approved work orders" note={`${num(totalLoss, 2)} MWh/day at stake across the queue`}>
        {orders.length === 0 ? (
          <Empty>
            No work has been approved. An array becomes approvable once a drone has
            inspected it and the agent has produced a recommendation —{' '}
            <button
              className="btn-reset t-data"
              onClick={() => setModule('site')}
              style={{ color: 'var(--sev-active)', textDecoration: 'underline' }}
            >
              go to the site map
            </button>.
          </Empty>
        ) : (
          <Table head={['Order', 'Array', 'Raised', 'Instruction']}>
            {orders.map((o) => (
              <tr key={o.id}>
                <Cell first emphasis colour="var(--panel-scheduled)">{o.id}</Cell>
                <Cell>{panelLabel(o.panelId)}</Cell>
                <Cell>T+{num(o.createdAt / 60, 0)} min</Cell>
                <Cell colour="var(--text-secondary)">
                  <span style={{ whiteSpace: 'normal', display: 'block', maxWidth: 520 }}>
                    {o.note}
                  </span>
                </Cell>
              </tr>
            ))}
          </Table>
        )}
      </Block>

      {unscheduled.length > 0 && (
        <Block title="Deviating, not rankable">
          <Empty>
            {unscheduled.join(', ')} {unscheduled.length === 1 ? 'is' : 'are'} below
            expected output but {unscheduled.length === 1 ? 'carries' : 'carry'} no
            booked maintenance window or access cost on the site record, so
            {unscheduled.length === 1 ? ' it cannot' : ' they cannot'} be scored
            against the queue above. Listed here rather than dropped.
          </Empty>
        </Block>
      )}
    </ModuleShell>
  );
}
