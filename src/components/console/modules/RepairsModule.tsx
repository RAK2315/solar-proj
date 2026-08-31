'use client';

/**
 * REPAIRS — the ranked work queue, with the ranking shown.
 *
 * THIS IS THE SCREEN YOU OPEN when someone asks how the system prioritises. The
 * queue is not LLM-ordered and never has been: `priorityScore` is a pure function
 * of four inputs and this screen shows all four next to the score they produce, so
 * the reason the top task is on top is readable rather than asserted.
 *
 *   loss × severity weight × urgency ÷ access cost
 *
 * The formula is printed once, at the top, as code. Then the rows are set BIG — the
 * four inputs and the score at 32px — because the whole point of the screen is that
 * you can do the arithmetic in your head from the back of a room. It was an
 * eleven-column 12px table, which is the correct information at the wrong size for
 * the one job it has.
 *
 * Loss is recomputed from the model at the current site time. Deadline and access
 * cost come from the committed site record, because neither is derivable from
 * irradiance — see lib/queue.ts.
 */

import { num } from '@/lib/format';
import { scoreBreakdown, leadMargin } from '@/lib/ranking';
import { panelLabel } from '@/lib/queue';
import {
  useDayPlan, useLiveQueue, useSetModule, useSetTariff, useSiteFrame, useTariff,
  useWorkOrders,
} from '@/store/selectors';
import { DayPlan } from '../DayPlan';
import { CREW_COUNT, DRONE_COUNT } from '@/lib/schedule';
import { Action, Block, Empty, ModuleShell } from './ModuleShell';

const SEV_COLOUR: Record<string, string> = {
  critical: 'var(--sev-critical)',
  warning: 'var(--sev-warning)',
  active: 'var(--sev-active)',
  info: 'var(--sev-info)',
};

const SEV_INK: Record<string, string> = {
  critical: 'var(--sev-critical-ink)',
  warning: 'var(--sev-warning-ink)',
  active: 'var(--sev-active)',
  info: 'var(--text-primary)',
};

/** One of the four inputs, or the score. Big mono figure over a condensed caption. */
function Factor({ label, value, colour, wide = false }: {
  label: string; value: string; colour?: string; wide?: boolean;
}) {
  return (
    <span style={{ display: 'grid', gap: 4, justifyItems: 'end', minWidth: wide ? 132 : 74 }}>
      <span className="t-metric" style={{
        color: colour ?? 'var(--text-primary)',
        fontSize: wide ? 42 : undefined,
      }}>
        {value}
      </span>
      {/* Uppercased in the string, not only by text-transform — these are the four
          named inputs of `priorityScore`, and an operator reading them off the screen
          should get the same tokens the function is documented with. */}
      <span className="t-label" style={{ color: 'var(--text-secondary)' }}>
        {label.toUpperCase()}
      </span>
    </span>
  );
}

/** The operator between two factors. The row IS the formula, so it says so. */
function Op({ children }: { children: string }) {
  return (
    <span
      aria-hidden
      className="t-metric"
      style={{
        color: 'var(--text-muted)', fontSize: 20, alignSelf: 'start', marginTop: 4,
      }}
    >
      {children}
    </span>
  );
}

