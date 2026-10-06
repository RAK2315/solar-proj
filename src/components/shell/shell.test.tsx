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
import { REHEARSAL_SEED } from '@/lib/rehearsal';
import { M, arrayCentre } from '@/lib/scene';
import { useDetector } from '@/store/detector';
import { MISSION, useSession, type Mission, type SessionState } from '@/store/session';
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
  // The agent is a network call. Offline is a real state and the console has to
  // stay usable in it, so that is the state these tests run in.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

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
    const override = container.querySelector('select[aria-label^="Override"]') as HTMLSelectElement;
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
    const alts = [...container.querySelectorAll('.caps img')].map((i) => i.getAttribute('alt'));
    expect(alts).toEqual(['Visible-light frame with the detection box']);
  });

  it('holds the whole measured band after the drone has flown home', () => {
    const { container, text: now } = dossier({
      siteSeconds: DEVELOPED + INSPECTED_AFTER + 3600, selectedPanelId: 'B-17', missions: [mission('B-17')],
    });
    expect(container.querySelectorAll('.matrix .cell[data-on="true"]')).toHaveLength(cellGrid.rows * cellGrid.cols);
    expect(container.querySelectorAll('.matrix .cell[data-defect="true"]')).toHaveLength(cellGrid.defects.length);
    expect(container.querySelectorAll('.defects li')).toHaveLength(cellGrid.defects.length);
    expect(now()).toContain('R2, C4');
    expect(container.querySelectorAll('.caps img')).toHaveLength(2);
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

  it('applies a heatwave to the whole site, once', () => {
    const { container } = open({ siteSeconds: DEVELOPED });
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
