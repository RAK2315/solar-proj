'use client';

/**
 * src/store/selectors.ts — the application's public API, and the seam.
 *
 * Every hook here is a pure function of the operator's session and the physics
 * model at the current site time. Components call these and nothing else: a
 * component never imports `lib/live` or `lib/physics`, never reads a JSON file,
 * and never computes a site value inline.
 *
 * That rule is what makes seeking work. If scrubbing site time backwards ever
 * leaves something stuck, the cause is a component holding site content in
 * `useState`, not a bug in here.
 */

import { useMemo } from 'react';

import { diagnose, type Cause } from '@/lib/causes';
import {
  agentCache as agentCacheData, cellGrid, detection as detectionData, evidenceUrl,
  farm, forecast, hasCapturedEvidence, hasEvidence, panels,
} from '@/lib/data';
import { deferOutcomes, openCircuitShortfallKW, type DeferOutcome } from '@/lib/defer';
import { typographic } from '@/lib/format';
import {
  AFFECTED_THRESHOLD, HAZARD_SPEC, footprintWeight, hazardStrengthAt, hazardsAt,
} from '@/lib/hazard';
import { hazardImpact, type HazardImpact } from '@/lib/impact';
import { buildIncident, type Incident } from '@/lib/incident';
import {
  allEvents, eventFor, faultProgressAt, forecastOffset, hasCrackMechanism, inverterComparison, liveFrameAt,
  referenceShortfallKW, scenario, siteHour, type LiveFrame, type ScenarioEvent,
} from '@/lib/live';
import { liveEvents } from '@/lib/liveEvents';
import { hazardCostMWh, outlook, type Outlook } from '@/lib/outlook';
import {
  ETA_INV, F_SOIL, GAMMA, NOCT, cellTemp, clockAt, irradianceAt, isDark, soilFor,
  type ArrayReading,
} from '@/lib/physics';
import { liveQueueAt, projected72hLossMWh, type LiveQueue } from '@/lib/queue';
import { repairFor } from '@/lib/repair';
import {
  closedSlots, problemFrom, problemKey, slotStartOffsetH, solve, type Plan, type Problem,
} from '@/lib/scheduler';
import {
  FAULTED_ARRAY_ID, M, PAD, arrayCentre, droneAt, inspectionTarget,
} from '@/lib/scene';
import type {
  AgentCache, CellGrid, DemoEvent, Detection, Forecast, InverterReading, PanelArray,
  PanelStatus, Severity, ZoneId,
} from '@/lib/types';
import { useDetector } from './detector';
import { useSolver } from './solver';
import { flightCueAt, flightTAt, useFlightCue } from './flightCue';
import {
  MISSION, MISSION_TOTAL, missionPhaseAt, missionProgressAt, useSession,
} from './session';

export const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/* ── The site at one moment ──────────────────────────────────────────────── */

/**
 * The site, evaluated once however many panels ask for it.
 *
 * Every panel that shows a reading holds its own `useMemo`, so a screen of eight
 * panels evaluated all 120 arrays eight times a frame. The inputs are identical
 * across them, so one remembered answer serves the lot. It keys on identity,
 * which is exactly what `useMemo` was already keying on.
 */
let lastFrame: { key: readonly unknown[]; frame: LiveFrame } | null = null;

function sharedFrame(
  siteSeconds: number,
  workOrders: ReadonlyArray<{ panelId: string }>,
  injected: Parameters<typeof liveFrameAt>[2],
  hazards: Parameters<typeof liveFrameAt>[3],
): LiveFrame {
  const key = [siteSeconds, workOrders, injected, hazards] as const;
  if (lastFrame && lastFrame.key.every((k, i) => k === key[i])) return lastFrame.frame;
  const frame = liveFrameAt(
    siteSeconds, new Set(workOrders.map((w) => w.panelId)), injected, hazards,
  );
  lastFrame = { key, frame };
  return frame;
}

/** Every reading on the site right now, with site time alongside. */
export function useSiteFrame(): LiveFrame {
  const siteSeconds = useSession((s) => s.siteSeconds);
  const workOrders = useSession((s) => s.workOrders);
  const injected = useSession((s) => s.injected);
  const hazards = useSession((s) => s.hazards);
  return useMemo(
    () => sharedFrame(siteSeconds, workOrders, injected, hazards),
    [siteSeconds, workOrders, injected, hazards],
  );
}

export const useSiteSeconds = () => useSession((s) => s.siteSeconds);
export const usePanels = (): PanelArray[] => panels;
export const useFarm = () => farm;
export const useForecast = (): Forecast => forecast;

/** The site's wall clock at a site second, as `10:12`. */
export const siteClockAt = (siteSeconds: number): string => clockAt(forecastOffset(siteSeconds));

