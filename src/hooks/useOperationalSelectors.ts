'use client';

import { useMemo, useRef } from 'react';
import { eventFor, inverterComparison, liveFrameAt, referenceReadingAt } from '@/lib/live';
import { crewHoursSpent, repairPhase, servicesFor } from '@/lib/maintenance';
import { liveQueueAt, projected72hLossMWh } from '@/lib/queue';
import { outlook } from '@/lib/outlook';
import { farm } from '@/lib/data';
import { useArrayTints as useBaseTints, useIncident as useBaseIncident, useSchedule as useBaseSchedule, useSelectedPanelId, useSiteFrame as useBaseFrame, type ZoneBreakdown } from '@/store/selectors';
import { problemKey, solve, type Plan } from '@/lib/scheduler';
import { useSolver } from '@/store/solver';
import { useSession } from '@/store/session';
import { useWorkflow } from './useWorkflow';

export function useRepairRuns() {
  const runs = useWorkflow((s) => s.repairs);
  const orders = useSession((s) => s.workOrders);
  return useMemo(() => runs.filter((r) => orders.some((o) => o.panelId === r.panelId && o.createdAt === r.orderAt)), [runs, orders]);
}
export function useSiteFrame() {
  const base = useBaseFrame();
  const runs = useRepairRuns();
  const injected = useSession((s) => s.injected);
  const hazards = useSession((s) => s.hazards);
  const orders = useSession((s) => s.workOrders);
  return useMemo(() => runs.length ? liveFrameAt(base.siteSeconds, new Set(orders.map((o) => o.panelId)), injected, hazards, servicesFor(runs)) : base,
    [base, runs, injected, hazards, orders]);
}
export function usePanelReading(id: string) { return useSiteFrame().panels[id]; }
export function useRepairComparison(panelId: string) {
  const frame = useSiteFrame();
  const runs = useRepairRuns();
  const injected = useSession((s) => s.injected);
  const hazards = useSession((s) => s.hazards);
  return useMemo(() => ({ before: liveFrameAt(frame.siteSeconds, new Set(), injected, hazards).panels[panelId],
    after: runs.some((r) => r.panelId === panelId && frame.siteSeconds >= r.completedAt) ? frame.panels[panelId] : null }), [frame, runs, injected, hazards, panelId]);
}
export function useInverterReadings() {
  const frame = useSiteFrame();
  const panelId = useSelectedPanelId();
  return useMemo(() => inverterComparison(frame, panelId), [frame, panelId]);
}
export function useProjectedLossMWh(panelId: string) {
  const frame = useSiteFrame();
  const runs = useRepairRuns();
  const injected = useSession((s) => s.injected);
  const hazards = useSession((s) => s.hazards);
  const reading = referenceReadingAt(panelId, frame.siteSeconds, injected, hazards, servicesFor(runs));
  return projected72hLossMWh(Math.max(0, reading.expectedKW - reading.actualKW));
}
export function useIncident(panelId: string) {
  const original = useBaseIncident(panelId);
  const frame = useSiteFrame();
  const runs = useRepairRuns();
  const injected = useSession((s) => s.injected);
  const hazards = useSession((s) => s.hazards);
  return useMemo(() => {
    const run = runs.find((r) => r.panelId === panelId && frame.siteSeconds >= r.completedAt);
    if (!run) return original;
    const phase = repairPhase(run, frame.siteSeconds);
    const residual = referenceReadingAt(panelId, frame.siteSeconds, injected, hazards, servicesFor(runs)).status !== 'healthy';
    return { ...original, state: phase === 'closed' ? residual ? 'detected' as const : 'clear' as const : 'scheduled' as const,
      cause: { ...original.cause, needsDrone: false, label: phase === 'closed' ? residual ? 'Repair closed · a shortfall remains' : 'Simulated repair closed' : 'Repair complete · verify the result',
        says: 'The simulated intervention is complete. Original evidence is retained as the pre-repair record.',
        action: phase === 'closed' ? residual ? 'Review current weather and array output. Closing the original repair does not clear a later shortfall.' : 'Monitor the array for a new shortfall.' : 'Compare fresh RGB evidence and model output before closing the incident.' },
      chain: original.chain.map((step) => step.key === 'recommendation' ? { ...step, says: 'Repair completed in the simulation. Review fresh evidence and accept verification before closing.' }
        : step.key === 'decision' ? { ...step, says: phase === 'closed' ? 'Operator accepted verification and closed the simulated repair.' : 'Operator approved the job. Repair completed; verification remains a separate operator decision.' }
          : step.key === 'forecast' ? { ...step, says: 'This was the pre-repair exposure. Current output includes the simulated intervention; open Two futures for a separate timing comparison.' }
            : step.key === 'observation' ? { ...step, says: `Without intervention, the model would show: ${step.says ?? ''}` }
              : step.key === 'evidence' ? { ...step, label: 'Original evidence before repair', says: `Pre-repair evidence record: ${step.says ?? ''}` } : step) };
  }, [original, frame.siteSeconds, runs, panelId, injected, hazards]);
}
export function useOutlook(hours: number) {
  const orders = useSession((s) => s.workOrders);
  const injected = useSession((s) => s.injected);
  const hazards = useSession((s) => s.hazards);
  const runs = useRepairRuns();
  return useMemo(() => outlook(new Set(orders.map((o) => o.panelId)), injected, hazards, hours, 4, servicesFor(runs)), [orders, injected, hazards, hours, runs]);
}
export function useLossAttribution() {
  const frame = useSiteFrame();
  const injected = useSession((s) => s.injected);
  const runs = useRepairRuns();
  return useMemo(() => {
    const buckets = new Map<string, { kW: number; arrays: string[] }>();
    for (const [id, r] of Object.entries(frame.panels)) {
      const shortfall = Math.max(0, r.expectedKW - r.actualKW);
      if (shortfall <= 0.01) continue;
      const serviced = runs.some((run) => run.panelId === id && run.kind !== 'cleaning' && frame.siteSeconds >= run.completedAt);
      const cause = !serviced && eventFor(id, injected) ? 'Cell mismatch and bypass diode' : frame.affected[id] !== undefined ? 'Sandbox hazard footprint' : 'Soiling above nominal';
      const bucket = buckets.get(cause) ?? { kW: 0, arrays: [] };
      bucket.kW += shortfall;
      bucket.arrays.push(id);
      buckets.set(cause, bucket);
    }
    return [...buckets].map(([cause, b]) => ({ cause, ...b })).sort((a, b) => b.kW - a.kW);
  }, [frame, injected, runs]);
}
export function useZoneBreakdown(): ZoneBreakdown[] {
  const frame = useSiteFrame();
  return useMemo(() => farm.zones.map((z) => ({ id: z.id, total: z.panels.length,
    warning: z.panels.filter((p) => frame.panels[p.id].status === 'warning').length,
    critical: z.panels.filter((p) => frame.panels[p.id].status === 'critical').length,
    scheduled: z.panels.filter((p) => frame.panels[p.id].status === 'scheduled').length,
    shortfallKW: z.panels.reduce((sum, p) => sum + Math.max(0, frame.panels[p.id].expectedKW - frame.panels[p.id].actualKW), 0) })), [frame]);
}
export function useLiveQueue() {
  const frame = useSiteFrame();
  const orders = useSession((s) => s.workOrders);
  const injected = useSession((s) => s.injected);
  const hazards = useSession((s) => s.hazards);
  const runs = useRepairRuns();
  return useMemo(() => {
    const services = servicesFor(runs);
    const serviced = new Set(runs.filter((r) => frame.siteSeconds >= r.completedAt
      && referenceReadingAt(r.panelId, frame.siteSeconds, injected, hazards, services).status === 'healthy').map((r) => r.panelId));
    const queue = liveQueueAt(frame, new Set(orders.map((o) => o.panelId)), injected, hazards);
    return { ...queue, tasks: queue.tasks.filter((t) => !serviced.has(t.panelId)), unscheduled: queue.unscheduled.filter((id) => !serviced.has(id)) };
  }, [frame, orders, injected, hazards, runs]);
}
export function useArrayTints() {
  const original = useBaseTints();
  const frame = useSiteFrame();
  const runs = useRepairRuns();
  return useMemo(() => {
    if (!runs.length) return original;
    const map = new Map(original);
    for (const run of runs) {
      if (frame.siteSeconds < run.completedAt) continue;
      const reading = frame.panels[run.panelId];
      if (reading.status === 'healthy') map.delete(run.panelId);
      else map.set(run.panelId, reading.status);
    }
    return map;
  }, [original, frame, runs]);
}
export function useSchedule() {
  const original = useBaseSchedule();
  const runs = useRepairRuns();
  const at = useSession((s) => s.siteSeconds);
  const solver = useSolver((s) => s.solver);
  const cache = useRef<{ key: string; plan: Plan } | null>(null);
  // The proposal solver shares one cap across crews; using the tightest budget keeps it feasible.
  const shiftCap = Math.max(0, Math.floor(original.problem.shiftCap - Math.max(0, ...crewHoursSpent(runs, at))));
  const problem = { ...original.problem, shiftCap, jobs: original.problem.jobs.filter((j) => !runs.some((r) => r.panelId === j.panelId)) };
  if (!runs.length) return original;
  const key = `${original.solver}:${problemKey(problem)}`;
  if (cache.current?.key !== key) cache.current = { key, plan: solve(problem, solver) };
  return { ...original, problem, plan: cache.current.plan };
}
