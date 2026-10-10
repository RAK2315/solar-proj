'use client';

/**
 * Shell: the console. The twin fills the viewport and everything else floats on it.
 *
 * There is no second view. A dispatched drone is followed by the twin's own
 * camera, and every screen behind the rail is a sheet of glass over the same
 * running field.
 */

import dynamic from 'next/dynamic';
import { Activity, ClipboardList, FlaskConical, Navigation, ScanSearch } from 'lucide-react';
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
import { ChainPanel, DeferPanel, IncidentOverview } from '@/components/overlay/IncidentPanels';
import { PlanPanel } from '@/components/overlay/PlanPanel';
import { TariffPanel } from '@/components/overlay/Tariff';
import { OrdersPanel, QueueOverview, QueuePanel } from '@/components/overlay/QueuePanel';
import { WorkspaceHeader } from '@/components/overlay/WorkspaceHeader';
import { FlightOverlay } from '@/components/twin/FlightOverlay';
import { hasCapturedEvidence } from '@/lib/data';
import { InjectPanel, ScenarioPanel } from '@/components/overlay/SandboxPanels';
import { HAZARD_SPEC } from '@/lib/hazard';
import { SITE_ZONES } from '@/lib/siteLayout';
import type { CameraRequest, FieldView } from '@/lib/twinCamera';
import { useFlatField, useFollowingFlight, useFootprints, useSelectedPanelId } from '@/store/selectors';
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
    <WorkspaceHeader Icon={ScanSearch} title={<><span className="id">{panelId}</span> incident</>} description={dossier ? 'Inspect the captured frames, detector output and thermal evidence for this array.' : 'Understand the signal, review the evidence and choose the next action.'}>
      <div className="seg" role="group" aria-label="Incident view">
        <button type="button" className="tool quiet" aria-pressed={!dossier} onClick={() => setDossier(false)}>Summary</button>
        <button type="button" className="tool quiet" aria-pressed={dossier} onClick={() => setDossier(true)}>Dossier</button>
      </div>
    </WorkspaceHeader>
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
      <IncidentOverview />
      <div className="col"><ArrayPanel panelId={panelId} linkToIncident={false} /><InverterPanel /></div>
      <ChainPanel />
      <div className="col"><DeferPanel /><ReasoningPanel /><CommittedRunPanel /></div>
    </>
  );
}

function Panels({ screen }: { screen: ScreenId }) {
  switch (screen) {
    case 'site': return <><ArrayPanel /><QueuePanel footer /></>;
    case 'incident': return <Incident />;
    case 'queue': return <><WorkspaceHeader Icon={ClipboardList} title="Plan the next repair" description="Priority decides what matters. Crew capacity decides what fits. Your approval commits the work." /><QueueOverview /><QueuePanel detail /><div className="col"><PlanPanel /><OrdersPanel /></div></>;
    case 'analytics': return <><WorkspaceHeader Icon={Activity} title="Understand the energy gap" description="Compare production with the model, trace the shortfall to its causes and explore the forecast." /><CurvePanel /><LossPanel /><ZonesPanel /><WeatherPanel /><details className="reference-panel"><summary>Tariff, sources and calculation basis</summary><TariffPanel /></details><details className="reference-panel"><summary>PV model and coefficients</summary><ModelPanel /></details></>;
    case 'drones': return <><WorkspaceHeader Icon={Navigation} title="Inspection fleet" description="Follow simulated missions, review captured evidence and check aircraft availability." /><div className="col"><FleetPanel /><CommsPanel /></div><div className="col"><MissionsPanel /><MissionProfilePanel /></div></>;
    case 'sandbox': return <><WorkspaceHeader Icon={FlaskConical} title="Explore a scenario" description="Change the conditions. See the effect. Review the response." /><HazardsPanel /><QueuePanel scores /><InjectPanel /><ScenarioPanel /></>;
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
  const fallback = useFlatField();
  const holding = useSession((s) => s.armedHazard !== null);
  const footprints = useFootprints();
  const dossier = useSession((s) => s.dossierOpen);
  const following = useFollowingFlight();
  const overlay = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [cameraRequest, setCameraRequest] = useState<CameraRequest>({ view: 'overview', revision: 0 });
  const moveCamera = (view: FieldView) => {
    useSession.getState().setFollowFlight(false);
    setCameraRequest((previous) => ({ view, revision: previous.revision + 1 }));
  };
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
          : <Twin overlay={overlay} watchdog={probe.forced !== '3d'} cameraRequest={cameraRequest} hovered={hovered} onHover={setHovered} />)}
        <div ref={overlay} className="sy-anchors" aria-hidden>
          {selected && !fallback && (
            <div className="sy-anchor selection" data-anchor={selected}><span className="id">{selected}</span></div>
          )}
          {!fallback && hovered && hovered !== selected && <div className="sy-anchor hover" data-anchor={hovered}><span className="id">{hovered}</span></div>}
          {!fallback && SITE_ZONES.map((zone) => <div key={zone.id} className="sy-zone-label" data-at={`${zone.x},${zone.minZ - 3}`}>Zone {zone.id}</div>)}
          {!fallback && footprints.map((f) => (
            <div key={f.id} className="sy-anchor tag" data-at={`${f.x},${f.z}`} data-sev={f.kind === 'dust' ? 'warning' : undefined}>
              <span className="chip">{HAZARD_SPEC[f.kind].label}</span>
            </div>
          ))}
        </div>
        {!fallback && <FlightOverlay />}
      </div>

      <Rail screen={screen} />

      {side && !fallback && !following && <div className="sy-view-tools" aria-label="Field navigation">
        <span className="sy-north" title="Site north"><i aria-hidden>↑</i>N</span>
        <div className="sy-view-heading"><strong>Solar field</strong><span>Schematic digital twin</span></div>
        <div className="sy-camera-tools" role="group" aria-label="Camera views">
          <button type="button" className="tool quiet" aria-pressed={cameraRequest.view === 'overview'} onClick={() => moveCamera('overview')}>Overview</button>
          <button type="button" className="tool quiet" disabled={!selected} aria-pressed={cameraRequest.view === 'selected'} onClick={() => moveCamera('selected')}>Focus array</button>
          <button type="button" className="tool quiet" onClick={() => moveCamera(cameraRequest.view)}>Reset view</button>
        </div>
        <p>Drag to orbit · Scroll to zoom · Right-drag to pan</p>
      </div>}
      {side && !fallback && !following && <ul className="sy-field-legend" aria-label="Field status legend">
        <li><i className="healthy" />Nominal</li><li><i data-sev="warning" />Warning</li><li><i data-sev="critical" />Critical</li><li><i data-sev="scheduled" />Scheduled</li><li><i className="selected" />Selected</li>
      </ul>}

      {/* Site is for operating and Sandbox is for what-if, so the hazard tools
          appear only on the screen that is about them. */}
      {side && (
        <div className="sy-left">
          {screen === 'sandbox' && <HazardPalette />}
          <FeedPanel />
        </div>
      )}

      <main className="sy-stage" data-layout={side ? 'side' : 'wide'} data-screen={screen === 'incident' && dossier ? 'dossier' : screen}>
        <div className="sy-sheet"><Panels screen={screen} /></div>
      </main>
    </div>
  );
}