/** The hour of day the scenario starts at. Site time counts from here. */
export const useScenarioEpochHour = (): number => scenario.epochHour;

export function usePanelReading(id: string): ArrayReading | undefined {
  return useSiteFrame().panels[id];
}

/** An array's status. Already accounts for approved work, inside `liveFrameAt`. */
export function usePanelStatus(id: string): PanelStatus {
  return useSiteFrame().panels[id]?.status ?? 'healthy';
}

/**
 * After sunset there is nothing to measure. Every array reads 0.00 kW against
 * 0.00 kW, the deviation floors to 0.0 %, and the console will call a cracked
 * array healthy unless something says otherwise. This is that something.
 */
export const useIsDark = (): boolean => isDark(useSiteFrame().irradiance);

/** The model's own coefficients, for the screen that states them. */
const MODEL_CONSTANTS = { gamma: GAMMA, noct: NOCT, etaInv: ETA_INV, fSoil: F_SOIL } as const;
export const useModelConstants = () => MODEL_CONSTANTS;

/**
 * Peak irradiance on the site's own day: the denominator solar elevation is read
 * against. Computed once from the same curve the whole product runs on, because a
 * second sun model would be a second answer to how high the sun is.
 */
const PEAK_IRRADIANCE = Math.max(...Array.from({ length: 24 }, (_, h) => irradianceAt(h)));

/* ── Selection ───────────────────────────────────────────────────────────── */

/**
 * The array a screen is describing. Screens that are about one array fall back
 * to B-17 with nothing selected, because it is the one array with a capture and
 * therefore the one whose every surface has something to show.
 */
export function useSelectedPanelId(): string {
  return useSession((s) => s.selectedPanelId) ?? FAULTED_ARRAY_ID;
}

/**
 * The peer-string comparison for the selected array: the table that makes the
 * fault self-evident. Read from the same frame as everything else, so it cannot
 * contradict the deviation printed beside it.
 */
export function useInverterReadings(): Record<string, InverterReading> {
  const frame = useSiteFrame();
  const panelId = useSelectedPanelId();
  return useMemo(() => inverterComparison(frame, panelId), [frame, panelId]);
}

/* ── The twin ────────────────────────────────────────────────────────────── */

/** What the twin lays over an array that is not simply healthy. */
export type ArrayTint = 'warning' | 'critical' | 'scheduled' | 'affected';

/**
 * Every array the twin has to recolour, by status.
 *
 * The map keeps its identity until a status actually changes. Site time ticks
 * sixty times a second and statuses change a few times an hour, so the twin
 * rewrites its instance colours on the second and never on the first.
 */
export function useArrayTints(): ReadonlyMap<string, ArrayTint> {
  const frame = useSiteFrame();
  const armed = useSession((s) => s.armedHazard);
  const draft = useSession((s) => s.hazardDraft);
  const key = useMemo(() => {
    const parts: string[] = [];
    // The region under a held footprint tints as it moves. Geometry only: the
    // physics does not run until the hazard is dropped.
    const held = draft && armed && armed !== 'heatwave'
      ? { cx: draft.x, cy: draft.z, radius: HAZARD_SPEC[armed].radius }
      : null;
    for (const [id, r] of Object.entries(frame.panels)) {
      if (r.status !== 'healthy') parts.push(`${id}:${r.status}`);
      else if (held && footprintWeight(held, arrayCentre(id).x, arrayCentre(id).z) > 0) parts.push(`${id}:affected`);
      // Under a footprint but not yet past a threshold. Still worth showing: the
      // hazard is a place, and its edge is part of what the presenter dropped.
      else if (frame.affected[id] !== undefined) parts.push(`${id}:affected`);
    }
    return parts.join('|');
  }, [frame, armed, draft]);
  return useMemo(
    () => new Map(key ? key.split('|').map((pair) => pair.split(':') as [string, ArrayTint]) : []),
    [key],
  );
}

/**
 * Is the twin's camera riding along with a drone right now? A boolean, so the
 * scene subscribes to the answer and not to every tick of site time.
 */
export const useFollowingFlight = (): boolean => useSession(
  (s) => s.followFlight && flightCueAt(s.siteSeconds, s.missions).active,
);

/** Is the field drawn as the 2D map, by the operator's choice or by the fallback? */
export const useFlatField = (): boolean => useSession(
  (s) => s.twinFallback !== null || s.twinMode === '2d',
);

/** The array a flight is inspecting, or null when nothing is in the air. */
export const useFlightTargetId = (): string | null => useSession((s) => {
  const cue = flightCueAt(s.siteSeconds, s.missions);
  return cue.active ? cue.targetId : null;
});

/* ── Hazards ─────────────────────────────────────────────────────────────── */

