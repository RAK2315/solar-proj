'use client';

/**
 * THROWAWAY. The content of every mockup screen, as blocks.
 *
 * Each block reads the real selectors and carries no layout of its own. The four
 * directions place, size and dress the same blocks differently in mockups.css, so
 * what is being compared is the treatment and never the data.
 */

import Link from 'next/link';
import { Cloud, Pause, Play, RotateCcw, ThermometerSun, Wind } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import * as N from '@/app/numbers';
import { evidenceUrl, getPanel, hasCapturedEvidence } from '@/lib/data';
import { MWh, degC, hours, kW, MW, num, pct, pctPlain, wm2 } from '@/lib/format';
import { ironbowForDeltaT, normaliseDeltaT } from '@/lib/ironbow';
import { allEvents, scenario } from '@/lib/live';
import { scoreBreakdown } from '@/lib/ranking';
import { nextRehearsalTarget } from '@/lib/rehearsal';
import {
  useAllMissions, useArrayFault, useCellGrid, useDayCurve, useDayPlan, useDeferOutcomes, useFarm,
  useFeedEvents, useFleet, useIncident, useInjected, useLiveQueue, useLossAttribution, useProjectedLossMWh, useSiteFrame, useZoneBreakdown,
} from '@/store/selectors';
import { INJECTABLE, useSession, type InjectableId } from '@/store/session';
import type { Dir } from './directions';

