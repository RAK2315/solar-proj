'use client';

/**
 * Drone: a quadrotor built from primitives, not a glTF.
 *
 * No asset to fetch, nothing to fail on a bad network, nothing to license. It is
 * an X-frame: a slim body, two crossed arms, a motor pod and a two-blade prop at
 * each end, an orange payload block on top, a gimbal ball under the nose, skids,
 * and nav lights on the pods.
 *
 * Position comes from droneAt(t): SAMPLED, never integrated, so seeking puts it
 * exactly where it belongs on the first frame.
 *
 * THE PROPS ARE THE ONE EXCEPTION in the whole project: they free-spin on render
 * delta, not on site time. That is legal precisely because nothing reads them:
 * no selector, no test, no overlay. Anything a selector reads must come from
 * site time.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh } from 'three';

import { droneAt, droneVisible, type Vec3 } from '@/lib/scene';
import { SCENE } from '@/lib/scenePalette';
import { flightCueNow } from '@/store/flightCue';

/** Motor centre to body centre, along each axis. */
const ARM = 0.55;
const ARM_LENGTH = Math.hypot(ARM, ARM) * 2;
const PROP_RADIUS = 0.42;
const POD_HEIGHT = 0.16;
const SKID_DROP = 0.24;

/** [x, z, spin]. Diagonal props turn the same way, as on a real airframe. */
const ROTORS: Array<[number, number, number]> = [
  [ARM, ARM, 1], [-ARM, ARM, -1], [ARM, -ARM, -1], [-ARM, -ARM, 1],
];

/** Where one aircraft is this frame, and where it will be a moment later. */
export interface DroneSample { p: Vec3; ahead: Vec3; visible: boolean }

const AHEAD = 0.25;

/** The mission's own aircraft, read off the flight cue. */
function missionSample(): DroneSample {
  const cue = flightCueNow();
  return {
    p: droneAt(cue.t, cue.target),
    ahead: droneAt(cue.t + AHEAD, cue.target),
    // Hidden while the camera is riding it, or we would be looking at the
    // inside of its own shell.
    visible: droneVisible(cue.t),
  };
}

function Frame() {
  return (
    <>
      <mesh>
        <boxGeometry args={[0.42, 0.15, 0.86]} />
        <meshStandardMaterial color={SCENE.droneBody} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* The nose, narrower than the body so the aircraft has a front. */}
      <mesh position={[0, -0.01, 0.5]}>
        <boxGeometry args={[0.28, 0.11, 0.2]} />
        <meshStandardMaterial color={SCENE.droneBody} metalness={0.4} roughness={0.5} />
      </mesh>

      {[Math.PI / 4, -Math.PI / 4].map((yaw) => (
        <mesh key={yaw} rotation={[0, yaw, 0]}>
          <boxGeometry args={[0.08, 0.055, ARM_LENGTH]} />
          <meshStandardMaterial color={SCENE.droneHub} metalness={0.5} roughness={0.45} />
        </mesh>
      ))}

      {/* The one warm accent. */}
      <mesh position={[0, 0.13, -0.04]}>
        <boxGeometry args={[0.34, 0.12, 0.46]} />
        <meshStandardMaterial color={SCENE.dronePayload} metalness={0.2} roughness={0.6} />
      </mesh>

      {/* Gimbal ball under the nose, and the lens looking down at the array. */}
      <mesh position={[0, -0.17, 0.36]}>
        <sphereGeometry args={[0.13, 14, 10]} />
        <meshStandardMaterial color={SCENE.droneLens} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.27, 0.4]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.08, 10]} />
        <meshStandardMaterial color={SCENE.droneBody} metalness={0.7} roughness={0.2} />
      </mesh>

      {[-0.24, 0.24].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, -SKID_DROP, 0]}>
            <boxGeometry args={[0.035, 0.035, 0.8]} />
            <meshStandardMaterial color={SCENE.droneHub} metalness={0.3} roughness={0.6} />
          </mesh>
          {[-0.26, 0.26].map((z) => (
            <mesh key={z} position={[0, -SKID_DROP / 2, z]}>
              <boxGeometry args={[0.03, SKID_DROP, 0.03]} />
              <meshStandardMaterial color={SCENE.droneHub} metalness={0.3} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

export function Drone({ sample = missionSample, scale = 1 }: {
  /** Defaults to the dispatched mission. The landing page flies its own loops. */
  sample?: () => DroneSample;
  scale?: number;
}) {
  const group = useRef<Group>(null);
  const props = useRef<Array<Group | null>>([]);
  const shadow = useRef<Mesh>(null);

  useFrame((_, delta) => {
    const { p, ahead, visible } = sample();

    if (group.current) {
      group.current.visible = visible;
      group.current.position.set(p.x, p.y, p.z);
      // Bank into the direction of travel, by differencing two samples of a pure
      // function. Still no accumulated state.
      const dx = ahead.x - p.x;
      const dz = ahead.z - p.z;
      const speed = Math.hypot(dx, dz);
      group.current.rotation.y = speed > 0.001 ? Math.atan2(dx, dz) : 0;
      group.current.rotation.x = Math.min(speed * 0.18, 0.28);
    }

    // The blob shadow tracks the ground point and fades with altitude. It stays
    // when the aircraft is hidden: from its own camera you still see it below.
    if (shadow.current) {
      shadow.current.position.set(p.x, 0.03, p.z);
      const s = Math.max(0.5, 2.4 - p.y * 0.045);
      shadow.current.scale.set(s, s, s);
      (shadow.current.material as { opacity: number }).opacity =
        Math.max(0.05, 0.34 - p.y * 0.006);
    }

    // Presentational only. See the note above.
    props.current.forEach((r, i) => { if (r) r.rotation.y += delta * 42 * ROTORS[i][2]; });
  });

  return (
    <>
      <group ref={group} scale={scale}>
        <Frame />

        {ROTORS.map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.085, 0.1, POD_HEIGHT, 10]} />
              <meshStandardMaterial color={SCENE.droneBody} metalness={0.5} roughness={0.4} />
            </mesh>
            <group ref={(el) => { props.current[i] = el; }} position={[0, POD_HEIGHT / 2 + 0.06, 0]}>
              <mesh>
                <boxGeometry args={[PROP_RADIUS * 2, 0.012, 0.07]} />
                <meshStandardMaterial color={SCENE.droneRotor} metalness={0.1} roughness={0.9} />
              </mesh>
              {/* The blur a spinning prop leaves, so it reads as turning in a still. */}
              <mesh>
                <cylinderGeometry args={[PROP_RADIUS, PROP_RADIUS, 0.006, 20]} />
                <meshStandardMaterial
                  color={SCENE.droneRotor} transparent opacity={0.16} depthWrite={false}
                  metalness={0.1} roughness={0.9}
                />
              </mesh>
            </group>
            {/* Nav lights under the pods: red to port, green to starboard. */}
            <mesh position={[0, -0.07, 0]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial color={x > 0 ? SCENE.navStarboard : SCENE.navPort} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>

      {/* The only shadow in the scene. */}
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 16]} />
        <meshBasicMaterial color={SCENE.shadow} transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </>
  );
}
