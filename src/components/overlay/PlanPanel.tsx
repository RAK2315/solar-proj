'use client';

/**
 * PlanPanel: the day's crew plan, with the two scores side by side.
 *
 * The exact solve and the heuristic are scored by the same function on the same
 * problem, so the difference between them is the solver's whole case for being
 * here, and the screen prints it whatever it is, including nothing.
 *
 * A solve stopped at its time limit is reported as the best plan found, with the
 * gap to the solver's bound. It is never called optimal.
 *
 * A PROPOSAL. Nothing on this panel creates a work order.
 */

import { clockOf, degC, hours, num, pctPlain } from '@/lib/format';
import { DIODE_SERVICE_FROM_STRINGS, REPAIR_PART_HOURS } from '@/lib/repair';
import { TRAVEL_HOURS_BASE } from '@/lib/schedule';
import {
  HEAT_WORK_LIMIT_C, LATE_FACTOR, SHIFT_CAP_HOURS, SHIFT_END_HOUR, SHIFT_START_HOUR, SOLVE_BUDGET_MS, onTime,
} from '@/lib/scheduler';
import { useSchedule, type DaySchedule } from '@/store/selectors';
import { useSession } from '@/store/session';
import { Blk, Why } from './Block';

/** Below this the two plans are the same plan and the difference is rounding. */
const SAME = 1e-6;

/** The scores, in one sentence. Also what the site screen prints under its queue. */
export function scoreLine({ plan, solver }: DaySchedule): string {
  if (plan.status === 'limit') {
    // Stopped at the time limit. The word for a finished solve is not used here.
    const ahead = plan.objective - plan.baseline > SAME
      ? `against ${num(plan.baseline, 2)} for the heuristic`
      : 'the same as the heuristic';
    return `Best plan found in ${SOLVE_BUDGET_MS} ms, score ${num(plan.objective, 2)}, ${ahead}. `
      + `Gap ${pctPlain(plan.gapPct ?? 0, 1)} to the solver\u2019s bound: the search was stopped before it finished.`;
  }
  if (plan.status === 'heuristic') {
    return solver === 'failed'
      ? `Heuristic plan, score ${num(plan.baseline, 2)}. The exact solver did not load, so this is the fallback.`
      : solver === 'loading'
        ? `Heuristic plan, score ${num(plan.baseline, 2)}. The exact solver is still loading.`
        : `Heuristic plan, score ${num(plan.baseline, 2)}. The exact solver returned nothing usable for this day.`;
  }
  const gain = plan.objective - plan.baseline;
  if (gain <= SAME) return `Optimal plan, score ${num(plan.objective, 2)}. The heuristic matched the optimum.`;
  return `Optimal plan scores ${num(plan.objective, 2)} against ${num(plan.baseline, 2)} for the heuristic, `
    + `${pctPlain((gain / plan.baseline) * 100, 1)} better.`;
}

/** One line for the site screen, where the hero happens. */
export function PlanScores() {
  const schedule = useSchedule();
  if (schedule.problem.jobs.length === 0) return null;
  return <p className="one" role="status">{scoreLine(schedule)}</p>;
}

