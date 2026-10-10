import { describe, expect, it } from 'vitest';
import { planRepair, repairProgress } from './maintenance';
import { crewRoute, crewVehicleAt, crewWorkerAt, repairModuleAt, sampleCrewRoute } from './maintenanceScene';
import { SERVICE_HUB } from './siteLayout';
import { arrayCentre } from './scene';

describe('crew motion sampled from the approved schedule', () => {
  it('departs the service bay, follows the western road, and returns before another dispatch', () => {
    const run = planRepair('B-17', 0, 0, 'crack', [], [])!;
    const route = crewRoute(run.panelId, run.crew);
    expect(route[0].z).toBe(SERVICE_HUB.z);
    expect(route.some((p) => p.x === SERVICE_HUB.roadX)).toBe(true);
    expect(crewVehicleAt(run, run.departedAt).position).toEqual(route[0]);
    expect(crewVehicleAt(run, run.arrivedAt).position).toEqual({ ...arrayCentre('B-17'), z: arrayCentre('B-17').z + 4 });
    expect(crewVehicleAt(run, run.returnedAt!).position).toEqual(route[0]);
    expect(crewVehicleAt(run, run.returnedAt! + 1).visible).toBe(false);
    expect(run.returnedAt).toBeGreaterThan(run.completedAt);
  });

  it('covers equal route distance in equal travel time and rewinds without accumulated motion', () => {
    const run = planRepair('C-07', 0, 0, 'crack', [], [])!;
    const quarter = run.departedAt + (run.arrivedAt - run.departedAt) / 4;
    const first = crewVehicleAt(run, quarter);
    crewVehicleAt(run, run.completedAt);
    expect(crewVehicleAt(run, quarter)).toEqual(first);
    expect(first.distance / first.total).toBeCloseTo(0.25);
    const route = crewRoute(run.panelId, run.crew);
    expect(sampleCrewRoute(route, 1).position).toEqual(route.at(-1));
  });

  it('walks the crew from the van to the damaged module, then back', () => {
    const run = planRepair('B-17', 0, 0, 'crack', [], [])!;
    const arrived = crewWorkerAt(run, run.arrivedAt, 0);
    const working = crewWorkerAt(run, run.arrivedAt + (run.completedAt - run.arrivedAt) / 2, 0);
    expect(Math.abs(arrived.position.z - arrayCentre('B-17').z - 4)).toBeCloseTo(1.15);
    expect(working.position.z).toBe(arrayCentre('B-17').z + 1);
    expect(working.reach).toBeGreaterThan(0);
    expect(repairProgress(run, run.completedAt)).toBe(1);
    expect(crewWorkerAt(run, run.completedAt, 0).visible).toBe(false);
    const boardedAt = run.arrivedAt + (run.completedAt - run.arrivedAt) * 0.95;
    expect(crewWorkerAt(run, boardedAt, 0).visible).toBe(false);
    expect(crewVehicleAt(run, run.returnStartedAt! - 1).heading).toBeCloseTo(crewVehicleAt(run, run.returnStartedAt!).heading);
  });
});

it('removes the faulty module before installation and restores the fixed array only at completion', () => {
  const run = planRepair('B-17', 0, 0, 'crack', [], [])!;
  const at = (progress: number) => run.arrivedAt + (run.completedAt - run.arrivedAt) * progress;
  expect(repairModuleAt(run, at(0.1)).removal).toBe(0);
  expect(repairModuleAt(run, at(0.3))).toMatchObject({ removal: 1, installing: false });
  expect(repairModuleAt(run, at(0.5))).toMatchObject({ removal: 1, installing: true });
  expect(repairModuleAt(run, at(0.9)).installation).toBe(1);
  expect(repairModuleAt(run, run.completedAt)).toMatchObject({ active: false, removal: 0, installing: false });
  expect(repairModuleAt(run, at(0.3))).toMatchObject({ removal: 1, installing: false });
});
