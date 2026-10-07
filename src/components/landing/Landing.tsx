'use client';

/**
 * Landing: the site in 3D, and the product's argument scrolling over it.
 *
 * The live scene stays behind the whole page. The hero is clear glass over it,
 * the argument is a sheet that slides up across it, and one window in the middle
 * lets the field through again.
 *
 * Every figure comes through src/app/numbers.ts or the same libraries the
 * console reads, which evaluate it from the physics model or the committed
 * data. Nothing here is typed in.
 *
 * MOTION IS PRESENTATION, NOT STATE. Nothing on this page has a timer. Things
 * arrive by CSS, started by an IntersectionObserver that marks a block as seen;
 * the progress bar and the pointer spotlight write a custom property straight
 * to the element. The one clock still drives the scene and nothing else.
 *
 * WHAT IS BEHIND THE PAGE, in order of preference:
 *   the live scene        WebGL, and the visitor has not asked for less motion
 *   one frame of it       WebGL, reduced motion: the same scene, rendered once
 *   a photograph of it    no WebGL: a still captured from this scene
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Moon, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import * as N from '@/app/numbers';
import { panels } from '@/lib/data';
import { MW, MWh, degC, num, pct } from '@/lib/format';
import { useSession } from '@/store/session';
import {
  Closing, Difference, Honest, LoopSection, Problem, Stack, Tour, Window,
} from './Sections';

const LandingScene = dynamic(() => import('./LandingScene'), { ssr: false, loading: () => null });

const ARRAY_ID = 'B-17';
const STILL_SRC = '/landing/still.jpg';
const HEADLINE = ['The', 'plan,', 'not', 'the', 'picture.'];

const NAV = [
  ['#problem', 'Problem'],
  ['#loop', 'The loop'],
  ['#difference', 'Difference'],
  ['#product', 'Product'],
  ['#honest', 'What is real'],
] as const;

type Backdrop = 'pending' | 'live' | 'frame' | 'photo';

function canDrawWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Marks each `[data-reveal]` block as seen the first time it enters the view.
 * Written to the element, not to React state: forty blocks arriving must not be
 * forty renders. Without an observer, everything is simply shown.
 */
function useReveal(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const blocks = [...(root.current?.querySelectorAll<HTMLElement>('[data-reveal]') ?? [])];
    if (typeof IntersectionObserver === 'undefined') {
      for (const b of blocks) b.dataset.in = 'true';
      return undefined;
    }
    const seen = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        (e.target as HTMLElement).dataset.in = 'true';
        seen.unobserve(e.target);
      }
    }, { threshold: 0.12 });
    for (const b of blocks) seen.observe(b);
    return () => seen.disconnect();
  }, [root]);
}

export function Landing() {
  const theme = useSession((s) => s.theme);
  const toggleTheme = useSession((s) => s.toggleTheme);
  const [backdrop, setBackdrop] = useState<Backdrop>('pending');
  const page = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canDrawWebGL()) { setBackdrop('photo'); return; }
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setBackdrop(calm ? 'frame' : 'live');
  }, []);

  useReveal(page);

  // How far down the page, as a custom property the bar and the nav read.
  const onScroll = () => {
    const el = page.current;
    if (!el || !frame.current) return;
    const span = el.scrollHeight - el.clientHeight;
    frame.current.style.setProperty('--read', span > 0 ? (el.scrollTop / span).toFixed(4) : '0');
    frame.current.dataset.scrolled = String(el.scrollTop > 24);
  };

  return (
    <div className="sy" data-screen="landing" ref={frame}>
      <div className="sy-landscene" aria-hidden>
        {(backdrop === 'live' || backdrop === 'frame') && <LandingScene still={backdrop === 'frame'} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {backdrop === 'photo' && <img src={STILL_SRC} alt="" />}
      </div>
      <div className="lp-scrim" aria-hidden />
      <div className="lp-progress" aria-hidden><i /></div>

      <header className="lp-nav glass">
        <a className="lp-brand" href="#top"><i aria-hidden />Surya agent</a>
        <nav aria-label="Sections">
          {NAV.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <div className="lp-nav-end">
          <button type="button" className="tool" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
          </button>
          <Link className="lp-cta small" href="/console">Console<ArrowRight size={16} aria-hidden /></Link>
        </div>
      </header>

      <main className="sy-land" ref={page} onScroll={onScroll}>
        <section className="lp-hero" id="top">
          <p className="lp-eyebrow"><i aria-hidden />A live model of {panels.length} arrays in a {MW(N.NAMEPLATE_MW)} block of Bhadla Solar Park</p>
          <h1 aria-label={HEADLINE.join(' ')}>
            {HEADLINE.map((word, i) => (
              // The space sits outside the word: inside an inline block it would collapse.
              <span key={word + i}><span className="word" style={{ '--i': i } as React.CSSProperties}>{word}</span>{i < HEADLINE.length - 1 ? ' ' : ''}</span>
            ))}
          </h1>
          <p className="lp-lede">
            Surya watches the block, sends a drone to verify what telemetry cannot, and hands the operator a
            ranked, deadlined repair plan to approve.
          </p>
          <div className="lp-actions">
            <Link className="lp-cta" href="/console">Open the console</Link>
            <a className="lp-ghost" href="#loop">See how it works<ArrowDown size={16} aria-hidden /></a>
          </div>

          <dl className="lp-stats glass">
            <div style={{ '--i': 0 } as React.CSSProperties}>
              <dd className="num">{MW(N.OUTPUT_MW)}</dd>
              <dt>delivered from {MW(N.NAMEPLATE_MW)} nameplate at {degC(N.CELL_TEMP_C)} cell temperature</dt>
            </div>
            <div style={{ '--i': 1 } as React.CSSProperties} data-sev="critical">
              <dd className="num">{pct(N.ARRAY_DEVIATION_PCT)}</dd>
              <dt>on array <span className="id">{ARRAY_ID}</span>, {N.FAULTED_STRING_COUNT} of {N.STRINGS} strings bypassed</dt>
            </div>
            <div style={{ '--i': 2 } as React.CSSProperties} data-sev="warning">
              <dd className="num">{MWh(N.LOSS_72H_MWH)}</dd>
              <dt>lost over 72 h if nobody acts before {N.ACT_BEFORE}</dt>
            </div>
            {N.CRACKED_AP50 !== null && (
              <div style={{ '--i': 3 } as React.CSSProperties} data-sev="active">
                <dd className="num">{num(N.CRACKED_AP50, 3)}</dd>
                <dt>AP@50 for cracked cells, {N.DETECTOR_SPLIT} split</dt>
              </div>
            )}
          </dl>
        </section>

        <div className="lp-sheet">
          <Problem />
          <LoopSection />
          <Difference />
        </div>

        <Window />

        <div className="lp-sheet">
          <Tour />
          <Honest />
          <Stack />
          <Closing />
        </div>
      </main>
    </div>
  );
}
