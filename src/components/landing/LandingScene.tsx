'use client';

/**
 * LandingScene: the site behind the headline.
 *
 * The same field, modules and aircraft the console's twin draws, with a camera
 * that circles the block and two drones flying inspection loops. It is the same
 * site, read through the same selectors: an array that is critical in the
 * console is critical here.
 *
 * The motion runs off the one clock. Site time is divided by its own rate to get
 * elapsed real seconds, so the page moves at the same pace whatever speed the
 * console was left at, and stands still if the site was paused.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3 } from 'three';

import { Drone } from '@/components/scene/Drone';
import { SceneEnvironment } from '@/components/scene/Environment';
import { Field } from '@/components/twin/Field';
import { DarkEnvironment } from '@/components/twin/Twin';
import { LANDING_DRONES, STILL_SECONDS, landingCameraAt, landingDroneAt } from '@/lib/landing';
import { useSession } from '@/store/session';

/** Elapsed real seconds, from the site clock. */
const seconds = () => {
  const s = useSession.getState();
  return s.siteSeconds / Math.max(1, s.timeScale);
};

const DAY_FOG: [number, number] = [110, 380];
const AHEAD_SECONDS = 0.25;

function Camera({ still }: { still: boolean }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const look = useRef(new Vector3());

  useFrame(() => {
    const c = landingCameraAt(still ? STILL_SECONDS : seconds(), size.width / size.height);
    camera.position.set(c.pos.x, c.pos.y, c.pos.z);
    look.current.set(c.look.x, c.look.y, c.look.z);
    camera.lookAt(look.current);
  });
  return null;
}

export default function LandingScene({ still }: { still: boolean }) {
  const theme = useSession((s) => s.theme);
  return (
    <Canvas
      dpr={[1, 1.5]}
      shadows={false}
      // A still frame is one frame. Rendering it sixty times a second would
      // defeat the point of asking for no motion.
      frameloop={still ? 'demand' : 'always'}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 50, near: 0.5, far: 600, position: [0, 30, 112] }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {theme === 'light' ? <SceneEnvironment fog={DAY_FOG} /> : <DarkEnvironment />}
      <Field dark={theme !== 'light'} interactive={false} />
      {Array.from({ length: LANDING_DRONES }, (_, i) => (
        <Drone
          key={i}
          scale={2.2}
          sample={() => {
            const t = still ? STILL_SECONDS : seconds();
            return { p: landingDroneAt(t, i), ahead: landingDroneAt(t + AHEAD_SECONDS, i), visible: true };
          }}
        />
      ))}
      <Camera still={still} />
    </Canvas>
  );
}
