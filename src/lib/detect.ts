/**
 * src/lib/detect.ts — running the trained detector, here, on a frame we just took.
 *
 * WHY THIS EXISTS. The box in the cinematic is genuine model output — a real
 * YOLOv8n run on a held-out image, confidence 0.9084 — but it was computed once,
 * offline, and committed. Replayed. And replayed looks exactly like animation to
 * somebody watching, which means the most rigorous thing in this project reads as
 * the least. "Is that cached?" is a question we should not have to answer.
 *
 * So the detector runs in the browser now, on a frame captured from the 3D scene
 * a second earlier. Same weights, exported to ONNX; the runtime changes and
 * nothing else. The answer becomes "watch it".
 *
 * WHAT IS IN THIS FILE and why it is not a library call: the arithmetic either
 * side of the model. ONNX Runtime hands you a tensor in and a tensor out; the
 * letterbox, the normalisation, the transpose, the confidence filter and the
 * non-maximum suppression are yours to get right. Getting them subtly wrong
 * produces plausible boxes in the wrong places, which is worse than no boxes, so
 * every step here is pure and unit-tested against hand-worked cases.
 *
 * NOTHING HERE INVENTS A DETECTION. `decode` returns what the tensor contains and
 * nothing else; there is no fallback, no "expected" box, no seeding from the crack
 * path the scene already knows about. An empty result is a real result.
 */

/** The size the model was exported at. Must match `imgsz` in the Colab export. */
export const LETTERBOX_SIZE = 640;

/** Below this a detection is not shown. */
export const CONFIDENCE_FLOOR = 0.25;

/** Boxes overlapping more than this are treated as the same object. */
export const NMS_IOU = 0.45;

export interface Detected {
  /** The model's own class name, from the committed class list. */
  label: string;
  /** Class index as the model returned it. */
  classId: number;
  confidence: number;
  /** Box in ORIGINAL image pixels: [x, y, width, height]. */
  box: [number, number, number, number];
}

/**
 * How a source image was fitted into the model's square input.
 *
 * YOLO wants 640x640 and photographs are not square. Squashing them would distort
 * every aspect ratio the model learned, so the image is scaled to fit and the
 * remainder is padded — and every box the model returns then has to be un-padded
 * and un-scaled to land back on the original pixels. Keeping that transform as a
 * value rather than recomputing it is what stops the two halves disagreeing.
 */
export interface Letterbox {
  scale: number;
  padX: number;
  padY: number;
  sourceW: number;
  sourceH: number;
}

export function letterboxFor(sourceW: number, sourceH: number, size = LETTERBOX_SIZE): Letterbox {
  const scale = Math.min(size / sourceW, size / sourceH);
  return {
    scale,
    padX: (size - sourceW * scale) / 2,
    padY: (size - sourceH * scale) / 2,
    sourceW,
    sourceH,
  };
}

/** A model-space box back to original-image pixels. */
export function unletterbox(
  cx: number, cy: number, w: number, h: number, lb: Letterbox,
): [number, number, number, number] {
  const x = (cx - w / 2 - lb.padX) / lb.scale;
  const y = (cy - h / 2 - lb.padY) / lb.scale;
  return [x, y, w / lb.scale, h / lb.scale];
}

/** Intersection over union of two [x, y, w, h] boxes. */
export function iou(
  a: [number, number, number, number],
  b: [number, number, number, number],
): number {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  const overlap = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a[2] * a[3] + b[2] * b[3] - overlap;
  return union > 0 ? overlap / union : 0;
}

/**
 * Greedy non-maximum suppression.
 *
 * The model proposes 8400 boxes for every image and most of them are the same
 * object seen from neighbouring anchor cells. Without this the console draws forty
 * overlapping rectangles round one crack and looks broken.
 */
export function nms(dets: Detected[], threshold = NMS_IOU): Detected[] {
  const sorted = [...dets].sort((a, b) => b.confidence - a.confidence);
  const kept: Detected[] = [];
  for (const d of sorted) {
    if (kept.some((k) => k.classId === d.classId && iou(k.box, d.box) > threshold)) continue;
    kept.push(d);
  }
  return kept;
}

/**
 * Turn YOLOv8's output tensor into detections.
 *
 * THE SHAPE IS THE TRAP. v8 emits `[1, 4 + numClasses, numAnchors]` — the
 * TRANSPOSE of what v5 emitted and of what most example code expects — and there
 * is no objectness column: the class score IS the confidence. Reading it as
 * `[1, numAnchors, 4 + numClasses]` produces boxes that are plausible, wrong, and
 * completely silent about it, which is exactly the failure mode this project
 * cares most about.
 *
 * @param data     the flat output tensor
 * @param channels `4 + numClasses`
 * @param anchors  number of proposals
 */
export function decode(
  data: Float32Array | number[],
  channels: number,
  anchors: number,
  classNames: readonly string[],
  lb: Letterbox,
  floor = CONFIDENCE_FLOOR,
): Detected[] {
  const numClasses = channels - 4;
  const out: Detected[] = [];

  for (let a = 0; a < anchors; a += 1) {
    // Channel-major: value for channel c at anchor a is data[c * anchors + a].
    let best = -1;
    let bestScore = 0;
    for (let c = 0; c < numClasses; c += 1) {
      const score = data[(4 + c) * anchors + a];
      if (score > bestScore) { bestScore = score; best = c; }
    }
    if (best < 0 || bestScore < floor) continue;

    const cx = data[0 * anchors + a];
    const cy = data[1 * anchors + a];
    const w = data[2 * anchors + a];
    const h = data[3 * anchors + a];

    out.push({
      // The model's own label, from the committed class list, never a friendlier
      // rewrite. Two of these are Turkish and they stay that way — renaming a
      // class describes a model that does not exist.
      label: classNames[best] ?? `class ${best}`,
      classId: best,
      confidence: bestScore,
      box: unletterbox(cx, cy, w, h, lb),
    });
  }

  return nms(out);
}

/**
 * The class this product actually talks about.
 *
 * The detector has five classes and only one of them reaches the UI, exactly as in
 * the committed run. A `Good` or `Saglam` box on screen would be true and
 * meaningless.
 */
export const ON_SCREEN_CLASS = 'Cracked';

export const crackedOnly = (dets: Detected[]): Detected[] =>
  dets.filter((d) => d.label === ON_SCREEN_CLASS);
