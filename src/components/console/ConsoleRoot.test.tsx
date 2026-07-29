/**
 * THE PHASE 4 ACCEPTANCE TEST.
 *
 * Pin `t` and assert the console matches CLAUDE.md §2's row for that beat. Run it
 * after every subsequent phase — especially the seek-backwards case at the bottom,
 * which is the real proof that nothing accumulates state.
 *
 * Assertions are written against RENDERED TEXT rather than test ids, because what
 * matters is what a judge reads on the projector, not what the DOM is called.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useDemoClock } from '@/store/demoClock';
import { useSession } from '@/store/session';
import { ConsoleRoot } from './ConsoleRoot';

/** Whole-console text, whitespace-normalised. */
function textAt(t: number, approved = false): string {
  useDemoClock.setState({ t, approved, playing: false, viewOverride: null });
  const { container } = render(<ConsoleRoot />);
  return (container.textContent ?? '').replace(/\s+/g, ' ');
}

beforeEach(() => {
  // These describe DEMO mode — the scripted 90 seconds. Live mode is the
  // default now, so the tests state which world they are asserting about.
  useSession.setState({ mode: 'demo' });
  useDemoClock.setState({
    t: 0, playing: false, speed: 1, approved: false, viewOverride: null, debug: false,
  });
});
afterEach(cleanup);

describe('t = 0..6 — at rest (§2 row 1)', () => {
  it('shows a nominal fleet and no detail', () => {
    const text = textAt(0);
    expect(text).toMatch(/SURYA\s*AGENT/);
    expect(text).toContain('94');            // farm health
    expect(text).toMatch(/364\s*MW/);         // C2 — not 412
    expect(text).toContain('NO ARRAY SELECTED');
    expect(text).not.toContain('B-17-S3');
    expect(text).not.toContain('APPROVE');
  });

  it('counts 2 anomalies and 0 critical, derived from panel status (C11)', () => {
    const text = textAt(0);
    expect(text).toMatch(/Anomalies\s*2\s*Critical 0/i);
  });
});

describe('t = 12 — triage (§2 row 3)', () => {
  it('binds each deviation to exactly one object (C3 / C10)', () => {
    const text = textAt(12);
    expect(text).toContain('−58.4 %');   // the faulted STRING
    expect(text).toContain('−41.7 %');  // the ARRAY containing it
    expect(text).toContain('15.02 kW');
    expect(text).toContain('36.10 kW');
  });

  it('opens the detail panel on B-17 and names the string', () => {
    const text = textAt(12);
    expect(text).toContain('PANEL B-17');
    expect(text).toContain('B-17-S3');
    expect(text).toContain('INV-B');
  });

  it('shows health dropped to 80 and one critical anomaly', () => {
    const text = textAt(12);
    expect(text).toContain('80');
    expect(text).toMatch(/Anomalies\s*3\s*Critical 1/i);
  });

  it('uses a real minus sign, not a hyphen', () => {
    expect(textAt(12)).not.toMatch(/-58\.4/);
  });

  it('does not show evidence or the gate yet', () => {
    const text = textAt(12);
    expect(text).not.toContain('Anomaly matrix');
    expect(text).not.toContain('APPROVE');
  });
});

describe('t = 48..56 — thermal scan (§2 row 8)', () => {
  it('has not started filling at the beat itself', () => {
    expect(textAt(48)).toContain('Anomaly matrix');
  });

  it('fills cell by cell rather than all at once', () => {
    // The defect list only lists cells the scan has reached, so it grows.
    const early = textAt(49).match(/R2 · C/g)?.length ?? 0;
    cleanup();
    const late = textAt(56).match(/R2 · C/g)?.length ?? 0;
    expect(late).toBeGreaterThan(early);
  });

  it('reports the MEASURED band, not the specs invented cells (C13)', () => {
    const text = textAt(56);
    expect(text).toContain('R2 · C3');
    expect(text).toContain('R2 · C6');
    expect(text).toContain('+2.8 °C');
    expect(text).toContain('1 cluster');
    // The spec's fictional pairs must not appear anywhere.
    expect(text).not.toContain('R4 · C5');
    expect(text).not.toContain('+8.0 °C');
  });

  it('states the declared scaling assumption on screen', () => {
    expect(textAt(56)).toContain('not radiometric');
  });
});

describe('t = 80 — recommendation (§2 row 10)', () => {
  it('shows the computed loss and the computed deadline', () => {
    const text = textAt(80);
    expect(text).toContain('3.07 MWh');           // C16 — not 1.44
    expect(text).toContain('ACT BEFORE 14:00');
    expect(text).toContain('72H CLEAR');
  });

  it('ranks B-17 first with the reason visible in the inputs', () => {
    const text = textAt(80);
    expect(text).toContain('INC-B17');
    expect(text).toContain('CRITICAL');
    expect(text).toMatch(/26\.7× ahead of #2/);
  });

  it('arms the human gate but has not fired it', () => {
    const text = textAt(80);
    expect(text).toContain('APPROVE — CREATE WORK ORDER');
    expect(text).not.toContain('WORK ORDER #INC-B17 CREATED');
  });

  it('shows 4 queued tasks — B-17 exists only after the agent creates it', () => {
    expect(textAt(80)).toMatch(/4 tasks/);
    cleanup();
    expect(textAt(12)).toMatch(/3 tasks/);
  });
});

describe('t = 86 — the human gate (§2 row 11)', () => {
  it('creates the work order only after the operator clicks', () => {
    const text = textAt(86, true);
    expect(text).toContain('✓ WORK ORDER #INC-B17 CREATED');
    expect(text).toContain('✓ QUEUED');
  });

  it('returns the queue to 3 pending once B-17 is scheduled', () => {
    expect(textAt(86, true)).toMatch(/3 tasks/);
  });

  it('never claims a work order exists without the click', () => {
    // Same beat, unapproved. This is the claim the whole demo rests on.
    expect(textAt(86, false)).not.toContain('WORK ORDER #INC-B17 CREATED');
  });
});

describe('the seek-backwards guarantee', () => {
  it('renders t=40 identically whether reached forwards or backwards', () => {
    useDemoClock.setState({ t: 0 });
    const forwards = textAt(40);
    cleanup();
    useDemoClock.setState({ t: 90 });
    const backwards = textAt(40);
    expect(backwards).toBe(forwards);
  });

  it('un-reveals sections when seeking back before their beat', () => {
    useDemoClock.setState({ t: 80 });
    render(<ConsoleRoot />);
    expect(screen.getByText(/APPROVE/)).toBeTruthy();
    cleanup();

    const back = textAt(12);
    expect(back).not.toContain('APPROVE');
    expect(back).not.toContain('Anomaly matrix');
  });
});

describe('no number on screen is a literal', () => {
  it('renders figures that only exist in /data', () => {
    // If any of these ever came from a hardcoded string, check:literals would fail
    // the build — these assertions prove the values arrive at all.
    const text = textAt(80);
    expect(text).toMatch(/364\s*MW/);
    for (const figure of ['3.07 MWh', '−58.4 %', '−41.7 %', '14:00']) {
      expect(text).toContain(figure);
    }
  });
});
