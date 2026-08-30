/**
 * The plan, and what it costs.
 *
 * A schedule is the point at which ranking stops being an opinion and starts
 * having consequences, so what is asserted here is that the consequences are
 * real: that a job's start time depends on everything ranked above it, that
 * something actually slips when the resources run out, and that the "one more
 * crew" answer comes from re-running the model rather than from a guess.
 */

import { describe, expect, it } from 'vitest';

import { DEFAULT_TARIFF_INR_PER_KWH, formatINR, inrForMWh, inrWithBasis } from './money';
import {
  CREW_COUNT, INSPECT_HOURS, REPAIR_HOURS, TRAVEL_HOURS_BASE,
  jobsSavedByOneMoreCrew, planDay, planDayWith,
} from './schedule';
import type { LiveTask } from './queue';

const task = (over: Partial<LiveTask> & { id: string; panelId: string }): LiveTask => ({
  lossMWhPerDay: 1,
  severity: 'critical',
  hoursUntilDeadline: 24,
  accessCost: 1,
  shortfallKW: 100,
  scheduled: false,
  injected: false,
  ...over,
});

/** Four cracked arrays: every job needs an aircraft and then a crew. */
const fourCracks = [
  task({ id: 'INC-B17', panelId: 'B-17', hoursUntilDeadline: 4 }),
  task({ id: 'INC-C07', panelId: 'C-07', hoursUntilDeadline: 6, accessCost: 1.4 }),
  task({ id: 'INC-A31', panelId: 'A-31', hoursUntilDeadline: 8 }),
  task({ id: 'INC-A22', panelId: 'A-22', hoursUntilDeadline: 10 }),
];

const allCracks = () => 'crack' as const;

describe('the plan is a consequence of the ranking', () => {
  it('starts the top-ranked job first', () => {
    const plan = planDay({ tasks: fourCracks, causeFor: allCracks });
    expect(plan.jobs[0].panelId).toBe('B-17');
    expect(plan.jobs[0].rank).toBe(1);
  });

  it('makes later jobs wait for the resources earlier ones took', () => {
    // The fact a flat ranked list can never show: #3 is not late because it is
    // unimportant, it is late because #1 and #2 have both crews.
    const plan = planDay({ tasks: fourCracks, causeFor: allCracks });
    expect(plan.jobs[2].startH).toBeGreaterThan(plan.jobs[0].startH);
  });

  it('will not send a crew before the aircraft is back', () => {
    // A crack has to be imaged before anyone is dispatched to replace a module,
    // so no crew can start earlier than one inspection leg from now.
    const plan = planDay({ tasks: fourCracks, causeFor: allCracks });
    for (const job of plan.jobs) {
      expect(job.needsInspection).toBe(true);
      expect(job.startH).toBeGreaterThanOrEqual(INSPECT_HOURS - 1e-9);
    }
  });

  it('costs travel in proportion to how far the truck drives', () => {
    // `accessCost` has been in the committed queue since the beginning and until
    // now only ever divided a priority score. Here it moves a clock.
    const near = planDay({ tasks: [task({ id: 'a', panelId: 'A-01' })], causeFor: allCracks });
    const far = planDay({
      tasks: [task({ id: 'b', panelId: 'C-31', accessCost: 1.4 })], causeFor: allCracks,
    });
    expect(far.jobs[0].endH - far.jobs[0].startH)
      .toBeCloseTo((near.jobs[0].endH - near.jobs[0].startH) + TRAVEL_HOURS_BASE * 0.4, 6);
  });
});

describe('a job that needs no inspection skips the aircraft', () => {
  it('lets the wash crew leave immediately', () => {
    // The scheduling payoff of the triage work: a soiled array does not queue for
    // a drone, so it is off the list in a fraction of the time.
    const plan = planDay({
      tasks: [task({ id: 'INC-A08', panelId: 'A-08' })],
      causeFor: () => 'soiling',
    });
    expect(plan.jobs[0].needsInspection).toBe(false);
    expect(plan.jobs[0].startH).toBe(0);
    expect(plan.jobs[0].endH).toBeCloseTo(TRAVEL_HOURS_BASE + REPAIR_HOURS.soiling, 6);
  });

  it('and finishes sooner than the same array would if it were cracked', () => {
    const one = [task({ id: 'x', panelId: 'A-08' })];
    const dirty = planDay({ tasks: one, causeFor: () => 'soiling' });
    const cracked = planDay({ tasks: one, causeFor: allCracks });
    expect(dirty.jobs[0].endH).toBeLessThan(cracked.jobs[0].endH);
  });
});

describe('what the plan costs', () => {
  it('reports the jobs that miss their deadline', () => {
    const plan = planDay({ tasks: fourCracks, causeFor: allCracks });
    expect(plan.slipping.length).toBeGreaterThan(0);
    for (const late of plan.slipping) {
      expect(late.onTime).toBe(false);
      expect(late.lateByH).toBeGreaterThan(0);
      expect(late.endH).toBeGreaterThan(late.deadlineH);
    }
  });

  it('answers "what would another crew buy" by re-running the same model', () => {
    // Not a rule of thumb. The identical function with one more resource — which
    // is why the answer can be shown next to a plan computed properly.
    const input = { tasks: fourCracks, causeFor: allCracks };
    const saved = jobsSavedByOneMoreCrew(input);
    const before = planDay(input).slipping.length;
    const after = planDayWith(input, CREW_COUNT + 1).slipping.length;
    expect(saved).toBe(before - after);
  });

  it('never finishes later with more crews', () => {
    const input = { tasks: fourCracks, causeFor: allCracks };
    expect(planDayWith(input, CREW_COUNT + 2).spanH)
      .toBeLessThanOrEqual(planDay(input).spanH + 1e-9);
  });

  it('plans nothing when there is nothing to plan', () => {
    const plan = planDay({ tasks: [], causeFor: allCracks });
    expect(plan.jobs).toEqual([]);
    expect(plan.spanH).toBe(0);
  });
});

describe('money is an assumption the operator owns', () => {
  it('converts energy at whatever tariff it is handed', () => {
    expect(inrForMWh(1, 3)).toBe(3000);
    expect(inrForMWh(3.07, DEFAULT_TARIFF_INR_PER_KWH)).toBeCloseTo(9210, 6);
  });

  it('groups digits the Indian way, because the site is in Rajasthan', () => {
    // ₹12,34,567 and not ₹1,234,567. The difference between a console built for
    // this site and one that had a currency symbol swapped in.
    expect(formatINR(1234567)).toBe('₹12,34,567');
    expect(formatINR(9210)).toBe('₹9,210');
    expect(formatINR(120)).toBe('₹120');
  });

  it('never returns a rupee figure without the assumption attached', () => {
    // The eight words that make the number defensible. A bare ₹ figure ending up
    // on a slide on its own is the failure this guards against.
    const { amount, basis } = inrWithBasis(3.07, DEFAULT_TARIFF_INR_PER_KWH);
    expect(amount).toBe('₹9,210');
    expect(basis).toMatch(/an assumption, not a sourced tariff/);
    expect(basis).toContain('3.00');
  });
});
