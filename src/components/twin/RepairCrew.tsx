'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { useRepairRuns } from '@/hooks/useOperationalSelectors';
import { repairProgress, type RepairRun } from '@/lib/maintenance';
import { DAMAGED_INDEX, PANEL_H, PANEL_TILT, PANEL_W, POST_HEIGHT, arrayCentre, moduleOffsetX } from '@/lib/scene';
import { SCENE, SURFACE } from '@/lib/scenePalette';
import { useSession } from '@/store/session';
import { crewVehicleAt, crewWorkerAt, repairModuleAt } from '@/lib/maintenanceScene';
import { panelMaterial } from '@/components/scene/panelMaterial';

function Crew({ run }: { run: RepairRun }) {
  const van = useRef<Group>(null);
  const wheels = useRef<Group>(null);
  const leftDoor = useRef<Group>(null);
  const rightDoor = useRef<Group>(null);
  const replacement = useRef<Group>(null);
  const material = useMemo(() => panelMaterial(false), []);
  useEffect(() => () => material.dispose(), [material]);
  const target = arrayCentre(run.panelId);
  useFrame(() => {
    const at = useSession.getState().siteSeconds;
    const vehicle = crewVehicleAt(run, at);
    if (van.current) {
      van.current.visible = vehicle.visible;
      van.current.position.set(vehicle.position.x, 0, vehicle.position.z);
      van.current.rotation.y = vehicle.heading;
    }
    if (wheels.current) wheels.current.children.forEach((wheel) => {
      wheel.rotation.x = (vehicle.returning ? vehicle.total * 2 - vehicle.distance : vehicle.distance) / 0.4;
    });
    const progress = repairProgress(run, at);
    const doorsOpen = at >= run.arrivedAt && at < run.completedAt && (progress < 0.08 || progress > 0.88 && progress < 0.94);
    if (leftDoor.current) leftDoor.current.rotation.y = doorsOpen ? 1.1 : 0;
    if (rightDoor.current) rightDoor.current.rotation.y = doorsOpen ? -1.1 : 0;
    if (replacement.current) {
      const stage = repairModuleAt(run, at);
      const install = stage.installation;
      replacement.current.visible = stage.installing;
      replacement.current.position.set(target.x + moduleOffsetX(DAMAGED_INDEX),
        0.8 + (POST_HEIGHT - 0.8) * install + Math.sin(install * Math.PI) * 0.6, target.z + 3 * (1 - install));
      replacement.current.rotation.x = PANEL_TILT * install;
    }
  });
  return <>
    <group ref={van} visible={false}>
      <mesh position={[0, 0.65, 0]}><boxGeometry args={[1.7, 1.1, 3.6]} /><meshStandardMaterial color={SURFACE.fracture} roughness={0.5} /></mesh>
      <mesh position={[0, 1.35, -0.7]}><boxGeometry args={[1.6, 0.8, 1.5]} /><meshStandardMaterial color={SURFACE.fracture} roughness={0.5} /></mesh>
      <mesh position={[0, 1.4, -1.46]} rotation={[-0.12, 0, 0]}><boxGeometry args={[1.35, 0.48, 0.04]} /><meshStandardMaterial color={SCENE.panel} metalness={0.3} roughness={0.2} /></mesh>
      {[-1, 1].map((side) => <group key={side} ref={side < 0 ? leftDoor : rightDoor} position={[side * 0.83, 0, -1.35]}>
        <mesh position={[0, 0.95, 0.6]}><boxGeometry args={[0.04, 0.55, 1.2]} /><meshStandardMaterial color={SURFACE.fracture} /></mesh>
        <mesh position={[0, 1.4, 0.6]}><boxGeometry args={[0.04, 0.45, 1.2]} /><meshStandardMaterial color={SCENE.panel} metalness={0.3} roughness={0.2} /></mesh>
      </group>)}
      <mesh position={[0, 0.7, 0]}><boxGeometry args={[1.74, 0.18, 3.62]} /><meshStandardMaterial color={SCENE.dronePayload} /></mesh>
      <mesh position={[0, 0.42, -1.82]}><boxGeometry args={[1.8, 0.2, 0.14]} /><meshStandardMaterial color={SCENE.droneHub} /></mesh>
      {[-0.62, 0.62].map((x) => <mesh key={x} position={[x, 0.72, -1.82]}><boxGeometry args={[0.32, 0.14, 0.06]} /><meshStandardMaterial color={SURFACE.heat} emissive={SURFACE.heat} emissiveIntensity={0.3} /></mesh>)}
      <mesh position={[0, 1.3, 0.85]}><boxGeometry args={[1.15, 0.3, 0.7]} /><meshStandardMaterial color={SCENE.dronePayload} roughness={0.65} /></mesh>
      <group ref={wheels}>{[-0.9, 0.9].flatMap((x) => [-1.1, 1.1].map((z) => <group key={`${x}:${z}`} position={[x, 0.4, z]}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.4, 0.4, 0.2, 16]} /><meshStandardMaterial color={SCENE.droneLens} /></mesh>
        <mesh position={[Math.sign(x) * 0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.19, 0.19, 0.03, 12]} /><meshStandardMaterial color={SCENE.post} metalness={0.5} /></mesh>
        <mesh position={[Math.sign(x) * 0.14, 0, 0]}><boxGeometry args={[0.02, 0.32, 0.05]} /><meshStandardMaterial color={SCENE.droneHub} /></mesh>
      </group>))}</group>
    </group>
    {[0, 1].map((worker) => <Worker key={worker} run={run} worker={worker} />)}
    <group ref={replacement} visible={false}><mesh material={material}><boxGeometry args={[PANEL_W, 0.08, PANEL_H]} /></mesh></group>
  </>;
}

