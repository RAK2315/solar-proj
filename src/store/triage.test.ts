/**
 * The agent's OFFLINE behaviour, which is the behaviour that actually gets
 * demonstrated on a venue's wifi.
 *
 * The happy path is covered by the route's own tests. What is asserted here is
 * everything that happens when the model does not answer — because the product's
 * standing claim is that an absent agent degrades honestly and never substitutes
 * prose nobody checked, and that claim is only worth as much as its worst case.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AGENT_TIMEOUT_MS, useTriage } from './triage';

const realFetch = globalThis.fetch;

beforeEach(() => useTriage.getState().clear());
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('when the agent cannot answer', () => {
  it('reports a dead network as unavailable, with the reason', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    await useTriage.getState().request('B-17', 0, 'critical');

    const entry = useTriage.getState().byPanel['B-17'];
    expect(entry.status).toBe('unavailable');
    expect(entry.reason).toContain('Failed to fetch');
    // The readings must never be touched by an agent failure.
    expect(entry.triage).toBeUndefined();
  });

  it('reports a STALL as a timeout rather than waiting forever', async () => {
    // The failure that has no error: the connection is accepted and then goes
    // nowhere. Before the deadline existed this left the console pulsing
    // "Triaging…" indefinitely, which reads as work rather than as a fault.
    globalThis.fetch = vi.fn().mockRejectedValue(
      new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
    );

    await useTriage.getState().request('B-17', 0, 'critical');

    const entry = useTriage.getState().byPanel['B-17'];
    expect(entry.status).toBe('unavailable');
    expect(entry.reason).toContain(`${AGENT_TIMEOUT_MS / 1000}s`);
    expect(entry.reason).toMatch(/not responding/);
  });

  it('passes a server reason straight through instead of inventing one', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'unavailable', reason: 'No GROQ_API_KEY configured on the server.' }),
    });

    await useTriage.getState().request('B-17', 0, 'critical');

    expect(useTriage.getState().byPanel['B-17'].reason)
      .toBe('No GROQ_API_KEY configured on the server.');
  });

  it('does not ask twice for the same array', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    globalThis.fetch = fetchMock;

    await useTriage.getState().request('B-17', 0, 'critical');
    await useTriage.getState().request('B-17', 60, 'critical');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('DOES ask again when the array itself has changed', () => {
    // The guard is per array PER CONDITION. A verdict taken while an array was
    // healthy must not survive that array becoming critical — the console
    // carried "within tolerance, inspection unnecessary, confidence 1.00" under a
    // CRITICAL badge because nothing ever asked a second time.
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    globalThis.fetch = fetchMock;

    return useTriage.getState().request('B-17', 0, 'healthy')
      .then(() => useTriage.getState().request('B-17', 300, 'critical'))
      .then(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(useTriage.getState().byPanel['B-17'].condition).toBe('critical');
      });
  });

  it('retry is the way past that, and it succeeds when the network comes back', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          triage: { severity: 'critical', suspectComponent: 'INV-B', reasoning: 'x',
            requiresPhysicalVerification: true, verificationRationale: 'y', confidence: 0.9 },
          meta: { model: 'openai/gpt-oss-120b' },
        }),
      });
    globalThis.fetch = fetchMock;

    await useTriage.getState().request('B-17', 0, 'critical');
    expect(useTriage.getState().byPanel['B-17'].status).toBe('unavailable');

    await useTriage.getState().retry('B-17', 0, 'critical');

    const entry = useTriage.getState().byPanel['B-17'];
    expect(entry.status).toBe('ready');
    expect(entry.triage?.suspectComponent).toBe('INV-B');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('sends an array id, a time and injected CAUSES — never a reading', async () => {
    // The route recomputes every figure server-side precisely so a caller cannot
    // hand the model numbers the site never produced. The third field does not
    // weaken that: a scenario event says "this array has a crack on five strings
    // from 11:20" and the server works out what that DOES. A cause, not a
    // reading — and the route's schema is strict, so anything else is a 400.
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    globalThis.fetch = fetchMock;

    await useTriage.getState().request('B-17', 1234, 'critical');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(Object.keys(body).sort()).toEqual(['injected', 'panelId', 'siteSeconds']);
    expect(body.injected).toEqual([]);
  });

  it('passes the operator\u2019s injected faults through', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    globalThis.fetch = fetchMock;

    const event = { id: 'inj-1', type: 'mismatch-fault', panelId: 'A-03', startHour: 11 };
    await useTriage.getState().request('A-03', 3600, 'critical', [event]);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.injected).toEqual([event]);
  });
});

/**
 * A rate limit read as a broken key, which sent the operator looking for a
 * credentials problem that did not exist.
 */
describe('rate limiting', () => {
  it('names the limit AND its cause, which is the clock', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'rate_limit_exceeded' }),
    });

    await useTriage.getState().request('B-17', 0, 'critical');

    const reason = useTriage.getState().byPanel['B-17'].reason!;
    expect(reason).toMatch(/Rate limited/);
    expect(reason).toMatch(/site clock is running fast/);
    expect(reason).toMatch(/Slow the clock or press TRY AGAIN/);
  });

  it('still passes other server reasons through untouched', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ reason: 'No GROQ_API_KEY configured on the server.' }),
    });
    await useTriage.getState().request('B-17', 0, 'critical');
    expect(useTriage.getState().byPanel['B-17'].reason)
      .toBe('No GROQ_API_KEY configured on the server.');
  });
});
