/**
 * THE PHASE 8 ACCEPTANCE TEST — the half that does not need a GPU.
 *
 * The camera and the drone are pure functions of `t`, so the two claims that
 * actually matter can be checked without a WebGL context:
 *
 *   1. the camera hits the five marks in CLAUDE.md §14
 *   2. SEEKING BACKWARDS WORKS — sampling t twice gives identical output, which is
 *      only true because nothing integrates
 *
 * Frame rate is the one thing left for the browser.
 */

import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';

import { farm } from './data';
import { hasCrackMechanism } from './live';
import {
  ARRAY_SPACING_Z, ASPECT, CRUISE_ALT, DAMAGED_INDEX, DAMAGED_MODULE, INSPECT_ALT,
  LABEL_GROUND_OFFSET_Z, M, ORBIT_DEG_PER_SEC, ORBIT_RADIUS, PANELS_PER_ARRAY,
  PANEL_H, PANEL_TILT, PAD, POV_IN, arrayCentre, arrayPosition, cameraAt,
  crackVisible, droneAt, droneVisible, inspectionTarget, isPOV, labelAnchor,
  moduleOffsetX, panelInstances, projectToScreen, reticleRect, thermalAmount,
  visibleLabels,
} from './scene';

const dist = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);

describe('the panel field comes out of farm.json', () => {
  const panels = panelInstances();

  it('renders 120 arrays × 4 panels and stays under the 600 instance cap', () => {
    expect(panels).toHaveLength(120 * PANELS_PER_ARRAY);
    expect(panels.length).toBeLessThanOrEqual(600);
  });

  it('marks exactly one array as faulted', () => {
    const faulted = panels.filter((p) => p.faulted);
    expect(faulted).toHaveLength(PANELS_PER_ARRAY);
    expect(faulted.every((p) => p.id.startsWith('B-17-'))).toBe(true);
  });

  it('places every panel above ground, on its post', () => {
    expect(panels.every((p) => p.pos.y > 0)).toBe(true);
  });

  it('lays out 3 zones × 5 rows as 15 distinct rows, well separated', () => {
    const rows = [...new Set(panels.map((p) => p.pos.z))].sort((a, b) => a - b);
    expect(rows).toHaveLength(15);
    // Three clusters of five: the gap between zones is much larger than between rows.
    const gaps = rows.slice(1).map((z, i) => z - rows[i]);
    const zoneGaps = gaps.filter((g) => g > 10);
    expect(zoneGaps).toHaveLength(2);
  });

  it('puts 8 columns across, matching farm.json', () => {
    const cols = new Set(panels.map((p) => Math.round(p.pos.x / 1.6)));
    expect(cols.size).toBeGreaterThanOrEqual(8);
  });
});

describe('the drone flies the mission', () => {
  it('sits on the pad before dispatch', () => {
    expect(dist(droneAt(0), PAD)).toBeLessThan(0.01);
    expect(droneAt(0).y).toBeLessThan(1);
  });

  it('climbs to cruise by the end of launch', () => {
    expect(droneAt(M.transit).y).toBeCloseTo(CRUISE_ALT, 1);
  });

  it('arrives over the DAMAGED MODULE, not the array centre', () => {
    // The module sits one panel-width off centre. Flying to the array centre and
    // calling it the target is exactly the sloppiness the ID tags exist to expose.
    expect(dist(droneAt(M.lock), DAMAGED_MODULE)).toBeLessThan(0.5);
    expect(droneAt(M.lock).y).toBeCloseTo(INSPECT_ALT, 0);
  });

  it('holds station on the module through the whole inspection', () => {
    for (const t of [36, 42, 48, 54]) {
      const d = dist(droneAt(t), DAMAGED_MODULE);
      expect(d, `drifted at t=${t}`).toBeLessThanOrEqual(ORBIT_RADIUS + 0.1);
    }
  });

  it('returns toward the pad after the evidence is in', () => {
    expect(dist(droneAt(M.recommendation), PAD)).toBeLessThan(0.5);
  });

  it('moves monotonically toward the target during transit', () => {
    let previous = dist(droneAt(M.transit), DAMAGED_MODULE);
    for (let t = M.transit + 0.5; t <= M.lock; t += 0.5) {
      const d = dist(droneAt(t), DAMAGED_MODULE);
      expect(d).toBeLessThanOrEqual(previous + 1e-6);
      previous = d;
    }
  });
});

