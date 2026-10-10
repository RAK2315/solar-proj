'use client';

import { Camera, ScanLine } from 'lucide-react';
import { INSPECTION_ANGLES, useWorkflow } from '@/hooks/useWorkflow';
import { useDetector } from '@/store/detector';
import { useSession } from '@/store/session';
import { DetectionBoxes } from '@/components/overlay/DossierPanels';
import { LinkedMatrix } from '@/components/overlay/LinkedMatrix';

export function InspectionControls() {
  const held = useWorkflow((s) => s.inspection);
  const captures = useWorkflow((s) => s.captures);
  const busy = useDetector((s) => s.busy);
  const failed = useDetector((s) => s.run === 'failed');
  if (!held) return null;
  const result = captures.findLast((c) => c.panelId === held.panelId && c.revision === held.revision && c.angle === INSPECTION_ANGLES[held.angle].label);
  const r = held.mode === 'rgb' && result?.outcome === 'result' ? result.result.roi : null;
  const mine = captures.filter((c) => c.panelId === held.panelId);
  const review = () => {
    useWorkflow.getState().exitInspection();
    useWorkflow.getState().setTab('evidence');
    useSession.getState().setModule('incident');
  };
  return <div className="sy-inspection">
    {r && result && result.result.detections.length > 0 && <div className="sy-reticle" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }}><DetectionBoxes result={result.result} showImage={false} /></div>}
    <aside className="inspection-hud glass" aria-label="Linked inspection controls">
      <span className="chip" data-sev="active"><Camera size={16} />Camera held · <span className="id">{held.panelId}</span></span>
      <h2>Look closer.</h2><p>{INSPECTION_ANGLES[held.angle].label}. Camera pose is frozen; the site clock continues.</p>
      <div className="seg" role="group" aria-label="Inspection spectrum"><button type="button" className="tool" aria-pressed={held.mode === 'rgb'} onClick={() => useWorkflow.getState().setMode('rgb')}>Simulated RGB</button><button type="button" className="tool" aria-pressed={held.mode === 'thermal'} onClick={() => useWorkflow.getState().setMode('thermal')}>Thermal illustration</button></div>
      <div className="inspection-result" role="status">{held.mode === 'thermal' ? 'Illustrated heat band · select a cell to inspect its recorded reading' : busy ? 'Analysing captured RGB pixels…' : result ? result.outcome === 'failed' ? 'Inference failed · frame retained for review' : result.outcome !== 'result' ? 'Detector unavailable · frame retained' : result.result.detections.length ? 'Crack box returned on this view' : 'No crack box returned on this view' : failed && held.request ? 'Capture failed · request a new RGB capture' : 'Capture this angle to run the model'}</div>
      <div className="workflow-actions"><button type="button" className="tool primary" disabled={busy} onClick={() => useWorkflow.getState().requestCapture()}><ScanLine size={18} />Capture RGB</button><button type="button" className="tool" disabled={busy} onClick={() => useWorkflow.getState().anotherAngle()}>Request another angle</button></div>
      <p>RGB inference uses the trained model. Thermal colours illustrate the heat pattern; no thermal classifier runs here.</p>
      <LinkedMatrix panelId={held.panelId} />
      <p>{mine.length} captures retained in this browser session.</p>
      <button type="button" className="tool" onClick={review}>Review evidence & next steps</button>
      <button type="button" className="tool quiet" onClick={() => useWorkflow.getState().exitInspection()}>Back to the field</button>
    </aside>
  </div>;
}
