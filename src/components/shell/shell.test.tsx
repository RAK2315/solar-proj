/**
 * The console, as an operator meets it.
 *
 * jsdom has no WebGL, so every test here runs against the 2D fallback. That is
 * deliberate and it is enough: the fallback and the twin read the same selectors,
 * and what these tests hold the console to is what it SAYS, which is the same in
 * both. What they assert, in order of how often it has gone wrong:
 *
 *   · evidence stays on the array it was measured on
 *   · the console refuses to claim what has not happened yet
 *   · nothing becomes a work order without a person
 *   · a hazard is a function of site time, so it rewinds
 */

import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useConsoleKeys } from '@/hooks/useSiteClock';
import { cellGrid } from '@/lib/data';
import { highsSolver } from '@/lib/highsSolver';
import { REHEARSAL_SEED } from '@/lib/rehearsal';
import { M, arrayCentre } from '@/lib/scene';
import { useDetector } from '@/store/detector';
import { MISSION, useSession, type Mission, type SessionState } from '@/store/session';
import { useSolver } from '@/store/solver';
import { useTriage } from '@/store/triage';
import { Shell } from './Shell';

/** Twelve site minutes in: B-17's fault began at four and takes three to develop. */
const DEVELOPED = REHEARSAL_SEED.siteSeconds;
/** A drone has been on station and finished both passes. */
const INSPECTED_AFTER = MISSION.outbound + MISSION.inspecting + 1;
/** One scene second is one site minute. */
const sceneT = (t: number) => (t - M.dispatch) * 60;

const mission = (panelId: string, startedAt = DEVELOPED, n = 1): Mission => ({
  id: `MSN-00${n}`, droneId: `DRONE 0${n}`, panelId, startedAt, phase: 'outbound',
});

const set = (state: Partial<SessionState>) => act(() => useSession.setState(state));
const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ');

function open(state: Partial<SessionState> = {}) {
  useSession.setState(state);
  const view = render(<Shell />);
  return { ...view, text: () => text(view.container) };
}

