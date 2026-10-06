'use client';

/**
 * Shell: the console. The twin fills the viewport and everything else floats on it.
 *
 * There is no second view. A dispatched drone is followed by the twin's own
 * camera, and every screen behind the rail is a sheet of glass over the same
 * running field.
 */

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import { FieldMap } from '@/components/fallback/FieldMap';
import { CurvePanel, LossPanel, ZonesPanel } from '@/components/overlay/AnalyticsPanels';
import { ArrayPanel } from '@/components/overlay/ArrayPanel';
import { FleetPanel, MissionsPanel } from '@/components/overlay/DronePanels';
import { FeedPanel } from '@/components/overlay/FeedPanel';
import { ChainPanel, DeferPanel } from '@/components/overlay/IncidentPanels';
import { PlanPanel, QueuePanel } from '@/components/overlay/QueuePanel';
import { InjectPanel, ScenarioPanel } from '@/components/overlay/SandboxPanels';
import { useSession } from '@/store/session';
import { Rail, screenOf, type ScreenId } from './Rail';

const Twin = dynamic(() => import('@/components/twin/Twin'), { ssr: false, loading: () => null });

/** Screens where the field is the subject and the sheet stays to one side. */
const SIDE: ReadonlySet<ScreenId> = new Set(['site', 'sandbox']);

function Panels({ screen }: { screen: ScreenId }) {
  switch (screen) {
    case 'site': return <><ArrayPanel /><QueuePanel footer /></>;
    case 'incident': return <><ArrayPanel linkToIncident={false} /><ChainPanel /><DeferPanel /></>;
    case 'queue': return <><QueuePanel /><PlanPanel /></>;
    case 'analytics': return <><CurvePanel /><LossPanel /><ZonesPanel /></>;
    case 'drones': return <><FleetPanel /><MissionsPanel /></>;
    case 'sandbox': return <><InjectPanel /><ScenarioPanel /><QueuePanel /></>;
  }
}

/** `?twin=2d` shows the fallback on a machine that does not need it; `?twin=3d`
    keeps the twin up on a software renderer that would fail the frame budget. */
type Forced = '2d' | '3d' | null;

function canDrawWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function Shell() {
  const screen = screenOf(useSession((s) => s.module));
  const selected = useSession((s) => s.selectedPanelId);
  const showWorkings = useSession((s) => s.showWorkings);
  const fallback = useSession((s) => s.twinFallback);
  const overlay = useRef<HTMLDivElement>(null);
  const [probe, setProbe] = useState<{ ready: boolean; forced: Forced }>({ ready: false, forced: null });

  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get('twin');
    const forced: Forced = asked === '2d' || asked === '3d' ? asked : null;
    if (forced === '2d' || !canDrawWebGL()) useSession.getState().setTwinFallback('webgl');
    setProbe({ ready: true, forced });
  }, []);

  const side = SIDE.has(screen);

  return (
    <div
      className={showWorkings ? 'sy' : 'sy hide-workings'}
      data-screen={screen}
      data-fallback={fallback ? 'true' : 'false'}
    >
      <div className="sy-twin">
        {probe.ready && (fallback
          ? <FieldMap />
          : <Twin overlay={overlay} watchdog={probe.forced !== '3d'} />)}
        <div ref={overlay} className="sy-anchors" aria-hidden>
          {selected && !fallback && (
            <div className="sy-anchor" data-anchor={selected}><i /><span className="id">{selected}</span></div>
          )}
        </div>
      </div>

      <Rail screen={screen} />

      {side && (
        <div className="sy-left">
          <FeedPanel />
        </div>
      )}

      <main className="sy-stage" data-layout={side ? 'side' : 'wide'} data-screen={screen}>
        <Panels screen={screen} />
      </main>
    </div>
  );
}