describe('the camera hits the five marks in CLAUDE.md §14', () => {
  it('launch: low, behind the drone, wide 65°', () => {
    const c = cameraAt(M.dispatch + 0.5);
    expect(c.fov).toBe(65);
    expect(c.pos.y).toBeLessThan(12);
  });

  it('transit: RIDES THE DRONE, narrowing from 65°', () => {
    const c = cameraAt(28);
    expect(c.fov).toBeGreaterThan(50);
    expect(c.fov).toBeLessThanOrEqual(65);
    // POV: the eye is at the aircraft, a gimbal's drop below it.
    expect(dist(c.pos, droneAt(28))).toBeLessThan(0.01);
  });

  it('approach: still POV, narrowing onto the module, reaching 45°', () => {
    expect(cameraAt(M.lock).fov).toBeCloseTo(52, 0);
    expect(cameraAt(M.rgb).fov).toBeCloseTo(45, 0);
    expect(dist(cameraAt(M.rgb).look, DAMAGED_MODULE)).toBeLessThan(0.01);
  });

  it('inspect: near-nadir from the aircraft, holding 45° on the module', () => {
    for (const t of [42, 48, 54]) {
      const c = cameraAt(t);
      expect(c.fov).toBe(45);
      expect(dist(c.pos, droneAt(t))).toBeLessThan(0.01);   // riding it
      expect(c.pos.y).toBeGreaterThan(5);                    // still above the panels
      expect(dist(c.look, DAMAGED_MODULE)).toBeLessThan(0.01);
    }
  });

  it('inspect: orbits the module at 15°/s, sampled from t rather than spun', () => {
    // The DRONE flies the orbit and the camera rides it, so the §14 camera move
    // and the flight path are now the same thing.
    const later = droneAt(M.rgb + 8);
    const angle = (8 * ORBIT_DEG_PER_SEC * Math.PI) / 180;
    expect(later.x - DAMAGED_MODULE.x).toBeCloseTo(Math.sin(angle) * ORBIT_RADIUS, 4);
    expect(later.z - DAMAGED_MODULE.z).toBeCloseTo(Math.cos(angle) * ORBIT_RADIUS, 4);
  });

  it('pull out: hands back to an external view, rising and widening to 65°', () => {
    const c = cameraAt(M.recommendation);
    expect(c.fov).toBeCloseTo(65, 0);
    expect(c.pos.y).toBeGreaterThan(cameraAt(M.thermalDone).pos.y);
  });

  it('never produces a NaN, at any t across the whole demo', () => {
    for (let t = 0; t <= 90; t += 0.1) {
      const c = cameraAt(t);
      const d = droneAt(t);
      for (const n of [c.pos.x, c.pos.y, c.pos.z, c.look.x, c.look.y, c.look.z, c.fov,
        d.x, d.y, d.z]) {
        expect(Number.isFinite(n), `NaN at t=${t.toFixed(1)}`).toBe(true);
      }
    }
  });
});

describe('THE SEEK GUARANTEE — nothing integrates', () => {
  it('gives byte-identical camera and drone for the same t, every time', () => {
    for (const t of [0, 19, 25, 34, 41, 50, 55.5, 63, 74, 90]) {
      expect(cameraAt(t)).toEqual(cameraAt(t));
      expect(droneAt(t)).toEqual(droneAt(t));
    }
  });

  it('does not care what order t is sampled in', () => {
    const forwards = [20, 30, 40, 50, 60].map((t) => cameraAt(t));
    const backwards = [60, 50, 40, 30, 20].map((t) => cameraAt(t)).reverse();
    expect(backwards).toEqual(forwards);
  });

  it('is continuous — no jump between adjacent samples', () => {
    let previous = cameraAt(18);
    for (let t = 18.05; t <= 74; t += 0.05) {
      const c = cameraAt(t);
      const jump = Math.hypot(c.pos.x - previous.pos.x, c.pos.y - previous.pos.y,
        c.pos.z - previous.pos.z);
      expect(jump, `camera jumps ${jump.toFixed(2)}m at t=${t.toFixed(2)}`).toBeLessThan(3);
      previous = c;
    }
  });
});

describe('thermal pass and crack decal follow the script', () => {
  it('is off outside the thermal window', () => {
    expect(thermalAmount(47)).toBe(0);
    expect(thermalAmount(60)).toBe(0);
  });

  it('is fully on across the scan', () => {
    expect(thermalAmount(50)).toBe(1);
    expect(thermalAmount(55)).toBe(1);
  });

  it('shows the crack from target lock, per §14', () => {
    expect(crackVisible(M.lock - 0.1)).toBe(false);
    expect(crackVisible(M.lock)).toBe(true);
  });
});

