'use client';

/**
 * LiveReticle — the detector running over the drone's camera, during the flight.
 *
 * WHAT THIS REPLACES CONCEPTUALLY. `TargetReticle` draws the COMMITTED detection:
 * a box at a bbox and a confidence recorded months ago, positioned by projecting
 * the array's world coordinates. Every number in it is real and none of it is
 * happening. Asked directly why the detection looked like an animation, that is
 * the honest answer — it is a replay, and a replay of a measurement looks exactly
 * like a drawing of one.
 *
 * So while the aircraft is on station, this samples the WebGL canvas the scene is
 * rendering into — the drone's actual camera — and runs the exported network on
 * it. The box that appears is wherever the model says, not wherever the array is.
 *
 * IT SAMPLES THE RGB PASS AND NOT THE THERMAL ONE, and that is not a detail. The
 * inspection has two halves: from the target lock the camera sees the module as it
 * is, and from `M.thermal` a post-process maps the whole frame through the ironbow
 * LUT. The detector was trained on ground-level PHOTOGRAPHS. Handing it a
 * false-colour thermal frame is asking it to find a crack in a picture that has
 * been recoloured purple, and the first version of this did exactly that — filed a
 * magenta frame against the array and reported, quite correctly, that the model
 * found nothing in it.
 *
 * IT IS DELIBERATELY SLOW. One pass every couple of seconds, never overlapping,
 * because a 640x640 convolutional network on a single WebAssembly thread costs
 * tens of milliseconds and the scene is trying to hold 60fps beside it. The RGB
 * window is 14 seconds of scene time; a handful of real detections across it is
 * the point, not a frame rate.
 *
 * NOT A SECOND CLOCK. The sampling is driven by the flight cue's own position —
 * the same seam the whole cinematic reads — so it starts and stops with the
 * inspection and rewinds when the operator scrubs. It owns no timer.
 *
 * ABSENT MEANS ABSENT. With no exported model it renders nothing at all and the
 * committed reticle keeps doing its job. It never draws a box it did not get from
 * the model, and it never falls back to the crack path the scene already knows.
 */

import { useEffect, useRef } from 'react';

import { DetectionFrame } from '@/components/console/DetectionFrame';
import { M, reticleRect, type Vec3 } from '@/lib/scene';
import { useFlightCue } from '@/store/flightCue';
import { useDetector, type DetectorResult, type Roi } from '@/store/detector';

/** How far apart two live passes may be, in scene seconds. */
const SAMPLE_EVERY_SCENE_SECONDS = 2.5;

/**
 * Margin around the module, as a fraction of its own projected size.
 *
 * Small on purpose. Scored offline on a real capture: tight on the module,
 * Cracked 0.92; the same frame with generous margin, 0.81; the whole frame,
 * nothing at all. The training images are one panel filling the picture.
 */
const MODULE_MARGIN = 0.06;

/**
 * The region of the drone's camera to hand the model: the module, with a margin.
 *
 * EXPORTED because there are two callers and they were not using the same crop.
 * The flight's own sampling cropped to the module; the operator's "run it on this
 * live frame" button handed over the entire viewfinder — which is precisely the
 * input this file records as returning Saglam 0.94 and no cracked box. One press
 * then replaced the pass's good capture with a whole-frame miss.
 *
 * Cropping changes WHICH PIXELS the model is asked about, never what it says
 * about them.
 */
export function moduleRoi(t: number, target: Vec3): Roi | undefined {
  const r = reticleRect(t, target);
  if (!r.visible || r.width <= 0.02 || r.height <= 0.02) return undefined;
  const padX = r.width * MODULE_MARGIN;
  const padY = r.height * MODULE_MARGIN;
  const x = Math.max(0, r.left - padX);
  const y = Math.max(0, r.top - padY);
  return {
    x,
    y,
    // Clamped against the origin, not independently of it: `w` capped at 1 while
    // `x` sat at 0.6 described a region running off the right of the frame.
    w: Math.min(1 - x, r.width + padX * 2),
    h: Math.min(1 - y, r.height + padY * 2),
  };
}

/**
 * The run that belongs to THIS flight, or nothing.
 *
 * `last` is whatever ran most recently anywhere — including the operator pressing
 * "reproduce the committed 0.91" while the aircraft is on station, which carries
 * no ROI and would be drawn across the whole viewfinder as though the model had
 * found a crack in the scene. That is a box the model did not produce from these
 * pixels, which is the one thing this file exists not to do.
 */
