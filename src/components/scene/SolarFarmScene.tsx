'use client';

/**
 * SolarFarmScene — the R3F root that replaces the video plate.
 *
 * This is the ONLY thing Phase 8 changed about the cinematic: CinematicBackground
 * renders this instead of a <video>. The mission log, timecode, status pill, PiP
 * and reticle above it are untouched and do not know which is underneath. That is
 * what the seam was for.
 *
 * Performance, per CLAUDE.md §14:
 *   · instanced meshes only, hard cap 600
 *   · dpr [1, 1.5] — never render at 2× on a 4K panel
 *   · no shadow maps; the drone gets one blob and nothing else casts
 *   · the field drops to 0.75 dpr during the thermal pass, which is both faster
 *     and more truthful, since a thermal sensor is lower-resolution
 */

import { Canvas } from '@react-three/fiber';

import { CameraRig } from './CameraRig';
import { CrackedPanel } from './CrackedPanel';
import { Drone } from './Drone';
import { SceneEnvironment } from './Environment';
import { PanelField } from './PanelField';
import { ThermalPass } from './ThermalPass';

export default function SolarFarmScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      shadows={false}
      /* `preserveDrawingBuffer` so the drone's camera frame can actually be READ
         back. Without it WebGL is free to clear the buffer after compositing and
         `toDataURL` returns a blank image — which is the whole capture, silently
         empty. It costs a little performance and buys the one thing the live
         detector needs: a real frame from the real scene. */
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      }}
      camera={{ fov: 65, near: 0.5, far: 600, position: [-70, 8, 90] }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <SceneEnvironment />
      <PanelField />
      <CrackedPanel />
      <Drone />
      <CameraRig />
      <ThermalPass />
    </Canvas>
  );
}