const button = (root: Element, label: string): HTMLButtonElement => {
  const found = [...root.querySelectorAll('button')].find(
    (b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim().startsWith(label),
  );
  if (!found) throw new Error(`no button "${label}"`);
  return found as HTMLButtonElement;
};
const maybeButton = (root: Element, label: string) => {
  try { return button(root, label); } catch { return null; }
};

beforeEach(() => {
  useSession.getState().resetSession();
  useSession.setState({ running: false, twinFallback: null, theme: 'dark', showWorkings: false });
  useDetector.getState().reset();
  useTriage.getState().clear();
  // The shell asks for the solver on mount. Here that would race every test with
  // a megabyte of WebAssembly, so loading is switched off and each test says
  // which state it wants.
  useSolver.setState({ status: 'failed', solver: null, reason: 'not loaded in tests', load: async () => {} });
  // The agent is a network call. Offline is a real state and the console has to
  // stay usable in it, so that is the state these tests run in.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('the 2D and 3D switch', () => {
  it('is the operator\u2019s to press, and remembers the choice through a reset', () => {
    // jsdom has no WebGL, so the shell is already on the fallback here and the
    // choice is made through the store the button writes to.
    const { container } = open({ siteSeconds: DEVELOPED });
    expect(useSession.getState().twinMode).toBe('3d');
    act(() => useSession.getState().setTwinMode('2d'));
    set({ twinFallback: null });
    expect(container.querySelectorAll('[data-panel-id]')).toHaveLength(120);
    expect(button(container, 'Show the field in 3D').disabled).toBe(false);
    act(() => useSession.getState().resetSession());
    expect(useSession.getState().twinMode).toBe('2d');
  });

  it('lets the operator overrule the frame-rate fallback, but not a browser with no WebGL', () => {
    const { container } = open({ siteSeconds: DEVELOPED });
    set({ twinFallback: 'fps' });
    fireEvent.click(button(container, 'Show the field in 3D'));
    expect(useSession.getState().twinFallback).toBeNull();

    set({ twinFallback: 'webgl' });
    expect(button(container, 'Show the field in 3D').disabled).toBe(true);
  });

  it('draws the map with a frame per zone and a legend', () => {
    const { container } = open({ siteSeconds: DEVELOPED });
    expect(container.querySelectorAll('.sy-map .zone')).toHaveLength(3);
    expect(container.querySelector('.sy-map .zone[data-sev="critical"]')).not.toBeNull();
    expect(text(container.querySelector('.sy-map .legend') as Element)).toContain('Under a hazard');
  });
});

describe('rupees', () => {
  const BASIS = '₹2.446/kWh';

  it('shows the blend and its arithmetic on the screen about money', () => {
    const { container } = open({ siteSeconds: DEVELOPED, module: 'analytics' });
    const tariff = text(container.querySelector('[data-b="tariff"]') as Element);
    expect(tariff).toContain('(200 MW × ₹2.44 + 300 MW × ₹2.45) ÷ 500 MW = ₹2.446/kWh');
    expect(tariff).toContain('ACME Solar Holdings 200 MW');
    expect(tariff).toContain('SBG Cleantech 300 MW');
    expect(tariff).toContain('checked 6 Oct 2026');
    expect(tariff).toContain('No deviation charge is computed');
  });

  it('draws the 72 h forecast with a band, and says the band is declared', () => {
    const { container } = open({ siteSeconds: DEVELOPED, module: 'analytics' });
    const curve = container.querySelector('[data-b="curve"]') as Element;
    expect(curve.querySelector('.chart .band')).not.toBeNull();
    expect(text(curve)).toContain('next 72 h');
    expect(text(curve)).toMatch(/Forecast band, ±5 % on irradiance now to ±15 % at 72 h\. Declared, not fitted/);
    expect(text(curve)).toMatch(/Forecast band ₹[\d,]+ to ₹[\d,]+/);
  });

  it('never shows a rupee figure without the tariff it rests on beside it', () => {
    const at = arrayCentre('B-12');
    const state = { siteSeconds: DEVELOPED, selectedPanelId: 'B-17' };
    const { container } = open(state);
    act(() => useSession.getState().dropHazard('dust', { x: at.x, z: at.z }));
    set({ siteSeconds: DEVELOPED + 1800 });
    for (const screen of ['site', 'incident', 'queue', 'analytics', 'drones', 'sandbox'] as const) {
      set({ module: screen });
      for (const block of container.querySelectorAll('.sy-stage [data-b]')) {
        if (text(block).includes('₹')) expect(text(block), `${screen}: ${block.getAttribute('data-b')}`).toContain(BASIS);
      }
    }
    // And the figures are really there: the array, the cost of waiting, the hazards.
    set({ module: 'site' });
    expect(text(container.querySelector('[data-b="facts"]') as Element)).toMatch(/Lost revenue, 72 h.*₹[\d,]+/);
    set({ module: 'incident' });
    expect(text(container.querySelector('[data-b="defer"]') as Element)).toMatch(/₹[\d,]+/);
    set({ module: 'sandbox' });
    expect(text(container.querySelector('[data-b="hazards"]') as Element)).toMatch(/these cost the modelled arrays .* MWh, ₹[\d,]+ of revenue/);
  });
});

describe('the queue screen', () => {
  it('shows every job with its cause and its arithmetic, without being asked', () => {
    const { container } = open({ siteSeconds: DEVELOPED, module: 'queue' });
    const first = container.querySelector('[data-b="queue"] .q li') as Element;
    expect(text(first)).toContain('B-17');
    expect(text(first)).toContain('Localised electrical fault');
    expect(text(first)).toMatch(/lost a day.*severity.*urgency.*access.*score/);
  });
});

describe('the shell', () => {
  it('offers six destinations and opens each one', () => {
    const { container } = open({ siteSeconds: DEVELOPED });
    const expected: Array<[string, string]> = [
      ['Incident', 'Evidence chain'], ['Queue', 'Day plan'], ['Analytics', 'Where the loss is going'],
      ['Drones', 'Drone status and comms'], ['Sandbox', 'Rehearsal faults'], ['Site', 'Repair queue'],
    ];
    for (const [tab, heading] of expected) {
      fireEvent.click(button(container.querySelector('.sy-rail') as Element, tab));
      expect(text(container.querySelector('.sy-stage') as Element)).toContain(heading);
    }
  });

  it('falls back to the 2D map without WebGL, and says so', () => {
    const { text: now, container } = open();
    expect(container.querySelectorAll('[data-panel-id]')).toHaveLength(120);
    expect(now()).toContain('cannot draw the 3D field');
  });

  it('keeps the working behind one switch, off by default', () => {
    const { container } = open({ siteSeconds: DEVELOPED });
    const root = container.querySelector('.sy') as Element;
    expect(root.classList.contains('hide-workings')).toBe(true);
    fireEvent.click(button(container, 'Show the working'));
    expect(root.classList.contains('hide-workings')).toBe(false);
  });
});

describe('the site runs on physics', () => {
  it('starts with the two soiled arrays and nothing critical', () => {
    const { container } = open();
    const kpis = text(container.querySelector('.kpis') as Element);
    expect(kpis).toMatch(/2\s*anomalies/);
    expect(container.querySelector('[data-panel-id="B-17"]')?.getAttribute('data-sev')).toBe('healthy');
  });

  it('develops the fault over site time and puts it first in the queue', () => {
    const { container } = open({ siteSeconds: DEVELOPED });
    expect(container.querySelector('[data-panel-id="B-17"]')?.getAttribute('data-sev')).toBe('critical');
    const first = container.querySelector('.q li') as Element;
    expect(text(first)).toContain('B-17');
    expect(first.getAttribute('data-sev')).toBe('critical');
  });

  it('rewinds: seeking back before the fault makes the array healthy again', () => {
    const { container } = open({ siteSeconds: DEVELOPED });
    set({ siteSeconds: 60 });
    expect(container.querySelector('[data-panel-id="B-17"]')?.getAttribute('data-sev')).toBe('healthy');
    expect(text(container.querySelector('.q') as Element)).not.toContain('B-17');
  });

  it('says it is night when there is nothing to measure', () => {
    const { text: now } = open({ siteSeconds: 13 * 3600, selectedPanelId: 'B-17' });
    expect(now()).toContain('Night');
    expect(now()).toContain('After sunset there is nothing to measure');
  });
});

describe('the operator can look at any array', () => {
  it('uses the incident array consistently when no field selection is held', () => {
    const { container } = open({ siteSeconds: DEVELOPED, module: 'incident', selectedPanelId: null });
    const facts = text(container.querySelector('[data-b="facts"]') as Element);
    expect(facts).toContain('B-17');
    expect(facts).not.toContain('No array selected');
  });

  it('keeps the current hypothesis separate from the recorded fault mechanism under a cloud', () => {
    const { container } = open({ siteSeconds: DEVELOPED, module: 'incident', selectedPanelId: 'B-17' });
    const at = arrayCentre('B-17');
    act(() => useSession.getState().dropHazard('cloud', { x: at.x, z: at.z }));
    set({ siteSeconds: DEVELOPED + 600 });
    const chain = container.querySelector('[data-b="chain"]') as Element;
    expect(text(chain)).not.toContain('Cracked cell driving its bypass diode');
    expect(text(chain)).toContain('Cloud bank');
  });

  it('recommends monitoring a cloud-only shortfall without creating repair work', () => {
    const { container } = open({ siteSeconds: DEVELOPED, module: 'incident', selectedPanelId: 'C-20' });
    const at = arrayCentre('C-20');
    act(() => useSession.getState().dropHazard('cloud', { x: at.x, z: at.z }));
    set({ siteSeconds: DEVELOPED + 600 });
    const overview = text(container.querySelector('.incident-overview') as Element);
    expect(overview).toContain('Temporary shading');
    expect(overview).toContain('Monitor the shaded arrays');
    expect(overview).not.toContain('Book the wash crew');
    expect(maybeButton(container, 'Approve work order')).toBeNull();
  });

  it('says nothing is selected until something is', () => {
    const { text: now, container } = open({ siteSeconds: DEVELOPED });
    expect(now()).toContain('No array selected');
    fireEvent.click(container.querySelector('[data-panel-id="C-31"]') as Element);
    expect(useSession.getState().selectedPanelId).toBe('C-31');
    expect(text(container.querySelector('[data-b="facts"]') as Element)).toContain('C-31');
  });

  it('shows that array’s own reading, not B-17’s', () => {
    const b17 = open({ siteSeconds: DEVELOPED, selectedPanelId: 'B-17' });
    const figureB = text(b17.container.querySelector('.big') as Element);
    cleanup();
    const a08 = open({ siteSeconds: DEVELOPED, selectedPanelId: 'A-08' });
    const figureA = text(a08.container.querySelector('.big') as Element);
    expect(figureA).not.toBe(figureB);
    expect(text(a08.container.querySelector('[data-b="facts"]') as Element)).toContain('Warning');
  });
});

describe('the console uses the verb it has earned', () => {
  it('flags B-17 from telemetry until a drone has been', () => {
    const { text: now } = open({ siteSeconds: DEVELOPED, selectedPanelId: 'B-17' });
    expect(now()).toContain('Flagged from telemetry, not yet inspected');
    expect(now()).not.toContain('Diagnosed');
  });

  it('diagnoses B-17 once it has been inspected', () => {
    const { text: now } = open({
      siteSeconds: DEVELOPED + INSPECTED_AFTER, selectedPanelId: 'B-17', missions: [mission('B-17')],
    });
    expect(now()).toContain('Diagnosed from a thermal capture');
  });

  it('never diagnoses an array it holds no capture of, inspected or not', () => {
    // Late enough that all three committed cracks have developed.
    const late = 4 * 3600;
    for (const id of ['A-08', 'A-31', 'C-07', 'C-31']) {
      const view = open({
        siteSeconds: late + INSPECTED_AFTER, selectedPanelId: id, missions: [mission(id, late)],
        module: 'incident', dossierOpen: true,
      });
      expect(view.text()).not.toContain('Diagnosed');
      cleanup();
      const summary = open({ module: 'site' });
      expect(summary.text()).toContain('Flagged from modelled signature');
      expect(summary.text()).not.toContain('Diagnosed');
      cleanup();
    }
  });
});

describe('the human gate', () => {
  it('offers a drone, not an approval, before anything has been inspected', () => {
    const { container } = open({ siteSeconds: DEVELOPED, selectedPanelId: 'B-17' });
    expect(maybeButton(container, 'Approve work order')).toBeNull();
    expect(button(container, 'Dispatch drone').disabled).toBe(false);
  });

  it('creates no work order without a click, and one with it', () => {
    const { container, text: now } = open({
      siteSeconds: DEVELOPED + INSPECTED_AFTER, selectedPanelId: 'B-17', missions: [mission('B-17')],
    });
    expect(useSession.getState().workOrders).toHaveLength(0);
    fireEvent.click(button(container, 'Approve work order'));
    expect(useSession.getState().workOrders.map((w) => w.id)).toEqual(['INC-B17']);
    expect(now()).toContain('Work order INC-B17 created');
    expect(container.querySelector('[data-panel-id="B-17"]')?.getAttribute('data-sev')).toBe('scheduled');
    expect(maybeButton(container, 'Approve work order')).toBeNull();
  });

  it('lets a soiled array be approved without a drone, and says a drone adds nothing', () => {
    const { container } = open({ siteSeconds: DEVELOPED, selectedPanelId: 'A-08' });
    expect(button(container, 'Approve work order')).toBeTruthy();
    expect(button(container, 'Fly a drone anyway')).toBeTruthy();
  });

  it('records a refusal with its reason, and lets it be withdrawn', () => {
    const { container, text: now } = open({
      siteSeconds: DEVELOPED + INSPECTED_AFTER, selectedPanelId: 'B-17', missions: [mission('B-17')],
    });
    const override = container.querySelector('select[aria-label="Decline recommendation with a reason"]') as HTMLSelectElement;
    fireEvent.change(override, { target: { value: 'False positive, array inspected manually' } });
    expect(useSession.getState().overrides).toHaveLength(1);
    expect(now()).toContain('Declined by operator');
    expect(maybeButton(container, 'Approve work order')).toBeNull();
    fireEvent.click(button(container, 'Clear override'));
    expect(useSession.getState().overrides).toHaveLength(0);
  });

  it('lists every decision on the queue screen', () => {
    const { container } = open({
      siteSeconds: DEVELOPED + INSPECTED_AFTER, selectedPanelId: 'B-17', missions: [mission('B-17')], module: 'queue',
    });
    expect(text(container.querySelector('[data-b="orders"]') as Element)).toContain('No decisions yet');
    act(() => useSession.getState().createWorkOrder('B-17', 'Approved in a test.'));
    expect(text(container.querySelector('[data-b="orders"]') as Element)).toContain('INC-B17');
  });
});

describe('dispatch is an operator decision', () => {
  it('launches a drone to the selected array and follows it', () => {
    const { container, text: now } = open({ siteSeconds: DEVELOPED, selectedPanelId: 'B-17', followFlight: false });
    fireEvent.click(button(container, 'Dispatch drone'));
    const s = useSession.getState();
    expect(s.missions.map((m) => m.panelId)).toEqual(['B-17']);
    expect(s.followFlight).toBe(true);
    expect(now()).toContain('Outbound');
  });

  it('runs out of drones after two, and says so', () => {
    const { container } = open({
      siteSeconds: DEVELOPED + 60, selectedPanelId: 'B-19',
      missions: [mission('B-17'), mission('A-08', DEVELOPED, 2)],
    });
    const dispatch = button(container, 'Both drones committed');
    expect(dispatch.disabled).toBe(true);
  });

  it('reports the link from where the flight model puts the aircraft', () => {
    const { container } = open({ siteSeconds: DEVELOPED, module: 'drones' });
    const comms = () => text(container.querySelector('[data-b="comms"]') as Element);
    expect(comms()).toContain('On the pad, idle');
    set({ missions: [mission('B-17')], siteSeconds: DEVELOPED + MISSION.outbound / 2 });
    expect(comms()).toContain('Command link, outbound');
    expect(comms()).toMatch(/\d+ m/);
  });
});

describe('evidence belongs to the array it was captured from', () => {
  const dossier = (state: Partial<SessionState>) =>
    open({ module: 'incident', dossierOpen: true, ...state });

  it('shows nothing of B-17’s capture before a drone has looked', () => {
    const { container, text: now } = dossier({ siteSeconds: DEVELOPED, selectedPanelId: 'B-17' });
    expect(container.querySelectorAll('.matrix .cell[data-on="true"]')).toHaveLength(0);
    expect(container.querySelector('.caps img')).toBeNull();
    expect(now()).toContain('Nothing captured yet');
  });

  it('fills the matrix cell by cell while the thermal pass runs', () => {
    const mid = (M.thermal + M.thermalDone) / 2;
    const { container } = dossier({
      siteSeconds: DEVELOPED + sceneT(mid), selectedPanelId: 'B-17', missions: [mission('B-17')],
    });
    const on = container.querySelectorAll('.matrix .cell[data-on="true"]').length;
    expect(on).toBeGreaterThan(0);
    expect(on).toBeLessThan(cellGrid.rows * cellGrid.cols);
  });

  it('shows the visible frame before the thermal one, as the drone flies them', () => {
    const { container } = dossier({
      siteSeconds: DEVELOPED + sceneT(M.rgb + 1), selectedPanelId: 'B-17', missions: [mission('B-17')],
    });
    // The visible pass is due, the thermal one is not, and nothing has been
    // captured in this browser yet: the panel says so instead of showing a
    // photograph from somewhere else.
    expect(container.querySelector('.caps img')).toBeNull();
    expect(text(container.querySelector('[data-b="captures"]') as Element)).toContain('No frame from this flight');

    act(() => useDetector.setState({
      byPanel: {
        'B-17': {
          detections: [], elapsedMs: 1, frame: 'data:image/png;base64,AAAA', frameSize: [4, 4], run: 1, at: 0,
          source: "the drone's camera over B-17", panelId: 'B-17',
        },
      },
    }));
    const alts = [...container.querySelectorAll('.caps img')].map((i) => i.getAttribute('alt'));
    expect(alts).toEqual(['The frame the detector was run on']);
  });

  it('keeps the dataset photograph with the control that verifies against it', () => {
    const { container } = dossier({
      siteSeconds: DEVELOPED + INSPECTED_AFTER, selectedPanelId: 'B-17', missions: [mission('B-17')],
    });
    expect(container.querySelector('[data-b="captures"] .proof')).toBeNull();
    const proof = container.querySelector('[data-b="detector"] .proof') as Element;
    expect(text(proof)).toContain('not a drone frame');
    expect(text(proof)).toContain('held-out test split');
  });

  it('shows a manual live result while retaining the flight capture separately', () => {
    const { container } = dossier({
      siteSeconds: DEVELOPED + sceneT(M.rgb + 1), selectedPanelId: 'B-17',
      missions: [mission('B-17')], followFlight: true,
    });
    const flight = {
      detections: [], elapsedMs: 1, frame: 'data:image/png;base64,AAAA', frameSize: [4, 4] as [number, number],
      run: 1, at: 0, source: "the drone's camera over B-17", panelId: 'B-17',
    };
    const manual = { ...flight, run: 2, frame: 'data:image/png;base64,BBBB', source: `${flight.source}, live` };
    act(() => useDetector.setState({ byPanel: { 'B-17': flight }, last: manual, run: 'done' }));
    expect(container.querySelector('[data-b="detector"] .detframe img')?.getAttribute('src')).toBe(manual.frame);
    expect(container.querySelector('[data-b="captures"] .detframe img')?.getAttribute('src')).toBe(flight.frame);
  });

  it('holds the whole measured band after the drone has flown home', () => {
    const { container, text: now } = dossier({
      siteSeconds: DEVELOPED + INSPECTED_AFTER + 3600, selectedPanelId: 'B-17', missions: [mission('B-17')],
    });
    expect(container.querySelectorAll('.matrix .cell[data-on="true"]')).toHaveLength(cellGrid.rows * cellGrid.cols);
    expect(container.querySelectorAll('.matrix .cell[data-defect="true"]')).toHaveLength(cellGrid.defects.length);
    expect(container.querySelectorAll('.defects li')).toHaveLength(cellGrid.defects.length);
    expect(now()).toContain('R2, C4');
    expect(container.querySelectorAll('.caps img.raw')).toHaveLength(1);
  });

  it('refuses all of it for an array we hold no capture of, even one a drone inspected', () => {
    const { container, text: now } = dossier({
      siteSeconds: DEVELOPED + INSPECTED_AFTER, selectedPanelId: 'A-08', missions: [mission('A-08')],
    });
    expect(now()).toContain('No imagery is held on file for A-08');
    expect(container.querySelector('[data-b="matrix"]')).toBeNull();
    expect(container.querySelector('.caps img')).toBeNull();
    expect(now()).not.toContain('R2, C4');
  });

  it('keeps the peer table on the selected array', () => {
    const { container } = open({ siteSeconds: DEVELOPED, selectedPanelId: 'B-17', module: 'incident' });
    const rows = [...container.querySelectorAll('[data-b="inverters"] tbody tr')];
    expect(rows.map((r) => r.getAttribute('data-hot'))).toEqual(['false', 'true', 'false']);
    expect(text(rows[1])).toContain('INV-B');
  });

  it('asks the agent once per cause, not once per change of status', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error('offline')));
    vi.stubGlobal('fetch', fetchMock);
    // Half a minute into a three-minute ramp: the reading is still moving.
    const { text: now } = open({ siteSeconds: 4.5 * 60, selectedPanelId: 'B-17', module: 'incident' });
    await act(async () => { await Promise.resolve(); });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(now()).toContain('still developing');

    set({ siteSeconds: DEVELOPED });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Approving the work turns the array scheduled. It is the same fault.
    act(() => useSession.getState().createWorkOrder('B-17', 'test'));
    await act(async () => { await Promise.resolve(); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stays usable when the agent cannot be reached', async () => {
    const { text: now } = open({ siteSeconds: DEVELOPED, selectedPanelId: 'B-17', module: 'incident' });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(now()).toContain('Agent unavailable');
    expect(now()).toContain('Evidence chain');
  });
});