function flightsOwnRun(
  last: DetectorResult | undefined,
  targetId: string,
): DetectorResult | undefined {
  return last && last.panelId === targetId && last.roi
    && last.source.startsWith("the drone's camera")
    ? last : undefined;
}

/**
 * Whether this flight's own boxes are on screen right now.
 *
 * Exported so ViewfinderNotes captions the boxes without re-deriving the rule.
 * A caption explaining a rectangle that is not there is the clutter problem
 * again, not a fix for it.
 */
export function useLiveBoxes(): boolean {
  const cue = useFlightCue();
  const status = useDetector((s) => s.status);
  const last = useDetector((s) => s.last);
  const onStation = cue.active && cue.t >= M.lock && cue.t < M.thermal;
  return onStation && status === 'ready'
    && !!flightsOwnRun(last, cue.targetId)?.detections.length;
}

export function LiveReticle() {
  const cue = useFlightCue();
  const detect = useDetector((s) => s.detect);
  const busy = useDetector((s) => s.busy);
  const status = useDetector((s) => s.status);
  const last = useDetector((s) => s.last);
  const lastSampleRef = useRef(-Infinity);

  // The RGB half of the pass: from the target lock until the thermal LUT comes
  // on. After `M.thermal` the frame is false-coloured and no longer the kind of
  // image this model has ever seen.
  const onStation = cue.active && cue.t >= M.lock && cue.t < M.thermal;

  useEffect(() => {
    if (!onStation || busy) return;
    // Never after the model has reported itself absent — otherwise this retries a
    // 404 every two and a half seconds for the length of every inspection.
    if (status === 'missing' || status === 'failed') return;
    if (cue.t - lastSampleRef.current < SAMPLE_EVERY_SCENE_SECONDS) return;

    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    lastSampleRef.current = cue.t;

    // CROP TO THE MODULE, with margin. The scene already knows where the module
    // is on screen — it is what the reticle brackets are drawn from — and the
    // detector was trained on photographs of one panel filling the frame. Handing
    // it a wide shot of six modules at an angle leaves each one about eighty
    // pixels across after the letterbox, which is not the problem it learned.
    //
    // This changes WHICH PIXELS the model is asked about, never what it says
    // about them.
    const roi = moduleRoi(cue.t, cue.target);

    // Filed against the array being inspected, so the dossier can show what the
    // drone saw long after the aircraft has landed. `file` is what makes this
    // THE capture for that array — nothing an operator presses later overwrites
    // the frame the aircraft actually brought back.
    void detect(canvas as HTMLCanvasElement, {
      panelId: cue.targetId,
      roi,
      source: `the drone's camera over ${cue.targetId}`,
      file: true,
    });
  }, [onStation, busy, status, cue.t, cue.targetId, cue.target, detect]);

  // Scrubbing backwards must let it sample again rather than sit on a stale mark.
  useEffect(() => {
    if (!onStation) lastSampleRef.current = -Infinity;
  }, [onStation]);

  // A new pass replaces the last one's capture rather than competing with it.
  const beginPass = useDetector((s) => s.beginPass);
  useEffect(() => {
    if (onStation) beginPass(cue.targetId);
  }, [onStation, cue.targetId, beginPass]);

  const mine = flightsOwnRun(last, cue.targetId);

  if (!onStation || status !== 'ready' || !mine?.detections.length) return null;

  // THE BOXES BELONG TO THE CROP, NOT TO THE SCREEN. The model's coordinates are
  // in the pixels of the region it was handed; drawing them across the whole
  // viewfinder stretched a box over most of the picture.
  const r = mine.roi ?? { x: 0, y: 0, w: 1, h: 1 };

  return (
    <div style={{
      position: 'absolute',
      left: `${r.x * 100}%`,
      top: `${r.y * 100}%`,
      width: `${r.w * 100}%`,
      height: `${r.h * 100}%`,
      pointerEvents: 'none',
      zIndex: 6,
    }}>
      {/* The boxes only — the live scene underneath IS the image. The mapping from
          the model's pixels to the screen is DetectionFrame's job, and it needs
          the frame's own size to do it: dividing by the window, as this did at
          first, put every box in roughly the right area and slightly the wrong
          place, which is the most misleading kind of wrong a box can be. */}
      <DetectionFrame result={mine} showImage={false} />
    </div>
  );
}
