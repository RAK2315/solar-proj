'use client';

import { addAfterEffect, useThree } from '@react-three/fiber';
import { useEffect } from 'react';

import { moduleRoi } from '@/lib/roi';
import { M } from '@/lib/scene';
import { useDetector } from '@/store/detector';
import { flightCueNow } from '@/store/flightCue';
import { useSession } from '@/store/session';

// Sampling follows site time, so pausing or scrubbing never starts a second clock.
const SAMPLE_EVERY_SCENE_SECONDS = 2.5;
const SETTLE_SCENE_SECONDS = 1;

export function DetectorCapture() {
  const canvas = useThree((s) => s.gl.domElement);

  useEffect(() => {
    let lastSample = -Infinity;
    let pass: string | null = null;
    // React can commit a clock change before WebGL draws its new camera view.
    // Reading after render keeps the crop and the pixels on the same flight cue.
    return addAfterEffect(() => {
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
      void detector.detect(canvas, {
        panelId: cue.targetId,
        roi: moduleRoi(cue.t, cue.target, canvas.width / canvas.height),
        source: `the drone's camera over ${cue.targetId}`,
        file: true,
      });
    });
  }, [canvas]);

  return null;
}
