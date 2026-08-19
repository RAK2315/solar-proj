'use client';

/**
 * PanelField — 480 panels and 480 posts, as two instanced meshes.
 *
 * INSTANCES ONLY. 480 separate <mesh> elements would be 960 draw calls and would
 * miss 60fps on integrated graphics by a wide margin; two instanced meshes are two
 * draw calls. The hard cap is 600 (CLAUDE.md §14) and the layout comes out of
 * farm.json, so the field on screen is the same site the map draws.
 *
 * THE INSPECTED ARRAY is excluded here and rendered separately by CrackedPanel,
 * because it needs a unique material carrying the crack decal. Which array that is
 * follows the flight — it used to be B-17 forever, so dispatching anywhere else
 * drew the unique meshes on top of the instanced ones and left the array the camera
 * was actually looking at pristine.
 */

import { SCENE, SCENE_MATERIAL } from '@/lib/scenePalette';
import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';

import {
  PANEL_H, PANEL_TILT, PANEL_W, POST_HEIGHT, panelInstances,
} from '@/lib/scene';
import { useFlightCue } from '@/store/flightCue';

export function PanelField() {
  const targetId = useFlightCue().targetId;
  const panels = useMemo(
    () => panelInstances().filter((p) => !p.id.startsWith(`${targetId}-`)),
    [targetId],
  );

  return (
    <>
      <Instances limit={600} range={panels.length} frustumCulled={false}>
        <boxGeometry args={[PANEL_W, 0.05, PANEL_H]} />
        <meshStandardMaterial color={SCENE.panel} metalness={SCENE_MATERIAL.panelMetalness}
          roughness={SCENE_MATERIAL.panelRoughness} />
        {panels.map((p) => (
          <Instance
            key={p.id}
            position={[p.pos.x, p.pos.y, p.pos.z]}
            rotation={[PANEL_TILT, 0, 0]}
          />
        ))}
      </Instances>

      <Instances limit={600} range={panels.length} frustumCulled={false}>
        <cylinderGeometry args={[0.05, 0.05, POST_HEIGHT, 6]} />
        <meshStandardMaterial color={SCENE.post} metalness={SCENE_MATERIAL.postMetalness}
          roughness={SCENE_MATERIAL.postRoughness} />
        {panels.map((p) => (
          <Instance key={p.id} position={[p.pos.x, POST_HEIGHT / 2, p.pos.z]} />
        ))}
      </Instances>
    </>
  );
}
