'use client';

/**
 * src/store/selectors.ts — the application's public API.
 *
 * Every one of these is a PURE FUNCTION OF `t` (plus `approved` where noted).
 * Components may call these and nothing else: a component never imports from
 * `@data/...`, never reads a JSON file, and never computes a demo value inline.
 *
 * That rule is what makes the seek-backwards guarantee hold. If seeking back to
 * t=40 ever shows something left over from having played forward, the cause is a
 * component holding demo content in `useState` — not a bug in here.
 *
 * Beat times come from CLAUDE.md §2 and are named, not scattered as magic numbers.
 */

import { useMemo } from 'react';

import {
  agentCache as agentCacheData, cellGrid, detection as detectionData, evidenceUrl,
  events, farm, forecast, getPanel, hasCapturedEvidence, hasEvidence, panels,
  repairQueue, telemetry,
} from '@/lib/data';
import {
  eventFor, liveFrameAt, referenceShortfallKW, type LiveFrame,
} from '@/lib/live';
import { F_SOIL, isDark, soilFor } from '@/lib/physics';
import {
  liveQueueAt, projected72hLossMWh, REFERENCE_SHORTFALL_KW, type LiveQueue,
} from '@/lib/queue';
import { liveEvents } from '@/lib/liveEvents';
import { rankQueue } from '@/lib/ranking';
import { typographic } from '@/lib/format';
import type {
  AgentCache, CellGrid, DemoEvent, Detection, Forecast, InverterReading,
  PanelArray, PanelReading, PanelStatus, RepairTask, Severity, TelemetryFrame, ZoneId,
} from '@/lib/types';
import { useDemoClock } from './demoClock';
import { useFlightCue } from './flightCue';
import {
  MISSION, MISSION_TOTAL, missionPhaseAt, missionProgressAt, useSession,
} from './session';

/* ── Beats — CLAUDE.md §2, in one place ──────────────────────────────────── */

export const BEAT = {
  anomaly: 6,          // fault begins ramping in
  triage: 10,          // right panel opens, TRIAGE card streams
  dispatch: 18,        // drone launches, cut to cinematic
  transit: 22,
  targetLock: 34,
  rgbScan: 40,         // SURFACE SCAN event, RGB thumb
  thermalScan: 48,     // thermal thumb, matrix starts filling
  thermalDone: 56,     // matrix full, evidence returns
  prognosis: 62,       // PROGNOSIS card, forecast band, risk badge
  recommendation: 74,  // RECOMMENDATION block, queue updates, cut to console
  gate: 84,            // approval button live
} as const;

/** Reveal helper: has beat `at` happened? Used for progressive section reveal. */
export const useAfter = (at: number): boolean => useDemoClock((s) => s.t >= at);

/** Raw `t`, for the rare component that needs the number rather than a beat test. */
export const useDemoClockT = (): number => useDemoClock((s) => s.t);

/* ── Frame ───────────────────────────────────────────────────────────────── */

/** The telemetry frame for the current second. Frames are integer-indexed 0..90. */
export function useFrame(): TelemetryFrame {
  const t = useDemoClock((s) => s.t);
  const i = Math.max(0, Math.min(telemetry.length - 1, Math.floor(t)));
  return telemetry[i];
}

/** Linear interpolation between frames, for values that must not step at 1 Hz. */
function sample(t: number, pick: (f: TelemetryFrame) => number): number {
  const clamped = Math.max(0, Math.min(telemetry.length - 1, t));
  const lo = Math.floor(clamped);
  const hi = Math.min(telemetry.length - 1, lo + 1);
  const k = clamped - lo;
  return pick(telemetry[lo]) * (1 - k) + pick(telemetry[hi]) * k;
}

/* ── Header KPIs ─────────────────────────────────────────────────────────── */

/**
 * 94 → 80 across t=6..9. Interpolated between frames so the tween is smooth at
 * 60fps rather than stepping four times, and tabular numerals stop the digits
 * jittering while it counts.
 */
export const useFarmHealth = (): number => {
  const mode = useSession((s) => s.mode);
  const t = useDemoClock((s) => s.t);
  const live = useCurrentFrame();
  return mode === 'demo' ? sample(t, (f) => f.farmHealth) : live.farmHealth;
};

