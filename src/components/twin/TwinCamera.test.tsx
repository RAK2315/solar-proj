import { act, cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { cameraAt, inspectionTarget } from '@/lib/scene';
import { useSession } from '@/store/session';
import { TwinCamera } from './TwinCamera';

const driver = vi.hoisted(() => ({ frame: () => {}, state: {} as object }));
vi.mock('@react-three/fiber', () => ({
  useFrame: (frame: () => void) => { driver.frame = frame; },
  useThree: (select: (state: object) => unknown) => select(driver.state),
}));

afterEach(() => { cleanup(); useSession.getState().resetSession(); });

it('uses the calibrated camera immediately when seeking from overview into inspection', () => {
  useSession.getState().resetSession();
  const camera = new PerspectiveCamera(58, 1366 / 768, 0.5, 600);
  const canvas = document.createElement('canvas');
  driver.state = { camera, size: { width: 1366, height: 768 }, gl: { domElement: canvas } };
  render(<TwinCamera overlay={createRef()} request={{ view: 'overview', revision: 0 }} />);
  act(() => driver.frame());
  expect(camera.view?.enabled).toBe(true);
  useSession.setState({
    siteSeconds: 1500, followFlight: true,
    missions: [{ id: 'MSN-001', droneId: 'DRONE 01', panelId: 'B-17', startedAt: 0, phase: 'inspecting' }],
  });
  act(() => driver.frame());
  const sample = cameraAt(43, inspectionTarget('B-17'));
  expect(camera.position.toArray()).toEqual([sample.pos.x, sample.pos.y, sample.pos.z]);
  expect(camera.fov).toBe(sample.fov);
  expect(camera.view?.enabled).toBe(false);
  camera.updateMatrixWorld();
  const projected = new Vector3(sample.look.x, sample.look.y, sample.look.z).project(camera);
  expect(projected.x).toBeCloseTo(0, 6);
  expect(projected.y).toBeCloseTo(0, 6);
});
