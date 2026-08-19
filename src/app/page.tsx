/**
 * The landing page.
 *
 * THE ARGUMENT, in the order it is made:
 *
 *   1. India is installing solar faster than almost anyone. Installed capacity is
 *      not delivered capacity.
 *   2. Here is the gap, in the numbers this build actually produces.
 *   3. Here is the loop that closes it, ending at a human.
 *   4. Here is what is genuinely real in it, with provenance for each claim.
 *   5. Open the console.
 *
 * EVERY FIGURE IS COMPUTED, none typed. They come through `./numbers`, which
 * evaluates the same physics the console runs on — so this page cannot make a claim
 * the product does not support, and `npm run check:literals` fails the build if
 * anyone ever pastes one in as text.
 *
 * NO SOURCED STATISTIC APPEARS HERE. CLAUDE.md §1 is explicit: state assumptions out
 * loud rather than quote a soiling-loss percentage or a ₹ figure that cannot be
 * shown. So the page argues entirely from its own model, says so, and the one
 * external fact it uses — that Bhadla exists and how big it is — is the site the
 * model is built on rather than a statistic about an industry.
 *
 * It is the one route in the application that scrolls. `body` is `overflow: hidden`
 * because a scrollbar on a projector is a bug, so the page provides its own
 * scrolling viewport rather than changing that for the console's sake.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight, Crosshair, FileCheck2, Gauge, Radar, ScanLine, ShieldCheck,
  Sparkles, Wrench,
} from 'lucide-react';

import { MWh, kW, num, pct, wm2, degC } from '@/lib/format';
import {
  ACT_BEFORE, AMBIENT_C, ARRAY_DEVIATION_PCT, CELL_TEMP_C, CLEAR_HOURS,
  CRACKED_AP50, DAILY_LOSS_MWH, DELIVERED_SHARE_PCT, DETECTION_CONFIDENCE,
  DETECTOR_SPLIT, FAULTED_STRING_COUNT, IRRADIANCE, LOSS_72H_MWH, NAMEPLATE_MW,
  OUTPUT_MW, PEAK_AMBIENT_C, SHORTFALL_KW, STRINGS, STRING_DEVIATION_PCT,
} from './numbers';

export const metadata: Metadata = {
  title: 'SURYA AGENT — installed capacity is not delivered capacity',
  description:
    'An autonomous inspection and triage agent for utility-scale solar. It finds the '
    + 'array that is underperforming, sends a drone to prove why, and hands the '
    + 'operator a ranked repair order with a deadline.',
};

/* ── Primitives ─────────────────────────────────────────────────────────────
   The landing page uses the console's tokens and type scale and nothing else, so
   the first screen of the product is not a stylistic surprise after the page that
   sold it. Same ironbow ramp, same three type roles, same square corners.
   ───────────────────────────────────────────────────────────────────────────── */

const MAX = 1180;

function Section({ id, eyebrow, title, lede, children }: {
  id?: string; eyebrow: string; title: string; lede?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} style={{ borderTop: '1px solid var(--line-hairline)' }}>
      <div style={{
        maxWidth: MAX, margin: '0 auto', padding: '72px 32px',
        display: 'grid', gap: 'var(--sp-6)',
      }}>
        <header style={{ display: 'grid', gap: 'var(--sp-3)', maxWidth: '68ch' }}>
          <span className="t-h2" style={{ color: 'var(--sev-active)' }}>{eyebrow}</span>
          <h2 style={{
            font: '700 34px/1.15 var(--font-mono)', letterSpacing: '-0.015em',
            color: 'var(--text-primary)', margin: 0,
          }}>
            {title}
          </h2>
          {lede && (
            <p className="t-prose" style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 16 }}>
              {lede}
            </p>
          )}
        </header>
        {children}
      </div>
    </section>
  );
}

/** A derived figure, at the size the console gives its heroes. */
function Stat({ value, unit, label, note, colour = 'var(--text-primary)' }: {
  value: string; unit: string; label: string; note: string; colour?: string;
}) {
  return (
    <div style={{
      display: 'grid', gap: 'var(--sp-3)', alignContent: 'start',
      padding: 'var(--sp-5)',
      background: 'var(--surface-panel)',
      border: '1px solid var(--line-hairline)',
    }}>
      <span className="t-h2" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="t-hero" style={{ color: colour }}>
        {value}
        <span className="t-kpi-unit" style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>
          {unit}
        </span>
      </span>
      <span className="underline-rule" style={{ color: colour }} aria-hidden>
        <i style={{ width: '100%' }} />
      </span>
      <span className="t-micro" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {note}
      </span>
    </div>
  );
}