export const useFarmOutputMW = (): number => {
  const mode = useSession((s) => s.mode);
  const t = useDemoClock((s) => s.t);
  const live = useCurrentFrame();
  return mode === 'demo' ? sample(t, (f) => f.farmOutputMW) : live.farmOutputMW;
};

/** Counts STATUSES, which count physics. Never a typed pair of numbers. */
export function useAnomalyCounts(): { total: number; critical: number } {
  const frame = useCurrentFrame();
  return useMemo(() => {
    let total = 0;
    let critical = 0;
    for (const r of Object.values(frame.panels)) {
      if (r.status === 'warning' || r.status === 'critical' || r.status === 'scheduled') total += 1;
      if (r.status === 'critical') critical += 1;
    }
    return { total, critical };
  }, [frame]);
}

export function useWeather() {
  const f = useCurrentFrame();
  return {
    ambientC: f.ambientC,
    irradiance: f.irradiance,
    windMs: f.windMs,
    cloudPct: f.cloudPct,
    timestamp: f.clock,
  };
}

/** Health history up to now — feeds the header sparklines. */
export function useSparkline(pick: (f: TelemetryFrame) => number): number[] {
  const t = useDemoClock((s) => s.t);
  const i = Math.floor(t);
  return useMemo(
    () => telemetry.slice(0, Math.max(2, i + 1)).map(pick),
    // `pick` is a stable module-level fn at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i],
  );
}

export const pickHealth = (f: TelemetryFrame) => f.farmHealth;
export const pickOutput = (f: TelemetryFrame) => f.farmOutputMW;

/* ── Events ──────────────────────────────────────────────────────────────── */

/**
 * Events that have entered the feed, newest first.
 *
 * The work-order event is the ONE event that is not purely f(t): it also requires
 * `approved`. Showing "WORK ORDER CREATED" without the operator's click would
 * undercut the single most important claim in the demo — see C12 in
 * docs/contract-freeze.md.
 */
export const WORK_ORDER_EVENT_ID = 'ev-14-workorder';

export function useVisibleEvents(): DemoEvent[] {
  const t = useDemoClock((s) => s.t);
  const approved = useDemoClock((s) => s.approved);
  return useMemo(
    () => events
      .filter((e) => e.t <= t && (e.id !== WORK_ORDER_EVENT_ID || approved))
      .slice()
      .reverse(),
    [t, approved],
  );
}

/** Mission-log lines, oldest first — the cinematic reads these. */
export function useLogLines(): DemoEvent[] {
  const t = useDemoClock((s) => s.t);
  const approved = useDemoClock((s) => s.approved);
  return useMemo(
    () => events.filter(
      (e) => e.logLine && e.t <= t && (e.id !== WORK_ORDER_EVENT_ID || approved),
    ),
    [t, approved],
  );
}

/* ── Panels & map ────────────────────────────────────────────────────────── */

export const usePanels = (): PanelArray[] => panels;
export const useFarm = () => farm;

export function usePanelReading(id: string): PanelReading | undefined {
  return useCurrentFrame().panels[id];
}

/**
 * Panel status, with the one post-approval transition applied.
 * B-17: healthy → warning → critical (derived from deviation) → scheduled (on click).
 */
export function usePanelStatus(id: string): PanelStatus {
  const frame = useCurrentFrame();
  const mode = useSession((s) => s.mode);
  const approved = useDemoClock((s) => s.approved);
  const reading = frame.panels[id];
  if (!reading) return 'healthy';
  // In demo mode the approval is a scripted beat on one array. In live mode the
  // status already accounts for real work orders, inside liveFrameAt.
  if (mode === 'demo' && approved && id === 'B-17' && reading.status === 'critical') {
    return 'scheduled';
  }
  return reading.status;
}

export function useInverterReadings(): Record<string, InverterReading> {
  return useFrame().inverters;
}

/**
 * Zone rollup for the map's status cards.
 *
 * One hook reading one frame, rather than calling usePanelStatus 40 times inside a
 * map — which would be a rules-of-hooks violation even though the list length is
 * fixed. Derived live rather than read from farm.json, because farm.json is static
 * geometry and knows nothing about a fault that develops at t=6.
 */
