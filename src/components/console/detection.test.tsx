/**
 * THE DETECTOR PANEL — the two controls that ran and showed nothing for it.
 *
 * "Run the detector on this captured frame" was reported as dead. It was not: it
 * ran in 298 ms and returned the same answer on the same pixels, and its only
 * visible trace was a millisecond count below a full-width photograph, off the
 * bottom of the screen. "Verify — reproduce the committed 0.91" was genuinely
 * dead once a drone had flown, because the panel read the flight's filed capture
 * and nothing else.
 *
 * These assert the values that change, never the headings around them.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { panelTexture } from '@/lib/data';
import type { Detected } from '@/lib/detect';
import { useDetector, type DetectorResult } from '@/store/detector';
import { useSession } from '@/store/session';
import { LiveDetection } from './LiveDetection';

const FRAME = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const box = (confidence: number): Detected => ({
  label: 'Cracked', classId: 1, confidence, box: [0, 0, 10, 10],
});

function result(over: Partial<DetectorResult>): DetectorResult {
  return {
    detections: [], elapsedMs: 300, frame: FRAME, frameSize: [100, 100],
    run: 1, at: Date.now(), source: 'a frame', ...over,
  };
}

function textOf(): string {
  const { container } = render(<LiveDetection />);
  const text = (container.textContent ?? '').replace(/\s+/g, ' ');
  cleanup();
  return text;
}

beforeEach(() => {
  useSession.setState({ mode: 'live', selectedPanelId: 'B-17' });
  useDetector.setState({
    status: 'ready', run: 'done', busy: false, byPanel: {}, framesInPass: {},
    log: [], runs: 0, last: undefined, reason: undefined,
  });
});
afterEach(cleanup);

describe('a repeat run is visible as a repeat run', () => {
  it('lists every completed run with its own inference time', () => {
    useDetector.setState({
      runs: 2,
      log: [
        { run: 2, at: Date.now(), elapsedMs: 298, found: 0, source: 'the captured frame for B-17, run again', frameHash: 'aaa' },
        { run: 1, at: Date.now(), elapsedMs: 520, found: 0, source: "the drone's camera over B-17", frameHash: 'bbb' },
      ],
      last: result({ run: 2, elapsedMs: 298, panelId: 'B-17' }),
    });
    const text = textOf();
    expect(text).toContain('run 2');
    expect(text).toContain('298 ms');
    expect(text).toContain('run 1');
    expect(text).toContain('520 ms');
  });

  it('says the same answer on the same pixels is the point', () => {
    const source = 'the captured frame for B-17, run again';
    useDetector.setState({
      runs: 2,
      log: [
        { run: 2, at: Date.now(), elapsedMs: 298, found: 0, source, frameHash: 'same' },
        { run: 1, at: Date.now(), elapsedMs: 305, found: 0, source, frameHash: 'same' },
      ],
      last: result({ run: 2, panelId: 'B-17' }),
    });
    expect(textOf()).toContain('same pixels as the run above it');
  });

  // The pass fires several runs under one label while the camera orbits, and the
  // caption used to compare that label. It sat above three different answers.
  it('does not claim the same pixels when only the label matches', () => {
    const source = "the drone's camera over B-17";
    useDetector.setState({
      runs: 2,
      log: [
        { run: 2, at: Date.now(), elapsedMs: 232, found: 0, source, frameHash: 'later' },
        { run: 1, at: Date.now(), elapsedMs: 232, found: 2, source, frameHash: 'earlier' },
      ],
      last: result({ run: 2, panelId: 'B-17' }),
    });
    expect(textOf()).not.toContain('same pixels as the run above it');
  });

  it('shows the ledger above the frame, not below it', () => {
    useDetector.setState({
      runs: 1,
      log: [{ run: 1, at: Date.now(), elapsedMs: 298, found: 0, source: 'a frame', frameHash: 'a' }],
      last: result({ panelId: 'B-17' }),
    });
    render(<LiveDetection />);
    const ledger = screen.getByText(/run 1 ·/);
    const frame = screen.getByAltText(/detector was run on/i);
    // 4 === Node.DOCUMENT_POSITION_FOLLOWING: the frame comes after the ledger.
    expect(ledger.compareDocumentPosition(frame) & 4).toBeTruthy();
  });
});

describe('the panel shows the pass its best frame, not its last', () => {
  /**
   * A sortie runs the detector several times as the camera orbits, and the last
   * sample is often the worst: the panel reported 0.27 from run 6 while run 3 of
   * the same pass had returned 0.89 and was already filed by `better()`.
   */
  it('prefers the filed capture over a weaker later sample from the same pass', () => {
    useDetector.setState({
      runs: 6,
      byPanel: { 'B-17': result({ run: 3, detections: [box(0.89)], panelId: 'B-17',
        source: "the drone's camera over B-17" }) },
      last: result({ run: 6, detections: [box(0.27)], panelId: 'B-17',
        source: "the drone's camera over B-17" }),
    });
    const text = textOf();
    expect(text).toContain('0.89');
    expect(text).not.toContain('0.27');
  });

  // But a person pressing a button must see their own run, whatever it says.
  it('still shows an operator run that found less than the pass did', () => {
    useDetector.setState({
      runs: 7,
      byPanel: { 'B-17': result({ run: 3, detections: [box(0.89)], panelId: 'B-17',
        source: "the drone's camera over B-17" }) },
      last: result({ run: 7, detections: [box(0.31)], panelId: 'B-17',
        source: 'the committed evidence photograph' }),
    });
    const text = textOf();
    expect(text).toContain('0.31');
    expect(text).toContain('the committed evidence photograph');
  });
});

