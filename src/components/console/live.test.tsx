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

import { cellGrid } from '@/lib/data';
import { liveFrameAt } from '@/lib/live';
import { M } from '@/lib/scene';
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

/**
 * The captured frames and the cell grid live in the dossier now, which in live
 * mode the operator opens — so a test about what the evidence SAYS has to open it
 * first, exactly as an operator would. Tests about what the rail OFFERS do not.
 */
function withDossier(siteSeconds: number, panelId: string): string {
  useSession.setState({ siteSeconds, selectedPanelId: panelId, dossierOpen: true });
  return textNow();
}

beforeEach(() => {
  useSession.setState({
    mode: 'live', module: 'site', siteSeconds: 0, running: true,
    selectedPanelId: null, missions: [], workOrders: [],
    overrides: [], injected: [], feedFilter: 'all', dossierOpen: false,
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

/**
 * B1. The matrix heading rendered in live mode and the grid beneath it was blank,
 * because `useMatrixFillCount` read the demo clock — which live mode never
 * advances. Every test here asserted the HEADING, so the suite stayed green while
 * the signature element of the console showed nothing at all. These assert the
 * measured ΔT values instead, which is the thing an operator actually looks at.
 */
describe('the anomaly matrix reads the live inspection, not the demo clock', () => {
  const TOTAL_CELLS = cellGrid.rows * cellGrid.cols;
  /** Site seconds into a mission at a given point on the scene's timeline. */
  const elapsedAt = (sceneT: number) => (sceneT - M.dispatch) * 60;
  /** Site seconds at which exactly `cells` have filled — mid-cell, so no rounding. */
  const elapsedAtFill = (cells: number) =>
    elapsedAt(M.thermal + ((cells + 0.5) / TOTAL_CELLS) * (M.thermalDone - M.thermal));

  it('fills cell by cell as the drone scans, rather than all at once', () => {
    useSession.getState().dispatch('B-17');

    // Ten cells in: the first hot cell of the row-2 band has been read, the
    // second has not. A grid that appeared whole would show both.
    const text = withDossier(elapsedAtFill(10), 'B-17');
    expect(text).toContain('R2 · C3');
    expect(text).not.toContain('R2 · C4');
  });

  it('shows the whole measured band once the scan completes', () => {
    useSession.getState().dispatch('B-17');
    const text = withDossier(MISSION.outbound + MISSION.inspecting + 1, 'B-17');
    for (const col of [3, 4, 5, 6]) expect(text).toContain(`R2 · C${col}`);
  });

  it('holds the grid after the drone has flown home', () => {
    useSession.getState().dispatch('B-17');
    expect(withDossier(MISSION_TOTAL + 600, 'B-17')).toContain('R2 · C3');
  });

  it('stays empty for an array no drone has inspected', () => {
    expect(withDossier(FAULT_AT + 600, 'B-17')).not.toContain('R2 · C3');
  });

  it('renders the ΔT list exactly once', () => {
    useSession.getState().dispatch('B-17');
    const text = withDossier(MISSION.outbound + MISSION.inspecting + 1, 'B-17');
    expect(text.match(/R2 · C3/g)).toHaveLength(1);
  });

  it('is not on screen until the operator opens it', () => {
    useSession.getState().dispatch('B-17');
    const text = at(MISSION.outbound + MISSION.inspecting + 1, 'B-17');
    expect(text).toContain('Open inspection dossier');
    expect(text).not.toContain('R2 · C3');
  });

  /**
   * `useEvidence` had the same defect and nobody had noticed: an operator could fly
   * a mission to B-17, be shown a cell grid, and never see the thermal frame it was
   * measured from — the imagery the drone was sent for in the first place.
   */
  it('brings back the captured frames, not just the numbers derived from them', () => {
    useSession.getState().dispatch('B-17');
    const text = withDossier(MISSION.outbound + MISSION.inspecting + 1, 'B-17');
    expect(text).toContain('THERMAL');
    expect(text).toContain('RGB');
  });

  it('shows the RGB pass before the thermal pass, as the drone flies them', () => {
    useSession.getState().dispatch('B-17');
    const text = withDossier(elapsedAt(M.rgb) + 1, 'B-17');
    expect(text).toContain('RGB');
    expect(text).not.toContain('R2 · C3');
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
    // The evidence moved into the dossier; the rail offers it and arms the gate.
    expect(text).toContain('Open inspection dossier');
    expect(text).toContain('APPROVE — CREATE WORK ORDER');
    expect(withDossier(done, 'B-17')).toContain('Anomaly matrix');
  });
});

/**
 * We hold real captured imagery for exactly one array: a Raptor Maps thermal frame
 * and a detector output on a specific held-out image, both of B-17. Rendering
 * either under another array's name would be presenting one array's evidence as
 * another's — the same failure as quoting B-17's agent prose for every array.
 */
describe('evidence belongs to the array it was captured from', () => {
  const DONE = MISSION.outbound + MISSION.inspecting + 1;

  it('shows the cell grid for the array it was measured on', () => {
    useSession.getState().dispatch('B-17');
    const text = withDossier(DONE, 'B-17');
    expect(text).toContain('Anomaly matrix');
    expect(text).toContain('Cell defects');
    expect(text).not.toContain('No cell-level capture on file');
  });

  it('refuses to show it for an array we have no capture of', () => {
    useSession.getState().dispatch('A-03');
    const text = at(DONE, 'A-03');
    expect(text).toContain('No cell-level capture on file for A-03');
    expect(text).not.toContain('Cell defects');
  });

  it('does not claim evidence was captured when none was', () => {
    // The inspection line read "✓ Inspected — evidence captured" for every array,
    // four lines above a paragraph saying no capture exists. Two flatly
    // contradictory statements in the same section.
    useSession.getState().dispatch('A-03');
    // After the drone has LANDED — while it is still returning the panel shows
    // mission progress instead.
    const text = at(MISSION_TOTAL + 60, 'A-03');
    expect(text).not.toContain('evidence captured');
    expect(text).toContain('A-03 inspected');
    expect(text).toContain('No committed imagery for A-03');
  });

  it('still reports telemetry and reasoning for that array — only imagery is missing', () => {
    useSession.getState().dispatch('A-03');
    const text = at(DONE, 'A-03');
    expect(text).toContain('A-03');
    expect(text).toContain('Irradiance');
  });

  it('shows no thumbnail strip for an uncaptured array', () => {
    useSession.getState().dispatch('C-12');
    const text = at(DONE, 'C-12');
    expect(text).not.toContain('THERMAL');
  });

  /**
   * The cached agent run is prose ABOUT B-17: it names INV-B, string B-17-S3 and
   * module B2-07, and its deadline comes from that cracked cell's thermal dose.
   * Inspecting A-08 was printing all of it under A-08's heading — recommending a
   * technician remove a module from a different array.
   */
  it('does not recommend work on B-17 while describing another array', () => {
    useSession.getState().dispatch('A-08');
    const text = at(DONE, 'A-08');

    expect(text).toContain('A-08');
    expect(text).not.toContain('B2-07');
    expect(text).not.toContain('B-17-S3');
    expect(text).not.toContain('INV-B output');
  });

  it('does not hang B-17’s deadline on another array’s forecast', () => {
    useSession.getState().dispatch('A-08');
    const text = at(DONE, 'A-08');
    expect(text).not.toContain('ACT BEFORE');
    // The weather itself is the site's, so the outlook still renders.
    expect(text).toContain('72H CLEAR');
  });

  it('still shows both for the array they were computed for', () => {
    useSession.getState().dispatch('B-17');
    const text = at(DONE, 'B-17');
    expect(text).toContain('B2-07');
    expect(text).toContain('ACT BEFORE');
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