describe('the sandbox', () => {
  const at = arrayCentre('B-19');
  const drop = (kind: 'dust' | 'cloud') => act(() => useSession.getState().dropHazard(kind, { x: at.x, z: at.z }));
  const later = (seconds: number) => set({ siteSeconds: useSession.getState().siteSeconds + seconds });

  it('re-derives the queue when dust is dropped, and keeps B-17 first', () => {
    const { container, text: now } = open({ siteSeconds: DEVELOPED });
    expect(container.querySelector('.impact')).toBeNull();
    drop('dust');
    later(600);
    const impact = text(container.querySelector('.impact') as Element);
    expect(impact).toMatch(/\d+ arrays affected/);
    expect(impact).toMatch(/\d+ jobs? added/);
    expect(impact).toContain('B-17 still first');
    expect(now()).toContain('dust');
    expect(container.querySelector('[data-panel-id="B-19"]')?.getAttribute('data-sev')).toBe('warning');
  });

  it('un-happens the hazard when site time is sought back past the drop', () => {
    const { container } = open({ siteSeconds: DEVELOPED });
    drop('dust');
    later(600);
    expect(container.querySelector('.impact')).not.toBeNull();
    set({ siteSeconds: DEVELOPED - 60 });
    expect(container.querySelector('.impact')).toBeNull();
    expect(container.querySelector('[data-panel-id="B-19"]')?.getAttribute('data-sev')).toBe('healthy');
    expect(useSession.getState().hazards).toHaveLength(1);
  });

  it('treats a cloud as weather: arrays affected, no repair work made', () => {
    const { container } = open({ siteSeconds: DEVELOPED });
    drop('cloud');
    later(300);
    const impact = text(container.querySelector('.impact') as Element);
    expect(impact).toMatch(/\d+ arrays affected/);
    expect(impact).not.toContain('added');
    later(3 * 3600);
    expect(container.querySelector('.impact')).toBeNull();
  });

  it('keeps the hazard tools off the site screen', () => {
    const { container } = open({ siteSeconds: DEVELOPED });
    expect(maybeButton(container, 'Heatwave')).toBeNull();
    fireEvent.click(button(container.querySelector('.sy-rail') as Element, 'Sandbox'));
    expect(maybeButton(container, 'Heatwave')).not.toBeNull();
  });

  it('applies a heatwave to the whole site, once', () => {
    const { container } = open({ siteSeconds: DEVELOPED, module: 'sandbox' });
    fireEvent.click(button(container, 'Heatwave'));
    later(1800);
    expect(text(container.querySelector('.impact') as Element)).toContain('120 arrays affected');
    expect(button(container, 'Heatwave').disabled).toBe(true);
    expect(useSession.getState().hazards).toHaveLength(1);
  });

  it('drops a held footprint on an array of the 2D map', () => {
    const { container } = open({ siteSeconds: DEVELOPED });
    act(() => useSession.getState().armHazard('dust'));
    fireEvent.click(container.querySelector('[data-panel-id="C-12"]') as Element);
    const s = useSession.getState();
    expect(s.hazards).toHaveLength(1);
    expect(s.armedHazard).toBeNull();
    expect(s.selectedPanelId).toBeNull();
  });

  it('lists what was dropped, with what each is declared to do, and removes it', () => {
    const { container, text: now } = open({ siteSeconds: DEVELOPED, module: 'sandbox' });
    drop('dust');
    expect(text(container.querySelector('[data-b="hazards"]') as Element)).toContain('Dust storm');
    expect(now()).toContain('Declared scenario assumptions, not measurements');
    fireEvent.click(button(container, 'Remove the dust storm'));
    expect(useSession.getState().hazards).toHaveLength(0);
  });

  it('still breaks an array on request, through the same physics', () => {
    const { container } = open({ siteSeconds: DEVELOPED, module: 'sandbox' });
    fireEvent.click(button(container, 'Established crack'));
    const injected = useSession.getState().injected;
    expect(injected).toHaveLength(1);
    later(600);
    expect(container.querySelector(`[data-panel-id="${injected[0].panelId}"]`)?.getAttribute('data-sev')).toBe('critical');
  });
});

