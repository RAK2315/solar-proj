'use client';

/**
 * TwinCamera: one camera, two jobs.
 *
 * At rest it holds the whole field. When a drone is dispatched and the operator
 * is following it, it flies the mission spline from lib/scene.ts, which is the
 * old cinematic's camera with the separate view removed.
 *
 * Both targets are SAMPLED from site time. The lerp only smooths the approach,
 * so pausing, seeking and resetting all land where they should.
 *
 * It also writes projected array positions straight onto the DOM overlay. No
 * React state is involved, so nothing re-renders per frame.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { Vector3 } from 'three';

import { POST_HEIGHT, arrayCentre, cameraAt, type Vec3 } from '@/lib/scene';
import { fieldCameraAt } from '@/lib/twinCamera';
import { flightCueNow } from '@/store/flightCue';
import { useSession } from '@/store/session';

const FIELD_SMOOTHING = 0.1;
const FLIGHT_SMOOTHING = 0.14;
/** Slower than either, so the cut between the two reads as a move, not a jump. */
const HANDOVER_SMOOTHING = 0.06;
const HANDOVER_DONE = 2.5;
/** Within a flight, a target this far away moved because someone seeked. */
const SNAP_DISTANCE = 12;

export function TwinCamera({ overlay }: { overlay: RefObject<HTMLDivElement | null> }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const want = useMemo(() => new Vector3(), []);
  const wantLook = useMemo(() => new Vector3(), []);
  const look = useRef<Vector3 | null>(null);
  const following = useRef(false);
  const handingOver = useRef(false);
  const projected = useMemo(() => new Vector3(), []);
  const centres = useMemo(() => new Map<string, Vec3>(), []);

  useFrame(() => {
    const s = useSession.getState();
    const cue = flightCueNow();
    const follow = s.followFlight && cue.active;
    const sample = follow
      ? cameraAt(cue.t, cue.target)
      : fieldCameraAt(s.siteSeconds, s.timeScale, size.width / size.height, s.twinView);

    want.set(sample.pos.x, sample.pos.y, sample.pos.z);
    wantLook.set(sample.look.x, sample.look.y, sample.look.z);

    if (!look.current) {
      camera.position.copy(want);
      look.current = wantLook.clone();
    } else {
      if (follow !== following.current) handingOver.current = true;
      const gap = camera.position.distanceTo(want);
      if (handingOver.current && gap < HANDOVER_DONE) handingOver.current = false;

      if (follow && !handingOver.current && gap > SNAP_DISTANCE) {
        camera.position.copy(want);
        look.current.copy(wantLook);
      } else {
        const k = handingOver.current
          ? HANDOVER_SMOOTHING
          : follow ? FLIGHT_SMOOTHING : FIELD_SMOOTHING;
        camera.position.lerp(want, k);
        look.current.lerp(wantLook, k);
      }
    }
    following.current = follow;
    camera.lookAt(look.current);

    if ('fov' in camera && Math.abs(camera.fov - sample.fov) > 0.01) {
      camera.fov += (sample.fov - camera.fov) * FLIGHT_SMOOTHING;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();

    const root = overlay.current;
    if (!root) return;
    // Screen-fixed markers are sized for the field view. A few metres above one
    // array they would be the wrong scale entirely, so they stand down.
    root.dataset.follow = follow ? 'true' : 'false';
    root.querySelectorAll<HTMLElement>('[data-anchor]').forEach((el) => {
      const id = el.dataset.anchor ?? '';
      let p = centres.get(id);
      if (!p) { p = arrayCentre(id); centres.set(id, p); }
      projected.set(p.x, POST_HEIGHT, p.z).project(camera);
      const x = (projected.x * 0.5 + 0.5) * size.width;
      const y = (-projected.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.style.visibility = projected.z < 1 ? 'visible' : 'hidden';
    });
  });

  return null;
}
