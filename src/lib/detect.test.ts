/**
 * The arithmetic either side of the model.
 *
 * ONNX Runtime hands you a tensor in and a tensor out. Everything else — the
 * letterbox, the transpose, the confidence filter, the suppression — is ours, and
 * getting any of it subtly wrong produces boxes that are plausible, wrong, and
 * completely silent about it. That is the worst failure available here, so each
 * step is checked against a case worked by hand.
 */

import { describe, expect, it } from 'vitest';

import {
  CONFIDENCE_FLOOR, LETTERBOX_SIZE, ON_SCREEN_CLASS, crackedOnly, decode, iou,
  letterboxFor, nms, unletterbox, type Detected,
} from './detect';

const CLASSES = ['BakimGereken', 'Cracked', 'Dirty', 'Good', 'Saglam'] as const;

describe('the letterbox', () => {
  it('fits a wide image and pads top and bottom', () => {
    // 1280x720 into 640: scale 0.5, so 640x360 of content and 140 of padding
    // split evenly above and below.
    const lb = letterboxFor(1280, 720);
    expect(lb.scale).toBeCloseTo(0.5, 9);
    expect(lb.padX).toBeCloseTo(0, 9);
    expect(lb.padY).toBeCloseTo(140, 9);
  });

  it('fits a tall image and pads left and right', () => {
    const lb = letterboxFor(720, 1280);
    expect(lb.padX).toBeCloseTo(140, 9);
    expect(lb.padY).toBeCloseTo(0, 9);
  });

  it('leaves a square image alone', () => {
    const lb = letterboxFor(LETTERBOX_SIZE, LETTERBOX_SIZE);
    expect(lb.scale).toBe(1);
    expect(lb.padX).toBe(0);
    expect(lb.padY).toBe(0);
  });

  it('round-trips a box back to the pixels it came from', () => {
    // The half of the transform that decides whether a box lands on the crack or
    // 140 pixels above it.
    const lb = letterboxFor(1280, 720);
    // A box covering the middle quarter of the ORIGINAL image is, in model space,
    // centred at (320, 320) and 320x180 in size.
    const [x, y, w, h] = unletterbox(320, 320, 320, 180, lb);
    expect(x).toBeCloseTo(320, 6);
    expect(y).toBeCloseTo(180, 6);
    expect(w).toBeCloseTo(640, 6);
    expect(h).toBeCloseTo(360, 6);
  });
});

describe('intersection over union', () => {
  it('is 1 for identical boxes and 0 for disjoint ones', () => {
    expect(iou([0, 0, 10, 10], [0, 0, 10, 10])).toBeCloseTo(1, 9);
    expect(iou([0, 0, 10, 10], [50, 50, 10, 10])).toBe(0);
  });

  it('is a third for boxes sharing half their area', () => {
    // Two 10x10 boxes offset by 5 in x: overlap 50, union 150.
    expect(iou([0, 0, 10, 10], [5, 0, 10, 10])).toBeCloseTo(50 / 150, 9);
  });
});

describe('suppression', () => {
  const det = (conf: number, box: [number, number, number, number], classId = 1): Detected => ({
    label: CLASSES[classId], classId, confidence: conf, box,
  });

  it('keeps the strongest of a cluster and drops the rest', () => {
    // The model proposes 8400 boxes and most are the same object from neighbouring
    // anchors. Without this the console draws forty rectangles round one crack.
    const kept = nms([
      det(0.9, [0, 0, 10, 10]),
      det(0.8, [1, 1, 10, 10]),
      det(0.7, [2, 2, 10, 10]),
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0].confidence).toBe(0.9);
  });

  it('keeps genuinely separate objects', () => {
    const kept = nms([det(0.9, [0, 0, 10, 10]), det(0.8, [100, 100, 10, 10])]);
    expect(kept).toHaveLength(2);
  });

  it('never suppresses across classes', () => {
    // A crack and a soiling call on the same panel are two findings, not one.
    const kept = nms([det(0.9, [0, 0, 10, 10], 1), det(0.8, [0, 0, 10, 10], 2)]);
    expect(kept).toHaveLength(2);
  });
});

