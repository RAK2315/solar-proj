'use client';

/**
 * CrackedPanel — the array the drone was sent to, rendered as unique meshes so it
 * can carry its defect.
 *
 * The crack is a deterministic branching polyline drawn into a canvas texture, not
 * a random walk: `Math.random()` is banned across src/ precisely so that what you
 * see is reproducible, and a crack that reshaped itself on reload would be the
 * clearest possible sign that the scene is decoration.
 *
 * Visible from target lock (t=34), per CLAUDE.md §14 — before the drone arrives
 * there is nothing to have seen.
 *
 * THE THREE-WAY SPLIT. This file draws three things and they are three different
 * kinds of claim. Confusing them is the most repeated bug in this project.
 *
 *   what is drawn                     | kind of claim             | gate
 *   ----------------------------------+---------------------------+---------------------
 *   the crack polyline                | a MECHANISM the site      | hasCrackMechanism()
 *                                     | record declares           | - many arrays
 *   heat on the cells that polyline   | the same MECHANISM,       | hasCrackMechanism()
 *   crosses                           | illustrated               | - many arrays
 *   heat on the measured row-2 band,  | a MEASUREMENT from a real | hasCapturedEvidence()
 *   and the darkening under it        | UAV thermal capture       | - B-17 AND NOBODY ELSE
 *
 * The line to hold is between rows two and three, and it is subtle: a non-B-17
 * array MAY show hot cells, but they are derived from the illustrated crack path
 * — never from `cellGrid.defects`. Reading `cellGrid.defects` for any array other
 * than B-17 is the bug, and it has now been found in six other places. That choice
 * is not made here: it is `hotCells` in src/lib/panelCells.ts, pure so that
 * panelCells.test.ts can assert each branch is what it claims to be.
 *
 * What keeps the illustrated heat honest is what surrounds it: the console's
 * AnomalyMatrix stays B-17-only, and the cinematic's detection label and
 * confidence stay gated on the cue. The 3D view is a rendering of the site model.
 * It is not captured imagery and must never be presented as such.
 *
 * WHY CELLS AND NOT THE WHOLE MODULE. This used to set `emissiveIntensity` on the
 * material, which is a whole-object property — a broken module glowed as one solid
 * rectangle. A real IR frame of a bypassed substring shows a hot BAND with the
 * busbars dark between the cells, because the cells are what dissipate and the
 * interconnects are not. The heat is now an emissive MAP drawn on the same 5x7
 * lattice as the surface texture, so the scalar only says how far into the thermal
 * pass we are and the map says where the heat is.
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Mesh, MeshStandardMaterial, Texture } from 'three';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, TextureLoader } from 'three';

import { cellGrid, hasCapturedEvidence, panelTexture } from '@/lib/data';
import { hasCrackMechanism } from '@/lib/live';
import { type HotCell, CRACK_POLYLINES, hotCells } from '@/lib/panelCells';
import {
  DAMAGED_INDEX, PANEL_H, PANEL_SPACING_X, PANEL_TILT, PANEL_W, PANELS_PER_ARRAY,
  POST_HEIGHT, arrayCentre, thermalAmount,
} from '@/lib/scene';
import { SCENE, SCENE_MATERIAL } from '@/lib/scenePalette';
import { flightCueNow, useFlightCue } from '@/store/flightCue';
import { useSession } from '@/store/session';

const TEX_W = 256;
const TEX_H = 160;

/**
 * PHOTOGRAPHED MODULES — two of them, as a test.
 *
 * The detector was trained on ground-level photographs of solar panels and this
 * scene renders a flat-shaded blue rectangle with a polyline drawn on it. Asked to
 * find a crack in that, the model returns nothing, which is the correct answer to
 * the question it was asked. So two modules of the inspected array carry an actual
 * photograph instead: the damaged one a photograph of a cracked panel, its
 * neighbour a photograph of an intact one.
 *
 * THIS IS A MATERIAL, NOT EVIDENCE, and the distinction is the one this project
 * gets wrong most often. Texturing a digital twin from photography is ordinary
 * practice; presenting the result as a camera frame would not be. `data.ts`
 * carries the provenance and the console prints it wherever the render is on
 * screen.
 *
 * THE CRACKED PHOTOGRAPH IS GATED EXACTLY WHERE THE DRAWN CRACK IS — on
 * `hasCrackMechanism`. Putting a photograph of broken glass on a module the site
 * record calls soiled would invent the defect, and would then invite the detector
 * to confirm it.
 *
 * NOT the frame the committed 0.9084 was measured on: `make_panel_textures.mts`
 * refuses that file by name. Scoring a render textured with the test image would
 * be teaching to the test.
 */