export const ARRAY_ID = 'B-17';

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const clockOf = (hour: number) => {
  const m = Math.round(hour * 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

function Blk({ b, title, sev, aside, children }: {
  b: string; title: ReactNode; sev?: string; aside?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="blk" data-b={b} data-sev={sev}>
      <header className="blk-hd"><h2>{title}</h2>{aside}</header>
      <div className="blk-bd">{children}</div>
    </section>
  );
}

function Why({ on, toggle }: { on: boolean; toggle: () => void }) {
  return <button type="button" className="why" aria-pressed={on} aria-label="Show the working" onClick={toggle}>?</button>;
}

export function Kpis() {
  const f = useSiteFrame();
  return (
    <dl className="kpis">
      <div><dd className="num">{f.clock}</dd><dt>site time</dt></div>
      <div><dd className="num">{MW(f.farmOutputMW)}</dd><dt>output</dt></div>
      <div><dd className="num">{num(f.farmHealth, 0)}</dd><dt>health</dt></div>
      <div><dd className="num">{f.anomalies}</dd><dt>anomalies</dt></div>
    </dl>
  );
}

export function Facts() {
  const [why, setWhy] = useState(false);
  const frame = useSiteFrame();
  const queue = useLiveQueue().tasks;
  const fault = useArrayFault(ARRAY_ID);
  const loss72 = useProjectedLossMWh(ARRAY_ID);
  const order = useSession((s) => s.workOrders.find((w) => w.panelId === ARRAY_ID));
  const createWorkOrder = useSession((s) => s.createWorkOrder);
  const reading = frame.panels[ARRAY_ID];
  const task = queue.find((t) => t.panelId === ARRAY_ID);
  if (!reading) return null;
  const basis = hasCapturedEvidence(ARRAY_ID) ? 'Diagnosed from a thermal capture' : 'Flagged from modelled signature';

  return (
    <Blk
      b="facts" sev={reading.status}
      title={<><span className="id">{ARRAY_ID}</span><span className="chip" data-sev={reading.status}>{sentence(reading.status)}</span></>}
      aside={<Why on={why} toggle={() => setWhy((v) => !v)} />}
    >
      <div className="big num"><span id="mk-figure">{pct(reading.deviationPct)}</span></div>
      <p className="one">{basis}: {fault?.mechanism ?? 'no fault on file'}.</p>
      <dl className="rows">
        <div><dt>Output</dt><dd className="num">{kW(reading.actualKW, 1)}</dd></div>
        <div><dt>Expected</dt><dd className="num">{kW(reading.expectedKW, 1)}</dd></div>
        <div><dt>Cell temperature</dt><dd className="num">{degC(reading.cellTempC)}</dd></div>
        <div><dt>Lost over 72 h</dt><dd className="num">{MWh(loss72)}</dd></div>
        {task && <div><dt>Act within</dt><dd className="num">{hours(task.hoursUntilDeadline)}</dd></div>}
      </dl>
      {why && (
        <p className="work">
          Expected is the PV model at {wm2(frame.irradiance)} and {degC(frame.ambientC)} ambient,
          across the array&apos;s {getPanel(ARRAY_ID)?.stringsPerArray} strings.
        </p>
      )}
      {order
        ? <p className="done">Work order <span className="id">{order.id}</span> created</p>
        : <button type="button" className="approve" onClick={() => createWorkOrder(ARRAY_ID, 'Approved from the array panel')}>Approve work order</button>}
    </Blk>
  );
}

export function Queue() {
  const [why, setWhy] = useState(false);
  const queue = useLiveQueue().tasks;
  return (
    <Blk
      b="queue" sev={queue[0]?.severity}
      title={<>Repair queue<span className="count num">{queue.length} jobs</span></>}
      aside={<Why on={why} toggle={() => setWhy((v) => !v)} />}
    >
      <p className="one">Ranked by loss × severity × urgency ÷ access.</p>
      <ol className="q" data-why={why}>
        {queue.map((t, i) => {
          const s = scoreBreakdown(t);
          const sev = t.scheduled ? 'scheduled' : t.severity;
          return (
            <li key={t.id} id={`mk-q-${t.panelId}`} data-sev={sev}>
              <span className="rank num">{i + 1}</span>
              <span className="job">
                <span className="id">{t.panelId}</span>
                <span className="meta"><i className="dot" />{sentence(sev)}, {hours(t.hoursUntilDeadline)} left{t.injected ? ', rehearsal' : ''}</span>
              </span>
              <span className="score num">{num(s.score, 2)}</span>
              <span className="work num">{MWh(s.loss)}/day × {num(s.severity, 1)} × {num(s.urgency, 2)} ÷ {num(s.access, 1)}</span>
            </li>
          );
        })}
      </ol>
    </Blk>
  );
}

const HAZARDS = [
  { id: 'dust', label: 'Dust storm', Icon: Wind, footprint: true },
  { id: 'cloud', label: 'Cloud bank', Icon: Cloud, footprint: true },
  { id: 'heat', label: 'Heatwave', Icon: ThermometerSun, footprint: false },
] as const;

export function Tools() {
  const [armed, setArmed] = useState<string | null>(null);
  const hazard = HAZARDS.find((h) => h.id === armed);
  const reset = () => {
    setArmed(null);
    useSession.setState({ workOrders: [], injected: [] });
  };
  return (
    <div className="blk tools" data-b="tools" role="toolbar" aria-label="Hazards" data-armed={armed ? 'true' : 'false'}>
      <p className="one">Pick a hazard, then drag it onto the field.</p>
      <div className="toolrow">
        {HAZARDS.map(({ id, label, Icon }) => (
          <button key={id} type="button" className="tool" aria-pressed={armed === id} onClick={() => setArmed(armed === id ? null : id)}>
            <Icon size={18} strokeWidth={1.75} aria-hidden />{label}
          </button>
        ))}
        <span className="sep" aria-hidden />
        <button type="button" className="tool" onClick={reset}><RotateCcw size={18} strokeWidth={1.75} aria-hidden />Reset</button>
      </div>
      {/* Portalled out: a frosted toolbar is a containing block for fixed children. */}
      {hazard?.footprint && createPortal(
        <div className="foot" aria-hidden><span>{hazard.label}</span></div>,
        document.getElementById('mk-root') ?? document.body,
      )}
    </div>
  );
}

export function Chain() {
  const incident = useIncident(ARRAY_ID);
  return (
    <Blk b="chain" title={<>Evidence chain<span className="count"><span className="id">{incident.id}</span></span></>}>
      <p className="one">{incident.cause.label}. {incident.cause.action}</p>
      <ol className="steps">
        {incident.chain.map((s) => (
          <li key={s.key} data-state={s.state}>
            <i className="dot" />
            <span className="step">{s.label}</span>
            {s.says && <span className="says">{s.says}</span>}
          </li>
        ))}
      </ol>
    </Blk>
  );
}

export function Defer() {
  const outcomes = useDeferOutcomes(ARRAY_ID);
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

export function Plan() {
  const { plan, savedByOneMoreCrew } = useDayPlan();
  const span = Math.max(plan.spanH, ...plan.jobs.map((j) => j.deadlineH), 1);
  const at = (h: number) => `${Math.min(100, (h / span) * 100).toFixed(1)}%`;
  return (
    <Blk b="plan" title={<>Day plan<span className="count num">{plan.jobs.length} jobs over {hours(plan.spanH)}</span></>}>
      <p className="one">
        Greedy schedule for two crews and two drones: {plan.slipping.length} past deadline,
        {' '}{savedByOneMoreCrew} recovered by one more crew.
      </p>
      <ol className="plan">
        {plan.jobs.map((j) => (
          <li key={j.taskId} data-sev={j.onTime ? 'scheduled' : 'critical'}>
            <span className="job"><span className="id">{j.panelId}</span><span className="meta">{sentence(j.assignedTo)}</span></span>
            <span className="track">
              <i className="bar" style={{ left: at(j.startH), width: `max(6px, calc(${at(j.endH)} - ${at(j.startH)}))` }} />
              <i className="tick" style={{ left: at(j.deadlineH) }} />
            </span>
            <span className="fig num">{j.onTime ? `Done in ${hours(j.endH)}` : `${hours(j.lateByH)} late`}</span>
          </li>
        ))}
      </ol>
    </Blk>
  );
}

export function Curve() {
  const curve = useDayCurve();
  const frame = useSiteFrame();
  const peak = Math.max(...curve.map((p) => p.outputMW), 1);
  const peakAt = curve.find((p) => p.outputMW === peak)?.hourOffset ?? 0;
  const W = 480;
  const H = 120;
  const pts = curve.map((p) => `${((p.hourOffset / 24) * W).toFixed(1)},${(H - (p.outputMW / peak) * (H - 6)).toFixed(1)}`).join(' ');
  const nowX = Math.min(W, (frame.siteSeconds / 3600 / 24) * W);
  return (
    <Blk b="curve" title={<>Site output, next 24 h<span className="count">modelled</span></>}>
      <div className="big num">{MW(frame.farmOutputMW)}</div>
      <p className="one">Predicted from the forecast, peaking at {MW(peak)} around {clockOf(scenario.epochHour + peakAt)}.</p>
      <svg className="curve" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <polygon className="area" points={`0,${H} ${pts} ${W},${H}`} />
        <polyline className="line" points={pts} />
        <line className="now" x1={nowX} x2={nowX} y1="0" y2={H} />
      </svg>
      <div className="axis num"><span>{clockOf(scenario.epochHour)}</span><span>now {frame.clock}</span><span>{clockOf(scenario.epochHour + 24)}</span></div>
    </Blk>
  );
}

export function Loss() {
  const loss = useLossAttribution();
  return (
    <Blk b="loss" title="Where the loss is going">
      <p className="one">Shortfall against the model right now, by mechanism.</p>
      <table className="tbl">
        <thead><tr><th>Cause</th><th>Arrays</th><th>Shortfall</th></tr></thead>
        <tbody>
          {loss.map((l) => (
            <tr key={l.cause}><td>{sentence(l.cause)}</td><td className="id">{l.arrays.slice(0, 3).join(' ')}</td><td className="num">{kW(l.kW, 1)}</td></tr>
          ))}
        </tbody>
      </table>
    </Blk>
  );
}

export function Zones() {
  const zones = useZoneBreakdown();
  return (
    <Blk b="zones" title="Zones">
      <p className="one">Arrays off nominal in each zone, of 40.</p>
      <table className="tbl">
        <thead><tr><th>Zone</th><th>Warning</th><th>Critical</th><th>Shortfall</th></tr></thead>
        <tbody>
          {zones.map((z) => (
            <tr key={z.id}><td className="id">{z.id}</td><td className="num">{z.warning}</td><td className="num">{z.critical}</td><td className="num">{kW(z.shortfallKW, 1)}</td></tr>
          ))}
        </tbody>
      </table>
    </Blk>
  );
}

export function Fleet() {
  const fleet = useFleet();
  return (
    <Blk b="fleet" title={<>Drones<span className="count num">{fleet.length} on site</span></>}>
      <p className="one">Battery is derived from mission time and recharges on the pad.</p>
      <table className="tbl">
        <thead><tr><th>Drone</th><th>Status</th><th>Target</th><th>Battery</th></tr></thead>
        <tbody>
          {fleet.map((d) => (
            <tr key={d.id} data-sev={d.status === 'STANDBY' ? undefined : 'scheduled'}>
              <td className="id">{d.id}</td><td>{sentence(d.status)}</td>
              <td className="id">{d.target ?? d.padId}</td><td className="num">{pctPlain(d.batteryPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Blk>
  );
}

export function Missions() {
  const missions = useAllMissions();
  return (
    <Blk b="missions" title={<>Missions<span className="count num">{missions.length} this session</span></>}>
      <p className="one">Every phase is derived from site time, so scrubbing rewinds the flight.</p>
      {missions.length === 0
        ? <p className="work">No missions yet. Dispatch a drone from an array to see it here.</p>
        : (
          <table className="tbl">
            <thead><tr><th>Mission</th><th>Target</th><th>Phase</th><th>Elapsed</th></tr></thead>
            <tbody>
              {missions.map((m) => (
                <tr key={m.id} id={`mk-m-${m.panelId}`}>
                  <td className="id">{m.id}</td><td className="id">{m.panelId}</td>
                  <td>{sentence(m.phase)}</td><td className="num">{num(m.elapsed / 60, 0)} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </Blk>
  );
}

export function Inject() {
  const frame = useSiteFrame();
  const injected = useInjected();
  const injectFault = useSession((s) => s.injectFault);
  const clearInjected = useSession((s) => s.clearInjected);
  const taken = new Set(injected.map((e) => e.panelId));
  const target = nextRehearsalTarget(frame, taken, injected.length + 1);
  return (
    <Blk b="inject" title={<>Rehearsal faults<span className="count num">{injected.length} active</span></>}>
      <p className="one">Break an array and watch the plan re-derive. Next target <span className="id">{target ?? 'none'}</span>.</p>
      <div className="inject">
        {(Object.keys(INJECTABLE) as InjectableId[]).map((kind) => (
          <button key={kind} type="button" className="tool" disabled={!target} onClick={() => target && injectFault(target, kind)}>
            {INJECTABLE[kind].label}
          </button>
        ))}
        <button type="button" className="tool" disabled={injected.length === 0} onClick={() => clearInjected()}>
          <RotateCcw size={18} strokeWidth={1.75} aria-hidden />Clear rehearsal
        </button>
      </div>
    </Blk>
  );
}

export function Events() {
  const injected = useInjected();
  const events = allEvents(injected);
  return (
    <Blk b="events" title="Scenario">
      <p className="one">Committed site history, plus anything raised in rehearsal.</p>
      <ol className="events">
        {events.map((e) => (
          <li key={e.id}>
            <span className="num">{clockOf(e.startHour)}</span>
            <span className="id">{e.panelId}</span>
            <span className="says">{e.injected ? 'Rehearsal: ' : ''}{e.mechanism}</span>
          </li>
        ))}
      </ol>
    </Blk>
  );
}

/* The committed event copy is upper case. Sentence case is a settled rule, but an
   identifier must keep its own casing. */
const eventCase = (s: string) => sentence(s).replace(/\b([a-z]+-[a-z]?\d+|inv-[a-c]|drone \d+)\b/g, (m) => m.toUpperCase());

export function Feed() {
  const events = [...useFeedEvents()].sort((a, b) => b.t - a.t).slice(0, 3);
  const sev = (s: string) => (s === 'active' ? 'scheduled' : s);
  return (
    <Blk b="feed" sev={events[0] ? sev(events[0].severity) : undefined} title={<>Live events<span className="count">newest first</span></>}>
      <ol className="feed">
        {events.map((e) => (
          <li key={e.id} data-sev={sev(e.severity)}>
            <span className="num">{e.timestamp}</span>
            <span className="ttl"><i className="dot" />{eventCase(e.title)}</span>
            <span className="says">{e.body}</span>
          </li>
        ))}
      </ol>
    </Blk>
  );
}

const SPEEDS = [1, 60, 600];

export function TimeControl() {
  const running = useSession((s) => s.running);
  const scale = useSession((s) => s.timeScale);
  const toggle = useSession((s) => s.toggleRunning);
  const setScale = useSession((s) => s.setTimeScale);
  return (
    <div className="time" role="group" aria-label="Site clock">
      <button type="button" className="tool" aria-label={running ? 'Pause site clock' : 'Run site clock'} onClick={toggle}>
        {running ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
      </button>
      {SPEEDS.map((x) => (
        <button key={x} type="button" className="tool num" aria-pressed={scale === x} onClick={() => setScale(x)}>{x}×</button>
      ))}
    </div>
  );
}

/* Everything below is B-17's own captured evidence, so it is gated on the array
   that was actually imaged. */
export function Captures() {
  if (!hasCapturedEvidence(ARRAY_ID)) return null;
  const thermal = evidenceUrl('thermal');
  const rgb = evidenceUrl('rgbAnnotated');
  return (
    <Blk b="captures" title={<>Captured evidence<span className="count">drone capture</span></>}>
      <div className="caps">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {thermal && <figure><img src={thermal} alt="Thermal frame of the module" /><figcaption>Thermal, ironbow, UAV frame</figcaption></figure>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {rgb && <figure><img src={rgb} alt="Visible-light frame with the detection box" /><figcaption>Visible, dataset photo, not a drone frame</figcaption></figure>}
      </div>
    </Blk>
  );
}

export function Detector() {
  if (!hasCapturedEvidence(ARRAY_ID) || N.DETECTION_CONFIDENCE === null) return null;
  return (
    <Blk b="detector" title="Detector">
      <p className="one">Runs in this browser on the frame the drone returns.</p>
      <dl className="rows">
        <div><dt>Model</dt><dd className="id">{N.DETECTOR_MODEL}</dd></div>
        <div><dt>Cracked, this capture</dt><dd className="num">{num(N.DETECTION_CONFIDENCE, 2)}</dd></div>
        {N.CRACKED_AP50 !== null && <div><dt>AP@50, {N.DETECTOR_SPLIT} split</dt><dd className="num">{num(N.CRACKED_AP50, 3)}</dd></div>}
      </dl>
    </Blk>
  );
}

export function Matrix() {
  const grid = useCellGrid();
  if (!hasCapturedEvidence(ARRAY_ID)) return null;
  const hotRows = [...new Set(grid.defects.map((d) => d.row))].join(', ');
  return (
    <Blk b="matrix" title={<>Anomaly matrix<span className="count num">{grid.rows} × {grid.cols} cells</span></>}>
      <p className="one">Cell-mean ΔT in °C: {grid.defects.length} hot cells in row {hotRows}, {grid.clusters} cluster.</p>
      <div className="matrix num">
        <span />
        {grid.matrix[0].map((_, c) => <span key={c} className="hd">{c + 1}</span>)}
        {grid.matrix.map((row, r) => [
          <span key={`r${r}`} className="hd">R{r + 1}</span>,
          ...row.map((dt, c) => (
            <span key={`${r}-${c}`} className="cell" data-on={normaliseDeltaT(dt) > 0.45 ? 'dark' : 'light'} style={{ background: ironbowForDeltaT(dt) }}>
              {num(dt, 1)}
            </span>
          )),
        ])}
      </div>
    </Blk>
  );
}

/* The fallback the plan keeps for when WebGL fails or the frame rate drops. */
export function Map2D() {
  const farm = useFarm();
  const frame = useSiteFrame();
  return (
    <div className="mk-map">
      <p className="chip">3D is unavailable, showing the 2D map</p>
      {farm.zones.map((z) => (
        <div key={z.id} className="zone">
          <p className="one">Zone <span className="id">{z.id}</span></p>
          <div className="cells" style={{ gridTemplateColumns: `repeat(${z.cols}, minmax(0, 1fr))` }}>
            {[...z.panels].sort((a, b) => a.row - b.row || a.col - b.col).map((p) => (
              <span key={p.id} className="cell id" data-sev={frame.panels[p.id]?.status} data-sel={p.id === ARRAY_ID}>{p.id}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Landing ───────────────────────────────────────────────────────────── */

export function Hero({ dir }: { dir: Dir }) {
  return (
    <section className="blk hero" data-b="hero">
      <p className="brand">Surya agent</p>
      <h1>The plan, not the picture.</h1>
      <p className="one">
        Surya watches a {MW(N.NAMEPLATE_MW)} block of Bhadla Solar Park, sends a drone to verify what
        telemetry cannot, and hands the operator a ranked, deadlined repair plan to approve.
      </p>
      <Link className="approve" href={`/mockups/${dir}/twin`}>Open the console</Link>
    </section>
  );
}

export function Stats() {
  return (
    <section className="blk" data-b="stats">
      <dl className="stats">
        <div><dd className="num">{MW(N.OUTPUT_MW)}</dd><dt>delivered from {MW(N.NAMEPLATE_MW)} nameplate at {degC(N.CELL_TEMP_C)} cell temperature</dt></div>
        <div><dd className="num">{pct(N.ARRAY_DEVIATION_PCT)}</dd><dt>on array <span className="id">{ARRAY_ID}</span>, {N.FAULTED_STRING_COUNT} of {N.STRINGS} strings bypassed</dt></div>
        <div><dd className="num">{MWh(N.LOSS_72H_MWH)}</dd><dt>lost over 72 h if nobody acts before {N.ACT_BEFORE}</dt></div>
        {N.CRACKED_AP50 !== null && (
          <div><dd className="num">{num(N.CRACKED_AP50, 3)}</dd><dt>AP@50 for cracked cells, {N.DETECTOR_SPLIT} split</dt></div>
        )}
      </dl>
    </section>
  );
}

const LOOP = [
  'Telemetry anomaly', 'Agent triage', 'Drone dispatch', 'Evidence capture',
  'Vision analysis', 'Prognosis and deadline', 'Ranked recommendation', 'Human approval',
];

export function Loop() {
  return (
    <Blk b="loop" title="The loop">
      <ol className="loop">{LOOP.map((s, i) => <li key={s}><span className="rank num">{i + 1}</span>{s}</li>)}</ol>
    </Blk>
  );
}

export function Proof() {
  return (
    <Blk b="proof" title="What is real">
      <ul className="proof">
        <li>Telemetry is simulated on a published PV model with stated coefficients.</li>
        <li>The defect detector is trained on labelled imagery and reports its own {N.DETECTOR_SPLIT} split.</li>
        <li>The queue is ranked by arithmetic shown on screen, never by a language model.</li>
        <li>Nothing is scheduled without an operator.</li>
      </ul>
    </Blk>
  );
}