export function useZoneSummary(zoneId: ZoneId): {
  label: string; pct: number; critical: number; anomalous: number;
} {
  const frame = useCurrentFrame();
  const mode = useSession((s) => s.mode);
  const approved = useDemoClock((s) => s.approved) && mode === 'demo';

  return useMemo(() => {
    const zone = farm.zones.find((z) => z.id === zoneId);
    if (!zone) return { label: 'HEALTHY', pct: 100, critical: 0, anomalous: 0 };

    let critical = 0;
    let scheduled = 0;
    let anomalous = 0;

    for (const p of zone.panels) {
      let status: PanelStatus = frame.panels[p.id]?.status ?? 'healthy';
      if (approved && p.id === 'B-17' && status === 'critical') status = 'scheduled';
      if (status !== 'healthy') anomalous += 1;
      if (status === 'critical') critical += 1;
      if (status === 'scheduled') scheduled += 1;
    }

    const label = critical > 0 ? 'CRITICAL'
      : scheduled > 0 ? 'SCHEDULED'
        : anomalous > 0 ? 'DEGRADED' : 'HEALTHY';

    return {
      label,
      pct: Math.round(((zone.panels.length - anomalous) / zone.panels.length) * 100),
      critical,
      anomalous,
    };
  }, [frame, approved, zoneId]);
}

/* ── Drone ───────────────────────────────────────────────────────────────── */

/** Transit occupies dispatch → target lock, per CLAUDE.md §2. */
export const ROUTE_START = BEAT.dispatch;
export const ROUTE_END = BEAT.targetLock;

export const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/** 0 before launch, 1 on station. Drives stroke-dashoffset — pure, so seek works. */
export const useRouteProgress = (): number => {
  const t = useDemoClock((s) => s.t);
  return clamp01((t - ROUTE_START) / (ROUTE_END - ROUTE_START));
};

export function useDroneState() {
  const t = useDemoClock((s) => s.t);
  const status = t < BEAT.dispatch
    ? 'STANDBY'
    : t < BEAT.thermalDone ? 'ACTIVE' : 'RETURNING';
  // Battery drains linearly across the mission: 88% at dispatch, 84% at lock.
  // Both endpoints are quoted in events.json, so this interpolates between two
  // numbers that already exist rather than inventing a third.
  const drain = clamp01((t - BEAT.dispatch) / (BEAT.thermalDone - BEAT.dispatch));
  return {
    status: status as 'STANDBY' | 'ACTIVE' | 'RETURNING',
    batteryPct: 88 - 5 * drain,
    padId: 'PAD-01',
  };
}

/* ── Evidence ────────────────────────────────────────────────────────────── */

export const useCellGrid = (): CellGrid => cellGrid;
export const useDetection = (): Detection | null => detectionData;

/** Cached agent prose, or null until Phase 6. Absent means absent — no empty card. */
export const useAgentCache = (): AgentCache | null => agentCacheData;

/** Which evidence slots are both revealed by the clock AND present on disk. */
export function useEvidence() {
  const t = useDemoClock((s) => s.t);
  const mode = useSession((s) => s.mode);
  const selected = useSelectedPanelId();

  // Live mode may be looking at any of 120 arrays, and we hold captured imagery for
  // one of them. Showing B-17's thermal frame under another array's name would be
  // presenting one array's evidence as another's.
  const captured = mode === 'demo' || hasCapturedEvidence(selected);
  const show = (beat: number, key: Parameters<typeof hasEvidence>[0]) =>
    (captured && t >= beat && hasEvidence(key) ? evidenceUrl(key) : null);
  return {
    rgb: show(BEAT.rgbScan, 'rgb'),
    rgbAnnotated: show(BEAT.rgbScan, 'rgbAnnotated'),
    thermal: show(BEAT.thermalScan, 'thermal'),
    audio: show(BEAT.thermalDone, 'audio'),
    flyover: show(BEAT.thermalDone, 'flyover'),
  };
}

/**
 * How many matrix cells have filled, 0..35, in scan order across t=48..56.
 * The sequential fill is what sells that a sensor is reading the panel — a single
 * fade-in of the whole grid reads as a graphic.
 */
