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

import { HAZARD_SPEC, type HazardEvent, type HazardKind } from '@/lib/hazard';
import { scenario, type ScenarioEvent } from '@/lib/live';
import { REHEARSAL_SEED } from '@/lib/rehearsal';
import { DEFAULT_TARIFF_INR_PER_KWH } from '@/lib/money';

/**
 * The screens behind the icon rail. `site` is the map and the detail rail — the
 * default and the one the demo needs. The other four are real screens over real
 * state, which is why the rail is navigation now rather than decoration.
 */
export type ModuleId =
  | 'site' | 'incident' | 'queue' | 'analytics' | 'drones' | 'sandbox'
  // The old console's screens. They go when components/console/ does.
  | 'missions' | 'repairs' | 'scenario';

/** Why the twin is showing the 2D map, when it is. Null means the twin is up. */
export type TwinFallback = null | 'webgl' | 'fps';

/** How the operator has asked to see the field. The fallback can still overrule 3D. */
export type TwinMode = '3d' | '2d';

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
    label: 'Hairline crack, 2 strings',
    faultedStrings: 2,
    terminalMismatch: 0.68,
    rampMinutes: 4,
    mechanism: 'early hairline crack, two strings bypassed',
  },
  'crack-established': {
    label: 'Established crack, 5 strings',
    faultedStrings: 5,
    terminalMismatch: 0.416,
    rampMinutes: 3,
    mechanism: 'cracked cell driving its bypass diode into conduction',
  },
  'crack-advanced': {
    label: 'Advanced crack, 6 strings',
    faultedStrings: 6,
    terminalMismatch: 0.34,
    rampMinutes: 6,
    mechanism: 'advanced crack propagation, six strings bypassed',
  },
  'string-outage': {
    label: 'String outage, 1 string open',
    faultedStrings: 1,
    terminalMismatch: 0.0,
    rampMinutes: 1,
    mechanism: 'string disconnected at the combiner, open circuit',
  },
} as const;

export type InjectableId = keyof typeof INJECTABLE;

export interface SessionState {
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

  /**
   * Sandbox hazards dropped this session. Scenario events like `injected`, kept
   * in their own list because every reader of `injected` keys it by array and a
   * heatwave has no array. One store, one clock: a hazard carries the hour it was
   * dropped and everything it does is derived from site time.
   */
  hazards: HazardEvent[];

  /** The hazard the presenter is holding, before it is dropped. Never persisted. */
  armedHazard: HazardKind | null;
  /** Where on the ground the held hazard is, in metres. Null while off the field. */
  hazardDraft: { x: number; z: number } | null;

  feedFilter: FeedFilter;

  /**
   * Electricity tariff, rupees per kWh — the assumption every money figure on
   * screen rests on.
   *
   * It is OPERATOR STATE rather than a constant precisely because we cannot
   * source it. A number nobody can change reads as a claim; one the operator sets
   * reads as what it is. See src/lib/money.ts.
   */
  tariffInrPerKWh: number;

  /**
   * Is the provenance layer on screen?
   *
   * OFF by default. The receipts are what make this product believable and they
   * are not what an operator reads every minute; leaving them on permanently was
   * the density complaint in `docs/ui-brief.md` that the redesign did not fix.
   */
  showWorkings: boolean;

  /**
   * Dark or light.
   *
   * CLAUDE.md §3 forbids a theme toggle outright — "no dark/light toggle" — on the
   * grounds that this runs on a projector in a dark room. The owner asked for one
   * on 30 Aug after using it on a laptop in daylight, which is a case the spec did
   * not anticipate. That instruction supersedes the line; it is recorded here
   * rather than quietly ignored.
   *
   * The ironbow ramp does NOT invert. It is the false-colour LUT the thermal
   * camera itself uses, and it is why the console's colours and the camera's
   * colours are the same colours. Only the surfaces and the text change.
   */
  theme: 'dark' | 'light';

  /**
   * Is the dossier open over the map?
   *
   * It lives in the store rather than in DetailPanel's own `useState` because
   * ConsoleRoot has to stay a pure function of the store: the cinematic renders a
   * SECOND instance of it as the PiP, and two instances holding their own copy of
   * this would disagree about what the operator is looking at.
   *
   * Deliberately NOT persisted. A refresh should restore the site and the work
   * orders, not reopen a panel the operator had closed.
   */
  dossierOpen: boolean;