const CRACKED_PHOTO = panelTexture('cracked');
const INTACT_PHOTO = panelTexture('intact');

/** The neighbour that carries the intact photograph. */
const INTACT_INDEX = DAMAGED_INDEX + 1;

/** Loaded once per URL and shared. A Texture is a GPU resource, not state. */
const photoCache = new Map<string, Texture>();

/**
 * Load a photographic map, or render without one.
 *
 * Not `useLoader`/`useTexture`: both suspend, and this Canvas has no Suspense
 * boundary — a module that suspends after the flight has already started takes
 * the whole scene down mid-inspection. Absent resolves to the drawn texture, which
 * is what every module looked like before this existed.
 */
function usePhoto(url: string | null): Texture | null {
  const [tex, setTex] = useState<Texture | null>(() => (url ? photoCache.get(url) ?? null : null));

  useEffect(() => {
    if (!url) { setTex(null); return; }
    const cached = photoCache.get(url);
    if (cached) { setTex(cached); return; }

    let live = true;
    new TextureLoader().load(
      url,
      (loaded) => {
        // Without this the photograph is treated as linear and renders washed out
        // — and the whole point is that it looks like the photograph the model
        // was trained on.
        loaded.colorSpace = SRGBColorSpace;
        photoCache.set(url, loaded);
        if (live) setTex(loaded);
      },
      undefined,
      // The module falls back to the drawn texture, which is what it looked like
      // before this existed — but the console goes on saying the surface is a
      // photograph, so the failure must not be silent.
      () => console.error(`panel texture failed to load: ${url}`),
    );
    return () => { live = false; };
  }, [url]);

  return tex;
}

function newCanvas(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  return canvas.getContext('2d');
}