export function useMatrixFillCount(): number {
  const t = useDemoClock((s) => s.t);
  const total = cellGrid.rows * cellGrid.cols;
  const k = clamp01((t - BEAT.thermalScan) / (BEAT.thermalDone - BEAT.thermalScan));
  return Math.floor(k * total);
}

/* ── Forecast & queue ────────────────────────────────────────────────────── */

export const useForecast = (): Forecast => forecast;

/**
 * The ranked queue. Ranking is the same pure function the build-time invariant
 * uses. INC-B17 only exists once the agent has produced it (t ≥ recommendation),
 * which is why the footer reads 3 tasks before the beat and 4 after.
 */
export function useRepairQueue(): RepairTask[] {
  const t = useDemoClock((s) => s.t);
  return useMemo(
    () => rankQueue(repairQueue.filter((x) => x.id !== 'INC-B17' || t >= BEAT.recommendation)),
    [t],
  );
}

export const useApproved = (): boolean => useDemoClock((s) => s.approved);

/* ── Cinematic ───────────────────────────────────────────────────────────── */

/**
 * The status pill's state machine. HARD CUTS between states, no transition —
 * instrument readouts do not ease.
 *
 * A pure lookup on `t`, so it is correct the instant you seek rather than needing
 * to have passed through the intervening states.
 */
const PILL: Array<[number, (id: string, zone: string) => string]> = [
  [BEAT.dispatch, () => 'ANOMALY DETECTED'],
  [BEAT.transit, (_id, zone) => `FLYING TO ZONE ${zone}`],
  [BEAT.targetLock, (id) => `TARGET LOCK — ${id}`],
  [BEAT.rgbScan, (id) => `INSPECTING ${id}`],
  [BEAT.thermalScan, () => 'THERMAL SCAN'],
  [BEAT.thermalDone, () => 'SURYA ANALYZING'],
  [BEAT.prognosis, () => 'RECOMMENDATION READY'],
];

/**
 * The pill names the array the aircraft is ACTUALLY over, in both modes. The
 * scripted run always says B-17 because that is where it always goes; a live
 * mission to C-31 says C-31, because a caption that names the wrong panel is the
 * fastest way to make the whole overlay read as decoration.
 */
export function useStatusPill(): string {
  const cue = useFlightCue();
  const zone = getPanel(cue.targetId)?.zone ?? '—';
  let label = PILL[0][1](cue.targetId, zone);
  for (const [at, text] of PILL) if (cue.t >= at) label = text(cue.targetId, zone);
  return label;
}

/** Seconds since the cinematic cut in — what the timecode counts. */
export const useMissionElapsed = (): number => {
  const t = useDemoClock((s) => s.t);
  return Math.max(0, t - BEAT.dispatch);
};

/**
 * The mission log's current line, already typed.
 *
 * Demo mode streams the scripted `logLine` against `t`. Live mode has no script,
 * so it streams the newest thing that actually happened, out of the same derived
 * feed the console's left rail is showing — one source, two renderings, exactly as
 * it was for the demo.
 *
 * The typing rate is 45 characters per REAL second in both modes. Live site time
 * runs at `timeScale`, so streaming at 45 chars per SITE second would finish a
 * sentence before it appeared. Dividing by the scale is what keeps the log
 * readable without introducing a second clock to read it by.
 */
export function useMissionLogLine():
  { text: string; severity: Severity; done: boolean } | null {
  const mode = useSession((s) => s.mode);
  const timeScale = useSession((s) => s.timeScale);
  const siteSeconds = useSession((s) => s.siteSeconds);
  const demoLines = useLogLines();
  const liveFeed = useAllFeedEvents();
  const t = useDemoClock((s) => s.t);

  const reduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (mode === 'demo') {
    const current = demoLines[demoLines.length - 1];
    if (!current) return null;
    const full = typographic(`[${current.timestamp}] ${current.logLine}`);
    const text = reduced ? full : full.slice(0, Math.floor(Math.max(0, t - current.t) * CPS));
    return { text, severity: current.severity, done: text.length >= full.length };
  }

  const current = liveFeed[0];
  if (!current) return null;
  const full = typographic(`[${current.timestamp}] ${current.body}`);
  const realSeconds = Math.max(0, siteSeconds - current.t) / Math.max(1, timeScale);
  const text = reduced ? full : full.slice(0, Math.floor(realSeconds * CPS));
  return { text, severity: current.severity, done: text.length >= full.length };
}

