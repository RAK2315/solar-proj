'use client';

/**
 * src/store/session.ts — the LIVE console's state.
 *
 * The demo clock (`demoClock.ts`) replays a scripted incident: everything derives
 * from `t` and the only mutable state is `approved`. That is right for a recording
 * and wrong for a product, because in a product things happen because an operator
 * did them.
 *
 * So there are two modes over one set of components:
 *
 *   demo  — `t` drives everything. Seekable, reproducible, 90 seconds.
 *   live  — site time advances, the operator selects arrays, dispatches drones and
 *           approves work. State is real.
 *
 * STILL ONE requestAnimationFrame LOOP. The driver in hooks/useDemoClock.ts advances
 * whichever clock the current mode uses. A second loop would be the same bug it has
 * always been, and the ESLint rule still fails the build over it.
 *
 * Live mode stays reproducible: site time is deterministic, faults come from the
 * committed scenario, and nothing is random. Reload and you get the same site — the
 * operator's own actions are the only thing that differs, which is the point.
 */

import { create } from 'zustand';

import { scenario } from '@/lib/live';

export type Mode = 'live' | 'demo';

/** Where a dispatched drone is in its mission. */
export type MissionPhase = 'idle' | 'outbound' | 'inspecting' | 'returning' | 'complete';

export interface Mission {
  id: string;
  droneId: string;
  panelId: string;
  /** Site seconds at dispatch — everything about the mission derives from this. */
  startedAt: number;
  phase: MissionPhase;
}

export interface WorkOrder {
  id: string;
  panelId: string;
  createdAt: number;
  note: string;
}

export interface SessionState {
  mode: Mode;

  /** Seconds of SITE time since the scenario epoch. */
  siteSeconds: number;
  /** Site seconds per real second. 60 = a solar day in 24 real minutes. */
  timeScale: number;
  running: boolean;

  /** The array the right rail is describing. Null = nothing selected. */
  selectedPanelId: string | null;

  missions: Mission[];
  workOrders: WorkOrder[];

  setMode: (m: Mode) => void;
  selectPanel: (id: string | null) => void;
  setTimeScale: (s: number) => void;
  toggleRunning: () => void;

  dispatch: (panelId: string) => void;
  createWorkOrder: (panelId: string, note: string) => void;
  resetSession: () => void;

  /** Called ONLY by the single rAF driver. */
  _tickLive: (dtSeconds: number) => void;
}

/** Mission timings, in SITE seconds. Mirrors the demo's beat spacing. */
export const MISSION = {
  outbound: 16 * 60,
  inspecting: 22 * 60,
  returning: 18 * 60,
} as const;

export const MISSION_TOTAL = MISSION.outbound + MISSION.inspecting + MISSION.returning;

/** Phase of a mission at a given site time — derived, never stored per frame. */
export function missionPhaseAt(m: Mission, siteSeconds: number): MissionPhase {
  const elapsed = siteSeconds - m.startedAt;
  if (elapsed < 0) return 'idle';
  if (elapsed < MISSION.outbound) return 'outbound';
  if (elapsed < MISSION.outbound + MISSION.inspecting) return 'inspecting';
  if (elapsed < MISSION_TOTAL) return 'returning';
  return 'complete';
}

/** 0..1 along the outbound leg, which is what the map route draws. */
export function missionProgressAt(m: Mission, siteSeconds: number): number {
  const elapsed = siteSeconds - m.startedAt;
  return Math.max(0, Math.min(1, elapsed / MISSION.outbound));
}

const initial = {
  mode: 'live' as Mode,
  siteSeconds: 0,
  timeScale: scenario.defaultTimeScale,
  running: true,
  selectedPanelId: null as string | null,
  missions: [] as Mission[],
  workOrders: [] as WorkOrder[],
};

export const useSession = create<SessionState>((set, get) => ({
  ...initial,

  setMode: (mode) => set({ mode }),
  selectPanel: (selectedPanelId) => set({ selectedPanelId }),
  setTimeScale: (timeScale) => set({ timeScale }),
  toggleRunning: () => set((s) => ({ running: !s.running })),

  dispatch: (panelId) => set((s) => {
    // One mission per array at a time. A second drone to the same panel is an
    // operator mistake, not a feature.
    if (s.missions.some((m) => m.panelId === panelId
      && missionPhaseAt(m, s.siteSeconds) !== 'complete')) return s;

    const busy = s.missions.filter(
      (m) => missionPhaseAt(m, s.siteSeconds) !== 'complete',
    ).length;
    if (busy >= 2) return s;                    // two drones on the site, both real

    return {
      missions: [...s.missions, {
        id: `MSN-${String(s.missions.length + 1).padStart(3, '0')}`,
        droneId: busy === 0 ? 'DRONE 01' : 'DRONE 02',
        panelId,
        startedAt: s.siteSeconds,
        phase: 'outbound',
      }],
    };
  }),

  createWorkOrder: (panelId, note) => set((s) => {
    if (s.workOrders.some((w) => w.panelId === panelId)) return s;
    return {
      workOrders: [...s.workOrders, {
        id: `INC-${panelId.replace('-', '')}`,
        panelId,
        createdAt: s.siteSeconds,
        note,
      }],
    };
  }),

  resetSession: () => set({ ...initial }),

  _tickLive: (dt) => {
    const { running, timeScale, siteSeconds } = get();
    if (!running) return;
    set({ siteSeconds: siteSeconds + dt * timeScale });
  },
}));

/** Arrays with an approved work order — they read as `scheduled`. */
export const useScheduledIds = (): ReadonlySet<string> => {
  const orders = useSession((s) => s.workOrders);
  return new Set(orders.map((w) => w.panelId));
};
