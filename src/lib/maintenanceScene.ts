import { arrayCentre, clamp01, DAMAGED_INDEX, moduleOffsetX, smooth, type Vec3 } from './scene';
import { SERVICE_HUB } from './siteLayout';
import { repairProgress, type RepairRun } from './maintenance';

// Match the site's fast playback setting without changing any crew duration.
export const MAINTENANCE_PLAYBACK = 600;

const point = (x: number, z: number): Vec3 => ({ x, y: 0, z });
const distance = (a: Vec3, b: Vec3) => Math.hypot(b.x - a.x, b.z - a.z);

/** The row aisle is clear of modules; trucks never drive across a panel footprint. */
export function crewRoute(panelId: string, crew: number): Vec3[] {
  const target = arrayCentre(panelId);
  const parkingX = SERVICE_HUB.x + (crew % 2 ? 1.1 : -1.1);
  const corners = [point(parkingX, SERVICE_HUB.z), point(parkingX, SERVICE_HUB.z + 4),
    point(SERVICE_HUB.roadX, SERVICE_HUB.z + 4), point(SERVICE_HUB.roadX, target.z + 4), point(target.x, target.z + 4)];
  const route = [corners[0]];
  for (let i = 1; i < corners.length - 1; i++) {
    const before = corners[i - 1], corner = corners[i], after = corners[i + 1];
    const incoming = distance(before, corner), outgoing = distance(corner, after);
    if (incoming < 0.01 || outgoing < 0.01) { route.push(corner); continue; }
    const radius = Math.min(1.1, incoming / 3, outgoing / 3);
    const a = point(corner.x + (before.x - corner.x) * radius / incoming, corner.z + (before.z - corner.z) * radius / incoming);
    const b = point(corner.x + (after.x - corner.x) * radius / outgoing, corner.z + (after.z - corner.z) * radius / outgoing);
    route.push(a);
    for (let j = 1; j <= 6; j++) {
      const k = j / 6;
      route.push(point((1 - k) ** 2 * a.x + 2 * k * (1 - k) * corner.x + k ** 2 * b.x,
        (1 - k) ** 2 * a.z + 2 * k * (1 - k) * corner.z + k ** 2 * b.z));
    }
  }
  route.push(corners.at(-1)!);
  return route;
}

export function sampleCrewRoute(route: readonly Vec3[], fraction: number) {
  const lengths = route.slice(1).map((p, i) => distance(route[i], p));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const travelled = clamp01(fraction) * total;
  let left = travelled;
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] && lengths[i] > 0 || i === lengths.length - 1) {
      const a = route[i], b = route[i + 1], k = lengths[i] ? clamp01(left / lengths[i]) : 0;
      return { position: point(a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k),
        heading: Math.atan2(a.x - b.x, a.z - b.z), distance: travelled, total };
    }
    left -= lengths[i];
  }
  return { position: route[0], heading: Math.PI, distance: 0, total };
}

export function crewVehicleAt(run: RepairRun, at: number) {
  const returning = run.returnStartedAt !== undefined && at >= run.returnStartedAt;
  const returnedAt = run.returnedAt ?? run.completedAt;
  const route = crewRoute(run.panelId, run.crew);
  const fraction = returning ? 1 - clamp01((at - run.returnStartedAt!) / (returnedAt - run.returnStartedAt!))
    : clamp01((at - run.departedAt) / (run.arrivedAt - run.departedAt));
  const sample = sampleCrewRoute(route, fraction);
  const turn = at >= run.arrivedAt ? smooth(clamp01((repairProgress(run, at) - 0.96) / 0.04)) : 0;
  return { ...sample, heading: sample.heading + (returning ? Math.PI : turn * Math.PI), fraction,
    returning, visible: at >= run.requestedAt && at <= returnedAt,
    moving: at >= run.departedAt && at < run.arrivedAt || returning && at < returnedAt };
}

/** Gait follows metres walked, and work poses follow productive time, including heat holds. */
export function crewWorkerAt(run: RepairRun, at: number, worker: number) {
  const p = repairProgress(run, at);
  const target = arrayCentre(run.panelId);
  const side = worker ? 1 : -1;
  const heading = sampleCrewRoute(crewRoute(run.panelId, run.crew), 1).heading;
  const start = point(target.x + Math.cos(heading) * side * 1.15 - Math.sin(heading) * 0.7,
    target.z + 4 - Math.sin(heading) * side * 1.15 - Math.cos(heading) * 0.7);
  const end = point(target.x + moduleOffsetX(DAMAGED_INDEX) + side * 0.8, target.z + 1);
  const walk = p < 0.06 ? clamp01(p / 0.06) : p > 0.88 ? clamp01((0.94 - p) / 0.06) : 1;
  const walking = walk < 1;
  const productiveSeconds = run.work.reduce((sum, w) => sum + Math.max(0, Math.min(at, w.end) - w.start), 0);
  const stride = walking ? Math.sin(distance(start, end) * walk * Math.PI * 2) * 0.55 : 0;
  const working = run.work.some((w) => at >= w.start && at < w.end);
  return { position: point(start.x + (end.x - start.x) * walk, start.z + (end.z - start.z) * walk),
    heading: walking ? Math.atan2(start.x - end.x, start.z - end.z) + (p > 0.88 ? Math.PI : 0) : 0,
    stride, working, reach: !walking && working ? 0.7 + Math.sin(productiveSeconds / 1200 + worker) * 0.18 : 0,
    visible: at >= run.arrivedAt && at < run.completedAt && p < 0.94 };
}

/** Removed glass stays beside the crew until the completed repair restores the array. */
export function repairModuleAt(run: RepairRun, at: number) {
  const progress = repairProgress(run, at);
  const active = run.kind === 'module' && at >= run.arrivedAt && at < run.completedAt;
  return { active, removal: active ? smooth(clamp01((progress - 0.12) / 0.16)) : 0,
    installing: active && progress >= 0.35,
    installation: smooth(clamp01((progress - 0.35) / 0.4)) };
}
