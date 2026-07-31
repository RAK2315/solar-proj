/**
 * After sunset.
 *
 * Reported from a screenshot of C-29 at night: "Array output 0.00 kW · Expected
 * 0.00 kW · Irradiance 0 W/m² · Ambient 35.6 °C", labelled HEALTHY, sitting above
 * "Projected loss 3.07 MWh / 72 h".
 *
 * Three separate untruths in one panel. The deviation was arithmetic on two
 * zeroes and meant nothing. `healthy` was that meaningless deviation passed
 * through a threshold, so a cracked array would read clean all night. And the
 * projected loss was B-17's committed figure printed under an array that has no
 * fault at all.
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { liveFrameAt } from '@/lib/live';
import { useDemoClock } from '@/store/demoClock';
import { MISSION_TOTAL, useSession } from '@/store/session';
import { ConsoleRoot } from './ConsoleRoot';

/** 20:00 site time — well after the 18:00 irradiance cut-off. */
const NIGHT = 10 * 3600;
const NOON = 2 * 3600;

function text(siteSeconds: number, panelId: string): string {
  useSession.setState({ siteSeconds, selectedPanelId: panelId });
  const { container } = render(<ConsoleRoot />);
  const out = (container.textContent ?? '').replace(/\s+/g, ' ');
  cleanup();
  return out;
}

beforeEach(() => {
  useSession.setState({
    mode: 'live', module: 'site', siteSeconds: 0, running: false,
    selectedPanelId: null, missions: [], workOrders: [],
    overrides: [], injected: [], feedFilter: 'all',
  });
  useDemoClock.setState({ t: 0, playing: false, approved: false, debug: false });
});
afterEach(cleanup);

describe('the console knows the difference between fine and unobservable', () => {
  it('is genuinely dark at the hour under test', () => {
    expect(liveFrameAt(NIGHT).irradiance).toBe(0);
  });

  it('says so in the header instead of implying a fault', () => {
    expect(text(NIGHT, 'C-29')).toContain('NIGHT');
    expect(text(NOON, 'C-29')).not.toContain('· NIGHT');
  });

  it('withholds the deviation rather than printing 0.0 % of nothing', () => {
    const night = text(NIGHT, 'C-29');
    expect(night).toContain('No generation — after sunset');
    expect(night).not.toContain('Array deviation');
    expect(night).not.toContain('0.00 kW');
  });

  it('shows all of it again once the sun is up', () => {
    const noon = text(NOON, 'C-29');
    expect(noon).toContain('Array deviation');
    expect(noon).not.toContain('No generation — after sunset');
  });

  it('does not call a cracked array healthy just because it is dark', () => {
    // Fleet health is a property of the faults on the site, not of the hour. 13:00
    // is after all three committed faults have developed, so the only difference
    // between it and 20:00 is the sun.
    const ALL_DEVELOPED = 3 * 3600;
    expect(liveFrameAt(NIGHT).farmHealth).toBeLessThan(100);
    expect(liveFrameAt(NIGHT).farmHealth)
      .toBeCloseTo(liveFrameAt(ALL_DEVELOPED).farmHealth, 6);
  });
});

describe('projected loss belongs to the array it was computed for', () => {
  it('prints none at all for an array that is not deviating', () => {
    // The outlook section only exists once a drone has actually been, so the
    // array has to be inspected before the claim can be made at all.
    useSession.getState().dispatch('C-29');
    const out = text(MISSION_TOTAL + 60, 'C-29');
    expect(out).toContain('none — C-29 is not deviating');
    expect(out).not.toContain('3.07 MWh');
  });

  it('still prints B-17’s committed figure for B-17', () => {
    // Scaled by the array's own shortfall, so the frozen 3.07 is reproduced
    // exactly rather than approximated by a second integral.
    expect(text(NOON, 'B-17')).toContain('3.07 MWh');
  });

  it('gives the shallow crack a proportionally smaller number', () => {
    // A-31 is 2 of 7 strings at 0.68 against B-17's 5 at 0.4160 — a shortfall
    // ratio of 0.219, which the projection must follow rather than round to the
    // same headline figure.
    const a31 = text((11 + 30 / 60 - 10) * 3600, 'A-31');
    expect(a31).toMatch(/0\.6[0-9] MWh/);
  });
});
