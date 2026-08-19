'use client';

/**
 * Findings + Recommendation — the two prose blocks the agent produces.
 *
 * Both are absent until Phase 6 writes data/agent_cache.json. That is the honest
 * state: there is no fallback copy, because a hand-written "finding" sitting where
 * a model's output belongs is exactly the substitution this project exists to
 * avoid. plan/04 §4 — absent means absent.
 *
 * The per-cell ΔT list lives in AnomalyMatrix, next to the grid it describes. A
 * second copy used to live here, wrapped by DetailPanel under the same heading.
 */

import { typographic } from '@/lib/format';
import { BEAT, useAgentCache } from '@/store/selectors';

export function Findings() {
  const cache = useAgentCache();
  if (!cache) return null;

  return (
    <p className="t-prose" style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
      {typographic(cache.triage.reasoning)}
    </p>
  );
}

export function Recommendation() {
  const cache = useAgentCache();
  if (!cache) return null;
  const { recommendation } = cache;

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--sp-2)' }}>
        {recommendation.steps.map((step, i) => (
          <li key={i} className="t-prose" style={{ color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--sev-critical)', marginRight: 6 }}>▸</span>
            {typographic(step)}
          </li>
        ))}
      </ul>
      <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
        {typographic(recommendation.costOfDelayNote)}
      </span>
    </div>
  );
}

/** Whether either prose block has anything to say yet. */
export function useHasAgentProse(): boolean {
  const cache = useAgentCache();
  return Boolean(cache);
}

export { BEAT };
