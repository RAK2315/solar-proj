'use client';

/**
 * src/store/solver.ts — the exact solver, loaded once.
 *
 * HiGHS is about a megabyte of WebAssembly. It is fetched after first paint, not
 * with the page, because the console is useful before it arrives: until then, and
 * for good if the fetch fails, the day plan is the heuristic's and says so.
 *
 * Loading is the only asynchronous thing about it. Once it is here, a solve is a
 * synchronous function of the problem, which is what lets the plan be derived
 * like everything else instead of awaited.
 */

import { create } from 'zustand';

import type { Solver } from '@/lib/scheduler';

export type SolverStatus = 'idle' | 'loading' | 'ready' | 'failed';

interface SolverState {
  status: SolverStatus;
  solver: Solver | null;
  /** Why it failed. Shown behind the working, not swallowed. */
  reason?: string;
  load: () => Promise<void>;
}

/** Where scripts/sync_artefacts.mjs puts the .wasm. */
const WASM_URL = '/highs/highs.wasm';

export const useSolver = create<SolverState>((set, get) => ({
  status: 'idle',
  solver: null,

  load: async () => {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    try {
      const { default: highsLoader } = await import('highs');
      const highs = await highsLoader({ locateFile: (file) => (file.endsWith('.wasm') ? WASM_URL : file) });
      set({ status: 'ready', solver: highs as unknown as Solver });
    } catch (e) {
      set({ status: 'failed', solver: null, reason: e instanceof Error ? e.message : String(e) });
    }
  },
}));
