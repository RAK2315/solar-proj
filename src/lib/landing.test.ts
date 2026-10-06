import { describe, expect, it } from 'vitest';

import {
  CAMERA_LAP_SECONDS, LANDING_DRONES, STILL_SECONDS, landingCameraAt, landingDroneAt,
} from './landing';

describe('the landing page\u2019s paths', () => {
  it('are pure: the same second gives the same frame', () => {
    expect(landingCameraAt(STILL_SECONDS, 16 / 9)).toEqual(landingCameraAt(STILL_SECONDS, 16 / 9));
    expect(landingDroneAt(STILL_SECONDS, 0)).toEqual(landingDroneAt(STILL_SECONDS, 0));
  });

  it('bring the camera back to where it started after one lap', () => {
    const a = landingCameraAt(0, 16 / 9).pos;
    const b = landingCameraAt(CAMERA_LAP_SECONDS, 16 / 9).pos;
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.y).toBeCloseTo(a.y, 6);
    expect(b.z).toBeCloseTo(a.z, 6);
  });

  it('keep the camera above the modules and every drone in the air, always', () => {
    for (let t = 0; t < 600; t += 0.5) {
      expect(landingCameraAt(t, 16 / 9).pos.y).toBeGreaterThan(10);
      for (let i = 0; i < LANDING_DRONES; i += 1) {
        const p = landingDroneAt(t, i);
        expect(Number.isFinite(p.x + p.y + p.z)).toBe(true);
        expect(p.y).toBeGreaterThan(5);
      }
    }
  });

  it('steps back for a narrow window, so the field still reads as a field', () => {
    expect(landingCameraAt(0, 0.6).pos.z).toBeGreaterThan(landingCameraAt(0, 16 / 9).pos.z);
  });
});
