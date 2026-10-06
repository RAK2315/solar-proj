'use client';

/**
 * FlightOverlay: what the cinematic used to say, said over the twin.
 *
 * While the camera follows a drone: where the mission is, the newest thing that
 * happened, and the detector running on the drone's own frames. The box it draws
 * is wherever the model put it, not wherever the scene knows the module is.
 *
 * THE SAMPLING IS NOT A SECOND CLOCK. It is paced by the flight cue's own
 * position, so it starts and stops with the inspection and rewinds when the
 * operator scrubs. It owns no timer.
 *
 * IT SAMPLES THE VISIBLE-LIGHT HALF ONLY. From the thermal mark the whole frame
 * is mapped through the ironbow LUT, and the detector was trained on photographs:
 * a false-colour frame is not an image it has ever seen.
 */

import { useEffect, useRef } from 'react';

import { DetectionBoxes } from '@/components/overlay/DossierPanels';
import { eventCase } from '@/lib/format';
import { moduleRoi } from '@/lib/roi';
import { M } from '@/lib/scene';
import { useDetector } from '@/store/detector';
import { useFlightCue } from '@/store/flightCue';
import { useFollowingFlight, useMissionLogLine, useStatusPill } from '@/store/selectors';
import { useSession } from '@/store/session';

/** How far apart two live passes may be, in scene seconds. One network run costs
    tens of milliseconds on a single thread, beside a scene holding 60 fps. */
const SAMPLE_EVERY_SCENE_SECONDS = 2.5;
/** The camera eases onto the module after the lock. Sampling before it settles
    would crop a region the module is not in yet. */
const SETTLE_SCENE_SECONDS = 1;

function LiveBoxes() {
  const cue = useFlightCue();
  const detect = useDetector((s) => s.detect);
  const beginPass = useDetector((s) => s.beginPass);
  const busy = useDetector((s) => s.busy);
  const status = useDetector((s) => s.status);
  const last = useDetector((s) => s.last);
  const lastSample = useRef(-Infinity);

  const onStation = cue.active && cue.t >= M.lock + SETTLE_SCENE_SECONDS && cue.t < M.thermal;

  useEffect(() => {
    if (!onStation || busy) return;
    // Never once the model has reported itself absent, or this retries a 404
    // every two and a half seconds for the length of every inspection.
    if (status === 'missing' || status === 'failed') return;
    if (cue.t - lastSample.current < SAMPLE_EVERY_SCENE_SECONDS) return;
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    lastSample.current = cue.t;
    void detect(canvas, {
      panelId: cue.targetId,
      roi: moduleRoi(cue.t, cue.target, canvas.width / canvas.height),
      source: `the drone's camera over ${cue.targetId}`,
      // Filed against the array, so the dossier still has what the drone saw
      // long after it has landed.
      file: true,
    });
  }, [onStation, busy, status, cue.t, cue.targetId, cue.target, detect]);

  // Scrubbing backwards must let it sample again, not sit on a stale mark.
  useEffect(() => { if (!onStation) lastSample.current = -Infinity; }, [onStation]);
  useEffect(() => { if (onStation) beginPass(cue.targetId); }, [onStation, cue.targetId, beginPass]);

  // Only a run this flight made on these pixels. Anything else on screen would
  // be a box the model did not produce from this frame.
  const mine = last && last.panelId === cue.targetId && last.roi
    && last.source.startsWith("the drone's camera") ? last : undefined;
  if (!onStation || status !== 'ready' || !mine?.detections.length || !mine.roi) return null;

  const r = mine.roi;
  return (
    <div
      className="sy-reticle"
      style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }}
    >
      <DetectionBoxes result={mine} showImage={false} />
    </div>
  );
}

export function FlightOverlay() {
  const following = useFollowingFlight();
  const pill = useStatusPill();
  const line = useMissionLogLine();
  const setFollow = useSession((s) => s.setFollowFlight);
  if (!following) return null;

  return (
    <div className="sy-flight">
      <LiveBoxes />
      <div className="sy-flightbar glass" role="status">
        <span className="chip" data-sev="active"><i className="dot" />{eventCase(pill)}</span>
        {line && <span className="says" data-sev={line.severity}>{line.text}</span>}
        <button type="button" className="tool" onClick={() => setFollow(false)}>Back to the field</button>
      </div>
    </div>
  );
}
