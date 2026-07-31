/**
 * Fault injection.
 *
 * The point of these tests is not that a button works. It is that injection
 * cannot become a back door for typing numbers onto the site: an injected fault
 * writes a scenario event, and everything visible afterwards is computed from it
 * by the same physics that evaluates the committed ones. If that ever stops
 * being true, the project's central claim — every number on screen comes from
 * the model — stops being true with it.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { eventFor, liveFrameAt, referenceShortfallKW } from '@/lib/live';
import { evaluateArray, G_REF, STRINGS_PER_ARRAY, T_AMB_REF } from '@/lib/physics';
import { liveQueueAt } from '@/lib/queue';
import { INJECTABLE, useSession } from '@/store/session';

const blank = () => useSession.setState({
  mode: 'live', module: 'site', siteSeconds: 0, running: false,
  selectedPanelId: null, missions: [], workOrders: [],
  overrides: [], injected: [], feedFilter: 'all',
});

beforeEach(blank);

describe('an injected fault is a scenario event, not a reading', () => {
  it('writes only the fault’s definition — no output, no deviation, no status', () => {
    useSession.getState().injectFault('C-12', 'crack-advanced');
    const [e] = useSession.getState().injected;

    expect(Object.keys(e).sort()).toEqual([
      'accessCost', 'faultedStrings', 'id', 'injected', 'mechanism',
      'panelId', 'rampMinutes', 'startHour', 'terminalMismatch', 'type',
    ]);
  });

  it('produces a deviation the physics computes, matching the spec exactly', () => {
    useSession.getState().injectFault('C-12', 'crack-advanced');
    const { injected } = useSession.getState();
    const spec = INJECTABLE['crack-advanced'];

    // Fully developed: the ramp is in site MINUTES, so an hour is plenty.
    const frame = liveFrameAt(3600, new Set(), injected);
    const r = frame.panels['C-12'];

    const expectedDev = ((spec.terminalMismatch - 1) * 100 * spec.faultedStrings)
      / STRINGS_PER_ARRAY;
    expect(r.deviationPct).toBeCloseTo(expectedDev, 6);
    expect(r.stringDeviationPct).toBeCloseTo((spec.terminalMismatch - 1) * 100, 6);
    expect(r.status).toBe('critical');
  });

  it('ramps rather than stepping, so the site animates into the fault', () => {
    useSession.getState().injectFault('C-12', 'crack-established');
    const { injected } = useSession.getState();
    const dev = (s: number) => liveFrameAt(s, new Set(), injected).panels['C-12'].deviationPct;

    expect(dev(0)).toBeCloseTo(0, 6);
    expect(dev(90)).toBeLessThan(0);
    expect(dev(90)).toBeGreaterThan(dev(180));
  });

  it('marks itself as injected everywhere it surfaces', () => {
    useSession.getState().injectFault('C-12', 'crack-established');
    const { injected } = useSession.getState();

    expect(eventFor('C-12', injected)!.injected).toBe(true);
    const { tasks } = liveQueueAt(
      liveFrameAt(3600, new Set(), injected), new Set(), injected,
    );
    expect(tasks.find((t) => t.panelId === 'C-12')!.injected).toBe(true);
  });
});

describe('the site’s own history is not overwritable from a form', () => {
  it('refuses an array the committed scenario already faults', () => {
    useSession.getState().injectFault('B-17', 'crack-early');
    expect(useSession.getState().injected).toHaveLength(0);
  });

  it('refuses a second injection on the same array', () => {
    useSession.getState().injectFault('C-12', 'crack-early');
    useSession.getState().injectFault('C-12', 'crack-advanced');
    expect(useSession.getState().injected).toHaveLength(1);
    expect(useSession.getState().injected[0].faultedStrings).toBe(2);
  });

  it('clears one array, or all of them', () => {
    useSession.getState().injectFault('C-12', 'crack-early');
    useSession.getState().injectFault('C-13', 'crack-early');
    useSession.getState().clearInjected('C-12');
    expect(useSession.getState().injected.map((e) => e.panelId)).toEqual(['C-13']);

    useSession.getState().clearInjected();
    expect(useSession.getState().injected).toHaveLength(0);
  });

  it('leaves every other array untouched', () => {
    useSession.getState().injectFault('C-12', 'crack-advanced');
    const { injected } = useSession.getState();
    const before = liveFrameAt(3600);
    const after = liveFrameAt(3600, new Set(), injected);

    for (const id of Object.keys(before.panels)) {
      if (id === 'C-12') continue;
      expect(after.panels[id]).toEqual(before.panels[id]);
    }
  });
});

describe('every injectable mechanism is physically coherent', () => {
  it('lands each one where its own arithmetic says it should', () => {
    for (const [id, spec] of Object.entries(INJECTABLE)) {
      const r = evaluateArray(G_REF, T_AMB_REF, {
        faultProgress: 1,
        faultedStrings: spec.faultedStrings,
        terminalMismatch: spec.terminalMismatch,
      });
      const want = ((spec.terminalMismatch - 1) * 100 * spec.faultedStrings)
        / STRINGS_PER_ARRAY;
      expect(r.deviationPct, id).toBeCloseTo(want, 6);
      expect(r.actualKW, id).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives the open-circuit string a total loss on that string', () => {
    const r = evaluateArray(G_REF, T_AMB_REF, {
      faultProgress: 1, ...INJECTABLE['string-outage'],
    });
    expect(r.stringDeviationPct).toBeCloseTo(-100, 6);
  });
});

describe('a fault costs the same at midnight as at noon', () => {
  it('quotes the shortfall at reference conditions, not at the current hour', () => {
    useSession.getState().injectFault('C-12', 'crack-established');
    const { injected } = useSession.getState();

    const noon = referenceShortfallKW('C-12', 3600, injected);
    const night = referenceShortfallKW('C-12', 10 * 3600, injected);

    expect(liveFrameAt(10 * 3600).irradiance).toBe(0);
    expect(noon).toBeGreaterThan(0);
    expect(night).toBeCloseTo(noon, 6);
  });
});
