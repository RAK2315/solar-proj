'use client';

/**
 * Drone — low-poly quadrotor, built from primitives rather than a glTF.
 *
 * No asset to fetch, nothing to fail on a bad network, nothing to license. At the
 * distances the camera holds it, a fetched model would not read differently.
 *
 * Position comes from droneAt(t) — SAMPLED, never integrated, so seeking puts it
 * exactly where it belongs on the first frame.
 *
 * THE ROTORS ARE THE ONE EXCEPTION in the whole project: they free-spin on render
 * delta rather than on `t`. That is legal precisely because nothing reads them —
 * no selector, no test, no overlay. Anything a selector reads must come from `t`.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh } from 'three';

import { droneAt, droneVisible } from '@/lib/scene';
import { useDemoClock } from '@/store/demoClock';

const ARM = 0.55;
const ROTORS: Array<[number, number]> = [
  [ARM, ARM], [-ARM, ARM], [ARM, -ARM], [-ARM, -ARM],
];

export function Drone() {
  const group = useRef<Group>(null);
  const rotors = useRef<Array<Mesh | null>>([]);
  const shadow = useRef<Mesh>(null);

  useFrame((_, delta) => {
    const t = useDemoClock.getState().t;
    const p = droneAt(t);

    if (group.current) {
      // Hidden while the camera is riding it — otherwise we would be looking at
      // the inside of its own shell.
      group.current.visible = droneVisible(t);
      group.current.position.set(p.x, p.y, p.z);
      // Bank into the direction of travel. Sampled by differencing two samples of
      // a pure function — still no accumulated state.
      const ahead = droneAt(t + 0.25);
      const dx = ahead.x - p.x;
      const dz = ahead.z - p.z;
      const speed = Math.hypot(dx, dz);
      group.current.rotation.y = speed > 0.001 ? Math.atan2(dx, dz) : 0;
      group.current.rotation.x = Math.min(speed * 0.18, 0.28);
    }

    // Blob shadow tracks the ground point and fades with altitude.
    if (shadow.current) {
      // The shadow stays: from the aircraft's own camera you still see it on the
      // ground below, which is a detail that reads as real.
      shadow.current.position.set(p.x, 0.03, p.z);
      const s = Math.max(0.5, 2.4 - p.y * 0.045);
      shadow.current.scale.set(s, s, s);
      (shadow.current.material as { opacity: number }).opacity =
        Math.max(0.05, 0.34 - p.y * 0.006);
    }

    // Presentational only. See the note above.
    for (const r of rotors.current) if (r) r.rotation.y += delta * 42;
  });

  return (
    <>
      <group ref={group}>
        <mesh castShadow={false}>
          <boxGeometry args={[0.75, 0.16, 1.15]} />
          <meshStandardMaterial color="#1b1f26" metalness={0.4} roughness={0.5} />
        </mesh>

        {/* Orange payload block — the one warm accent, matching the reference. */}
        <mesh position={[0, 0.14, 0.05]}>
          <boxGeometry args={[0.42, 0.14, 0.5]} />
          <meshStandardMaterial color="#e2701f" metalness={0.2} roughness={0.6} />
        </mesh>

        {/* Gimbal camera, pointing down at the array. */}
        <mesh position={[0, -0.16, 0.34]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.2, 10]} />
          <meshStandardMaterial color="#0d1015" metalness={0.6} roughness={0.3} />
        </mesh>

        {ROTORS.map(([x, z], i) => (
          <group key={i} position={[x, 0.06, z]}>
            <mesh>
              <cylinderGeometry args={[0.09, 0.09, 0.12, 8]} />
              <meshStandardMaterial color="#2a2f38" metalness={0.4} roughness={0.5} />
            </mesh>
            <mesh
              ref={(el) => { rotors.current[i] = el; }}
              position={[0, 0.1, 0]}
            >
              <cylinderGeometry args={[0.46, 0.46, 0.012, 12]} />
              <meshStandardMaterial
                color="#0e1219" transparent opacity={0.32} metalness={0.1} roughness={0.9}
              />
            </mesh>
          </group>
        ))}

        {/* Nav lights: green starboard, red port. */}
        <mesh position={[ARM, 0.02, -ARM]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#2ef08a" />
        </mesh>
        <mesh position={[-ARM, 0.02, -ARM]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#ff3b30" />
        </mesh>
      </group>

      {/* The only shadow in the scene — CLAUDE.md §14 allows exactly this one. */}
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </>
  );
}