/* ── Typewriter ──────────────────────────────────────────────────────────── */

export const CPS = 45;

/**
 * Cached agent prose, revealed character by character as a pure function of `t`.
 * No interval, no accumulation — seeking backwards un-types it, which is exactly
 * what proves there is only one clock.
 */
export function useStreamedText(full: string, startT: number, cps = CPS): string {
  const t = useDemoClock((s) => s.t);
  const reduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (t < startT) return '';
  if (reduced) return full;                       // plan/04 §5
  return full.slice(0, Math.floor(Math.max(0, t - startT) * cps));
}

/* ── Misc ────────────────────────────────────────────────────────────────── */

export { getPanel };

/* ── LIVE MODE ───────────────────────────────────────────────────────────────
 *
 * Everything above this line serves the scripted demo, where the world is 91
 * committed frames indexed by `t`. Below it is the live console, where the site is
 * evaluated from the physics model at whatever time it currently is and the
 * operator picks what to look at.
 *
 * Both feed the SAME components. A component asks `useCurrentFrame()` and does not
 * know or care which mode produced the answer — which is why live mode did not
 * require rewriting the console.
 * ──────────────────────────────────────────────────────────────────────────── */

/** The array the console is describing. Demo mode is always looking at B-17. */
export function useSelectedPanelId(): string {
  const mode = useSession((s) => s.mode);
  const selected = useSession((s) => s.selectedPanelId);
  return mode === 'demo' ? 'B-17' : (selected ?? 'B-17');
}

export const useMode = () => useSession((s) => s.mode);

/** Site time in seconds. Meaningless in demo mode, where `t` is the timeline. */
export const useSiteSeconds = () => useSession((s) => s.siteSeconds);

/**
 * The site right now, whichever mode is running.
 *
 * Demo mode returns the committed frame for `t`. Live mode evaluates every array
 * from the model. The shapes are deliberately compatible so no component branches.
 */
export function useCurrentFrame(): {
  panels: Record<string, PanelReading>;
  ambientC: number;
  irradiance: number;
  windMs: number;
  cloudPct: number;
  farmOutputMW: number;
  farmHealth: number;
  clock: string;
} {
  const mode = useSession((s) => s.mode);
  const siteSeconds = useSession((s) => s.siteSeconds);
  const workOrders = useSession((s) => s.workOrders);
  const injected = useSession((s) => s.injected);
  const demoFrame = useFrame();

  return useMemo(() => {
    if (mode === 'demo') {
      return { ...demoFrame, clock: demoFrame.timestamp };
    }
    const scheduled = new Set(workOrders.map((w) => w.panelId));
    const live = liveFrameAt(siteSeconds, scheduled, injected);
    return {
      panels: live.panels as unknown as Record<string, PanelReading>,
      ambientC: live.ambientC,
      irradiance: live.irradiance,
      windMs: live.windMs,
      cloudPct: live.cloudPct,
      farmOutputMW: live.farmOutputMW,
      farmHealth: live.farmHealth,
      clock: live.clock,
    };
  }, [mode, siteSeconds, workOrders, injected, demoFrame]);
}

/** Missions currently in the air, with their derived phase and progress. */
export function useActiveMissions() {
  const siteSeconds = useSession((s) => s.siteSeconds);
  const missions = useSession((s) => s.missions);
  return useMemo(
    () => missions
      .map((m) => ({
        ...m,
        phase: missionPhaseAt(m, siteSeconds),
        progress: missionProgressAt(m, siteSeconds),
      }))
      .filter((m) => m.phase !== 'complete'),
    [missions, siteSeconds],
  );
}

