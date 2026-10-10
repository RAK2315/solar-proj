'use client';

/**
 * Field: all 120 arrays as instanced meshes, and the live status laid over them.
 *
 * Five draw calls: the lit modules, the rail each one is bolted to, its post and
 * the post's footing, and one unlit plate per module of every array that is not
 * healthy. The plates carry per-instance colour, so an array changing status
 * rewrites a few matrices and never touches React's tree.
 *
 * The stand is drawn because without it the field read as flat strips lying on
 * the ground: a 5 cm post is under a pixel from the resting camera. It is still
 * instanced, one matrix per module per part.
 *
 * The array a drone is inspecting is left out and drawn by CrackedPanel, which
 * needs unique meshes to carry its defect.
 */

import type { ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type InstancedMesh } from 'three';

import { panelMaterial } from '@/components/scene/panelMaterial';

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

/** The stand. Sized to be seen from the field camera, not to a datasheet. */
const POST_RADIUS = 0.1;
const FOOT_RADIUS = 0.26;
const FOOT_HEIGHT = 0.12;
const RAIL_DEPTH = 0.12;
/** The rail sits against the underside of the glass, along the module's width. */
const RAIL_DROP = 0.09;
const MODULE_THICKNESS = 0.07;

/** How far a plate floats off the glass, along the module's own normal. */
const PLATE_LIFT = 0.07;
const LIFT_Y = Math.cos(PANEL_TILT) * PLATE_LIFT;
const LIFT_Z = Math.sin(PANEL_TILT) * PLATE_LIFT;

export function Field({ dark, interactive = true, onHover }: {
  dark: boolean;
  /** False on the landing page: every array drawn here, and nothing to click. */
  interactive?: boolean;
  onHover?: (id: string | null) => void;
}) {
  // CrackedPanel draws this array even at rest, so it is excluded even at rest.
  const drawnApart = useSession(
    (s) => flightCueAt(s.siteSeconds, s.missions).targetId,
  );
  const inspecting = useFlightTargetId();
  const tints = useArrayTints();

  const modules = useMemo(
    () => (interactive ? ALL.filter((p) => arrayOf(p.id) !== drawnApart) : ALL),
    [drawnApart, interactive],
  );

  const glass = useRef<InstancedMesh>(null);
  const posts = useRef<InstancedMesh>(null);
  const rails = useRef<InstancedMesh>(null);
  const feet = useRef<InstancedMesh>(null);
  const shades = useRef<InstancedMesh>(null);
  const plates = useRef<InstancedMesh>(null);
  const material = useMemo(() => panelMaterial(dark), [dark]);
  useLayoutEffect(() => () => material.dispose(), [material]);

  useLayoutEffect(() => {
    const o = new Object3D();
    modules.forEach((p, i) => {
      o.position.set(p.pos.x, p.pos.y, p.pos.z);
      o.rotation.set(PANEL_TILT, 0, 0);
      o.updateMatrix();
      glass.current?.setMatrixAt(i, o.matrix);

      o.position.set(p.pos.x, p.pos.y - Math.cos(PANEL_TILT) * RAIL_DROP, p.pos.z - Math.sin(PANEL_TILT) * RAIL_DROP);
      o.updateMatrix();
      rails.current?.setMatrixAt(i, o.matrix);

      o.position.set(p.pos.x, POST_HEIGHT / 2, p.pos.z);
      o.rotation.set(0, 0, 0);
      o.updateMatrix();
      posts.current?.setMatrixAt(i, o.matrix);

      o.position.set(p.pos.x, FOOT_HEIGHT / 2, p.pos.z);
      o.updateMatrix();
      feet.current?.setMatrixAt(i, o.matrix);
      o.position.set(p.pos.x, 0.02, p.pos.z);
      o.rotation.set(-Math.PI / 2, 0, 0);
      o.updateMatrix();
      shades.current?.setMatrixAt(i, o.matrix);
    });
    for (const mesh of [glass.current, posts.current, rails.current, feet.current, shades.current]) {
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
      {/* Contact tint grounds the stands without a shadow pass. */}
      <instancedMesh ref={shades} args={[undefined, undefined, CAPACITY]} frustumCulled={false} raycast={() => null}>
        <planeGeometry args={[PANEL_W, PANEL_H * 1.5]} />
        <meshBasicMaterial color={TWIN.void} transparent opacity={0.12} depthWrite={false} />
      </instancedMesh>
      <instancedMesh
        ref={glass}
        material={material}
        args={[undefined, undefined, CAPACITY]}
        frustumCulled={false}
        onClick={interactive ? select : undefined}
        onPointerMove={interactive ? (e) => {
          if (e.instanceId === undefined || useSession.getState().armedHazard) return;
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          onHover?.(arrayOf(modules[e.instanceId].id));
        } : undefined}
        onPointerOut={interactive ? () => { document.body.style.cursor = ''; onHover?.(null); } : undefined}
        raycast={interactive ? undefined : () => null}
      >
        <boxGeometry args={[PANEL_W, MODULE_THICKNESS, PANEL_H]} />
      </instancedMesh>

      <instancedMesh ref={posts} args={[undefined, undefined, CAPACITY]} frustumCulled={false} raycast={() => null}>
        <cylinderGeometry args={[POST_RADIUS, POST_RADIUS, POST_HEIGHT, 8]} />
        <meshStandardMaterial
          color={dark ? TWIN.post : SCENE.post}
          metalness={SCENE_MATERIAL.postMetalness}
          roughness={SCENE_MATERIAL.postRoughness}
        />
      </instancedMesh>

      <instancedMesh ref={rails} args={[undefined, undefined, CAPACITY]} frustumCulled={false} raycast={() => null}>
        <boxGeometry args={[PANEL_W * 0.94, RAIL_DEPTH, RAIL_DEPTH]} />
        <meshStandardMaterial
          color={dark ? TWIN.post : SCENE.post}
          metalness={SCENE_MATERIAL.postMetalness}
          roughness={SCENE_MATERIAL.postRoughness}
        />
      </instancedMesh>

      <instancedMesh ref={feet} args={[undefined, undefined, CAPACITY]} frustumCulled={false} raycast={() => null}>
        <cylinderGeometry args={[FOOT_RADIUS, FOOT_RADIUS, FOOT_HEIGHT, 8]} />
        <meshStandardMaterial
          color={dark ? TWIN.footing : SCENE.footing}
          metalness={0}
          roughness={SCENE_MATERIAL.groundRoughness}
        />
      </instancedMesh>

      <instancedMesh ref={plates} args={[undefined, undefined, CAPACITY]} frustumCulled={false} raycast={() => null}>
        <boxGeometry args={[PANEL_W, 0.02, PANEL_H]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  );
}