describe('the keys', () => {
  function Keys() { useConsoleKeys(); return null; }

  it('R resets from any state, including with a hazard in hand', () => {
    render(<Keys />);
    useSession.getState().createWorkOrder('B-17', 'test');
    useSession.getState().dropHazard('heatwave');
    useSession.getState().armHazard('dust');
    useSession.getState().moveHazardDraft({ x: 0, z: 0 });

    fireEvent.keyDown(window, { key: 'r' });

    const s = useSession.getState();
    expect(s.workOrders).toEqual([]);
    expect(s.hazards).toEqual([]);
    expect(s.armedHazard).toBeNull();
    expect(s.hazardDraft).toBeNull();
    expect(s.siteSeconds).toBe(0);
  });

  it('S loads the committed rehearsal state', () => {
    render(<Keys />);
    useSession.getState().dropHazard('heatwave');
    fireEvent.keyDown(window, { key: 's' });
    expect(useSession.getState().siteSeconds).toBe(REHEARSAL_SEED.siteSeconds);
    expect(useSession.getState().hazards).toEqual([]);
  });

  it('Escape closes the topmost thing first', () => {
    render(<Keys />);
    useSession.setState({ selectedPanelId: 'B-17', dossierOpen: true });
    useSession.getState().armHazard('cloud');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useSession.getState().armedHazard).toBeNull();
    expect(useSession.getState().dossierOpen).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useSession.getState().dossierOpen).toBe(false);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useSession.getState().selectedPanelId).toBeNull();
  });

  it('seeks with the arrows, pauses with space, and leaves a field’s own keys alone', () => {
    const { container } = render(<><Keys /><input aria-label="field" /></>);
    useSession.setState({ siteSeconds: 3600, running: true });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(useSession.getState().siteSeconds).toBe(3000);
    fireEvent.keyDown(window, { key: ' ' });
    expect(useSession.getState().running).toBe(false);
    fireEvent.keyDown(container.querySelector('input') as Element, { key: 'r' });
    expect(useSession.getState().siteSeconds).toBe(3000);
  });
});

