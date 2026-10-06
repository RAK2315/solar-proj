'use client';

/**
 * Field: all 120 arrays as instanced meshes, and the live status laid over them.
 *
 * Three draw calls: the lit modules, their posts, and one unlit plate per module
 * of every array that is not healthy. The plates carry per-instance colour, so an
 * array changing status rewrites a few matrices and never touches React's tree.
 *
 * The array a drone is inspecting is left out and drawn by CrackedPanel, which
 * needs unique meshes to carry its defect.
 */

import type { ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type InstancedMesh } from 'three';

import {
  PANEL_H, PANEL_TILT, PANEL_W, POST_HEIGHT, panelInstances,
} from '@/lib/scene';
import { SCENE, SCENE_MATERIAL, TWIN } from '@/lib/scenePalette';
import { flightCueAt } from '@/store/flightCue';
import { useArrayTints, useFlightTargetId } from '@/store/selectors';
import { useSession } from '@/store/session';

const ALL = panelInstances();
const CAPACITY = ALL.length;
const arrayOf = (moduleId: string) => moduleId.slice(0, moduleId.lastIndexOf('-'));

const TINT = {
  warning: TWIN.warning, critical: TWIN.critical, scheduled: TWIN.scheduled, affected: TWIN.affected,
} as const;

/** How far a plate floats off the glass, along the module's own normal. */
const PLATE_LIFT = 0.07;
const LIFT_Y = Math.cos(PANEL_TILT) * PLATE_LIFT;
const LIFT_Z = Math.sin(PANEL_TILT) * PLATE_LIFT;

export function Field({ dark }: { dark: boolean }) {
  // CrackedPanel draws this array even at rest, so it is excluded even at rest.
  const drawnApart = useSession(
    (s) => flightCueAt(s.siteSeconds, s.missions).targetId,
  );
  const inspecting = useFlightTargetId();
  const tints = useArrayTints();

  const modules = useMemo(
    () => ALL.filter((p) => arrayOf(p.id) !== drawnApart),
    [drawnApart],
  );

  const glass = useRef<InstancedMesh>(null);
  const posts = useRef<InstancedMesh>(null);
  const plates = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const o = new Object3D();
    modules.forEach((p, i) => {
      o.position.set(p.pos.x, p.pos.y, p.pos.z);
      o.rotation.set(PANEL_TILT, 0, 0);
      o.updateMatrix();
      glass.current?.setMatrixAt(i, o.matrix);

      o.position.set(p.pos.x, POST_HEIGHT / 2, p.pos.z);
      o.rotation.set(0, 0, 0);
      o.updateMatrix();
      posts.current?.setMatrixAt(i, o.matrix);
    });
    for (const mesh of [glass.current, posts.current]) {
      if (!mesh) continue;
      mesh.count = modules.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [modules]);

  useLayoutEffect(() => {
    const mesh = plates.current;
    if (!mesh) return;
    const o = new Object3D();
    const c = new Color();
    let n = 0;
    for (const p of ALL) {
      const id = arrayOf(p.id);
      const tint = tints.get(id);
      // The camera is about to be a few metres from this array, looking for a
      // crack. A flat plate over it would hide the thing the drone was sent for.
      if (!tint || id === inspecting) continue;
      o.position.set(p.pos.x, p.pos.y + LIFT_Y, p.pos.z + LIFT_Z);
      o.rotation.set(PANEL_TILT, 0, 0);
      o.updateMatrix();
      mesh.setMatrixAt(n, o.matrix);
      mesh.setColorAt(n, c.set(TINT[tint]));
      n += 1;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [tints, inspecting]);

  const select = (e: ThreeEvent<MouseEvent>) => {
    if (e.instanceId === undefined) return;
    e.stopPropagation();
    // A click while a hazard is held is the drop, not a selection.
    if (useSession.getState().armedHazard) return;
    useSession.getState().selectPanel(arrayOf(modules[e.instanceId].id));
  };

  return (
    <>
      <instancedMesh
        ref={glass}
        args={[undefined, undefined, CAPACITY]}
        frustumCulled={false}
        onClick={select}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = ''; }}
      >
        <boxGeometry args={[PANEL_W, 0.05, PANEL_H]} />
        <meshStandardMaterial
          color={dark ? TWIN.panel : SCENE.panel}
          metalness={dark ? TWIN.panelMetalness : SCENE_MATERIAL.panelMetalness}
          roughness={SCENE_MATERIAL.panelRoughness}
        />
      </instancedMesh>

      <instancedMesh ref={posts} args={[undefined, undefined, CAPACITY]} frustumCulled={false} raycast={() => null}>
        <cylinderGeometry args={[0.05, 0.05, POST_HEIGHT, 6]} />
        <meshStandardMaterial
          color={SCENE.post}
          metalness={SCENE_MATERIAL.postMetalness}
          roughness={SCENE_MATERIAL.postRoughness}
        />
      </instancedMesh>

      <instancedMesh ref={plates} args={[undefined, undefined, CAPACITY]} frustumCulled={false} raycast={() => null}>
        <boxGeometry args={[PANEL_W, 0.02, PANEL_H]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  );
}
