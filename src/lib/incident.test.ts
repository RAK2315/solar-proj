/**
 * The incident is an ARGUMENT, and the risk of an argument is that it becomes
 * persuasive faster than it becomes true.
 *
 * So what is asserted here is not that six steps render. It is that each step's
 * claim matches the state it was built from, that a step which has not happened
 * says nothing rather than something hedged, and — the one that matters most —
 * that a step resting on captured imagery is only ever built for the one array we
 * actually hold imagery for.
 */

import { describe, expect, it } from 'vitest';

import { diagnose } from './causes';
import { detection } from './data';
import { buildIncident, incidentTimeline, type IncidentInput } from './incident';
import { scenario } from './live';
import { irradianceAt } from './physics';

const PEAK = Math.max(...Array.from({ length: 24 }, (_, h) => irradianceAt(h)));

const FLEET_MEDIAN_C = 62.8;

/**
 * The cause, worked out the way the selector works it out — from instrument
 * signatures, never from the committed soiling value.
 */
const causeFor = (
  panelId: string,
  deviationPct: number,
  over: { stringDeviationPct?: number; cellTempC?: number } = {},
) => diagnose({
  panelId,
  deviationPct,
  cellTempC: over.cellTempC ?? FLEET_MEDIAN_C,
  fleetMedianCellTempC: FLEET_MEDIAN_C,
  stringDeviationPct: over.stringDeviationPct,
  hourOffset: 2,
  peakIrradiance: PEAK,
});

const B17_FAULT = scenario.events.find((e) => e.panelId === 'B-17')!;

/** A healthy array: nothing observed, nothing claimed. */
const clear = (over: Partial<IncidentInput> = {}): IncidentInput => ({
  panelId: 'C-29',
  deviationPct: 0,
  referenceShortfallKW: 0,
  fault: undefined,
  inspectedAt: null,
  dispatchedAt: null,
  projectedLossMWh: 0,
  hoursUntilDeadline: null,
  queueRank: null,
  workOrderAt: null,
  override: null,
  detection: null,
  liveDetection: null,
  cause: causeFor('C-29', 0),
  ...over,
});

/** B-17 as the console actually has it: faulted, inspected, ranked first. */
const b17 = (over: Partial<IncidentInput> = {}): IncidentInput => clear({
  panelId: 'B-17',
  deviationPct: -41.71,
  referenceShortfallKW: 105.4,
  fault: B17_FAULT,
  projectedLossMWh: 3.07,
  hoursUntilDeadline: 3.9,
  queueRank: 1,
  cause: causeFor('B-17', -41.71, { stringDeviationPct: -58.4, cellTempC: FLEET_MEDIAN_C + 2.8 }),
  ...over,
});

const step = (input: IncidentInput, key: string) =>
  buildIncident(input).chain.find((s) => s.key === key)!;

describe('a clear array', () => {
  it('opens no incident and claims nothing', () => {
    const inc = buildIncident(clear());
    expect(inc.state).toBe('clear');
    expect(inc.openedAt).toBeNull();
  });

  it('says plainly that it is fine, rather than staying silent', () => {
    // Silence reads as "not checked". The observation step is the one place a
    // healthy array should still speak.
    expect(step(clear(), 'observation').says).toMatch(/producing what the model expects/i);
  });

  it('leaves every later step empty rather than hedged', () => {
    // A step with nothing to say must say nothing. "No data available" in six
    // places is the density problem this console already had once.
    for (const key of ['evidence', 'hypothesis', 'forecast', 'recommendation']) {
      const s = step(clear(), key);
      expect(s.state).toBe('pending');
      expect(s.says).toBeUndefined();
    }
  });
});

