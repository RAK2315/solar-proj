'use client';

/**
 * src/store/triage.ts — runtime agent results, per array.
 *
 * Live mode triages whichever array the operator selected, so results are cached
 * BY ARRAY — not by site time. Triage is a judgement about a fault, and the fault
 * does not become a different fault a minute later. Re-running it every tick would
 * burn the rate limit and produce prose that flickers.
 *
 * BUT IT IS ALSO KEYED ON THE ARRAY'S CONDITION, and that was missing. The
 * reasoning above holds for an array whose fault has already developed. It is
 * FALSE for one that was healthy when it was asked about: select B-17 at 10:00,
 * its crack begins at 10:04, and the console then carried "all metrics are within
 * tolerance, physical inspection is unnecessary — confidence 1.00" underneath a
 * CRITICAL badge and a −41.7 % deviation, permanently, because the entry existed
 * and nothing ever asked again.
 *
 * So an entry records the condition it was taken under, and a change of condition
 * invalidates it. Not a change of TIME — a change of what there was to judge.
 *
 * `status` is deliberately four-valued. 'unavailable' is a real, expected outcome —
 * no key, no network, a rate limit — and it must be distinguishable from 'idle' so
 * the console can SAY the agent is unavailable rather than rendering nothing and
 * letting the operator assume there was nothing to say.
 *
 * TWO THINGS THE OFFLINE PATH GOT WRONG, both found by asking what happens on a
 * venue's wifi rather than on a broken one:
 *
 *   A request that HANGS never resolved. A dead network throws and is handled;
 *   a network that accepts the connection and then stalls does neither, so the
 *   console sat on "Triaging B-17…" with a pulsing dot, forever. A stall that
 *   looks like work is worse than a failure that says so, so there is now a
 *   deadline and it reports as a timeout.
 *
 *   A failure was FINAL. One flaky moment and that array's agent was unavailable
 *   until it was deselected and reselected — which is not a recovery anyone finds
 *   under pressure. `retry` exists, and the console offers it.
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
  /**
   * The array's condition when this verdict was taken. A verdict about a healthy
   * array does not survive that array becoming faulted — see the header.
   */
  condition?: string;
  /**
   * Wall clock of the last attempt, and whether asking again could help.
   *
   * A RATE LIMIT AND A BAD KEY ARE NOT THE SAME FAILURE, and treating them the
   * same is why the panel read AGENT UNAVAILABLE at random. Groq's free tier
   * counts per minute and the site clock flips array statuses several times a
   * second at 600x, so a burst of 429s was routine - and each one stuck until an
   * operator noticed the TRY AGAIN button, which under a projector nobody does.
   *
   * A 429, a 5xx, a timeout or a dead socket are all transient: the next ask may
   * well work. A 400 or a 401 will not, so those stay put rather than hammering
   * the provider with a request that cannot succeed.
   *
   * NOT A SECOND CLOCK. Nothing counts down. `request` compares two timestamps
   * when it is called anyway, which is the same shape as the `condition` check
   * beside it - see CLAUDE.md rule 3, which bans timers that DRIVE state.
   */
  attemptedAt?: number;
  retriable?: boolean;
}

/**
 * How long a transient failure is left alone before the next ask is allowed.
 *
 * Long enough that a per-minute rate limit has room to recover, short enough that
 * an operator reading the panel sees it fix itself rather than giving up on it.
 */
const RETRY_AFTER_MS = 6000;

interface TriageState {
  byPanel: Record<string, TriageEntry>;
  /**
   * `condition` is the array's status when asked. Passing a different one for an
   * array already in the cache re-asks; passing the same one is a no-op, which is
   * what stops this firing on every render.
   */
  request: (
    panelId: string,
    siteSeconds: number,
    condition: string,
    /** Faults the operator injected this session — causes, never readings. */
    injected?: readonly unknown[],
  ) => Promise<void>;
  /** Ask again for an array that failed. The only way past an `unavailable`. */
  retry: (
    panelId: string,
    siteSeconds: number,
    condition: string,
    injected?: readonly unknown[],
  ) => Promise<void>;
  clear: () => void;
}

