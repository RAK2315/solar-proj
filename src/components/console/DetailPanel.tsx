'use client';

/**
 * DetailPanel — the right rail.
 *
 * SECTIONS APPEAR PROGRESSIVELY, NEVER ALL AT ONCE. An empty right rail at t=0
 * that fills up as the agent works is the visual proof that something is happening
 * — and plan/04 §4 is explicit that "not yet" means absent from the DOM, not
 * greyed out. The rail is genuinely shorter early on.
 *
 * WHY IT WAS SPLIT. The rail was reorganised once from twelve peer sections into
 * five groups, which fixed the ORDER and did nothing for the DENSITY: it still
 * rendered ~25 facts at equal weight, three prose paragraphs, a 5×7 grid, a chart
 * and a four-step list, all expanded, in a 448px column, on a projector.
 *
 * The second cut is by KIND, not topic. This rail answers three questions and
 * stops:
 *
 *   STATE      what is this array doing, and how bad is it
 *   OUTLOOK    what does the weather do to it, and by when must someone act
 *   DECISION   what is the operator being asked to authorise
 *
 * The evidence — captured frames, the cell grid, the agent's full reasoning — is
 * a different kind of claim and it lives in `Dossier`, over the map, at a size
 * that suits it. The rail carries a control that opens it and a one-line summary
 * of what is in it, so nothing is hidden, only relocated.
 *
 * Each group is one claim. A block with nothing to say is absent, not apologetic.
 */

import { hasCapturedEvidence } from '@/lib/data';
import { useSession } from '@/store/session';
import {
  BEAT, useAfter, useAgentCache, useCellGrid, useEvidence, useHasSelection,
  useInspected, useInspectionClock, useIsDark, useMode, usePanelStatus,
  useSelectedPanelId,
} from '@/store/selectors';
import { DispatchPanel } from './DispatchPanel';
import { LiveTriage } from './LiveTriage';
import { AgentReasoning } from './AgentReasoning';
import { AnalysisBlock } from './AnalysisBlock';
import { ApprovalBar } from './ApprovalBar';
import { ForecastBand } from './ForecastBand';
import { InverterTable } from './InverterTable';
import { Recommendation } from './Findings';
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
        marginTop: 'var(--sp-5)', paddingTop: 'var(--sp-4)',
        display: 'grid', gap: 'var(--sp-4)', scrollMarginTop: 72,
      }}
    >
      <div>
        <h2 className="t-h1" style={{ color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
        {claim && (
          <p className="t-micro" style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
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
  const grid = useCellGrid();
  const setDossier = useSession((s) => s.setDossier);
  const demoTriaged = useAfter(BEAT.triage);
  const demoScanned = useAfter(BEAT.rgbScan);
  const demoThermal = useAfter(BEAT.thermalScan);
  const demoPrognosed = useAfter(BEAT.prognosis);
  const demoRecommended = useAfter(BEAT.recommendation);

  // Demo mode reveals sections on the script's beats. Live mode reveals them when
  // the corresponding thing has ACTUALLY happened — an array is selected, a drone
  // has been and looked. Same components, two different reasons to appear.
  //
  // The two IMAGING gates run on the inspection clock rather than on `inspected`,
  // so a live capture plays out on its own beats the way the scripted one does:
  // RGB while the drone is on station, then the grid filling cell by cell. Gating
  // them on "the mission finished" made the evidence arrive as one finished block
  // after the fact, which reads as a lookup rather than a sensor.
  const scanClock = useInspectionClock();
  const triaged = mode === 'demo' ? demoTriaged : hasSelection;
  const scanned = mode === 'demo' ? demoScanned : scanClock >= BEAT.rgbScan;
  const thermal = mode === 'demo' ? demoThermal : scanClock >= BEAT.thermalScan;
  const prognosed = mode === 'demo' ? demoPrognosed : inspected;
  const recommended = mode === 'demo' ? demoRecommended : inspected;
  const evidence = useEvidence();
  const agent = useAgentCache();

  const hasFrames = Boolean(
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
        <span className="t-label" style={{ color: 'var(--text-secondary)' }}>Selected</span>
        <h1 style={{
          font: '400 30px var(--font-mono)', color: 'var(--text-primary)',
          margin: '4px 0 0', letterSpacing: '0.02em', lineHeight: 1.05,
        }}>
          {triaged
            ? <>PANEL <strong style={{ fontWeight: 700 }}>{panelId}</strong></>
            : 'NO ARRAY SELECTED'}
        </h1>
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
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
        <p className="t-data" style={{ color: 'var(--text-secondary)', paddingTop: 'var(--sp-4)' }}>
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
      {/* The rail carries the TRIAGE verdict and nothing deeper. §2 has that card
          streaming into the console at t=10, so it cannot simply move out — but
          three stacked prose stages in a 448px column were a third of the density
          problem on their own. Prognosis and recommendation are read in the
          dossier, where there is room for them. */}
      {mode === 'demo' && agent && triaged && (
        <Group title="Assessment" claim={`Cached agent run · ${agent.meta.model}`}>
          <AgentReasoning stages="triage" />
        </Group>
      )}

      {mode === 'live' && triaged && (
        <Group title="Assessment" claim="Run against this array's telemetry, then cross-checked against it.">
          <LiveTriage compact />
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

          {/* The evidence itself is in the dossier. What belongs HERE is the one
              line that says it exists and the control that opens it — a summary
              an operator can act on, not the material itself. */}
          {thermal && captured && (
            <>
              <button
                type="button"
                className="btn-reset t-h2"
                onClick={() => setDossier(true)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  gap: 'var(--sp-3)', width: '100%',
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--sev-active)',
                  color: 'var(--sev-active)',
                  padding: 'var(--sp-3) var(--sp-4)',
                }}
              >
                <span>Open inspection dossier</span>
                <span aria-hidden>→</span>
              </button>
              <p className="t-data" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                {grid.defects.length} anomalous cells in {grid.clusters} cluster
                {hasFrames && ', with the captured thermal and RGB frames'}.
              </p>
            </>
          )}

          {/* An array we hold no imagery for gets one sentence at the point where
              the imagery would have been, rather than a header explaining an
              absence. Absent means absent — never a placeholder, never a skeleton. */}
          {thermal && !captured && (
            <p className="t-data" style={{ color: 'var(--text-secondary)', margin: 0 }}>
              No cell-level capture on file for {panelId}. The committed imagery in
              this build covers B-17 only, so there is nothing measured to localise
              here — the telemetry and the assessment above are computed for{' '}
              {panelId} specifically and are unaffected.
            </p>
          )}

          {scanned && !thermal && (
            <p className="t-data" style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Surface pass under way over {panelId}.
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
