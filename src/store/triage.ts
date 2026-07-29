'use client';

/**
 * src/store/triage.ts — runtime agent results, per array.
 *
 * Live mode triages whichever array the operator selected, so results are cached
 * BY ARRAY. The cache is keyed on panel id alone, not on site time: triage is a
 * judgement about a fault, and the fault does not become a different fault a minute
 * later. Re-running it every tick would burn the rate limit and produce prose that
 * flickers.
 *
 * `status` is deliberately four-valued. 'unavailable' is a real, expected outcome —
 * no key, no network, a rate limit — and it must be distinguishable from 'idle' so
 * the console can SAY the agent is unavailable rather than rendering nothing and
 * letting the operator assume there was nothing to say.
 */

import { create } from 'zustand';

import type { TriageOutput } from '@/lib/types';

export type TriageStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

export interface TriageEntry {
  status: TriageStatus;
  triage?: TriageOutput;
  model?: string;
  /** Why it is unavailable — shown to the operator, not swallowed. */
  reason?: string;
  requestedAt?: number;
}

interface TriageState {
  byPanel: Record<string, TriageEntry>;
  request: (panelId: string, siteSeconds: number) => Promise<void>;
  clear: () => void;
}

export const useTriage = create<TriageState>((set, get) => ({
  byPanel: {},

  request: async (panelId, siteSeconds) => {
    const existing = get().byPanel[panelId];
    // One request per array. Already loading, already answered, already known to be
    // unavailable — all mean do not ask again.
    if (existing && existing.status !== 'idle') return;

    set((s) => ({ byPanel: { ...s.byPanel, [panelId]: { status: 'loading' } } }));

    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panelId, siteSeconds }),
      });

      const json = await res.json();

      if (!res.ok) {
        set((s) => ({
          byPanel: {
            ...s.byPanel,
            [panelId]: {
              status: 'unavailable',
              reason: json?.reason ?? `agent returned ${res.status}`,
            },
          },
        }));
        return;
      }

      set((s) => ({
        byPanel: {
          ...s.byPanel,
          [panelId]: {
            status: 'ready',
            triage: json.triage,
            model: json.meta?.model,
            requestedAt: siteSeconds,
          },
        },
      }));
    } catch (err) {
      set((s) => ({
        byPanel: {
          ...s.byPanel,
          [panelId]: {
            status: 'unavailable',
            reason: err instanceof Error ? err.message : 'network unreachable',
          },
        },
      }));
    }
  },

  clear: () => set({ byPanel: {} }),
}));
