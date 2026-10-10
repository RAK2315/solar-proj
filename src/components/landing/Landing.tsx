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
 * Pausing uses a demand-rendered frame so the calm view does not keep spending
 * GPU time. Without WebGL, the captured still keeps the field visible.
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowDown, ArrowRight, MapPin, Moon, Pause, Sparkles, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import * as N from '@/app/numbers';
import { panels } from '@/lib/data';
import { MW, MWh, degC, num, pct } from '@/lib/format';
import { useSession } from '@/store/session';
import {
  Capabilities, Closing, Difference, LoopSection, MissionPreview, Problem, Questions, ReferenceCase, Stack, Tour, Window,
} from './Sections';

const LandingScene = dynamic(() => import('./LandingScene'), { ssr: false, loading: () => null });

const ARRAY_ID = 'B-17';
const STILL_SRC = '/landing/still.jpg';
const HEADLINE = ['See', 'the', 'fault.', 'Own', 'the', 'next', 'move.'];

const NAV = [
  ['#problem', 'Problem'],
  ['#loop', 'The loop'],
  ['#difference', 'Difference'],
  ['#product', 'Product'],
  ['#capabilities', 'Capabilities'],
] as const;

type Backdrop = 'pending' | 'live' | 'photo';

function canDrawWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Replays a reveal when a visitor returns to a section, without a second clock.
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
        (e.target as HTMLElement).dataset.in = String(e.isIntersecting);
      }
    }, { root: root.current, threshold: 0.12 });
    for (const b of blocks) seen.observe(b);
    return () => seen.disconnect();
  }, [root]);
}

export function Landing() {
  const theme = useSession((s) => s.theme);
  const toggleTheme = useSession((s) => s.toggleTheme);
  const [backdrop, setBackdrop] = useState<Backdrop>('pending');
  const [motion, setMotion] = useState<'full' | 'calm'>('full');
  const [reduced, setReduced] = useState(false);
  const moving = motion === 'full';
  const page = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const webgl = canDrawWebGL();
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => {
      setReduced(Boolean(preference?.matches));
      setBackdrop(webgl ? 'live' : 'photo');
    };
    update();
    preference?.addEventListener('change', update);
    return () => preference?.removeEventListener('change', update);
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
    <div className="sy" data-screen="landing" data-motion={motion} ref={frame}>
      <div className="sy-landscene" aria-hidden>
        {backdrop === 'live' && <LandingScene still={!moving} />}
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
          <button type="button" className="lp-motion" aria-label={moving ? 'Pause page animations' : 'Enable page animations'} title={reduced && moving ? 'Pause animations for a reduced-motion view' : moving ? 'Pause page animations' : 'Enable page animations'} aria-pressed={moving} onClick={() => setMotion(moving ? 'calm' : 'full')}>
            {moving ? <Pause size={16} aria-hidden /> : <Sparkles size={16} aria-hidden />}<span>{moving ? 'Motion on' : 'Motion off'}</span>
          </button>
          <button type="button" className="tool" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
          </button>
          <Link className="lp-cta small" href="/console">Console<ArrowRight size={16} aria-hidden /></Link>
        </div>
      </header>

      <main className="sy-land" ref={page} onScroll={onScroll}>
        <section className="lp-hero" id="top" data-reveal>
          <div className="lp-hero-copy">
          <p className="lp-eyebrow">Solar inspection &amp; operations</p>
          <h1 aria-label={HEADLINE.join(' ')}>
            {HEADLINE.map((word, i) => (
              // The space sits outside the word: inside an inline block it would collapse.
              <span key={word + i}><span className="word" style={{ '--i': i } as React.CSSProperties}>{word}</span>{i < HEADLINE.length - 1 ? ' ' : ''}</span>
            ))}
          </h1>
          <p className="lp-lede">
            From an unexplained power drop to an evidence-backed repair plan.
            Inspect the field, understand the urgency, and decide what happens next.
          </p>
          <div className="lp-actions">
            <Link className="lp-cta" href="/console">Open the console</Link>
            <a className="lp-ghost" href="#loop">See how it works<ArrowDown size={16} aria-hidden /></a>
          </div>
          <p className="lp-disclosure">Interactive prototype · Simulated telemetry and drone flights</p>
          </div>

          <MissionPreview />

          <div className="lp-site-line">
            <div className="lp-site-name"><MapPin size={20} aria-hidden /><div><strong>Bhadla Solar Park</strong><span>Rajasthan, India · Reference site</span></div></div>
            <dl><div><dt>Digital twin</dt><dd>{panels.length} modelled arrays</dd></div><div><dt>Block capacity</dt><dd className="num">{MW(N.NAMEPLATE_MW)}</dd></div></dl>
          </div>

          <dl className="lp-stats">
            <div style={{ '--i': 0 } as React.CSSProperties}>
              <dd className="num">{MW(N.OUTPUT_MW)}</dd>
              <dt>Modelled block output<span>From {MW(N.NAMEPLATE_MW)} nameplate at {degC(N.CELL_TEMP_C)} cell temperature</span></dt>
            </div>
            <div style={{ '--i': 1 } as React.CSSProperties} data-sev="critical">
              <dd className="num">{pct(N.ARRAY_DEVIATION_PCT)}</dd>
              <dt>Array shortfall<span>On <span className="id">{ARRAY_ID}</span> · {N.FAULTED_STRING_COUNT} of {N.STRINGS} strings bypassed</span></dt>
            </div>
            <div style={{ '--i': 2 } as React.CSSProperties} data-sev="warning">
              <dd className="num">{MWh(N.LOSS_72H_MWH)}</dd>
              <dt>Projected energy loss<span>Reference forecast · act before {N.ACT_BEFORE}</span></dt>
            </div>
            {N.CRACKED_AP50 !== null && (
              <div style={{ '--i': 3 } as React.CSSProperties} data-sev="active">
                <dd className="num">{num(N.CRACKED_AP50, 3)}</dd>
                <dt>Cracked-cell AP@50<span>Detector performance · {N.DETECTOR_SPLIT} split</span></dt>
              </div>
            )}
          </dl>
          <a className="lp-scroll-cue" href="#problem">Follow the evidence<ArrowDown size={16} aria-hidden /></a>
        </section>

        <div className="lp-sheet">
          <Problem />
          <LoopSection />
          <ReferenceCase />
          <Difference />
        </div>

        <Window />

        <div className="lp-sheet">
          <Tour />
          <Capabilities />
          <Questions />
          <Stack />
          <Closing />
        </div>
      </main>
    </div>
  );
}