/** The hazards dropped this session, in the order they were dropped. */
export const useHazards = () => useSession((s) => s.hazards);

export interface FootprintMark {
  id: string;
  kind: 'dust' | 'cloud';
  x: number;
  z: number;
  radius: number;
  /** Still in the presenter's hand. */
  draft: boolean;
}

/** Footprints to draw on the field: every one in force, plus the one being held. */
export function useFootprints(): FootprintMark[] {
  const hazards = useSession((s) => s.hazards);
  const armed = useSession((s) => s.armedHazard);
  const draft = useSession((s) => s.hazardDraft);
  // A string, so this re-renders when a footprint starts or passes and not on
  // every tick of site time in between.
  const inForce = useSession((s) => {
    const hour = siteHour(s.siteSeconds);
    return s.hazards.filter((h) => hazardStrengthAt(h, hour) > 0).map((h) => h.id).join('|');
  });
  return useMemo(() => {
    const live = new Set(inForce ? inForce.split('|') : []);
    const out: FootprintMark[] = [];
    for (const h of hazards) {
      if (h.kind === 'heatwave' || !live.has(h.id)) continue;
      out.push({ id: h.id, kind: h.kind, x: h.cx, z: h.cy, radius: h.radius, draft: false });
    }
    if (draft && armed && armed !== 'heatwave') {
      out.push({
        id: 'draft', kind: armed, x: draft.x, z: draft.z, radius: HAZARD_SPEC[armed].radius, draft: true,
      });
    }
    return out;
  }, [hazards, armed, draft, inForce]);
}

/** Degrees a heatwave is adding to ambient right now. Zero when there is none. */
export const useHeatwaveC = (): number => useSession((s) => {
  let add = 0;
  for (const h of hazardsAt(s.hazards, siteHour(s.siteSeconds))) {
    if (h.kind === 'heatwave') add += h.intensity;
  }
  return Math.round(add * 10) / 10;
});

/** The footprints over one array right now, strongest first. Empty for most arrays. */
export function useHazardsOver(panelId: string): Array<{ kind: 'dust' | 'cloud'; kept: number }> {
  const siteSeconds = useSession((s) => s.siteSeconds);
  const hazards = useSession((s) => s.hazards);
  return useMemo(() => {
    if (hazards.length === 0) return [];
    const c = arrayCentre(panelId);
    const out: Array<{ kind: 'dust' | 'cloud'; kept: number }> = [];
    for (const h of hazardsAt(hazards, siteHour(siteSeconds))) {
      if (h.kind === 'heatwave') continue;
      const kept = h.intensity * footprintWeight(h, c.x, c.z);
      if (kept >= AFFECTED_THRESHOLD) out.push({ kind: h.kind, kept });
    }
    return out.sort((a, b) => b.kept - a.kept);
  }, [panelId, siteSeconds, hazards]);
}

/**
 * What the hazards did to the plan: the queue as it stands against the queue the
 * same site second would have had without them.
 */
export function useHazardImpact(): HazardImpact | null {
  const frame = useSiteFrame();
  const now = useLiveQueue();
  const workOrders = useSession((s) => s.workOrders);
  const injected = useSession((s) => s.injected);
  const hazards = useSession((s) => s.hazards);
  return useMemo(() => {
    // Nothing in force at this second, which is also what a seek to before the
    // first drop looks like.
    const inForce = hazardsAt(hazards, siteHour(frame.siteSeconds));
    if (inForce.length === 0) return null;
    const scheduled = new Set(workOrders.map((w) => w.panelId));
    const baseFrame = liveFrameAt(frame.siteSeconds, scheduled, injected);
    const base = liveQueueAt(baseFrame, scheduled, injected);
    const siteWide = inForce.some((h) => h.kind === 'heatwave');
    const affected = siteWide ? Object.keys(frame.panels).length : Object.keys(frame.affected).length;
    return hazardImpact(base, now, affected, frame.farmOutputMW - baseFrame.farmOutputMW);
  }, [frame, now, workOrders, injected, hazards]);
}

/* ── Scenario ────────────────────────────────────────────────────────────── */

export const useInjected = () => useSession((s) => s.injected);

/** Every fault in force: the committed site history plus this session's rehearsal. */
export function useScenarioEvents(): ScenarioEvent[] {
  const injected = useSession((s) => s.injected);
  return useMemo(() => allEvents(injected), [injected]);
}

/** The fault in force on an array, committed or injected, or nothing. */
export function useArrayFault(panelId: string) {
  const injected = useSession((s) => s.injected);
  return eventFor(panelId, injected);
}

/** Does the site record call this array cracked? A mechanism, not a measurement. */
export function useHasCrackMechanism(panelId: string): boolean {
  const injected = useSession((s) => s.injected);
  return hasCrackMechanism(panelId, injected);
}