export function PlanPanel() {
  const schedule = useSchedule();
  const select = useSession((s) => s.selectPanel);
  const { problem, plan, heat, firstSlotHour } = schedule;

  const byId = new Map(problem.jobs.map((j) => [j.id, j]));
  const placed = new Set(plan.assignments.map((a) => a.jobId));
  const left = problem.jobs.filter((j) => !placed.has(j.id));
  const late = plan.assignments
    .filter((a) => { const j = byId.get(a.jobId); return j ? !onTime(j, a.startSlot) : false; })
    .map((a) => byId.get(a.jobId)?.panelId ?? a.jobId);
  const slots = Array.from({ length: problem.slots }, (_, k) => k);

  return (
    <Blk
      b="plan"
      title={<>Day plan<span className="count num">{plan.assignments.length} of {problem.jobs.length} jobs placed</span></>}
      aside={<Why />}
    >
      <p className="one" role="status">{scoreLine(schedule)}</p>
      {problem.jobs.length === 0 ? (
        <p className="empty well">No crew work to plan. A job appears here when the queue holds something a crew can fix.</p>
      ) : (
        <div className="sched well" style={{ gridTemplateColumns: `72px repeat(${problem.slots}, minmax(0, 1fr))` }}>
          <span className="hd" />
          {slots.map((k) => (
            <span key={k} className="hd num">{k % 2 === 0 ? clockOf(firstSlotHour + k) : ''}</span>
          ))}
          {Array.from({ length: problem.crews }, (_, crew) => [
            <span key={`c${crew}`} className="crew" style={{ gridRow: crew + 2 }}>Crew {crew + 1}</span>,
            ...slots.map((k) => (
              <span
                key={`${crew}-${k}`}
                className="slot"
                data-closed={problem.closed.has(k) ? (heat.has(k) ? 'heat' : 'shift') : undefined}
                style={{ gridRow: crew + 2, gridColumn: k + 2 }}
              />
            )),
            ...plan.assignments.filter((a) => a.crew === crew).map((a) => {
              const job = byId.get(a.jobId);
              if (!job) return null;
              return (
                <button
                  key={a.jobId}
                  type="button"
                  className="jobbar id"
                  data-late={!onTime(job, a.startSlot)}
                  style={{ gridRow: crew + 2, gridColumn: `${a.startSlot + 2} / span ${job.dur}` }}
                  aria-label={`Array ${job.panelId}, crew ${crew + 1}, ${clockOf(firstSlotHour + a.startSlot)} for ${hours(job.dur, 0)}${onTime(job, a.startSlot) ? '' : ', finishes after its deadline'}`}
                  onClick={() => select(job.panelId)}
                >
                  {job.panelId}
                </button>
              );
            }),
          ])}
        </div>
      )}
      {late.length > 0 && (
        <p className="one" data-sev="critical">
          <span className="sev-ink">Finishes after its deadline: <span className="id">{late.join(' ')}</span>.</span>
          {' '}No crew can do the work in the time left, so it is planned as early as it can be.
        </p>
      )}
      {left.length > 0 && (
        <p className="one">
          Not placed in this horizon: <span className="id">{left.map((j) => j.panelId).join(' ')}</span>.
          There is no open crew time left for them today.
        </p>
      )}
      <p className="one">A proposal. A job becomes a work order only when an operator approves it.</p>
      <div className="work workings">
        <p>
          Site rules, declared: {problem.crews} crews, in the field {clockOf(SHIFT_START_HOUR)} to {clockOf(SHIFT_END_HOUR)},
          at most {hours(SHIFT_CAP_HOURS, 0)} each, and no field work at or above {degC(HEAT_WORK_LIMIT_C, 0)} ambient.
          Hatched slots are closed by heat; dim ones are outside the shift.
        </p>
        <p>
          A job is worth its queue score, less a tenth of it across the horizon for starting later, and {pctPlain(LATE_FACTOR * 100)} of
          that if it finishes after its deadline. Both plans are scored by that one function. Solved in {num(plan.solveMs, 1)} ms as a mixed-integer program by HiGHS,
          in this browser, with a {SOLVE_BUDGET_MS} ms limit. A solve that reaches the limit is shown as the best plan found, with its gap, and is not called optimal.
        </p>
        <p>
          Crew time by repair, declared and not sourced: module replacement {hours(REPAIR_PART_HOURS.module)},
          plus {hours(REPAIR_PART_HOURS.diode)} to test and replace bypass diodes when {DIODE_SERVICE_FROM_STRINGS} or more strings are affected;
          array wash {hours(REPAIR_PART_HOURS.cleaning)}; string reconnection {hours(REPAIR_PART_HOURS.string)};
          manual inspection {hours(REPAIR_PART_HOURS.inspection)}. Travel adds {hours(TRAVEL_HOURS_BASE)} times the array&apos;s access cost, and a job takes whole hours.
        </p>
      </div>
    </Blk>
  );
}
