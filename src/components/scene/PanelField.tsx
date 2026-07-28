'use client';

/**
 * PanelField — 480 panels and 480 posts, as two instanced meshes.
 *
 * INSTANCES ONLY. 480 separate <mesh> elements would be 960 draw calls and would
 * miss 60fps on integrated graphics by a wide margin; two instanced meshes are two
 * draw calls. The hard cap is 600 (CLAUDE.md §14) and the layout comes out of
 * farm.json, so the field on screen is the same site the map draws.
 *
 * B-17 is excluded here and rendered separately by CrackedPanel, because it needs a
 * unique material carrying the crack decal.
 */

import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';

import {
  FAULTED_ARRAY_ID, PANEL_H, PANEL_TILT, PANEL_W, POST_HEIGHT, panelInstances,
} from '@/lib/scene';

export function PanelField() {
  const panels = useMemo(
    () => panelInstances().filter((p) => !p.id.startsWith(`${FAULTED_ARRAY_ID}-`)),
    [],
  );

  return (
    <>
      <Instances limit={600} range={panels.length} frustumCulled={false}>
        <boxGeometry args={[PANEL_W, 0.05, PANEL_H]} />
        <meshStandardMaterial color="#2b4a7a" metalness={0.35} roughness={0.25} />
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
        <meshStandardMaterial color="#9aa0a8" metalness={0.1} roughness={0.8} />
        {panels.map((p) => (
          <Instance key={p.id} position={[p.pos.x, POST_HEIGHT / 2, p.pos.z]} />
        ))}
      </Instances>
    </>
  );
}
