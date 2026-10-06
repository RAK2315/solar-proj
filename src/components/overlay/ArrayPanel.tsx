'use client';

/**
 * ArrayPanel: the selected array, and the three things an operator can do to it.
 *
 * Send a drone, approve the work, or decline it with a reason. Approval is the
 * human gate: nothing above it creates a work order, and the button does not
 * exist until there is something real to approve.
 */

import { X } from 'lucide-react';

import { BASIS_PHRASE, basisFor } from '@/lib/basis';
import { getPanel } from '@/lib/data';
import { MWh, degC, hours, kW, pct, pctPlain, sentence, wm2 } from '@/lib/format';
import {
  useActiveMissions, useHazardsOver, useIncident, useInspected, useIsDark, useLiveQueue, useOverride,
  usePanels, useProjectedLossMWh, useSiteFrame,
} from '@/store/selectors';
import { HAZARD_SPEC } from '@/lib/hazard';
import { MISSION, MISSION_TOTAL, useSession } from '@/store/session';
import { Blk, Why } from './Block';

/** Why an operator declines. Fixed reasons, so the record can be queried later. */
const OVERRIDE_REASONS = [
  'Deferred, crew already on site next cycle',
  'False positive, array inspected manually',
  'Accepted risk, scheduled at next outage',
] as const;

const PHASE: Record<string, string> = {
  idle: 'Preparing', outbound: 'Outbound', inspecting: 'Inspecting',
  returning: 'Returning', complete: 'Complete',
};

const minutes = (seconds: number) => `${Math.max(0, Math.round(seconds / 60))} min`;

function PickArray() {
  const panels = usePanels();
  const select = useSession((s) => s.selectPanel);
  return (
    <select
      className="tool"
      aria-label="Select array"
      value=""
      onChange={(e) => e.target.value && select(e.target.value)}
    >
      <option value="">Choose an array</option>
      {panels.map((p) => <option key={p.id} value={p.id}>{p.id}, {p.inverterId}</option>)}
    </select>
  );
}

function NoSelection() {
  return (
    <Blk b="facts" title="No array selected">
      <p className="empty">Select an array on the field or in the queue to see its reading and act on it.</p>
      <PickArray />
    </Blk>
  );
}

function Flight({ panelId }: { panelId: string }) {
  const siteSeconds = useSession((s) => s.siteSeconds);
  const follow = useSession((s) => s.followFlight);
  const setFollow = useSession((s) => s.setFollowFlight);
  const mission = useActiveMissions().find((m) => m.panelId === panelId);
  if (!mission) return null;

  const elapsed = siteSeconds - mission.startedAt;
  const left = mission.phase === 'outbound'
    ? MISSION.outbound - elapsed
    : mission.phase === 'inspecting'
      ? MISSION.outbound + MISSION.inspecting - elapsed
      : MISSION_TOTAL - elapsed;
  const next = mission.phase === 'outbound' ? 'to target'
    : mission.phase === 'inspecting' ? 'on station' : 'to the pad';

  return (
    <div className="well flight" data-sev="active">
      <div className="flight-hd">
        <span><span className="id">{mission.droneId}</span> <span className="chip" data-sev="active">{PHASE[mission.phase]}</span></span>
        <span className="num">{minutes(left)} {next}</span>
      </div>
      <div className="track" role="progressbar" aria-label="Mission progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, (elapsed / MISSION_TOTAL) * 100))}>
        <i className="bar" style={{ left: 0, width: `${Math.min(100, (elapsed / MISSION_TOTAL) * 100).toFixed(1)}%` }} />
      </div>
      <button type="button" className="tool quiet" aria-pressed={follow} onClick={() => setFollow(!follow)}>
        {follow ? 'Back to the field' : 'Follow the drone'}
      </button>
    </div>
  );
}

