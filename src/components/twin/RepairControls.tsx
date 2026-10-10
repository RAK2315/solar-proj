'use client';

import { Wrench } from 'lucide-react';
import { useWorkflow } from '@/hooks/useWorkflow';
import { useRepairRuns } from '@/hooks/useOperationalSelectors';
import { hours } from '@/lib/format';
import { crewAvailability, repairPhase, repairProgress } from '@/lib/maintenance';
import { crewVehicleAt } from '@/lib/maintenanceScene';
import { SERVICE_HUB } from '@/lib/siteLayout';
import { siteClockAt } from '@/store/selectors';
import { useSession } from '@/store/session';

export function RepairControls() {
  const watching = useWorkflow((s) => s.watchingRepair);
  const runs = useRepairRuns();
  const at = useSession((s) => s.siteSeconds);
  const scale = useSession((s) => s.timeScale);
  const running = useSession((s) => s.running);
  const run = runs.find((r) => r.panelId === watching);
  if (!run) return null;
  const phase = repairPhase(run, at);
  const progress = repairProgress(run, at);
  const vehicle = crewVehicleAt(run, at);
  const capacity = crewAvailability(runs, at);
  const held = phase === 'repairing' && !run.work.some((w) => at >= w.start && at < w.end);
  const nextWork = run.work.find((w) => w.start > at)?.start;
  const next = at < run.departedAt ? run.departedAt : at < run.arrivedAt ? run.arrivedAt
    : held ? nextWork ?? run.completedAt : at < run.completedAt ? run.completedAt
    : run.returnStartedAt !== undefined && at < run.returnStartedAt ? run.returnStartedAt
    : run.returnedAt !== undefined && at < run.returnedAt ? run.returnedAt : null;
  const returning = at >= run.completedAt && run.returnedAt !== undefined && at < run.returnedAt;
  const travel = phase === 'travelling' || returning;
  const returned = run.returnedAt !== undefined && at >= run.returnedAt;
  return <div className="sy-inspection"><aside className="repair-hud glass">
    <span className="chip" data-sev="active"><Wrench size={17} />Simulated maintenance</span>
    <h2>Crew {run.crew + 1} · <span className="id">{run.panelId}</span></h2>
    <strong>{phase === 'waiting' ? 'Crew reserved · awaiting departure' : phase === 'travelling' ? 'Driving to the array' : held ? 'Work paused · safety or shift hold' : phase === 'repairing' ? 'Repair in progress' : returning ? vehicle.returning ? 'Repair complete · returning to base' : 'Repair complete · awaiting safe return' : returned ? phase === 'closed' ? 'Crew available · incident closed' : 'Crew back at base · verify the repair' : 'Ready for verification'}</strong>
    <progress max={1} value={returning ? vehicle.returning ? 1 - vehicle.fraction : 0 : phase === 'travelling' ? vehicle.fraction : progress} aria-label={travel ? 'Crew journey progress' : 'Crew repair progress'} />
    {phase === 'travelling' ? <p>{Math.round(vehicle.fraction * 100)}% of outbound route. Arrival {siteClockAt(run.arrivedAt)} · {hours(Math.max(0, run.arrivedAt - at) / 3600)} remaining.</p> : returning ? <p>Field work complete. Crew available again at {siteClockAt(run.returnedAt!)} · {hours((run.returnedAt! - at) / 3600)} until return.</p> : <p>{Math.round(progress * 100)}% of field work complete. Completion {siteClockAt(run.completedAt)} · {hours(Math.max(0, run.completedAt - at) / 3600)} remaining.</p>}
    <p>{SERVICE_HUB.name} · {capacity.available} of {capacity.total} crews free. Travel takes {hours((run.arrivedAt - run.departedAt) / 3600)} each way under the declared access model. {scale}× playback · {running ? 'running' : 'paused'}. Arrival, work and return times are modelled site durations. The site clock controls all movement; preview seeks the simulation.</p>
    <div className="workflow-actions">{next !== null && <button type="button" className="tool" onClick={() => { useSession.setState({ running: false }); useSession.getState().setSiteSeconds(next); }}>Preview next stage</button>}<button type="button" className="tool primary" onClick={() => { useWorkflow.setState({ watchingRepair: null }); useWorkflow.getState().setTab('repair'); useSession.getState().setModule('incident'); }}>Review repair & verification</button><button type="button" className="tool quiet" onClick={() => useWorkflow.setState({ watchingRepair: null })}>Back to the field</button></div>
  </aside></div>;
}