describe('the camera rides the drone (POV)', () => {
  it('watches from outside for the first three seconds, then gets on board', () => {
    expect(isPOV(M.dispatch)).toBe(false);
    expect(isPOV(POV_IN - 0.1)).toBe(false);
    expect(isPOV(POV_IN)).toBe(true);
    expect(isPOV(M.thermalDone - 0.1)).toBe(true);
    expect(isPOV(M.thermalDone)).toBe(false);
  });

  it('hides the aircraft while we are inside it', () => {
    expect(droneVisible(M.dispatch + 1)).toBe(true);    // establishing
    expect(droneVisible(30)).toBe(false);               // POV
    expect(droneVisible(50)).toBe(false);               // POV
    expect(droneVisible(70)).toBe(true);                // flying home
  });

  it('puts the eye ON the aircraft for the whole POV window', () => {
    for (let t = POV_IN; t < M.thermalDone; t += 0.5) {
      const c = cameraAt(t);
      const d = droneAt(t);
      expect(dist(c.pos, d), `camera left the aircraft at t=${t}`).toBeLessThan(0.01);
      expect(c.pos.y).toBeCloseTo(d.y - 0.4, 5);
    }
  });
});

describe('the reticle frames ONE module, not the whole row', () => {
  it('is visible throughout the inspection', () => {
    for (const t of [M.lock, 42, 48, 54]) {
      expect(reticleRect(t).visible, `not visible at t=${t}`).toBe(true);
    }
  });

  it('is small enough to be one panel and large enough to see', () => {
    // The first cut used a fixed box covering ~28% of the frame that sat over FOUR
    // arrays. This projects one module's own corners, so its size is a consequence
    // of the geometry rather than a guess.
    for (const t of [42, 48, 54]) {
      const r = reticleRect(t);
      expect(r.width, `too wide at t=${t}`).toBeLessThan(0.75);
      expect(r.width, `too small at t=${t}`).toBeGreaterThan(0.08);
      expect(r.height).toBeLessThan(0.85);
    }
  });

  it('tracks the module as the drone orbits — it is not pinned to the screen', () => {
    const a = reticleRect(42);
    const b = reticleRect(52);
    expect(Math.abs(a.left - b.left) + Math.abs(a.top - b.top)).toBeGreaterThan(0.001);
  });

  it('stays centred on the module rather than drifting off it', () => {
    for (const t of [41, 45, 50, 55]) {
      const r = reticleRect(t);
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      expect(Math.hypot(cx - 0.5, cy - 0.5), `off centre at t=${t}`).toBeLessThan(0.3);
    }
  });
});

/**
 * THE PROJECTION IS CHECKED AGAINST THE RENDERER, NOT AGAINST ITSELF.
 *
 * `projectToScreen` builds its own basis so the overlays can frame real geometry
 * without a GPU. That is only worth anything if it agrees with the camera the
 * scene is actually drawn with — and for a long time it did not: `right` was
 * built as the camera's LEFT, so both basis vectors came out flipped and every
 * point landed rotated 180 degrees about the centre of frame.
 *
 * Nothing caught it. `reticleRect` takes the bounding box of four corners
 * symmetric about the target, and a point reflection through that target leaves
 * that box identical. The panel ID tags were the visible casualty: each one was
 * drawn on the opposite side of the frame from the array it names.
 *
 * So this compares against three's own PerspectiveCamera. A hand-rolled
 * projection needs an independent oracle, and the renderer is the only one that
 * counts.
 */
describe('the pure projection agrees with the camera the scene is drawn with', () => {
  const throughThree = (world: typeof DAMAGED_MODULE, cam: ReturnType<typeof cameraAt>,
    aspect: number) => {
    const c = new PerspectiveCamera(cam.fov, aspect, 0.1, 1000);
    c.position.set(cam.pos.x, cam.pos.y, cam.pos.z);
    c.up.set(0, 1, 0);
    c.lookAt(new Vector3(cam.look.x, cam.look.y, cam.look.z));
    c.updateMatrixWorld(true);
    c.updateProjectionMatrix();
    const v = new Vector3(world.x, world.y, world.z).project(c);
    return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
  };

  it('puts every array of the field where three.js puts it', () => {
    for (const id of ['A-08', 'B-17', 'C-31']) {
      const target = inspectionTarget(id);
      for (let t = M.dispatch; t <= M.recommendation; t += 2) {
        const cam = cameraAt(t, target);
        for (const world of [target, labelAnchor(arrayCentre(id)), PAD]) {
          const mine = projectToScreen(world, cam);
          const theirs = throughThree(world, cam, ASPECT);
          if (!mine.visible) continue;
          expect(mine.x, `x at t=${t} on ${id}`).toBeCloseTo(theirs.x, 3);
          expect(mine.y, `y at t=${t} on ${id}`).toBeCloseTo(theirs.y, 3);
        }
      }
    }
  });

  it('is not mirrored: right of the axis is right of frame, above is above', () => {
    const cam = { pos: { x: 0, y: 0, z: 0 }, look: { x: 0, y: 0, z: -10 }, fov: 45 };
    expect(projectToScreen({ x: 5, y: 0, z: -10 }, cam).x).toBeGreaterThan(0.5);
    expect(projectToScreen({ x: 0, y: 5, z: -10 }, cam).y).toBeLessThan(0.5);
  });
});

