import type { CauseId } from './causes';
import { ambientAt, crackDeadlineHour } from './physics';
import { crackDeadlineUnder, hazardsAt, siteWeather, type HazardEvent } from './hazard';
import { liveFrameAt, scenario, type ScenarioEvent } from './live';
import { inrForMWh } from './money';
import { repairFor } from './repair';
import { CREW_COUNT, HEAT_WORK_LIMIT_C, SHIFT_CAP_HOURS, SHIFT_END_HOUR, SHIFT_START_HOUR, TRAVEL_HOURS_BASE } from './scheduler';

export const FUTURE_HOURS = 72;
export const DELAY_OPTIONS = [0, 6, 24, 48] as const;
export const WORK_STEP_SECONDS = 15 * 60;
export const MAINTENANCE_PHASES = ['waiting', 'travelling', 'repairing', 'verification', 'closed'] as const;
export type MaintenancePhase = typeof MAINTENANCE_PHASES[number];
export interface RepairRun {
  panelId: string;
  orderAt: number;
  requestedAt: number;
  departedAt: number;
  arrivedAt: number;
  completedAt: number;
  returnStartedAt?: number;
  returnedAt?: number;
  crew: number;
  kind: 'module' | 'cleaning' | 'string';
  work: Array<{ start: number; end: number }>;
  verifiedAt?: number;
  closedAt?: number;
}
export interface Service { panelId: string; at: number; kind: RepairRun['kind'] }

function workAllowed(at: number, hazards: readonly HazardEvent[]): boolean {
  const hour = ((scenario.epochHour + at / 3600) % 24 + 24) % 24;
  const weather = siteWeather(0, ambientAt(at / 3600), hazardsAt(hazards, scenario.epochHour + at / 3600));
  return hour >= SHIFT_START_HOUR && hour < SHIFT_END_HOUR && weather.tAmb < HEAT_WORK_LIMIT_C;
}
function crewSecondsOnDay(at: number, runs: readonly RepairRun[], work: RepairRun['work'], travel: { start: number; end: number }): number {
  const day = Math.floor((scenario.epochHour + at / 3600) / 24);
  const start = (day * 24 - scenario.epochHour) * 3600;
  const end = start + 24 * 3600;
  const segments = [...runs.flatMap((r) => [{ start: r.departedAt, end: r.arrivedAt }, ...r.work,
    ...(r.returnStartedAt !== undefined && r.returnedAt !== undefined ? [{ start: r.returnStartedAt, end: r.returnedAt }] : [])]), ...work, travel];
  return segments.reduce((sum, w) => sum + Math.max(0, Math.min(end, w.end) - Math.max(start, w.start)), 0);
}

/** Reserving a crew through a heat hold prevents overlapping jobs from sharing it. */
export function planRepair(panelId: string, orderAt: number, requestedAt: number, cause: CauseId,
  injected: readonly ScenarioEvent[], hazards: readonly HazardEvent[], existing: readonly RepairRun[] = []): RepairRun | null {
  const fault = [...injected, ...scenario.events].find((e) => e.panelId === panelId);
  const repair = repairFor(cause, fault);
  if (!repair.hours || cause === 'unexplained') return null;
  const available = Array.from({ length: CREW_COUNT }, (_, crew) => ({ crew,
    at: Math.max(requestedAt, ...existing.filter((r) => r.crew === crew).map((r) => r.returnedAt ?? r.completedAt)) }));
  available.sort((a, b) => a.at - b.at || a.crew - b.crew);
  const slot = available[0];
  let departedAt = slot.at;
  const end = requestedAt + FUTURE_HOURS * 3600;
  const travelSeconds = TRAVEL_HOURS_BASE * (fault?.accessCost ?? 1) * 3600;
  const previousWork = existing.filter((r) => r.crew === slot.crew);
  while (departedAt < end && (!workAllowed(departedAt, hazards) || !workAllowed(departedAt + travelSeconds - 1, hazards)
    || crewSecondsOnDay(departedAt, previousWork, [], { start: departedAt, end: departedAt + travelSeconds }) > SHIFT_CAP_HOURS * 3600)) departedAt += WORK_STEP_SECONDS;
  const arrivedAt = departedAt + travelSeconds;
  const work: RepairRun['work'] = [];
  let remaining = repair.hours * 3600;
  let at = arrivedAt;
  while (remaining > 0 && at < end) {
    const duration = Math.min(remaining, WORK_STEP_SECONDS);
    if (workAllowed(at, hazards) && workAllowed(at + duration - 1, hazards)
      && crewSecondsOnDay(at, previousWork, work, { start: departedAt, end: arrivedAt }) + duration <= SHIFT_CAP_HOURS * 3600) {
      work.push({ start: at, end: at + duration });
      remaining -= duration;
    }
    at += duration;
  }
  if (remaining > 0) return null;
  const run = withCrewReturn({ panelId, orderAt, requestedAt, departedAt, arrivedAt, completedAt: work.at(-1)!.end,
    work, crew: slot.crew, kind: cause === 'soiling' ? 'cleaning' : repair.parts.includes('module') ? 'module' : 'string' }, hazards, existing);
  return run.returnedAt === undefined ? null : run;
}

