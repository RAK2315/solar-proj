'use client';

/**
 * src/store/flightCue.ts — what the cinematic should be showing, right now.
 *
 * THE PROBLEM THIS SOLVES. The 3D scene was written for the scripted incident:
 * every spline is a pure function of the demo clock's `t`, and every one of them
 * flew to B-17 because that is the only place the script ever goes. So when an
 * operator dispatched a drone in live mode, a real mission flew on the map and
 * the cinematic sat there — it was watching a clock that was not moving, waiting
 * for a flight that was not scripted.
 *
 * The fix is one indirection. Both modes now produce a FlightCue: a parameter on
 * the scene's own timeline, plus which array the aircraft is going to. The scene
 * reads the cue instead of the clock, so exactly one set of splines serves both
 * the recording and the product.
 *
 * THE TIMELINE MAPPING is not a fudge. The demo's legs are 16 s outbound, 22 s on
 * station, 18 s home; a live mission's legs are 16, 22 and 18 MINUTES of site time
 * (MISSION in session.ts, which was written to mirror the beat spacing). So one
 * site minute maps to one cinematic second and every leg boundary lands exactly on
 * its beat — asserted in flightCue.test.ts rather than asserted here.
 *
 * Pure in both directions: `flightCueAt` takes state and returns a cue, so seeking
 * the demo backwards or scrubbing site time backwards both rewind the flight.
 */

import { useMemo } from 'react';

import { DAMAGED_MODULE, FAULTED_ARRAY_ID, M, inspectionTarget, type Vec3 } from '@/lib/scene';
import { useDemoClock, viewAt } from './demoClock';
import { MISSION_TOTAL, missionPhaseAt, useSession, type Mission } from './session';

export interface FlightCue {
  /** Is there a flight to show at all? */
  active: boolean;
  /** Position on the SCENE's timeline, seconds. Outside [18,74] when inactive. */
  t: number;
  /** The array being inspected. */
  targetId: string;
  /** Where the camera and the reticle aim. */
  target: Vec3;
  /**
   * Does this array carry the cracked cell?
   *
   * Only B-17 does. The crack decal, the detection label and the thermal hot band
   * are all EVIDENCE OF A SPECIFIC DEFECT ON A SPECIFIC ARRAY — painting them onto
   * a soiled array because the camera happens to be pointed at it would be the
   * same lie as showing B-17's cell grid under another array's name.
   */
  cracked: boolean;
  /** Which drone is flying it, for the overlays. Null in demo mode's script. */
  droneId: string | null;
}

const IDLE: FlightCue = {
  active: false,
  t: 0,
  targetId: FAULTED_ARRAY_ID,
  target: DAMAGED_MODULE,
  cracked: true,
  droneId: null,
};

/** One site minute per cinematic second — see the header. */
export const SITE_SECONDS_PER_CINEMATIC_SECOND = 60;

/** Where a mission of `elapsed` site seconds sits on the scene's timeline. */
export const flightTAt = (elapsedSiteSeconds: number): number =>
  M.dispatch + elapsedSiteSeconds / SITE_SECONDS_PER_CINEMATIC_SECOND;

/**
 * The cue, from state. Exported plain (not as a hook) because the scene reads it
 * inside useFrame, where hooks cannot go.
 */
export function flightCueAt(
  mode: 'live' | 'demo',
  demoT: number,
  siteSeconds: number,
  missions: Mission[],
): FlightCue {
  if (mode === 'demo') {
    return {
      active: viewAt(demoT) === 'cinematic',
      t: demoT,
      targetId: FAULTED_ARRAY_ID,
      target: DAMAGED_MODULE,
      cracked: true,
      droneId: 'DRONE 01',
    };
  }

  // The mission that is actually in the air. If two are flying we show the one
  // that launched most recently, because that is the one the operator just acted
  // on — and the map keeps drawing both routes regardless.
  let flying: Mission | null = null;
  for (const m of missions) {
    if (missionPhaseAt(m, siteSeconds) === 'complete') continue;
    if (siteSeconds < m.startedAt) continue;
    if (!flying || m.startedAt > flying.startedAt) flying = m;
  }
  if (!flying) return IDLE;

  return {
    active: true,
    t: flightTAt(siteSeconds - flying.startedAt),
    targetId: flying.panelId,
    target: inspectionTarget(flying.panelId),
    cracked: flying.panelId === FAULTED_ARRAY_ID,
    droneId: flying.droneId,
  };
}

/** The cue for whatever is happening now. Safe to call from useFrame. */
export function flightCueNow(): FlightCue {
  const demo = useDemoClock.getState();
  const session = useSession.getState();
  return flightCueAt(session.mode, demo.t, session.siteSeconds, session.missions);
}

export function useFlightCue(): FlightCue {
  const mode = useSession((s) => s.mode);
  const siteSeconds = useSession((s) => s.siteSeconds);
  const missions = useSession((s) => s.missions);
  const demoT = useDemoClock((s) => s.t);

  return useMemo(
    () => flightCueAt(mode, demoT, siteSeconds, missions),
    [mode, demoT, siteSeconds, missions],
  );
}

/**
 * Which of the two views is on screen.
 *
 * Demo mode: `t` decides, unless a rehearsal key is holding it. Live mode: a
 * flight takes the screen, unless the operator has said otherwise — dispatch
 * clears the override, so the next mission cuts to the cinematic again rather
 * than being silently suppressed by a decision made two missions ago.
 */
export function useActiveView(): 'console' | 'cinematic' {
  const mode = useSession((s) => s.mode);
  const override = useDemoClock((s) => s.viewOverride);
  const demoT = useDemoClock((s) => s.t);
  const cue = useFlightCue();

  if (override) return override;
  if (mode === 'demo') return viewAt(demoT);
  return cue.active && cue.t < M.recommendation ? 'cinematic' : 'console';
}

/** How far through the mission, 0..1 — the timecode and the pill both want it. */
export const flightProgress = (cue: FlightCue): number =>
  Math.max(0, Math.min(1, (cue.t - M.dispatch) / (M.recommendation - M.dispatch)));

export { MISSION_TOTAL };
