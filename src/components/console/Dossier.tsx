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
 * the agent's full reasoning — comes here, over the map, where the matrix gets room
 * and the prose gets a column it can be read in.
 *
 * TWO REASONS TO BE OPEN, one component. Live mode: the operator opened it. Demo
 * mode: `useDossierOpen()` derives it from `t`, so the recording opens it when the
 * frames come back and closes it at the recommendation, handing the map back for
 * the approval beat. Deriving rather than storing is what keeps seeking backwards
 * honest.
 *
 * IT IS NOW THE INCIDENT FILE, not the imagery viewer. That changed when the
 * evidence chain arrived: the chain is derivable for any of the 120 arrays, and
 * gating the whole surface on captured imagery would have hidden the product's
 * central argument behind the one array that happens to have a photograph.
 *
 * EVIDENCE SCOPING STILL APPLIES, and this component is exactly where it would be
 * broken next: we hold captured imagery for B-17 and for nothing else. The gate
 * therefore MOVED rather than lifted — it used to sit on the trigger and it now
 * sits on the imagery column, which is the only part that was ever scoped. There
 * is deliberately no empty state behind it. A dossier that opens on C-29 with
 * placeholder cells would be the ninth instance of the most repeated bug here.
 */

import { X } from 'lucide-react';

import { getPanel, hasCapturedEvidence } from '@/lib/data';
import { useSession } from '@/store/session';
import {
  BEAT, useAgentCache, useDossierOpen, useInspectionClock, useMode, usePanelStatus,
  useSelectedIncident, useSelectedPanelId,
} from '@/store/selectors';
import { AgentReasoning } from './AgentReasoning';
import { AnomalyMatrix } from './AnomalyMatrix';
import { EvidenceChain } from './EvidenceChain';
import { EvidenceStrip } from './EvidenceStrip';
import { LiveDetection } from './LiveDetection';
import { Findings } from './Findings';
import { LiveTriage } from './LiveTriage';

function Section({ title, note, children }: {
  title: string; note?: string; children: React.ReactNode;
}) {
  return (
    <section className="group" style={{ display: 'grid', gap: 'var(--sp-3)' }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        gap: 'var(--sp-3)', borderBottom: '1px solid var(--line-hairline)',
        paddingBottom: 'var(--sp-2)',
      }}>
        <h2 className="t-h1" style={{ color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
        {note && (
          <span className="t-micro" style={{ color: 'var(--sev-active)', textAlign: 'right' }}>
            {note}
          </span>
        )}
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
  const status = usePanelStatus(panelId);
  const setDossier = useSession((s) => s.setDossier);
  const agent = useAgentCache();
  const incident = useSelectedIncident();

  // Demo mode is B-17 throughout, so its captured frames are always in scope.
  // Live mode holds imagery for B-17 and nothing else.
  const captured = mode === 'demo' || hasCapturedEvidence(panelId);

  // The dossier being open is not the same claim as the scan having reached a
  // given pass. It opens when the first frames come back, so the matrix must
  // still be gated on the THERMAL beat — otherwise its heading announces a
  // measurement eight seconds before the sensor has taken it.
  const scanClock = useInspectionClock();
  const scanned = scanClock >= BEAT.rgbScan;
  const thermal = scanClock >= BEAT.thermalScan;

  if (!open || !panel) return null;

  const critical = status === 'critical';
  const statusColour = critical ? 'var(--sev-critical)'
    : status === 'scheduled' ? 'var(--panel-scheduled)'
      : status === 'warning' ? 'var(--sev-warning)' : 'var(--sev-active)';

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
          padding: 'var(--sp-3) var(--sp-5)',
          borderBottom: '1px solid var(--line-active)',
          background: 'var(--surface-raised)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)' }}>
            <span style={{
              display: 'grid', gap: 2,
              borderRight: '1px solid var(--line-active)', paddingRight: 'var(--sp-5)',
            }}>
              <span className="t-h1" style={{ color: 'var(--text-primary)' }}>
                Inspection dossier
              </span>
              <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
                ZONE {panel.zone} · {panel.inverterId}
              </span>
            </span>

            <span className="t-kpi" style={{ color: 'var(--sev-active)' }}>{panelId}</span>

            <span className="chip" style={{ background: statusColour }}>
              {status.toUpperCase()}
            </span>
          </div>

          <button
            type="button"
            className="btn-reset t-h2"
            onClick={() => setDossier(false)}
            aria-label="Close the inspection dossier"
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
              color: 'var(--text-secondary)', padding: '6px var(--sp-3)',
            }}
          >
            Close · Esc
            <X size={17} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="dossier-body">
          {/* THE ARGUMENT, down the left. A reader who has never seen this product
              needs to know what is being claimed and on what basis before they are
              shown a thermal grid, otherwise the grid is a pretty rectangle. It
              was a full-width band above the material, which on a laptop pushed
              the captured frames below the fold: the operator had to scroll to
              reach the photograph the drone was sent for. */}
          <div className="dossier-col" style={{ borderRight: '1px solid var(--line-active)' }}>
            <Section title="How this conclusion was reached">
              <EvidenceChain incident={incident} />
            </Section>
          </div>

          {/* THE MATERIAL, down the right: what a sensor read, then what a model
              made of it. Two different kinds of claim, in that order. */}
          <div className="dossier-col">
            {scanned && captured && (
              <Section title="Captured evidence" note="drone capture">
                <EvidenceStrip />
              </Section>
            )}

            {/* THE DETECTOR, RUN HERE. Not gated on captured evidence: it takes
                the drone's CURRENT camera frame out of the 3D scene, so it works
                for any array the aircraft is looking at. What it must never do is
                draw a box it did not get from the model, see LiveDetection. */}
            <Section title="Run the detector now" note="live, in this browser">
              <LiveDetection />
            </Section>

            {thermal && captured && (
              <Section title="Anomaly matrix" note="5 x 7 array mapping">
                <AnomalyMatrix />
              </Section>
            )}

            {/* One sentence where the imagery would have been. Absent means absent
               , no placeholder grid, no skeleton, no greyed-out frames. */}
            {!captured && (
              <Section title="Captured evidence">
                <p className="t-prose" style={{
                  color: 'var(--text-secondary)', margin: 0, fontSize: 13, lineHeight: 1.5,
                }}>
                  No imagery is held on file for {panelId}. The committed capture in this
                  build is B-17&rsquo;s, and showing it here would be presenting one
                  array&rsquo;s evidence as another&rsquo;s. Everything to the left rests on
                  the site model, not on a photograph.
                </p>
              </Section>
            )}

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

            {/* SCOPED. `Findings` renders the COMMITTED cache, which is B-17's and
                only B-17's, so gating it on `agent` alone printed "INV-B output is
                -58.4%... string B-17-S3... 5 of 7 strings faulted" underneath
                A-08. That is the tenth instance of this project's most repeated
                bug and it was introduced by adding a section without asking whose
                data it was. Every new surface has to answer that question. */}
            {agent && captured && (
              <Section title="Findings" note="from the committed B-17 run">
                <Findings />
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
