'use client';

/**
 * HazardLayer: the footprints of the hazards in force, drawn over the field.
 *
 * A dashed ring and a faint haze at each one, sitting just above the modules so
 * they read from any pitch. Positions come from the session: this draws state,
 * it does not hold any.
 */

import { Line } from '@react-three/drei';
import { useMemo } from 'react';

import { POST_HEIGHT } from '@/lib/scene';
import { TWIN } from '@/lib/scenePalette';
import { useFootprints, type FootprintMark } from '@/store/selectors';

const SEGMENTS = 72;
/** Clear of the modules' top edge, so the ring is not cut by the rows under it. */
const HEIGHT = POST_HEIGHT + 1.4;

function Footprint({ mark }: { mark: FootprintMark }) {
  const ring = useMemo(
    () => Array.from({ length: SEGMENTS + 1 }, (_, i) => {
      const a = (i / SEGMENTS) * Math.PI * 2;
      return [Math.cos(a) * mark.radius, 0, Math.sin(a) * mark.radius] as [number, number, number];
    }),
    [mark.radius],
  );
  const colour = TWIN[mark.kind];

  return (
    <group position={[mark.x, HEIGHT, mark.z]}>
      <Line points={ring} color={colour} lineWidth={1.6} dashed dashSize={3.2} gapSize={2.2} toneMapped={false} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <circleGeometry args={[mark.radius, 48]} />
        <meshBasicMaterial
          color={colour} transparent opacity={mark.draft ? 0.22 : 0.13}
          depthWrite={false} toneMapped={false}
        />
      </mesh>
      {/* The core, where the hazard is at full strength. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} raycast={() => null}>
        <circleGeometry args={[mark.radius / 2, 40]} />
        <meshBasicMaterial color={colour} transparent opacity={0.1} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function HazardLayer() {
  const marks = useFootprints();
  return <>{marks.map((m) => <Footprint key={m.id} mark={m} />)}</>;
}