/** Has this array been inspected — i.e. did a mission reach it and finish looking? */
export function useInspected(panelId: string): boolean {
  const siteSeconds = useSession((s) => s.siteSeconds);
  const missions = useSession((s) => s.missions);
  return missions.some(
    (m) => m.panelId === panelId
      && siteSeconds - m.startedAt >= MISSION.outbound + MISSION.inspecting,
  );
}

/** Whether the operator has picked an array to look at. */
export const useHasSelection = (): boolean => {
  const mode = useSession((s) => s.mode);
  const selected = useSession((s) => s.selectedPanelId);
  return mode === 'demo' ? true : selected !== null;
};


/**
 * The event feed, whichever mode is running.
 *
 * Demo mode replays the written script. Live mode derives events from what has
 * actually happened. The feed component renders both without knowing which.
 */
const FILTER_FLOOR: Record<string, Severity[]> = {
  all: ['info', 'active', 'warning', 'critical'],
  warning: ['warning', 'critical'],
  critical: ['critical'],
};

/** Everything that has happened, unfiltered. The log and the filter both read this. */
export function useAllFeedEvents(): DemoEvent[] {
  const mode = useSession((s) => s.mode);
  const siteSeconds = useSession((s) => s.siteSeconds);
  const missions = useSession((s) => s.missions);
  const workOrders = useSession((s) => s.workOrders);
  const injected = useSession((s) => s.injected);
  const demoEvents = useVisibleEvents();

  return useMemo(
    () => (mode === 'demo'
      ? demoEvents
      : liveEvents(siteSeconds, missions, workOrders, injected)),
    [mode, demoEvents, siteSeconds, missions, workOrders, injected],
  );
}

/**
 * The feed as the operator has chosen to see it.
 *
 * The filter is a VIEW control on the left rail and nothing more. The mission log
 * reads `useAllFeedEvents` instead, because hiding an event from a list is a
 * choice about a list; having the drone stop narrating what it found because
 * somebody set a severity floor would be a different thing entirely.
 */
export function useFeedEvents(): DemoEvent[] {
  const all = useAllFeedEvents();
  const filter = useSession((s) => s.feedFilter);
  return useMemo(() => {
    const allowed = FILTER_FLOOR[filter];
    return allowed.length === 4 ? all : all.filter((e) => allowed.includes(e.severity));
  }, [all, filter]);
}

/* ── Module screens ──────────────────────────────────────────────────────────
 *
 * The screens behind the icon rail. Everything here is derived from the same two
 * sources the map is: the operator's session and the physics model at the current
 * site time. No screen holds its own copy of anything.
 * ──────────────────────────────────────────────────────────────────────────── */

export const useModule = () => useSession((s) => s.module);
export const useSetModule = () => useSession((s) => s.setModule);

/** The raw live frame, for screens that need site time alongside the readings. */
export function useSiteFrame(): LiveFrame {
  const siteSeconds = useSession((s) => s.siteSeconds);
  const workOrders = useSession((s) => s.workOrders);
  const injected = useSession((s) => s.injected);
  return useMemo(
    () => liveFrameAt(siteSeconds, new Set(workOrders.map((w) => w.panelId)), injected),
    [siteSeconds, workOrders, injected],
  );
}

export const useWorkOrders = () => useSession((s) => s.workOrders);

/**
 * Every mission the session has ever flown, newest first, with its phase derived.
 * Unlike `useActiveMissions` this keeps completed ones — a mission log that
 * forgets what it did is not a log.
 */
export function useAllMissions() {
  const siteSeconds = useSession((s) => s.siteSeconds);
  const missions = useSession((s) => s.missions);
  return useMemo(
    () => missions
      .map((m) => ({
        ...m,
        phase: missionPhaseAt(m, siteSeconds),
        progress: missionProgressAt(m, siteSeconds),
        elapsed: Math.max(0, siteSeconds - m.startedAt),
      }))
      .reverse(),
    [missions, siteSeconds],
  );
}

export interface DroneRecord {
  id: string;
  padId: string;
  status: 'STANDBY' | 'OUTBOUND' | 'INSPECTING' | 'RETURNING';
  target: string | null;
  missionId: string | null;
  batteryPct: number;
  sorties: number;
}

