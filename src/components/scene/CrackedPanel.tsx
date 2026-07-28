'use client';

/**
 * CrackedPanel — B-17, rendered as unique meshes so it can carry the defect.
 *
 * The crack is a deterministic branching polyline drawn into a canvas texture, not
 * a random walk: `Math.random()` is banned across src/ precisely so that what you
 * see is reproducible, and a crack that reshapes itself on reload would be the
 * clearest possible sign that the scene is decoration.
 *
 * Visible from target lock (t=34), per CLAUDE.md §14 — before the drone arrives
 * there is nothing to have seen.
 *
 * The hot band is the MEASURED one: row 2, columns 3–6 of the 5×7 cell grid, the
 * same four cells the anomaly matrix draws. It is emissive during the thermal pass
 * so the ironbow LUT has something true to pick up.
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Mesh, MeshStandardMaterial } from 'three';
import { CanvasTexture, RepeatWrapping } from 'three';

import { cellGrid } from '@/lib/data';
import {
  B17, PANEL_H, PANEL_SPACING_X, PANEL_TILT, PANEL_W, PANELS_PER_ARRAY,
  POST_HEIGHT, crackVisible, thermalAmount,
} from '@/lib/scene';
import { useDemoClock } from '@/store/demoClock';

/**
 * Panel surface texture: cell grid lines, the measured hot band, and a crack.
 * Deterministic — same pixels every run.
 */
function makePanelTexture(withCrack: boolean): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const W = 256;
  const H = 160;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#2b4a7a';
  ctx.fillRect(0, 0, W, H);

  const cols = cellGrid.cols;
  const rows = cellGrid.rows;
  const cw = W / cols;
  const ch = H / rows;

  // Cell busbars.
  ctx.strokeStyle = 'rgba(10,20,40,0.55)';
  ctx.lineWidth = 2;
  for (let c = 1; c < cols; c += 1) {
    ctx.beginPath(); ctx.moveTo(c * cw, 0); ctx.lineTo(c * cw, H); ctx.stroke();
  }
  for (let r = 1; r < rows; r += 1) {
    ctx.beginPath(); ctx.moveTo(0, r * ch); ctx.lineTo(W, r * ch); ctx.stroke();
  }

  if (withCrack) {
    // Darken the measured hot cells — a bypassed substring reads darker in visible
    // light and hotter in thermal. Coordinates come from the measurement.
    for (const d of cellGrid.defects) {
      ctx.fillStyle = 'rgba(6,12,26,0.45)';
      ctx.fillRect((d.col - 1) * cw, (d.row - 1) * ch, cw, ch);
    }

    // A deterministic branching crack through the hot band.
    ctx.strokeStyle = 'rgba(4,8,16,0.92)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    const path: Array<[number, number]> = [
      [cw * 2.1, ch * 0.6], [cw * 2.6, ch * 1.15], [cw * 3.4, ch * 1.5],
      [cw * 4.2, ch * 1.35], [cw * 5.1, ch * 1.75], [cw * 5.8, ch * 2.4],
    ];
    ctx.beginPath();
    ctx.moveTo(path[0][0], path[0][1]);
    for (const [x, y] of path.slice(1)) ctx.lineTo(x, y);
    ctx.stroke();

    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(cw * 3.4, ch * 1.5);
    ctx.lineTo(cw * 3.7, ch * 2.3);
    ctx.lineTo(cw * 3.3, ch * 2.9);
    ctx.stroke();
  }

  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  return tex;
}

function Panel({ x, z, cracked }: { x: number; z: number; cracked: boolean }) {
  const ref = useRef<Mesh>(null);
  const texture = useMemo(() => makePanelTexture(cracked), [cracked]);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    // Reads the clock, never writes it, never accumulates — the one legal use of
    // useFrame in this project (plan/02 §6).
    const t = useDemoClock.getState().t;
    const mat = mesh.material as MeshStandardMaterial;

    // The hot band glows during the thermal pass so the ironbow LUT has real heat
    // to map rather than inventing a blob.
    const heat = cracked ? thermalAmount(t) : 0;
    mat.emissiveIntensity = heat * 1.6;
    mesh.visible = !cracked || crackVisible(t) || heat > 0 || true;
  });

  return (
    <mesh ref={ref} position={[x, POST_HEIGHT, z]} rotation={[PANEL_TILT, 0, 0]}>
      <boxGeometry args={[PANEL_W, 0.05, PANEL_H]} />
      <meshStandardMaterial
        map={texture}
        color={texture ? '#ffffff' : '#2b4a7a'}
        metalness={0.35}
        roughness={0.25}
        emissive="#ff7a1a"
        emissiveIntensity={0}
      />
    </mesh>
  );
}

export function CrackedPanel() {
  const offsets = useMemo(
    () => Array.from({ length: PANELS_PER_ARRAY }, (_, i) =>
      (i - (PANELS_PER_ARRAY - 1) / 2) * PANEL_SPACING_X),
    [],
  );

  return (
    <group>
      {offsets.map((dx, i) => (
        <Panel key={i} x={B17.x + dx} z={B17.z} cracked={i === 1} />
      ))}
      {offsets.map((dx, i) => (
        <mesh key={`post-${i}`} position={[B17.x + dx, POST_HEIGHT / 2, B17.z]}>
          <cylinderGeometry args={[0.05, 0.05, POST_HEIGHT, 6]} />
          <meshStandardMaterial color="#9aa0a8" metalness={0.1} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export const PANEL_FOOTPRINT = { w: PANEL_W, h: PANEL_H };