/**
 * What there is for the agent to judge about an array, as a key. Null means
 * there is nothing settled to ask about yet.
 *
 * The agent used to be asked again on every change of STATUS. A fault ramping in
 * passes through warning on its way to critical, an approval turns it scheduled,
 * and sunset reads every array healthy, so one fault cost four or five requests
 * and the provider's per-minute limit turned the panel into "Agent unavailable".
 * None of those is a different thing to judge. The key is the CAUSE: which fault,
 * once it has finished developing; or, with no fault, whether the array is off
 * the model at all.
 */
export function useTriageCondition(panelId: string): string | null {
  const frame = useSiteFrame();
  const injected = useSession((s) => s.injected);
  const fault = eventFor(panelId, injected);
  const progress = fault ? faultProgressAt(fault, frame.siteSeconds) : 0;
  // After sunset every reading is zero against zero. A verdict taken then would
  // describe the night, not the array.
  if (isDark(frame.irradiance)) return null;
  if (fault && progress > 0) return progress < 1 ? null : `fault:${fault.id}`;
  if ((frame.panels[panelId]?.status ?? 'healthy') === 'healthy') return 'nominal';
  return frame.affected[panelId] !== undefined ? 'hazard' : 'off-nominal';
}

/* ── Events ──────────────────────────────────────────────────────────────── */

const FILTER_FLOOR: Record<string, Severity[]> = {
  all: ['info', 'active', 'warning', 'critical'],
  warning: ['warning', 'critical'],
  critical: ['critical'],
};

/** Everything that has happened, unfiltered, newest first. Derived, never stored. */
export function useAllFeedEvents(): DemoEvent[] {
  const siteSeconds = useSession((s) => s.siteSeconds);
  const missions = useSession((s) => s.missions);
  const injected = useSession((s) => s.injected);
  const workOrders = useSession((s) => s.workOrders);
  return useMemo(
    () => liveEvents(siteSeconds, missions, injected, new Set(workOrders.map((w) => w.panelId))),
    [siteSeconds, missions, injected, workOrders],
  );
}

export const useFeedFilter = () => useSession((s) => s.feedFilter);

/**
 * The feed as the operator has chosen to see it.
 *
 * The filter is a view control on the feed and nothing more. The flight strip
 * reads `useAllFeedEvents`, because hiding an event from a list is a choice
 * about a list; having the drone stop narrating what it found because somebody
 * set a severity floor would be a different thing entirely.
 */
export function useFeedEvents(): DemoEvent[] {
  const all = useAllFeedEvents();
  const filter = useSession((s) => s.feedFilter);
  return useMemo(() => {
    const allowed = FILTER_FLOOR[filter];
    return allowed.length === 4 ? all : all.filter((e) => allowed.includes(e.severity));
  }, [all, filter]);
}

/* ── Missions and drones ─────────────────────────────────────────────────── */

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

/**
 * Every mission the session has ever flown, newest first, with its phase derived.
 * Unlike `useActiveMissions` this keeps completed ones: a mission log that
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

/** Has this array been inspected: did a mission reach it and finish looking? */
export function useInspected(panelId: string): boolean {
  const siteSeconds = useSession((s) => s.siteSeconds);
  const missions = useSession((s) => s.missions);
  return missions.some(
    (m) => m.panelId === panelId
      && siteSeconds - m.startedAt >= MISSION.outbound + MISSION.inspecting,
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
 * Battery is derived from mission elapsed time: 88 % at dispatch falling to 84 %
 * by the end of the inspection leg, both figures the committed events quote, and
 * recharging on the pad. Derived, so it is identical on every render.
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
    const padId = id === 'DRONE 01' ? 'PAD-01' : 'PAD-02';

    if (!flying) {
      const last = mine[mine.length - 1];
      // On the pad. Back to full over the recharge window after the last landing.
      const since = last ? siteSeconds - (last.startedAt + MISSION_TOTAL) : Infinity;
      const charged = BATTERY_AT_LOCK
        + (BATTERY_FULL - BATTERY_AT_LOCK) * clamp01(since / RECHARGE_SECONDS);
      return {
        id, padId, status: 'STANDBY' as const, target: null, missionId: null,
        batteryPct: mine.length === 0 ? 100 : charged,
        sorties: mine.length,
      };
    }

    const phase = missionPhaseAt(flying, siteSeconds);
    const drain = clamp01(
      (siteSeconds - flying.startedAt) / (MISSION.outbound + MISSION.inspecting),
    );
    return {
      id, padId,
      status: phase.toUpperCase() as DroneRecord['status'],
      target: flying.panelId,
      missionId: flying.id,
      batteryPct: BATTERY_FULL - (BATTERY_FULL - BATTERY_AT_LOCK) * drain,
      sorties: mine.length,
    };
  }), [missions, siteSeconds]);
}

