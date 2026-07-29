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
  events, farm, forecast, getPanel, hasEvidence, panels, repairQueue, telemetry,
} from '@/lib/data';
import { liveFrameAt } from '@/lib/live';
import { liveEvents } from '@/lib/liveEvents';
import { rankQueue } from '@/lib/ranking';
import type {
  AgentCache, CellGrid, DemoEvent, Detection, Forecast, InverterReading,
  PanelArray, PanelReading, PanelStatus, RepairTask, TelemetryFrame, ZoneId,
} from '@/lib/types';
import { useDemoClock } from './demoClock';
import { MISSION, missionPhaseAt, missionProgressAt, useSession } from './session';

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
  const show = (beat: number, key: Parameters<typeof hasEvidence>[0]) =>
    (t >= beat && hasEvidence(key) ? evidenceUrl(key) : null);
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
const PILL: Array<[number, string]> = [
  [BEAT.dispatch, 'ANOMALY DETECTED'],
  [BEAT.transit, 'FLYING TO ZONE B'],
  [BEAT.targetLock, 'TARGET LOCK — B-17'],
  [BEAT.rgbScan, 'INSPECTING B-17'],
  [BEAT.thermalScan, 'THERMAL SCAN'],
  [BEAT.thermalDone, 'SURYA ANALYZING'],
  [BEAT.prognosis, 'RECOMMENDATION READY'],
];

export function useStatusPill(): string {
  const t = useDemoClock((s) => s.t);
  let label = PILL[0][1];
  for (const [at, text] of PILL) if (t >= at) label = text;
  return label;
}

/** Seconds since the cinematic cut in — what the timecode counts. */
export const useMissionElapsed = (): number => {
  const t = useDemoClock((s) => s.t);
  return Math.max(0, t - BEAT.dispatch);
};

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
  const demoFrame = useFrame();

  return useMemo(() => {
    if (mode === 'demo') {
      return { ...demoFrame, clock: demoFrame.timestamp };
    }
    const scheduled = new Set(workOrders.map((w) => w.panelId));
    const live = liveFrameAt(siteSeconds, scheduled);
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
  }, [mode, siteSeconds, workOrders, demoFrame]);
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
export function useFeedEvents(): DemoEvent[] {
  const mode = useSession((s) => s.mode);
  const siteSeconds = useSession((s) => s.siteSeconds);
  const missions = useSession((s) => s.missions);
  const workOrders = useSession((s) => s.workOrders);
  const demoEvents = useVisibleEvents();

  return useMemo(
    () => (mode === 'demo' ? demoEvents : liveEvents(siteSeconds, missions, workOrders)),
    [mode, demoEvents, siteSeconds, missions, workOrders],
  );
}