describe('array ID tags identify the target instead of asserting it', () => {
  it('labels B-17 during the inspection, and marks it as the faulted one', () => {
    const labels = visibleLabels(48);
    const b17 = labels.find((l) => l.id === 'B-17');
    expect(b17, 'B-17 is not labelled during its own inspection').toBeDefined();
    expect(b17!.faulted).toBe(true);
  });

  it('labels neighbours during the descent, when the choice is being made', () => {
    // At inspection altitude only the target fits in frame — which is the point of
    // being that close. The moment that proves "it went to THIS one, not that one"
    // is the run in, while several arrays are still visible together.
    const approach = visibleLabels(31);
    expect(approach.length).toBeGreaterThan(1);
    expect(approach.some((l) => l.id !== 'B-17')).toBe(true);
    expect(approach.some((l) => l.faulted)).toBe(true);
  });

  it('puts every tag on screen', () => {
    for (const t of [36, 42, 50, 55]) {
      for (const l of visibleLabels(t)) {
        expect(l.x).toBeGreaterThan(0);
        expect(l.x).toBeLessThan(1);
        expect(l.y).toBeGreaterThan(0);
        expect(l.y).toBeLessThan(1);
      }
    }
  });

  /**
   * The tags used to be projected from panel height, so they hung in the air beside
   * the modules instead of sitting on the site. These pin the fix: the anchor is on
   * the ground, in front of the row, and close enough in that the frame still holds
   * it at inspection altitude — 2.5 m out was already off the top of the shot.
   */
  it('anchors each tag to the dirt in front of its array, not to mid-air', () => {
    const base = arrayPosition('B', 3, 1, 8);
    const anchor = labelAnchor(base);
    expect(anchor.y).toBe(0);
    expect(anchor.x).toBe(base.x);
    expect(anchor.z - base.z).toBeCloseTo(LABEL_GROUND_OFFSET_Z, 6);
    // Clear of the module's own ground footprint, and nowhere near the next row.
    expect(LABEL_GROUND_OFFSET_Z).toBeGreaterThan((PANEL_H / 2) * Math.cos(PANEL_TILT));
    expect(LABEL_GROUND_OFFSET_Z).toBeLessThan(ARRAY_SPACING_Z / 2);
  });

  it('keeps the grounded tag in frame right through the inspection', () => {
    for (const id of ['A-08', 'B-17', 'C-31']) {
      for (let t = M.rgb; t <= M.thermalDone; t += 1) {
        const labels = visibleLabels(t, id);
        expect(labels.find((l) => l.faulted)?.id, `lost the tag at t=${t} on ${id}`)
          .toBe(id);
      }
    }
  });

  it('never mislabels — every tag is a real array in farm.json', () => {
    const ids = new Set(panelInstances().map((p) => p.id.replace(/-\d+$/, '')));
    for (const l of visibleLabels(48)) expect(ids.has(l.id)).toBe(true);
  });
});


/**
 * THE BLACK MASS ON THE HORIZON.
 *
 * Flying to a zone-C array put the camera ~275 m from the origin at the end of the
 * pull-out. The sky was a fixed sphere of radius 420 centred on the origin, so its
 * far side sat at ~695 m — past the 600 m far plane. It was clipped away and the
 * clear colour showed through as a black mass sitting on the horizon.
 *
 * The sphere now rides the camera, which makes the geometry impossible rather than
 * merely unlikely. These assert the second half of the fix: the camera no longer
 * flies far enough for anything centred on the site to be at risk either.
 */
describe('the camera stays inside the world it is drawn in', () => {
  const CAMERA_FAR = 600;              // SolarFarmScene
  const SKY_RADIUS = 300;              // Environment

  const everyArray = farm.zones.flatMap((z) => z.panels.map((p) => p.id));

  it('never flies further from the site than the sky is deep', () => {
    for (const id of everyArray) {
      const target = inspectionTarget(id);
      for (let t = M.dispatch; t <= M.recommendation; t += 0.5) {
        const { pos } = cameraAt(t, target);
        const d = Math.hypot(pos.x, pos.y, pos.z);
        expect(d + SKY_RADIUS).toBeLessThan(CAMERA_FAR);
      }
    }
  });

  it('keeps the inspected array in frame through the pull-out', () => {
    for (const id of ['A-08', 'B-17', 'C-31']) {
      const target = inspectionTarget(id);
      const cam = cameraAt(M.recommendation - 0.5, target);
      const s = projectToScreen(target, cam);
      expect(s.visible).toBe(true);
    }
  });
});

