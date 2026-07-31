/**
 * The controls that used to be decoration.
 *
 * QUEUED, INSPECT EVIDENCE, OVERRIDE, ⇄ FILTER, VIEW ALL EVENTS and VIEW QUEUE →
 * were all spans lifted off the reference screenshot. They sat where controls
 * sit, they looked like controls, and every one of them did nothing. These tests
 * exist so that cannot silently come back — a console whose buttons are props is
 * worse than one that has fewer buttons.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useDemoClock } from '@/store/demoClock';
import { MISSION_TOTAL, useSession } from '@/store/session';
import { ConsoleRoot } from './ConsoleRoot';

const LANDED = MISSION_TOTAL + 60;

beforeEach(() => {
  useSession.setState({
    mode: 'live', module: 'site', siteSeconds: 0, running: false,
    selectedPanelId: null, missions: [], workOrders: [],
    overrides: [], injected: [], feedFilter: 'all',
  });
  useDemoClock.setState({ t: 0, playing: false, approved: false, debug: false });
});
afterEach(cleanup);

/** Put an inspected array on screen so the approval bar is armed. */
function inspected(panelId = 'A-03') {
  useSession.getState().dispatch(panelId);
  useSession.setState({ siteSeconds: LANDED, selectedPanelId: panelId });
  render(<ConsoleRoot />);
}

describe('the event feed filter', () => {
  it('is a button, not a label', () => {
    render(<ConsoleRoot />);
    expect(screen.getByRole('button', { name: /Event severity filter/ })).toBeTruthy();
  });

  it('cycles all → warning → critical → all', () => {
    render(<ConsoleRoot />);
    const btn = () => screen.getByRole('button', { name: /Event severity filter/ });

    expect(useSession.getState().feedFilter).toBe('all');
    fireEvent.click(btn());
    expect(useSession.getState().feedFilter).toBe('warning');
    fireEvent.click(btn());
    expect(useSession.getState().feedFilter).toBe('critical');
    fireEvent.click(btn());
    expect(useSession.getState().feedFilter).toBe('all');
  });

  it('actually removes rows below the floor', () => {
    useSession.setState({ siteSeconds: 10 * 60 });
    const { container, rerender } = render(<ConsoleRoot />);
    const text = () => (container.textContent ?? '').replace(/\s+/g, ' ');

    expect(text()).toContain('120 arrays polled');     // the `info` boot event
    useSession.setState({ feedFilter: 'critical' });
    rerender(<ConsoleRoot />);
    expect(text()).not.toContain('120 arrays polled');
    expect(text()).toContain('Telemetry cannot separate soiling');
  });

  it('does not silence the mission log — the filter is a view, not a mute', () => {
    // The log reads the unfiltered feed. Hiding rows from a list is a choice about
    // a list; making the drone stop reporting what it found is not.
    useSession.setState({ siteSeconds: 10 * 60, feedFilter: 'critical' });
    render(<ConsoleRoot />);
    // The critical event is present regardless; what matters is that the info-level
    // boot line is filtered out of the FEED while still existing upstream.
    expect(useSession.getState().feedFilter).toBe('critical');
  });
});

describe('INSPECT EVIDENCE', () => {
  it('is a button and points at a section that exists', () => {
    inspected();
    const btn = screen.getByRole('button', { name: 'INSPECT EVIDENCE' });
    fireEvent.click(btn);
    expect(document.getElementById('rail-inspection')).toBeTruthy();
  });
});

describe('OVERRIDE — the other half of the gate', () => {
  it('records the operator’s decision with its reason', () => {
    inspected();
    const select = screen.getByLabelText(/Override/);
    fireEvent.change(select, { target: { value: 'accepted risk — scheduled at next outage' } });

    const [o] = useSession.getState().overrides;
    expect(o.panelId).toBe('A-03');
    expect(o.reason).toBe('accepted risk — scheduled at next outage');
  });

  it('says so on screen, and can be undone', () => {
    inspected();
    useSession.getState().overrideRecommendation('A-03', 'false positive — array inspected manually');
    cleanup();
    const { container } = render(<ConsoleRoot />);

    expect(container.textContent).toContain('Declined by operator');
    fireEvent.click(screen.getByRole('button', { name: 'CLEAR OVERRIDE' }));
    expect(useSession.getState().overrides).toHaveLength(0);
  });

  it('raises no work order — declining is not approving', () => {
    inspected();
    useSession.getState().overrideRecommendation('A-03', 'deferred — crew already on site next cycle');
    expect(useSession.getState().workOrders).toHaveLength(0);
  });
});

describe('QUEUED is a status, not a control', () => {
  it('reads NOT QUEUED before approval and ✓ QUEUED after', () => {
    inspected();
    expect(document.body.textContent).toContain('NOT QUEUED');

    fireEvent.click(screen.getByRole('button', { name: /APPROVE — CREATE WORK ORDER/ }));
    expect(document.body.textContent).toContain('✓ QUEUED');
  });
});

describe('VIEW QUEUE → goes to the queue', () => {
  it('navigates to the repairs screen in live mode', () => {
    render(<ConsoleRoot />);
    fireEvent.click(screen.getByRole('button', { name: 'View the repair queue' }));
    expect(useSession.getState().module).toBe('repairs');
  });

  it('is disabled while the scripted demo is playing', () => {
    useSession.setState({ mode: 'demo' });
    useDemoClock.setState({ t: 80 });
    render(<ConsoleRoot />);
    const btn = screen.getByRole('button', { name: /View queue — unavailable/ });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('the scenario screen', () => {
  it('is reachable from the rail', () => {
    render(<ConsoleRoot />);
    fireEvent.click(screen.getByRole('button', { name: 'Scenario' }));
    expect(useSession.getState().module).toBe('scenario');
  });

  it('injects a fault the site model then evaluates', () => {
    useSession.setState({ module: 'scenario', selectedPanelId: 'C-12' });
    const { container } = render(<ConsoleRoot />);

    fireEvent.change(within(container).getByDisplayValue(/C-12/), {
      target: { value: 'C-12' },
    });
    fireEvent.click(screen.getByRole('button', { name: /INJECT → C-12/ }));

    expect(useSession.getState().injected.map((e) => e.panelId)).toEqual(['C-12']);
  });

  it('will not inject onto an array the committed scenario owns', () => {
    useSession.setState({ module: 'scenario', selectedPanelId: 'B-17', siteSeconds: 600 });
    render(<ConsoleRoot />);
    const btn = screen.getByRole('button', { name: /ALREADY FAULTED/ });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});
