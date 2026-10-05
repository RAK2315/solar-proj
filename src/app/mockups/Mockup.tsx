'use client';

/**
 * THROWAWAY. One shell, seven screens, four directions, two themes.
 *
 * The markup is the same for every direction; `data-dir`, `data-screen` and
 * `data-theme` are what mockups.css lays out. Deleted after the pick.
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Activity, FlaskConical, ListOrdered, Map, Navigation, ScanSearch } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useLiveQueue, useSiteFrame } from '@/store/selectors';
import { useSession } from '@/store/session';
import {
  ARRAY_ID, Captures, Chain, Curve, Defer, Detector, Events, Facts, Feed, Fleet, Hero, Inject, Kpis, Loop,
  Loss, Map2D, Matrix, Missions, Plan, Proof, Queue, Stats, TimeControl, Tools, Zones,
} from './blocks';
import { SCREENS, type Dir, type Screen } from './directions';

const Twin = dynamic(() => import('./Twin'), { ssr: false, loading: () => null });

/** Site seconds: 10:12, after B-17's fault has fully developed. */
const START_SITE_SECONDS = 720;
/** A drone is sent at the start and the clock moved on, so the incident has evidence. */
const AFTER_INSPECTION_SECONDS = 45 * 60;
/** The product's own default, so the time control shows a real setting. */
const MOCKUP_TIME_SCALE = 60;

const NAV: Array<{ id: Screen; Icon: typeof Map }> = [
  { id: 'twin', Icon: Map },
  { id: 'incident', Icon: ScanSearch },
  { id: 'queue', Icon: ListOrdered },
  { id: 'analytics', Icon: Activity },
  { id: 'drones', Icon: Navigation },
  { id: 'sandbox', Icon: FlaskConical },
];

function blocksFor(screen: Screen, dir: Dir): ReactNode {
  switch (screen) {
    case 'twin': return <><Facts /><Queue /><Feed /><Tools /></>;
    case 'fallback': return <><Facts /><Queue /><Feed /></>;
    case 'incident': return <><Facts /><Chain /><Defer /></>;
    case 'dossier': return <><Chain /><Captures /><Detector /><Matrix /></>;
    case 'queue': return <><Queue /><Plan /></>;
    case 'analytics': return <><Curve /><Loss /><Zones /></>;
    case 'drones': return <><Fleet /><Missions /></>;
    case 'sandbox': return <><Inject /><Events /><Queue /><Tools /></>;
    case 'landing': return <><Hero dir={dir} /><Stats /><Loop /><Proof /></>;
  }
}

/* D ties figures to arrays with leader lines. Which rows get one depends on what
   the screen shows; the selected array is tied from its headline figure instead. */
function Leaders({ screen }: { screen: Screen }) {
  const queue = useLiveQueue().tasks;
  const showFigure = screen === 'twin' || screen === 'incident';
  const showQueue = screen === 'twin' || screen === 'queue' || screen === 'sandbox';
  const jobs = showQueue ? queue.filter((t) => !(showFigure && t.panelId === ARRAY_ID)) : [];
  const frame = useSiteFrame();
  return (
    <>
      <svg className="mk-leaders" aria-hidden>
        {showFigure && <line data-from="mk-figure" data-to={ARRAY_ID} data-sev={frame.panels[ARRAY_ID]?.status} />}
        {screen === 'drones' && <line data-from={`mk-m-${ARRAY_ID}`} data-to={ARRAY_ID} data-sev="scheduled" />}
        {jobs.map((t) => <line key={t.id} data-from={`mk-q-${t.panelId}`} data-to={t.panelId} data-sev={t.severity} />)}
      </svg>
      {jobs.map((t) => <div key={t.id} className="mk-anchor" data-anchor={t.panelId} data-sev={t.severity}><i /></div>)}
    </>
  );
}

export function Mockup({ dir, screen }: { dir: Dir; screen: Screen }) {
  const [theme, setTheme] = useState<'dark' | 'light' | null>(null);
  const root = useRef<HTMLDivElement>(null);

  // A separate storage key, so pinning the site for the mockups cannot overwrite
  // the operator's own persisted session.
  useEffect(() => {
    useSession.persist.setOptions({ name: 'surya-mockups' });
    useSession.setState({
      mode: 'live', siteSeconds: START_SITE_SECONDS, timeScale: MOCKUP_TIME_SCALE, running: true,
      selectedPanelId: ARRAY_ID, missions: [], workOrders: [], overrides: [], injected: [],
    });
    const s = useSession.getState();
    s.dispatch(ARRAY_ID);
    // The sandbox opens with one rehearsal fault already raised, so it shows a
    // re-derived queue and not an empty stage.
    if (screen === 'sandbox') s.injectFault('C-22', 'crack-early');
    s.setSiteSeconds(START_SITE_SECONDS + AFTER_INSPECTION_SECONDS);
    setTheme(new URLSearchParams(window.location.search).get('theme') === 'light' ? 'light' : 'dark');
  }, [screen]);

  const ready = theme !== null;
  const q = theme === 'light' ? '?theme=light' : '';
  const fallback = screen === 'fallback';
  // The fallback is the Site screen with the map swapped in, so it takes Site's layout.
  const layout = fallback ? 'twin' : screen;
  const current = fallback ? 'twin' : screen === 'dossier' ? 'incident' : screen;
  const selected = ['twin', 'incident', 'sandbox', 'dossier'].includes(screen);

  return (
    <div
      ref={root}
      id="mk-root"
      className="mk"
      data-dir={dir === 'e' ? 'c' : dir}
      data-rail={dir === 'e'}
      data-screen={layout}
      data-fallback={fallback}
      data-theme={theme ?? 'dark'}
      onPointerMove={(e) => {
        root.current?.style.setProperty('--px', `${e.clientX}px`);
        root.current?.style.setProperty('--py', `${e.clientY}px`);
      }}
    >
      <div className="mk-twinbox">
        {ready && (fallback ? <Map2D /> : <Twin ground={theme === 'light' ? 'day' : 'dark'} />)}
        <div className="mk-scrim" aria-hidden />
        {ready && selected && <div className="mk-anchor mk-selected" data-anchor={ARRAY_ID} aria-hidden><i /><span className="id">{ARRAY_ID}</span></div>}
        {ready && dir === 'd' && screen !== 'landing' && !fallback && <Leaders screen={screen} />}
      </div>

      {screen !== 'landing' && (
        <nav className="mk-nav" aria-label="Screens">
          <span className="brand">Surya</span>
          <div className="tabs">
            {NAV.map(({ id, Icon }) => (
              <Link key={id} href={`/mockups/${dir}/${id}${q}`} aria-current={id === current ? 'page' : undefined}>
                <Icon size={18} strokeWidth={1.75} aria-hidden /><span>{SCREENS[id]}</span>
              </Link>
            ))}
          </div>
          {ready && <TimeControl />}
          {ready && <Kpis />}
        </nav>
      )}

      {ready && <main className="mk-stage">{blocksFor(screen, dir)}</main>}
    </div>
  );
}