  /**
   * Does the twin's camera ride along with a dispatched drone?
   *
   * The cinematic used to be a separate view the console cut to. It is the twin's
   * own camera now, so "watch the flight" is a camera choice and the operator can
   * take the field back mid-mission. Not persisted: a reload returns to the field.
   */
  followFlight: boolean;

  /** Set by the twin itself, never by an operator. See components/twin/Watchdog. */
  twinFallback: TwinFallback;

  /**
   * The operator's own choice of 2D or 3D, beside the automatic fallback. Asking
   * for 3D after the frame-rate watchdog tripped is the operator overruling it,
   * so it clears that fallback; a browser with no WebGL cannot be overruled.
   */
  twinMode: TwinMode;

  setFollowFlight: (follow: boolean) => void;
  setTwinMode: (mode: TwinMode) => void;
  setTwinFallback: (why: TwinFallback) => void;

  setModule: (m: ModuleId) => void;
  selectPanel: (id: string | null) => void;
  setTimeScale: (s: number) => void;
  /**
   * Move the site clock. NOT a second source of time — the rAF driver still owns
   * advancing it; this is a seek, the live-mode counterpart of `demoClock.seek`.
   *
   * It exists because site time runs at 60x and there was no way back: leave the
   * tab open twenty minutes and the site is past midnight, every array reads 0.0 %
   * because irradiance is zero, and the console looks broken when it is merely
   * night. Missions and work orders are keyed to site seconds and every phase is
   * DERIVED from it, so scrubbing rewinds them correctly rather than stranding them
   * — the same guarantee the demo clock has always had.
   */
  setSiteSeconds: (seconds: number) => void;
  toggleRunning: () => void;
  cycleFeedFilter: () => void;
  setTariff: (inrPerKWh: number) => void;
  toggleWorkings: () => void;
  toggleTheme: () => void;
  setDossier: (open: boolean) => void;

  dispatch: (panelId: string) => void;
  createWorkOrder: (panelId: string, note: string) => void;
  overrideRecommendation: (panelId: string, reason: string) => void;
  clearOverride: (panelId: string) => void;

  injectFault: (panelId: string, kind: InjectableId) => void;
  clearInjected: (panelId?: string) => void;

  armHazard: (kind: HazardKind | null) => void;
  moveHazardDraft: (at: { x: number; z: number } | null) => void;
  /** Drop a hazard. A footprint needs a place; a heatwave ignores it. */
  dropHazard: (kind: HazardKind, at?: { x: number; z: number }) => void;
  removeHazard: (id: string) => void;
  clearHazards: () => void;

  /** Put the site in the committed rehearsal state. One key, from any state. */
  loadRehearsal: () => void;

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
  module: 'site' as ModuleId,
  siteSeconds: 0,
  timeScale: scenario.defaultTimeScale,
  running: true,
  selectedPanelId: null as string | null,
  missions: [] as Mission[],
  workOrders: [] as WorkOrder[],
  overrides: [] as Override[],
  injected: [] as ScenarioEvent[],
  hazards: [] as HazardEvent[],
  armedHazard: null as HazardKind | null,
  hazardDraft: null as { x: number; z: number } | null,
  feedFilter: 'all' as FeedFilter,
  tariffInrPerKWh: DEFAULT_TARIFF_INR_PER_KWH,
  showWorkings: false,
  theme: 'dark' as 'dark' | 'light',
  dossierOpen: false,
  followFlight: true,
  twinMode: '3d' as TwinMode,
  twinFallback: null as TwinFallback,
};

const FILTER_CYCLE: FeedFilter[] = ['all', 'warning', 'critical'];

