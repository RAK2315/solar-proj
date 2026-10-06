'use client';

/**
 * Twin: the site in 3D, and the main view of the console.
 *
 * The scene components are the ones the cinematic was built from. What changed is
 * that there is no second view to cut to: the same canvas holds the whole field at
 * rest and follows a drone when one is sent.
 *
 * Budget, from plan/rework/09-risks.md R2: instanced meshes only, dpr capped at
 * 1.5, no shadow maps. The post-process pass is mounted only while a flight is
 * being followed, because a full-screen pass costs frames every frame it exists.
 */

import { Canvas } from '@react-three/fiber';
import type { ReactNode, RefObject } from 'react';

import { CrackedPanel } from '@/components/scene/CrackedPanel';
import { Drone } from '@/components/scene/Drone';
import { SceneEnvironment } from '@/components/scene/Environment';
import { ThermalPass } from '@/components/scene/ThermalPass';
import { TWIN, TWIN_LIGHT } from '@/lib/scenePalette';
import { TWIN_FOV } from '@/lib/twinCamera';
import { flightCueNow } from '@/store/flightCue';
import { useFollowingFlight } from '@/store/selectors';
import { useSession } from '@/store/session';
import { Field } from './Field';
import { TwinCamera } from './TwinCamera';
import { Watchdog } from './Watchdog';

/* The ground plan/rework/06-design-system.md §7 describes. The daylit desert is
   kept for the light theme, where a near-black field would fight the panels. */
function DarkEnvironment() {
  return (
    <>
      <color attach="background" args={[TWIN.void]} />
      <fog attach="fog" args={[TWIN.void, TWIN_LIGHT.fogNear, TWIN_LIGHT.fogFar]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[700, 700]} />
        <meshStandardMaterial color={TWIN.ground} roughness={1} metalness={0} />
      </mesh>
      <directionalLight position={[-120, 70, 90]} intensity={TWIN_LIGHT.key} color={TWIN.keyLight} />
      <hemisphereLight args={[TWIN.skyFill, TWIN.void, TWIN_LIGHT.hemisphere]} />
    </>
  );
}

/** The daylit scene's own fog is tuned for a camera a few metres up. */
const DAY_FOG: [number, number] = [150, 430];

export default function Twin({ overlay, watchdog, children }: {
  overlay: RefObject<HTMLDivElement | null>;
  /** Off only when a harness needs the 3D view on a software renderer. */
  watchdog: boolean;
  children?: ReactNode;
}) {
  const theme = useSession((s) => s.theme);
  const following = useFollowingFlight();

  return (
    <Canvas
      dpr={[1, 1.5]}
      shadows={false}
      /* The live detector reads a frame back off this canvas, and without a
         preserved buffer WebGL may clear it first and return a blank image. */
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      camera={{ fov: TWIN_FOV, near: 0.5, far: 600, position: [0, 84, 122] }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {theme === 'light' ? <SceneEnvironment fog={DAY_FOG} /> : <DarkEnvironment />}
      <Field dark={theme !== 'light'} />
      <group onClick={(e) => {
        e.stopPropagation();
        useSession.getState().selectPanel(flightCueNow().targetId);
      }}
      >
        <CrackedPanel />
      </group>
      <Drone />
      {children}
      <TwinCamera overlay={overlay} />
      {following && <ThermalPass />}
      {watchdog && <Watchdog />}
    </Canvas>
  );
}
