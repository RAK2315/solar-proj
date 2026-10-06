'use client';

/**
 * The incident screen: one array's problem as a chain of evidence, and what it
 * costs to wait.
 */

import { MWh } from '@/lib/format';
import { useDeferOutcomes, useIncident, useSelectedPanelId } from '@/store/selectors';
import { Blk, Why } from './Block';

export function ChainPanel() {
  const panelId = useSelectedPanelId();
  const incident = useIncident(panelId);
  return (
    <Blk
      b="chain"
      title={<>Evidence chain<span className="count"><span className="id">{incident.id}</span></span></>}
      aside={<Why />}
    >
      <p className="one">{incident.cause.label}. {incident.cause.action}</p>
      <ol className="steps">
        {incident.chain.map((s) => (
          <li key={s.key} data-state={s.state}>
            <i className="dot" />
            <span className="step">{s.label}</span>
            {s.says && <span className="says">{s.says}</span>}
            {s.source && <span className="says workings">Source: {s.source}</span>}
          </li>
        ))}
      </ol>
    </Blk>
  );
}

export function DeferPanel() {
  const panelId = useSelectedPanelId();
  const outcomes = useDeferOutcomes(panelId);
  return (
    <Blk b="defer" title="Cost of waiting">
      <p className="one">Energy lost if the repair starts at each point.</p>
      <ol className="defer">
        {outcomes.map((o) => (
          <li key={o.id} data-sev={o.breaches ? 'critical' : undefined}>
            <span>{o.label}</span>
            {o.breaches && <span className="chip" data-sev="critical">Past deadline</span>}
            <span className="fig num">{MWh(o.lostMWh)}</span>
          </li>
        ))}
      </ol>
    </Blk>
  );
}
