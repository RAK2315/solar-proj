/**
 * LIVE MODE — the product, as opposed to the recording.
 *
 * The demo tests assert that a script plays correctly. These assert something
 * different and harder: that an operator can pick any array, send a drone to it,
 * and raise a work order — and that the console tells the truth at every step,
 * including refusing to claim things that have not happened yet.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { liveFrameAt } from '@/lib/live';
import { useDemoClock } from '@/store/demoClock';
import { MISSION, MISSION_TOTAL, useSession } from '@/store/session';
import { ConsoleRoot } from './ConsoleRoot';

const FAULT_AT = 4 * 60;          // 10:04 site time, from data/scenario.json

function textNow(): string {
  const { container } = render(<ConsoleRoot />);
  const text = (container.textContent ?? '').replace(/\s+/g, ' ');
  cleanup();
  return text;
}

function at(siteSeconds: number, panelId: string | null = null): string {
  useSession.setState({ siteSeconds, selectedPanelId: panelId });
  return textNow();
}

beforeEach(() => {
  useSession.setState({
    mode: 'live', siteSeconds: 0, running: true, selectedPanelId: null,
    missions: [], workOrders: [],
  });
  useDemoClock.setState({ t: 0, playing: false, approved: false, debug: false });
});
afterEach(cleanup);

describe('the site runs on physics, not on a script', () => {
  it('starts nominal, with the scenario fault not yet begun', () => {
    const text = at(0);
    expect(text).toContain('● LIVE');
    expect(text).toMatch(/Anomalies\s*2/);        // the two soiled arrays
    expect(text).toMatch(/Critical 0/i);
  });

  it('develops the fault over site time, without anyone touching anything', () => {
    const before = liveFrameAt(FAULT_AT - 1).panels['B-17'];
    const during = liveFrameAt(FAULT_AT + 90).panels['B-17'];
    const after = liveFrameAt(FAULT_AT + 300).panels['B-17'];

    expect(before.status).toBe('healthy');
    expect(during.deviationPct).toBeLessThan(before.deviationPct);
    expect(after.status).toBe('critical');
    expect(after.deviationPct).toBeCloseTo(-41.71, 1);   // the frozen figure
  });

  it('is reproducible — the same site time gives the same site', () => {
    const a = liveFrameAt(FAULT_AT + 120);
    const b = liveFrameAt(FAULT_AT + 120);
    expect(a.panels['B-17']).toEqual(b.panels['B-17']);
    expect(a.farmHealth).toBe(b.farmHealth);
  });

  it('tracks the sun — output falls to nothing after dark', () => {
    const noon = liveFrameAt(2 * 3600);
    const midnight = liveFrameAt(14 * 3600);
    expect(noon.irradiance).toBeGreaterThan(900);
    expect(midnight.irradiance).toBe(0);
    expect(midnight.farmOutputMW).toBeCloseTo(0, 0);
  });
});

describe('the operator can inspect ANY array, not just the scripted one', () => {
  it('says nothing is selected until something is', () => {
    expect(at(0)).toContain('NO ARRAY SELECTED');
  });

  it('opens the detail panel on whichever array is chosen', () => {
    expect(at(0, 'A-03')).toContain('PANEL A-03');
    cleanup();
    expect(at(0, 'C-27')).toContain('PANEL C-27');
  });

  it('shows that array’s own physics, not B-17’s', () => {
    const soiled = at(0, 'A-08');          // heavily soiled
    cleanup();
    const clean = at(0, 'A-09');           // nominal

    // The soiled one is deviating; the clean one is not.
    expect(soiled).toMatch(/−1[01]\.\d %/);
    expect(clean).toMatch(/−0\.0 %|0\.0 %/);
  });

  it('offers to dispatch, and explains why telemetry is not enough', () => {
    const text = at(0, 'A-03');
    expect(text).toContain('DISPATCH DRONE → A-03');
    expect(text).toContain('only imaging can');
  });
});

describe('dispatch is an operator decision with real consequences', () => {
  it('launches a drone to the selected array when clicked', () => {
    useSession.setState({ siteSeconds: 100, selectedPanelId: 'A-03' });
    render(<ConsoleRoot />);
    fireEvent.click(screen.getByText(/DISPATCH DRONE → A-03/));

    const { missions } = useSession.getState();
    expect(missions).toHaveLength(1);
    expect(missions[0].panelId).toBe('A-03');
    expect(missions[0].startedAt).toBe(100);
  });

  it('will not send two drones to the same array', () => {
    const { dispatch } = useSession.getState();
    dispatch('A-03');
    dispatch('A-03');
    expect(useSession.getState().missions).toHaveLength(1);
  });

  it('runs out of drones after two, and says so', () => {
    const { dispatch } = useSession.getState();
    dispatch('A-03');
    dispatch('B-05');
    dispatch('C-09');
    expect(useSession.getState().missions).toHaveLength(2);

    useSession.setState({ selectedPanelId: 'C-09' });
    expect(textNow()).toContain('BOTH DRONES COMMITTED');
  });

  it('flies a mission that takes site time and reports its phase', () => {
    useSession.getState().dispatch('A-03');
    useSession.setState({ selectedPanelId: 'A-03' });

    expect(at(60, 'A-03')).toContain('OUTBOUND');
    cleanup();
    expect(at(MISSION.outbound + 60, 'A-03')).toContain('INSPECTING');
    cleanup();
    expect(at(MISSION.outbound + MISSION.inspecting + 60, 'A-03')).toContain('RETURNING');
  });
});

describe('the console refuses to claim what has not happened', () => {
  it('withholds cell-level findings until a drone has actually looked', () => {
    const beforeDispatch = at(0, 'B-17');
    expect(beforeDispatch).not.toContain('Anomaly matrix');
    expect(beforeDispatch).not.toContain('Cell defects');
  });

  it('withholds the approval gate until there is evidence to approve', () => {
    expect(at(0, 'B-17')).not.toContain('APPROVE — CREATE WORK ORDER');
  });

  it('reveals findings and arms the gate once the inspection completes', () => {
    useSession.getState().dispatch('B-17');
    const done = MISSION.outbound + MISSION.inspecting + 1;
    const text = at(done, 'B-17');
    expect(text).toContain('Anomaly matrix');
    expect(text).toContain('APPROVE — CREATE WORK ORDER');
  });
});

describe('the human gate still gates', () => {
  it('creates no work order without a click', () => {
    useSession.getState().dispatch('A-03');
    const text = at(MISSION_TOTAL, 'A-03');
    expect(text).not.toContain('WORK ORDER #INC-A03 CREATED');
    expect(useSession.getState().workOrders).toHaveLength(0);
  });

  it('creates one for the SELECTED array when the operator clicks', () => {
    useSession.getState().dispatch('A-03');
    useSession.setState({ siteSeconds: MISSION_TOTAL, selectedPanelId: 'A-03' });
    render(<ConsoleRoot />);
    fireEvent.click(screen.getByText(/APPROVE — CREATE WORK ORDER/));

    const { workOrders } = useSession.getState();
    expect(workOrders).toHaveLength(1);
    expect(workOrders[0].panelId).toBe('A-03');
    expect(workOrders[0].id).toBe('INC-A03');
  });

  it('turns the array to scheduled once the order exists', () => {
    useSession.setState({
      siteSeconds: FAULT_AT + 600,
      workOrders: [{ id: 'INC-B17', panelId: 'B-17', createdAt: 0, note: 'x' }],
    });
    const frame = liveFrameAt(FAULT_AT + 600, new Set(['B-17']));
    expect(frame.panels['B-17'].status).toBe('scheduled');
  });
});

describe('the feed reports what happened, not a script', () => {
  it('logs the operator’s own dispatch', () => {
    useSession.getState().dispatch('C-12');
    expect(at(120, 'C-12')).toContain('dispatched DRONE 01 to C-12');
  });

  it('logs the fault only once it has actually deviated', () => {
    expect(at(0)).not.toContain('below expected');
    cleanup();
    expect(at(FAULT_AT + 120)).toContain('B-17 is');
    cleanup();
    expect(at(FAULT_AT + 120)).toContain('below expected');
  });
});
