'use client';

import { useWorkflow } from '@/hooks/useWorkflow';
import { cellGrid, hasCapturedEvidence } from '@/lib/data';
import { deltaT } from '@/lib/format';
import { ironbowForDeltaT, normaliseDeltaT } from '@/lib/ironbow';

export function LinkedMatrix({ panelId }: { panelId: string }) {
  const selected = useWorkflow((s) => s.selectedCell);
  const mine = selected?.panelId === panelId ? selected : null;
  if (!hasCapturedEvidence(panelId)) return <><h3>Illustrated heat pattern</h3><p>No measured cell matrix is held for this array. Its 3D heat pattern illustrates the scenario mechanism and carries no measured temperature claim.</p></>;
  return <div className="linked-evidence">
    <h3>Linked thermal cells <span className="id">{panelId}</span></h3>
    <p>Select a cell here or a hot tile in the simulated thermal view.</p>
    <div className="linked-grid" style={{ gridTemplateColumns: `repeat(${cellGrid.cols}, 1fr)` }} aria-label={`Recorded ${panelId} cell temperature differences`}>
      {cellGrid.matrix.flatMap((row, r) => row.map((dt, c) => <button type="button" key={`${r}:${c}`}
        aria-label={`Row ${r + 1}, column ${c + 1}, ${deltaT(dt)}`}
        aria-pressed={mine?.row === r + 1 && mine.col === c + 1}
        data-ink={normaliseDeltaT(dt) > 0.7 ? 'dark' : 'light'}
        style={{ background: ironbowForDeltaT(dt) }}
        onClick={() => useWorkflow.getState().selectCell(panelId, r + 1, c + 1)}>
        <span>R{r + 1} C{c + 1}</span><strong>{deltaT(dt)}</strong>
      </button>))}
    </div>
    <p className="linked-reading" role="status">{mine ? <>Selected <span className="id">R{mine.row} C{mine.col}</span> · {deltaT(cellGrid.matrix[mine.row - 1][mine.col - 1])} · {cellGrid.defects.some((d) => d.row === mine.row && d.col === mine.col) ? 'Recorded hot-band cell' : 'Recorded baseline cell'}</> : 'Choose a cell to inspect its recorded reading.'}</p>
    <p className="workflow-basis">Cell means from the recorded UAV frame under the declared {cellGrid.thermalSpanC} °C scaling. These values stay as captured after repair.</p>
  </div>;
}
