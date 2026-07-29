/**
 * POST /api/triage — triage any array, at request time.
 *
 * The cached agent in data/agent_cache.json is about B-17 and only B-17. Showing
 * that prose next to array A-03 would be the plainest kind of lie, so live mode
 * calls the model per array — and this route is where that happens.
 *
 * WHY SERVER-SIDE, and not from the browser:
 *
 *   1. The Groq key never reaches the client. A key in a client bundle is a
 *      published key.
 *   2. THE FACTS ARE RECOMPUTED HERE. The client sends a panel id and a site time,
 *      nothing more. If it sent the readings, a caller could ask the model to
 *      reason about numbers the site never produced, and the cross-check would
 *      dutifully approve them because they would match what was sent.
 *   3. The cross-check runs before a single word is returned. A response with a
 *      number that is not in the data is rejected and retried; if it will not
 *      comply, the route returns unavailable and the console says so.
 *
 * Offline is a first-class outcome. No key, no network, a rate limit — all return
 * 503 with a reason, and the UI states that the agent is unavailable rather than
 * substituting prose nobody checked.
 */

import { NextResponse } from 'next/server';

import { allowedNumbers, checkProse, checkTriage, type TriageFacts } from '@/lib/agentCheck';
import { farm, forecast } from '@/lib/data';
import { liveFrameAt } from '@/lib/live';
import { CELL_TEMP_REF_C, cellTemp } from '@/lib/physics';
import { LiveTriageOutput } from '@/lib/types';

export const runtime = 'nodejs';
/** Model output depends on live site state, so nothing here may be cached. */
export const dynamic = 'force-dynamic';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_ATTEMPTS = 3;

const SYSTEM = `You are the triage stage of an autonomous solar-farm maintenance agent.
You receive SCADA telemetry for ONE array and decide what is wrong, how severe it is,
and critically - whether telemetry alone is sufficient to diagnose it, or whether
physical verification is required.

NEVER state a number that is not given to you below. Do not round, restate
approximately, convert units, or introduce a figure from anywhere else. If you want to
mention a quantity you were not given, describe it in words instead.

BIND EVERY NUMBER TO EXACTLY ONE OBJECT. A string deviation and an array deviation are
different quantities measured on different things. Never attribute one to the other.

THE DECISION THAT MATTERS. If this array is deviating materially, telemetry alone
cannot tell you WHY, and requiresPhysicalVerification must be true. If it is within
tolerance, say so plainly and set requiresPhysicalVerification to false - do not
invent a reason to fly a drone at a healthy array.

When it IS deviating: heavy
localised soiling and physical cell damage (a cracked cell driving its bypass diode
into conduction) produce very similar signatures under clear-sky, high-irradiance
conditions, and both raise cell temperature. State this ambiguity explicitly, name
BOTH candidate mechanisms, and say that only imaging - visual and thermal - can
distinguish them.

severity is OPERATIONAL URGENCY, not diagnostic certainty. confidence is a probability
between 0 and 1.

Respond with JSON only. No markdown, no preamble.

Schema:
{
  "severity": "low|medium|high|critical",
  "suspectComponent": string,
  "reasoning": string,
  "requiresPhysicalVerification": boolean,
  "verificationRationale": string,
  "confidence": number
}`;

function userPrompt(f: TriageFacts): string {
  const string = f.stringDeviationPct !== undefined
    ? `  faulted string ${f.panelId}-S3 deviation ${f.stringDeviationPct.toFixed(1)}%\n`
    : '';
  return `Site: a 500 MW block of Bhadla Solar Park, Rajasthan. Local time ${f.clock}.
Conditions: ambient ${f.ambientC.toFixed(1)} C, irradiance ${f.irradiance.toFixed(0)} W/m2, \
cloud ${f.cloudPct.toFixed(0)}%, wind ${f.windMs.toFixed(1)} m/s.

Panel array ${f.panelId} (zone ${f.zone}, on ${f.inverterId}), ${f.stringsPerArray} strings
named ${f.panelId}-S1 through ${f.panelId}-S${f.stringsPerArray}. Refer to components by
these identifiers; do not invent a naming scheme.
  actual ${f.actualKW.toFixed(2)} kW against an expected ${f.expectedKW.toFixed(2)} kW
  array deviation ${f.deviationPct.toFixed(2)}%
${string}  array cell temperature ${f.cellTempC.toFixed(1)} C against a \
${f.fleetMedianCellTempC.toFixed(1)} C fleet median
  last serviced ${f.lastServiced}

Expected output is modelled with NREL PVWatts: gamma -0.0037/C, NOCT 45 C, eta_inv 0.98.

No imaging has been captured for this array. Only SCADA telemetry is available.`;
}

