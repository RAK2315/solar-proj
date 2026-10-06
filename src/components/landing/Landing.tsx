'use client';

/**
 * Landing: the site in 3D, with the argument set in glass over it.
 *
 * Every figure comes through src/app/numbers.ts, which evaluates it from the
 * physics model or the committed detector output. Nothing here is typed in.
 *
 * WHAT IS BEHIND THE GLASS, in order of preference:
 *   the live scene        WebGL, and the visitor has not asked for less motion
 *   one frame of it       WebGL, reduced motion: the same scene, rendered once
 *   a photograph of it    no WebGL: a still captured from this scene
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import * as N from '@/app/numbers';
import { MW, MWh, degC, num, pct } from '@/lib/format';
import { useSession } from '@/store/session';

const LandingScene = dynamic(() => import('./LandingScene'), { ssr: false, loading: () => null });

const ARRAY_ID = 'B-17';
const STILL_SRC = '/landing/still.jpg';

const LOOP = [
  'Telemetry anomaly', 'Agent triage', 'Drone dispatch', 'Evidence capture',
  'Vision analysis', 'Prognosis and deadline', 'Ranked recommendation', 'Human approval',
];

/** The cadence claim's source: read in full on 4 Oct 2026. Not an NREL paper. */
const CADENCE_SOURCE = 'https://www.osti.gov/servlets/purl/1960134';

type Backdrop = 'pending' | 'live' | 'frame' | 'photo';

function canDrawWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function Landing() {
  const theme = useSession((s) => s.theme);
  const toggleTheme = useSession((s) => s.toggleTheme);
  const [backdrop, setBackdrop] = useState<Backdrop>('pending');

  useEffect(() => {
    if (!canDrawWebGL()) { setBackdrop('photo'); return; }
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setBackdrop(calm ? 'frame' : 'live');
  }, []);

  return (
    <div className="sy" data-screen="landing">
      <div className="sy-landscene" aria-hidden>
        {(backdrop === 'live' || backdrop === 'frame') && <LandingScene still={backdrop === 'frame'} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {backdrop === 'photo' && <img src={STILL_SRC} alt="" />}
      </div>

      <main className="sy-land glass">
        <section className="hero">
          <p className="brand">Surya agent</p>
          <h1>The plan, not the picture.</h1>
          <p className="one">
            Surya watches a {MW(N.NAMEPLATE_MW)} block of Bhadla Solar Park, sends a drone to verify what
            telemetry cannot, and hands the operator a ranked, deadlined repair plan to approve.
          </p>
          <Link className="approve" href="/console">Open the console</Link>
        </section>

        <section aria-labelledby="loop-h">
          <h2 id="loop-h" className="sr-only">The loop</h2>
          <ol className="loop well">
            {LOOP.map((step, i) => <li key={step}><span className="rank num">{i + 1}</span>{step}</li>)}
          </ol>
        </section>

        <section aria-labelledby="real-h">
          <h2 id="real-h" className="sr-only">What is real</h2>
          <ul className="proof">
            <li>
              Aerial infrared inspection is usually flown once a year, so faults below the inverter
              go unseen for weeks to months. This watches continuously.{' '}
              <a className="src" href={CADENCE_SOURCE} rel="noreferrer" target="_blank">Turbine Logic and EPRI, on OSTI</a>
            </li>
            <li>Telemetry is simulated on a published PV model with stated coefficients.</li>
            <li>The queue is ranked by arithmetic shown on screen, never by a language model.</li>
            <li>Nothing is scheduled without an operator.</li>
          </ul>
        </section>
      </main>

      <dl className="sy-stats glass">
        <div>
          <dd className="num">{MW(N.OUTPUT_MW)}</dd>
          <dt>delivered from {MW(N.NAMEPLATE_MW)} nameplate at {degC(N.CELL_TEMP_C)} cell temperature</dt>
        </div>
        <div>
          <dd className="num">{pct(N.ARRAY_DEVIATION_PCT)}</dd>
          <dt>on array <span className="id">{ARRAY_ID}</span>, {N.FAULTED_STRING_COUNT} of {N.STRINGS} strings bypassed</dt>
        </div>
        <div>
          <dd className="num">{MWh(N.LOSS_72H_MWH)}</dd>
          <dt>lost over 72 h if nobody acts before {N.ACT_BEFORE}</dt>
        </div>
        {N.CRACKED_AP50 !== null && (
          <div>
            <dd className="num">{num(N.CRACKED_AP50, 3)}</dd>
            <dt>AP@50 for cracked cells, {N.DETECTOR_SPLIT} split</dt>
          </div>
        )}
      </dl>

      <div className="sy-landtheme glass">
        <button type="button" className="tool" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
