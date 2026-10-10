'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Camera, CheckCheck, CircuitBoard, GitBranch, Wrench } from 'lucide-react';
import { useWorkflow } from '@/hooks/useWorkflow';
import { useRepairComparison, useRepairRuns, useSiteFrame } from '@/hooks/useOperationalSelectors';
import { cellGrid, evidenceUrl, getPanel, hasCapturedEvidence } from '@/lib/data';
import { degC, hours, kW, MWh, pct } from '@/lib/format';
import { compareFutures, crewAvailability, DELAY_OPTIONS, FUTURE_HOURS, MAINTENANCE_PHASES, repairPhase, repairProgress } from '@/lib/maintenance';
import { formatINR, TARIFF_BASIS } from '@/lib/money';

import { MAINTENANCE_PLAYBACK } from '@/lib/maintenanceScene';
import { SERVICE_HUB } from '@/lib/siteLayout';
import { repairFor } from '@/lib/repair';
import { useArrayFault, useIncident, useInspected, useSelectedPanelId, siteClockAt } from '@/store/selectors';
import { MISSION, useSession } from '@/store/session';
import { DetectionBoxes } from './DossierPanels';
import { InverterPanel } from './DossierPanels';
import { LinkedMatrix } from './LinkedMatrix';

const TABS = [
  { id: 'evidence', label: 'Inspect evidence', Icon: Camera },
  { id: 'cutaway', label: 'Electrical cutaway', Icon: CircuitBoard },
  { id: 'futures', label: 'Two futures', Icon: GitBranch },
  { id: 'repair', label: 'Repair & verify', Icon: Wrench },
] as const;

export function WorkflowPanel() {
  const tab = useWorkflow((s) => s.tab);
  const setTab = useWorkflow((s) => s.setTab);
  const panelId = useSelectedPanelId();
  return <section className="sy-workflow" aria-label="Incident workflow">
    <nav className="workflow-tabs" aria-label="Workflow steps">{TABS.map(({ id, label, Icon }) => <button type="button" key={id} className="tool" aria-pressed={tab === id} onClick={() => setTab(id)}><Icon size={18} />{label}</button>)}</nav>
    <div key={`${panelId}:${tab}`} className="workflow-body">
      {tab === 'evidence' ? <EvidenceWorkspace panelId={panelId} /> : tab === 'cutaway' ? <Cutaway panelId={panelId} /> : tab === 'futures' ? <Futures panelId={panelId} /> : <RepairWorkspace panelId={panelId} />}
    </div>
  </section>;
}

