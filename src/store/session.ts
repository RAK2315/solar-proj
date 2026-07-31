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
 *
 * PERSISTENCE. A work order that evaporates on refresh is not a work order, so the
 * operator's session survives reload: site time, missions, work orders, selection.
 *
 * It goes through zustand's `persist` middleware rather than touching storage
 * directly, and that is deliberate — the ESLint rule banning localStorage across
 * src/ stays in force. Ad-hoc storage scattered through components is what that
 * rule is for; ONE store, declaring exactly which fields outlive a refresh, is a
 * different thing. Everything not listed in `partialize` is derived and is
 * recomputed on load.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { useDemoClock } from './demoClock';

import { scenario, type ScenarioEvent } from '@/lib/live';

export type Mode = 'live' | 'demo';

/**
 * The screens behind the icon rail. `site` is the map and the detail rail — the
 * default and the one the demo needs. The other four are real screens over real
 * state, which is why the rail is navigation now rather than decoration.
 */
export type ModuleId = 'site' | 'drones' | 'missions' | 'repairs' | 'analytics' | 'scenario';

/** Severity floor for the event feed. `all` is the default. */
export type FeedFilter = 'all' | 'warning' | 'critical';

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

/**
 * An operator declining the agent's recommendation, with a reason.
 *
 * This is the other half of the approval gate and it was missing. A gate that
 * only has a yes is not a gate — it is a delay. OVERRIDE is the no, it is
 * recorded rather than swallowed, and it is reversible.
 */
export interface Override {
  panelId: string;
  createdAt: number;
  reason: string;
}

/** The mechanisms an operator can inject. Each maps to a physics configuration. */
export const INJECTABLE = {
  'crack-early': {
    label: 'Hairline crack — 2 strings',
    faultedStrings: 2,
    terminalMismatch: 0.68,
    rampMinutes: 4,
    mechanism: 'early hairline crack, two strings bypassed',
  },
  'crack-established': {
    label: 'Established crack — 5 strings',
    faultedStrings: 5,
    terminalMismatch: 0.416,
    rampMinutes: 3,
    mechanism: 'cracked cell driving its bypass diode into conduction',
  },
  'crack-advanced': {
    label: 'Advanced crack — 6 strings',
    faultedStrings: 6,
    terminalMismatch: 0.34,
    rampMinutes: 6,
    mechanism: 'advanced crack propagation, six strings bypassed',
  },
  'string-outage': {
    label: 'String outage — 1 string open',
    faultedStrings: 1,
    terminalMismatch: 0.0,
    rampMinutes: 1,
    mechanism: 'string disconnected at the combiner — open circuit',
  },
} as const;

export type InjectableId = keyof typeof INJECTABLE;

export interface SessionState {
  mode: Mode;

  /** Which screen the operator is on. */
  module: ModuleId;

  /** Seconds of SITE time since the scenario epoch. */
  siteSeconds: number;
  /** Site seconds per real second. 60 = a solar day in 24 real minutes. */
  timeScale: number;
  running: boolean;

  /** The array the right rail is describing. Null = nothing selected. */
  selectedPanelId: string | null;

  missions: Mission[];
  workOrders: WorkOrder[];
  overrides: Override[];

  /** Faults the operator raised this session, on top of the committed scenario. */
  injected: ScenarioEvent[];

  feedFilter: FeedFilter;

  setMode: (m: Mode) => void;
  setModule: (m: ModuleId) => void;
  selectPanel: (id: string | null) => void;
  setTimeScale: (s: number) => void;
  toggleRunning: () => void;
  cycleFeedFilter: () => void;

  dispatch: (panelId: string) => void;
  createWorkOrder: (panelId: string, note: string) => void;
  overrideRecommendation: (panelId: string, reason: string) => void;
  clearOverride: (panelId: string) => void;

  injectFault: (panelId: string, kind: InjectableId) => void;
  clearInjected: (panelId?: string) => void;

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
  module: 'site' as ModuleId,
  siteSeconds: 0,
  timeScale: scenario.defaultTimeScale,
  running: true,
  selectedPanelId: null as string | null,
  missions: [] as Mission[],
  workOrders: [] as WorkOrder[],
  overrides: [] as Override[],
  injected: [] as ScenarioEvent[],
  feedFilter: 'all' as FeedFilter,
};

const FILTER_CYCLE: FeedFilter[] = ['all', 'warning', 'critical'];

