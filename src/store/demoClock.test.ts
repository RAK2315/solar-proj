/**
 * The clock is the one piece of mutable state the whole demo hangs off, so its
 * semantics get pinned here rather than re-verified by hand each phase.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  CINEMATIC_IN, CINEMATIC_OUT, DEMO_DURATION, useDemoClock, viewAt,
} from './demoClock';

const s = () => useDemoClock.getState();

beforeEach(() => {
  useDemoClock.setState({
    t: 0, playing: false, speed: 1, approved: false, viewOverride: null, debug: true,
  });
});

describe('viewAt — the view is a pure function of t', () => {
  it.each([
    [0, 'console'],
    [CINEMATIC_IN - 0.01, 'console'],
    [CINEMATIC_IN, 'cinematic'],
    [CINEMATIC_OUT - 0.01, 'cinematic'],
    [CINEMATIC_OUT, 'console'],
    [DEMO_DURATION, 'console'],
  ] as const)('t=%s is %s', (t, view) => {
    expect(viewAt(t)).toBe(view);
  });

  it('has no state of its own — same t always gives the same answer', () => {
    s().play();
    s()._tick(30);
    expect(viewAt(40)).toBe(viewAt(40));
  });
});

describe('transport', () => {
  it('advances t by wall-clock delta when playing', () => {
    s().play();
    s()._tick(1);
    expect(s().t).toBeCloseTo(1, 10);
  });

  it('scales by speed', () => {
    s().play();
    s().setSpeed(2);
    s()._tick(1);
    expect(s().t).toBeCloseTo(2, 10);
  });

  it('does nothing while paused', () => {
    s().seek(30);
    s()._tick(5);
    expect(s().t).toBe(30);
  });

  it('stops exactly at the end and pauses itself', () => {
    s().seek(DEMO_DURATION - 0.1);
    s().play();
    s()._tick(1);
    expect(s().t).toBe(DEMO_DURATION);
    expect(s().playing).toBe(false);
  });
});

describe('seek', () => {
  it('clamps to both ends', () => {
    s().seek(-100);
    expect(s().t).toBe(0);
    s().seek(9999);
    expect(s().t).toBe(DEMO_DURATION);
  });

  it('steps relatively', () => {
    s().seek(40);
    s().seekBy(-5);
    expect(s().t).toBe(35);
    s().seekBy(5);
    expect(s().t).toBe(40);
  });
});

describe('view override — the C and V rehearsal keys', () => {
  it('forces a view against what t implies', () => {
    s().seek(50);
    expect(viewAt(s().t)).toBe('cinematic');
    s().forceView('console');
    expect(s().viewOverride).toBe('console');
  });

  it('hands the view back to t when the same key is pressed again', () => {
    s().forceView('console');
    s().forceView('console');
    expect(s().viewOverride).toBeNull();
  });
});

describe('reset', () => {
  it('clears t, playing, approved and the override', () => {
    s().seek(70);
    s().play();
    s().approve();
    s().forceView('cinematic');
    s().reset();
    expect(s()).toMatchObject({
      t: 0, playing: false, approved: false, viewOverride: null,
    });
  });

  it('keeps the debug readout setting — a property of the session, not the run', () => {
    s().toggleDebug();
    const before = s().debug;
    s().reset();
    expect(s().debug).toBe(before);
  });
});

describe('approved', () => {
  it('is the only mutable state outside the clock, and is one-way', () => {
    expect(s().approved).toBe(false);
    s().approve();
    expect(s().approved).toBe(true);
    s().approve();
    expect(s().approved).toBe(true);
  });
});