/**
 * How long the agent gets before the console stops waiting.
 *
 * The model itself answers in a couple of seconds and the route retries up to
 * three times behind this, so the budget covers the whole exchange. It exists for
 * the case where the connection is technically up and going nowhere.
 */
export const AGENT_TIMEOUT_MS = 20_000;


export const useTriage = create<TriageState>((set, get) => ({
  byPanel: {},

  request: async (panelId, siteSeconds, condition, injected = []) => {
    const existing = get().byPanel[panelId];
    // One request per array PER CONDITION. Already loading, already answered,
    // already known to be unavailable — all mean do not ask again, unless the
    // thing being judged has changed underneath the answer.
    const staleFailure = existing?.status === 'unavailable'
      && existing.retriable
      && Date.now() - (existing.attemptedAt ?? 0) >= RETRY_AFTER_MS;
    if (existing && existing.status !== 'idle'
      && existing.condition === condition && !staleFailure) return;

    set((s) => ({ byPanel: { ...s.byPanel, [panelId]: { status: 'loading', condition } } }));

    // AbortSignal.timeout rather than a setTimeout: this store is outside
    // src/components, but a hand-rolled timer would still be a second thing in
    // the app that counts time, and there is exactly one of those by design.
    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // A panel id, a time, and the operator's own injected CAUSES. Never a
        // reading — the route recomputes every figure from these and rejects any
        // extra key outright.
        body: JSON.stringify({ panelId, siteSeconds, injected }),
        signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
      });

      const json = await res.json();

      if (!res.ok) {
        // A RATE LIMIT IS NOT A BROKEN KEY, and it read as one. Running the site
        // at 600x flips array statuses constantly, every flip is a new condition
        // and therefore a new question, and Groq's free tier counts per minute.
        // The console filled with "AGENT UNAVAILABLE" and the obvious conclusion
        // was that the credentials had expired. Naming it — and naming the cause,
        // which is the clock — turns a dead end into something to do.
        //
        // A blanket cooldown was tried first and was worse: it drops requests
        // silently, so an array the operator has just selected can sit without a
        // verdict for no visible reason. Better to ask, be told no, and say so.
        const limited = res.status === 429;
        set((s) => ({
          byPanel: {
            ...s.byPanel,
            [panelId]: {
              status: 'unavailable',
              condition,
              attemptedAt: Date.now(),
              // A 400 or a 401 will fail again for the same reason. Everything
              // else might not.
              retriable: limited || res.status >= 500,
              reason: limited
                ? 'Rate limited by the model provider, the site clock is running '
                  + 'fast, so statuses are changing faster than the agent can be '
                  + 'asked about them. Slow the clock or press TRY AGAIN.'
                : json?.reason ?? `agent returned ${res.status}`,
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
            condition,
            triage: json.triage,
            model: json.meta?.model,
            requestedAt: siteSeconds,
          },
        },
      }));
    } catch (err) {
      // A timeout arrives here as a TimeoutError, which would otherwise reach the
      // operator as the browser's own wording. Say what actually happened.
      const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
      set((s) => ({
        byPanel: {
          ...s.byPanel,
          [panelId]: {
            status: 'unavailable',
            condition,
            attemptedAt: Date.now(),
            // A stall or a dead socket is a moment, not a verdict.
            retriable: true,
            reason: timedOut
              ? `No answer within ${AGENT_TIMEOUT_MS / 1000}s, the network is up but the agent is not responding.`
              : err instanceof Error ? err.message : 'network unreachable',
          },
        },
      }));
    }
  },

  retry: async (panelId, siteSeconds, condition, injected = []) => {
    // Drop the entry first: `request` refuses to ask again for anything that is
    // not idle, which is what stops it re-asking on every render.
    set((s) => {
      const rest = { ...s.byPanel };
      delete rest[panelId];
      return { byPanel: rest };
    });

    await get().request(panelId, siteSeconds, condition, injected);
  },

  clear: () => set({ byPanel: {} }),
}));
