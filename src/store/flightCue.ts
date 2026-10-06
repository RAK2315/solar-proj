'use client';

/**
 * src/store/flightCue.ts — where a dispatched drone is, on the scene's timeline.
 *
 * The 3D scene's splines are pure functions of one parameter, written when a
 * scripted run was the only flight there was. A real mission is mapped onto that
 * same parameter here, so one set of splines flies every sortie to whichever
 * array the operator sent it to.
 *
 * THE MAPPING is not a fudge. The scene's legs are 16 s outbound, 22 s on station
 * and 18 s home; a mission's legs are 16, 22 and 18 MINUTES of site time (MISSION
 * in session.ts). So one site minute is one scene second and every leg boundary
 * lands exactly on its mark, which flightCue.test.ts asserts.
 *
 * Pure: `flightCueAt` takes state and returns a cue, so scrubbing site time
 * backwards rewinds the flight.
 */

import { useMemo } from 'react';

import { DAMAGED_MODULE, FAULTED_ARRAY_ID, M, inspectionTarget, type Vec3 } from '@/lib/scene';
import { missionPhaseAt, useSession, type Mission } from './session';

export interface FlightCue {
  /** Is there a flight to show at all? */
  active: boolean;
  /** Position on the scene's timeline, seconds. Outside [18, 74] when inactive. */
  t: number;
  /** The array being inspected. */
  targetId: string;
  /** Where the camera and the reticle aim. */
  target: Vec3;
  /**
   * Does this array carry the measured defect?
   *
   * Only B-17 does. The thermal hot band and the committed detection are
   * evidence of a specific defect on a specific array, and painting them onto
   * another array because the camera is pointed at it would be the same lie as
   * showing B-17's cell grid under another array's name.
   */
  cracked: boolean;
  /** Which drone is flying it. Null when nothing is. */
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

/** One site minute per scene second. See the header. */
export const SITE_SECONDS_PER_SCENE_SECOND = 60;

/** Where a mission of `elapsed` site seconds sits on the scene's timeline. */
export const flightTAt = (elapsedSiteSeconds: number): number =>
  M.dispatch + elapsedSiteSeconds / SITE_SECONDS_PER_SCENE_SECOND;

/**
 * The cue, from state. Plain rather than a hook because the scene reads it
 * inside useFrame, where hooks cannot go.
 */
export function flightCueAt(siteSeconds: number, missions: readonly Mission[]): FlightCue {
  // The mission actually in the air. With two up, the one launched most
  // recently: that is the one the operator just acted on.
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
  const s = useSession.getState();
  return flightCueAt(s.siteSeconds, s.missions);
}

export function useFlightCue(): FlightCue {
  const siteSeconds = useSession((s) => s.siteSeconds);
  const missions = useSession((s) => s.missions);
  return useMemo(() => flightCueAt(siteSeconds, missions), [siteSeconds, missions]);
}
