import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { useDetector, type DetectorResult } from '@/store/detector';
import { useSession } from '@/store/session';
import { DetectorCapture } from './DetectorCapture';
import { FlightOverlay } from './FlightOverlay';

const driver = vi.hoisted(() => ({ after: null as (() => void) | null, canvas: null as HTMLCanvasElement | null }));
vi.mock('@react-three/fiber', () => ({
  addAfterEffect: (after: () => void) => {
    driver.after = after;
    return () => { driver.after = null; };
  },
  useThree: (select: (state: object) => unknown) => select({ gl: { domElement: driver.canvas } }),
}));

const originalDetect = useDetector.getState().detect;
afterEach(() => {
  cleanup();
  useSession.getState().resetSession();
  useDetector.getState().reset();
  useDetector.setState({ detect: originalDetect });
  driver.canvas?.remove();
});

function inspection() {
  useSession.getState().resetSession();
  useSession.setState({
    siteSeconds: 1500, followFlight: true, selectedPanelId: 'B-17',
    missions: [{ id: 'MSN-001', droneId: 'DRONE 01', panelId: 'B-17', startedAt: 0, phase: 'inspecting' }],
  });
  const detect = vi.fn(async () => {});
  useDetector.setState({ detect });
  driver.canvas = document.createElement('canvas');
  driver.canvas.width = 1366;
  driver.canvas.height = 768;
  document.body.append(driver.canvas);
  render(<><FlightOverlay /><DetectorCapture /></>);
  return detect;
}

it('captures after the scene renders, never while the overlay commits a new clock position', () => {
  const detect = inspection();
  expect(detect).not.toHaveBeenCalled();
  act(() => driver.after?.());
  expect(detect).toHaveBeenCalledTimes(1);
  expect(detect).toHaveBeenCalledWith(driver.canvas, expect.objectContaining({ panelId: 'B-17', file: true }));
  act(() => useSession.setState({ siteSeconds: 1650 }));
  expect(detect).toHaveBeenCalledTimes(1);
  act(() => driver.after?.());
  expect(detect).toHaveBeenCalledTimes(2);
});

it('does not sample a paused frame repeatedly, thermal colours, or the operator field view', () => {
  const detect = inspection();
  act(() => driver.after?.());
  act(() => driver.after?.());
  expect(detect).toHaveBeenCalledTimes(1);
  act(() => useSession.setState({ siteSeconds: 1800 }));
  act(() => driver.after?.());
  expect(detect).toHaveBeenCalledTimes(1);
  act(() => useSession.setState({ siteSeconds: 1500, followFlight: false }));
  act(() => driver.after?.());
  expect(detect).toHaveBeenCalledTimes(1);
  act(() => useSession.setState({ followFlight: true }));
  act(() => driver.after?.());
  expect(detect).toHaveBeenCalledTimes(2);
});

function cameraResult(panelId = 'B-17'): DetectorResult {
  return {
    detections: [], elapsedMs: 250, frame: 'data:image/png;base64,', frameSize: [640, 640],
    run: 1, at: 0, source: `the drone's camera over ${panelId}`, panelId,
    roi: { x: 0.2, y: 0.2, w: 0.3, h: 0.4 },
  };
}

it('makes an empty live model result visible without inventing a box', () => {
  inspection();
  const last = cameraResult();
  act(() => useDetector.setState({ status: 'ready', run: 'done', last, byPanel: { 'B-17': last } }));
  expect(screen.getByText('RGB · No crack detected')).toBeTruthy();
  expect(document.querySelector('.sy-reticle')).toBeNull();
  act(() => useDetector.setState({ busy: true, run: 'running' }));
  expect(screen.getByText('RGB · Analysing camera frame')).toBeTruthy();
});

it('ignores another array, a reference photo and a previous pass in the live status', () => {
  inspection();
  for (const last of [cameraResult('A-01'), { ...cameraResult(), source: 'committed photograph' }, cameraResult()]) {
    act(() => useDetector.setState({ status: 'ready', run: 'done', last, byPanel: {} }));
    expect(screen.getByText('RGB · Waiting for camera frame')).toBeTruthy();
    expect(document.querySelector('.sy-reticle')).toBeNull();
  }
});

it('shows actual detections only during the RGB pass and reports unavailable inference', () => {
  inspection();
  const last: DetectorResult = { ...cameraResult(), detections: [{ classId: 1, label: 'Cracked', confidence: 0.8, box: [10, 10, 100, 100] }] };
  act(() => useDetector.setState({ status: 'ready', run: 'done', last, byPanel: { 'B-17': last } }));
  expect(screen.getByText('RGB · Crack detected')).toBeTruthy();
  expect(document.querySelector('.sy-reticle')).toBeTruthy();
  act(() => useDetector.setState({ status: 'missing' }));
  expect(screen.getByText('RGB · Detector unavailable')).toBeTruthy();
  expect(document.querySelector('.sy-reticle')).toBeNull();
  act(() => useSession.setState({ siteSeconds: 1800 }));
  expect(screen.queryByText('RGB · Detector unavailable')).toBeNull();
});
