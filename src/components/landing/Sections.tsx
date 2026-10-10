'use client';

/**
 * The landing page's sections, below the hero.
 *
 * Each one makes a claim the console can back, and reads its figures from the
 * same libraries the console does: the committed queue through the ranking
 * function, the measured cell grid, the forecast, the tariff. A picture of the
 * product is a capture of the product, dated.
 */

import Link from 'next/link';
import {
  Activity, ArrowRight, Bot, Camera, ClipboardList, Droplets, Eye, Gauge, HelpCircle,
  Hourglass, MapPin, Navigation, Radar, ScanSearch, UserCheck,
} from 'lucide-react';
import { useState } from 'react';

import * as N from '@/app/numbers';
import { cellGrid, panels, repairQueue } from '@/lib/data';
import { MWh, degC, hours, num, pct } from '@/lib/format';
import { ironbowForDeltaT } from '@/lib/ironbow';
import { TARIFF_ARITHMETIC, TARIFF_BASIS, lostRevenue } from '@/lib/money';
import { DOSE_BUDGET_H, T_PROP_C } from '@/lib/physics';
import { rankQueue, scoreBreakdown } from '@/lib/ranking';
import { useSession } from '@/store/session';

/** The cadence claim's source: read in full on 4 Oct 2026. Not an NREL paper. */
const CADENCE_SOURCE = 'https://www.osti.gov/servlets/purl/1960134';
const REPO = 'https://github.com/RAK2315/solar-proj';
const ARRAY_ID = 'B-17';

const at = (i: number) => ({ '--i': i }) as React.CSSProperties;

