'use client';

/**
 * Dossier — the inspection evidence, at the size it deserves.
 *
 * WHY THIS EXISTS. The right rail was a 448px column holding roughly 25 facts at
 * equal weight, three prose paragraphs, a 5×7 grid, a chart, a four-step list and
 * the approval gate — all expanded, all at once, on a projector. Reordering it into
 * five groups fixed the ORDER and did nothing for the DENSITY.
 *
 * So the rail was split by KIND rather than by topic. The rail keeps the glance:
 * what this array is doing, how bad, and what the operator is being asked to
 * authorise. Everything that is *evidence* — the captured frames, the cell grid,
 * the agent's full reasoning — comes here, over the map, where the matrix gets 64px
 * cells instead of 22px and the prose gets a column it can be read in.
 *
 * TWO REASONS TO BE OPEN, one component. Live mode: the operator opened it. Demo
 * mode: `useDossierOpen()` derives it from `t`, so the recording opens it when the
 * frames come back and closes it at the recommendation, handing the map back for
 * the approval beat. Deriving rather than storing is what keeps seeking backwards
 * honest.
 *
 * EVIDENCE SCOPING STILL APPLIES, and this component is exactly where it would be
 * broken next: we hold captured imagery for B-17 and for nothing else, so the
 * caller gates the trigger on `hasCapturedEvidence` and there is deliberately no
 * empty state here to fall back on. A dossier that opens on C-29 with placeholder
 * cells would be the fifth instance of the most repeated bug in this project.
 */

import { getPanel } from '@/lib/data';
import { useSession } from '@/store/session';
import {
  BEAT, useAgentCache, useDossierOpen, useInspectionClock, useMode, useSelectedPanelId,
} from '@/store/selectors';
import { AgentReasoning } from './AgentReasoning';
import { AnomalyMatrix } from './AnomalyMatrix';
import { EvidenceStrip } from './EvidenceStrip';
import { Findings } from './Findings';
import { LiveTriage } from './LiveTriage';

function Section({ title, note, children }: {
  title: string; note?: string; children: React.ReactNode;
}) {
  return (
    <section className="group" style={{ display: 'grid', gap: 'var(--sp-3)' }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        gap: 'var(--sp-3)',
      }}>
        <h2 className="t-h1" style={{ color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
        {note && <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>{note}</span>}
      </header>
      {children}
    </section>
  );
}

export function Dossier() {
  const open = useDossierOpen();
  const mode = useMode();
  const panelId = useSelectedPanelId();
  const panel = getPanel(panelId);
  const setDossier = useSession((s) => s.setDossier);
  const agent = useAgentCache();

  // The dossier being open is not the same claim as the scan having reached a
  // given pass. It opens when the first frames come back, so the matrix must
  // still be gated on the THERMAL beat — otherwise its heading announces a
  // measurement eight seconds before the sensor has taken it.
  const scanClock = useInspectionClock();
  const scanned = scanClock >= BEAT.rgbScan;
  const thermal = scanClock >= BEAT.thermalScan;

  if (!open || !panel) return null;

  return (
    <div
      className="scrim"
      // Clicking away closes it. The dossier itself stops the click, so a drag
      // that ends outside does not dismiss what the operator was reading.
      onMouseDown={() => setDossier(false)}
    >
      <div
        className="dossier"
        role="dialog"
        aria-label={`Inspection dossier for ${panelId}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 'var(--sp-4) var(--sp-6)',
          borderBottom: '1px solid var(--line-active)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-4)' }}>
            <span className="t-h1" style={{ color: 'var(--text-secondary)' }}>
              Inspection dossier
            </span>
            <span style={{
              font: '700 28px var(--font-mono)', color: 'var(--text-primary)',
              letterSpacing: '0.02em',
            }}>
              {panelId}
            </span>
            <span className="t-label" style={{ color: 'var(--text-secondary)' }}>
              zone {panel.zone} · {panel.inverterId}
            </span>
          </div>

          <button
            type="button"
            className="btn-reset t-h2"
            onClick={() => setDossier(false)}
            style={{
              color: 'var(--text-secondary)',
              border: '1px solid var(--line-active)',
              padding: '6px var(--sp-3)',
            }}
          >
            Close · Esc
          </button>
        </header>

        <div className="dossier-body">
          {/* MEASURED — what a sensor read off the panel. */}
          <div className="dossier-col" style={{ borderRight: '1px solid var(--line-active)' }}>
            {scanned && (
              <Section title="Captured evidence" note="drone capture">
                <EvidenceStrip />
              </Section>
            )}

            {thermal && (
              <Section title="Anomaly matrix" note="5 × 7 cells · classical CV, not a model">
                <AnomalyMatrix />
              </Section>
            )}
          </div>

          {/* REASONED — what a model made of it. A different kind of claim, and it
              used to sit in the same scroll as the measurements, which made the two
              read as one. */}
          <div className="dossier-col">
            {mode === 'live' ? (
              <Section title="Agent reasoning" note="cross-checked against this array">
                <LiveTriage />
              </Section>
            ) : (
              agent && (
                <Section title="Agent reasoning" note={agent.meta.model}>
                  <AgentReasoning />
                </Section>
              )
            )}

            {agent && (
              <Section title="Findings">
                <Findings />
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
