'use client';

/**
 * DayPlan — the ranked queue as an afternoon, with the edges the site actually has.
 *
 * THE RANKING WAS AN OPINION UNTIL THIS EXISTED. A list saying B-17 matters most
 * is true and unactionable: the operator already suspected that. What they cannot
 * work out on their own is that taking B-17 first puts C-31 past its window,
 * because both crews are committed and the aircraft has to land before anyone can
 * be sent to a cracked module. That is a consequence, and consequences are what
 * turn a dashboard into a decision-support tool.
 *
 * WHAT IS DRAWN. One bar per job on a shared timeline: when the crew leaves, when
 * the work finishes, and the array's own deadline as a tick. A bar that ends past
 * its tick is late, and it is red, and the row says by how long. Nothing else —
 * a Gantt chart with dependencies and a critical path would be a more complete
 * picture of a plan nobody would read.
 *
 * THE NUMBERS UNDER IT ARE ASSUMPTIONS AND SAY SO. Crew count, travel time and
 * how long each kind of job takes are site facts, not physics, and they are
 * printed next to the plan precisely so a plant manager can say "ours take four
 * hours" and know exactly which number to argue with.
 */

import { Clock3, TriangleAlert, Users } from 'lucide-react';

import { hours } from '@/lib/format';
import { formatINR, inrForMWh } from '@/lib/money';
import {
  CREW_COUNT, DRONE_COUNT, INSPECT_HOURS, REPAIR_HOURS, TRAVEL_HOURS_BASE,
  type SitePlan,
} from '@/lib/schedule';

const CAUSE_LABEL: Record<string, string> = {
  crack: 'inspect + replace module',
  soiling: 'wash crew',
  shading: 'no repair, geometry',
  unexplained: 'inspect',
  none: '—',
};

