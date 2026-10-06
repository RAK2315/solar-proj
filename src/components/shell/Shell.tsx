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
import {
  CurvePanel, LossPanel, ModelPanel, WeatherPanel, ZonesPanel,
} from '@/components/overlay/AnalyticsPanels';
import { ArrayPanel } from '@/components/overlay/ArrayPanel';
import {
  CapturesPanel, CommittedRunPanel, DetectorPanel, InverterPanel, MatrixPanel, ReasoningPanel,
} from '@/components/overlay/DossierPanels';
import {
  CommsPanel, FleetPanel, MissionProfilePanel, MissionsPanel,
} from '@/components/overlay/DronePanels';
import { FeedPanel } from '@/components/overlay/FeedPanel';
import { HazardPalette, HazardsPanel } from '@/components/overlay/HazardPalette';
import { ChainPanel, DeferPanel } from '@/components/overlay/IncidentPanels';
import { PlanPanel } from '@/components/overlay/PlanPanel';
import { OrdersPanel, QueuePanel } from '@/components/overlay/QueuePanel';
import { FlightOverlay } from '@/components/twin/FlightOverlay';
import { hasCapturedEvidence } from '@/lib/data';
import { InjectPanel, ScenarioPanel } from '@/components/overlay/SandboxPanels';
import { HAZARD_SPEC } from '@/lib/hazard';
import { useFollowingFlight, useFootprints, useSelectedPanelId } from '@/store/selectors';
import { useSession } from '@/store/session';
import { useSolver } from '@/store/solver';
import { Rail, screenOf, type ScreenId } from './Rail';

const Twin = dynamic(() => import('@/components/twin/Twin'), { ssr: false, loading: () => null });

/** Screens where the field is the subject and the sheet stays to one side. */
const SIDE: ReadonlySet<ScreenId> = new Set(['site', 'sandbox']);

/** The incident screen holds two views of one array: the summary and the dossier. */
function IncidentBar({ dossier }: { dossier: boolean }) {
  const panelId = useSelectedPanelId();
  const setDossier = useSession((s) => s.setDossier);
  return (
    <header className="screenbar">
      <h1><span className="id">{panelId}</span> incident</h1>
      <div className="seg" role="group" aria-label="Incident view">
        <button type="button" className="tool quiet" aria-pressed={!dossier} onClick={() => setDossier(false)}>Summary</button>
        <button type="button" className="tool quiet" aria-pressed={dossier} onClick={() => setDossier(true)}>Dossier</button>
      </div>
    </header>
  );
}

function Incident() {
  const dossier = useSession((s) => s.dossierOpen);
  const panelId = useSelectedPanelId();
  return dossier ? (
    <>
      <IncidentBar dossier />
      <ChainPanel />
      <div className="col"><CapturesPanel /><DetectorPanel /></div>
      {/* The matrix is the signature element and is never dropped for space.
          It is dropped for an array we hold no capture of, because it would be
          another array's measurement. */}
      {hasCapturedEvidence(panelId) ? <MatrixPanel /> : <ReasoningPanel />}
    </>
  ) : (
    <>
      <IncidentBar dossier={false} />
      <div className="col"><ArrayPanel linkToIncident={false} /><InverterPanel /></div>
      <ChainPanel />
      <div className="col"><DeferPanel /><ReasoningPanel /><CommittedRunPanel /></div>
    </>
  );
}

function Panels({ screen }: { screen: ScreenId }) {
  switch (screen) {
    case 'site': return <><ArrayPanel /><QueuePanel footer /></>;
    case 'incident': return <Incident />;
    case 'queue': return <><QueuePanel /><div className="col"><PlanPanel /><OrdersPanel /></div></>;
    case 'analytics': return <><CurvePanel /><WeatherPanel /><LossPanel /><ZonesPanel /><ModelPanel /></>;
    case 'drones': return <><div className="col"><FleetPanel /><CommsPanel /></div><div className="col"><MissionsPanel /><MissionProfilePanel /></div></>;
    case 'sandbox': return <><HazardsPanel /><InjectPanel /><ScenarioPanel /><QueuePanel /></>;
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
  const holding = useSession((s) => s.armedHazard !== null);
  const footprints = useFootprints();
  const dossier = useSession((s) => s.dossierOpen);
  const following = useFollowingFlight();
  const overlay = useRef<HTMLDivElement>(null);
  const [probe, setProbe] = useState<{ ready: boolean; forced: Forced }>({ ready: false, forced: null });

  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get('twin');
    const forced: Forced = asked === '2d' || asked === '3d' ? asked : null;
    if (forced === '2d' || !canDrawWebGL()) useSession.getState().setTwinFallback('webgl');
    setProbe({ ready: true, forced });
    // After first paint: the console is useful before the solver arrives.
    void useSolver.getState().load();
  }, []);

  const side = SIDE.has(screen);

  return (
    <div
      className={showWorkings ? 'sy' : 'sy hide-workings'}
      data-screen={screen}
      data-fallback={fallback ? 'true' : 'false'}
      data-dragging={holding ? 'true' : 'false'}
      data-follow={following ? 'true' : 'false'}
    >
      <div className="sy-twin">
        {probe.ready && (fallback
          ? <FieldMap />
          : <Twin overlay={overlay} watchdog={probe.forced !== '3d'} />)}
        <div ref={overlay} className="sy-anchors" aria-hidden>
          {selected && !fallback && (
            <div className="sy-anchor" data-anchor={selected}><i /><span className="id">{selected}</span></div>
          )}
          {!fallback && footprints.map((f) => (
            <div key={f.id} className="sy-anchor tag" data-at={`${f.x},${f.z}`} data-sev={f.kind === 'dust' ? 'warning' : undefined}>
              <span className="chip">{HAZARD_SPEC[f.kind].label}</span>
            </div>
          ))}
        </div>
        {!fallback && <FlightOverlay />}
      </div>

      <Rail screen={screen} />

      {side && (
        <div className="sy-left">
          <HazardPalette />
          <FeedPanel />
        </div>
      )}

      <main className="sy-stage" data-layout={side ? 'side' : 'wide'} data-screen={screen === 'incident' && dossier ? 'dossier' : screen}>
        <Panels screen={screen} />
      </main>
    </div>
  );
}
