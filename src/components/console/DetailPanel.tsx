'use client';

/**
 * DetailPanel — the right rail.
 *
 * SECTIONS APPEAR PROGRESSIVELY, NEVER ALL AT ONCE. An empty right rail at t=0
 * that fills up as the agent works is the visual proof that something is happening
 * — and plan/04 §4 is explicit that "not yet" means absent from the DOM, not
 * greyed out. The rail is genuinely shorter early on.
 *
 * WHY IT LOOKS LIKE THIS. The rail was reorganised once from twelve peer sections
 * into five groups, which fixed the ORDER and did nothing for the DENSITY: it still
 * rendered ~25 facts at equal weight in a 448px column, on a projector.
 *
 * It now reads top to bottom as one argument, and each step is a different SHAPE
 * so an operator can find the step they want without reading:
 *
 *   a pinned header       which array, and how bad — always visible while scrolling
 *   a keyed diagnostic    the verdict, in one sentence, on a red edge
 *   two 42px figures      the two numbers the decision turns on
 *   a 2x2 of readings     the supporting telemetry, quiet
 *   the peer table        the comparison that makes the fault self-evident
 *   the agent card        prose, in a teal box, clearly a different kind of claim
 *   one control           the dossier, where the evidence is
 *   the outlook           the forecast, and the deadline
 *   the gate              pinned to the bottom, the only thing that is red
 *
 * The evidence itself — captured frames, the cell grid, the full three-stage
 * reasoning — is a different kind of claim and it lives in `Dossier`, over the map,
 * at a size that suits it.
 */

import { X } from 'lucide-react';

import { hasCapturedEvidence } from '@/lib/data';
import { useSession } from '@/store/session';
import {
  BEAT, useAfter, useAgentCache, useCellGrid, useEvidence, useHasSelection,
  useDeferOutcomes, useInspected, useInspectionClock, useIsDark, useLiveQueue,
  useMode, usePanelStatus, useSelectedPanelId,
} from '@/store/selectors';
import { DispatchPanel } from './DispatchPanel';
import { LiveTriage } from './LiveTriage';
import { AgentReasoning } from './AgentReasoning';
import { AnalysisBlock } from './AnalysisBlock';
import { ApprovalBar } from './ApprovalBar';
import { CostOfWaiting } from './CostOfWaiting';
import { ForecastBand } from './ForecastBand';
import { InverterTable } from './InverterTable';
import { Recommendation } from './Findings';
import { StatusChips } from './StatusChips';
import { Timeline } from './Timeline';

/**
 * A titled step of the argument. The rule above the heading is doing the structural
 * work — the previous rail separated its sections with 12px of space and nothing
 * else, which is why it read as one undifferentiated wall.
 */