describe('a faulted array, before anyone has looked', () => {
  it('states the shortfall it was given, rounded, and names the array', () => {
    const s = step(b17(), 'observation');
    expect(s.says).toContain('B-17');
    expect(s.says).toContain('42%');
    expect(s.basis).toBe('modelled');
  });

  it('refuses to name a cause from telemetry alone', () => {
    // THE LOAD-BEARING CLAIM of the entire product. If this step ever starts
    // asserting a mechanism before evidence is back, the drone has no reason to
    // exist and the agent is a threshold alarm with a vocabulary.
    const s = step(b17(), 'evidence');
    expect(s.state).toBe('pending');
    expect(s.says).toMatch(/cannot say WHY/);
    expect(s.says).toMatch(/soiling, shading and a cracked cell look alike/i);
  });

  it('is in the detected state, not the diagnosed one', () => {
    expect(buildIncident(b17()).state).toBe('detected');
  });

  it('still projects a consequence, because that needs no imagery', () => {
    const s = step(b17(), 'forecast');
    expect(s.state).toBe('done');
    expect(s.says).toContain('3.1 MWh');
    expect(s.says).toContain('3.9 hours');
    expect(s.basis).toBe('modelled');
  });
});

describe('while a drone is on its way', () => {
  const flying = b17({ dispatchedAt: 600 });

  it('says a drone is going, and why', () => {
    const s = step(flying, 'evidence');
    expect(s.state).toBe('active');
    expect(s.says).toMatch(/on its way/);
    expect(s.says).toMatch(/rather than guessing/);
  });

  it('reports the incident as being investigated', () => {
    expect(buildIncident(flying).state).toBe('investigating');
  });
});

describe('once evidence is back', () => {
  // The detection is passed in the way the selector passes it — already gated on
  // hasCapturedEvidence. The module gates it a second time, deliberately.
  const inspected = b17({ dispatchedAt: 600, inspectedAt: 1560, detection });

  it('quotes the detector by its real confidence, not a rounded one', () => {
    const s = step(inspected, 'evidence');
    expect(s.state).toBe('done');
    expect(s.basis).toBe('measured');
    // The committed detection, whatever it actually returned.
    expect(s.says).toContain(detection!.confidence.toFixed(2));
    expect(s.says).toContain('row 2');
  });

  it('names the instruments rather than asserting authority', () => {
    expect(step(inspected, 'evidence').source).toMatch(/YOLOv8n/);
    expect(step(inspected, 'evidence').source).toMatch(/UAV thermal/);
  });

  it('is diagnosed', () => {
    expect(buildIncident(inspected).state).toBe('diagnosed');
  });
});

describe('evidence scoping — the most repeated bug in this project', () => {
  it('never claims a capture for an array we hold no imagery for', () => {
    // A-31 carries a real crack. It has NO committed imagery. An inspected A-31
    // must therefore report that a drone went and that nothing is on file — not
    // borrow B-17's detection to fill the sentence.
    const a31 = b17({ panelId: 'A-31', inspectedAt: 1560, dispatchedAt: 600, detection: null });
    const s = step(a31, 'evidence');

    expect(s.state).toBe('done');
    expect(s.basis).not.toBe('measured');
    expect(s.says).toMatch(/No imagery is held on file/);
    expect(s.says).not.toContain('detector');
    expect(s.says).not.toContain('row 2');
  });

  it('does not leak the confidence figure into another array', () => {
    const a31 = b17({ panelId: 'A-31', inspectedAt: 1560, detection: null });
    expect(step(a31, 'evidence').says).not.toContain(detection!.confidence.toFixed(2));
  });
});