/** Recomputed here, from the model — never taken from the request body. */
function buildFacts(panelId: string, siteSeconds: number): TriageFacts | null {
  const panel = farm.zones.flatMap((z) => z.panels).find((p) => p.id === panelId);
  if (!panel) return null;

  const frame = liveFrameAt(siteSeconds);
  const reading = frame.panels[panelId];
  if (!reading) return null;

  return {
    panelId,
    zone: panel.zone,
    inverterId: panel.inverterId,
    stringsPerArray: panel.stringsPerArray,
    lastServiced: panel.lastServiced,
    clock: frame.clock,
    ambientC: frame.ambientC,
    irradiance: frame.irradiance,
    windMs: frame.windMs,
    cloudPct: frame.cloudPct,
    actualKW: reading.actualKW,
    expectedKW: reading.expectedKW,
    deviationPct: reading.deviationPct,
    stringDeviationPct: reading.stringDeviationPct,
    cellTempC: reading.cellTempC,
    fleetMedianCellTempC: frame.irradiance > 0
      ? cellTemp(frame.ambientC, frame.irradiance)
      : CELL_TEMP_REF_C,
    peakAmbientC: forecast.peakAmbientC,
    actBefore: forecast.actBefore,
  };
}

async function callGroq(
  key: string, model: string, messages: Array<{ role: string; content: string }>,
): Promise<unknown> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq returned ${res.status}`);
  }
  const json = await res.json();
  return JSON.parse(json.choices[0].message.content);
}

export async function POST(request: Request) {
  const key = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

  if (!key) {
    return NextResponse.json(
      { error: 'unavailable', reason: 'No GROQ_API_KEY configured on the server.' },
      { status: 503 },
    );
  }

  let body: { panelId?: string; siteSeconds?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const panelId = String(body.panelId ?? '');
  const siteSeconds = Number(body.siteSeconds ?? 0);
  if (!panelId || !Number.isFinite(siteSeconds)) {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const facts = buildFacts(panelId, siteSeconds);
  if (!facts) {
    return NextResponse.json({ error: 'unknown-array' }, { status: 404 });
  }

  const allowed = allowedNumbers(facts);
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: userPrompt(facts) },
  ];

  let lastReason = 'unknown';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const raw = await callGroq(key, model, messages);

      const parsed = LiveTriageOutput.safeParse(raw);
      if (!parsed.success) {
        lastReason = `response did not match the schema: ${parsed.error.issues[0]?.message}`;
      } else {
        const structural = checkTriage(parsed.data, facts);
        const prose = structural.ok
          ? checkProse(parsed.data, allowed)
          : structural;

        if (prose.ok) {
          return NextResponse.json({
            triage: parsed.data,
            meta: { model, provider: 'groq', panelId, attempt, checked: true },
          });
        }
        lastReason = prose.reason ?? 'failed the cross-check';
      }

      // Feed the rejection back as a correction rather than silently retrying.
      messages.push({
        role: 'user',
        content: `Your previous answer was rejected: ${lastReason}\nAnswer again, `
          + 'correcting exactly that. JSON only.',
      });
    } catch (err) {
      lastReason = err instanceof Error ? err.message : 'request failed';
      break;
    }
  }

  // Never fall back to another array's cached prose. Unavailable is the truth.
  return NextResponse.json(
    { error: 'unavailable', reason: lastReason },
    { status: 503 },
  );
}
