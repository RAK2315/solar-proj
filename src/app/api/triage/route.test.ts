/**
 * The triage route's guarantees, tested without touching Groq.
 *
 * The interesting cases are the refusals. A route that calls a model on behalf of a
 * browser is the easiest place in a project like this for an unchecked number to get
 * on screen, so what matters is what it does when things go wrong: no key, a
 * fabricating model, a client trying to supply its own readings.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const post = (body: unknown) =>
  POST(new Request('http://localhost/api/triage', {
    method: 'POST',
    body: JSON.stringify(body),
  }));

const originalFetch = globalThis.fetch;
const originalKey = process.env.GROQ_API_KEY;

/** A Groq response whose JSON body is `payload`. */
const mockGroq = (payload: unknown) => {
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify(payload) } }],
  }), { status: 200 })) as unknown as typeof fetch;
};

const goodTriage = {
  severity: 'high',
  suspectComponent: 'INV-B',
  reasoning: 'B-17 is deviating well below expected output for these conditions.',
  requiresPhysicalVerification: true,
  verificationRationale:
    'Heavy localised soiling and physical cell damage both produce this signature; '
    + 'only visual and thermal imaging can distinguish them.',
  confidence: 0.8,
};

beforeEach(() => {
  process.env.GROQ_API_KEY = 'test-key-not-real';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.GROQ_API_KEY = originalKey;
  vi.restoreAllMocks();
});

describe('offline is a first-class outcome, not a crash', () => {
  it('says unavailable with a reason when there is no key', async () => {
    delete process.env.GROQ_API_KEY;
    const res = await post({ panelId: 'B-17', siteSeconds: 600 });
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe('unavailable');
    expect(json.reason).toContain('GROQ_API_KEY');
  });

  it('says unavailable when the upstream call fails', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('network unreachable'); }) as never;
    const res = await post({ panelId: 'B-17', siteSeconds: 600 });
    expect(res.status).toBe(503);
    expect((await res.json()).reason).toContain('network');
  });

  it('NEVER falls back to another array’s cached prose', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('down'); }) as never;
    const body = await (await post({ panelId: 'A-03', siteSeconds: 600 })).json();
    expect(body.triage).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('bypass diode');
  });
});

describe('it validates the request before it spends a token', () => {
  it('rejects an unknown array', async () => {
    const res = await post({ panelId: 'Z-99', siteSeconds: 0 });
    expect(res.status).toBe(404);
  });

  it('rejects a request with no array', async () => {
    expect((await post({ siteSeconds: 0 })).status).toBe(400);
  });
});

describe('the cross-check runs before anything reaches the browser', () => {
  it('returns reasoning that passes', async () => {
    mockGroq(goodTriage);
    const res = await post({ panelId: 'B-17', siteSeconds: 600 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.triage.requiresPhysicalVerification).toBe(true);
    expect(json.meta.checked).toBe(true);
  });

  it('REFUSES a fabricated number, even after retries', async () => {
    mockGroq({
      ...goodTriage,
      reasoning: 'Matching the client-reported 60% output drop on one string.',
    });
    const res = await post({ panelId: 'B-17', siteSeconds: 600 });
    expect(res.status).toBe(503);
    expect((await res.json()).reason).toContain('60');
  });

  it('refuses a rationale that does not justify the dispatch', async () => {
    mockGroq({
      ...goodTriage,
      verificationRationale: 'Further inspection is recommended.',
    });
    const res = await post({ panelId: 'B-17', siteSeconds: 600 });
    expect(res.status).toBe(503);
    expect((await res.json()).reason).toMatch(/soiling|imaging|damage/);
  });

  it('refuses a response that does not match the schema', async () => {
    mockGroq({ severity: 'catastrophic' });
    expect((await post({ panelId: 'B-17', siteSeconds: 600 })).status).toBe(503);
  });

  it('retries with the rejection as a correction before giving up', async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        ...goodTriage, reasoning: 'A 60% drop.',
      }) } }],
    }), { status: 200 }));
    globalThis.fetch = spy as unknown as typeof fetch;

    await post({ panelId: 'B-17', siteSeconds: 600 });
    expect(spy.mock.calls.length).toBeGreaterThan(1);

    const calls = spy.mock.calls as unknown as Array<[string, RequestInit]>;
    const lastBody = JSON.parse(String(calls[calls.length - 1][1].body));
    expect(JSON.stringify(lastBody.messages)).toContain('was rejected');
  });
});

describe('the facts come from the model, not from the caller', () => {
  it('ignores readings supplied in the request body', async () => {
    mockGroq(goodTriage);
    await post({
      panelId: 'B-17',
      siteSeconds: 600,
      // A caller trying to have the agent reason about a fiction.
      deviationPct: -99.9,
      actualKW: 1,
    });

    const sent = JSON.parse(
      String((( globalThis.fetch as unknown as { mock: { calls: unknown[][] } })
        .mock.calls[0][1] as RequestInit).body),
    );
    const prompt = JSON.stringify(sent.messages);
    expect(prompt).not.toContain('99.9');
    expect(prompt).toContain('B-17');
  });

  it('describes the array the caller actually asked about', async () => {
    mockGroq({
      ...goodTriage,
      suspectComponent: 'A-03',
      requiresPhysicalVerification: false,   // A-03 is nominal
    });
    await post({ panelId: 'A-03', siteSeconds: 0 });

    const sent = JSON.parse(
      String((( globalThis.fetch as unknown as { mock: { calls: unknown[][] } })
        .mock.calls[0][1] as RequestInit).body),
    );
    expect(JSON.stringify(sent.messages)).toContain('A-03');
  });
});


describe('a nominal array does not get a drone sent at it', () => {
  it('accepts "no verification required" when the array is within tolerance', async () => {
    mockGroq({
      severity: 'low',
      suspectComponent: 'A-03',
      reasoning: 'A-03 is producing what the model predicts for these conditions.',
      requiresPhysicalVerification: false,
      verificationRationale: 'No deviation to explain.',
      confidence: 0.9,
    });
    const res = await post({ panelId: 'A-03', siteSeconds: 0 });
    expect(res.status).toBe(200);
    expect((await res.json()).triage.requiresPhysicalVerification).toBe(false);
  });

  it('refuses a demand to inspect a healthy array', async () => {
    mockGroq({ ...goodTriage, suspectComponent: 'A-03' });   // requires: true
    const res = await post({ panelId: 'A-03', siteSeconds: 0 });
    expect(res.status).toBe(503);
    expect((await res.json()).reason).toContain('within tolerance');
  });

  it('still demands verification for an array that IS deviating', async () => {
    mockGroq({
      ...goodTriage,
      suspectComponent: 'B-17',
      requiresPhysicalVerification: false,
    });
    const res = await post({ panelId: 'B-17', siteSeconds: 600 });
    expect(res.status).toBe(503);
    expect((await res.json()).reason).toContain('requiresPhysicalVerification');
  });
});