describe('the hypothesis separates the mechanism from the prose about it', () => {
  it('states the mechanism from the site record with no agent present', () => {
    const s = step(b17(), 'hypothesis');
    expect(s.says).toContain('Cracked cell');
    expect(s.basis).toBe('modelled');
    // Three sources settle a cause now, not one: the recorded mechanism, the
    // array's own soiling derate, and the site geometry. Naming all three is what
    // lets a reader check the elimination rather than accept it.
    expect(s.source).toMatch(/site record/);
    expect(s.source).toMatch(/geometry/);
  });

  it('shows what it ruled out, and what ruled it out', () => {
    // The refusals are half the reasoning. A console that only states its
    // conclusion is asking to be trusted; one that shows the elimination is
    // showing its work.
    const s = step(b17(), 'hypothesis');
    expect(s.ruledOut?.length).toBeGreaterThan(0);
    expect(s.ruledOut!.map((r) => r.cause)).toContain('Row shading');
    expect(s.ruledOut!.find((r) => r.cause === 'Row shading')!.because).toMatch(/sun is/);
  });

  it('declines the drone when the cause is already settled', () => {
    // A-08 is dirty, unfaulted, and needs no imaging. The evidence step must
    // report that as DONE with a reason — not sit at pending for ever, which read
    // as the console failing to get round to it.
    const soiled = clear({
      panelId: 'A-08',
      deviationPct: -9.1,
      referenceShortfallKW: 20,
      cause: causeFor('A-08', -9.1),
      queueRank: 2,
    });
    const evidence = step(soiled, 'evidence');
    expect(evidence.state).toBe('done');
    expect(evidence.says).toMatch(/No inspection needed/);

    // And the recommendation reaches a DIFFERENT action from a cracked array.
    expect(step(soiled, 'recommendation').says).toMatch(/wash crew/i);
    expect(step(b17(), 'recommendation').says).toMatch(/Fly a drone/);
  });

  it('does NOT carry the agent’s prose — that is said once, in its own card', () => {
    // The paragraph used to be appended here as well, so the same five sentences
    // appeared twice on one screen. The chain is the DETERMINISTIC reading; the
    // card is the model's prose about it. Two kinds of claim, said once each.
    const s = step(b17(), 'hypothesis');
    expect(s.basis).toBe('modelled');
    expect(s.source).toMatch(/site record/);
    expect(s.source).toMatch(/geometry/);
  });
});

describe('the recommendation is calculated, never written', () => {
  it('is always marked as derived, and names the function', () => {
    const s = step(b17(), 'recommendation');
    expect(s.basis).toBe('derived');
    expect(s.source).toMatch(/priorityScore/);
    expect(s.source).toMatch(/pure function/);
  });

  it('reports an unrankable array rather than dropping it', () => {
    const s = step(b17({ queueRank: null }), 'recommendation');
    expect(s.state).toBe('blocked');
    expect(s.says).toMatch(/cannot be ranked/);
    expect(s.says).toMatch(/reported rather than dropped/);
  });
});

describe('the decision belongs to a person', () => {
  it('waits, visibly, until one is made', () => {
    const s = step(b17(), 'decision');
    expect(s.state).toBe('active');
    expect(s.says).toMatch(/Waiting for an operator/);
    expect(s.basis).toBe('operator');
  });

  it('records an approval with its time', () => {
    const inc = buildIncident(b17({ workOrderAt: 7200 }));
    expect(inc.state).toBe('scheduled');
    expect(step(b17({ workOrderAt: 7200 }), 'decision').says).toMatch(/Work order raised at 12:00/);
  });

  it('records a refusal with the reason, and raises nothing', () => {
    const declined = b17({ override: { at: 7200, reason: 'crew already on site tomorrow' } });
    expect(buildIncident(declined).state).toBe('declined');
    const s = step(declined, 'decision');
    expect(s.says).toContain('crew already on site tomorrow');
    expect(s.says).toMatch(/No work order was raised/);
  });
});

describe('the timeline is the chain, not a second list', () => {
  it('carries only steps that actually happened', () => {
    const rows = incidentTimeline(buildIncident(b17({ dispatchedAt: 600 })));
    expect(rows.every((r) => r.state === 'done')).toBe(true);
    expect(rows.every((r) => r.at !== undefined)).toBe(true);
  });

  it('is ordered by when, not by the order the chain declares', () => {
    const rows = incidentTimeline(buildIncident(
      b17({ dispatchedAt: 600, inspectedAt: 1560, workOrderAt: 9000 }),
    ));
    const times = rows.map((r) => r.at ?? 0);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    // The human decision is last, because it is.
    expect(rows[rows.length - 1].key).toBe('decision');
  });

  it('opens the incident when the committed fault says it began', () => {
    // Not when it was noticed, not when the page loaded.
    const inc = buildIncident(b17());
    expect(inc.openedAt).toBeCloseTo((B17_FAULT.startHour - scenario.epochHour) * 3600, 6);
  });

  it('uses the same identifier as the queue and the work order', () => {
    expect(buildIncident(b17()).id).toBe('INC-B17');
  });
});
