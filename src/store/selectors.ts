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
import { rankQueue } from '@/lib/ranking';
import type {
  AgentCache, CellGrid, DemoEvent, Detection, Forecast, InverterReading,
  PanelArray, PanelReading, PanelStatus, RepairTask, TelemetryFrame, ZoneId,
} from '@/lib/types';
import { useDemoClock } from './demoClock';

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
  const t = useDemoClock((s) => s.t);
  return sample(t, (f) => f.farmHealth);
};

export const useFarmOutputMW = (): number => {
  const t = useDemoClock((s) => s.t);
  return sample(t, (f) => f.farmOutputMW);
};

/** Counts STATUSES, which count physics. Never a typed pair of numbers. */
export function useAnomalyCounts(): { total: number; critical: number } {
  const frame = useFrame();
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
  const f = useFrame();
  return {
    ambientC: f.ambientC,
    irradiance: f.irradiance,
    windMs: f.windMs,
    cloudPct: f.cloudPct,
    timestamp: f.timestamp,
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
  return useFrame().panels[id];
}

/**
 * Panel status, with the one post-approval transition applied.
 * B-17: healthy → warning → critical (derived from deviation) → scheduled (on click).
 */
export function usePanelStatus(id: string): PanelStatus {
  const frame = useFrame();
  const approved = useDemoClock((s) => s.approved);
  const reading = frame.panels[id];
  if (!reading) return 'healthy';
  if (approved && id === 'B-17' && reading.status === 'critical') return 'scheduled';
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
  const frame = useFrame();
  const approved = useDemoClock((s) => s.approved);

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
