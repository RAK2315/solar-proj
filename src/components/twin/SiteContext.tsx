'use client';

import { Line } from '@react-three/drei';
import { useLayoutEffect, useRef } from 'react';
import { Object3D, type InstancedMesh } from 'three';
import { ARRAY_WIDTH, SITE_ZONES } from '@/lib/siteLayout';
import { M, PAD, PANEL_H, arrayCentre, droneAt } from '@/lib/scene';
import { SITE } from '@/lib/scenePalette';
import { useFlightCue } from '@/store/flightCue';

const WEST = SITE_ZONES[0].minX - 15;
const EAST = SITE_ZONES[0].maxX + 15;
const NORTH = SITE_ZONES[0].minZ - 10;
const SOUTH = SITE_ZONES.at(-1)!.maxZ + 14;
const PERIMETER: [number, number, number][] = [[WEST, 1.2, NORTH], [EAST, 1.2, NORTH], [EAST, 1.2, SOUTH], [WEST, 1.2, SOUTH], [WEST, 1.2, NORTH]];
const FENCE_POSTS = PERIMETER.slice(0, -1).flatMap((from, side) => {
  const to = PERIMETER[side + 1];
  const count = Math.ceil(Math.hypot(to[0] - from[0], to[2] - from[2]) / 10);
  return Array.from({ length: count }, (_, i) => [from[0] + (to[0] - from[0]) * i / count, 0.65, from[2] + (to[2] - from[2]) * i / count]);
});

function Fence({ dark }: { dark: boolean }) {
  const posts = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = posts.current;
    if (!mesh) return;
    const o = new Object3D();
    FENCE_POSTS.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);
  return <>
    <Line points={PERIMETER} color={dark ? SITE.nightBoundary : SITE.boundary} lineWidth={1} />
    <instancedMesh ref={posts} args={[undefined, undefined, FENCE_POSTS.length]} raycast={() => null}>
      <boxGeometry args={[0.15, 1.3, 0.15]} />
      <meshStandardMaterial color={SITE.steel} roughness={0.8} />
    </instancedMesh>
  </>;
}

function Footprint({ id, hover = false }: { id: string; hover?: boolean }) {
  const p = arrayCentre(id);
  const w = ARRAY_WIDTH / 2 + 0.7;
  const h = PANEL_H / 2 + 0.7;
  return <Line points={[[p.x - w, 0.2, p.z - h], [p.x + w, 0.2, p.z - h], [p.x + w, 0.2, p.z + h], [p.x - w, 0.2, p.z + h], [p.x - w, 0.2, p.z - h]]} color={hover ? SITE.hover : SITE.selection} lineWidth={hover ? 1.5 : 2.5} />;
}

export function SiteContext({ dark, selected, hovered, flight = false }: { dark: boolean; selected: string | null; hovered: string | null; flight?: boolean }) {
  const cue = useFlightCue();
  const boundary = dark ? SITE.nightBoundary : SITE.boundary;
  return <group>
    <Fence dark={dark} />
    {SITE_ZONES.map((zone) => <group key={zone.id}>
      <Line points={[[zone.minX, 0.08, zone.minZ], [zone.maxX, 0.08, zone.minZ], [zone.maxX, 0.08, zone.maxZ], [zone.minX, 0.08, zone.maxZ], [zone.minX, 0.08, zone.minZ]]} color={boundary} lineWidth={1} dashed dashSize={1.5} gapSize={1} />
      <mesh position={[zone.x, 0.025, zone.maxZ + 5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[zone.maxX - zone.minX + 18, 4]} />
        <meshStandardMaterial color={dark ? SITE.nightLane : SITE.lane} roughness={1} />
      </mesh>
      <mesh position={[zone.minX - 5, 0.8, zone.z]}>
        <boxGeometry args={[2.4, 1.6, 2]} />
        <meshStandardMaterial color={SITE.steel} metalness={0.3} roughness={0.8} />
      </mesh>
    </group>)}
    <mesh position={[SITE_ZONES[0].minX - 10, 0.03, SITE_ZONES[1].z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4, SITE_ZONES.at(-1)!.maxZ - SITE_ZONES[0].minZ + 24]} />
      <meshStandardMaterial color={dark ? SITE.nightLane : SITE.lane} roughness={1} />
    </mesh>
    <mesh position={[PAD.x, 0.035, PAD.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[6, 32]} />
      <meshStandardMaterial color={SITE.pad} roughness={0.9} />
    </mesh>
    <Line points={[[PAD.x - 2, 0.08, PAD.z - 2], [PAD.x - 2, 0.08, PAD.z + 2], [PAD.x - 2, 0.08, PAD.z], [PAD.x + 2, 0.08, PAD.z], [PAD.x + 2, 0.08, PAD.z - 2], [PAD.x + 2, 0.08, PAD.z + 2]]} color={SITE.hover} lineWidth={2} />
    {!flight && selected && <Footprint id={selected} />}
    {!flight && hovered && hovered !== selected && <Footprint id={hovered} hover />}
    {!flight && cue.active && <Line points={Array.from({ length: 64 }, (_, i) => {
      const p = droneAt(M.dispatch + (M.recommendation - M.dispatch) * i / 63, cue.target);
      return [p.x, p.y, p.z] as [number, number, number];
    })} color={SITE.selection} lineWidth={1.5} dashed dashSize={2} gapSize={1} />}
  </group>;
}
