/**
 * The flight cue — the thing that makes one inspection sequence serve both modes.
 *
 * The bug this was written for: dispatching a drone in live mode did nothing to
 * the cinematic, because the scene read the demo clock and the demo clock does not
 * move in live mode. So the assertions that matter are (a) a real mission produces
 * a cue that sits on the scene's own timeline, (b) the mapping lands each mission
 * leg exactly on its beat rather than approximately, and (c) flying somewhere
 * other than B-17 does not carry B-17's defect along with the camera.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { M, inspectionTarget, FAULTED_ARRAY_ID, DAMAGED_MODULE } from '@/lib/scene';
import { useDemoClock } from './demoClock';
import { flightCueAt, flightCueNow, flightTAt } from './flightCue';
import { MISSION, MISSION_TOTAL, useSession, type Mission } from './session';

const mission = (panelId: string, startedAt = 0): Mission => ({
  id: 'MSN-001', droneId: 'DRONE 01', panelId, startedAt, phase: 'outbound',
});

beforeEach(() => {
  useSession.setState({
    mode: 'live', module: 'site', siteSeconds: 0, running: true,
    selectedPanelId: null, missions: [], workOrders: [],
  });
  useDemoClock.setState({ t: 0, playing: false, approved: false, viewOverride: null });
});

describe('a live mission lands on the scene’s own timeline', () => {
  it('maps each mission leg exactly onto its beat', () => {
    // One site minute per cinematic second. Not approximately — the MISSION legs
    // were written to mirror the beat spacing, and this is what says so.
    expect(flightTAt(0)).toBe(M.dispatch);
    expect(flightTAt(MISSION.outbound)).toBe(M.lock);
    expect(flightTAt(MISSION.outbound + MISSION.inspecting)).toBe(M.thermalDone);
    expect(flightTAt(MISSION_TOTAL)).toBe(M.recommendation);
  });

  it('is inactive with nothing in the air', () => {
    expect(flightCueAt('live', 0, 0, []).active).toBe(false);
  });

  it('activates the moment a drone is dispatched', () => {
    const cue = flightCueAt('live', 0, 0, [mission('C-31')]);
    expect(cue.active).toBe(true);
    expect(cue.t).toBe(M.dispatch);
    expect(cue.targetId).toBe('C-31');
  });

  it('advances with site time, not with the demo clock', () => {
    const ms = [mission('C-31')];
    expect(flightCueAt('live', 0, MISSION.outbound, ms).t).toBe(M.lock);
    // The demo clock is untouched throughout — that was the whole bug.
    expect(flightCueAt('live', 0, MISSION.outbound, ms).t)
      .toBe(flightCueAt('live', 999, MISSION.outbound, ms).t);
  });

  it('goes inactive again once the drone is home', () => {
    const ms = [mission('C-31')];
    expect(flightCueAt('live', 0, MISSION_TOTAL + 1, ms).active).toBe(false);
  });

  it('rewinds rather than accumulating when site time is scrubbed back', () => {
    const ms = [mission('C-31', 600)];
    expect(flightCueAt('live', 0, 300, ms).active).toBe(false);
    expect(flightCueAt('live', 0, 600, ms).t).toBe(M.dispatch);
  });

  it('follows the most recent launch when two drones are up', () => {
    const ms = [mission('A-08', 0), { ...mission('C-31', 120), id: 'MSN-002' }];
    expect(flightCueAt('live', 0, 200, ms).targetId).toBe('C-31');
  });
});

describe('the camera goes where the drone was actually sent', () => {
  it('aims at the array the operator picked, not at B-17', () => {
    const cue = flightCueAt('live', 0, 60, [mission('C-31')]);
    expect(cue.target).toEqual(inspectionTarget('C-31'));
    expect(cue.target).not.toEqual(DAMAGED_MODULE);
  });

  it('gives every array a distinct target position', () => {
    const seen = new Set(
      ['A-03', 'B-17', 'C-31', 'A-08'].map((id) => JSON.stringify(inspectionTarget(id))),
    );
    expect(seen.size).toBe(4);
  });

  it('still puts the scripted run over B-17', () => {
    const cue = flightCueAt('demo', 40, 0, []);
    expect(cue.targetId).toBe(FAULTED_ARRAY_ID);
    expect(cue.target).toEqual(DAMAGED_MODULE);
    expect(cue.t).toBe(40);
  });
});

describe('the defect does not travel with the camera', () => {
  it('marks B-17 as cracked', () => {
    expect(flightCueAt('live', 0, 60, [mission('B-17')]).cracked).toBe(true);
  });

  it('does NOT mark a soiled array as cracked just because we flew there', () => {
    expect(flightCueAt('live', 0, 60, [mission('A-08')]).cracked).toBe(false);
    expect(flightCueAt('live', 0, 60, [mission('C-31')]).cracked).toBe(false);
  });
});

describe('the demo is unchanged', () => {
  it('is active exactly across the scripted cinematic window', () => {
    expect(flightCueAt('demo', 17, 0, []).active).toBe(false);
    expect(flightCueAt('demo', 18, 0, []).active).toBe(true);
    expect(flightCueAt('demo', 73, 0, []).active).toBe(true);
    expect(flightCueAt('demo', 74, 0, []).active).toBe(false);
  });

  it('ignores live missions entirely', () => {
    const cue = flightCueAt('demo', 40, 5000, [mission('C-31')]);
    expect(cue.targetId).toBe(FAULTED_ARRAY_ID);
  });
});

describe('flightCueNow reads the live stores', () => {
  it('reflects a dispatch made through the store', () => {
    useSession.setState({ siteSeconds: 0 });
    useSession.getState().dispatch('A-22');
    useSession.setState({ siteSeconds: MISSION.outbound });

    const cue = flightCueNow();
    expect(cue.active).toBe(true);
    expect(cue.targetId).toBe('A-22');
    expect(cue.t).toBe(M.lock);
  });

  it('clears a held view override, so the next mission is not suppressed', () => {
    useDemoClock.getState().forceView('console');
    expect(useDemoClock.getState().viewOverride).toBe('console');

    useSession.getState().dispatch('A-22');
    expect(useDemoClock.getState().viewOverride).toBeNull();
  });
});