function EvidenceWorkspace({ panelId }: { panelId: string }) {
  const captures = useWorkflow((s) => s.captures);
  const inspected = useInspected(panelId);
  const [selected, setSelected] = useState<string | null>(null);
  const mine = captures.filter((c) => c.panelId === panelId);
  const picked = mine.find((c) => `${c.result.run}:${c.result.source}:${c.siteSeconds}` === selected) ?? mine.at(-1);
  const session = useSession();
  const mission = session.missions.find((m) => m.panelId === panelId && session.siteSeconds >= m.startedAt + MISSION.outbound);
  const inspect = () => {
    useWorkflow.getState().inspect(panelId);
    session.setModule('site');
    session.setFollowFlight(false);
  };
  return <>
    <div className="workflow-intro"><div><span className="chip" data-sev="active">Evidence workspace</span><h2>One array. Every viewpoint.</h2><p>Hold the simulated camera, examine the heat band and keep each RGB capture with its actual model result. Another angle adds coverage; it can still return no crack box.</p></div><button type="button" className="tool primary" disabled={!inspected && !mission || Boolean(session.twinFallback)} onClick={inspect}><Camera size={18} />Open inspection view</button></div>
    {!inspected && !mission && <p className="well">Dispatch a drone from the array panel first. The inspection view becomes available when it reaches this array.</p>}
    <div className="workflow-columns">
      <div className="workflow-card"><h3>Captured RGB evidence</h3>{picked ? <><DetectionBoxes result={picked.result} /><p className="capture-caption"><span className="id">{panelId}</span> · {picked.angle} · {siteClockAt(picked.siteSeconds)} · {picked.outcome === 'result' ? `${picked.result.detections.length ? 'Crack box returned' : 'No crack box returned'} · ${Math.round(picked.result.elapsedMs)} ms` : picked.outcome === 'failed' ? 'Inference failed · capture retained' : 'Inference unavailable'}</p><p>Simulated RGB viewpoint. An empty detection is not proof that the module is intact.</p></> : <p className="empty well">Captures appear here as the drone inspects this array, or when you request a new angle.</p>}
        <div className="capture-strip" aria-label="Inspection captures">{mine.map((c, i) => <button type="button" key={`${c.result.source}:${c.siteSeconds}:${i}`} className="capture-thumb" aria-pressed={picked === c} onClick={() => setSelected(`${c.result.run}:${c.result.source}:${c.siteSeconds}`)}>{/* Canvas pixels are already local data URLs and retain their capture resolution. */}{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={c.result.frame} alt={`${panelId}, ${c.angle}, captured RGB frame`} /><span>{c.angle}</span><strong>{c.outcome !== 'result' ? 'Unavailable' : c.result.detections.length ? 'Crack detected' : 'No box'}</strong></button>)}</div>
      </div>
      <div className="workflow-card"><LinkedMatrix panelId={panelId} /><p>Recorded evidence keeps its original viewpoint. The schematic cell selection links the measured matrix to the illustrated band; it does not locate a cell on the source photograph.</p>{hasCapturedEvidence(panelId) && evidenceUrl('thermal') && <figure className="recorded-thermal">{/* Pixelated rendering preserves the recorded thermal frame. */}{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={evidenceUrl('thermal')!} alt="Recorded B-17 thermal evidence in its original viewpoint" /><figcaption>Recorded UAV thermal frame · B-17 · Raptor Maps. This image remains unchanged after a simulated repair.</figcaption></figure>}</div>
    </div>
  </>;
}

function Cutaway({ panelId }: { panelId: string }) {
  const selected = useWorkflow((s) => s.selectedCell);
  const [open, setOpen] = useState(true);
  const [bypass, setBypass] = useState(true);
  const fault = useArrayFault(panelId);
  const reading = useSiteFrame().panels[panelId];
  const crack = fault?.mechanism?.toLowerCase().includes('crack');
  const current = reading.expectedKW / (getPanel(panelId)?.stringsPerArray ?? 1) * (1 + (reading.stringDeviationPct ?? 0) / 100);
  return <>
    <div className="workflow-intro"><div><span className="chip">Illustration of the modelled mechanism</span><h2>Why a small crack costs power.</h2><p>A damaged cell can limit a series path. A bypass path carries current around an affected section, sacrificing voltage and reducing string output. The geometry below explains the model; it is not a wiring survey.</p></div><div className="workflow-actions"><button type="button" className="tool" aria-pressed={open} onClick={() => setOpen(!open)}>{open ? 'Close the layers' : 'Open the layers'}</button><button type="button" className="tool" aria-pressed={bypass} onClick={() => setBypass(!bypass)}>Trace bypass path</button></div></div>
    {!crack && <p className="well">This array has no recorded crack mechanism. The cutaway is an educational illustration; the comparison below still uses this array’s readings.</p>}
    <div className="workflow-columns cutaway-layout">
      <div className="cutaway-stage" data-open={open} data-bypass={bypass}>
        <div className="cutaway-layer backsheet"><span>Backsheet & electrical path</span><svg viewBox="0 0 700 500" aria-label="Illustrative bypass path"><path className="circuit-normal" d="M40 100 H660 V400 H40 V100 M40 200 H660 M40 300 H660" /><path className="circuit-bypass" d="M40 300 H180 V380 H620 V300 H660" /><path className="diode-symbol" d="M365 365 L395 380 L365 395 Z M400 360 V400" /></svg></div>
        <div className="cutaway-layer cell-plane">{cellGrid.matrix.flatMap((row, r) => row.map((_, c) => <button type="button" key={`${r}:${c}`} className="cutaway-cell" aria-pressed={selected?.panelId === panelId && selected.row === r + 1 && selected.col === c + 1} data-hot={hasCapturedEvidence(panelId) && cellGrid.defects.some((d) => d.row === r + 1 && d.col === c + 1)} onClick={() => useWorkflow.getState().selectCell(panelId, r + 1, c + 1)} aria-label={`Select illustrated cell R${r + 1} C${c + 1}`} />))}<span>Cell layer · illustrative layout</span></div>
        <div className="cutaway-layer coverglass"><span>Protective glass</span><svg viewBox="0 0 700 500" aria-hidden><path d="M205 135 L280 175 L335 145 L405 190 L490 180 L590 230" /></svg></div>
        <div className="cutaway-legend"><span>Protective glass</span><span>Cell layer</span><span>Electrical path</span></div>
      </div>
      <div className="workflow-card cutaway-notes"><h3>Follow the chain</h3><ol className="mechanism-chain"><li><strong>Affected cells</strong><p>The illustrated heat band shares the selected cells with the evidence matrix.</p></li><li><strong>Current takes a bypass</strong><p>The highlighted branch explains the alternate path. Switching this trace changes the illustration, never the telemetry.</p></li><li><strong>Less voltage, less output</strong><p>The original fault affects {fault?.faultedStrings ?? 0} of {(getPanel(panelId)?.stringsPerArray ?? 1)} strings. At the current site time, the selected peer string delivers {kW(current)} against {kW(reading.expectedKW / (getPanel(panelId)?.stringsPerArray ?? 1))} expected; completed repairs are included in these readings.</p></li></ol><InverterPanel /><LinkedMatrix panelId={panelId} /></div>
    </div>
  </>;
}

function Futures({ panelId }: { panelId: string }) {
  const [delay, setDelay] = useState<number>(DELAY_OPTIONS[2]);
  const incident = useIncident(panelId);
  const injected = useSession((s) => s.injected);
  const hazards = useSession((s) => s.hazards);
  const runs = useRepairRuns();
  const approved = runs.find((r) => r.panelId === panelId);
  const [at, setAt] = useState(() => approved?.orderAt ?? useSession.getState().siteSeconds);
  const futures = useMemo(() => compareFutures(panelId, at, delay, incident.cause.id, injected, hazards, runs.filter((r) => r.panelId !== panelId)), [panelId, at, delay, incident.cause.id, injected, hazards, runs]);
  const max = Math.max(...futures.later.samples.map((s) => s.lossMWh), ...futures.soon.samples.map((s) => s.lossMWh), 0.01);
  const points = (samples: typeof futures.soon.samples) => samples.map((s) => `${50 + s.hour / FUTURE_HOURS * 850},${245 - s.lossMWh / max * 205}`).join(' ');
  return <>
    <div className="workflow-intro"><div><span className="chip">Forecast comparison · {FUTURE_HOURS} hours</span><h2>The cost of choosing later.</h2><p>Both paths use the same PV model and weather. Repair timing changes the energy that cannot be recovered. Crew travel, shift hours and heat holds are included.</p></div><label className="delay-control">Delay the crew request<select className="tool" value={delay} onChange={(e) => setDelay(Number(e.target.value))}>{DELAY_OPTIONS.map((h) => <option key={h} value={h}>{hours(h)}</option>)}</select></label></div>
    {approved && <p className="well">This comparison revisits the original fault at approval time. Choosing a delay here explores an alternative; your approved crew job keeps its schedule.</p>}
    <div className="futures-chart"><div className="futures-legend"><span data-future="soon">Repair sooner</span><span data-future="later">Delayed request</span>{futures.deadline !== null && <span data-future="deadline">Crack risk deadline</span>}</div><svg viewBox="0 0 950 290" role="img" aria-label="Cumulative energy loss, repair sooner compared with delay"><path className="chart-grid" d="M50 40 H900 M50 140 H900 M50 245 H900" /><polyline className="future-later" points={points(futures.later.samples)} /><polyline className="future-soon" points={points(futures.soon.samples)} />{futures.deadline !== null && futures.deadline * 3600 >= at && futures.deadline * 3600 <= at + FUTURE_HOURS * 3600 && <line className="deadline-line" x1={50 + (futures.deadline - at / 3600) / FUTURE_HOURS * 850} x2={50 + (futures.deadline - at / 3600) / FUTURE_HOURS * 850} y1="30" y2="245" />}<text x="50" y="278">Now</text><text x="900" y="278" textAnchor="end">+{FUTURE_HOURS} h</text><text x="50" y="25">Cumulative lost energy · MWh</text></svg></div>
    <div className="workflow-columns">{(['soon', 'later'] as const).map((key) => { const future = futures[key]; return <article key={key} className="workflow-card future-summary" data-future={key}><h3><i />{key === 'soon' ? 'Repair sooner' : `Request after ${hours(delay)}`}</h3><strong className="future-value">{MWh(future.lossMWh)}</strong><p>{formatINR(future.revenueINR)} revenue exposure</p><FutureTimeline run={future.run} at={at} deadline={futures.deadline} /><dl><div><dt>Repair complete</dt><dd>{future.run ? `+${hours((future.run.completedAt - at) / 3600)} · ${siteClockAt(future.run.completedAt)}` : 'No repair window'}</dd></div><div><dt>Deadline</dt><dd>{futures.deadline === null ? 'No crack deadline' : future.crossesDeadline ? 'Completion crosses deadline' : 'Completion before deadline'}</dd></div></dl><p>{future.crossesDeadline ? 'The risk deadline is crossed. The model does not simulate additional crack propagation, so this curve does not include escalation losses.' : 'Intervention removes the modelled fault. Weather effects can remain.'}</p></article>; })}</div>
    <div className="workflow-actions"><button type="button" className="tool" onClick={() => setAt(approved?.orderAt ?? useSession.getState().siteSeconds)}>{approved ? 'Refresh approval-time comparison' : 'Refresh from current site time'}</button><p className="workflow-basis">{TARIFF_BASIS}. Forecast snapshot starts at {siteClockAt(at)}. These are simulated outcomes, not guaranteed savings or repair costs.</p></div>
  </>;
}

function FutureTimeline({ run, at, deadline }: { run: ReturnType<typeof compareFutures>['soon']['run']; at: number; deadline: number | null }) {
  const position = (seconds: number) => Math.max(0, Math.min(100, (seconds - at) / (FUTURE_HOURS * 3600) * 100));
  return <div className="future-timeline" aria-label="Projected repair timeline">
    <div className="future-track" aria-hidden>{run && <><i className="future-wait" style={{ width: `${position(run.departedAt)}%` }} /><i className="future-work" style={{ left: `${position(run.departedAt)}%`, width: `${position(run.completedAt) - position(run.departedAt)}%` }} /><i className="future-restored" style={{ left: `${position(run.completedAt)}%`, width: `${100 - position(run.completedAt)}%` }} /><b className="future-complete" style={{ left: `${position(run.completedAt)}%` }} /></>}{deadline !== null && deadline * 3600 >= at && deadline * 3600 <= at + FUTURE_HOURS * 3600 && <b className="future-deadline" style={{ left: `${position(deadline * 3600)}%` }} />}</div>
    <div className="future-ticks"><span>Now</span><span>+{hours(FUTURE_HOURS)}</span></div>
    <p>{run ? `Crew reaches array in ${hours((run.arrivedAt - at) / 3600)}; output restored after ${hours((run.completedAt - at) / 3600)}.` : 'No safe crew window is available in this horizon.'}{deadline !== null && ` Risk deadline ${deadline * 3600 < at ? 'already crossed' : `in ${hours(deadline - at / 3600)}`}.`}</p>
  </div>;
}

function RepairWorkspace({ panelId }: { panelId: string }) {
  const session = useSession();
  const incident = useIncident(panelId);
  const inspected = useInspected(panelId);
  const runs = useRepairRuns();
  const run = runs.find((r) => r.panelId === panelId);
  const order = session.workOrders.find((o) => o.panelId === panelId);
  const fault = useArrayFault(panelId);
  const repair = repairFor(incident.cause.id, fault);
  const frame = useSiteFrame();
  const error = useWorkflow((s) => s.error);
  const phase = run ? repairPhase(run, session.siteSeconds) : null;
  const progress = run ? repairProgress(run, session.siteSeconds) : 0;
  const { before, after } = useRepairComparison(panelId);
  const captures = useWorkflow((s) => s.captures);
  const verificationCapture = run && captures.findLast((c) => c.panelId === panelId && c.siteSeconds >= run.completedAt && c.siteSeconds <= session.siteSeconds && c.outcome === 'result');
  const canVerify = phase === 'verification' && frame.irradiance > 0 && verificationCapture?.result.detections.length === 0 && after?.status === 'healthy' && Math.abs(after.deviationPct) < Math.abs(before.deviationPct);
  const verified = run?.verifiedAt !== undefined && run.verifiedAt <= session.siteSeconds;
  const capacity = crewAvailability(runs, session.siteSeconds);
  const preview = (at: number) => { useSession.setState({ running: false }); session.setSiteSeconds(at); };
  return <>
    <div className="workflow-intro"><div><span className="chip" data-sev="active">Human approval → simulated crew → verification</span><h2>Finish the job. Prove the change.</h2><p>Approval authorises the work. A crew then travels and completes the declared repair duration. A fresh RGB capture and a daylight output comparison support your verification decision.</p></div><span className="chip">{run ? phase : order ? 'Approved · crew not dispatched' : 'Awaiting approval'}</span></div>
    {phase === 'closed' ? <p role="status" className="workflow-complete"><CheckCheck size={24} />Incident closed by the operator. The approval, simulated repair and verification record are retained.</p> : verified && <p role="status" className="well">Verification accepted at {siteClockAt(run!.verifiedAt!)}. Close the incident when you are ready.</p>}
    <ol className="repair-steps">{MAINTENANCE_PHASES.map((p, i) => <li key={p} data-done={phase !== null && i <= MAINTENANCE_PHASES.indexOf(phase)}><span>{i + 1}</span><strong>{p === 'waiting' ? 'Crew reserved' : p === 'travelling' ? 'Reach the array' : p === 'repairing' ? 'Complete repair' : p === 'verification' ? 'Verify evidence' : 'Close incident'}</strong></li>)}</ol>
    <div className="workflow-columns"><article className="workflow-card"><h3>{run ? `Crew ${run.crew + 1} · ${Math.round(progress * 100)}% work complete` : 'Approve the right action'}</h3><p>{repair.parts.join(' + ') || 'No repair established'} · {hours(repair.hours)} declared field work. Travel scales with array access; shift and heat restrictions use the crew planner’s rules.</p>
      <p className="well"><strong>{capacity.available} of {capacity.total} crews available</strong> · {capacity.reserved} reserved. Crews leave the {SERVICE_HUB.name.toLowerCase()} and remain reserved through work, safety holds and the return journey. {capacity.available === 0 ? 'The next approved job waits for a returning crew and a safe shift window.' : 'Dispatch assigns the earliest available crew.'}</p>
      {!order ? <button type="button" className="tool primary" disabled={!repair.hours || incident.cause.id === 'unexplained' || incident.cause.needsDrone && !inspected} onClick={() => session.createWorkOrder(panelId, `Operator approved ${repair.parts.join(' + ')} via repair workflow`)}>Approve and create work order<ArrowRight size={18} /></button>
        : !run ? <button type="button" className="tool primary" onClick={() => useWorkflow.getState().startRepair(panelId, incident.cause.id)}>Dispatch simulated crew<ArrowRight size={18} /></button> : <>
          <dl className="repair-times"><div><dt>Departure</dt><dd>{siteClockAt(run.departedAt)}</dd></div><div><dt>Arrival · {hours((run.arrivedAt - run.departedAt) / 3600)} travel</dt><dd>{siteClockAt(run.arrivedAt)}</dd></div><div><dt>Repair complete</dt><dd>{siteClockAt(run.completedAt)}</dd></div>{run.returnedAt !== undefined && <div><dt>Crew back at base</dt><dd>{siteClockAt(run.returnedAt)}</dd></div>}</dl>
          <progress max={1} value={progress} aria-label="Repair work complete" />
          {session.siteSeconds < (run.returnedAt ?? run.completedAt) && <div className="workflow-actions"><button type="button" className="tool" onClick={() => preview(session.siteSeconds < run.arrivedAt ? run.arrivedAt : session.siteSeconds < run.completedAt ? run.completedAt : run.returnedAt!)}>Preview {session.siteSeconds < run.arrivedAt ? 'crew arrival' : session.siteSeconds < run.completedAt ? 'repair completion' : 'crew return'}</button><button type="button" className="tool" disabled={Boolean(session.twinFallback)} onClick={() => { useWorkflow.setState({ watchingRepair: panelId, inspection: null }); session.setFollowFlight(false); session.setModule('site'); session.selectPanel(panelId); session.setTimeScale(MAINTENANCE_PLAYBACK); useSession.setState({ running: true }); }}>Watch in the field</button></div>}
          <p className="workflow-basis">Preview advances the shared site clock and pauses the simulation. All arrays and weather move to the same time. Watch uses {MAINTENANCE_PLAYBACK}× playback in the wide field view; the displayed travel and work durations stay in site time.</p>
        </>}{error && <p role="alert">{error}</p>}
    </article><article className="workflow-card verification-card"><h3><CheckCheck size={21} />Compare at the same conditions</h3><div className="verification-values"><div><span>Without intervention</span><strong>{kW(before.actualKW)}</strong><span>{pct(before.deviationPct)} deviation</span></div><ArrowRight size={22} /><div><span>After simulated repair</span><strong>{after && session.siteSeconds >= run!.completedAt ? kW(after.actualKW) : 'Awaiting completion'}</strong><span>{after && session.siteSeconds >= run!.completedAt ? pct(after.deviationPct) : 'Output comparison pending'}</span></div></div>
      <dl><div><dt>Modelled cell temperature without repair</dt><dd>{degC(before.cellTempC)}</dd></div><div><dt>Modelled temperature after repair</dt><dd>{after ? degC(after.cellTempC) : 'Awaiting completion'}</dd></div></dl>
      <p>Before and after are model outputs at identical current weather, not readings from different times. Recorded thermal evidence remains the pre-repair record. The rendered post-repair heat band is a simulation; no thermal classifier has verified it.</p>
      {run && session.siteSeconds >= run.completedAt && <><button type="button" className="tool" disabled={Boolean(session.twinFallback)} onClick={() => { useWorkflow.getState().inspect(panelId); session.setModule('site'); session.setFollowFlight(false); }}>Capture verification pass<Camera size={18} /></button>{verificationCapture && <p className="well">Fresh RGB: {verificationCapture.result.detections.length ? 'A crack box remains. Review it before signing off.' : 'No crack box returned. This alone does not prove repair success.'}</p>}<button type="button" className="tool primary" disabled={!canVerify} onClick={() => useWorkflow.getState().verify(panelId)}>Accept simulated verification</button><button type="button" className="tool primary" disabled={!verified || !canVerify} onClick={() => useWorkflow.getState().close(panelId)}>Close incident</button>{phase === 'closed' && <p role="status" className="well">Operator closed the simulated repair. The approval and verification record are retained.</p>}{!canVerify && phase !== 'closed' && <p className="workflow-basis">Verification needs daylight, a fresh successful RGB inference and improved model output. Review any remaining crack box or weather loss before accepting.</p>}</>}
    </article></div>
  </>;
}
