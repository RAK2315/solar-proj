'use client';

/**
 * The incident screen: one array's problem as a chain of evidence, and what it
 * costs to wait.
 */

import { Activity, Check, ChevronDown, ClipboardCheck, Search, TrendingDown, ScanSearch, UserCheck } from 'lucide-react';
import { MWh, pct, sentence } from '@/lib/format';
import { BASIS_LABEL, type StepKey } from '@/lib/incident';
import { HAZARD_SPEC } from '@/lib/hazard';
import { lostRevenue } from '@/lib/money';
import { HAZARD_GUIDE } from '@/lib/sandboxGuide';
import { useDeferOutcomes, useHazardsOver, useIncident, useInspected, useLiveQueue, usePanelReading, useSelectedPanelId } from '@/store/selectors';
import { useSession } from '@/store/session';
import { Blk, Why } from './Block';
import { TariffBasis } from './Tariff';

const STEP_ICONS = { observation: Activity, evidence: ScanSearch, hypothesis: Search, forecast: TrendingDown, recommendation: ClipboardCheck, decision: UserCheck } satisfies Record<StepKey, typeof Activity>;

export function IncidentOverview() {
  const panelId = useSelectedPanelId();
  const incident = useIncident(panelId);
  const reading = usePanelReading(panelId);
  const inspected = useInspected(panelId);
  const over = useHazardsOver(panelId);
  const queue = useLiveQueue().tasks;
  const weatherOnly = over.some((h) => h.kind === 'cloud') && !queue.some((task) => task.panelId === panelId);
  const setDossier = useSession((s) => s.setDossier);
  return <section className="incident-overview" aria-label="Incident overview">
    <div className="incident-takeaway">
      <span className="chip" data-sev={incident.state === 'scheduled' ? 'scheduled' : 'active'}>{sentence(incident.state)}</span>
      <p className="incident-caption">{weatherOnly ? 'Scenario context · No pending repair' : 'Current telemetry hypothesis'}</p>
      <h2>{weatherOnly ? 'Temporary shading' : incident.cause.label}</h2>
      <p>{weatherOnly ? HAZARD_GUIDE.cloud.action : inspected && incident.cause.needsDrone ? 'Inspection completed. Review the returned evidence and proposed repair, then record your decision.' : incident.cause.action}</p>
      <button type="button" className="tool" onClick={() => setDossier(true)}><ScanSearch size={18} aria-hidden />Review evidence</button>
    </div>
    <div className="incident-signal"><strong className="num">{pct(reading?.deviationPct ?? 0)}</strong><span>Current array deviation</span><p>Compared with expected output at the modelled site conditions.</p></div>
    <ol className="incident-progress" aria-label="Evidence workflow">
      {incident.chain.map((step) => <li key={step.key} data-state={step.state}><span>{step.state === 'done' ? <Check size={16} aria-hidden /> : <StepIcon kind={step.key} />}</span><strong>{step.key === 'hypothesis' ? 'Hypothesis' : step.key === 'decision' ? 'Operator decision' : sentence(step.key)}</strong><small>{sentence(step.state)}</small></li>)}
    </ol>
  </section>;
}

function StepIcon({ kind }: { kind: StepKey }) {
  const Icon = STEP_ICONS[kind];
  return <Icon size={16} aria-hidden />;
}

export function ChainPanel() {
  const panelId = useSelectedPanelId();
  const incident = useIncident(panelId);
  const over = useHazardsOver(panelId);
  const inspected = useInspected(panelId);
  const queue = useLiveQueue().tasks;
  const weatherOnly = over.some((h) => h.kind === 'cloud') && !queue.some((task) => task.panelId === panelId);
  return (
    <Blk
      b="chain"
      title={<>Evidence chain<span className="count"><span className="id">{incident.id}</span></span></>}
      aside={<Why />}
    >
      <p className="one">Open a step to see its evidence and basis. The current hypothesis can change as site conditions change.</p>
      {over.length > 0 && <p className="context-note" role="status"><strong>{over.map((h) => HAZARD_SPEC[h.kind].label).join(' + ')} over this array.</strong> {over.some((h) => h.kind === 'cloud') ? 'A weather-related shortfall can resemble soiling. Compare again after the cloud passes; existing electrical faults remain in the site record.' : 'Dust reduces irradiance and can mask an existing electrical fault. Review the wash need alongside the recorded fault and inspection evidence.'}</p>}
      <ol className="steps evidence-chain">
        {incident.chain.map((s) => (
          <li key={s.key} data-state={s.state}>
            <details open={s.key === 'observation' || s.state === 'active'}>
              <summary><span className="chain-icon"><StepIcon kind={s.key} /></span><span className="step">{s.label}<span className="chain-basis">{s.basis ? BASIS_LABEL[s.basis] : 'Awaiting evidence'}</span></span><span className="chip">{sentence(s.state)}</span><ChevronDown size={16} aria-hidden /></summary>
              {/* A current telemetry hypothesis and a recorded fault are different
                  claims. Appending the recorded mechanism made them contradict. */}
              {s.says && <p className="says">{s.key === 'hypothesis' ? `${incident.cause.label}. ${incident.cause.says}` : s.key === 'recommendation' && weatherOnly ? HAZARD_GUIDE.cloud.next : s.key === 'recommendation' && inspected && incident.cause.needsDrone ? 'Inspection completed. Review the returned evidence and proposed repair, then record your decision.' : s.says}</p>}
              {s.ruledOut?.length ? <ul className="ruled-out">{s.ruledOut.map((r) => <li key={r.cause}><strong>Ruled out: {r.cause}</strong><p>{r.because}</p></li>)}</ul> : null}
              {s.source && <p className="says workings">Source: {s.source}</p>}
            </details>
          </li>
        ))}
      </ol>
    </Blk>
  );
}

export function DeferPanel() {
  const panelId = useSelectedPanelId();
  const outcomes = useDeferOutcomes(panelId);
  const peak = Math.max(...outcomes.map((o) => o.lostMWh), 1e-6);
  return (
    <Blk b="defer" title="Cost of waiting">
      <p className="one">Energy lost if the repair starts at each point, and the revenue that is, <TariffBasis />.</p>
      <ol className="defer">
        {outcomes.map((o) => (
          <li key={o.id} data-sev={o.breaches ? 'critical' : undefined}>
            <span>{o.label}</span>
            <span className="wait-bar" aria-hidden><i style={{ width: `${o.lostMWh / peak * 100}%` }} /></span>
            {o.breaches && <span className="chip" data-sev="critical">Past deadline</span>}
            {/* Stacked, not side by side: the column is too narrow at 1366 for both. */}
            <span className="amt">
              <span className="fig num">{MWh(o.lostMWh)}</span>
              <span className="num rupees">{lostRevenue(o.lostMWh)}</span>
            </span>
          </li>
        ))}
      </ol>
    </Blk>
  );
}