function Worker({ run, worker }: { run: RepairRun; worker: number }) {
  const body = useRef<Group>(null);
  const arms = useRef<Group>(null);
  const legs = useRef<Group>(null);
  useFrame(() => {
    const pose = crewWorkerAt(run, useSession.getState().siteSeconds, worker);
    if (body.current) {
      body.current.visible = pose.visible;
      body.current.position.set(pose.position.x, Math.abs(pose.stride) * 0.04, pose.position.z);
      body.current.rotation.y = pose.heading;
    }
    arms.current?.children.forEach((arm, i) => { arm.rotation.x = pose.reach || pose.stride * (i ? -1 : 1); });
    legs.current?.children.forEach((leg, i) => { leg.rotation.x = pose.stride * (i ? 1 : -1); });
  });
  return <group ref={body} visible={false}>
    <mesh position={[0, 1.1, 0]}><boxGeometry args={[0.42, 0.65, 0.3]} /><meshStandardMaterial color={SCENE.dronePayload} /></mesh>
    <mesh position={[0, 1.15, 0]}><boxGeometry args={[0.44, 0.1, 0.32]} /><meshStandardMaterial color={SURFACE.heat} /></mesh>
    <group ref={arms}>{[-0.28, 0.28].map((x) => <group key={x} position={[x, 1.4, 0]}>
      <mesh position={[0, -0.28, 0]}><boxGeometry args={[0.13, 0.56, 0.15]} /><meshStandardMaterial color={SCENE.dronePayload} /></mesh>
      <mesh position={[0, -0.56, 0]}><sphereGeometry args={[0.09, 8, 6]} /><meshStandardMaterial color={SCENE.footing} /></mesh>
    </group>)}</group>
    <mesh position={[0, 1.63, 0]}><sphereGeometry args={[0.18, 12, 10]} /><meshStandardMaterial color={SCENE.footing} /></mesh>
    <mesh position={[0, 1.78, 0]}><sphereGeometry args={[0.21, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={SCENE.dronePayload} /></mesh>
    <mesh position={[0, 1.77, 0]}><cylinderGeometry args={[0.25, 0.25, 0.04, 12]} /><meshStandardMaterial color={SCENE.dronePayload} /></mesh>
    <group ref={legs}>{[-0.12, 0.12].map((x) => <group key={x} position={[x, 0.78, 0]}>
      <mesh position={[0, -0.3, 0]}><boxGeometry args={[0.16, 0.6, 0.2]} /><meshStandardMaterial color={SCENE.droneHub} /></mesh>
      <mesh position={[0, -0.64, 0.06]}><boxGeometry args={[0.19, 0.12, 0.32]} /><meshStandardMaterial color={SCENE.droneLens} /></mesh>
    </group>)}</group>
  </group>;
}

export function RepairCrew() {
  const runs = useRepairRuns();
  const at = useSession((s) => s.siteSeconds);
  // Queued jobs share a crew, so only its current vehicle may occupy the scene.
  const visible = [...new Set(runs.map((r) => r.crew))].map((crew) => {
    const mine = runs.filter((r) => r.crew === crew).sort((a, b) => a.departedAt - b.departedAt);
    return mine.find((r) => at >= r.departedAt && at <= (r.returnedAt ?? r.completedAt))
      ?? mine.find((r) => at >= r.requestedAt && at < r.departedAt);
  }).filter((r): r is RepairRun => Boolean(r));
  return <>{visible.map((run) => <Crew key={`${run.panelId}:${run.orderAt}`} run={run} />)}</>;
}
