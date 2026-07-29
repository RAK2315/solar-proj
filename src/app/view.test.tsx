/**
 * Which view is on screen, and why.
 *
 * The reported bug: clicking DISPATCH DRONE in live mode flew a real mission on
 * the map, and the 3D scene never appeared — the cinematic was gated on the demo
 * clock, which live mode does not advance. This is the regression test for that,
 * written at the level the user experiences it: dispatch, and the drone's view
 * takes the screen.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConsoleRoot } from '@/components/console/ConsoleRoot';
import { useDemoClock } from '@/store/demoClock';
import { useActiveView } from '@/store/flightCue';
import { MISSION, MISSION_TOTAL, useSession } from '@/store/session';

/** The view, evaluated the way Page evaluates it. */
function view(): 'console' | 'cinematic' {
  let out: 'console' | 'cinematic' = 'console';
  function Probe() { out = useActiveView(); return null; }
  render(<Probe />);
  cleanup();
  return out;
}

beforeEach(() => {
  useSession.setState({
    mode: 'live', module: 'site', siteSeconds: 0, running: true,
    selectedPanelId: null, missions: [], workOrders: [],
  });
  useDemoClock.setState({
    t: 0, playing: false, speed: 1, approved: false, viewOverride: null, debug: false,
  });
});
afterEach(cleanup);

describe('dispatching a drone shows the flight', () => {
  it('sits on the console with nothing in the air', () => {
    expect(view()).toBe('console');
  });

  it('CUTS TO THE CINEMATIC when the operator dispatches', () => {
    useSession.setState({ siteSeconds: 100, selectedPanelId: 'C-31' });
    render(<ConsoleRoot />);
    fireEvent.click(screen.getByText(/DISPATCH DRONE → C-31/));
    cleanup();

    expect(useSession.getState().missions).toHaveLength(1);
    expect(view()).toBe('cinematic');
  });

  it('stays there for the whole mission', () => {
    useSession.getState().dispatch('C-31');
    for (const s of [1, MISSION.outbound, MISSION.outbound + MISSION.inspecting]) {
      useSession.setState({ siteSeconds: s });
      expect(view()).toBe('cinematic');
    }
  });

  it('hands the console back when the drone lands', () => {
    useSession.getState().dispatch('C-31');
    useSession.setState({ siteSeconds: MISSION_TOTAL + 1 });
    expect(view()).toBe('console');
  });
});

describe('the operator can leave, and come back', () => {
  it('returns to the console on request, without ending the flight', () => {
    useSession.getState().dispatch('C-31');
    useSession.setState({ siteSeconds: 60 });
    expect(view()).toBe('cinematic');

    useDemoClock.getState().forceView('console');
    expect(view()).toBe('console');

    // The mission is state, not a video — it is still flying.
    useSession.setState({ siteSeconds: MISSION.outbound });
    expect(useSession.getState().missions).toHaveLength(1);
  });

  it('does not suppress the NEXT mission because of that choice', () => {
    useSession.getState().dispatch('C-31');
    useDemoClock.getState().forceView('console');
    useSession.setState({ siteSeconds: MISSION_TOTAL + 1 });

    useSession.getState().dispatch('A-08');
    expect(view()).toBe('cinematic');
  });
});

describe('the scripted run is unaffected', () => {
  it('cuts at t=18 and back at t=74, as it always did', () => {
    useSession.setState({ mode: 'demo' });

    useDemoClock.setState({ t: 10 });
    expect(view()).toBe('console');
    useDemoClock.setState({ t: 30 });
    expect(view()).toBe('cinematic');
    useDemoClock.setState({ t: 80 });
    expect(view()).toBe('console');
  });

  it('ignores a live mission left over from before the demo started', () => {
    useSession.getState().dispatch('C-31');
    useSession.setState({ mode: 'demo', siteSeconds: 60 });
    useDemoClock.setState({ t: 5 });
    expect(view()).toBe('console');
  });
});
