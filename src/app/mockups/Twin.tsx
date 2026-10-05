'use client';

/**
 * THROWAWAY. The twin behind the four mockups.
 *
 * It composes the real scene components untouched: same field, materials, lights,
 * post-process and canvas settings as SolarFarmScene, so the frame cost measured
 * here is the frame cost the rework inherits. Only the camera is local, because
 * the real CameraRig parks behind the drone pad until a mission flies.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { Vector3 } from 'three';

import { CrackedPanel } from '@/components/scene/CrackedPanel';
import { Drone } from '@/components/scene/Drone';
import { SceneEnvironment } from '@/components/scene/Environment';
import { PanelField } from '@/components/scene/PanelField';
import { ThermalPass } from '@/components/scene/ThermalPass';
import {
  PANEL_H, PANEL_SPACING_X, PANEL_TILT, PANEL_W, PANELS_PER_ARRAY, POST_HEIGHT, arrayCentre,
} from '@/lib/scene';
import { useSiteFrame } from '@/store/selectors';
import { useSession } from '@/store/session';

export type Ground = 'day' | 'dark';

/* The settled ramp from 06-design-system.md §3. three.js cannot read CSS variables. */
const TINT: Record<string, string> = {
  warning: '#f08b2a',
  critical: '#d94a3d',
  scheduled: '#3fd4b8',
};
const VOID = '#070a0f';

const LOOK = new Vector3(0, 0, 38);
const HEIGHT = 84;
const BACK = 84;
const SWAY_RAD = 0.3;
/** Site seconds per full sway. At the site's 60x that is 30 s of wall time. */
const SWAY_PERIOD = 1800;

/* Derived from site time, not from a clock of its own, so it pauses and seeks with
   everything else. */
function TwinCamera() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    const s = useSession.getState().siteSeconds;
    const a = Math.sin((s / SWAY_PERIOD) * Math.PI * 2) * SWAY_RAD;
    // A docked layout gives the twin a narrow box. Pull back so the field's
    // width still fits, since the lens is fixed vertically.
    const k = Math.max(1, 1.5 / (size.width / size.height));
    camera.position.set(LOOK.x + Math.sin(a) * BACK * k, HEIGHT * k, LOOK.z + Math.cos(a) * BACK * k);
    camera.lookAt(LOOK);
  });
  return null;
}

const ARRAY_W = (PANELS_PER_ARRAY - 1) * PANEL_SPACING_X + PANEL_W;

/* PanelField draws every array in one colour. This lays the live status over the
   arrays that are not healthy, which is what the rework's twin will do natively. */
function StatusTints() {
  const frame = useSiteFrame();
  const key = Object.entries(frame.panels)
    .filter(([, r]) => r.status !== 'healthy')
    .map(([id, r]) => `${id}:${r.status}`)
    .join('|');
  const flagged = useMemo(
    () => (key ? key.split('|') : []).map((pair) => {
      const [id, status] = pair.split(':');
      return { id, status, pos: arrayCentre(id) };
    }),
    [key],
  );

  return (
    <>
      {flagged.map((f) => (
        <mesh key={f.id} position={[f.pos.x, POST_HEIGHT + 0.14, f.pos.z]} rotation={[PANEL_TILT, 0, 0]}>
          <boxGeometry args={[ARRAY_W, 0.04, PANEL_H]} />
          <meshBasicMaterial color={TINT[f.status] ?? TINT.warning} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

/* Writes projected array positions straight to the DOM overlay. No React state, so
   nothing re-renders per frame. */
function Anchors() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const root = document;

    const project = (id: string): [number, number] => {
      const p = arrayCentre(id);
      v.set(p.x, POST_HEIGHT, p.z).project(camera);
      return [(v.x * 0.5 + 0.5) * size.width, (-v.y * 0.5 + 0.5) * size.height];
    };

    root.querySelectorAll<HTMLElement>('[data-anchor]').forEach((el) => {
      const [x, y] = project(el.dataset.anchor ?? '');
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    });

    root.querySelectorAll<SVGLineElement>('line[data-to]').forEach((line) => {
      const src = document.getElementById(line.dataset.from ?? '');
      if (!src) return;
      const r = src.getBoundingClientRect();
      const [x, y] = project(line.dataset.to ?? '');
      // Start from the point on the source's own box nearest the array, so the
      // same rule serves a side column and a row beneath the field.
      line.setAttribute('x1', Math.min(Math.max(x, r.left - 8), r.right + 8).toFixed(1));
      line.setAttribute('y1', Math.min(Math.max(y, r.top), r.bottom).toFixed(1));
      line.setAttribute('x2', x.toFixed(1));
      line.setAttribute('y2', y.toFixed(1));
    });
  });
  return null;
}

/* The ground 06-design-system.md §7 describes: near-black, arrays desaturated blue.
   The real scene is a daylit desert; both are offered because a panel treatment
   reads very differently over each. */
function DarkEnvironment() {
  return (
    <>
      <color attach="background" args={[VOID]} />
      <fog attach="fog" args={[VOID, 120, 330]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[700, 700]} />
        <meshStandardMaterial color="#0b1018" roughness={1} metalness={0} />
      </mesh>
      <directionalLight position={[-120, 70, 90]} intensity={2.6} color="#b9c9e6" />
      <hemisphereLight args={['#8fb0d9', VOID, 1.2]} />
    </>
  );
}

export default function Twin({ ground }: { ground: Ground }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      shadows={false}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      camera={{ fov: 58, near: 0.5, far: 600, position: [0, HEIGHT, LOOK.z + BACK] }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {ground === 'day' ? <SceneEnvironment /> : <DarkEnvironment />}
      <PanelField />
      <CrackedPanel />
      <Drone />
      <StatusTints />
      <TwinCamera />
      <Anchors />
      <ThermalPass />
    </Canvas>
  );
}
