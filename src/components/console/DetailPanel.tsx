'use client';

/**
 * DetailPanel — the right rail.
 *
 * SECTIONS APPEAR PROGRESSIVELY, NEVER ALL AT ONCE. An empty right rail at t=0
 * that fills up as the agent works is the visual proof that something is happening
 * — and plan/04 §4 is explicit that "not yet" means absent from the DOM, not
 * greyed out. The rail is genuinely shorter early on.
 *
 * Section order follows the reference console: evidence → localisation → analysis
 * → findings → cell defects → recommendation → verdict → inverter comparison →
 * agent reasoning → outlook → timeline → the gate.
 */

import {
  BEAT, useAfter, useAgentCache, useDetection, useEvidence, useHasSelection,
  useInspected, useMode, usePanelStatus, useSelectedPanelId,
} from '@/store/selectors';
import { DispatchPanel } from './DispatchPanel';
import { AgentReasoning } from './AgentReasoning';
import { AnalysisBlock } from './AnalysisBlock';
import { AnomalyMatrix } from './AnomalyMatrix';
import { ApprovalBar } from './ApprovalBar';
import { EvidenceStrip } from './EvidenceStrip';
import { CellDefectList, Findings, Recommendation } from './Findings';
import { ForecastBand } from './ForecastBand';
import { InverterTable } from './InverterTable';
import { StatusChips } from './StatusChips';
import { Timeline } from './Timeline';

function Section({ title, note, children }: {
  title: string; note?: string; children: React.ReactNode;
}) {
  return (
    <section style={{
      borderTop: '1px solid var(--line-hairline)',
      padding: 'var(--sp-3) 0',
      display: 'grid', gap: 'var(--sp-3)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 className="t-h1" style={{ color: 'var(--text-secondary)' }}>{title}</h2>
        {note && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{note}</span>}
      </div>
      {children}
    </section>
  );
}

export function DetailPanel() {
  const mode = useMode();
  const panelId = useSelectedPanelId();
  const selectedStatus = usePanelStatus(panelId);
  const inspected = useInspected(panelId);
  const hasSelection = useHasSelection();
  const demoTriaged = useAfter(BEAT.triage);
  const demoScanned = useAfter(BEAT.rgbScan);
  const demoThermal = useAfter(BEAT.thermalScan);
  const demoPrognosed = useAfter(BEAT.prognosis);
  const demoRecommended = useAfter(BEAT.recommendation);

  // Demo mode reveals sections on the script's beats. Live mode reveals them when
  // the corresponding thing has ACTUALLY happened — an array is selected, a drone
  // has been and looked. Same components, two different reasons to appear.
  const triaged = mode === 'demo' ? demoTriaged : hasSelection;
  const scanned = mode === 'demo' ? demoScanned : inspected;
  const thermal = mode === 'demo' ? demoThermal : inspected;
  const prognosed = mode === 'demo' ? demoPrognosed : inspected;
  const recommended = mode === 'demo' ? demoRecommended : inspected;
  const evidence = useEvidence();
  const detection = useDetection();
  const agent = useAgentCache();

  const hasEvidence = Boolean(
    evidence.thermal || evidence.rgb || evidence.rgbAnnotated
    || evidence.audio || evidence.flyover,
  );

  return (
    <section
      className="area-right panel hair-l"
      style={{
        display: 'flex', flexDirection: 'column',
        padding: '0 var(--sp-4) var(--sp-4)',
        overflowY: 'auto', minHeight: 0,
      }}
    >
      <div style={{
        position: 'sticky', top: 0, zIndex: 1,
        background: 'var(--surface-panel)', padding: 'var(--sp-4) 0 var(--sp-3)',
        borderBottom: '1px solid var(--line-hairline)',
      }}>
        <span className="t-h2" style={{ color: 'var(--text-muted)' }}>Selected</span>
        <h1 style={{
          font: '400 21px var(--font-mono)', color: 'var(--text-primary)',
          margin: '2px 0 0', letterSpacing: '0.04em',
        }}>
          {triaged
            ? <>PANEL <strong style={{ fontWeight: 700 }}>{panelId}</strong></>
            : 'NO ARRAY SELECTED'}
        </h1>
        <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
          {!triaged
            ? (mode === 'live' ? 'Select an array on the map' : 'Awaiting triage')
            : mode === 'demo'
              ? 'ZONE B · INV-B · STRING B-17-S3 · MODULE B2-07'
              : `ZONE ${panelId[0]} · INV-${panelId[0]} · ${selectedStatus.toUpperCase()}`}
        </span>
      </div>

      {!triaged && (
        <p className="t-data" style={{ color: 'var(--text-muted)', paddingTop: 'var(--sp-4)' }}>
          {mode === 'live'
            ? 'Click any array on the map to inspect it.'
            : 'Fleet nominal. Detail opens when the agent triages an anomaly.'}
        </p>
      )}

      {scanned && hasEvidence && (
        <Section title="Evidence" note={detection ? detection.model : 'drone capture'}>
          <EvidenceStrip />
        </Section>
      )}

      {thermal && (
        <Section title="Anomaly matrix" note="5 × 7 cells, measured">
          <AnomalyMatrix />
        </Section>
      )}

      {mode === 'live' && triaged && (
        <Section title="Inspection">
          <DispatchPanel />
        </Section>
      )}

      {triaged && (
        <Section title="Analysis">
          <AnalysisBlock />
        </Section>
      )}

      {thermal && agent && (
        <Section title="Findings">
          <Findings />
        </Section>
      )}

      {thermal && (
        <Section title="Cell defects" note="classical CV, not a model">
          <CellDefectList />
        </Section>
      )}

      {recommended && agent && (
        <Section title="Recommendation">
          <Recommendation />
        </Section>
      )}

      {triaged && (
        <Section title="Verdict">
          <StatusChips />
          <InverterTable />
        </Section>
      )}

      {agent && triaged && (
        <Section title="Agent reasoning" note={`cached · ${agent.meta.model}`}>
          <AgentReasoning />
        </Section>
      )}

      {prognosed && (
        <Section title="72-hour outlook">
          <ForecastBand />
        </Section>
      )}

      {triaged && (
        <Section title="Timeline">
          <Timeline />
        </Section>
      )}

      <div style={{ marginTop: 'auto' }}>
        <ApprovalBar />
      </div>
    </section>
  );
}
