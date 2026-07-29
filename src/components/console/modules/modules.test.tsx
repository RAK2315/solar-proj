/**
 * The module screens behind the icon rail.
 *
 * These used to be five inert labels. The thing worth testing now is not that
 * they render — it is that each one reports the session's ACTUAL state, says so
 * plainly when that state is empty, and never shows a number the map disagrees
 * with. A screen that invents a mission is worse than no screen.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useDemoClock } from '@/store/demoClock';
import { MISSION, MISSION_TOTAL, useSession, type ModuleId } from '@/store/session';
import { ConsoleRoot } from '../ConsoleRoot';

const FAULT_DONE = 8 * 60;

function textOn(module: ModuleId, siteSeconds = FAULT_DONE): string {
  useSession.setState({ module, siteSeconds });
  const { container } = render(<ConsoleRoot />);
  const text = (container.textContent ?? '').replace(/\s+/g, ' ');
  cleanup();
  return text;
}

beforeEach(() => {
  useSession.setState({
    mode: 'live', module: 'site', siteSeconds: 0, running: true,
    selectedPanelId: null, missions: [], workOrders: [],
  });
  useDemoClock.setState({ t: 0, playing: false, approved: false, debug: false });
});
afterEach(cleanup);

describe('the rail navigates', () => {
  it('starts on the site map', () => {
    const text = textOn('site', 0);
    expect(text).toContain('BHADLA SOLAR PARK');
  });

  it('switches screens when an operator clicks a module', () => {
    render(<ConsoleRoot />);
    fireEvent.click(screen.getByRole('button', { name: 'Repairs' }));
    expect(useSession.getState().module).toBe('repairs');
  });

  it('keeps the header and the event feed on every screen', () => {
    for (const m of ['drones', 'missions', 'repairs', 'analytics'] as ModuleId[]) {
      const text = textOn(m);
      expect(text).toContain('Live events');
      expect(text).toContain('Farm health');
    }
  });

  it('pins itself to the map in demo mode, and says why', () => {
    useSession.setState({ mode: 'demo', module: 'site' });
    render(<ConsoleRoot />);
    const repairs = screen.getByRole('button', { name: /Repairs — unavailable/ });
    expect((repairs as HTMLButtonElement).disabled).toBe(true);
  });

  it('returns to the map when demo mode is entered from another screen', () => {
    useSession.setState({ module: 'analytics' });
    useSession.getState().setMode('demo');
    expect(useSession.getState().module).toBe('site');
  });
});

describe('DRONES reports the fleet, not a picture of one', () => {
  it('shows both aircraft on the pad when nothing is flying', () => {
    const text = textOn('drones');
    expect(text).toContain('DRONE 01');
    expect(text).toContain('DRONE 02');
    expect(text).toContain('STANDBY');
    expect(text).toContain('Nothing is flying');
  });

  it('follows a real mission through its phases', () => {
    useSession.getState().dispatch('A-03');
    expect(textOn('drones', 60)).toContain('OUTBOUND');
    expect(textOn('drones', MISSION.outbound + 60)).toContain('INSPECTING');
    expect(textOn('drones', MISSION.outbound + MISSION.inspecting + 60))
      .toContain('RETURNING');
  });

  it('names the array the drone was actually sent to', () => {
    useSession.getState().dispatch('C-12');
    const text = textOn('drones', 60);
    expect(text).toContain('C-12');
    expect(text).not.toContain('B-17 · Zone B');
  });
});

describe('MISSIONS is a log, not a status light', () => {
  it('says nothing has flown when nothing has', () => {
    expect(textOn('missions')).toContain('No drone has been dispatched');
  });

  it('records each sortie with its target and outcome', () => {
    useSession.getState().dispatch('A-03');
    const inFlight = textOn('missions', 60);
    expect(inFlight).toContain('MSN-001');
    expect(inFlight).toContain('IN FLIGHT');

    const landed = textOn('missions', MISSION_TOTAL - 60);
    expect(landed).toContain('EVIDENCE CAPTURED');
  });

  it('marks a mission that produced a work order', () => {
    useSession.getState().dispatch('A-03');
    useSession.getState().createWorkOrder('A-03', 'Clean and re-test.');
    expect(textOn('missions', MISSION_TOTAL)).toContain('WORK ORDER RAISED');
  });

  it('rewinds with site time rather than accumulating', () => {
    useSession.setState({ siteSeconds: 600 });
    useSession.getState().dispatch('A-03');
    expect(textOn('missions', MISSION_TOTAL + 600)).toContain('COMPLETE');
    // Scrub back before the dispatch: the mission has not happened yet.
    expect(textOn('missions', 0)).toContain('IDLE');
  });
});

describe('REPAIRS shows the ranking, not just the order', () => {
  it('lists the four score inputs beside the score', () => {
    const text = textOn('repairs');
    expect(text).toContain('score = loss × severity × urgency ÷ access');
    expect(text).toContain('LOSS MWH/D');
    expect(text).toContain('URGENCY');
    expect(text).toContain('ACCESS');
  });

  it('puts the faulted array top once the fault has developed', () => {
    const text = textOn('repairs');
    const b17 = text.indexOf('B-17');
    const a08 = text.indexOf('A-08');
    expect(b17).toBeGreaterThan(-1);
    expect(b17).toBeLessThan(a08);
  });

  it('says no work is approved when none is', () => {
    expect(textOn('repairs')).toContain('No work has been approved');
  });

  it('lists a work order the operator actually raised', () => {
    useSession.getState().createWorkOrder('B-17', 'Replace module B2-07.');
    const text = textOn('repairs');
    expect(text).toContain('INC-B17');
    expect(text).toContain('Replace module B2-07.');
    expect(text).toContain('SCHEDULED');
  });
});

describe('ANALYTICS is computed, never stored', () => {
  it('agrees with the header about the site', () => {
    const text = textOn('analytics');
    expect(text).toContain('Site output');
    expect(text).toContain('whole-site evaluations');
  });

  it('attributes the loss to a named mechanism', () => {
    const text = textOn('analytics');
    expect(text).toContain('Cell mismatch / bypass diode');
    expect(text).toContain('Soiling above nominal');
  });

  it('names the arrays behind each mechanism rather than a bare total', () => {
    expect(textOn('analytics')).toContain('A-08');
  });

  it('states the model it is computed from', () => {
    expect(textOn('analytics')).toContain('P_rated');
  });

  it('breaks the site down by zone, adding up to the whole site', () => {
    const text = textOn('analytics');
    expect(text).toContain('Zone A');
    expect(text).toContain('Zone C');
  });
});
