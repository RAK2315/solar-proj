'use client';

/**
 * Findings + Recommendation — the two prose blocks the agent produces.
 *
 * Both are absent until Phase 6 writes data/agent_cache.json. That is the honest
 * state: there is no fallback copy, because a hand-written "finding" sitting where
 * a model's output belongs is exactly the substitution this project exists to
 * avoid. plan/04 §4 — absent means absent.
 *
 * The CELL DEFECTS list beneath is different: it is measured, not reasoned, so it
 * renders as soon as the thermal scan reaches each cell.
 */

import { deltaT, typographic } from '@/lib/format';
import { BEAT, useAgentCache, useCellGrid, useMatrixFillCount } from '@/store/selectors';

export function CellDefectList() {
  const grid = useCellGrid();
  const filled = useMatrixFillCount();

  const found = grid.defects
    .slice()
    .sort((a, b) => a.row - b.row || a.col - b.col)
    .filter((d) => (d.row - 1) * grid.cols + (d.col - 1) < filled);

  if (!found.length) return null;

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
      {found.map((d) => (
        <li key={`${d.row}-${d.col}`} className="t-data" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>▸</span>
          {d.type} at cell ({d.row},{d.col}) ·{' '}
          <span className="t-data-em" style={{ color: 'var(--sev-warning)' }}>
            ΔT {deltaT(d.deltaTC)}
          </span>
        </li>
      ))}
    </ul>
  );
}

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
      <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
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
