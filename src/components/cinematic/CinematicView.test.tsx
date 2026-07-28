/**
 * THE PHASE 7 ACCEPTANCE TEST.
 *
 * The claim that matters here is not "the overlays render" — it is that the PiP is
 * the REAL console, driven by the same clock. So the test asserts that content only
 * the console produces (physics-derived numbers) appears inside the cinematic view,
 * and that it CHANGES with `t` in step with the standalone console.
 *
 * If the PiP were ever swapped for a screenshot or a mock, these fail.
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConsoleRoot } from '@/components/console/ConsoleRoot';
import { useDemoClock } from '@/store/demoClock';
import { BEAT } from '@/store/selectors';
import { CinematicView } from './CinematicView';

function textAt(t: number, node: React.ReactElement): string {
  useDemoClock.setState({ t, playing: false, approved: false, viewOverride: null });
  const { container } = render(node);
  const text = (container.textContent ?? '').replace(/\s+/g, ' ');
  cleanup();
  return text;
}

const cine = (t: number) => textAt(t, <CinematicView />);

beforeEach(() => {
  useDemoClock.setState({
    t: 0, playing: false, speed: 1, approved: false, viewOverride: null, debug: false,
  });
});
afterEach(cleanup);

describe('the PiP is the live console, not a picture of one', () => {
  it('carries physics-derived numbers only the console produces', () => {
    const text = cine(50);
    expect(text).toContain('−58.4 %');
    expect(text).toContain('15.02 kW');
    expect(text).toContain('MODULE B2-07');
  });

  it('shows exactly what the standalone console shows at the same t', () => {
    // Not string equality — the cinematic adds overlays. But every piece of console
    // content must be present inside it.
    for (const t of [20, 44, 60, 72]) {
      const consoleText = textAt(t, <ConsoleRoot />);
      const cineText = cine(t);
      for (const fragment of consoleText.split('·').map((s) => s.trim()).filter((s) => s.length > 12)) {
        expect(cineText, `t=${t}: PiP is missing console content`).toContain(fragment);
      }
    }
  });

  it('updates as t advances, so it is live rather than frozen', () => {
    expect(cine(20)).not.toBe(cine(70));
  });

  it('is labelled as a slaved command feed', () => {
    const text = cine(30);
    expect(text).toContain('CMD FEED · OPERATOR');
    expect(text).toContain('SLAVED');
  });
});

describe('mission log', () => {
  it('types the current line and reaches it in full', () => {
    // The dispatch line starts at t=18 and the next one at t=22, so t=21 is
    // squarely inside the first line's window. At exactly t=22 the new line has
    // typed zero characters — a ~22ms blank between captions, which is the
    // typewriter being an honest function of t rather than a bug.
    expect(cine(21)).toContain('Anomaly detected');
  });

  it('shows the transit line during transit, not before', () => {
    expect(cine(24)).not.toContain('Drone reaching Zone B');
    expect(cine(33)).toContain('Drone reaching Zone B');
  });

  it('un-types when seeking backwards — proof it is a function of t', () => {
    const early = cine(BEAT.transit + 0.2);
    const later = cine(BEAT.transit + 3);
    expect(later.length).toBeGreaterThan(early.length);
  });
});

describe('status pill hard-cuts through the mission states', () => {
  it.each([
    [BEAT.dispatch, 'ANOMALY DETECTED'],
    [BEAT.transit, 'FLYING TO ZONE B'],
    [BEAT.targetLock, 'TARGET LOCK — B-17'],
    [BEAT.rgbScan, 'INSPECTING B-17'],
    [BEAT.thermalScan, 'THERMAL SCAN'],
    [BEAT.thermalDone, 'SURYA ANALYZING'],
    [BEAT.prognosis, 'RECOMMENDATION READY'],
  ])('reads %s at t=%s', (t, label) => {
    expect(cine(t as number)).toContain(label as string);
  });

  it('is correct the instant you seek, without passing through prior states', () => {
    useDemoClock.setState({ t: 0 });
    expect(cine(BEAT.thermalScan)).toContain('THERMAL SCAN');
  });
});

describe('timecode counts from the cut, not from demo zero', () => {
  it('is T+00:00 at the cut and T+00:16 at target lock', () => {
    expect(cine(BEAT.dispatch)).toContain('T+00:00');
    expect(cine(BEAT.targetLock)).toContain('T+00:16');
  });

  it('shows REC and LIVE', () => {
    const text = cine(30);
    expect(text).toContain('REC');
    expect(text).toContain('LIVE');
  });
});

describe('target reticle claims only what was measured', () => {
  it('does not appear before target lock', () => {
    expect(cine(BEAT.targetLock - 1)).not.toContain('B-17 —');
  });

  it('never shows the specs placeholder confidence', () => {
    // I11 blocks 0.84 in the data; this blocks it reaching the screen another way.
    for (const t of [40, 48, 56, 70]) {
      expect(cine(t)).not.toContain('(0.84)');
    }
  });

  it('says what is true when no detection exists yet', () => {
    // Until the Colab run lands there is nothing to claim, so it says so rather
    // than borrowing a number.
    expect(cine(BEAT.rgbScan + 1)).toContain('B-17 —');
  });
});