function ArrayFacts({ panelId, linkToIncident }: { panelId: string; linkToIncident: boolean }) {
  const frame = useSiteFrame();
  const queue = useLiveQueue().tasks;
  const incident = useIncident(panelId);
  const loss72 = useProjectedLossMWh(panelId);
  const inspected = useInspected(panelId);
  const dark = useIsDark();
  const override = useOverride(panelId);
  const over = useHazardsOver(panelId);
  const missions = useActiveMissions();
  const order = useSession((s) => s.workOrders.find((w) => w.panelId === panelId));
  const createWorkOrder = useSession((s) => s.createWorkOrder);
  const dispatch = useSession((s) => s.dispatch);
  const select = useSession((s) => s.selectPanel);
  const setModule = useSession((s) => s.setModule);
  const overrideRecommendation = useSession((s) => s.overrideRecommendation);
  const clearOverride = useSession((s) => s.clearOverride);

  const reading = frame.panels[panelId];
  if (!reading) return <NoSelection />;

  const task = queue.find((t) => t.panelId === panelId);
  const flying = missions.some((m) => m.panelId === panelId);
  const healthy = reading.status === 'healthy' && !task;
  const basis = basisFor(panelId, inspected, healthy);
  const { cause } = incident;

  const wantsDrone = healthy || cause.needsDrone;
  const canDispatch = !flying && !inspected && missions.length < 2;
  // Something to approve, and enough known to approve it: a drone has looked, or
  // the cause is one that imaging would add nothing to.
  const armed = Boolean(task) && (inspected || !cause.needsDrone);

  return (
    <Blk
      b="facts" sev={reading.status}
      title={<><span className="id">{panelId}</span><span className="chip" data-sev={reading.status}>{dark ? 'Night' : sentence(reading.status)}</span></>}
      aside={(
        <span className="hd-tools">
          <Why />
          <button type="button" className="why" aria-label="Close the array panel" onClick={() => select(null)}><X size={14} aria-hidden /></button>
        </span>
      )}
    >
      <div className="big num" data-sev={reading.status}><span className="sev-ink">{pct(reading.deviationPct)}</span></div>
      <p className="one">
        {dark
          ? 'After sunset there is nothing to measure. The fault and its deadline stand.'
          : healthy ? `${BASIS_PHRASE[basis]}.` : `${BASIS_PHRASE[basis]}: ${cause.label.toLowerCase()}.`}
      </p>
      {over.length > 0 && !dark && (
        <p className="one">
          Under the {HAZARD_SPEC[over[0].kind].label.toLowerCase()} footprint, which keeps {pctPlain(over[0].kept * 100)} of
          irradiance off it{over[0].kind === 'cloud' ? '. Weather, not a fault.' : '.'}
        </p>
      )}
      <dl className="rows">
        <div><dt>Output</dt><dd className="num">{kW(reading.actualKW, 1)}</dd></div>
        <div><dt>Expected</dt><dd className="num">{kW(reading.expectedKW, 1)}</dd></div>
        <div><dt>Cell temperature</dt><dd className="num">{degC(reading.cellTempC)}</dd></div>
        {task && <div><dt>Lost over 72 h</dt><dd className="num">{MWh(loss72)}</dd></div>}
        {task && <div><dt>Act within</dt><dd className="num">{hours(task.hoursUntilDeadline)}</dd></div>}
      </dl>
      <p className="work workings">
        Expected is the PV model at {wm2(frame.irradiance)} and {degC(frame.ambientC)} ambient,
        across the array&apos;s {getPanel(panelId)?.stringsPerArray} strings on <span className="id">{getPanel(panelId)?.inverterId}</span>.
        {' '}{cause.action}
      </p>

      <Flight panelId={panelId} />

      <div className="actions">
        {order ? (
          <p className="done">Work order <span className="id">{order.id}</span> created. A person authorised it.</p>
        ) : (
          <>
            {armed && !override && (
              <button type="button" className="approve" onClick={() => createWorkOrder(panelId, `Approved from the array panel for ${panelId}.`)}>
                Approve work order
              </button>
            )}
            {!inspected && !flying && (
              <button
                type="button"
                className={wantsDrone && !armed ? 'approve live' : 'tool'}
                disabled={!canDispatch}
                onClick={() => dispatch(panelId)}
              >
                {!canDispatch ? 'Both drones committed' : wantsDrone ? 'Dispatch drone' : 'Fly a drone anyway'}
              </button>
            )}
            {override && <p className="one">Declined by operator: {override.reason.toLowerCase()}.</p>}
          </>
        )}
        <div className={linkToIncident ? 'pair' : undefined}>
          {linkToIncident && <button type="button" className="tool" onClick={() => setModule('incident')}>Open incident</button>}
          {order ? null
            : override ? (
              <button type="button" className="tool" onClick={() => clearOverride(panelId)}>Clear override</button>
            ) : (
              <select
                className="tool"
                aria-label="Override: decline with a reason"
                value=""
                disabled={!task}
                onChange={(e) => e.target.value && overrideRecommendation(panelId, e.target.value)}
              >
                <option value="">Override</option>
                {OVERRIDE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
        </div>
      </div>
    </Blk>
  );
}

export function ArrayPanel({ linkToIncident = true }: { linkToIncident?: boolean }) {
  const selected = useSession((s) => s.selectedPanelId);
  return selected ? <ArrayFacts panelId={selected} linkToIncident={linkToIncident} /> : <NoSelection />;
}