describe('the panel shows the run the operator last asked for', () => {
  it('prefers a run about this array over the flight capture it replaces', () => {
    useDetector.setState({
      runs: 2,
      byPanel: { 'B-17': result({ run: 1, detections: [box(0.31)], panelId: 'B-17' }) },
      last: result({
        run: 2, detections: [box(0.91)], panelId: 'B-17',
        source: 'the committed evidence photograph',
      }),
    });
    const text = textOf();
    expect(text).toContain('0.91');
    expect(text).not.toContain('0.31');
    expect(text).toContain('the committed evidence photograph');
  });

  it('keeps the flight capture when the last run was about another array', () => {
    useDetector.setState({
      runs: 2,
      byPanel: { 'B-17': result({ run: 1, detections: [box(0.31)], panelId: 'B-17' }) },
      // Not 0.91: that is the committed figure, printed on the Verify control.
      last: result({ run: 2, detections: [box(0.77)], panelId: 'C-07' }),
    });
    const text = textOf();
    expect(text).toContain('0.31');
    expect(text).not.toContain('0.77');
  });
});

describe('the box is not claimed to be more than it is', () => {
  it('says the box covers the module rather than the fracture', () => {
    useDetector.setState({
      runs: 1,
      last: result({ run: 1, detections: [box(0.88)], panelId: 'B-17' }),
    });
    const text = textOf();
    expect(text).toContain('0.88');
    expect(text).toContain('the box covers the whole module'.replace('the', 'The'));
    expect(text).toContain('labels the panel, not the fracture');
  });
});

describe('a pass keeps its clearest frame, and says how many it chose from', () => {
  it('names the number of frames the drone took', () => {
    useDetector.setState({
      runs: 1,
      framesInPass: { 'B-17': 5 },
      byPanel: { 'B-17': result({ detections: [box(0.88)], panelId: 'B-17' }) },
    });
    expect(textOf()).toContain('the clearest of 5 frames');
  });

  it('does not claim a choice when the pass took one frame', () => {
    useDetector.setState({
      runs: 1,
      framesInPass: { 'B-17': 1 },
      byPanel: { 'B-17': result({ panelId: 'B-17' }) },
    });
    const text = textOf();
    expect(text).toContain('captured on the pass');
    expect(text).not.toContain('clearest of');
  });

  it('a new pass discards the previous sortie’s capture', () => {
    useDetector.setState({
      framesInPass: { 'B-17': 4 },
      byPanel: { 'B-17': result({ detections: [box(0.88)], panelId: 'B-17' }) },
    });
    useDetector.getState().beginPass('B-17');
    expect(useDetector.getState().byPanel['B-17']).toBeUndefined();
    expect(useDetector.getState().framesInPass['B-17']).toBe(0);
  });
});

describe('the photographed module surface is declared, and is not the test image', () => {
  it('says on screen that the modules are textured with photographs', () => {
    useDetector.setState({
      runs: 1,
      framesInPass: { 'B-17': 3 },
      byPanel: { 'B-17': result({ panelId: 'B-17' }) },
    });
    expect(textOf()).toContain('textured with photographs of real panels');
  });

  it('claims nothing about an array no drone has been over', () => {
    // `CrackedPanel` textures the flight target. An array that was never
    // inspected carries no photograph, so it must not be described as carrying
    // one — the array-scoping mistake this project keeps making.
    useDetector.setState({
      runs: 1, last: result({ panelId: 'B-17', source: 'the committed evidence photograph' }),
    });
    expect(textOf()).not.toContain('textured with photographs of real panels');
  });

  it('never textures the scene with the frame the committed detection was measured on', () => {
    for (const role of ['cracked', 'intact'] as const) {
      expect(panelTexture(role)?.sourceImage).not.toContain('IMG_0429');
    }
  });

  it('does not put a texture our own weights call cracked on the healthy module', () => {
    expect(panelTexture('intact')?.detectorOnTexture?.label).not.toBe('Cracked');
    expect(panelTexture('cracked')?.detectorOnTexture?.label).toBe('Cracked');
  });
});
