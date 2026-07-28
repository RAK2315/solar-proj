'use client';

/**
 * ConsoleRoot — the operator console shell. Fixed 1920×1080, three columns.
 *
 * PHASE 2: structure only. Every dashed box is a named slot that a real component
 * fills at Phase 4; the slot list is the Phase 4 build order.
 *
 * This component must stay a pure function of the store with no route-level state,
 * because at Phase 7 the cinematic view renders a SECOND instance of it at
 * scale(0.31) as the PiP. Two live instances, one clock — that is what makes the
 * PiP persuasive rather than decorative.
 */

import { useDemoClock } from '@/store/demoClock';

function Slot({
  label, area, note, className = '',
}: { label: string; area?: string; note?: string; className?: string }) {
  return (
    <div className={`slot ${area ?? ''} ${className}`}>
      <span className="t-h2" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      {note && <span className="t-micro">{note}</span>}
    </div>
  );
}

export function ConsoleRoot() {
  const approved = useDemoClock((s) => s.approved);

  return (
    <div className="console-root">
      <header
        className="area-header panel hair-b"
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)', padding: '0 var(--sp-5)' }}
      >
        <div>
          <div className="t-h1" style={{ color: 'var(--sev-active)' }}>SURYA AGENT</div>
          <div className="t-micro" style={{ color: 'var(--text-muted)' }}>
            BHADLA SOLAR PARK · RAJASTHAN
          </div>
        </div>
        <Slot label="Farm health" note="HeaderBar — KPI + sparkline" className="flex-1" />
        <Slot label="Output" note="MW" className="flex-1" />
        <Slot label="Anomalies / critical" note="derived from panel status" className="flex-1" />
        <Slot label="Weather · 72h outlook" note="forecast.json" className="flex-1" />
      </header>

      <aside
        className="area-left panel hair-r"
        style={{ display: 'grid', gridTemplateRows: '1fr auto auto', gap: 'var(--sp-3)', padding: 'var(--sp-3)' }}
      >
        <Slot label="Live events" note="EventFeed · EventCard" />
        <Slot label="Drone status" note="DroneStatus — 01 / 02, battery" />
        <Slot label="Signal quality" note="SignalQuality — up / down" />
      </aside>

      <main className="area-map inset" style={{ padding: 'var(--sp-3)' }}>
        <Slot
          label="Farm map"
          note="FarmMap · PanelCell · DroneRoute — SVG, 120 arrays, 3 zones, hatch on anomalies"
          className="h-full"
        />
      </main>

      <section
        className="area-right panel hair-l"
        style={{ display: 'grid', gridTemplateRows: 'repeat(6, 1fr) auto', gap: 'var(--sp-2)', padding: 'var(--sp-3)', overflowY: 'auto' }}
      >
        <Slot label="Evidence" note="EvidenceStrip · InverterAudio · FlyoverPlayer" />
        <Slot label="Anomaly matrix" note="AnomalyMatrix — 5×7, ironbow, sequential fill t=48..56" />
        <Slot label="Analysis · findings" note="AnalysisBlock · cell defect list" />
        <Slot label="Inverter comparison" note="InverterTable — peer strings, C17" />
        <Slot label="Agent reasoning" note="AgentReasoning — TRIAGE · PROGNOSIS · model ID" />
        <Slot label="Forecast · timeline" note="ForecastBand · Timeline" />
        <div
          className="slot"
          style={{
            borderStyle: 'solid',
            borderColor: approved ? 'var(--panel-scheduled)' : 'var(--sev-critical)',
            color: approved ? 'var(--panel-scheduled)' : 'var(--sev-critical)',
          }}
        >
          <span className="t-h1">
            {approved ? '✓ WORK ORDER #INC-B17 CREATED' : 'APPROVE — CREATE WORK ORDER →'}
          </span>
          <span className="t-micro">ApprovalBar — the human gate</span>
        </div>
      </section>

      <footer
        className="area-footer panel hair-t"
        style={{ display: 'flex', alignItems: 'center', padding: '0 var(--sp-5)' }}
      >
        <Slot label="Repair queue" note="RepairQueueBar — 4 tasks, deterministic ranking" className="flex-1" />
      </footer>
    </div>
  );
}