function toTexture(ctx: CanvasRenderingContext2D): CanvasTexture {
  const tex = new CanvasTexture(ctx.canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  return tex;
}

/** Busbar lines, on whichever canvas is being drawn. */
function strokeLattice(ctx: CanvasRenderingContext2D, cw: number, ch: number, style: string) {
  ctx.strokeStyle = style;
  ctx.lineWidth = 2;
  for (let c = 1; c < cellGrid.cols; c += 1) {
    ctx.beginPath(); ctx.moveTo(c * cw, 0); ctx.lineTo(c * cw, TEX_H); ctx.stroke();
  }
  for (let r = 1; r < cellGrid.rows; r += 1) {
    ctx.beginPath(); ctx.moveTo(0, r * ch); ctx.lineTo(TEX_W, r * ch); ctx.stroke();
  }
}

/** The crack, stroked from the single copy of the path in panelCells.ts. */
function strokeCrack(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
  ctx.lineCap = 'round';
  CRACK_POLYLINES.forEach((line, i) => {
    // The spur is thinner than the run it branches off, the way a fracture is.
    ctx.lineWidth = i === 0 ? 2.4 : 1.3;
    ctx.beginPath();
    ctx.moveTo(line[0][0] * cw, line[0][1] * ch);
    for (const [x, y] of line.slice(1)) ctx.lineTo(x * cw, y * ch);
    ctx.stroke();
  });
}

/**
 * Panel surface texture: cell lattice, the measured darkening, and the crack.
 * Deterministic — same pixels every run.
 */
function makePanelTexture(withCrack: boolean, measured: boolean): CanvasTexture | null {
  const ctx = newCanvas();
  if (!ctx) return null;

  ctx.fillStyle = SCENE.panel;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  const cw = TEX_W / cellGrid.cols;
  const ch = TEX_H / cellGrid.rows;
  strokeLattice(ctx, cw, ch, 'rgba(10,20,40,0.55)');

  if (withCrack) {
    // THE MEASURED CELLS ARE B-17'S AND NOBODY ELSE'S. A bypassed substring does
    // read darker in visible light, but WHICH cells is a measurement — it comes
    // from the thermal capture, and we hold one capture.
    if (measured) {
      ctx.fillStyle = 'rgba(6,12,26,0.45)';
      for (const d of cellGrid.defects) {
        ctx.fillRect((d.col - 1) * cw, (d.row - 1) * ch, cw, ch);
      }
    }

    ctx.strokeStyle = 'rgba(4,8,16,0.92)';
    strokeCrack(ctx, cw, ch);
  }

  return toTexture(ctx);
}

/**
 * Emissive map: black everywhere except the hot cells.
 *
 * Always returned, even for a healthy module, so the material's shader program
 * never has to be recompiled when the flight retargets from a cracked array to a
 * clean one. A black map costs a texture; a null map costs a stale program.
 */
function makeEmissiveTexture(hot: readonly HotCell[]): CanvasTexture | null {
  const ctx = newCanvas();
  if (!ctx) return null;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  const cw = TEX_W / cellGrid.cols;
  const ch = TEX_H / cellGrid.rows;
  // Inset by the busbar width, so the interconnects stay dark between lit cells.
  // That gap is the whole reason this is a map and not a scalar.
  const inset = 2;

  for (const cell of hot) {
    const x = (cell.col - 1) * cw + inset;
    const y = (cell.row - 1) * ch + inset;
    const w = cw - inset * 2;
    const h = ch - inset * 2;
    // Hotter in the middle of a cell than at its edge: a cell conducts into the
    // frame and its neighbours, so it cannot be uniformly hot right to the border.
    const grad = ctx.createRadialGradient(
      x + w / 2, y + h / 2, Math.min(w, h) * 0.12,
      x + w / 2, y + h / 2, Math.max(w, h) * 0.62,
    );
    const level = Math.round(255 * cell.weight);
    const edge = Math.round(level * 0.45);
    grad.addColorStop(0, `rgb(${level},${level},${level})`);
    grad.addColorStop(1, `rgb(${edge},${edge},${edge})`);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  }

  strokeLattice(ctx, cw, ch, '#000000');
  return toTexture(ctx);
}

/**
 * Peak emissive on a hot cell during the thermal pass.
 *
 * Higher than the 1.6 the whole module used to carry: a band of four cells has to
 * reach the top of the ironbow ramp on its own, where a fully lit rectangle did
 * not have to.
 */
const HOT_CELL_EMISSIVE = 2.4;

function Panel({ x, z, cracked, measured, photo }: {
  x: number; z: number; cracked: boolean; measured: boolean;
  /** A photographic surface for this module, or null for the drawn one. */
  photo: string | null;
}) {
  const ref = useRef<Mesh>(null);
  const drawn = useMemo(() => makePanelTexture(cracked, measured), [cracked, measured]);
  const photographed = usePhoto(photo);
  const texture = photographed ?? drawn;
  const emissiveMap = useMemo(
    () => makeEmissiveTexture(hotCells(cracked, measured)), [cracked, measured],
  );

  // A CanvasTexture is a GPU allocation. These are minted fresh whenever the
  // flight retargets to an array with a different crack or evidence status, and
  // nothing was releasing the pair they replaced.
  useEffect(() => () => { drawn?.dispose(); }, [drawn]);
  useEffect(() => () => { emissiveMap?.dispose(); }, [emissiveMap]);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    // Reads the clock, never writes it, never accumulates — the one legal use of
    // useFrame in this project (plan/02 §6).
    const cue = flightCueNow();
    const mat = mesh.material as MeshStandardMaterial;

    // The scalar says HOW FAR INTO the thermal pass we are; the emissive map says
    // WHERE the heat is. Only a module the site record calls cracked warms at all
    // — flying the same camera move over a SOILED array must not make it glow, or
    // the picture is evidence of a defect that array does not have.
    const heat = cracked ? thermalAmount(cue.t) : 0;
    mat.emissiveIntensity = heat * HOT_CELL_EMISSIVE;
    // Always in the world. The crack is a property of the array, not of the camera
    // — it does not appear because we flew there and it does not vanish because we
    // flew somewhere else.
    mesh.visible = true;
  });

  return (
    <mesh ref={ref} position={[x, POST_HEIGHT, z]} rotation={[PANEL_TILT, 0, 0]}>
      <boxGeometry args={[PANEL_W, 0.05, PANEL_H]} />
      {/* A photographed module drops the glass-like metalness the drawn panels
          carry. The specular sheen is there to make a flat blue rectangle read as
          glass; on a photograph it only darkens and mirrors the albedo that is the
          entire reason the photograph is there. */}
      <meshStandardMaterial
        map={texture}
        color={texture ? '#ffffff' : SCENE.panel}
        metalness={photographed ? 0.05 : SCENE_MATERIAL.panelMetalness}
        roughness={photographed ? 0.65 : SCENE_MATERIAL.panelRoughness}
        emissive={SCENE.hotBand}
        emissiveMap={emissiveMap}
        emissiveIntensity={0}
      />
    </mesh>
  );
}

/**
 * Which module carries a photograph.
 *
 * Two, and only two, while this is being looked at: the damaged one and the
 * neighbour beside it, so the difference between a photographed defect and a
 * photographed healthy module is visible in the same frame.
 */
function photoFor(index: number, cracked: boolean): string | null {
  if (cracked && index === DAMAGED_INDEX) return CRACKED_PHOTO?.url ?? null;
  if (index === INTACT_INDEX) return INTACT_PHOTO?.url ?? null;
  return null;
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
  // Only B-17. See the table at the top of this file.
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
          photo={photoFor(i, cracked)}
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
