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
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { M, POST_HEIGHT, arrayCentre, cameraAt, type Vec3 } from '@/lib/scene';
import { operatorCameraAt, operatorViewport, type CameraRequest } from '@/lib/twinCamera';
import { flightCueNow } from '@/store/flightCue';
import { useSession } from '@/store/session';
import { twinProbe } from './probe';

const GROUND = new Plane(new Vector3(0, 1, 0), 0);

const FIELD_SMOOTHING = 0.1;
const FLIGHT_SMOOTHING = 0.14;
/** Slower than either, so the cut between the two reads as a move, not a jump. */
const HANDOVER_SMOOTHING = 0.06;
const HANDOVER_DONE = 2.5;
/** Within a flight, a target this far away moved because someone seeked. */
const SNAP_DISTANCE = 12;

export function TwinCamera({ overlay, request }: { overlay: RefObject<HTMLDivElement | null>; request: CameraRequest }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const canvas = useThree((s) => s.gl.domElement);
  const controls = useRef<OrbitControls | null>(null);
  const manual = useRef(false);
  const previous = useRef('');

  useEffect(() => {
    const orbit = new OrbitControls(camera, canvas);
    orbit.minDistance = 12;
    orbit.maxDistance = 360;
    orbit.maxPolarAngle = Math.PI / 2 - 0.08;
    orbit.addEventListener('start', () => { manual.current = true; });
    controls.current = orbit;
    return () => { orbit.dispose(); controls.current = null; };
  }, [camera, canvas]);

  useEffect(() => {
    const ray = new Raycaster();
    const ndc = new Vector2();
    const hit = new Vector3();
    twinProbe.toGround = (clientX, clientY) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.ray.intersectPlane(GROUND, hit) ? { x: hit.x, z: hit.z } : null;
    };
    return () => { twinProbe.toGround = null; };
  }, [camera, canvas]);

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
    const viewport = operatorViewport(size.width, size.height);
    const key = `${request.view}/${request.revision}/${request.view === 'selected' ? s.selectedPanelId : ''}/${follow}`;
    if (key !== previous.current) { manual.current = false; previous.current = key; }
    const orbit = controls.current;
    if (orbit) orbit.enabled = !follow && !s.armedHazard;
    const sample = follow
      ? cameraAt(cue.t, cue.target)
      : operatorCameraAt(request.view, s.selectedPanelId, viewport.aspect);
    const calibrated = follow && cue.t >= M.lock && cue.t < M.thermalDone;

    want.set(sample.pos.x, sample.pos.y, sample.pos.z);
    wantLook.set(sample.look.x, sample.look.y, sample.look.z);

    // Detector crops are computed from cameraAt. Interpolating after a paused
    // seek would capture pixels from a camera the crop was never calibrated for.
    if (calibrated) {
      camera.position.copy(want);
      look.current = wantLook.clone();
      handingOver.current = false;
    } else if (manual.current && orbit && !follow) {
      orbit.update();
      look.current = orbit.target.clone();
    } else if (!look.current) {
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
    if (!manual.current || follow) {
      camera.lookAt(look.current);
      orbit?.target.copy(look.current);
    }

    // The mission ROI is calibrated on the full canvas. Only the operator view
    // is reframed around the panels; a followed flight clears that offset.
    if ('setViewOffset' in camera) {
      if (follow) camera.clearViewOffset();
      else camera.setViewOffset(size.width, size.height, viewport.offsetX, 0, size.width, size.height);
    }

    if ('fov' in camera && Math.abs(camera.fov - sample.fov) > 0.01) {
      camera.fov = calibrated ? sample.fov : camera.fov + (sample.fov - camera.fov) * FLIGHT_SMOOTHING;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();

    const root = overlay.current;
    if (!root) return;
    root.closest<HTMLElement>('.sy')?.style.setProperty('--bearing', `${Math.atan2(camera.position.x - look.current.x, camera.position.z - look.current.z) * 180 / Math.PI}deg`);
    // Screen-fixed markers are sized for the field view. A few metres above one
    // array they would be the wrong scale entirely, so they stand down.
    root.dataset.follow = follow ? 'true' : 'false';
    root.querySelectorAll<HTMLElement>('[data-anchor], [data-at]').forEach((el) => {
      const id = el.dataset.anchor;
      if (id) {
        let p = centres.get(id);
        if (!p) { p = arrayCentre(id); centres.set(id, p); }
        projected.set(p.x, POST_HEIGHT, p.z);
      } else {
        const [x, z] = (el.dataset.at ?? '0,0').split(',').map(Number);
        projected.set(x, POST_HEIGHT, z);
      }
      projected.project(camera);
      const x = (projected.x * 0.5 + 0.5) * size.width;
      const y = (-projected.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.style.visibility = projected.z < 1 ? 'visible' : 'hidden';
    });
  });

  return null;
}