export const useSession = create<SessionState>()(persist((set, get) => ({
  ...initial,

  setModule: (module) => set({ module, dossierOpen: false }),
  // Selecting a different array behind an open dossier would leave the operator
  // reading one array's evidence under another's heading. Close it.
  selectPanel: (selectedPanelId) => set({ selectedPanelId, dossierOpen: false }),
  setDossier: (dossierOpen) => set({ dossierOpen }),
  setFollowFlight: (followFlight) => set({ followFlight }),
  setTwinMode: (twinMode) => set((s) => ({
    twinMode,
    twinFallback: twinMode === '3d' && s.twinFallback === 'fps' ? null : s.twinFallback,
  })),
  setTwinFallback: (twinFallback) => set({ twinFallback }),
  setTimeScale: (timeScale) => set({ timeScale }),
  setSiteSeconds: (siteSeconds) => set({ siteSeconds: Math.max(0, siteSeconds) }),
  toggleRunning: () => set((s) => ({ running: !s.running })),

  // Clamped rather than validated: a tariff of zero or a negative one is not a
  // disagreement worth honouring, and an unbounded one turns every figure on
  // screen into nonsense without saying why.
  setTariff: (tariffInrPerKWh) => set({
    tariffInrPerKWh: Math.max(0.1, Math.min(50, tariffInrPerKWh)),
  }),

  toggleWorkings: () => set((s) => ({ showWorkings: !s.showWorkings })),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

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

    return {
      // Sending a drone is a request to watch it.
      followFlight: true,
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

  armHazard: (armedHazard) => set({ armedHazard, hazardDraft: null }),
  moveHazardDraft: (hazardDraft) => set({ hazardDraft }),

  dropHazard: (kind, at) => set((s) => {
    const spec = HAZARD_SPEC[kind];
    const timing = {
      // The sequence number keeps ids unique across drops and stable on reload.
      id: `hz-${kind}-${s.hazards.length + 1}-${Math.round(s.siteSeconds)}`,
      startHour: scenario.epochHour + s.siteSeconds / 3600,
      rampMinutes: spec.rampMinutes,
      durationHours: spec.durationHours,
    };
    if (kind === 'heatwave') {
      // One heatwave is a heatwave. A second would stack to a number nobody declared.
      if (s.hazards.some((h) => h.kind === 'heatwave')) return { armedHazard: null, hazardDraft: null };
      return {
        armedHazard: null, hazardDraft: null,
        hazards: [...s.hazards, { kind, intensity: spec.intensity, ...timing }],
      };
    }
    if (!at) return s;
    return {
      armedHazard: null, hazardDraft: null,
      hazards: [...s.hazards, {
        kind, cx: at.x, cy: at.z, radius: spec.radius, intensity: spec.intensity, ...timing,
      }],
    };
  }),

  removeHazard: (id) => set((s) => ({ hazards: s.hazards.filter((h) => h.id !== id) })),
  clearHazards: () => set({ hazards: [], armedHazard: null, hazardDraft: null }),

  loadRehearsal: () => set((s) => ({
    ...initial,
    theme: s.theme,
    twinFallback: s.twinFallback,
    twinMode: s.twinMode,
    module: s.module,
    siteSeconds: REHEARSAL_SEED.siteSeconds,
    injected: [...REHEARSAL_SEED.injected],
  })),

  /** Clears the operator's session. The site itself is not resettable — it is a site. */
  resetSession: () => set((s) => ({ ...initial, theme: s.theme, twinFallback: s.twinFallback, twinMode: s.twinMode })),

  _tickLive: (dt) => {
    const { running, timeScale, siteSeconds } = get();
    if (!running) return;
    set({ siteSeconds: siteSeconds + dt * timeScale });
  },
}), {
  name: 'surya-session',
  // Demo mode was retired on 5 Oct 2026 and its field went on 6 Oct. A session
  // saved by either earlier build carries a `mode` this store no longer has.
  version: 3,
  migrate: (persisted) => {
    const saved = { ...(persisted as Record<string, unknown>) };
    delete saved.mode;
    return saved as unknown as SessionState;
  },
  // Hydrated explicitly after mount by ClockDriver. Reading storage during render
  // would make the server and client disagree on the very first paint.
  skipHydration: true,
  // Exactly what an operator would expect to still be there after a refresh.
  // Nothing derived is stored: readings, statuses, mission phases and the event
  // feed are all recomputed from these.
  partialize: (s) => ({
    module: s.module,
    siteSeconds: s.siteSeconds,
    timeScale: s.timeScale,
    running: s.running,
    selectedPanelId: s.selectedPanelId,
    missions: s.missions,
    workOrders: s.workOrders,
    overrides: s.overrides,
    injected: s.injected,
    hazards: s.hazards,
    feedFilter: s.feedFilter,
    // The operator's own assumption. Retyping it after every reload would make
    // it feel like a toy rather than a setting they own.
    tariffInrPerKWh: s.tariffInrPerKWh,
    showWorkings: s.showWorkings,
    theme: s.theme,
    twinMode: s.twinMode,
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