describe('the day plan', () => {
  const planText = (container: Element) => text(container.querySelector('[data-b="plan"]') as Element);

  it('falls back to the heuristic, and says so, when the solver cannot load', () => {
    const { container } = open({ siteSeconds: DEVELOPED, module: 'queue' });
    expect(planText(container)).toContain('Heuristic plan');
    expect(planText(container)).toContain('did not load');
    expect(container.querySelectorAll('.jobbar').length).toBeGreaterThan(0);
  });

  it('shows the optimum beside the heuristic once the solver is there', async () => {
    const { default: highsLoader } = await import('highs');
    const real = highsSolver(await highsLoader());
    const { container } = open({ siteSeconds: DEVELOPED, module: 'queue' });
    // Untimed here: a shared test runner must not decide whether the solve finished.
    act(() => useSolver.setState({ status: 'ready', solver: { solve: (lp) => real.solve(lp, 60) } }));
    expect(planText(container)).toMatch(/Optimal plan/);
    expect(planText(container)).toMatch(/\d+ of \d+ jobs placed/);
  });

  it('never calls a plan optimal when the solver was stopped at its limit', () => {
    const { container } = open({ siteSeconds: DEVELOPED, module: 'queue' });
    act(() => useSolver.setState({ status: 'ready', solver: { solve: () => ({ status: 'limit', values: {}, bound: 99 }) } }));
    expect(planText(container)).toMatch(/Best plan found in 50 ms/);
    expect(planText(container)).toMatch(/Gap \d+\.\d %/);
    expect(planText(container)).not.toMatch(/Optimal plan/);
  });

  it('proposes and never commits: a plan on screen creates no work order', () => {
    const { container } = open({ siteSeconds: DEVELOPED, module: 'queue' });
    expect(planText(container)).toContain('A proposal');
    fireEvent.click(container.querySelector('.jobbar') as Element);
    expect(useSession.getState().workOrders).toEqual([]);
    // Clicking a job selects its array, which is where approval lives.
    expect(useSession.getState().selectedPanelId).not.toBeNull();
  });

  it('closes more of the day to field work under a heatwave', () => {
    const { container } = open({ siteSeconds: DEVELOPED, module: 'queue' });
    const closedByHeat = () => container.querySelectorAll('.slot[data-closed="heat"]').length;
    const before = closedByHeat();
    act(() => useSession.getState().dropHazard('heatwave'));
    set({ siteSeconds: DEVELOPED + 1800 });
    expect(closedByHeat()).toBeGreaterThan(before);
  });

  it('prints both scores on the site screen, where the hazard is dropped', () => {
    const { container } = open({ siteSeconds: DEVELOPED });
    expect(text(container.querySelector('[data-b="queue"]') as Element)).toMatch(/plan, score|plan scores/);
  });
});