export interface DroneLink {
  id: string;
  /** In the air and talking to the pad, or on it. */
  linked: boolean;
  /** Straight-line distance from the pad, metres. Zero on the pad. */
  rangeM: number;
  altitudeM: number;
}

/**
 * Where each aircraft is, from the same splines the twin flies it along.
 *
 * This replaced a comms block that printed signal strength as a percentage. Those
 * percentages were typed into a component and measured nothing. Range and
 * altitude are what the scene model actually knows about a link, so that is what
 * the console reports.
 */
export function useDroneLinks(): DroneLink[] {
  const siteSeconds = useSession((s) => s.siteSeconds);
  const missions = useSession((s) => s.missions);
  return useMemo(() => DRONE_IDS.map((id) => {
    const flying = missions.find(
      (m) => m.droneId === id && siteSeconds >= m.startedAt && missionPhaseAt(m, siteSeconds) !== 'complete',
    );
    if (!flying) return { id, linked: false, rangeM: 0, altitudeM: 0 };
    const p = droneAt(flightTAt(siteSeconds - flying.startedAt), inspectionTarget(flying.panelId));
    return {
      id,
      linked: true,
      rangeM: Math.hypot(p.x - PAD.x, p.y - PAD.y, p.z - PAD.z),
      altitudeM: p.y,
    };
  }), [missions, siteSeconds]);
}

/* ── Following a flight ──────────────────────────────────────────────────── */

/**
 * The marks on the scene's timeline. An inspection's evidence is revealed against
 * these, so the frames, the matrix and the strip all agree about where the drone
 * has got to. They are lib/scene's own marks, named for what is revealed.
 */
export const BEAT = {
  dispatch: M.dispatch,
  rgbScan: M.rgb,
  thermalScan: M.thermal,
  thermalDone: M.thermalDone,
} as const;

const PILL: Array<[number, (id: string, zone: string) => string]> = [
  [M.dispatch, (id) => `Dispatched to ${id}`],
  [M.transit, (_id, zone) => `Flying to zone ${zone}`],
  [M.lock, (id) => `Target lock, ${id}`],
  [M.rgb, (id) => `Inspecting ${id}`],
  [M.thermal, () => 'Thermal scan'],
  [M.thermalDone, () => 'Returning to the pad'],
];

/**
 * Where the mission has got to, as a few words. It names the array the aircraft
 * is actually over: a caption that names the wrong panel is the fastest way to
 * make the whole overlay read as decoration. A pure lookup, so it is correct the
 * instant the clock is scrubbed.
 */
export function useStatusPill(): string {
  const cue = useFlightCue();
  const zone = cue.targetId.charAt(0);
  let label = PILL[0][1](cue.targetId, zone);
  for (const [at, text] of PILL) if (cue.t >= at) label = text(cue.targetId, zone);
  return label;
}

/** Characters per real second. */
export const CPS = 45;

/**
 * The flight strip's line: the newest thing that actually happened, typed out.
 *
 * It types at 45 characters per REAL second. Site time runs at `timeScale`, so
 * typing at 45 per site second would finish a sentence before it appeared.
 * Dividing by the scale keeps it readable without a second clock to read it by.
 */
export function useMissionLogLine(): { text: string; severity: Severity; done: boolean } | null {
  const timeScale = useSession((s) => s.timeScale);
  const siteSeconds = useSession((s) => s.siteSeconds);
  const feed = useAllFeedEvents();

  const current = feed[0];
  if (!current) return null;
  const reduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const full = typographic(`[${current.timestamp}] ${current.body}`);
  const realSeconds = Math.max(0, siteSeconds - current.t) / Math.max(1, timeScale);
  const text = reduced ? full : full.slice(0, Math.floor(realSeconds * CPS));
  return { text, severity: current.severity, done: text.length >= full.length };
}

/* ── Captured evidence ───────────────────────────────────────────────────── */

export const useCellGrid = (): CellGrid => cellGrid;
export const useDetection = (): Detection | null => detectionData;

/** The committed agent run. It is B-17's and only B-17's. */
export const useAgentCache = (): AgentCache | null => agentCacheData;

/**
 * THE CLOCK THE INSPECTION SURFACES RUN ON: the frames, the cell grid, the list.
 *
 *   · it must be THIS array's flight; a drone over C-07 reveals nothing about B-17
 *   · an array already inspected holds, and does not empty when the drone leaves
 *   · nothing before a drone gets there, which is the whole point of the gate
 */
