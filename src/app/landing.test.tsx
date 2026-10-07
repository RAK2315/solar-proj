/**
 * The landing page says only what the model can back.
 *
 * jsdom has no WebGL, so this is the page a visitor without it gets: the still
 * frame behind the glass. That is the fallback the plan asks for, and it is the
 * one this test can actually see.
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import * as N from '@/app/numbers';
import { Landing } from '@/components/landing/Landing';
import { cellGrid, repairQueue } from '@/lib/data';
import { MW, MWh, pct } from '@/lib/format';
import { TARIFF_ARITHMETIC, lostRevenue } from '@/lib/money';
import { priorityScore, rankQueue } from '@/lib/ranking';

afterEach(cleanup);

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ');

describe('the landing page', () => {
  it('leads with the product\u2019s claim and one way in', () => {
    const { container } = render(<Landing />);
    expect(container.querySelector('h1')?.textContent).toBe('The plan, not the picture.');
    // The way in is offered more than once down the page; the hero's is the one that names it.
    const hero = container.querySelector('.lp-hero a[href="/console"]');
    expect(hero?.textContent).toBe('Open the console');
    expect(container.querySelectorAll('a[href="/console"]').length).toBeGreaterThan(1);
  });

  it('prints every figure from the model, not from the page', () => {
    const { container } = render(<Landing />);
    const stats = text(container.querySelector('.lp-stats') as Element);
    expect(stats).toContain(MW(N.OUTPUT_MW));
    expect(stats).toContain(pct(N.ARRAY_DEVIATION_PCT));
    expect(stats).toContain(MWh(N.LOSS_72H_MWH));
    expect(stats).toContain(N.ACT_BEFORE);
    expect(stats).toContain(`${N.FAULTED_STRING_COUNT} of ${N.STRINGS} strings`);
  });

  it('reports the detector by class and with its split, or not at all', () => {
    const { container } = render(<Landing />);
    const stats = text(container.querySelector('.lp-stats') as Element);
    if (N.CRACKED_AP50 === null) expect(stats).not.toContain('AP@50');
    else {
      expect(stats).toContain(N.CRACKED_AP50.toFixed(3));
      expect(stats).toContain(`${N.DETECTOR_SPLIT} split`);
    }
  });

  it('cites the source of the one claim that is not its own arithmetic', () => {
    const { container } = render(<Landing />);
    const source = container.querySelector('a.src');
    expect(source?.getAttribute('href')).toContain('osti.gov');
    // A Turbine Logic and EPRI paper hosted on OSTI. It is not an NREL paper.
    expect(source?.textContent).toContain('EPRI');
    expect(text(source?.closest('li') as Element)).not.toContain('NREL');
  });

  it('shows a still of the scene where the browser cannot draw it', () => {
    const { container } = render(<Landing />);
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('.sy-landscene img')?.getAttribute('src')).toBe('/landing/still.jpg');
  });

  it('names all eight steps of the loop, ending at a person', () => {
    const { container } = render(<Landing />);
    const steps = [...container.querySelectorAll('.loop li')].map((li) => text(li));
    expect(steps).toHaveLength(8);
    expect(steps[7]).toContain('Human approval');
  });

  it('ranks the committed queue by the one function, with its arithmetic', () => {
    const { container } = render(<Landing />);
    const rows = [...container.querySelectorAll('.lp-sum li')].map((li) => text(li));
    expect(rows).toHaveLength(repairQueue.length);
    const ranked = rankQueue(repairQueue);
    expect(rows[0]).toContain(ranked[0].panelId);
    expect(rows[0]).toContain(priorityScore(ranked[0]).toFixed(2));
  });

  it('draws the measured cell grid, and only its hot cells as hot', () => {
    const { container } = render(<Landing />);
    const cells = [...container.querySelectorAll('.lp-matrix i')];
    expect(cells).toHaveLength(cellGrid.rows * cellGrid.cols);
    expect(cells.filter((c) => c.getAttribute('data-hot') === 'true')).toHaveLength(cellGrid.defects.length);
  });

  it('prices the loss at the one tariff, with its arithmetic beside it', () => {
    const { container } = render(<Landing />);
    const money = text(container.querySelector('.lp-money') as Element);
    expect(money).toContain(lostRevenue(N.LOSS_72H_MWH));
    expect(money).toContain(TARIFF_ARITHMETIC);
  });

  it('shows every block where nothing can watch it arrive', () => {
    // jsdom has no IntersectionObserver, which is the case of a browser without one.
    const { container } = render(<Landing />);
    const blocks = [...container.querySelectorAll('[data-reveal]')];
    expect(blocks.length).toBeGreaterThan(10);
    expect(blocks.every((b) => b.getAttribute('data-in') === 'true')).toBe(true);
  });
});
