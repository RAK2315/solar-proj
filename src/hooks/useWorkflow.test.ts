import { afterEach, expect, it } from 'vitest';
import { useSession } from '@/store/session';
import type { DetectorResult } from '@/store/detector';
import { useWorkflow } from './useWorkflow';

afterEach(() => { useSession.getState().resetSession(); useWorkflow.setState({ open: false }); });

function repair() {
  useSession.getState().resetSession();
  useSession.setState({ siteSeconds: 1800, running: false });
  useSession.getState().createWorkOrder('B-17', 'Human approved');
  useWorkflow.getState().startRepair('B-17', 'crack');
  return useWorkflow.getState().repairs[0];
}
function result(panelId = 'B-17'): DetectorResult {
  return { panelId, run: 1, at: 1, elapsedMs: 100, frame: 'data:image/png;base64,', frameSize: [100, 100], detections: [], source: 'the drone\'s camera' };
}

it('will not dispatch a crew without approval or duplicate an approved repair', () => {
  useSession.getState().resetSession();
  useWorkflow.getState().startRepair('B-17', 'crack');
  expect(useWorkflow.getState().repairs).toEqual([]);
  repair();
  useWorkflow.getState().startRepair('B-17', 'crack');
  expect(useWorkflow.getState().repairs).toHaveLength(1);
});

it('requires completion, matching fresh inference and daylight before verification; closure is separate', () => {
  const run = repair();
  useWorkflow.getState().verify('B-17');
  useWorkflow.getState().close('B-17');
  expect(useWorkflow.getState().repairs[0].closedAt).toBeUndefined();
  useSession.setState({ siteSeconds: run.completedAt });
  useWorkflow.getState().verify('B-17');
  expect(useWorkflow.getState().repairs[0].verifiedAt).toBeUndefined();
  useWorkflow.getState().record({ panelId: 'A-01', siteSeconds: run.completedAt, angle: 'first', revision: 1, result: result('A-01'), outcome: 'result' });
  useWorkflow.getState().verify('B-17');
  expect(useWorkflow.getState().repairs[0].verifiedAt).toBeUndefined();
  useWorkflow.getState().record({ panelId: 'B-17', siteSeconds: run.completedAt, angle: 'first', revision: 2, result: result(), outcome: 'unavailable' });
  useWorkflow.getState().verify('B-17');
  expect(useWorkflow.getState().repairs[0].verifiedAt).toBeUndefined();
  useWorkflow.getState().record({ panelId: 'B-17', siteSeconds: run.completedAt, angle: 'first', revision: 3, result: result(), outcome: 'result' });
  useWorkflow.getState().verify('B-17');
  expect(useWorkflow.getState().repairs[0].verifiedAt).toBe(run.completedAt);
  expect(useWorkflow.getState().repairs[0].closedAt).toBeUndefined();
  useWorkflow.getState().close('B-17');
  expect(useWorkflow.getState().repairs[0].closedAt).toBe(run.completedAt);
  useSession.getState().resetSession();
  expect(useWorkflow.getState().repairs).toEqual([]);
  expect(useWorkflow.getState().captures).toEqual([]);
});

it('holds a camera pose independently of clock time and keeps each actual result', () => {
  useWorkflow.getState().inspect('B-17');
  useWorkflow.getState().anotherAngle();
  const held = useWorkflow.getState().inspection;
  useSession.setState({ siteSeconds: 10000 });
  expect(useWorkflow.getState().inspection).toEqual(held);
  expect(held?.request).toBe(1);
  const empty = result();
  useWorkflow.getState().record({ panelId: 'B-17', siteSeconds: 10000, angle: 'oblique', revision: 2, result: empty, outcome: 'result' });
  useWorkflow.getState().record({ panelId: 'B-17', siteSeconds: 10010, angle: 'opposite', revision: 3, result: { ...empty, run: 2, detections: [{ classId: 1, label: 'Cracked', confidence: .31, box: [10,10,30,30] }] }, outcome: 'result' });
  expect(useWorkflow.getState().captures).toHaveLength(2);
  expect(useWorkflow.getState().captures[0].result.detections).toEqual([]);
});

it('does not reuse an earlier view result after switching spectrum or reopening inspection', () => {
  useWorkflow.getState().inspect('B-17');
  useWorkflow.getState().requestCapture();
  const first = useWorkflow.getState().inspection!;
  useWorkflow.getState().setMode('thermal');
  expect(useWorkflow.getState().inspection!.request).toBe(0);
  expect(useWorkflow.getState().inspection!.revision).toBeGreaterThan(first.revision);
  useWorkflow.getState().exitInspection();
  useWorkflow.getState().inspect('B-17');
  expect(useWorkflow.getState().inspection!.revision).toBeGreaterThan(first.revision);
});