/** Older saved jobs retain their repair and approval times when gaining a return leg. */
export function withCrewReturn(run: RepairRun, hazards: readonly HazardEvent[], existing: readonly RepairRun[] = []): RepairRun {
  if (run.returnedAt !== undefined) return run;
  const travelSeconds = run.arrivedAt - run.departedAt;
  const end = run.requestedAt + FUTURE_HOURS * 3600;
  const previousWork = existing.filter((r) => r.crew === run.crew && r !== run && r.completedAt <= run.departedAt);
  let returnStartedAt = run.completedAt;
  // Verification can proceed while the crew waits for a safe return window.
  while (returnStartedAt < end && (!workAllowed(returnStartedAt, hazards) || !workAllowed(returnStartedAt + travelSeconds - 1, hazards)
    || crewSecondsOnDay(returnStartedAt, previousWork, run.work, { start: run.departedAt, end: run.arrivedAt }) + travelSeconds > SHIFT_CAP_HOURS * 3600)) returnStartedAt += WORK_STEP_SECONDS;
  return returnStartedAt + travelSeconds > end ? run : { ...run, returnStartedAt, returnedAt: returnStartedAt + travelSeconds };
}

export function crewAvailability(runs: readonly RepairRun[], at: number) {
  const reserved = new Set(runs.filter((r) => at >= r.requestedAt && at < (r.returnedAt ?? r.completedAt)).map((r) => r.crew));
  return { total: CREW_COUNT, reserved: reserved.size, available: Math.max(0, CREW_COUNT - reserved.size) };
}

export function crewHoursSpent(runs: readonly RepairRun[], at: number): number[] {
  const day = Math.floor((scenario.epochHour + at / 3600) / 24);
  const start = (day * 24 - scenario.epochHour) * 3600;
  return Array.from({ length: CREW_COUNT }, (_, crew) => runs.filter((r) => r.crew === crew)
    .flatMap((r) => [{ start: r.departedAt, end: r.arrivedAt }, ...r.work,
      ...(r.returnStartedAt !== undefined && r.returnedAt !== undefined ? [{ start: r.returnStartedAt, end: r.returnedAt }] : [])])
    .reduce((sum, w) => sum + Math.max(0, Math.min(at, w.end) - Math.max(start, w.start)), 0) / 3600);
}

export function repairPhase(run: RepairRun, at: number): MaintenancePhase {
  if (at < run.departedAt) return 'waiting';
  if (at < run.arrivedAt) return 'travelling';
  if (at < run.completedAt) return 'repairing';
  return run.closedAt !== undefined && at >= run.closedAt ? 'closed' : 'verification';
}

export function repairProgress(run: RepairRun, at: number): number {
  const total = run.work.reduce((sum, w) => sum + w.end - w.start, 0);
  const done = run.work.reduce((sum, w) => sum + Math.max(0, Math.min(at, w.end) - w.start), 0);
  return total > 0 ? Math.min(1, done / total) : 0;
}

export function servicesFor(runs: readonly RepairRun[]): Service[] {
  return runs.map((r) => ({ panelId: r.panelId, at: r.completedAt, kind: r.kind }));
}

/** Both futures evaluate the same weather; only the intervention time changes. */
export function compareFutures(panelId: string, now: number, delayHours: number, cause: CauseId,
  injected: readonly ScenarioEvent[], hazards: readonly HazardEvent[], existing: readonly RepairRun[] = []) {
  const soon = planRepair(panelId, now, now, cause, injected, hazards, existing);
  const later = planRepair(panelId, now, now + delayHours * 3600, cause, injected, hazards, existing);
  const fault = [...injected, ...scenario.events].find((e) => e.panelId === panelId);
  const deadline = fault?.mechanism?.toLowerCase().includes('crack')
    ? hazards.length ? crackDeadlineUnder({ id: panelId }, fault.startHour - scenario.epochHour, hazards, scenario.epochHour)
      : crackDeadlineHour(fault.startHour - scenario.epochHour) : null;
  const curve = (run: RepairRun | null) => {
    let loss = 0;
    let previous = 0;
    const samples: Array<{ hour: number; lossMWh: number }> = [];
    for (let hour = 0; hour <= FUTURE_HOURS; hour += 0.25) {
      const reading = liveFrameAt(now + hour * 3600, new Set(), injected, hazards, run ? servicesFor([run]) : []).panels[panelId];
      const shortfall = Math.max(0, reading.expectedKW - reading.actualKW);
      if (hour > 0) loss += (previous + shortfall) / 2 * 0.25 / 1000;
      previous = shortfall;
      if (Number.isInteger(hour)) samples.push({ hour, lossMWh: loss });
    }
    return { run, samples, lossMWh: loss, revenueINR: inrForMWh(loss),
      crossesDeadline: deadline !== null && (!run || run.completedAt / 3600 > deadline) };
  };
  return { soon: curve(soon), later: curve(later), deadline, horizonHours: FUTURE_HOURS };
}
