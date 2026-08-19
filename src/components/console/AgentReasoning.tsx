'use client';

/**
 * AgentReasoning — the labelled stage cards.
 *
 * Each stage gets its own card with a teal left border and a header reading
 * `TRIAGE · openai/gpt-oss-120b`. **The visible model ID is deliberate**: it is part
 * of what makes the agent visible rather than magic, and it is the difference
 * between "an AI decided" and "this model, on these inputs, wrote this sentence".
 *
 * The prose is CACHED and typewritten as a pure function of `t` — cached because a
 * live call on demo day is a network dependency, and because the numbers were never
 * LLM-produced in the first place. The model writes prose ABOUT numbers that came
 * out of the generator; `run_agent.py` cross-checks every numeric field against
 * telemetry.json before it will write the cache.
 *
 * Absent until Phase 6 produces the cache. plan/04 §4: absent means absent.
 */

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { typographic } from '@/lib/format';
import { BEAT, useAgentCache, useStreamedText } from '@/store/selectors';

function StageCard({
  stage, model, text, startT, meta,
}: {
  stage: string; model: string; text: string; startT: number; meta?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const streamed = useStreamedText(typographic(text), startT);
  if (!streamed) return null;

  const truncated = !expanded && streamed.length > 240;
  const shown = truncated ? `${streamed.slice(0, 240)}…` : streamed;
  const typing = streamed.length < text.length;

  return (
    <article style={{
      border: '1px solid var(--sev-active)',
      background: 'color-mix(in srgb, var(--sev-active) 6%, var(--surface-panel))',
      padding: 'var(--sp-3)',
      display: 'grid', gap: 'var(--sp-2)',
    }}>
      {/* A full teal outline rather than a left edge. The keyed-edge treatment is
          the console's device for SEVERITY; the agent is not a severity, and giving
          its prose the same shape as an alarm made a paragraph look like a fault.
          An outlined box says "a different kind of claim". */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 'var(--sp-2)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} strokeWidth={2} aria-hidden style={{ color: 'var(--sev-active)' }} />
          <span className="t-h2" style={{ color: 'var(--sev-active)' }}>{stage}</span>
        </span>
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>{model}</span>
      </div>

      <p className="t-prose" style={{ color: 'var(--text-primary)', margin: 0 }}>
        {shown}
        {typing && (
          <span style={{
            display: 'inline-block', width: 2, height: '1em', marginLeft: 2,
            background: 'var(--sev-active)', verticalAlign: 'text-bottom',
          }} />
        )}
      </p>

      {meta}

      {streamed.length > 240 && !typing && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="btn-reset t-h2"
          style={{ color: 'var(--sev-active)', justifySelf: 'start' }}
        >
          {expanded ? 'Show less ‹' : 'Show more ›'}
        </button>
      )}
    </article>
  );
}

/**
 * `stages` — the rail carries TRIAGE only and the dossier carries all three.
 *
 * §2 has the triage card streaming into the console at t=10, so it cannot simply
 * move out of the rail. But three streaming paragraphs stacked in a 448px column
 * is a third of the density complaint on its own, so prognosis and recommendation
 * are read where there is room to read them.
 */
export function AgentReasoning({ stages = 'all' }: { stages?: 'triage' | 'all' }) {
  const cache = useAgentCache();
  if (!cache) return null;
  const { triage, prognosis, recommendation, meta } = cache;

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
      <StageCard
        stage="Triage"
        model={meta.model}
        text={`${triage.reasoning} ${triage.verificationRationale}`}
        startT={BEAT.triage}
        meta={
          <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
            suspect {triage.suspectComponent} · severity {triage.severity} ·
            {' '}physical verification {triage.requiresPhysicalVerification ? 'REQUIRED' : 'not required'}
          </span>
        }
      />

      {stages === 'triage' ? null : <>
      <StageCard
        stage="Prognosis"
        model={meta.model}
        text={prognosis.reasoning}
        startT={BEAT.prognosis}
        meta={
          <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
            {prognosis.degradationMechanism} · risk {prognosis.riskLevel} ·
            {' '}act before {prognosis.actBefore}
          </span>
        }
      />

      <StageCard
        stage="Recommendation"
        model={meta.model}
        text={recommendation.primaryAction}
        startT={BEAT.recommendation}
        meta={
          <ol style={{ margin: 0, paddingLeft: 'var(--sp-4)', display: 'grid', gap: 2 }}>
            {recommendation.steps.map((s, i) => (
              <li key={i} className="t-data" style={{ color: 'var(--text-secondary)' }}>{s}</li>
            ))}
          </ol>
        }
      />
      </>}
    </div>
  );
}
