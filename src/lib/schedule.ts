/**
 * src/lib/schedule.ts — the queue becomes a day, and the day has edges.
 *
 * WHAT WAS MISSING. `rankQueue` produces a perfectly good ordered list and
 * nothing acts on it. Ranking without scarcity is sorting: it tells an operator
 * which job matters most and says nothing about the question they are actually
 * stuck on, which is that there are four jobs, two aircraft, two crews and one
 * hot afternoon, and something is going to slip.
 *
 * So this turns the ranking into a PLAN — who goes where, in what order, starting
 * when — and then says what the plan costs: which jobs miss their deadline
 * because higher-ranked work went first.
 *
 * DELIBERATELY NOT AN OPTIMISER. It is a greedy pass down the existing ranking,
 * assigning each job to whichever resource comes free first. That is a worse
 * schedule than a solver would produce and a far better one to put in front of a
 * person, because the whole value of `priorityScore` is that an operator can read
 * it and disagree with it. A branch-and-bound result is unarguable in the bad
 * sense: nobody can tell whether it is right. This is explainable in one
 * sentence — highest score first, next free resource — and every input is on
 * screen.
 *
 * WHAT IS DECLARED HERE, and therefore arguable:
 *
 *   CREW_COUNT / DRONE_COUNT   how many of each the site runs
 *   TRAVEL_HOURS_BASE          driving time to an array at access cost 1.0
 *   REPAIR_HOURS               how long each kind of job takes on site
 *
 * None of them is derivable from irradiance and none of them is pretended to be.
 * They are site facts of the same kind as `accessCost`, which the committed
 * repair queue has always carried, and they are stated on screen next to the plan
 * so a plant manager can say "our crews take four hours, not three" and see the
 * plan change.
 */

import { MISSION_TOTAL } from '@/store/session';

import type { CauseId } from './causes';
import type { LiveTask } from './queue';

/** Aircraft available for inspection. Matches the fleet the console already has. */
export const DRONE_COUNT = 2;

/** Maintenance crews available to do the physical work. */
export const CREW_COUNT = 2;

/** Driving time to an array at access cost 1.0. Scaled by the array's own cost. */
export const TRAVEL_HOURS_BASE = 0.5;

/**
 * Time on site, once a crew is there. A wash is quick and a module replacement is
 * not; shading needs nobody, because there is nothing to repair.
 */
export const REPAIR_HOURS: Record<CauseId, number> = {
  crack: 3.0,
  soiling: 1.5,
  shading: 0,
  unexplained: 1.0,
  none: 0,
};

/** The inspection leg, in hours — the same mission the console already flies. */
export const INSPECT_HOURS = MISSION_TOTAL / 3600;

export interface ScheduleInput {
  /** The ranked queue, in rank order. */
  tasks: LiveTask[];
  /** What is wrong with each array, by panel id — decides the work and the crew. */
  causeFor: (panelId: string) => CauseId;
  /** Hours from now that work can begin. Zero means immediately. */
  startH?: number;
}

export interface ScheduledJob {
  taskId: string;
  panelId: string;
  rank: number;
  cause: CauseId;
  /** Which resource is assigned: `DRONE 01`, `CREW 2`, … */
  assignedTo: string;
  /** Hours from now when the crew leaves. */
  startH: number;
  /** Hours from now when the work is finished. */
  endH: number;
  /** This array's own deadline, hours from now. */
  deadlineH: number;
  /** Does the work finish before the deadline? */
  onTime: boolean;
  /** How late, in hours. Zero when on time. */
  lateByH: number;
  /** Does this job need an aircraft before a crew can act? */
  needsInspection: boolean;
}

export interface SitePlan {
  jobs: ScheduledJob[];
  /** Jobs that miss their deadline because higher-ranked work went first. */
  slipping: ScheduledJob[];
  /** Hours until the last job finishes. */
  spanH: number;
}

/**
 * Build the plan, for a given number of crews.
 *
 * One pass down the ranking. Each job takes the resource that frees up soonest,
 * so a job's start time is a consequence of everything ranked above it — which is
 * exactly the fact the operator needs and the flat list could never show.
 *
 * `crewCount` is a parameter rather than a constant so the counterfactual below
 * can run the IDENTICAL model with one more crew. Answering "what would another
 * crew buy us" with a rule of thumb, next to a plan computed properly, would be
 * the one estimated number on a screen full of derived ones.
 */
export function planDayWith(input: ScheduleInput, crewCount: number): SitePlan {
  const { tasks, causeFor, startH = 0 } = input;

  // When each resource next becomes available, in hours from now.
  const drones = Array.from({ length: DRONE_COUNT }, () => startH);
  const crews = Array.from({ length: Math.max(1, crewCount) }, () => startH);

  const jobs: ScheduledJob[] = tasks.map((task, i) => {
    const cause = causeFor(task.panelId);
    const travel = TRAVEL_HOURS_BASE * task.accessCost;
    const work = REPAIR_HOURS[cause] ?? REPAIR_HOURS.unexplained;
    const needsInspection = cause === 'crack' || cause === 'unexplained';

    // An inspection has to land before a crew can be sent, so the crew cannot
    // start until the aircraft is back. That dependency is the reason one extra
    // aircraft can change the whole afternoon.
    let readyAt = startH;
    if (needsInspection) {
      const d = drones.indexOf(Math.min(...drones));
      drones[d] = Math.max(drones[d], startH) + INSPECT_HOURS;
      readyAt = drones[d];
    }

    const c = crews.indexOf(Math.min(...crews));
    const begin = Math.max(crews[c], readyAt);
    const finish = begin + travel + work;
    crews[c] = finish;

    const deadlineH = task.hoursUntilDeadline;
    const onTime = finish <= deadlineH;

    return {
      taskId: task.id,
      panelId: task.panelId,
      rank: i + 1,
      cause,
      assignedTo: `CREW ${c + 1}`,
      startH: begin,
      endH: finish,
      deadlineH,
      onTime,
      lateByH: onTime ? 0 : finish - deadlineH,
      needsInspection,
    };
  });

  return {
    jobs,
    slipping: jobs.filter((j) => !j.onTime),
    spanH: jobs.length ? Math.max(...jobs.map((j) => j.endH)) : 0,
  };
}

/** The plan as the site actually stands, with the crews it actually has. */
export const planDay = (input: ScheduleInput): SitePlan => planDayWith(input, CREW_COUNT);

/**
 * What one more crew would buy, in jobs brought back inside their deadline.
 *
 * The question a plant manager asks the moment they are shown a plan that slips,
 * and it is answered by running the same model again rather than by estimating.
 */
export function jobsSavedByOneMoreCrew(input: ScheduleInput): number {
  const before = planDay(input).slipping.length;
  const after = planDayWith(input, CREW_COUNT + 1).slipping.length;
  return Math.max(0, before - after);
}
