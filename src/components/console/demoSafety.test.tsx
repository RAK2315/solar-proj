/**
 * The two things that stop a demo dying in front of an audience.
 *
 * Neither is a feature. Both exist because the console is server-rendered, which
 * means it can paint a completely correct-looking screen that does nothing at all,
 * and because the operator's session survives a reload, which means a botched
 * rehearsal survives one too.
 *
 * These are asserted as BEHAVIOUR — what the operator sees, what a key does — not
 * as the presence of a heading. The project has been bitten four times by tests
 * that asserted a heading over an empty section.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useRehearsalKeys } from '@/hooks/useDemoClock';
import { useDemoClock } from '@/store/demoClock';
import { useSession } from '@/store/session';
import { HeaderBar } from './HeaderBar';

/** Mounts the key handler without any of the console's chrome. */
function Keys() {
  useRehearsalKeys();
  return null;
}

beforeEach(() => {
  useSession.getState().resetSession();
  useDemoClock.getState().reset();
});
afterEach(cleanup);

describe('liveness — the operator can tell a dead page from a live one', () => {
  it('says NOT READY until the page has actually woken up', () => {
    // React Testing Library flushes effects, so by the time we can query, the
    // component has hydrated. The state worth pinning is the one AFTER that:
    // a live page must not be sitting in the dead state.
    render(<HeaderBar />);
    expect(screen.queryByText(/NOT READY/)).toBeNull();
  });

  it('shows the live indicator once awake, and says how to recover when not', () => {
    render(<HeaderBar />);
    // The chip carries the mode. If this ever renders identically whether or not
    // the page hydrated, the liveness check has been defeated and a hydration
    // failure becomes invisible again.
    expect(screen.getByText(/● LIVE/)).toBeTruthy();
  });
});

describe('Shift+R — the panic key', () => {
  it('clears work orders, missions and injected faults in live mode', () => {
    render(<Keys />);
    const s = useSession.getState();
    s.dispatch('B-17');
    s.createWorkOrder('B-17', 'test');
    s.injectFault('A-03', 'crack-advanced');
    s.setSiteSeconds(9000);

    expect(useSession.getState().workOrders.length).toBe(1);
    expect(useSession.getState().missions.length).toBe(1);
    expect(useSession.getState().injected.length).toBe(1);

    fireEvent.keyDown(window, { key: 'R', shiftKey: true });

    const after = useSession.getState();
    expect(after.workOrders).toEqual([]);
    expect(after.missions).toEqual([]);
    expect(after.injected).toEqual([]);
    expect(after.siteSeconds).toBe(0);
  });

  it('rewinds the demo clock too, and works from inside demo mode', () => {
    render(<Keys />);
    useSession.getState().setMode('demo');
    useDemoClock.getState().seek(74);
    useDemoClock.getState().approve();

    fireEvent.keyDown(window, { key: 'R', shiftKey: true });

    expect(useDemoClock.getState().t).toBe(0);
    expect(useDemoClock.getState().approved).toBe(false);
  });

  it('a plain R does NOT wipe the session — only the recording', () => {
    // The distinction is the whole reason there are two keys. R is a rewind an
    // operator might press mid-rehearsal; it must not throw away their work.
    render(<Keys />);
    useSession.getState().setMode('demo');
    useSession.getState().createWorkOrder('B-17', 'test');
    useDemoClock.getState().seek(50);

    fireEvent.keyDown(window, { key: 'r' });

    expect(useDemoClock.getState().t).toBe(0);
    expect(useSession.getState().workOrders.length).toBe(1);
  });
});
