'use client';

/**
 * CameraRig — the camera is SAMPLED from `t`, never driven toward a target.
 *
 * The lerp below smooths the approach to the sampled point; it does not decide it.
 * That distinction is the whole reason seeking works: on a seek the target jumps,
 * and `snap()` puts the camera there immediately rather than gliding across the
 * site for a second. During playback the same lerp takes the mechanical edge off
 * the segment boundaries.
 *
 * The five marks are asserted in src/lib/scene.test.ts without a GPU, because
 * cameraAt() is pure.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';

import { cameraAt } from '@/lib/scene';
import { flightCueNow } from '@/store/flightCue';

const SMOOTHING = 0.14;
/** Beyond this, the target moved because someone seeked — so do not glide. */
const SNAP_DISTANCE = 12;

export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const target = useRef(new Vector3());
  const look = useRef(new Vector3());

  // Land on the right frame immediately on mount, including after a seek that
  // happened while the cinematic was hidden.
  useEffect(() => {
    const cue = flightCueNow();
    const s = cameraAt(cue.t, cue.target);
    camera.position.set(s.pos.x, s.pos.y, s.pos.z);
    look.current.set(s.look.x, s.look.y, s.look.z);
    camera.lookAt(look.current);
  }, [camera]);

  useFrame(() => {
    // The cue, not the clock: in demo mode it IS the clock, and in live mode it
    // is wherever the dispatched mission has got to. One spline, two sources.
    const cue = flightCueNow();
    const s = cameraAt(cue.t, cue.target);

    target.current.set(s.pos.x, s.pos.y, s.pos.z);
    const jumped = camera.position.distanceTo(target.current) > SNAP_DISTANCE;
    if (jumped) camera.position.copy(target.current);
    else camera.position.lerp(target.current, SMOOTHING);

    const wantLook = new Vector3(s.look.x, s.look.y, s.look.z);
    if (jumped) look.current.copy(wantLook);
    else look.current.lerp(wantLook, SMOOTHING);
    camera.lookAt(look.current);

    if ('fov' in camera && camera.fov !== s.fov) {
      camera.fov = s.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