function Group({ id, title, note, children }: {
  id?: string; title: string; note?: string; children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      style={{
        borderTop: '1px solid var(--line-active)',
        paddingTop: 'var(--sp-4)',
        display: 'grid', gap: 'var(--sp-4)', scrollMarginTop: 96,
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        gap: 'var(--sp-3)',
      }}>
        <h2 className="t-h1" style={{ color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
        {note && (
          <span className="t-micro" style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>
            {note}
          </span>
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
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          borderBottom: '1px solid var(--line-hairline)', paddingBottom: 4,
        }}>
          <span className="t-h2" style={{ color: 'var(--text-secondary)' }}>{label}</span>
          {note && (
          <span className="t-micro workings" style={{ color: 'var(--text-secondary)' }}>
            {note}
          </span>
        )}
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
  const deferOutcomes = useDeferOutcomes(panelId);
  const { tasks: queueTasks } = useLiveQueue();
  const deadlineHours = queueTasks.find((t) => t.panelId === panelId)?.hoursUntilDeadline ?? null;
  const grid = useCellGrid();
  const setDossier = useSession((s) => s.setDossier);
  const selectPanel = useSession((s) => s.selectPanel);
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

  const critical = selectedStatus === 'critical';
  const statusColour = critical ? 'var(--sev-critical)'
    : selectedStatus === 'scheduled' ? 'var(--panel-scheduled)'
      : selectedStatus === 'warning' ? 'var(--sev-warning)' : 'var(--sev-active)';

  return (
    <section
      className="area-right panel hair-l"
      style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: 0 }}
    >
      {/* Which array, and how bad. Pinned rather than scrolled away, because every
          figure below it is meaningless without the ID it belongs to. */}
      <header style={{
        padding: 'var(--sp-4)',
        borderBottom: '1px solid var(--line-active)',
        background: 'var(--surface-void)',
        display: 'grid', gap: 'var(--sp-3)',
        position: 'relative',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          gap: 'var(--sp-3)',
        }}>
          <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
            <h1
              className="t-h1"
              style={{
                margin: 0, letterSpacing: '0.2em',
                color: triaged && critical ? 'var(--sev-critical-ink)' : 'var(--text-primary)',
              }}
            >
              {triaged ? `PANEL ${panelId}` : 'NO ARRAY SELECTED'}
            </h1>
            <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
              {!triaged
                ? (mode === 'live' ? 'SELECT AN ARRAY ON THE MAP' : 'AWAITING TRIAGE')
                : mode === 'demo'
                  ? 'ZONE B · INV-B · STRING B-17-S3 · MODULE B2-07'
                  : `ZONE ${panelId[0]} · INV-${panelId[0]}`}
              {triaged && dark && (
                <span style={{ color: 'var(--sev-warning)' }}> · NIGHT</span>
              )}
            </span>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flex: '0 0 auto',
          }}>
            {triaged && (
              <span className="chip" style={{
                background: statusColour,
                color: 'var(--text-inverse)',
              }}>
                {selectedStatus.toUpperCase()}
              </span>
            )}

            {/* CLOSE. The panel is a box that opens on a question and should shut
                when the question is answered — without it the only way back to a
                clear map was to reload. `Esc` does the same thing.

                In the row rather than pinned to the corner: absolutely positioned
                it sat straight on top of the status chip, and "CRITICAL" and the
                close control rendered as one unreadable smear.

                Live mode only — the scripted demo needs the panel up for its beats
                and has no operator to close it. */}
            {mode === 'live' && (
              <button
                type="button"
                className="btn-reset"
                onClick={() => selectPanel(null)}
                aria-label="Close the array panel"
                title="Close · Esc"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  color: 'var(--text-secondary)', padding: '3px 5px',
                  border: '1px solid var(--line-active)',
                }}
              >
                <span className="t-micro">ESC</span>
                <X size={12} strokeWidth={2} aria-hidden />
              </button>
            )}
          </div>
        </div>

        {/* The verdict in one sentence, on a keyed edge. The chips it replaces were
            two badges and three fragments; this is the same facts as a claim. */}
        {triaged && <StatusChips />}
      </header>

      {/* `rail-body` is what makes this wrap into columns inside the wide card —
          see globals.css. The grid fallback here is what the demo's docked rail
          still uses, where the column IS the right shape. */}
      <div className="scroll-y rail-body" style={{
        padding: 'var(--sp-4)', display: 'grid', gap: 'var(--sp-4)',
        alignContent: 'start',
      }}>
        {!triaged && (
          <p className="t-prose" style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {mode === 'live'
              ? 'Click any array on the map to inspect it.'
              : 'Fleet nominal. Detail opens when the agent triages an anomaly.'}
          </p>
        )}

        {/* ── 1. STATE ─────────────────────────────────────────────────────── */}
        {/* No heading. The two 42px figures ARE the heading — a "STATE" label above
            them would be the loudest thing in the region competing with them. */}
        <div className="rail-wide">{triaged && <AnalysisBlock />}</div>

        {/* Withheld at night for the same reason the deviation above it is: with no
            sun, actual and expected are both zero on every inverter, and three rows
            of 0.00 kW / 0.0 % is a comparison that says a faulted string looks
            exactly like a healthy one. It became possible to print it only once the
            table started reading the live model instead of the demo's frame zero —
            night.test.tsx caught it the same hour. */}
        {triaged && !dark && (
          <Group title="Peer strings" note="same position, each inverter">
            <InverterTable />
          </Group>
        )}

        {/* ── 2. ASSESSMENT ────────────────────────────────────────────────── */}
        {/* The rail carries the TRIAGE verdict and nothing deeper. §2 has that card
            streaming into the console at t=10, so it cannot simply move out — but
            three stacked prose stages in a 448px column were a third of the density
            problem on their own. Prognosis and recommendation are read in the
            dossier, where there is room for them. */}
        {/* THE HEADING IS DELIBERATELY MODEST. "Agent assessment" put the language
            model's box where the reader's eye lands and let it stand for the whole
            system, which is backwards: the physics computes, the model narrates.
            Naming it for what it does — and stating in the note that it explains
            figures it was handed rather than producing them — is both more honest
            and, in front of somebody deciding whether to believe any of this,
            considerably more persuasive. */}
        {mode === 'demo' && agent && triaged && (
          <Group
            title="Why the system thinks this"
            note={`${agent.meta.model} · explains the figures above, never sources them`}
          >
            <AgentReasoning stages="triage" />
          </Group>
        )}

        {mode === 'live' && triaged && (
          <Group
            title="Why the system thinks this"
            note="every number it writes is checked against this array before it is shown"
          >
            <LiveTriage compact />
          </Group>
        )}

        {/* ── 3. INSPECTION ────────────────────────────────────────────────── */}
        {triaged && (
          <Group
            id="rail-inspection"
            title="Inspection"
            note="telemetry says which · imaging says why"
          >
            {mode === 'live' && <DispatchPanel />}

            {/* THE CONTROL IS NO LONGER GATED ON IMAGERY. The dossier used to be
                the imagery viewer, so opening it without a capture would have been
                opening an empty box. It is the INCIDENT FILE now — the evidence
                chain inside it is derivable for all 120 arrays — and gating the
                product's central argument on the one array that happens to have a
                photograph would have hidden it from 119 of them.

                The scoping did not lift, it MOVED: the imagery column inside the
                dossier carries it, which is the only part that was ever scoped. */}
            <button
              type="button"
              className="btn-reset t-h1"
              onClick={() => setDossier(true)}
              style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                gap: 'var(--sp-2)', width: '100%',
                background: 'transparent',
                border: '1px solid var(--sev-active)',
                color: 'var(--sev-active)',
                padding: 'var(--sp-3)',
              }}
            >
              {thermal && captured ? 'Open inspection dossier' : 'Open incident file'}
              <span aria-hidden>→</span>
            </button>
            <p className="t-data" style={{ color: 'var(--text-secondary)', margin: 0 }}>
              {thermal && captured
                ? <>
                    {grid.defects.length} anomalous cells in {grid.clusters} cluster
                    {hasFrames && ', with the captured thermal and RGB frames'}.
                  </>
                : 'The full chain of reasoning: what was observed, what was checked, '
                  + 'what it means, and what a person decided.'}
            </p>

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
            badge and the deadline are NOT the site's — they are the prognosis for
            the cracked cell, computed from its own thermal dose. */}
        {prognosed && (
          <Group title="Outlook" note="72 h forecast · cost of waiting">
            <ForecastBand showRisk={captured} />

            {/* THE DECISION-SUPPORT STEP, and the only thing on this screen that a
                detector plus a dashboard could not produce. The band above says
                what the weather does; this says what WAITING does, which is the
                question the operator is actually holding.

                Not gated on captured evidence: the calculation is the array's own
                shortfall against the committed forecast, and it needs no
                photograph. It is gated on there being a loss to weigh at all —
                CostOfWaiting renders nothing for an array that is not losing. */}
            <CostOfWaiting
              outcomes={deferOutcomes}
              hoursUntilDeadline={deadlineHours}
            />
          </Group>
        )}

        {/* ── 5. DECISION ──────────────────────────────────────────────────── */}
        {triaged && (
          <Group title="Decision" note="nothing is queued without an operator">
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
      </div>

      <ApprovalBar />
    </section>
  );
}
