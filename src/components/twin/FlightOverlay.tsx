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

import { DetectionBoxes } from '@/components/overlay/DossierPanels';
import { eventCase } from '@/lib/format';
import { M } from '@/lib/scene';
import { useDetector } from '@/store/detector';
import { useFlightCue } from '@/store/flightCue';
import { useFollowingFlight, useMissionLogLine, useStatusPill } from '@/store/selectors';
import { useSession } from '@/store/session';

/** The camera eases onto the module after the lock. Sampling before it settles
    would crop a region the module is not in yet. */
const SETTLE_SCENE_SECONDS = 1;

function useLiveDetection() {
  const cue = useFlightCue();
  const status = useDetector((s) => s.status);
  const last = useDetector((s) => s.last);
  const filed = useDetector((s) => s.byPanel[cue.targetId]);
  const busy = useDetector((s) => s.busy);
  const run = useDetector((s) => s.run);
  const reason = useDetector((s) => s.reason);

  const onStation = cue.active && cue.t >= M.lock + SETTLE_SCENE_SECONDS && cue.t < M.thermal;

  // Only a run this flight made on these pixels. Anything else on screen would
  // be a box the model did not produce from this frame.
  const mine = last && filed && last.run >= filed.run && last.panelId === cue.targetId && last.roi
    && last.source.startsWith("the drone's camera") ? last : undefined;
  const unavailable = status === 'missing' || status === 'failed' || run === 'failed';
  const text = unavailable ? 'RGB · Detector unavailable'
    : busy ? 'RGB · Analysing camera frame'
      : mine && status === 'ready' ? (mine.detections.length ? 'RGB · Crack detected' : 'RGB · No crack detected')
        : 'RGB · Waiting for camera frame';
  const detail = unavailable ? reason : mine && !mine.detections.length
    ? 'The photo-trained model returned no crack box on this rendered frame. Review the camera capture in Incident.'
    : 'Live model inference on the simulated drone camera. Open Incident to review the captured frame.';
  return { onStation, status, mine, text, detail };
}

function LiveBoxes() {
  const { onStation, status, mine } = useLiveDetection();
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
  const detection = useLiveDetection();
  const setFollow = useSession((s) => s.setFollowFlight);
  if (!following) return null;

  return (
    <div className="sy-flight">
      <LiveBoxes />
      <div className="sy-flightbar glass" role="status">
        <span className="chip" data-sev="active"><i className="dot" />{eventCase(pill)}</span>
        {detection.onStation
          ? <span className="says" title={detection.detail}>{detection.text}</span>
          : line && <span className="says" data-sev={line.severity}>{line.text}</span>}
        <button type="button" className="tool" onClick={() => setFollow(false)}>Back to the field</button>
      </div>
    </div>
  );
}