export const useSession = create<SessionState>()(persist((set, get) => ({
  ...initial,

  // Demo mode plays a scripted incident over the map, so entering it returns to
  // the map. Otherwise pressing M mid-demo would play the beats behind a screen
  // that cannot show them.
  setMode: (mode) => set(mode === 'demo' ? { mode, module: 'site' } : { mode }),
  setModule: (module) => set({ module }),
  selectPanel: (selectedPanelId) => set({ selectedPanelId }),
  setTimeScale: (timeScale) => set({ timeScale }),
  toggleRunning: () => set((s) => ({ running: !s.running })),

  cycleFeedFilter: () => set((s) => ({
    feedFilter: FILTER_CYCLE[(FILTER_CYCLE.indexOf(s.feedFilter) + 1) % FILTER_CYCLE.length],
  })),

  dispatch: (panelId) => set((s) => {
    // One mission per array at a time. A second drone to the same panel is an
    // operator mistake, not a feature.
    if (s.missions.some((m) => m.panelId === panelId
      && missionPhaseAt(m, s.siteSeconds) !== 'complete')) return s;

    const busy = s.missions.filter(
      (m) => missionPhaseAt(m, s.siteSeconds) !== 'complete',
    ).length;
    if (busy >= 2) return s;                    // two drones on the site, both real

    // Clear any held view override, so this mission cuts to the cinematic rather
    // than being silently suppressed by a decision the operator made two missions
    // ago. Sending a drone is a request to watch it.
    useDemoClock.getState().clearViewOverride();

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

  /**
   * The operator declines the recommendation. Recorded with a reason, visible in
   * the rail and in the repairs screen, and reversible — an override is a
   * decision, and a decision you cannot see or undo is just a lost click.
   */
  overrideRecommendation: (panelId, reason) => set((s) => (
    s.overrides.some((o) => o.panelId === panelId) ? s : {
      overrides: [...s.overrides, { panelId, createdAt: s.siteSeconds, reason }],
    }
  )),

  clearOverride: (panelId) => set((s) => ({
    overrides: s.overrides.filter((o) => o.panelId !== panelId),
  })),

  /**
   * Inject a fault, so the console can be exercised on more than the three cases
   * the committed scenario ships with.
   *
   * The injection writes a SCENARIO EVENT and nothing else. It never writes a
   * reading: the array's output, deviation, status, cell temperature and place in
   * the queue are all computed by the same physics that evaluates the committed
   * faults. That is the difference between a test case and a fake — a fake would
   * let you type −58.4 % onto an array, and this cannot.
   */
  injectFault: (panelId, kind) => set((s) => {
    // One fault per array. The committed schedule wins; the site's own history is
    // not something an operator gets to overwrite from a form.
    if (s.injected.some((e) => e.panelId === panelId)) return s;
    if (scenario.events.some((e) => e.panelId === panelId)) return s;

    const spec = INJECTABLE[kind];
    return {
      injected: [...s.injected, {
        id: `inj-${panelId.toLowerCase()}-${kind}`,
        type: 'mismatch-fault',
        panelId,
        // Starts now, in site hours, so it ramps in while the operator watches.
        startHour: scenario.epochHour + s.siteSeconds / 3600,
        rampMinutes: spec.rampMinutes,
        faultedStrings: spec.faultedStrings,
        terminalMismatch: spec.terminalMismatch,
        accessCost: 1.0,
        mechanism: spec.mechanism,
        injected: true,
      }],
    };
  }),

  clearInjected: (panelId) => set((s) => ({
    injected: panelId ? s.injected.filter((e) => e.panelId !== panelId) : [],
  })),

  /** Clears the operator's session. The site itself is not resettable — it is a site. */
  resetSession: () => set({ ...initial }),

  _tickLive: (dt) => {
    const { running, timeScale, siteSeconds } = get();
    if (!running) return;
    set({ siteSeconds: siteSeconds + dt * timeScale });
  },
}), {
  name: 'surya-session',
  version: 1,
  // Hydrated explicitly after mount by ClockDriver. Reading storage during render
  // would make the server and client disagree on the very first paint.
  skipHydration: true,
  // Exactly what an operator would expect to still be there after a refresh.
  // Nothing derived is stored: readings, statuses, mission phases and the event
  // feed are all recomputed from these.
  partialize: (s) => ({
    mode: s.mode,
    module: s.module,
    siteSeconds: s.siteSeconds,
    timeScale: s.timeScale,
    running: s.running,
    selectedPanelId: s.selectedPanelId,
    missions: s.missions,
    workOrders: s.workOrders,
    overrides: s.overrides,
    injected: s.injected,
    feedFilter: s.feedFilter,
  }),
}));

/** Arrays the operator has declined to act on. */
export const useOverrides = (): ReadonlySet<string> => {
  const overrides = useSession((s) => s.overrides);
  return new Set(overrides.map((o) => o.panelId));
};

/** Arrays with an approved work order — they read as `scheduled`. */
export const useScheduledIds = (): ReadonlySet<string> => {
  const orders = useSession((s) => s.workOrders);
  return new Set(orders.map((w) => w.panelId));
};