export function DayPlan({ plan, savedByOneMoreCrew, tariff, lossPerDayMWh }: {
  plan: SitePlan;
  savedByOneMoreCrew: number;
  tariff: number;
  /** Total site loss per day, for the money line. */
  lossPerDayMWh: number;
}) {
  if (!plan.jobs.length) return null;

  // The timeline spans the work or the furthest deadline, whichever is later, so
  // a job finishing past its deadline still has its tick visible on the bar.
  const span = Math.max(plan.spanH, ...plan.jobs.map((j) => j.deadlineH)) || 1;
  const pct = (h: number) => Math.max(0, Math.min(100, (h / span) * 100));

  // Hour marks at a readable interval. A chart nobody can read the axis of is a
  // decoration, and this one had no axis at all.
  const stepH = span <= 6 ? 1 : span <= 14 ? 2 : span <= 30 ? 6 : 12;
  const marks: number[] = [];
  for (let h = 0; h <= span + 1e-6; h += stepH) marks.push(h);

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
      {/* HOW TO READ IT, in one sentence, before the bars. */}
      <p className="t-prose" style={{
        color: 'var(--text-secondary)', margin: 0, fontSize: 12, lineHeight: 1.5,
      }}>
        One bar per job, all on the same clock starting now. The bar runs from when a
        crew can leave to when the work is finished; the{' '}
        <span style={{
          display: 'inline-block', width: 2, height: 9, background: 'var(--iron-95)',
          verticalAlign: '-1px', margin: '0 3px',
        }} />
        {' '}mark is that array&rsquo;s own deadline. A bar that ends past its mark is
        late, and it is red.
      </p>

      {/* The axis, aligned to the same 150px / 1fr / 128px grid as the bars. */}
      <div style={{
        display: 'grid', gridTemplateColumns: '150px 1fr 128px',
        alignItems: 'end', gap: 'var(--sp-3)',
      }}>
        <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
          HOURS FROM NOW
        </span>
        <span style={{ position: 'relative', display: 'block', height: 14 }}>
          {marks.map((h) => (
            <span
              key={h}
              className="t-micro"
              style={{
                position: 'absolute', bottom: 0, left: `${pct(h)}%`,
                transform: h === 0 ? 'none' : 'translateX(-50%)',
                color: 'var(--text-muted)', whiteSpace: 'nowrap',
              }}
            >
              {h === 0 ? 'now' : `+${h}h`}
            </span>
          ))}
        </span>
        <span />
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        {plan.jobs.map((job) => (
          <div
            key={job.taskId}
            style={{
              display: 'grid', gridTemplateColumns: '150px 1fr 128px',
              alignItems: 'center', gap: 'var(--sp-3)',
            }}
          >
            <span style={{ display: 'grid', gap: 1, minWidth: 0 }}>
              <span className="t-data-em" style={{ color: 'var(--text-primary)' }}>
                {job.panelId}
                <span className="t-micro" style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>
                  #{job.rank}
                </span>
              </span>
              <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
                {job.assignedTo} · {CAUSE_LABEL[job.cause] ?? job.cause}
              </span>
            </span>

            {/* The bar, on a shared scale, with the deadline as a tick. */}
            <span style={{ position: 'relative', display: 'block', height: 20 }}>
              <span style={{
                position: 'absolute', inset: 0, background: 'var(--surface-inset)',
              }} />
              <span
                style={{
                  position: 'absolute', top: 3, bottom: 3,
                  left: `${pct(job.startH)}%`,
                  width: `${Math.max(1, pct(job.endH) - pct(job.startH))}%`,
                  background: job.onTime ? 'var(--sev-active)' : 'var(--sev-critical)',
                }}
              />
              {/* The deadline. A tick rather than a shaded region — the operator is
                  comparing one edge against one edge. */}
              <span
                title={`deadline ${hours(job.deadlineH)}`}
                style={{
                  position: 'absolute', top: -2, bottom: -2, width: 2,
                  left: `${pct(job.deadlineH)}%`,
                  background: 'var(--iron-95)',
                }}
              />
            </span>

            <span
              className="t-data"
              style={{
                textAlign: 'right',
                color: job.onTime ? 'var(--text-secondary)' : 'var(--sev-critical-ink)',
              }}
            >
              {job.onTime
                ? `done ${hours(job.endH)}`
                : `late ${hours(job.lateByH)}`}
            </span>
          </div>
        ))}
      </div>

      {/* WHAT THE PLAN COSTS. The sentence the whole component exists to produce:
          not "here is the order" but "here is what this order does to you". */}
      {plan.slipping.length > 0 ? (
        <p className="t-prose" style={{
          color: 'var(--text-primary)', margin: 0, fontSize: 13, lineHeight: 1.5,
          borderLeft: '3px solid var(--sev-critical)', paddingLeft: 'var(--sp-3)',
        }}>
          <TriangleAlert
            size={13}
            strokeWidth={2}
            aria-hidden
            style={{ color: 'var(--sev-critical)', verticalAlign: '-1px', marginRight: 6 }}
          />
          With {CREW_COUNT} crews and {DRONE_COUNT} aircraft,{' '}
          <strong style={{ color: 'var(--sev-critical-ink)' }}>
            {plan.slipping.length} of {plan.jobs.length} jobs
          </strong>{' '}
          finish after their deadline, {plan.slipping.map((j) => j.panelId).join(', ')}. They
          are not late because they are unimportant; they are late because higher-ranked work
          has both crews.
          {savedByOneMoreCrew > 0 && (
            <> A third crew would bring {savedByOneMoreCrew} of them back inside the window.</>
          )}
        </p>
      ) : (
        <p className="t-prose" style={{
          color: 'var(--text-secondary)', margin: 0, fontSize: 13, lineHeight: 1.5,
        }}>
          Every job finishes inside its deadline with the crews on shift. The whole
          list clears in {hours(plan.spanH)}.
        </p>
      )}

      {/* Money, under the assumption the operator owns. Never a bare figure. */}
      {lossPerDayMWh > 0.001 && (
        <p className="t-prose" style={{
          color: 'var(--text-secondary)', margin: 0, fontSize: 13, lineHeight: 1.5,
        }}>
          The open work is costing about{' '}
          <strong style={{ color: 'var(--sev-warning-ink)' }}>
            {formatINR(inrForMWh(lossPerDayMWh, tariff))} a day
          </strong>{' '}
          in electricity never generated, at ₹{tariff.toFixed(2)}/kWh —{' '}
          <strong>an assumption you set, not a sourced tariff.</strong>
        </p>
      )}

      {/* The declared inputs, printed so they can be argued with rather than
          discovered. Every one of these is a site fact, not physics. */}
      <div className="workings" style={{
        display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-4)',
        borderTop: '1px solid var(--line-hairline)', paddingTop: 'var(--sp-3)',
      }}>
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
          <Users size={11} strokeWidth={2} aria-hidden style={{ verticalAlign: '-1px', marginRight: 4 }} />
          {CREW_COUNT} crews · {DRONE_COUNT} aircraft
        </span>
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
          <Clock3 size={11} strokeWidth={2} aria-hidden style={{ verticalAlign: '-1px', marginRight: 4 }} />
          inspection {hours(INSPECT_HOURS)} · travel {hours(TRAVEL_HOURS_BASE)} × access cost
        </span>
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
          on site: module replacement {hours(REPAIR_HOURS.crack)} · wash {hours(REPAIR_HOURS.soiling)}
        </span>
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
          declared site facts, not derived; change them and the plan changes
        </span>
      </div>
    </div>
  );
}