export function useInspectionClock(): number {
  const cue = useFlightCue();
  const selected = useSelectedPanelId();
  const inspected = useInspected(selected);

  if (inspected) return BEAT.thermalDone;
  if (cue.active && cue.targetId === selected) return cue.t;
  return 0;
}

/** Which evidence slots are both revealed by the inspection AND present on disk. */
export function useEvidence() {
  const t = useInspectionClock();
  const selected = useSelectedPanelId();

  // We hold captured imagery for one array. Showing B-17's thermal frame under
  // another array's name would be presenting one array's evidence as another's.
  const captured = hasCapturedEvidence(selected);
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
 * How many matrix cells have filled, in scan order across the thermal pass. The
 * sequential fill is what sells that a sensor is reading the panel; a single
 * fade-in of the whole grid reads as a graphic.
 */
export function useMatrixFillCount(): number {
  const t = useInspectionClock();
  const total = cellGrid.rows * cellGrid.cols;
  const k = clamp01((t - BEAT.thermalScan) / (BEAT.thermalDone - BEAT.thermalScan));
  return Math.floor(k * total);
}

/* ── Queue, plan, decisions ──────────────────────────────────────────────── */

/** The ranked queue as the site actually stands right now. */
export function useLiveQueue(): LiveQueue {
  const frame = useSiteFrame();
  const workOrders = useSession((s) => s.workOrders);
  const injected = useSession((s) => s.injected);
  const hazards = useSession((s) => s.hazards);
  return useMemo(
    () => liveQueueAt(frame, new Set(workOrders.map((w) => w.panelId)), injected, hazards),
    [frame, workOrders, injected, hazards],
  );
}

/**
 * The likely cause of every queued job, from the same instrument readings the
 * incident screen diagnoses from. Keyed by array.
 */
export function useQueueCauses(): ReadonlyMap<string, Cause> {
  const { tasks } = useLiveQueue();
  const frame = useSiteFrame();
  return useMemo(() => {
    const median = cellTemp(frame.ambientC, frame.irradiance);
    const hourOffset = forecastOffset(frame.siteSeconds);
    return new Map(tasks.map((t) => {
      const r = frame.panels[t.panelId];
      return [t.panelId, diagnose({
        panelId: t.panelId,
        deviationPct: r?.deviationPct ?? 0,
        stringDeviationPct: r?.stringDeviationPct,
        cellTempC: r?.cellTempC ?? median,
        fleetMedianCellTempC: median,
        hourOffset,
        peakIrradiance: PEAK_IRRADIANCE,
      })] as const;
    }));
  }, [tasks, frame]);
}

export const useWorkOrders = () => useSession((s) => s.workOrders);

/** Every recommendation the operator has declined, with the reason given. */
export const useOverrideList = () => useSession((s) => s.overrides);

/** The operator's recorded decision to decline work on this array, if any. */
export function useOverride(panelId: string) {
  const overrides = useSession((s) => s.overrides);
  return overrides.find((o) => o.panelId === panelId);
}

export interface DaySchedule {
  problem: Problem;
  plan: Plan;
  /** Slots the heat rule closes, a subset of `problem.closed`. */
  heat: ReadonlySet<number>;
  /** The hour of day slot 0 starts at. */
  firstSlotHour: number;
  solver: 'ready' | 'loading' | 'failed';
}

/**
 * One remembered plan. The problem is rebuilt every tick, but it only CHANGES
 * when a job's worth moves at the second decimal, a slot rolls over or a hazard
 * lands, and the key says which. So the solver runs a few times a minute and
 * never once per frame.
 */
let lastPlan: { key: string; plan: Plan } | null = null;

/**
 * The day's crew plan: the exact solve where the solver has loaded, the
 * heuristic where it has not, and the heuristic's score beside it either way.
 *
 * The cause decides the work. A soiled array needs a wash crew for two hours and
 * a cracked one needs a module replaced, which is the scheduling payoff of the
 * triage stage. A PROPOSAL: nothing here creates a work order.
 */
export function useSchedule(): DaySchedule {
  const { tasks } = useLiveQueue();
  const siteSeconds = useSiteSeconds();
  const frame = useSiteFrame();
  const hazards = useSession((s) => s.hazards);
  const injected = useSession((s) => s.injected);
  const status = useSolver((s) => s.status);
  const solver = useSolver((s) => s.solver);

  return useMemo(() => {
    const median = cellTemp(frame.ambientC, frame.irradiance);
    const nowOffsetH = forecastOffset(siteSeconds);
    const repairOf = (panelId: string) => {
      const r = frame.panels[panelId];
      const cause = diagnose({
        panelId,
        deviationPct: r?.deviationPct ?? 0,
        stringDeviationPct: r?.stringDeviationPct,
        cellTempC: r?.cellTempC ?? median,
        fleetMedianCellTempC: median,
        hourOffset: nowOffsetH,
        peakIrradiance: PEAK_IRRADIANCE,
      }).id;
      return repairFor(cause, eventFor(panelId, injected));
    };

    const ctx = { tasks, repairFor: repairOf, nowOffsetH, epochHour: scenario.epochHour, hazards };
    const problem = problemFrom(ctx);
    const key = `${status}#${problemKey(problem)}`;
    if (!lastPlan || lastPlan.key !== key) lastPlan = { key, plan: solve(problem, solver) };

    return {
      problem,
      plan: lastPlan.plan,
      heat: closedSlots(ctx).heat,
      firstSlotHour: (scenario.epochHour + slotStartOffsetH(nowOffsetH, 0)) % 24,
      solver: status === 'ready' ? 'ready' : status === 'failed' ? 'failed' : 'loading',
    };
  }, [tasks, frame, siteSeconds, hazards, injected, status, solver]);
}

/* ── Analytics ───────────────────────────────────────────────────────────── */

/**
 * The modelled arrays across the hours ahead, from the model.
 *
 * Sampled, not continuous: four points an hour is dense enough that a fault ramp
 * shows as a step and cheap enough to memoise. It does not depend on site time,
 * so it is computed when a fault, a hazard or a work order changes and never per
 * frame.
 */
export function useOutlook(hours: number): Outlook {
  const workOrders = useSession((s) => s.workOrders);
  const injected = useSession((s) => s.injected);
  const hazards = useSession((s) => s.hazards);
  return useMemo(
    () => outlook(new Set(workOrders.map((w) => w.panelId)), injected, hazards, hours),
    [workOrders, injected, hazards, hours],
  );
}

/** How far ahead the forecast, and therefore every money figure, can honestly look. */
export const OUTLOOK_HOURS = 72;
/** Coarser than the chart: this one is recomputed inside the drop-to-replan budget. */
const COST_SAMPLES_PER_HOUR = 2;

/**
 * What the hazards in force cost over the forecast window: the energy the site
 * loses with them, less what it would lose at the same faults without them.
 * Null when nothing has been dropped.
 */
export function useHazardCostMWh(): { mwh: number; low: number; high: number } | null {
  const workOrders = useSession((s) => s.workOrders);
  const injected = useSession((s) => s.injected);
  const hazards = useSession((s) => s.hazards);
  const without = useMemo(
    () => outlook(new Set(workOrders.map((w) => w.panelId)), injected, [], OUTLOOK_HOURS, COST_SAMPLES_PER_HOUR),
    [workOrders, injected],
  );
  return useMemo(() => {
    if (hazards.length === 0) return null;
    const withThem = outlook(new Set(workOrders.map((w) => w.panelId)), injected, hazards, OUTLOOK_HOURS, COST_SAMPLES_PER_HOUR);
    return hazardCostMWh(without, withThem);
  }, [without, workOrders, injected, hazards]);
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
      // shortfall: a scenario fault is a fault, a hazard footprint is weather, a
      // soiled array is soiling, and the nominal derate is the last bucket.
      const cause = eventFor(id, injected) ? 'Cell mismatch and bypass diode'
        : frame.affected[id] !== undefined ? 'Sandbox hazard footprint'
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

export interface ZoneBreakdown {
  id: ZoneId;
  total: number;
  warning: number;
  critical: number;
  scheduled: number;
  /** Shortfall across the zone right now, kW. */
  shortfallKW: number;
}

/** All three zones in one pass, so no hook is ever called inside a map. */
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

/* ── One array, described honestly ───────────────────────────────────────── */

/**
 * An array's own 72-hour projected loss, in MWh.
 *
 * The committed figure belongs to B-17. Scaled by this array's own shortfall at
 * reference conditions, B-17 still reads exactly the committed value and a
 * healthy array reads nothing at all.
 */
export function useProjectedLossMWh(panelId: string): number {
  const siteSeconds = useSession((s) => s.siteSeconds);
  const injected = useSession((s) => s.injected);
  const hazards = useSession((s) => s.hazards);
  return projected72hLossMWh(referenceShortfallKW(panelId, siteSeconds, injected, hazards));
}

/**
 * One array's incident, at this moment.
 *
 * Every input is a figure some other part of the console is already showing,
 * which is the point: the incident does not introduce a source of truth, it gives
 * the existing ones a shape. See src/lib/incident.ts for why it is derived.
 */
export function useIncident(panelId: string): Incident {
  const siteSeconds = useSiteSeconds();
  const injected = useInjected();
  const hazards = useHazards();
  const reading = usePanelReading(panelId);
  const fault = useArrayFault(panelId);
  const projectedLoss = useProjectedLossMWh(panelId);
  const override = useOverride(panelId);
  const { tasks } = useLiveQueue();
  const missions = useSession((s) => s.missions);
  const workOrders = useSession((s) => s.workOrders);
  const frame = useSiteFrame();
  // What a healthy array runs at right now: the baseline a thermal rise is
  // measured against, from the same model, not a stored constant.
  const fleetMedianCellTemp = cellTemp(frame.ambientC, frame.irradiance);
  const filed = useDetector((s) => s.byPanel[panelId]);
  const framesInPass = useDetector((s) => s.framesInPass[panelId] ?? 0);
  const liveBest = useMemo(() => {
    const top = filed?.detections.slice().sort((a, b) => b.confidence - a.confidence)[0];
    return top ? { label: top.label, confidence: top.confidence, frames: framesInPass } : null;
  }, [filed, framesInPass]);

  return useMemo(() => {
    // A mission counts as INSPECTED once it has been on station, not once it
    // was ordered.
    const mission = missions.find((m) => m.panelId === panelId);
    const onStationAt = mission ? mission.startedAt + MISSION.outbound : null;
    const inspectedAt = mission
      && siteSeconds - mission.startedAt >= MISSION.outbound + MISSION.inspecting
      ? onStationAt
      : null;
    const dispatchedAt = mission && siteSeconds >= mission.startedAt ? mission.startedAt : null;

    const task = tasks.find((t) => t.panelId === panelId);
    const order = workOrders.find((w) => w.panelId === panelId);

    return buildIncident({
      panelId,
      deviationPct: reading?.deviationPct ?? 0,
      referenceShortfallKW: referenceShortfallKW(panelId, siteSeconds, injected, hazards),
      fault,
      inspectedAt,
      dispatchedAt,
      projectedLossMWh: projectedLoss,
      hoursUntilDeadline: task?.hoursUntilDeadline ?? null,
      queueRank: task ? tasks.indexOf(task) + 1 : null,
      workOrderAt: order?.createdAt ?? null,
      override: override ? { at: override.createdAt, reason: override.reason } : null,
      // Scoped, as everything about captured imagery must be: we hold a
      // detection for B-17 and for no other array.
      detection: hasCapturedEvidence(panelId) ? detectionData : null,
      // The run this browser did, on this array's own frame. Not scoped to B-17,
      // because it is not B-17's measurement: it is whatever the model said about
      // the frame the drone actually returned.
      liveDetection: liveBest,
      // Instrument readings only, never the committed soiling value. Reading
      // `f_soil` here would be consulting the answer: it is what the diagnosis is
      // trying to establish, and no operator on a real site can see it.
      cause: diagnose({
        panelId,
        deviationPct: reading?.deviationPct ?? 0,
        stringDeviationPct: reading?.stringDeviationPct,
        cellTempC: reading?.cellTempC ?? 0,
        fleetMedianCellTempC: fleetMedianCellTemp,
        hourOffset: forecastOffset(siteSeconds),
        peakIrradiance: PEAK_IRRADIANCE,
      }),
    });
  }, [
    panelId, siteSeconds, injected, hazards, reading, fault, projectedLoss, override,
    tasks, missions, workOrders, fleetMedianCellTemp, liveBest,
  ]);
}

/**
 * What waiting costs, for one array.
 *
 * The one thing this adds to what is already on screen is the OPEN-CIRCUIT
 * shortfall, the declared post-deadline mechanism, and it comes from the model
 * with a mismatch of zero, which is what a string outage means everywhere else.
 */
export function useDeferOutcomes(panelId: string): DeferOutcome[] {
  const siteSeconds = useSiteSeconds();
  const injected = useInjected();
  const hazards = useHazards();
  const fault = useArrayFault(panelId);
  const { tasks } = useLiveQueue();
  const incident = useIncident(panelId);

  return useMemo(() => {
    const task = tasks.find((t) => t.panelId === panelId);
    return deferOutcomes({
      shortfallAtRefKW: referenceShortfallKW(panelId, siteSeconds, injected, hazards),
      // Scoped to THIS array's fault: a two-string crack opens two strings, not
      // five. Defaulting to B-17's five would overstate the cliff on a shallower
      // fault, which is the same class of error as borrowing its evidence.
      openCircuitKW: openCircuitShortfallKW(fault?.faultedStrings),
      // THE CLIFF BELONGS TO THE CRACK. A soiled array's deadline is a booked
      // cleaning window, not a thermal-dose threshold, and there is no diode on
      // it to fail.
      hoursUntilDeadline: incident.cause.id === 'crack' ? task?.hoursUntilDeadline ?? null : null,
      nowH: forecastOffset(siteSeconds),
    });
  }, [panelId, siteSeconds, injected, hazards, fault, tasks, incident]);
}
