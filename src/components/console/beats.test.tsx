/**
 * THE PHASE 5 ACCEPTANCE TEST.
 *
 * Play the clock from 0 to 90 the way the rAF driver does — repeated `_tick` calls
 * rather than seeks — and assert that each beat in CLAUDE.md §2 first appears at
 * the right second, and not before.
 *
 * "and not before" is the half that matters. A section that renders early is not a
 * timing bug you notice while watching; it is a section that was never gated on the
 * clock at all, and it would silently break the seek-backwards guarantee too.
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEMO_DURATION, useDemoClock, viewAt } from '@/store/demoClock';
import { useSession } from '@/store/session';
import { BEAT } from '@/store/selectors';
import { ConsoleRoot } from './ConsoleRoot';

const TICK = 0.25;   // seconds per step; 360 steps across the run

function textNow(): string {
  const { container } = render(<ConsoleRoot />);
  const text = (container.textContent ?? '').replace(/\s+/g, ' ');
  cleanup();
  return text;
}

/**
 * Advance from 0 to 90 in fixed steps, returning the first `t` at which each
 * probe's text appeared. Ticking rather than seeking is the point: it is the only
 * way to catch something that depends on having been rendered at every step.
 */
function firstAppearance(probes: Record<string, string | RegExp>): Record<string, number | null> {
  const found: Record<string, number | null> = {};
  for (const key of Object.keys(probes)) found[key] = null;

  // This runs while the describe body is evaluated, which is BEFORE beforeEach.
  // Live is the default mode now, so say which world we are playing.
  useSession.setState({ mode: 'demo' });
  useDemoClock.setState({ t: 0, playing: true, speed: 1, approved: false, viewOverride: null });

  for (let step = 0; step * TICK <= DEMO_DURATION; step += 1) {
    const t = useDemoClock.getState().t;
    const text = textNow();
    for (const [key, probe] of Object.entries(probes)) {
      if (found[key] !== null) continue;
      const hit = typeof probe === 'string' ? text.includes(probe) : probe.test(text);
      if (hit) found[key] = t;
    }
    useDemoClock.getState()._tick(TICK);
  }
  return found;
}

beforeEach(() => {
  // These describe DEMO mode — the scripted 90 seconds. Live mode is the
  // default now, so the tests state which world they are asserting about.
  useSession.setState({ mode: 'demo' });
  useDemoClock.setState({
    t: 0, playing: false, speed: 1, approved: false, viewOverride: null, debug: false,
  });
});
afterEach(cleanup);

describe('playing 0 → 90, every beat fires at its second', () => {
  const appeared = firstAppearance({
    detail: 'MODULE B2-07',
    stringDeviation: '−58.4 %',
    evidence: 'Anomaly matrix',
    cellDefects: 'R2 · C3',
    outlook: '72H CLEAR',
    deadline: 'ACT BEFORE 14:00',
    gate: 'APPROVE · CREATE WORK ORDER',
    b17Queued: 'INC-B17',
  });

  // A beat is "on time" if it lands in [beat, beat + 1s). The tick is 0.25s, so a
  // section gated on the right constant cannot drift more than one step.
  const onTime = (label: string, beat: number) => {
    it(`${label} appears at t=${beat}`, () => {
      const at = appeared[label];
      expect(at, `${label} never appeared`).not.toBeNull();
      expect(at!).toBeGreaterThanOrEqual(beat);
      expect(at!).toBeLessThan(beat + 1);
    });
  };

  onTime('detail', BEAT.triage);
  onTime('stringDeviation', BEAT.triage);
  onTime('evidence', BEAT.thermalScan);
  onTime('outlook', BEAT.prognosis);
  onTime('deadline', BEAT.prognosis);
  onTime('gate', BEAT.recommendation);
  onTime('b17Queued', BEAT.recommendation);

  it('the matrix starts filling only after the thermal scan begins', () => {
    // First defect sits at R2 C3, which is cell index 9 of 35 — so it appears a
    // little after the beat rather than on it. That lag IS the sequential fill.
    const at = appeared.cellDefects;
    expect(at).not.toBeNull();
    expect(at!).toBeGreaterThan(BEAT.thermalScan);
    expect(at!).toBeLessThan(BEAT.thermalDone);
  });
});

describe('the view cuts at the right seconds', () => {
  it('is console before 18, cinematic through 74, console after', () => {
    useDemoClock.setState({ t: 0, playing: true, speed: 1 });
    const cuts: Array<[number, string]> = [];
    let previous = viewAt(0);

    for (let step = 0; step * TICK <= DEMO_DURATION; step += 1) {
      const t = useDemoClock.getState().t;
      const view = viewAt(t);
      if (view !== previous) {
        cuts.push([t, view]);
        previous = view;
      }
      useDemoClock.getState()._tick(TICK);
    }

    expect(cuts).toHaveLength(2);
    expect(cuts[0][1]).toBe('cinematic');
    expect(cuts[0][0]).toBeGreaterThanOrEqual(BEAT.dispatch);
    expect(cuts[0][0]).toBeLessThan(BEAT.dispatch + 1);
    expect(cuts[1][1]).toBe('console');
    expect(cuts[1][0]).toBeGreaterThanOrEqual(BEAT.recommendation);
    expect(cuts[1][0]).toBeLessThan(BEAT.recommendation + 1);
  });
});

describe('nothing accumulates across a full playthrough', () => {
  it('ends at t=90 having stopped itself', () => {
    useDemoClock.setState({ t: 0, playing: true, speed: 1 });
    for (let step = 0; step * TICK <= DEMO_DURATION + 2; step += 1) {
      useDemoClock.getState()._tick(TICK);
    }
    expect(useDemoClock.getState().t).toBe(DEMO_DURATION);
    expect(useDemoClock.getState().playing).toBe(false);
  });

  it('renders t=40 identically after a full play as it does from cold', () => {
    useDemoClock.setState({ t: 40, playing: false, approved: false });
    const cold = textNow();

    useDemoClock.setState({ t: 0, playing: true });
    for (let step = 0; step * TICK <= DEMO_DURATION; step += 1) {
      useDemoClock.getState()._tick(TICK);
    }
    useDemoClock.setState({ t: 40, playing: false });
    const afterPlaying = textNow();

    expect(afterPlaying).toBe(cold);
  });
});
