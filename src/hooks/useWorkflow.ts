'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { M, inspectionTarget } from '@/lib/scene';
import { planRepair, servicesFor, withCrewReturn, type RepairRun } from '@/lib/maintenance';
import type { CauseId } from '@/lib/causes';
import type { DetectorResult } from '@/store/detector';
import { useSession } from '@/store/session';
import { liveFrameAt } from '@/lib/live';

export const INSPECTION_ANGLES = [
  { label: 'First angle', t: M.rgb },
  { label: 'Oblique angle', t: M.rgb + 3 },
  { label: 'Opposite angle', t: M.thermal - 1 },
] as const;
export interface Capture {
  panelId: string;
  siteSeconds: number;
  angle: string;
  revision: number;
  result: DetectorResult;
  outcome: 'result' | 'unavailable' | 'failed';
}
interface Inspection {
  panelId: string;
  angle: number;
  mode: 'rgb' | 'thermal';
  revision: number;
  request: number;
}
interface Workflow {
  tab: 'evidence' | 'cutaway' | 'futures' | 'repair';
  open: boolean;
  inspection: Inspection | null;
  watchingRepair: string | null;
  viewRevision: number;
  selectedCell: { panelId: string; row: number; col: number } | null;
  captures: Capture[];
  repairs: RepairRun[];
  error: string | null;
  setTab: (tab: Workflow['tab']) => void;
  inspect: (panelId: string) => void;
  exitInspection: () => void;
  setMode: (mode: Inspection['mode']) => void;
  anotherAngle: () => void;
  requestCapture: () => void;
  selectCell: (panelId: string, row: number, col: number) => void;
  record: (capture: Capture) => void;
  startRepair: (panelId: string, cause: CauseId) => void;
  verify: (panelId: string) => void;
  close: (panelId: string) => void;
}

export function currentRepairs(runs: readonly RepairRun[]): RepairRun[] {
  const orders = useSession.getState().workOrders;
  return runs.filter((r) => orders.some((o) => o.panelId === r.panelId && o.createdAt === r.orderAt));
}

export const useWorkflow = create<Workflow>()(persist((set, get) => ({
  tab: 'evidence', open: false, inspection: null, watchingRepair: null, viewRevision: 0, selectedCell: null, captures: [], repairs: [], error: null,
  setTab: (tab) => set({ tab, open: true }),
  inspect: (panelId) => {
    useSession.getState().selectPanel(panelId);
    const revision = get().viewRevision + 1;
    set({ inspection: { panelId, angle: 0, mode: 'rgb', revision, request: 0 }, viewRevision: revision, watchingRepair: null, selectedCell: null });
  },
  exitInspection: () => set({ inspection: null }),
  setMode: (mode) => set((s) => ({ viewRevision: s.viewRevision + 1, inspection: s.inspection ? { ...s.inspection, mode, request: 0, revision: s.viewRevision + 1 } : null })),
  anotherAngle: () => set((s) => ({ viewRevision: s.viewRevision + 1, inspection: s.inspection ? { ...s.inspection,
    angle: (s.inspection.angle + 1) % INSPECTION_ANGLES.length, mode: 'rgb', revision: s.viewRevision + 1,
    request: s.inspection.request + 1 } : null })),
  requestCapture: () => set((s) => ({ viewRevision: s.viewRevision + 1, inspection: s.inspection ? { ...s.inspection, mode: 'rgb',
    revision: s.viewRevision + 1, request: s.inspection.request + 1 } : null })),
  selectCell: (panelId, row, col) => set({ selectedCell: { panelId, row, col } }),
  // Each frame retains its own viewpoint and empty result; the best-frame cache cannot do that.
  record: (capture) => set((s) => ({ captures: [...s.captures, capture].slice(-24) })),
  startRepair: (panelId, cause) => {
    const session = useSession.getState();
    const order = session.workOrders.find((o) => o.panelId === panelId);
    const existing = currentRepairs(get().repairs);
    if (!order || session.siteSeconds < order.createdAt || existing.some((r) => r.panelId === panelId)) return;
    const run = planRepair(panelId, order.createdAt, session.siteSeconds, cause, session.injected, session.hazards, existing);
    set(run ? { repairs: [...existing, run], error: null } : { error: 'No safe repair window fits the forecast. Review the crew plan or gather better evidence.' });
  },
  verify: (panelId) => {
    const session = useSession.getState();
    const at = session.siteSeconds;
    const run = currentRepairs(get().repairs).find((r) => r.panelId === panelId);
    if (!run || at < run.completedAt) return;
    const capture = get().captures.findLast((c) => c.panelId === panelId && c.siteSeconds >= run.completedAt && c.siteSeconds <= at && c.outcome === 'result');
    const before = liveFrameAt(at, new Set(), session.injected, session.hazards);
    const after = liveFrameAt(at, new Set(), session.injected, session.hazards, servicesFor([run]));
    if (!capture || capture.result.detections.length || before.irradiance <= 0
      || after.panels[panelId].status !== 'healthy'
      || Math.abs(after.panels[panelId].deviationPct) >= Math.abs(before.panels[panelId].deviationPct)) return;
    set((s) => ({ repairs: s.repairs.map((r) => r === run ? { ...r, verifiedAt: at, closedAt: undefined } : r) }));
  },
  close: (panelId) => {
    const at = useSession.getState().siteSeconds;
    const current = currentRepairs(get().repairs);
    set((s) => ({ repairs: s.repairs.map((r) => current.includes(r) && r.panelId === panelId && r.verifiedAt !== undefined
      && at >= r.verifiedAt && at >= r.completedAt ? { ...r, closedAt: at } : r) }));
  },
}), { name: 'surya-workflow', version: 1, partialize: (s) => ({ repairs: s.repairs }),
  migrate: (saved) => {
    const repairs = (saved as { repairs?: RepairRun[] }).repairs ?? [];
    return { repairs: repairs.map((r) => withCrewReturn(r, useSession.getState().hazards, repairs)) };
  },
}));

export function inspectionPose() {
  const inspection = useWorkflow.getState().inspection;
  return inspection ? { ...inspection, t: INSPECTION_ANGLES[inspection.angle].t, target: inspectionTarget(inspection.panelId) } : null;
}

export function activeServices() { return servicesFor(currentRepairs(useWorkflow.getState().repairs)); }

// A rehearsal reset invalidates approvals, even if the next run repeats the same site time.
useSession.subscribe((next, previous) => {
  if (next.workOrders === previous.workOrders) return;
  useWorkflow.setState((s) => ({ repairs: s.repairs.filter((r) => next.workOrders.some((o) => o.panelId === r.panelId && o.createdAt === r.orderAt)),
    ...(next.workOrders.length === 0 && next.missions.length === 0 ? { captures: [], inspection: null, watchingRepair: null, selectedCell: null } : {}) }));
});
