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

import { cellGrid, hasCapturedEvidence } from '@/lib/data';
import { hasCrackMechanism } from '@/lib/live';
import {
  DAMAGED_INDEX, PANEL_H, PANEL_SPACING_X, PANEL_TILT, PANEL_W, PANELS_PER_ARRAY,
  POST_HEIGHT, arrayCentre, thermalAmount,
} from '@/lib/scene';
import { SCENE, SCENE_MATERIAL } from '@/lib/scenePalette';
import { flightCueNow, useFlightCue } from '@/store/flightCue';
import { useSession } from '@/store/session';

/**
 * Panel surface texture: cell grid lines, the measured hot band, and a crack.
 * Deterministic — same pixels every run.
 */
function makePanelTexture(withCrack: boolean, measured: boolean): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const W = 256;
  const H = 160;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = SCENE.panel;
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
    // THE MEASURED CELLS ARE B-17'S AND NOBODY ELSE'S. A bypassed substring does
    // read darker in visible light, but WHICH cells is a measurement — it comes
    // from the thermal capture, and we hold one capture. Drawing this band on C-07
    // because C-07 is also cracked would be painting B-17's evidence onto another
    // array, which is the most repeated bug in this project.
    if (measured) {
      for (const d of cellGrid.defects) {
        ctx.fillStyle = 'rgba(6,12,26,0.45)';
        ctx.fillRect((d.col - 1) * cw, (d.row - 1) * ch, cw, ch);
      }
    }

    // The crack itself is an illustration of a MECHANISM the site record declares
    // for this array, not a measurement of where the fracture runs. Deterministic,
    // so the same array looks the same every run.
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

function Panel({ x, z, cracked, measured }: {
  x: number; z: number; cracked: boolean; measured: boolean;
}) {
  const ref = useRef<Mesh>(null);
  const texture = useMemo(() => makePanelTexture(cracked, measured), [cracked, measured]);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    // Reads the clock, never writes it, never accumulates — the one legal use of
    // useFrame in this project (plan/02 §6).
    const cue = flightCueNow();
    const mat = mesh.material as MeshStandardMaterial;

    // The panel warms during the thermal pass so the ironbow LUT has real heat to
    // map rather than inventing a blob — and ONLY on a module the site record says
    // is cracked. Flying the same camera move over a SOILED array must not make it
    // glow, or the picture is evidence of a defect that array does not have.
    //
    // This is whole-material emissive, not a placed band: reverse-bias heating on a
    // bypassed substring is physics that applies to any cracked array, whereas the
    // BAND'S POSITION is a measurement and stays in the texture, gated separately.
    const heat = cracked ? thermalAmount(cue.t) : 0;
    mat.emissiveIntensity = heat * 1.6;
    // Always in the world. The crack is a property of B-17, not of the camera —
    // it does not appear because we flew there and it does not vanish because we
    // flew somewhere else.
    mesh.visible = true;
  });

  return (
    <mesh ref={ref} position={[x, POST_HEIGHT, z]} rotation={[PANEL_TILT, 0, 0]}>
      <boxGeometry args={[PANEL_W, 0.05, PANEL_H]} />
      <meshStandardMaterial
        map={texture}
        color={texture ? '#ffffff' : SCENE.panel}
        metalness={SCENE_MATERIAL.panelMetalness}
        roughness={SCENE_MATERIAL.panelRoughness}
        emissive={SCENE.hotBand}
        emissiveIntensity={0}
      />
    </mesh>
  );
}

export function CrackedPanel() {
  // WHICH ARRAY THIS IS. It used to be hard-anchored to B-17, so an operator who
  // dispatched to C-07 — an array the scenario declares as "advanced crack
  // propagation, six strings bypassed" — flew to a pristine blue panel with a
  // reticle over it reading −56.6 %. The defect was still in the world, several
  // hundred metres away in zone B, out of frame.
  //
  // The unique-material array now follows the flight, so the module the camera is
  // framing is the module the site record describes.
  const cue = useFlightCue();
  const injected = useSession((s) => s.injected);
  const targetId = cue.targetId;

  const base = useMemo(() => arrayCentre(targetId), [targetId]);
  const cracked = hasCrackMechanism(targetId, injected);
  // Only B-17. See makePanelTexture.
  const measured = hasCapturedEvidence(targetId);

  const offsets = useMemo(
    () => Array.from({ length: PANELS_PER_ARRAY }, (_, i) =>
      (i - (PANELS_PER_ARRAY - 1) / 2) * PANEL_SPACING_X),
    [],
  );

  return (
    <group>
      {offsets.map((dx, i) => (
        <Panel
          key={i}
          x={base.x + dx}
          z={base.z}
          cracked={cracked && i === DAMAGED_INDEX}
          measured={measured}
        />
      ))}
      {offsets.map((dx, i) => (
        <mesh key={`post-${i}`} position={[base.x + dx, POST_HEIGHT / 2, base.z]}>
          <cylinderGeometry args={[0.05, 0.05, POST_HEIGHT, 6]} />
          <meshStandardMaterial color={SCENE.post} metalness={SCENE_MATERIAL.postMetalness}
            roughness={SCENE_MATERIAL.postRoughness} />
        </mesh>
      ))}
    </group>
  );
}