describe('the field is one site, not three islands', () => {
  it('leaves a service corridor between zones, not a desert', () => {
    const a = arrayPosition('A', 5, 1, 8).z;
    const b = arrayPosition('B', 1, 1, 8).z;
    const gap = b - a;
    expect(gap).toBeGreaterThan(ARRAY_SPACING_Z);
    expect(gap).toBeLessThan(ARRAY_SPACING_Z * 3);
  });
});

describe('array tags are up for the whole overflight', () => {
  it('labels what is under the aircraft during the crossing, not just at lock', () => {
    const midTransit = visibleLabels(M.transit + 6, 'C-31');
    expect(midTransit.length).toBeGreaterThan(0);
  });

  it('always includes the target once it is in shot', () => {
    const onStation = visibleLabels(M.rgb + 2, 'C-31');
    expect(onStation.some((l) => l.id === 'C-31' && l.faulted)).toBe(true);
  });

  it('names the array it was sent to, whichever that is', () => {
    for (const id of ['A-08', 'B-17', 'C-31']) {
      const labels = visibleLabels(M.rgb + 2, id);
      expect(labels.find((l) => l.faulted)?.id).toBe(id);
    }
  });
});

/**
 * THE DEFECT MUST BE ON THE ARRAY THE CAMERA IS LOOKING AT.
 *
 * `CrackedPanel` was anchored to B-17's world position permanently. Three of the
 * committed faults are cracks, so dispatching to C-07 — "advanced crack
 * propagation, six strings bypassed", -56.6 % — flew the camera to a pristine blue
 * panel and put a reticle on it reading the deviation. The crack was still in the
 * world, in another zone, out of frame.
 *
 * These assert the two halves separately, because conflating them is how this
 * project keeps reintroducing the same bug: WHICH ARRAY IS CRACKED is a property of
 * the site record and is known for many arrays; WHICH CELLS ARE HOT is a
 * measurement and is known for exactly one.
 */
describe('the crack is drawn on the array that has one', () => {
  it('follows every array the committed scenario calls cracked', () => {
    for (const id of ['B-17', 'A-31', 'C-07']) {
      expect(hasCrackMechanism(id), `${id} is a crack in scenario.json`).toBe(true);
    }
  });

  it('is absent from a soiled array, which is a different mechanism', () => {
    for (const id of ['A-08', 'C-31', 'A-22']) {
      expect(hasCrackMechanism(id), `${id} is soiling, not a crack`).toBe(false);
    }
  });

  it('is absent from a healthy array', () => {
    expect(hasCrackMechanism('C-29')).toBe(false);
  });

  it('follows a fault the operator injects', () => {
    const injected = [{
      id: 'inj-1', panelId: 'C-12', startHour: 11, rampMinutes: 3,
      faultedStrings: 6, terminalMismatch: 0.34,
      mechanism: 'advanced crack propagation, six strings bypassed',
      injected: true,
    }] as unknown as Parameters<typeof hasCrackMechanism>[1];
    expect(hasCrackMechanism('C-12', injected)).toBe(true);
    expect(hasCrackMechanism('C-12')).toBe(false);
  });

  it('puts each array in its OWN place, so the meshes land on the target', () => {
    const seen = new Map<string, string>();
    for (const id of ['B-17', 'A-31', 'C-07', 'A-08']) {
      const c = arrayCentre(id);
      const key = `${c.x.toFixed(2)},${c.z.toFixed(2)}`;
      expect(seen.has(key), `${id} shares a position with ${seen.get(key)}`).toBe(false);
      seen.set(key, id);
    }
  });

  it('centres the array on the module the camera aims at', () => {
    // inspectionTarget is the damaged module INSIDE the array; the centre is the
    // array itself. They must differ by exactly one module offset, or the unique
    // meshes and the reticle disagree about where the defect is.
    for (const id of ['B-17', 'C-07']) {
      const centre = arrayCentre(id);
      const aim = inspectionTarget(id);
      expect(aim.x - centre.x).toBeCloseTo(moduleOffsetX(DAMAGED_INDEX), 5);
      expect(aim.z).toBeCloseTo(centre.z, 5);
    }
  });
});