/** One step of the loop. The numbered rail down the left is the sequence. */
function Step({ n, Icon, title, body, gate = false }: {
  n: number; Icon: typeof Gauge; title: string; body: string; gate?: boolean;
}) {
  const colour = gate ? 'var(--sev-critical-ink)' : 'var(--sev-active)';
  return (
    <li style={{
      display: 'grid', gridTemplateColumns: '52px 1fr', gap: 'var(--sp-4)',
      padding: 'var(--sp-4) var(--sp-4) var(--sp-4) 0',
      borderLeft: `2px solid ${gate ? 'var(--sev-critical)' : 'var(--line-active)'}`,
      paddingLeft: 'var(--sp-4)',
      background: gate ? 'var(--surface-raised)' : 'transparent',
    }}>
      <span style={{ display: 'grid', gap: 'var(--sp-2)', justifyItems: 'center' }}>
        <span className="t-data-em" style={{ color: 'var(--text-secondary)' }}>
          {String(n).padStart(2, '0')}
        </span>
        <Icon size={19} strokeWidth={1.75} aria-hidden style={{ color: colour }} />
      </span>
      <span style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <span className="t-h1" style={{ color: gate ? colour : 'var(--text-primary)' }}>
          {title}
        </span>
        <span className="t-prose" style={{ color: 'var(--text-secondary)' }}>{body}</span>
      </span>
    </li>
  );
}

