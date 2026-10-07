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
import { MWh, degC, hours, num } from '@/lib/format';
import { ironbowForDeltaT } from '@/lib/ironbow';
import { TARIFF_ARITHMETIC, TARIFF_BASIS, lostRevenue } from '@/lib/money';
import { DOSE_BUDGET_H, T_PROP_C } from '@/lib/physics';
import { rankQueue, scoreBreakdown } from '@/lib/ranking';

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

/* ── The problem ─────────────────────────────────────────────────────────── */

const QUESTIONS = [
  { Icon: MapPin, q: 'Which module?', a: 'Telemetry stops at the string. The fault is in one module of one array.' },
  { Icon: HelpCircle, q: 'Dirt or damage?', a: 'Soiling and a cracked cell look the same from the inverter. Only imaging separates them.' },
  { Icon: Hourglass, q: 'How urgent?', a: 'A dirty array can wait for a wash. A cracked cell under a clear, hot forecast cannot.' },
];

export function Problem() {
  return (
    <section className="lp-section" id="problem" aria-labelledby="problem-h">
      <header className="lp-head" data-reveal>
        <p className="lp-kicker">The problem</p>
        <h2 id="problem-h">Monitoring says output fell. It cannot say why.</h2>
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
          <li>Nothing is scheduled without an operator.</li>
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

export function LoopSection() {
  return (
    <section className="lp-section" id="loop" aria-labelledby="loop-h">
      <header className="lp-head" data-reveal>
        <p className="lp-kicker">The loop</p>
        <h2 id="loop-h">Eight steps, from an anomaly to an approved work order.</h2>
        <p className="lp-sub">Seven run unattended. The eighth is a person, on purpose.</p>
      </header>
      <ol className="loop lp-loop" data-reveal>
        {LOOP.map(({ Icon, step, says }, i) => (
          <li key={step} style={at(i)} data-gate={i === LOOP.length - 1}>
            <span className="badge"><Icon size={18} strokeWidth={1.75} aria-hidden /></span>
            <span className="rank num">{i + 1}</span>
            <strong>{step}</strong>
            <span className="says">{says}</span>
          </li>
        ))}
      </ol>
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
        <h2 id="difference-h">Others hand over a report of defects. This hands over a plan.</h2>
        <p className="lp-sub">
          Drone inspection with AI classification already exists, and so do 3D twins. What comes after the picture is the part worth building.
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
          <p className="lp-tag"><Droplets size={16} aria-hidden />It says no</p>
          <h3>A dirty array gets a wash crew, not a flight.</h3>
          <p>
            Down evenly across every string at normal temperature is soiling. Imaging it would confirm what telemetry
            already said, so no drone is sent. An agent that always dispatches has not decided anything.
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
      <p className="glass" data-reveal>
        <i aria-hidden />Behind this page: the same {panels.length} arrays the console runs, drawn live. The red one is <span className="id">{ARRAY_ID}</span>.
      </p>
    </section>
  );
}

/* ── The product ─────────────────────────────────────────────────────────── */

const TOUR = [
  { id: 'site', label: 'Site', says: 'The twin of the block, with the live repair queue. A 2D map is one click away.' },
  { id: 'sandbox', label: 'Sandbox', says: 'A dust storm dropped on Zone B: the queue re-ranked, and the cost over 72 h in rupees.' },
  { id: 'queue', label: 'Queue', says: 'Every job with its cause and its arithmetic, beside the day plan for two crews.' },
  { id: 'drone', label: 'Drone pass', says: 'The frame the drone’s camera returned, with the box the detector drew on it in the browser.' },
  { id: 'dossier', label: 'Dossier', says: 'The evidence chain, the captured frames and the measured anomaly matrix.' },
  { id: 'analytics', label: 'Analytics', says: 'Expected against actual over the forecast, the loss by cause, and the tariff with its sources.' },
];

export function Tour() {
  const [shown, setShown] = useState(TOUR[0].id);
  const current = TOUR.find((t) => t.id === shown) ?? TOUR[0];
  return (
    <section className="lp-section" id="product" aria-labelledby="product-h">
      <header className="lp-head" data-reveal>
        <p className="lp-kicker">The product</p>
        <h2 id="product-h">Six screens, all working.</h2>
        <p className="lp-sub">Captures of the running console, taken on 7 Oct 2026. Figures in them move with site time.</p>
      </header>

      <div className="lp-tour" data-reveal>
        <div className="lp-tabs" role="tablist" aria-label="Screens">
          {TOUR.map((t) => (
            <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={t.id === shown} aria-controls="tour-panel" onClick={() => setShown(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="lp-screen" role="tabpanel" id="tour-panel" aria-labelledby={`tab-${current.id}`}>
          <div className="lp-chrome" aria-hidden><i /><i /><i /><span>The console</span></div>
          <div className="lp-shots">
            {TOUR.map((t) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={t.id} src={`/landing/tour/${t.id}.jpg`} alt={t.id === shown ? `The ${t.label} screen. ${t.says}` : ''} data-on={t.id === shown} loading="lazy" />
            ))}
          </div>
        </div>
        <p className="lp-caption">{current.says}</p>
      </div>
    </section>
  );
}

/* ── What is real ────────────────────────────────────────────────────────── */

const LEDGER = [
  { head: 'Real', sev: 'active', items: ['The detector, trained by us and measured on a held-out split', 'The thermal band, measured from a real UAV frame', 'The tariffs, as awarded at auction', 'The PV equations, from a published model'] },
  { head: 'Simulated', sev: 'info', items: ['Telemetry for every array, from the PV model with stated coefficients', 'The drone flight, in the 3D scene', 'The 72 h weather forecast'] },
  { head: 'Declared assumption', sev: 'warning', items: ['Hazard strengths in the sandbox', 'Crew hours for each kind of repair', 'The forecast band', 'The thermal span and the dose threshold behind the deadline'] },
  { head: 'Not built', sev: 'critical', items: ['A thermal classifier: no model is trained and no result is claimed', 'A connection to a real plant or a real drone', 'Any deviation settlement charge'] },
];

export function Honest() {
  return (
    <section className="lp-section" id="honest" aria-labelledby="honest-h">
      <header className="lp-head" data-reveal>
        <p className="lp-kicker">What is real</p>
        <h2 id="honest-h">What is real, what is simulated, what is assumed, what is not built.</h2>
        <p className="lp-sub">Said before anyone has to ask. It is the reason the rest can be believed.</p>
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
        <h2 id="closing-h">See the plan re-derive.</h2>
        <p>Load the rehearsal, select <span className="id">{ARRAY_ID}</span>, send a drone, then drop a dust storm on the field.</p>
        <Link className="lp-cta" href="/console">Open the console<ArrowRight size={18} aria-hidden /></Link>
      </section>
      <footer className="lp-foot">
        <p><strong>Surya agent</strong>, by team Sigmoid: Rehaan Ahmad Khan, Shantanu Singh, Lakshita Rawat, Krishna Agarwal.</p>
        <p>
          The loop follows the Robinsun solar agent. Thermal data is Raptor Maps&apos; open InfraredSolarModules set; the detector is
          trained on Solar Panel Fault Detection from Roboflow Universe.
        </p>
        <p><a className="src" href={REPO} rel="noreferrer" target="_blank">Source on GitHub</a>, AGPL-3.0.</p>
      </footer>
    </>
  );
}