/**
 * The two drones on the site.
 *
 * Battery is derived from mission elapsed time at the same rate the demo quotes —
 * 88% at dispatch falling to 84% by the end of the inspection leg, both numbers
 * already in events.json — and recharges on the pad. Derived, so it is identical
 * on every render and cannot drift between two instances of the console.
 */
export const DRONE_IDS = ['DRONE 01', 'DRONE 02'] as const;
const BATTERY_FULL = 88;
const BATTERY_AT_LOCK = 84;
const RECHARGE_SECONDS = 45 * 60;

export function useFleet(): DroneRecord[] {
  const siteSeconds = useSession((s) => s.siteSeconds);
  const missions = useSession((s) => s.missions);

  return useMemo(() => DRONE_IDS.map((id) => {
    const mine = missions.filter((m) => m.droneId === id);
    const flying = mine.find((m) => missionPhaseAt(m, siteSeconds) !== 'complete');

    if (!flying) {
      const last = mine[mine.length - 1];
      // On the pad. Back to full over the recharge window after the last landing.
      const since = last ? siteSeconds - (last.startedAt + MISSION_TOTAL) : Infinity;
      const charged = BATTERY_AT_LOCK
        + (BATTERY_FULL - BATTERY_AT_LOCK) * clamp01(since / RECHARGE_SECONDS);
      return {
        id,
        padId: id === 'DRONE 01' ? 'PAD-01' : 'PAD-02',
        status: 'STANDBY' as const,
        target: null,
        missionId: null,
        batteryPct: mine.length === 0 ? 100 : charged,
        sorties: mine.length,
      };
    }

    const phase = missionPhaseAt(flying, siteSeconds);
    const drain = clamp01(
      (siteSeconds - flying.startedAt) / (MISSION.outbound + MISSION.inspecting),
    );
    return {
      id,
      padId: id === 'DRONE 01' ? 'PAD-01' : 'PAD-02',
      status: phase.toUpperCase() as DroneRecord['status'],
      target: flying.panelId,
      missionId: flying.id,
      batteryPct: BATTERY_FULL - (BATTERY_FULL - BATTERY_AT_LOCK) * drain,
      sorties: mine.length,
    };
  }), [missions, siteSeconds]);
}

/** The ranked queue as the site actually stands right now. */
export function useLiveQueue(): LiveQueue {
  const frame = useSiteFrame();
  const workOrders = useSession((s) => s.workOrders);
  const injected = useSession((s) => s.injected);
  return useMemo(
    () => liveQueueAt(frame, new Set(workOrders.map((w) => w.panelId)), injected),
    [frame, workOrders, injected],
  );
}

export interface DayPoint { hourOffset: number; outputMW: number; shortfallKW: number }

/**
 * Site output across the forecast day, from the model.
 *
 * Sampled rather than continuous — 4 points an hour over 24 hours is 97 whole-site
 * evaluations, which is cheap enough to memoise and dense enough that the fault
 * ramp is visible as a step rather than a corner. The curve is a PREDICTION for the
 * hours ahead of site time, not a recording, and the chart says so.
 */
export const DAY_SAMPLES_PER_HOUR = 4;

export function useDayCurve(): DayPoint[] {
  const workOrders = useSession((s) => s.workOrders);
  const injected = useSession((s) => s.injected);
  return useMemo(() => {
    const scheduled = new Set(workOrders.map((w) => w.panelId));
    const n = 24 * DAY_SAMPLES_PER_HOUR;
    return Array.from({ length: n + 1 }, (_, i) => {
      const hourOffset = i / DAY_SAMPLES_PER_HOUR;
      const f = liveFrameAt(hourOffset * 3600, scheduled, injected);
      let shortfallKW = 0;
      for (const r of Object.values(f.panels)) shortfallKW += r.expectedKW - r.actualKW;
      return { hourOffset, outputMW: f.farmOutputMW, shortfallKW };
    });
  }, [workOrders, injected]);
}

