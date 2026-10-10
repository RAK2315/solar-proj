'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Object3D, type InstancedMesh, type MeshBasicMaterial } from 'three';

import { cellGrid, hasCapturedEvidence } from '@/lib/data';
import { hotCells } from '@/lib/panelCells';
import { panelSurfaceMesh, panelPoint } from '@/lib/panelSurface';
import {
  DAMAGED_INDEX, PANEL_H, PANEL_TILT, PANEL_W, PANELS_PER_ARRAY,
  POST_HEIGHT, arrayCentre, moduleOffsetX, thermalAmount,
} from '@/lib/scene';
import { SCENE, SCENE_MATERIAL, SURFACE } from '@/lib/scenePalette';
import { flightCueNow, useFlightCue } from '@/store/flightCue';
import { useHasCrackMechanism } from '@/store/selectors';
import { panelMaterial } from './panelMaterial';

function geometry(positions: number[]): BufferGeometry {
  const mesh = new BufferGeometry();
  mesh.setAttribute('position', new Float32BufferAttribute(positions, 3));
  mesh.computeVertexNormals();
  return mesh;
}

function HeatCells({ cracked, measured }: { cracked: boolean; measured: boolean }) {
  const ref = useRef<InstancedMesh>(null);
  const cells = useMemo(() => hotCells(cracked, measured), [cracked, measured]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const transform = new Object3D();
    cells.forEach((cell, i) => {
      const [x, z] = panelPoint(cell.col - 0.5, cell.row - 0.5);
      transform.position.set(x, 0.0355, z);
      transform.rotation.set(-Math.PI / 2, 0, 0);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
      mesh.setColorAt(i, new Color(SURFACE.heat).multiplyScalar(cell.weight));
    });
    mesh.count = cells.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [cells]);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const amount = thermalAmount(flightCueNow().t);
    mesh.visible = cracked && amount > 0;
    (mesh.material as MeshBasicMaterial).opacity = amount;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cellGrid.rows * cellGrid.cols]} visible={false}>
      <planeGeometry args={[PANEL_W / cellGrid.cols * 0.92, PANEL_H / cellGrid.rows * 0.9]} />
      <meshBasicMaterial
        transparent opacity={0} depthWrite={false} toneMapped={false}
        onBeforeCompile={(shader) => {
          shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec2 heatUv;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nheatUv = uv;');
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying vec2 heatUv;')
            .replace('#include <opaque_fragment>', `
              vec2 distanceToCentre = abs(heatUv - 0.5) * 2.0;
              float falloff = 1.0 - smoothstep(0.15, 1.0, length(distanceToCentre * 0.8));
              diffuseColor.a *= mix(0.55, 1.0, falloff);
              #include <opaque_fragment>
            `);
        }}
      />
    </instancedMesh>
  );
}

function Panel({ x, z, cracked, measured, dark }: {
  x: number; z: number; cracked: boolean; measured: boolean; dark: boolean;
}) {
  const material = useMemo(() => panelMaterial(dark), [dark]);
  const glass = useMemo(() => {
    const mesh = panelSurfaceMesh(cracked, measured);
    return { faces: geometry(mesh.faces), bevels: geometry(mesh.bevels), recesses: geometry(mesh.recesses), splinters: geometry(mesh.splinters) };
  }, [cracked, measured]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => { glass.faces.dispose(); glass.bevels.dispose(); glass.recesses.dispose(); glass.splinters.dispose(); }, [glass]);

  return (
    <group position={[x, POST_HEIGHT, z]} rotation={[PANEL_TILT, 0, 0]}>
      <mesh material={material}>
        <boxGeometry args={[PANEL_W, 0.07, PANEL_H]} />
      </mesh>
      <mesh geometry={glass.faces}>
        <meshStandardMaterial color={SURFACE.glass} transparent opacity={0.12} metalness={0.15} roughness={0.18} depthWrite={false} />
      </mesh>
      {cracked && (
        <>
          <mesh geometry={glass.splinters}>
            <meshStandardMaterial color={SURFACE.fracture} metalness={0.18} roughness={0.4} side={DoubleSide} />
          </mesh>
          <mesh geometry={glass.bevels}>
            <meshStandardMaterial color={SURFACE.fracture} metalness={0.18} roughness={0.4} side={DoubleSide} />
          </mesh>
          <mesh geometry={glass.recesses}>
            <meshBasicMaterial color={SCENE.droneLens} side={DoubleSide} toneMapped={false} />
          </mesh>
        </>
      )}
      <HeatCells cracked={cracked} measured={measured} />
    </group>
  );
}

/**
 * Only the inspected row needs individual surface geometry; the rest stays
 * instanced. The detector still reads rendered RGB pixels, never these meshes.
 */
export function CrackedPanel({ dark = false }: { dark?: boolean }) {
  const cue = useFlightCue();
  const cracked = useHasCrackMechanism(cue.targetId);
  const base = useMemo(() => arrayCentre(cue.targetId), [cue.targetId]);
  const measured = hasCapturedEvidence(cue.targetId);
  const offsets = useMemo(() => Array.from({ length: PANELS_PER_ARRAY }, (_, i) => moduleOffsetX(i)), []);

  return (
    <group>
      {offsets.map((dx, i) => (
        <Panel key={i} x={base.x + dx} z={base.z} dark={dark}
          cracked={cracked && i === DAMAGED_INDEX} measured={measured} />
      ))}
      {offsets.map((dx, i) => (
        <mesh key={`post-${i}`} position={[base.x + dx, POST_HEIGHT / 2, base.z]}>
          <cylinderGeometry args={[0.05, 0.05, POST_HEIGHT, 6]} />
          <meshStandardMaterial color={SCENE.post} metalness={SCENE_MATERIAL.postMetalness}
            roughness={SCENE_MATERIAL.postRoughness} />
        </mesh>
      ))}
    </group>
  );
}
