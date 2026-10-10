import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { farm } from './data';
import { arrayCentre } from './scene';
import { ARRAY_WIDTH } from './siteLayout';
import { operatorCameraAt, operatorViewport } from './twinCamera';

describe('camera views use the unobscured operator space', () => {
  for (const [width, height] of [[1366, 768], [1920, 1080]]) {
    it(`keeps every array centre between the panels at ${width} by ${height}`, () => {
      const viewport = operatorViewport(width, height);
      const sample = operatorCameraAt('overview', null, viewport.aspect);
      const camera = new PerspectiveCamera(sample.fov, width / height, 0.5, 600);
      camera.position.set(sample.pos.x, sample.pos.y, sample.pos.z);
      camera.lookAt(sample.look.x, sample.look.y, sample.look.z);
      camera.setViewOffset(width, height, viewport.offsetX, 0, width, height);
      camera.updateMatrixWorld();
      for (const zone of farm.zones) for (const panel of zone.panels) {
        const p = arrayCentre(panel.id);
        for (const edge of [-ARRAY_WIDTH / 2, ARRAY_WIDTH / 2]) {
          const projected = new Vector3(p.x + edge, p.y, p.z).project(camera);
          const x = (projected.x + 1) / 2 * width;
          expect(x).toBeGreaterThan(440);
          expect(x).toBeLessThan(width - 436);
          expect(Math.abs(projected.y)).toBeLessThan(1);
        }
      }
    });
  }
  it('focuses the requested array and falls back to overview without a selection', () => {
    const sample = operatorCameraAt('selected', 'C-07', 0.7);
    expect(sample.look).toEqual(arrayCentre('C-07'));
    expect(operatorCameraAt('selected', null, 0.7)).toEqual(operatorCameraAt('overview', null, 0.7));
  });
});