/** Where the site's lost energy is going, by mechanism. */
export function useLossAttribution(): Array<{ cause: string; kW: number; arrays: string[] }> {
  const frame = useSiteFrame();
  const injected = useSession((s) => s.injected);
  return useMemo(() => {
    const buckets = new Map<string, { kW: number; arrays: string[] }>();
    for (const [id, r] of Object.entries(frame.panels)) {
      const shortfall = r.expectedKW - r.actualKW;
      if (shortfall <= 0.01) continue;
      // The cause is read off the site record, not guessed from the shape of the
      // shortfall: a scenario fault is a fault, a soiled array is soiling, and the
      // 0.97 nominal derate every array carries is the third bucket.
      const cause = eventFor(id, injected) ? 'Cell mismatch / bypass diode'
        : soilFor(id) < F_SOIL ? 'Soiling above nominal'
          : 'Nominal soiling derate';
      const b = buckets.get(cause) ?? { kW: 0, arrays: [] };
      b.kW += shortfall;
      if (cause !== 'Nominal soiling derate') b.arrays.push(id);
      buckets.set(cause, b);
    }
    return [...buckets.entries()]
      .map(([cause, v]) => ({ cause, ...v, arrays: v.arrays.sort() }))
      .sort((a, b) => b.kW - a.kW);
  }, [frame, injected]);
}

/* ── The selected array, described honestly ──────────────────────────────── */

/**
 * After sunset there is nothing to measure. Every array reads 0.00 kW against
 * 0.00 kW, the deviation floors to 0.0 %, and the console will call a cracked
 * array `healthy` unless something says otherwise. This is that something.
 */
export const useIsDark = (): boolean => isDark(useCurrentFrame().irradiance);

/**
 * The selected array's own 72-hour projected loss, in MWh.
 *
 * The committed 3.07 belongs to B-17. Printing it under every array — which the
 * outlook section did — told an operator that a healthy array in zone C was
 * about to lose three megawatt-hours. Scaled by this array's own shortfall at
 * reference conditions, B-17 still reads exactly 3.07 and a healthy array reads
 * nothing at all.
 */
export function useProjectedLossMWh(panelId: string): number {
  const mode = useSession((s) => s.mode);
  const siteSeconds = useSession((s) => s.siteSeconds);
  const injected = useSession((s) => s.injected);
  const reading = usePanelReading(panelId);

  if (mode === 'demo') {
    // The scripted run is B-17 throughout, and its loss is the committed integral.
    return forecast.projected72hLossMWh
      * clamp01((reading ? reading.expectedKW - reading.actualKW : 0) / REFERENCE_SHORTFALL_KW);
  }
  return projected72hLossMWh(referenceShortfallKW(panelId, siteSeconds, injected));
}

/** The fault in force on an array, committed or injected — or nothing. */
export function useArrayFault(panelId: string) {
  const injected = useSession((s) => s.injected);
  const mode = useSession((s) => s.mode);
  return mode === 'demo' ? eventFor('B-17') : eventFor(panelId, injected);
}

/** The operator's recorded decision to decline work on this array, if any. */
export function useOverride(panelId: string) {
  const overrides = useSession((s) => s.overrides);
  return overrides.find((o) => o.panelId === panelId);
}

export const useInjected = () => useSession((s) => s.injected);
export const useFeedFilter = () => useSession((s) => s.feedFilter);

export interface ZoneBreakdown {
  id: ZoneId;
  total: number;
  warning: number;
  critical: number;
  scheduled: number;
  /** Shortfall across the zone right now, kW. */
  shortfallKW: number;
}

/**
 * All three zones in one pass. Deliberately not `useZoneSummary` called in a map —
 * that is a rules-of-hooks violation even when the list length is fixed, and it is
 * a bug this project has already made once.
 */
export function useZoneBreakdown(): ZoneBreakdown[] {
  const frame = useSiteFrame();
  return useMemo(() => farm.zones.map((z) => {
    const out: ZoneBreakdown = {
      id: z.id, total: z.panels.length,
      warning: 0, critical: 0, scheduled: 0, shortfallKW: 0,
    };
    for (const p of z.panels) {
      const r = frame.panels[p.id];
      if (!r) continue;
      if (r.status === 'warning') out.warning += 1;
      if (r.status === 'critical') out.critical += 1;
      if (r.status === 'scheduled') out.scheduled += 1;
      out.shortfallKW += Math.max(0, r.expectedKW - r.actualKW);
    }
    return out;
  }), [frame]);
}