export function RepairsModule() {
  const { tasks, unscheduled } = useLiveQueue();
  const orders = useWorkOrders();
  const frame = useSiteFrame();
  const setModule = useSetModule();
  const { plan, savedByOneMoreCrew } = useDayPlan();
  const tariff = useTariff();
  const setTariff = useSetTariff();

  const margin = leadMargin(tasks);
  const totalLoss = tasks.reduce((a, t) => a + t.lossMWhPerDay, 0);

  return (
    <ModuleShell
      title="Repairs"
      purpose={`
        What to fix first, and what taking them in that order does to the afternoon.
        The order is arithmetic, not a model's opinion, every row below is the sum
        that produced its own score, written out.
      `}
      subtitle={`${tasks.length} open // ${orders.length} approved // ranked by a pure function, not by a model // site clock ${frame.clock}`}
      action={(
        <Action onClick={() => setModule('site')} ariaLabel="Go to the site map">
          Site map →
        </Action>
      )}
    >
      {/* The function itself, as code, before any of its outputs. When a judge asks
          how it prioritises, this is the answer and it should be the first thing on
          the screen rather than a footnote under the table. */}
      <div style={{
        borderLeft: '3px solid var(--sev-active)',
        background: 'var(--surface-inset)',
        padding: 'var(--sp-4) var(--sp-5)',
        display: 'grid', gap: 'var(--sp-2)',
      }}>
        <code className="t-data-em" style={{ color: 'var(--sev-active)', fontSize: 16 }}>
          SCORE = ( LOSS(MWh/day) × SEVERITY_WEIGHT × URGENCY ) ÷ ACCESS_COST
        </code>
        {/* WHAT THE FOUR WORDS MEAN. The screen said "all four inputs are shown
            next to the score" and then showed four unlabelled numbers; an
            operator who does not already know the function learns nothing from
            that. Each row below prints the same arithmetic with its operators, so
            this only has to be read once. */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-4)',
        }}>
          {[
            ['LOSS', 'MWh this array fails to generate per day, from the model at the current site time'],
            ['WEIGHT', 'how serious the fault is, critical 3.0, warning 1.5, active 1.0'],
            ['URGENCY', '1 + 24 ÷ hours left, so a tightening deadline outweighs a bigger but distant loss'],
            ['ACCESS', 'how hard the array is to reach, 1.0 is normal, higher is worse'],
          ].map(([word, meaning]) => (
            <span key={word} style={{ display: 'grid', gap: 2 }}>
              <span className="t-label" style={{ color: 'var(--text-primary)' }}>{word}</span>
              <span className="t-micro" style={{
                color: 'var(--text-secondary)', lineHeight: 1.45,
              }}>
                {meaning}
              </span>
            </span>
          ))}
        </div>
        <span className="t-micro workings" style={{ color: 'var(--text-secondary)' }}>
          score = loss × severity × urgency ÷ access · urgency = 1 + 24 ÷ hours to
          deadline, so a tightening deadline dominates a larger but distant loss.
          Deterministic: the same site state produces the same order every time.
        </span>
      </div>

      {tasks.length === 0 ? (
        <Empty>Every monitored array is inside tolerance. Nothing to schedule.</Empty>
      ) : (
        <div style={{ display: 'grid' }}>
          {tasks.map((t, i) => {
            const b = scoreBreakdown(t);
            const lead = i === 0;
            return (
              <article
                key={t.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--sp-5)',
                  padding: 'var(--sp-4) var(--sp-5)',
                  background: lead ? 'var(--surface-raised)' : 'var(--surface-panel)',
                  borderLeft: `4px solid ${lead ? SEV_COLOUR[t.severity] : 'transparent'}`,
                  borderBottom: '1px solid var(--line-hairline)',
                  opacity: t.scheduled ? 0.55 : 1,
                }}
              >
                <span className="t-metric" style={{
                  color: lead ? SEV_INK[t.severity] : 'var(--text-secondary)',
                  minWidth: 46,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>

                <span style={{ display: 'grid', gap: 4, minWidth: 260 }}>
                  <span className="t-data-em" style={{ color: 'var(--text-primary)' }}>
                    {t.id}
                  </span>
                  <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
                    {panelLabel(t.panelId)}
                  </span>
                </span>

                <span style={{
                  display: 'grid', gap: 4, minWidth: 190, justifyItems: 'start',
                }}>
                  <span className="chip" style={{ background: SEV_COLOUR[t.severity] }}>
                    {t.severity.toUpperCase()}
                  </span>
                  <span className="t-micro" style={{ color: SEV_INK[t.severity] }}>
                    DEADLINE IN {num(t.hoursUntilDeadline, 1)} H
                  </span>
                </span>

                <span style={{
                  marginLeft: 'auto', display: 'flex', alignItems: 'flex-start',
                  gap: 'var(--sp-3)',
                }}>
                  <Factor label="Loss MWh/d" value={num(t.lossMWhPerDay, 2)} />
                  <Op>×</Op>
                  <Factor label="Weight" value={num(b.severity, 2)} />
                  <Op>×</Op>
                  <Factor label="Urgency" value={num(b.urgency, 2)} />
                  <Op>÷</Op>
                  <Factor label="Access" value={num(b.access, 1)} />
                  <Op>=</Op>
                  <span style={{ display: 'grid', gap: 4, justifyItems: 'end' }}>
                    <Factor
                      label="Score"
                      value={num(b.score, 2)}
                      colour={lead ? SEV_INK[t.severity] : 'var(--text-primary)'}
                      wide
                    />
                    {lead && Number.isFinite(margin) && (
                      <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
                        {num(margin, 1)}× ahead of #2
                      </span>
                    )}
                    {t.scheduled && (
                      <span className="t-micro" style={{ color: 'var(--panel-scheduled)' }}>
                        SCHEDULED
                      </span>
                    )}
                  </span>
                </span>
              </article>
            );
          })}
        </div>
      )}

      {/* THE PLAN, under the list that produced it.
          The ranked list says which job matters most, which an operator already
          suspected. The plan says what taking them in that order actually does to
          the afternoon, and that is the part they cannot work out themselves.
          It used to come first, and a Gantt chart is the wrong thing to meet on a
          screen called Repairs before you have seen what is being repaired. */}
      {tasks.length > 0 && (
        <Block
          title="Today, with the crews on shift" wide
          note={`${CREW_COUNT} crews · ${DRONE_COUNT} aircraft · greedy down the ranking`}
        >
          <DayPlan
            plan={plan}
            savedByOneMoreCrew={savedByOneMoreCrew}
            tariff={tariff}
            lossPerDayMWh={totalLoss}
          />

          {/* The assumption, where it can be argued with rather than discovered.
              A tariff nobody can change reads as a claim; one the operator sets
              reads as what it is. */}
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
              borderTop: '1px solid var(--line-hairline)', paddingTop: 'var(--sp-3)',
            }}
          >
            <span className="t-label" style={{ color: 'var(--text-secondary)' }}>
              Tariff assumption
            </span>
            <input
              type="range"
              min={1}
              max={10}
              step={0.25}
              value={tariff}
              onChange={(e) => setTariff(Number(e.target.value))}
              aria-label="Electricity tariff assumption, rupees per kWh"
              style={{ width: 220, accentColor: 'var(--sev-active)' }}
            />
            <span className="t-data-em" style={{ color: 'var(--text-primary)' }}>
              ₹{tariff.toFixed(2)}
              <span className="t-micro" style={{ color: 'var(--text-secondary)' }}> /kWh</span>
            </span>
            <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
              we have no sourced tariff for this block, set your own and every rupee
              figure above moves
            </span>
          </label>
        </Block>
      )}

      <Block
        title="Approved work orders"
        note={`${num(totalLoss, 2)} MWh/day at stake across the queue`}
      >
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
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-4)',
          }}>
            {orders.map((o) => (
              <article key={o.id} style={{
                border: '1px solid var(--line-hairline)',
                borderTop: '2px solid var(--panel-scheduled)',
                background: 'var(--surface-raised)',
                padding: 'var(--sp-3) var(--sp-4)',
                display: 'grid', gap: 'var(--sp-2)', alignContent: 'start',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  gap: 'var(--sp-3)',
                }}>
                  <span className="t-data-em" style={{ color: 'var(--panel-scheduled)' }}>
                    {o.id}
                  </span>
                  <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
                    T+{num(o.createdAt / 60, 0)} MIN
                  </span>
                </div>
                <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
                  ARRAY: {o.panelId}
                </span>
                <p className="t-prose" style={{
                  color: 'var(--text-primary)', margin: 0, fontSize: 12, lineHeight: 1.5,
                }}>
                  {o.note}
                </p>
              </article>
            ))}
          </div>
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