/** A card that carries a soft light under the pointer. Written to the element, never to state. */
function spotlight(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

const MISSION = [
  { label: 'Detect', Icon: Activity, title: 'A shortfall worth investigating', value: () => pct(N.ARRAY_DEVIATION_PCT), detail: 'Array deviation at the reference hour. Simulated telemetry, evaluated against the PV model.' },
  { label: 'Inspect', Icon: ScanSearch, title: 'Evidence before a recommendation', value: () => N.DETECTION_CONFIDENCE === null ? 'No result' : num(N.DETECTION_CONFIDENCE, 3), detail: 'Detector confidence on the committed evidence image. This preview does not launch a flight.' },
  { label: 'Prioritise', Icon: UserCheck, title: 'A deadline. A human decision.', value: () => N.ACT_BEFORE, detail: 'Committed prognosis deadline, based on the forecast and declared thermal-dose assumptions.' },
];

export function MissionPreview() {
  const [selected, setSelected] = useState(0);
  const current = MISSION[selected];
  return (
    <aside className="lp-mission" aria-label="Interactive mission preview">
      <div className="lp-mission-card glass" onPointerMove={spotlight}>
        <div className="lp-mission-top"><span className="id">{ARRAY_ID}</span><span>Inspection workflow</span><ScanSearch size={18} aria-hidden /></div>
        <div className="lp-mission-tabs" role="group" aria-label="Explore the mission">
          {MISSION.map(({ label, Icon }, i) => <button type="button" key={label} aria-pressed={selected === i} onClick={() => setSelected(i)}><Icon size={16} aria-hidden />{label}</button>)}
        </div>
        <div key={current.label} className="lp-mission-reading" aria-live="polite">
          <p className="lp-mission-value num">{current.value()}</p>
          <h2>{current.title}</h2>
          <p>{current.detail}</p>
        </div>
      </div>
    </aside>
  );
}

/* ── The problem ─────────────────────────────────────────────────────────── */

const QUESTIONS = [
  { Icon: MapPin, q: 'Which module?', a: 'Telemetry stops at the string. The fault is in one module of one array.' },
  { Icon: HelpCircle, q: 'Dirt or damage?', a: 'A power drop alone does not establish the cause. Imaging adds evidence that telemetry can miss.' },
  { Icon: Hourglass, q: 'How urgent?', a: 'The model combines the fault mechanism with the forecast to estimate an action deadline.' },
];

export function Problem() {
  return (
    <section className="lp-section" id="problem" aria-labelledby="problem-h">
      <header className="lp-head" data-reveal>
        <p className="lp-kicker">The problem</p>
        <h2 id="problem-h">Turn a power signal into an actionable plan.</h2>
      </header>

      <div className="lp-split">
        <div className="lp-cadence" data-reveal aria-hidden>
          <div className="lp-lane">
            <p>Annual aerial survey</p>
            <div className="lp-rail"><i className="lp-run long" /><i className="lp-dot" /><i className="lp-now" /><b className="lp-tick end" /></div>
            <span>The fault waits for the next flight</span>
          </div>
          <div className="lp-lane">
            <p>Surya, continuous</p>
            <div className="lp-rail"><i className="lp-run short" /><i className="lp-dot" /><i className="lp-now" /><b className="lp-tick caught" /></div>
            <span>Caught as it develops, ranked, and put in front of a person</span>
          </div>
          <div className="lp-axis"><span>Fault begins</span><span>One year</span></div>
        </div>

        <ul className="lp-points" data-reveal>
          <li>
            Aerial infrared inspection is usually flown once a year, so faults below the inverter
            go unseen for weeks to months. This watches continuously.{' '}
            <a className="src" href={CADENCE_SOURCE} rel="noreferrer" target="_blank">Turbine Logic and EPRI, on OSTI</a>
          </li>
          <li>Telemetry is simulated on a published PV model with stated coefficients.</li>
          <li>The queue is ranked by arithmetic shown on screen, never by a language model.</li>
          <li>Operators review and approve every work order.</li>
        </ul>
      </div>

      <ul className="lp-three">
        {QUESTIONS.map(({ Icon, q, a }, i) => (
          <li key={q} className="lp-card" data-reveal style={at(i)} onPointerMove={spotlight}>
            <Icon size={22} strokeWidth={1.75} aria-hidden />
            <h3>{q}</h3>
            <p>{a}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── The loop ────────────────────────────────────────────────────────────── */

const LOOP = [
  { Icon: Activity, step: 'Telemetry anomaly', says: 'An array falls below what the sun and the heat say it should make.' },
  { Icon: Bot, step: 'Agent triage', says: 'What is wrong, how bad, and whether telemetry alone can settle it.' },
  { Icon: Navigation, step: 'Drone dispatch', says: 'Sent only when imaging would add something. A dirty array gets a wash crew.' },
  { Icon: Camera, step: 'Evidence capture', says: 'A visible pass and a thermal pass over the one array.' },
  { Icon: Eye, step: 'Vision analysis', says: 'A detector we trained reads the frame, here in the browser.' },
  { Icon: Hourglass, step: 'Prognosis and deadline', says: 'The defect and the 72 h forecast become an hour to act by.' },
  { Icon: ClipboardList, step: 'Ranked recommendation', says: 'One fixed formula orders the work. Its arithmetic is on screen.' },
  { Icon: UserCheck, step: 'Human approval', says: 'Nothing becomes a work order until a person says so.' },
];

const HANDOFFS = [
  { phase: 'Observe the field', input: 'Weather and modelled array output', output: 'A shortfall against the expected baseline', detail: 'The expected output accounts for irradiance and cell temperature. A hot field producing less than nameplate is normal; an array falling below that baseline is the signal to investigate.' },
  { phase: 'Understand the signal', input: 'The deviation and its string pattern', output: 'A proposed cause and inspection decision', detail: 'Agent triage explains the anomaly. The deterministic calculations remain visible, and soiling can lead directly to a wash recommendation when imaging would add no useful evidence.' },
  { phase: 'Gather targeted evidence', input: 'An array that needs a closer look', output: 'A simulated inspection flight', detail: 'The flight follows the selected array in the digital twin. This prototype demonstrates dispatch and inspection in the scene; it is not connected to a physical drone.' },
  { phase: 'Keep the capture attached', input: 'The simulated drone camera', output: 'Visible and thermal views of the array', detail: 'The dossier retains the frame returned by the flight. The committed real thermal measurement is separately identified, so a simulated capture cannot become a claim of field measurement.' },
  { phase: 'Read the visible frame', input: 'The captured visible image', output: 'Detector boxes and confidence, if found', detail: 'The trained detector runs in the browser. If it finds nothing, no box is drawn. The thermal classifier is not built, and the page makes no claim that the detector reads thermal images.' },
  { phase: 'Estimate the urgency', input: 'Fault mechanism and forecast', output: 'An action deadline with stated assumptions', detail: 'The prognosis counts time above a thermal threshold against a declared dose budget. This is an engineering model, with its assumptions exposed, rather than a guarantee of the moment a module will fail.' },
  { phase: 'Make the tradeoff visible', input: 'Energy loss, severity, urgency and access', output: 'A ranked queue and a proposed crew day', detail: 'A fixed formula ranks the jobs. The scheduler compares a heuristic with a mixed-integer plan, while the console explains losses, deadlines and jobs that cannot fit into the available shift.' },
  { phase: 'Keep the operator in control', input: 'Evidence and a proposed repair', output: 'An approved work order or recorded refusal', detail: 'The operator reviews the recommendation and approves or declines it. Agent advice, queue ranking and a proposed schedule do not create a work order by themselves.' },
];

export function LoopSection() {
  const [selected, setSelected] = useState(0);
  const current = LOOP[selected];
  const handoff = HANDOFFS[selected];
  const Icon = current.Icon;
  return (
    <section className="lp-section" id="loop" aria-labelledby="loop-h">
      <header className="lp-head" data-reveal>
        <p className="lp-kicker">The loop</p>
        <h2 id="loop-h">From the first signal to the right action.</h2>
        <p className="lp-sub">Explore the workflow from detection to approval. Each step connects the field signal to a decision the operator can review.</p>
      </header>
      <div className="lp-workflow" data-reveal>
        <ol className="loop lp-loop">
          {LOOP.map(({ Icon: StepIcon, step }, i) => (
            <li key={step} data-gate={i === LOOP.length - 1}>
              <button type="button" aria-pressed={selected === i} aria-controls="loop-detail" onClick={() => setSelected(i)}>
                <span className="rank num">{i + 1}</span><StepIcon size={20} aria-hidden /><strong>{step}</strong><ArrowRight size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ol>
        <div className="lp-loop-detail" id="loop-detail" aria-live="polite" data-gate={selected === LOOP.length - 1}>
          <div className="lp-loop-visual" aria-hidden><div className="lp-signal-rings"><i /><i /><i /></div><Icon size={64} strokeWidth={1.2} /><span>{handoff.phase}</span></div>
          <div key={current.step} className="lp-loop-copy">
            <p className="lp-tag">Step {selected + 1} / {LOOP.length}</p>
            <h3>{current.step}</h3><p>{handoff.detail}</p>
            <dl className="lp-handoff"><div><dt>Input</dt><dd>{handoff.input}</dd></div><ArrowRight size={20} aria-hidden /><div><dt>Outcome</dt><dd>{handoff.output}</dd></div></dl>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ReferenceCase() {
  return (
    <section className="lp-section" id="reference" aria-labelledby="reference-h">
      <header className="lp-head" data-reveal>
        <p className="lp-kicker">Inside a reference case</p>
        <h2 id="reference-h">What makes an anomaly worth acting on?</h2>
        <p className="lp-sub">Follow array <span className="id">{ARRAY_ID}</span> from the modelled shortfall to the committed prognosis. Each reading answers a different operating question.</p>
      </header>
      <div className="lp-case-grid">
        <article className="lp-case-lead lp-card" data-reveal onPointerMove={spotlight}>
          <p className="lp-tag"><Activity size={18} aria-hidden />Signal, then evidence</p>
          <h3>A field can be healthy at less than nameplate.</h3>
          <p>At the reference conditions, cell temperature is {degC(N.CELL_TEMP_C)} and the block delivers {N.OUTPUT_MW.toFixed(0)} MW from {N.NAMEPLATE_MW} MW nameplate. The model accounts for that temperature effect before looking for a fault.</p>
          <div className="lp-case-reading"><span className="id">{ARRAY_ID}</span><strong className="num">{pct(N.ARRAY_DEVIATION_PCT)}</strong><span>below its expected output</span></div>
          <p>{N.FAULTED_STRING_COUNT} of {N.STRINGS} strings are bypassed in the reference case. That local pattern is the reason to inspect the array more closely.</p>
        </article>
        <div className="lp-case-notes">
          <article className="lp-card" data-reveal style={at(1)} onPointerMove={spotlight}><p className="lp-tag"><ScanSearch size={18} aria-hidden />What the evidence supports</p><h3>A measured band, scoped to one module.</h3><p>The real thermal grid contains {cellGrid.defects.length} hot cells in one band. The committed detector evidence has {N.DETECTION_CONFIDENCE === null ? 'no reported confidence' : `${num(N.DETECTION_CONFIDENCE, 3)} confidence`}. A new flight keeps its own capture and result; it does not inherit a successful detection.</p></article>
          <article className="lp-card" data-reveal style={at(2)} onPointerMove={spotlight}><p className="lp-tag"><Hourglass size={18} aria-hidden />What waiting could cost</p><h3 className="num">{MWh(N.LOSS_72H_MWH)} · {lostRevenue(N.LOSS_72H_MWH)}</h3><p>The projected loss over the forecast, valued at the sourced Bhadla tariff. The committed action deadline is {N.ACT_BEFORE}; its thermal threshold and dose budget are declared assumptions.</p></article>
        </div>
      </div>
    </section>
  );
}

/* ── The difference ──────────────────────────────────────────────────────── */

const FIELD_ROWS = 4;
const FIELD_COLS = 14;
/** Cells of the little field the footprint lands on. An illustration, with no reading behind it. */
const UNDER_FOOTPRINT = new Set(['1-4', '1-5', '1-6', '1-7', '2-4', '2-5', '2-6', '2-7', '2-8']);

function MiniField() {
  return (
    <div className="lp-minifield" aria-hidden>
      <div className="lp-cells" style={{ gridTemplateColumns: `repeat(${FIELD_COLS}, 1fr)` }}>
        {Array.from({ length: FIELD_ROWS * FIELD_COLS }, (_, i) => {
          const key = `${Math.floor(i / FIELD_COLS)}-${i % FIELD_COLS}`;
          return <i key={key} data-hit={UNDER_FOOTPRINT.has(key)} />;
        })}
      </div>
      <b className="lp-footprint" />
    </div>
  );
}

function Matrix() {
  const hot = new Set(cellGrid.defects.map((d) => `${d.row}-${d.col}`));
  return (
    <div className="lp-matrix" style={{ '--cols': cellGrid.cols } as React.CSSProperties} role="img" aria-label={`Thermal map of one module of ${ARRAY_ID}, ${cellGrid.rows} rows by ${cellGrid.cols} columns, with ${cellGrid.defects.length} hot cells in one band`}>
      {cellGrid.matrix.flatMap((row, r) => row.map((dt, c) => (
        <i
          key={`${r}-${c}`}
          data-hot={hot.has(`${r + 1}-${c + 1}`)}
          style={{ '--i': r * cellGrid.cols + c, background: ironbowForDeltaT(dt) } as React.CSSProperties}
        />
      )))}
    </div>
  );
}

function Arithmetic() {
  const ranked = rankQueue(repairQueue).map((t) => ({ t, s: scoreBreakdown(t) }));
  const top = ranked[0]?.s.score ?? 1;
  return (
    <ol className="lp-sum">
      {ranked.map(({ t, s }, i) => (
        <li key={t.id} style={at(i)} data-sev={t.severity}>
          <span className="id">{t.panelId}</span>
          <span className="calc num">{MWh(s.loss)} × {num(s.severity, 1)} × {num(s.urgency, 2)} ÷ {num(s.access, 1)}</span>
          <span className="total num">{num(s.score, 2)}</span>
          {/* The square root keeps the smallest job visible beside one that leads it many times over. */}
          <i className="fill" style={{ '--w': Math.sqrt(s.score / top).toFixed(4) } as React.CSSProperties} />
        </li>
      ))}
    </ol>
  );
}

export function Difference() {
  return (
    <section className="lp-section" id="difference" aria-labelledby="difference-h">
      <header className="lp-head" data-reveal>
        <p className="lp-kicker">The difference</p>
        <h2 id="difference-h">Go beyond the inspection. Make the next move count.</h2>
        <p className="lp-sub">
          Connect inspection evidence to urgency, energy value and crew capacity in one operating workflow.
        </p>
      </header>

      <div className="lp-bento">
        <article className="lp-card deadline" data-reveal style={at(0)} onPointerMove={spotlight}>
          <p className="lp-tag"><Hourglass size={16} aria-hidden />A computed deadline</p>
          <p className="lp-huge num">{N.ACT_BEFORE}</p>
          <p>
            The hour <span className="id">{ARRAY_ID}</span> must be acted on by. Not looked up: counted from how long the
            cracked cell spends above {degC(T_PROP_C, 0)} against a {hours(DOSE_BUDGET_H, 0)} budget, on a forecast peaking at {degC(N.PEAK_AMBIENT_C)}.
          </p>
          <div className="lp-dose" aria-hidden><i /></div>
          <p className="fine">Threshold and budget are declared engineering assumptions.</p>
        </article>

        <article className="lp-card arithmetic" data-reveal style={at(1)} onPointerMove={spotlight}>
          <p className="lp-tag"><Gauge size={16} aria-hidden />Arithmetic on screen</p>
          <p className="lp-formula">score = loss per day × severity × urgency ÷ access</p>
          <Arithmetic />
          <p className="fine">The committed queue, ranked by one function. No model has an opinion on the order.</p>
        </article>

        <article className="lp-card live" data-reveal style={at(2)} onPointerMove={spotlight}>
          <p className="lp-tag"><Radar size={16} aria-hidden />A plan that re-derives live</p>
          <h3>Name a hazard. Drag it onto the field.</h3>
          <p>
            A dust storm, a cloud bank or a heatwave. The arrays under it change, the queue re-ranks, the deadlines move
            and the crew day is solved again, with what it costs in rupees.
          </p>
          <MiniField />
          <Link className="lp-ghost" href="/console">Try it in the sandbox<ArrowRight size={16} aria-hidden /></Link>
        </article>

        <article className="lp-card thermal" data-reveal style={at(3)} onPointerMove={spotlight}>
          <p className="lp-tag"><ScanSearch size={16} aria-hidden />Evidence you can point at</p>
          <Matrix />
          <p>
            {cellGrid.defects.length} hot cells in one band across row {cellGrid.defects[0]?.row}, measured from a real UAV
            thermal frame of one module. The band is the shape a bypassed substring makes.
          </p>
          <p className="fine">Held for <span className="id">{ARRAY_ID}</span> only. No other array may show it.</p>
        </article>

        <article className="lp-card gate" data-reveal style={at(4)} onPointerMove={spotlight}>
          <p className="lp-tag"><UserCheck size={16} aria-hidden />A human gate</p>
          <h3>The agent proposes. A person decides.</h3>
          <ol className="lp-chain" aria-hidden>
            <li>Proposed</li><li>Approved by an operator</li><li>Work order</li>
          </ol>
          <p>A plan is a proposal. A work order exists only after an operator approves it, and they can decline with a recorded reason.</p>
        </article>

        <article className="lp-card no" data-reveal style={at(5)} onPointerMove={spotlight}>
          <p className="lp-tag"><Droplets size={16} aria-hidden />Targeted dispatch</p>
          <h3>Match the resource to the repair.</h3>
          <p>
            A uniform shortfall at normal temperature can indicate soiling. The agent can recommend a wash crew directly,
            preserving drone capacity for cases where imaging adds useful evidence.
          </p>
        </article>
      </div>
    </section>
  );
}

/* ── A window onto the field ─────────────────────────────────────────────── */

export function Window() {
  return (
    <section className="lp-window" aria-label="The live model">
      <div className="lp-window-title" data-reveal><p className="lp-kicker">One field. A connected workflow.</p><h2>The bigger picture.<br />Down to the module.</h2><Link className="lp-ghost" href="/console">Explore the digital twin<ArrowRight size={18} aria-hidden /></Link></div>
      <p className="glass" data-reveal>
        <i aria-hidden />Behind this page: the same {panels.length} modelled arrays the console runs. The scene is simulated; array states follow the console session.
      </p>
    </section>
  );
}

/* ── The product ─────────────────────────────────────────────────────────── */

const TOUR = [
  { id: 'site', label: 'Site', says: 'The twin of the block, with the live repair queue. A 2D map is one click away.' },
  { id: 'sandbox', label: 'Sandbox', says: 'A cloud bank placed over the field: affected arrays, the output change, why it happened and the recommended response.' },
  { id: 'queue', label: 'Queue', says: 'Every job with its cause and its arithmetic, beside the day plan for two crews.' },
  { id: 'drone', label: 'Drone fleet', says: 'Simulated mission phases, battery and links, with a profile of the visible, thermal and acoustic inspection stages.' },
  { id: 'dossier', label: 'Dossier', says: 'The evidence chain, the captured frames and the measured anomaly matrix.' },
  { id: 'analytics', label: 'Analytics', says: 'Expected against actual over the forecast, the loss by cause, and the tariff with its sources.' },
];

export function Tour() {
  const theme = useSession((s) => s.theme);
  const [shown, setShown] = useState(TOUR[0].id);
  const current = TOUR.find((t) => t.id === shown) ?? TOUR[0];
  const capture = `/landing/tour/${theme === 'light' ? 'light/' : ''}${current.id}.${theme === 'light' && current.id === 'sandbox' ? 'png' : 'jpg'}`;
  return (
    <section className="lp-section" id="product" aria-labelledby="product-h">
      <header className="lp-head" data-reveal>
        <p className="lp-kicker">The product</p>
        <h2 id="product-h">Your field. Your evidence. Your next decision.</h2>
        <p className="lp-sub">Captures of the working console in your selected theme. These are snapshots; figures in the running product change with site time.</p>
      </header>

      <div className="lp-tour" data-reveal>
        <div className="lp-tabs" role="tablist" aria-label="Screens">
          {TOUR.map((t) => (
            <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={t.id === shown} aria-controls="tour-panel" tabIndex={t.id === shown ? 0 : -1} onClick={() => setShown(t.id)} onKeyDown={(e) => {
              const index = TOUR.findIndex((item) => item.id === shown);
              const next = e.key === 'Home' ? 0 : e.key === 'End' ? TOUR.length - 1
                : ['ArrowRight', 'ArrowDown'].includes(e.key) ? (index + 1) % TOUR.length
                  : ['ArrowLeft', 'ArrowUp'].includes(e.key) ? (index + TOUR.length - 1) % TOUR.length : null;
              if (next === null) return;
              e.preventDefault();
              setShown(TOUR[next].id);
              document.getElementById(`tab-${TOUR[next].id}`)?.focus();
            }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="lp-screen" role="tabpanel" id="tour-panel" aria-labelledby={`tab-${current.id}`}>
          <div className="lp-capture-head"><span><i aria-hidden />{current.label} workspace</span><a href={capture} target="_blank" rel="noreferrer">View full capture<ArrowRight size={16} aria-hidden /></a></div>
          <div className="lp-shots">
            {TOUR.map((t) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${theme}-${t.id}`} src={`/landing/tour/${theme === 'light' ? 'light/' : ''}${t.id}.${theme === 'light' && t.id === 'sandbox' ? 'png' : 'jpg'}`} alt={t.id === shown ? `The ${t.label} screen. ${t.says}` : ''} data-on={t.id === shown} loading="lazy" />
            ))}
          </div>
        </div>
        <div className="lp-tour-caption"><p className="lp-caption">{current.says}</p><Link className="lp-ghost" href="/console">Explore the working product<ArrowRight size={16} aria-hidden /></Link></div>
      </div>
    </section>
  );
}

const QUESTIONS_ABOUT_PRODUCT = [
  { question: 'What can I actually try in the prototype?', answer: 'Open the console, load the rehearsal, select an array, inspect its dossier and dispatch a simulated flight when imaging is useful. In Sandbox, drop dust or cloud onto the twin, or apply a heatwave, then watch the model, queue and crew plan respond.' },
  { question: 'Does the agent decide what gets repaired?', answer: 'It proposes a cause and recommendation. A fixed formula determines queue order, and the scheduler proposes a crew day. The operator is the approval gate: only their action creates a work order, and a refusal can carry a recorded reason.' },
  { question: 'Where do the rupee figures come from?', answer: 'Projected lost energy is valued using the capacity-weighted tariff of the SECI Bhadla Phase-III auction lots. Analytics shows the tariff arithmetic and sources. The figure is the value of lost generation, not a settlement charge or a guaranteed saving.' },
  { question: 'What happens when evidence or a solver is unavailable?', answer: 'A detector that finds nothing returns no box. The console distinguishes captured evidence from committed reference evidence. If the optimization solver is unavailable, the heuristic plan is labelled as such; a time-limited solution is not presented as a proven optimum.' },
  { question: 'Is this connected to a solar plant or a real drone?', answer: 'No. Telemetry, weather and drone flight are simulated. The working prototype brings the model, trained visible-image detector, evidence dossier, queue and approval flow together. Plant telemetry ingestion and physical drone integration remain future work.' },
  { question: 'Can the model classify thermal faults?', answer: 'Not yet. The measured thermal band supports the committed reference case, but a thermal classifier has not been trained. The browser detector processes visible images; its reported performance is scoped to its class and held-out split.' },
];

export function Questions() {
  return (
    <section className="lp-section" aria-labelledby="questions-h">
      <header className="lp-head" data-reveal><p className="lp-kicker">Before you take a look</p><h2 id="questions-h">The practical questions.</h2><p className="lp-sub">What you can operate today, how recommendations are made, and where the prototype stops.</p></header>
      <div className="lp-faq" data-reveal>{QUESTIONS_ABOUT_PRODUCT.map(({ question, answer }) => <details key={question}><summary>{question}<span aria-hidden>+</span></summary><p>{answer}</p></details>)}</div>
    </section>
  );
}

/* ── What is real ────────────────────────────────────────────────────────── */

const LEDGER = [
  { head: 'Evidence-backed foundations', sev: 'active', items: ['Our trained visible-image detector, measured on a held-out split', 'A thermal band measured from a real UAV frame', 'Auction-awarded tariffs with linked sources', 'Published PV equations'] },
  { head: 'An interactive operating model', sev: 'info', items: ['Simulated array telemetry from the PV model', 'Simulated drone inspection in the digital twin', 'A simulated weather forecast for planning'] },
  { head: 'Transparent planning inputs', sev: 'info', items: ['Declared sandbox hazard strengths', 'Declared repair durations and crew availability', 'A stated forecast band', 'Declared thermal threshold and dose budget'] },
  { head: 'Next integrations', sev: 'info', items: ['Plant telemetry ingestion: future integration', 'Physical drone links: future integration', 'Thermal classification: the classifier is not built'] },
];

export function Capabilities() {
  return (
    <section className="lp-section" id="capabilities" aria-labelledby="capabilities-h">
      <header className="lp-head" data-reveal>
        <p className="lp-kicker">Built today. Room to grow.</p>
        <h2 id="capabilities-h">A working foundation for smarter solar operations.</h2>
        <p className="lp-sub">Explore a complete inspection and triage workflow, grounded in published models, trained vision and traceable calculations.</p>
      </header>

      <div className="lp-ledger">
        {LEDGER.map(({ head, sev, items }, i) => (
          <article key={head} className="lp-card" data-reveal data-sev={sev} style={at(i)} onPointerMove={spotlight}>
            <h3>{head}</h3>
            <ul>{items.map((it) => <li key={it}>{it}</li>)}</ul>
          </article>
        ))}
      </div>

      <div className="lp-money lp-card" data-reveal onPointerMove={spotlight}>
        <p className="lp-big num">{lostRevenue(N.LOSS_72H_MWH)}</p>
        <div>
          <p>
            What <span className="id">{ARRAY_ID}</span> loses over the 72 h forecast: {MWh(N.LOSS_72H_MWH)}, {TARIFF_BASIS}.
            Rupees here are lost energy times that tariff and nothing else.
          </p>
          <p className="lp-formula num">{TARIFF_ARITHMETIC}</p>
        </div>
      </div>
    </section>
  );
}

/* ── Built with ──────────────────────────────────────────────────────────── */

const STACK_A = ['Next.js', 'React', 'TypeScript', 'three.js', 'React Three Fiber', 'Zustand', 'Zod'];
const STACK_B = ['YOLOv8n', 'ONNX Runtime Web', 'HiGHS in WebAssembly', 'Groq', 'PVWatts model', 'Vitest', 'Playwright'];

function Marquee({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  return (
    <div className="lp-marquee" data-reverse={reverse}>
      {[0, 1].map((copy) => (
        <ul key={copy} aria-hidden={copy === 1}>
          {items.map((it) => <li key={it}>{it}</li>)}
        </ul>
      ))}
    </div>
  );
}

export function Stack() {
  return (
    <section className="lp-section tight" aria-labelledby="stack-h">
      <header className="lp-head" data-reveal>
        <p className="lp-kicker">Built with</p>
        <h2 id="stack-h">A trained detector and an exact solver, both in the browser.</h2>
      </header>
      <div data-reveal>
        <Marquee items={STACK_A} />
        <Marquee items={STACK_B} reverse />
      </div>
    </section>
  );
}

/* ── The way in ──────────────────────────────────────────────────────────── */

export function Closing() {
  return (
    <>
      <section className="lp-closing" aria-labelledby="closing-h" data-reveal>
        <div className="lp-closing-copy"><p className="lp-kicker">Take the operator’s seat</p><h2 id="closing-h">See the evidence.<br />Make the call.</h2><p>A working console to explore the path from a power anomaly to a proposed repair. Start with the reference case, then change the conditions yourself.</p><Link className="lp-cta" href="/console">Open the console<ArrowRight size={18} aria-hidden /></Link><span className="lp-disclosure">Hackathon prototype · No plant connection required</span></div>
        <div className="lp-first-session"><p className="lp-tag"><Navigation size={20} aria-hidden />Your first session</p><ol>{[
          ['Load the rehearsal', 'Begin with the seeded site state and its committed evidence.'],
          [`Inspect ${ARRAY_ID}`, 'Review the shortfall, captured frames and proposed action.'],
          ['Change the conditions', 'Drop a dust storm in Sandbox and compare the new queue.'],
          ['Review the plan', 'Check the arithmetic and crew day before approving work.'],
        ].map(([title, description], i) => <li key={title}><span className="num">{i + 1}</span><div><strong>{title}</strong><p>{description}</p></div></li>)}</ol></div>
      </section>
      <footer className="lp-foot">
        <div><a className="lp-brand" href="#top"><i aria-hidden />Surya agent</a><p>Solar intelligence. Human control.</p><a className="src" href={REPO} rel="noreferrer" target="_blank">Source on GitHub · AGPL-3.0</a></div>
        <div><strong>Built by team Sigmoid</strong><p>Rehaan Ahmad Khan, Shantanu Singh,<br />Lakshita Rawat, Krishna Agarwal.</p></div>
        <div><strong>Research and data</strong><p>The loop follows the Robinsun solar agent. Thermal data: Raptor Maps&apos; InfraredSolarModules. Detector training: Solar Panel Fault Detection on Roboflow Universe.</p></div>
      </footer>
    </>
  );
}
