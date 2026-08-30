'use client';

/**
 * EvidenceChain — the incident as one argument, top to bottom.
 *
 * WHAT IT REPLACES CONCEPTUALLY. Nothing is removed from the rail; this sits above
 * it and does the job the rail could not. The rail is a set of readings, correct
 * and dense. This is the reasoning that joins them — observed, checked, diagnosed,
 * projected, recommended, decided — and it exists because a reader who has never
 * seen the product needs the argument before the numbers, not after.
 *
 * EVERY STEP CARRIES ITS BASIS, and that is the point rather than a nicety. A
 * measurement, a model projection, a deterministic calculation, a declared
 * assumption and a sentence a language model wrote are five different kinds of
 * claim, and an ordinary dashboard destroys the difference by rendering all five
 * at the same weight. Here the badge is always present and always says which.
 *
 * A STEP WITH NOTHING TO SAY SAYS NOTHING. It renders as a dim rule with its label
 * and no body — never "no data available", never a skeleton, never a greyed box
 * implying evidence that is absent. Same rule as the rest of the console (plan/04
 * §4), for the same reason.
 */

import { Check, CircleDashed, Loader, Slash } from 'lucide-react';

import { BASIS_LABEL, type ChainStep, type Incident, type StepState } from '@/lib/incident';

/** Colour by state, not by severity — this is about progress, not danger. */
const STATE_COLOUR: Record<StepState, string> = {
  done: 'var(--sev-active)',
  active: 'var(--sev-warning)',
  pending: 'var(--line-active)',
  blocked: 'var(--sev-critical)',
};

const STATE_ICON: Record<StepState, typeof Check> = {
  done: Check,
  active: Loader,
  pending: CircleDashed,
  blocked: Slash,
};

/**
 * The badge that says what KIND of claim this is.
 *
 * Deliberately not colour-coded by trustworthiness. Ranking the bases visually
 * would be this component making an argument of its own, and the honest position
 * is that a declared assumption is not worse than a measurement — it is different,
 * and the reader gets to decide what that is worth.
 */
function BasisBadge({ step }: { step: ChainStep }) {
  if (!step.basis) return null;
  return (
    <span
      className="t-micro"
      style={{
        color: 'var(--text-secondary)',
        border: '1px solid var(--line-active)',
        padding: '1px 6px',
        whiteSpace: 'nowrap',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      {BASIS_LABEL[step.basis]}
    </span>
  );
}

function Step({ step, last }: { step: ChainStep; last: boolean }) {
  const colour = STATE_COLOUR[step.state];
  const Icon = STATE_ICON[step.state];
  const quiet = step.state === 'pending';

  return (
    <li style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: 'var(--sp-3)' }}>
      {/* The rail: a marker and the line down to the next step. Drawn rather than
          bordered so the line stops at the last step instead of dangling. */}
      <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', justifyItems: 'center' }}>
        <span style={{
          width: 18, height: 18, display: 'grid', placeItems: 'center',
          border: `1px solid ${colour}`,
          background: step.state === 'done' ? colour : 'transparent',
          color: step.state === 'done' ? 'var(--text-inverse)' : colour,
        }}>
          <Icon size={11} strokeWidth={2.5} aria-hidden />
        </span>
        {!last && <span style={{ width: 1, background: 'var(--line-hairline)', marginTop: 2 }} />}
      </div>

      <div style={{
        display: 'grid', gap: 'var(--sp-1)',
        paddingBottom: last ? 0 : 'var(--sp-4)', minWidth: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 'var(--sp-2)',
        }}>
          <span className="t-h2" style={{ color: quiet ? 'var(--text-secondary)' : colour }}>
            {step.label}
          </span>
          {!quiet && <BasisBadge step={step} />}
        </div>

        {/* Absent means absent. A pending step is a label and a dim marker. */}
        {step.says && (
          <p className="t-prose" style={{
            color: 'var(--text-primary)', margin: 0, fontSize: 13, lineHeight: 1.5,
          }}>
            {step.says}
          </p>
        )}

        {/* WHAT WAS RULED OUT, and by what. The eliminations are half the
            reasoning and they were invisible: a console that only ever states its
            conclusion is asking to be trusted, while one that shows what it
            considered and discarded is showing its work. This is also the only
            place the site GEOMETRY reaches the argument — row shading is ruled in
            or out by the sun's height against the row pitch and tilt, which is a
            question a flat map cannot answer. */}
        {step.ruledOut && step.ruledOut.length > 0 && (
          <ul style={{
            listStyle: 'none', margin: '2px 0 0', padding: 0,
            display: 'grid', gap: 2,
          }}>
            {step.ruledOut.map((r) => (
              <li
                key={r.cause}
                className="t-micro"
                style={{
                  color: 'var(--text-secondary)',
                  display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 6,
                  alignItems: 'baseline',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }} aria-hidden>✕</span>
                <span>
                  <span style={{ color: 'var(--text-primary)' }}>{r.cause}</span>
                  {' — '}
                  {r.because}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* What produced the claim, named so a reader can go and check it rather
            than take the console's word. This is the sentence that turns a
            dashboard into evidence. */}
        {step.says && step.source && (
          <span className="t-micro workings" style={{ color: 'var(--text-secondary)' }}>
            {step.source}
          </span>
        )}
      </div>
    </li>
  );
}

export function EvidenceChain({ incident }: { incident: Incident }) {
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid' }}>
      {incident.chain.map((step, i) => (
        <Step key={step.key} step={step} last={i === incident.chain.length - 1} />
      ))}
    </ol>
  );
}