describe('decoding the output tensor', () => {
  /**
   * Build a YOLOv8-shaped tensor: [1, 4 + numClasses, anchors], CHANNEL-MAJOR.
   * That layout is the trap — v8 emits the transpose of v5, and reading it the
   * other way round yields plausible boxes in the wrong places.
   */
  function tensor(anchors: number, rows: Array<{
    a: number; cx: number; cy: number; w: number; h: number; cls: number; score: number;
  }>): Float32Array {
    const channels = 4 + CLASSES.length;
    const data = new Float32Array(channels * anchors);
    for (const r of rows) {
      data[0 * anchors + r.a] = r.cx;
      data[1 * anchors + r.a] = r.cy;
      data[2 * anchors + r.a] = r.w;
      data[3 * anchors + r.a] = r.h;
      data[(4 + r.cls) * anchors + r.a] = r.score;
    }
    return data;
  }

  const lb = letterboxFor(LETTERBOX_SIZE, LETTERBOX_SIZE);
  const channels = 4 + CLASSES.length;

  it('reads the tensor channel-major, which is what v8 emits', () => {
    const data = tensor(8, [{ a: 3, cx: 320, cy: 320, w: 100, h: 80, cls: 1, score: 0.91 }]);
    const out = decode(data, channels, 8, CLASSES, lb);

    expect(out).toHaveLength(1);
    expect(out[0].label).toBe('Cracked');
    expect(out[0].confidence).toBeCloseTo(0.91, 6);
    // centre-xywh in, corner-xywh out
    expect(out[0].box[0]).toBeCloseTo(270, 6);
    expect(out[0].box[1]).toBeCloseTo(280, 6);
    expect(out[0].box[2]).toBeCloseTo(100, 6);
  });

  it('takes the highest-scoring class, not the first over the floor', () => {
    const anchors = 4;
    const data = new Float32Array(channels * anchors);
    data[0 * anchors + 0] = 100; data[1 * anchors + 0] = 100;
    data[2 * anchors + 0] = 20; data[3 * anchors + 0] = 20;
    data[(4 + 0) * anchors + 0] = 0.40;   // BakimGereken
    data[(4 + 1) * anchors + 0] = 0.88;   // Cracked — the winner
    data[(4 + 2) * anchors + 0] = 0.31;   // Dirty

    const out = decode(data, channels, anchors, CLASSES, lb);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe('Cracked');
    expect(out[0].confidence).toBeCloseTo(0.88, 6);
  });

  it('has NO objectness column — the class score is the confidence', () => {
    // v5 had one and v8 does not. Multiplying by a phantom column would scale
    // every confidence on screen by a number that is not in the tensor.
    const data = tensor(2, [{ a: 0, cx: 10, cy: 10, w: 4, h: 4, cls: 1, score: 0.77 }]);
    expect(decode(data, channels, 2, CLASSES, lb)[0].confidence).toBeCloseTo(0.77, 6);
  });

  it('drops everything under the floor', () => {
    const data = tensor(4, [
      { a: 0, cx: 10, cy: 10, w: 4, h: 4, cls: 1, score: CONFIDENCE_FLOOR - 0.01 },
    ]);
    expect(decode(data, channels, 4, CLASSES, lb)).toHaveLength(0);
  });

  it('returns NOTHING for an empty tensor, and invents no fallback', () => {
    // The load-bearing property of this whole file. An image the model finds
    // nothing in must produce no box — not a guess, not a seeded box from the
    // crack path the 3D scene already knows about.
    const data = new Float32Array(channels * 16);
    expect(decode(data, channels, 16, CLASSES, lb)).toEqual([]);
  });

  it('labels with the model’s own class names, Turkish ones included', () => {
    const data = tensor(2, [{ a: 0, cx: 10, cy: 10, w: 4, h: 4, cls: 4, score: 0.9 }]);
    expect(decode(data, channels, 2, CLASSES, lb)[0].label).toBe('Saglam');
  });
});

describe('what reaches the screen', () => {
  it('is the cracked class only', () => {
    // The detector has five classes and one of them is the finding this product
    // is about. A `Good` box on screen would be true and meaningless.
    const dets: Detected[] = [
      { label: 'Good', classId: 3, confidence: 0.99, box: [0, 0, 5, 5] },
      { label: 'Cracked', classId: 1, confidence: 0.8, box: [9, 9, 5, 5] },
    ];
    const shown = crackedOnly(dets);
    expect(shown).toHaveLength(1);
    expect(shown[0].label).toBe(ON_SCREEN_CLASS);
  });
});
