/**
 * The landing page says only what the model can back.
 *
 * jsdom has no WebGL, so this is the page a visitor without it gets: the still
 * frame behind the glass. That is the fallback the plan asks for, and it is the
 * one this test can actually see.
 */

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as N from '@/app/numbers';
import { Landing } from '@/components/landing/Landing';
import { cellGrid, repairQueue } from '@/lib/data';
import { MW, MWh, pct } from '@/lib/format';
import { TARIFF_ARITHMETIC, lostRevenue } from '@/lib/money';
import { priorityScore, rankQueue } from '@/lib/ranking';
import { useSession } from '@/store/session';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useSession.setState({ theme: 'dark' });
});

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ');

describe('the landing page', () => {
  it('leads with the product\u2019s claim and one way in', () => {
    const { container } = render(<Landing />);
    expect(container.querySelector('h1')?.textContent).toBe('See the fault. Own the next move.');
    // The way in is offered more than once down the page; the hero's is the one that names it.
    const hero = container.querySelector('.lp-hero a[href="/console"]');
    expect(hero?.textContent).toBe('Open the console');
    expect(container.querySelectorAll('a[href="/console"]').length).toBeGreaterThan(1);
  });

  it('explores the reference case without dispatching a flight', () => {
    const { getByRole, container } = render(<Landing />);
    fireEvent.click(getByRole('button', { name: 'Prioritise' }));
    expect(text(container.querySelector('.lp-mission-reading') as Element)).toContain(N.ACT_BEFORE);
    expect(getByRole('button', { name: 'Prioritise' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(getByRole('button', { name: 'Inspect' }));
    expect(text(container.querySelector('.lp-mission-reading') as Element)).toContain('does not launch a flight');
    expect(text(container.querySelector('.lp-disclosure') as Element)).toContain('Simulated telemetry');
  });

  it('switches product captures and their accessible descriptions together', () => {
    const { getByRole } = render(<Landing />);
    fireEvent.click(getByRole('tab', { name: 'Sandbox' }));
    expect(getByRole('tab', { name: 'Sandbox' }).getAttribute('aria-selected')).toBe('true');
    expect(getByRole('tabpanel').getAttribute('aria-labelledby')).toBe('tab-sandbox');
    expect(getByRole('img', { name: /The Sandbox screen/ }).getAttribute('src')).toBe('/landing/tour/sandbox.jpg');
    fireEvent.keyDown(getByRole('tab', { name: 'Sandbox' }), { key: 'End' });
    expect(getByRole('tab', { name: 'Analytics' }).getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(getByRole('tab', { name: 'Analytics' }));
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

  it('uses light captures when the visitor switches to light theme', () => {
    const { getByRole, container } = render(<Landing />);
    fireEvent.click(getByRole('button', { name: 'Switch to light theme' }));
    expect(container.querySelector('.lp-shots img[data-on="true"]')?.getAttribute('src')).toBe('/landing/tour/light/site.jpg');
    fireEvent.click(getByRole('tab', { name: 'Analytics' }));
    expect(getByRole('img', { name: /The Analytics screen/ }).getAttribute('src')).toBe('/landing/tour/light/analytics.jpg');
  });

  it('replays a reveal when a block returns to the scroll viewport', () => {
    let notify!: IntersectionObserverCallback;
    const unobserve = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { notify = callback; }
      observe() {}
      unobserve = unobserve;
      disconnect() {}
    });
    const { container } = render(<Landing />);
    const block = container.querySelector('#problem [data-reveal]') as HTMLElement;
    const entry = (isIntersecting: boolean): IntersectionObserverEntry => ({
      target: block, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: block.getBoundingClientRect(), intersectionRect: block.getBoundingClientRect(),
      rootBounds: null, time: 0,
    });
    notify([entry(true)], {} as IntersectionObserver);
    expect(block.dataset.in).toBe('true');
    notify([entry(false)], {} as IntersectionObserver);
    expect(block.dataset.in).toBe('false');
    expect(unobserve).not.toHaveBeenCalled();
    notify([entry(true)], {} as IntersectionObserver);
    expect(block.dataset.in).toBe('true');
  });

  it('starts motion on and lets the visitor pause and resume it', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const { getByRole, container } = render(<Landing />);
    const frame = container.querySelector('[data-screen="landing"]');
    expect(frame?.getAttribute('data-motion')).toBe('full');
    fireEvent.click(getByRole('button', { name: 'Pause page animations' }));
    expect(frame?.getAttribute('data-motion')).toBe('calm');
    fireEvent.click(getByRole('button', { name: 'Enable page animations' }));
    expect(frame?.getAttribute('data-motion')).toBe('full');
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

  it('explains each workflow handoff without approving any work', () => {
    const { getByRole, container } = render(<Landing />);
    fireEvent.click(getByRole('button', { name: /Human approval/ }));
    const detail = text(container.querySelector('#loop-detail') as Element);
    expect(detail).toContain('An approved work order or recorded refusal');
    expect(detail).toContain('do not create a work order by themselves');
    expect(getByRole('button', { name: /Human approval/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(getByRole('button', { name: /Vision analysis/ }));
    expect(text(container.querySelector('#loop-detail') as Element)).toContain('thermal classifier is not built');
  });

  it('opens the selected full capture in the selected theme', () => {
    const { getByRole } = render(<Landing />);
    fireEvent.click(getByRole('button', { name: 'Switch to light theme' }));
    fireEvent.click(getByRole('tab', { name: 'Sandbox' }));
    expect(getByRole('link', { name: 'View full capture' }).getAttribute('href')).toBe('/landing/tour/light/sandbox.png');
    expect(getByRole('img', { name: /The Sandbox screen/ }).getAttribute('src')).toBe('/landing/tour/light/sandbox.png');
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
