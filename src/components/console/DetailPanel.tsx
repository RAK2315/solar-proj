'use client';

/**
 * DetailPanel — the right rail.
 *
 * SECTIONS APPEAR PROGRESSIVELY, NEVER ALL AT ONCE. An empty right rail at t=0
 * that fills up as the agent works is the visual proof that something is happening
 * — and plan/04 §4 is explicit that "not yet" means absent from the DOM, not
 * greyed out. The rail is genuinely shorter early on.
 *
 * WHY IT WAS REORGANISED. The rail used to be twelve peer sections in the order
 * they were built, which on a healthy array opened with "Anomaly matrix — no
 * capture on file": the first thing it said about C-29 was a paragraph about
 * something it did not have. Twelve equal headers also carry no argument. They
 * are now FIVE GROUPS in the order an operator reasons:
 *
 *   STATE       what the array is doing, measured
 *   ASSESSMENT  what the agent makes of it, and how sure
 *   INSPECTION  what a drone was sent to find out, and what came back
 *   OUTLOOK     what the weather does to it over 72 hours
 *   DECISION    what the operator is being asked to authorise
 *
 * Each group is one claim. Blocks inside a group are the evidence for it, and a
 * block with nothing to say is absent rather than apologetic.
 */

import { hasCapturedEvidence } from '@/lib/data';
import {
  BEAT, useAfter, useAgentCache, useDetection, useEvidence, useHasSelection,
  useInspected, useIsDark, useMode, usePanelStatus, useSelectedPanelId,
} from '@/store/selectors';
import { DispatchPanel } from './DispatchPanel';
import { LiveTriage } from './LiveTriage';
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

/** One step of the argument. Anchored so other controls can scroll to it. */
function Group({ id, title, claim, children }: {
  id?: string; title: string; claim?: string; children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      style={{
        borderTop: '1px solid var(--line-active)',
        marginTop: 'var(--sp-4)', paddingTop: 'var(--sp-3)',
        display: 'grid', gap: 'var(--sp-3)', scrollMarginTop: 72,
      }}
    >
      <div>
        <h2 className="t-h1" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        {claim && (
          <p className="t-micro" style={{ color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {claim}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

/** A piece of evidence inside a group. Quiet — the group carries the heading. */
function Block({ label, note, children }: {
  label?: string; note?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="t-h2" style={{ color: 'var(--text-secondary)' }}>{label}</span>
          {note && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{note}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

export function DetailPanel() {
  const mode = useMode();
  const panelId = useSelectedPanelId();
  const selectedStatus = usePanelStatus(panelId);
  const inspected = useInspected(panelId);
  const hasSelection = useHasSelection();
  const dark = useIsDark();
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

  // Cell-level findings are a MEASUREMENT of one specific array. We hold a real
  // thermal capture for B-17 and for nothing else, so every other array gets told
  // that plainly instead of being shown B-17's grid under its own name.
  const captured = mode === 'demo' || hasCapturedEvidence(panelId);

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
          {triaged && dark && (
            <span style={{ color: 'var(--sev-warning)', marginLeft: 8 }}>· NIGHT</span>
          )}
        </span>
      </div>

      {!triaged && (
        <p className="t-data" style={{ color: 'var(--text-muted)', paddingTop: 'var(--sp-4)' }}>
          {mode === 'live'
            ? 'Click any array on the map to inspect it.'
            : 'Fleet nominal. Detail opens when the agent triages an anomaly.'}
        </p>
      )}

      {/* ── 1. STATE ─────────────────────────────────────────────────────── */}
      {triaged && (
        <Group title="State" claim={`What ${panelId} is doing right now, from the site model.`}>
          <StatusChips />
          <AnalysisBlock />
          <Block label="Peer strings" note="same position, each inverter">
            <InverterTable />
          </Block>
        </Group>
      )}

      {/* ── 2. ASSESSMENT ────────────────────────────────────────────────── */}
      {/* Demo mode shows the cached three-stage reasoning about B-17. Live mode
          asks the model about whichever array is selected — and says so when it
          cannot, rather than showing B-17's prose over someone else's array. */}
      {mode === 'demo' && agent && triaged && (
        <Group title="Assessment" claim={`Cached agent run · ${agent.meta.model}`}>
          <AgentReasoning />
        </Group>
      )}

      {mode === 'live' && triaged && (
        <Group title="Assessment" claim="Run against this array's telemetry, then cross-checked against it.">
          <LiveTriage />
        </Group>
      )}

      {/* ── 3. INSPECTION ────────────────────────────────────────────────── */}
      {triaged && (
        <Group
          id="rail-inspection"
          title="Inspection"
          claim="Telemetry says an array is down. Only imaging says why."
        >
          {mode === 'live' && <DispatchPanel />}

          {scanned && hasEvidence && (
            <Block label="Evidence" note={detection ? detection.model : 'drone capture'}>
              <EvidenceStrip />
            </Block>
          )}

          {thermal && captured && (
            <>
              <Block label="Anomaly matrix" note="5 × 7 cells, measured">
                <AnomalyMatrix />
              </Block>
              <Block label="Cell defects" note="classical CV, not a model">
                <CellDefectList />
              </Block>
              {agent && (
                <Block label="Findings">
                  <Findings />
                </Block>
              )}
            </>
          )}

          {/* Not a section of its own any more. An array we hold no imagery for
              gets one sentence at the point where the imagery would have been,
              rather than a three-paragraph header explaining an absence. */}
          {thermal && !captured && (
            <p className="t-data" style={{ color: 'var(--text-secondary)', margin: 0 }}>
              No cell-level capture on file for {panelId}. The committed imagery in
              this build covers B-17 only, so there is nothing measured to localise
              here — the telemetry and the assessment above are computed for{' '}
              {panelId} specifically and are unaffected.
            </p>
          )}
        </Group>
      )}

      {/* ── 4. OUTLOOK ───────────────────────────────────────────────────── */}
      {/* The weather is the site's, so the band is shown for any array. The RISK
          badge and the 14:00 deadline are NOT the site's — they are the prognosis
          for the cracked cell, computed from its own thermal dose. */}
      {prognosed && (
        <Group title="Outlook" claim="72 hours of forecast, and what it costs to wait.">
          <ForecastBand showRisk={captured} />
        </Group>
      )}

      {/* ── 5. DECISION ──────────────────────────────────────────────────── */}
      {triaged && (
        <Group title="Decision" claim="Nothing enters the work queue without an operator.">
          {recommended && agent && captured && (
            <Block label="Recommended action">
              <Recommendation />
            </Block>
          )}
          <Block label="Timeline">
            <Timeline />
          </Block>
        </Group>
      )}

      <div style={{ marginTop: 'auto' }}>
        <ApprovalBar />
      </div>
    </section>
  );
}