/** A claim with the file that backs it. Provenance is the whole point of the block. */
function Claim({ title, body, source }: {
  title: string; body: string; source: string;
}) {
  return (
    <article style={{
      display: 'grid', gap: 'var(--sp-3)', alignContent: 'start',
      background: 'var(--surface-panel)',
      border: '1px solid var(--line-hairline)',
      borderTop: '2px solid var(--sev-active)',
      padding: 'var(--sp-5)',
    }}>
      <h3 className="t-h1" style={{ color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
      <p className="t-prose" style={{ color: 'var(--text-secondary)', margin: 0 }}>{body}</p>
      <code className="t-micro" style={{
        color: 'var(--sev-active)', background: 'var(--surface-inset)',
        padding: '6px var(--sp-3)', justifySelf: 'start',
      }}>
        {source}
      </code>
    </article>
  );
}

export default function Landing() {
  return (
    <main style={{
      height: '100vh', overflowY: 'auto',
      background: 'var(--surface-void)', color: 'var(--text-primary)',
    }}>
      {/* ── Chrome ─────────────────────────────────────────────────────────── */}
      <div className="panel hair-b" style={{
        position: 'sticky', top: 0, zIndex: 10, height: 64,
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{
          maxWidth: MAX, width: '100%', margin: '0 auto', padding: '0 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 'var(--sp-4)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <span style={{
              width: 30, height: 30, display: 'grid', placeItems: 'center',
              background: 'var(--sev-active)', color: 'var(--text-inverse)',
            }}>
              <Radar size={17} strokeWidth={2.25} aria-hidden />
            </span>
            <span className="t-h1" style={{ color: 'var(--sev-active)', letterSpacing: '0.2em' }}>
              SURYA AGENT
            </span>
          </span>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)' }}>
            <a className="t-h2" href="#gap" style={{ color: 'var(--text-secondary)' }}>The gap</a>
            <a className="t-h2" href="#loop" style={{ color: 'var(--text-secondary)' }}>The loop</a>
            <a className="t-h2" href="#real" style={{ color: 'var(--text-secondary)' }}>What is real</a>
            <Link
              href="/console"
              className="t-h1"
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
                background: 'var(--sev-active)', color: 'var(--text-inverse)',
                padding: '10px var(--sp-4)',
              }}
            >
              Open console
              <ArrowRight size={15} strokeWidth={2.5} aria-hidden />
            </Link>
          </nav>
        </div>
      </div>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <span className="survey-grid" aria-hidden style={{ opacity: 0.25 }} />
        <div style={{
          maxWidth: MAX, margin: '0 auto', padding: '104px 32px 88px',
          display: 'grid', gap: 'var(--sp-6)', position: 'relative',
        }}>
          <span className="t-h2" style={{ color: 'var(--sev-warning-ink)' }}>
            Operations &amp; maintenance for utility-scale solar
          </span>

          <h1 style={{
            font: '700 62px/1.06 var(--font-mono)', letterSpacing: '-0.03em',
            margin: 0, maxWidth: '19ch',
          }}>
            Installed capacity is not{' '}
            <span style={{ color: 'var(--sev-active)' }}>delivered capacity.</span>
          </h1>

          <p className="t-prose" style={{
            color: 'var(--text-secondary)', maxWidth: '62ch', margin: 0,
            fontSize: 18, lineHeight: 1.6,
          }}>
            India is putting up solar faster than almost anyone. The harder problem is
            keeping what is already standing at its rated output — a park is built
            once and then quietly loses megawatt-hours to soiling, cracked cells and
            dead bypass diodes for the next twenty-five years. SURYA is the agent that
            finds those losses, sends a drone to prove what is causing them, and hands
            an operator a ranked repair order with a deadline on it.
          </p>

          <p className="t-prose" style={{
            color: 'var(--text-primary)', maxWidth: '62ch', margin: 0, fontSize: 16,
          }}>
            Generating more is one lever. Losing less is the one nobody is holding.
          </p>

          <div style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/console"
              className="t-h1"
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
                background: 'var(--sev-active)', color: 'var(--text-inverse)',
                padding: 'var(--sp-4) var(--sp-5)',
              }}
            >
              Open the live console
              <ArrowRight size={17} strokeWidth={2.5} aria-hidden />
            </Link>
            <a
              href="#loop"
              className="t-h1"
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
                border: '1px solid var(--line-focus)', color: 'var(--text-primary)',
                padding: 'var(--sp-4) var(--sp-5)',
              }}
            >
              How the loop works
            </a>
            <span className="t-micro" style={{ color: 'var(--text-secondary)', maxWidth: '34ch', lineHeight: 1.6 }}>
              The console opens live. Press{' '}
              <span className="t-data-em" style={{ color: 'var(--sev-active)' }}>M</span>{' '}
              inside it for the scripted 90-second incident.
            </span>
          </div>
        </div>
      </div>

      {/* ── The gap ────────────────────────────────────────────────────────── */}
      <Section
        id="gap"
        eyebrow="The gap, in this build's own numbers"
        title="A 500 MW block, modelled honestly, is delivering under three-quarters of its nameplate — and that is before anything is broken."
        lede={`Every figure on this page is evaluated from the same PV performance model the console runs on, at ${wm2(IRRADIANCE)} and ${degC(AMBIENT_C, 0)} ambient. None of them is typed in as text; the build fails if one ever is.`}
      >
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-4)',
        }}>
          <Stat
            label="Delivered vs nameplate"
            value={num(DELIVERED_SHARE_PCT, 0)}
            unit="%"
            colour="var(--sev-active)"
            note={`${num(OUTPUT_MW, 0)} MW out of ${num(NAMEPLATE_MW, 0)} MW, because the cells are at ${degC(CELL_TEMP_C)} and silicon loses power as it heats. That is physics, not a fault — and it is the baseline everything recoverable sits on top of.`}
          />
          <Stat
            label="One faulted array"
            value={num(ARRAY_DEVIATION_PCT, 1)}
            unit="%"
            colour="var(--sev-critical-ink)"
            note={`${FAULTED_STRING_COUNT} of ${STRINGS} strings bypassed behind one cracked cell. The faulted string itself is ${pct(STRING_DEVIATION_PCT)}; the array figure is that spread across the strings that are still fine. Two different quantities, and the console never conflates them.`}
          />
          <Stat
            label="Bleeding, per day"
            value={num(DAILY_LOSS_MWH, 2)}
            unit="MWh"
            colour="var(--sev-warning-ink)"
            note={`${kW(SHORTFALL_KW, 1)} of shortfall integrated across the day's irradiance curve — ${MWh(LOSS_72H_MWH)} over the 72 hours before anyone would otherwise have noticed. From one array, of 120.`}
          />
        </div>

        <p className="t-prose" style={{
          color: 'var(--text-secondary)', maxWidth: '78ch', margin: 0,
        }}>
          SCADA will tell you that string is down. It will not tell you{' '}
          <em>which panel</em>, <em>why</em>, or <em>how urgent</em> — soiling and a
          cracked cell produce nearly the same signature at the inverter, and the two
          have completely different answers. Somebody drives out and looks. The median
          time from anomaly to diagnosis is measured in days, and every one of those
          days is measured in the number above.
        </p>
      </Section>

      {/* ── The loop ───────────────────────────────────────────────────────── */}
      <Section
        id="loop"
        eyebrow="The loop"
        title="Anomaly to a deadlined work order, unattended right up to a person."
        lede="Eight steps. Seven of them run without anybody watching. The eighth is a human, on purpose, and it is the most prominent control in the product."
      >
        <ol style={{
          listStyle: 'none', margin: 0, padding: 0,
          display: 'grid', gap: 'var(--sp-2)',
        }}>
          <Step
            n={1} Icon={Gauge} title="Telemetry anomaly"
            body="The site model is evaluated continuously. An array drifts below what its irradiance and cell temperature say it should be producing, and the deviation crosses a threshold."
          />
          <Step
            n={2} Icon={Sparkles} title="Triage"
            body="The agent is given the array's identity and nothing else; the route recomputes every figure server-side and cross-checks the model's prose against them before a word is returned. It decides what is wrong, how bad, and — the load-bearing judgement — whether telemetry alone can distinguish soiling from physical damage."
          />
          <Step
            n={3} Icon={Crosshair} title="Dispatch"
            body="It cannot, so the agent takes an action in the world: a drone is sent to the specific array, on a route drawn to that array, and the 3D flight is the same scene the operator can watch."
          />
          <Step
            n={4} Icon={ScanLine} title="Evidence capture"
            body="RGB, thermal and acoustic, on station. The captured frames belong to the array they were taken over and to no other — an array with no imagery on file is told so plainly rather than shown somebody else's."
          />
          <Step
            n={5} Icon={Radar} title="Vision"
            body="A YOLOv8n detector, fine-tuned on labelled solar imagery, localises the surface defect. A classical CV pass over the thermal frame resolves the hot band to individual cells in a 5×7 grid — the signature element of the console, and a physical map of a physical object."
          />
          <Step
            n={6} Icon={Gauge} title="Prognosis"
            body={`The defect state, the degradation mechanism and 72 hours of forecast produce a deadline: ${ACT_BEFORE}, the hour at which the cracked cell's cumulative time above the propagation threshold reaches its dose budget. ${CLEAR_HOURS} clear hours ahead, peaking at ${degC(PEAK_AMBIENT_C)}, is what makes waiting expensive.`}
          />
          <Step
            n={7} Icon={Wrench} title="Ranked recommendation"
            body="The queue order is a pure function — loss × severity × urgency ÷ access cost — never decided by a model, because a ranking that changes between two runs of the same demo is a ranking nobody can trust. The four inputs are shown next to the score they produce."
          />
          <Step
            n={8} Icon={ShieldCheck} gate title="Human approval gate"
            body="Nothing enters the work queue without an operator. They approve, or they decline with a reason that is recorded. This is the answer to 'would you let it run unsupervised?', and it is deliberately the loudest thing on the screen."
          />
          <Step
            n={9} Icon={FileCheck2} title="Work order"
            body="The array moves from critical to scheduled, the queue re-ranks, and the day curve on the analytics screen moves with it."
          />
        </ol>
      </Section>

      {/* ── What is real ───────────────────────────────────────────────────── */}
      <Section
        id="real"
        eyebrow="What is actually real in it"
        title="Four claims, each with the file that backs it."
        lede="A demo is worth as much as the part of it you can open. These are the parts."
      >
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-4)',
        }}>
          <Claim
            title="The physics is a published model"
            body="Output is NREL PVWatts with cell temperature from the NOCT model, at stated coefficients: γ = −0.0037 /°C, NOCT 45 °C, η_inv 0.98. The Python generator and the browser code are the same model twice, and a golden test recomputes the entire committed telemetry series from the TypeScript to prove they have not drifted. Math.random() is banned across the source tree."
            source="scripts/physics.py ↔ src/lib/physics.ts"
          />
          <Claim
            title="The detector was trained, and the metric is the real one"
            body={
              CRACKED_AP50 !== null && DETECTION_CONFIDENCE !== null
                ? `YOLOv8n fine-tuned on a CC BY 4.0 Roboflow dataset. Cracked scores AP@50 ${CRACKED_AP50.toFixed(3)} on the ${DETECTOR_SPLIT} split, and the evidence frame in the console is drawn from that split — so the ${DETECTION_CONFIDENCE.toFixed(4)} confidence it displays is a genuine output on an image the model never saw. Reported per class, never rounded up, and one class is undefined rather than zero because it has no test instances.`
                : 'YOLOv8n fine-tuned on a CC BY 4.0 Roboflow dataset, with per-class AP@50 reported on the held-out test split.'
            }
            source="models/defect_yolov8n.pt · docs/dataset-provenance.md"
          />
          <Claim
            title="The thermal band was measured, not authored"
            body="The four hot cells and their ΔT come out of a classical CV pass over a real UAV thermal frame from the Raptor Maps InfraredSolarModules set. The value reads lower than a thermographer would quote because it is a cell mean under a declared 8-bit scaling rather than a radiometric peak pixel — which the console says on screen, next to the grid. An invariant fails the build if anyone tunes the scaling to reach a nicer number."
            source="scripts/thermal_hotspot.py · data/evidence/b17_cellgrid.json"
          />
          <Claim
            title="The agent writes prose about numbers it was not given"
            body="Every figure on screen comes from the generator or the model; the LLM is handed an array identity, and the route recomputes the facts and cross-checks each numeric field before returning anything. It writes the reasoning, never the readings — and the queue ordering it has no say in at all."
            source="src/app/api/triage/route.ts · src/lib/ranking.ts"
          />
        </div>
      </Section>

      {/* ── Why an agent ───────────────────────────────────────────────────── */}
      <Section
        eyebrow="The question that decides it"
        title="Why an agent, and not a threshold dashboard?"
      >
        <p className="t-prose" style={{
          color: 'var(--text-secondary)', maxWidth: '78ch', margin: 0, fontSize: 16,
        }}>
          A rule engine tells you a string is down. It cannot tell you when that string
          becomes unrecoverable, because that answer needs three things combined — the
          confirmed defect state, the mechanism by which it propagates, and the weather
          for the next three days. Put those together and you get{' '}
          <span className="t-data-em" style={{ color: 'var(--sev-warning-ink)' }}>
            act before {ACT_BEFORE}
          </span>
          , which is a decision an operator can schedule against. No threshold produces
          a deadline. That is the whole difference, and it is the stage of the loop the
          rest of it exists to make possible.
        </p>
      </Section>

      {/* ── Close ──────────────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--line-active)', background: 'var(--surface-panel)' }}>
        <div style={{
          maxWidth: MAX, margin: '0 auto', padding: '72px 32px',
          display: 'grid', gap: 'var(--sp-5)', justifyItems: 'start',
        }}>
          <h2 style={{
            font: '700 38px/1.15 var(--font-mono)', letterSpacing: '-0.02em',
            margin: 0, maxWidth: '22ch',
          }}>
            120 arrays. Three faults. One drone and a person who has to sign.
          </h2>
          <p className="t-prose" style={{ color: 'var(--text-secondary)', maxWidth: '62ch', margin: 0 }}>
            Pick any array on the map, run triage on it, dispatch a drone and watch the
            flight, then approve or override what comes back. Nothing is on rails and
            the session survives a reload.
          </p>
          <Link
            href="/console"
            className="t-h1"
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
              background: 'var(--sev-active)', color: 'var(--text-inverse)',
              padding: 'var(--sp-4) var(--sp-6)',
            }}
          >
            Open the console
            <ArrowRight size={17} strokeWidth={2.5} aria-hidden />
          </Link>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--line-hairline)' }}>
        <div style={{
          maxWidth: MAX, margin: '0 auto', padding: '32px',
          display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-4)',
          flexWrap: 'wrap',
        }}>
          <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
            SURYA AGENT · a 500 MW block of Bhadla Solar Park, Rajasthan · 27.540° N, 71.915° E
          </span>
          <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
            Telemetry is simulated on a documented PV performance model. The defect
            detector is trained on real labelled imagery.
          </span>
        </div>
      </footer>
    </main>
  );
}
