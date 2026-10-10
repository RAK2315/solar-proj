'use client';

import { addAfterEffect, useThree } from '@react-three/fiber';
import { useEffect } from 'react';

import { moduleRoi } from '@/lib/roi';
import { M } from '@/lib/scene';
import { useDetector } from '@/store/detector';
import { flightCueNow } from '@/store/flightCue';
import { useSession } from '@/store/session';
import { INSPECTION_ANGLES, inspectionPose, useWorkflow } from '@/hooks/useWorkflow';

// Sampling follows site time, so pausing or scrubbing never starts a second clock.
const SAMPLE_EVERY_SCENE_SECONDS = 2.5;
const SETTLE_SCENE_SECONDS = 1;

export function DetectorCapture() {
  const canvas = useThree((s) => s.gl.domElement);

  useEffect(() => {
    let lastSample = -Infinity;
    let pass: string | null = null;
    let requestKey = '';
    let settling = 0;
    const capture = (panelId: string, t: number, target: Parameters<typeof moduleRoi>[1], angle: string, revision: number) => {
      const siteSeconds = useSession.getState().siteSeconds;
      const source = `the drone's camera over ${panelId} · ${angle} · view ${revision}`;
      // A requested view remains reviewable if inference fails after reading it.
      let fallbackFrame: string | undefined;
      if (angle !== 'Flight pass') {
        try { fallbackFrame = canvas.toDataURL('image/png'); } catch { /* The detector reports an unreadable canvas. */ }
      }
      void useDetector.getState().detect(canvas, {
        panelId, roi: moduleRoi(t, target, canvas.width / canvas.height), source, file: true,
      }).then(() => {
        const detector = useDetector.getState();
        const result = detector.last;
        if (useSession.getState().siteSeconds < siteSeconds) return;
        if (!result || result.source !== source) {
          if (detector.run === 'failed' && fallbackFrame) useWorkflow.getState().record({ panelId, siteSeconds, angle, revision,
            outcome: 'failed', result: { panelId, source, frame: fallbackFrame, frameSize: [canvas.width, canvas.height],
              run: detector.runs + 1, at: Date.now(), elapsedMs: 0, detections: [] } });
          return;
        }
        useWorkflow.getState().record({ panelId, siteSeconds, angle, revision, result,
          outcome: detector.run === 'done' ? 'result' : detector.run === 'failed' ? 'failed' : 'unavailable' });
      });
    };
    // React can commit a clock change before WebGL draws its new camera view.
    // Reading after render keeps the crop and the pixels on the same flight cue.
    return addAfterEffect(() => {
      const held = inspectionPose();
      if (held) {
        const key = `${held.panelId}/${held.revision}/${held.request}`;
        if (key !== requestKey) { requestKey = key; settling = 0; }
        if (!held.request || held.mode !== 'rgb' || useDetector.getState().busy || settling > 2) return;
        settling += 1;
        if (settling !== 2) return;
        settling = 3;
        capture(held.panelId, held.t, held.target, INSPECTION_ANGLES[held.angle].label, held.revision);
        return;
      }
      const cue = flightCueNow();
      const onStation = useSession.getState().followFlight && cue.active
        && cue.t >= M.lock + SETTLE_SCENE_SECONDS && cue.t < M.thermal;
      if (!onStation) {
        lastSample = -Infinity;
        pass = null;
        return;
      }
      const detector = useDetector.getState();
      const key = `${cue.droneId}:${cue.targetId}`;
      if (pass !== key || cue.t < lastSample) {
        pass = key;
        lastSample = -Infinity;
        detector.beginPass(cue.targetId);
      }
      // An unavailable model should not retry throughout every inspection.
      if (detector.busy || detector.status === 'missing' || detector.status === 'failed') return;
      if (cue.t - lastSample < SAMPLE_EVERY_SCENE_SECONDS) return;
      lastSample = cue.t;
      capture(cue.targetId, cue.t, cue.target, 'Flight pass', cue.t);
    });
  }, [canvas]);

  return null;
}
