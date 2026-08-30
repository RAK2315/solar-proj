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
 *   2. THE FACTS ARE RECOMPUTED HERE. The client sends a panel id, a site time,
 *      and any faults the OPERATOR HAS INJECTED this session — and nothing else.
 *      If it sent the readings, a caller could ask the model to reason about
 *      numbers the site never produced, and the cross-check would dutifully
 *      approve them because they would match what was sent.
 *
 *      THE INJECTED EVENTS ARE NOT AN EXCEPTION TO THAT, and the distinction is
 *      the whole point: a scenario event says "this array has a crack on five
 *      strings from 11:20", and the server then computes what that DOES from the
 *      same physics it uses for everything else. It is a cause, not a reading.
 *      `InjectedEvent` below is a strict allowlist, so a reading cannot ride in
 *      on the same request.
 *
 *      Without this the agent was answering about a different site. An operator
 *      injects a fault on A-14, the console shows −56.6 %, and the triage route —
 *      which knew nothing about the injection — computed A-14 as healthy and
 *      reported "actual power equals expected, deviation 0.00 %, normal
 *      operation" underneath a CRITICAL badge. Correct reasoning, wrong world.
 *   3. The cross-check runs before a single word is returned. A response with a
 *      number that is not in the data is rejected and retried; if it will not
 *      comply, the route returns unavailable and the console says so.
 *
 * Offline is a first-class outcome. No key, no network, a rate limit — all return
 * 503 with a reason, and the UI states that the agent is unavailable rather than
 * substituting prose nobody checked.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { allowedNumbers, checkProse, checkTriage, type TriageFacts } from '@/lib/agentCheck';
import { farm, forecast } from '@/lib/data';
import { liveFrameAt, type ScenarioEvent } from '@/lib/live';
import { CELL_TEMP_REF_C, cellTemp } from '@/lib/physics';
import { LiveTriageOutput } from '@/lib/types';

export const runtime = 'nodejs';
/** Model output depends on live site state, so nothing here may be cached. */
export const dynamic = 'force-dynamic';

/**
 * What a client may say about a fault it has injected.
 *
 * A strict allowlist, and `.strict()` is load-bearing: any extra key is rejected
 * rather than ignored, so a reading cannot be smuggled in beside a cause and then
 * quietly used. Everything here is a CAUSE — which array, which mechanism, how
 * many strings, how far the derate falls, when it started. The consequences are
 * computed server-side from the same model that evaluates the committed faults.
 */
const InjectedEvent = z.object({
  id: z.string().max(80),
  type: z.string().max(40),
  panelId: z.string().max(12),
  startHour: z.number().finite(),
  rampMinutes: z.number().finite().min(0).max(600),
  faultedStrings: z.number().int().min(0).max(7).optional(),
  terminalMismatch: z.number().min(0).max(1).optional(),
  accessCost: z.number().min(0).max(10).optional(),
  moduleId: z.string().max(20).optional(),
  stringId: z.string().max(20).optional(),
  mechanism: z.string().max(200).optional(),
  injected: z.literal(true).optional(),
}).strict();

const TriageRequest = z.object({
  panelId: z.string().min(1).max(12),
  siteSeconds: z.number().finite(),
  /** Faults the operator raised this session. Capped so a request cannot be huge. */
  injected: z.array(InjectedEvent).max(20).optional(),
}).strict();

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

THE DECISION THAT MATTERS is whether a drone should fly. Decide it from the SHAPE
of the loss, not from its size. Two signatures separate the candidate mechanisms:

  EVEN ACROSS THE ARRAY, NO THERMAL RISE - every string down by about the same
  amount and cell temperature at the fleet median. That is SOILING. Dirt reduces
  the light going in, so it reduces heat as well as power. Imaging a dirty panel
  confirms it is dirty, which the telemetry has already established, so
  requiresPhysicalVerification must be FALSE and you should say the array needs
  cleaning rather than inspecting.

  ONE STRING FAR BELOW THE OTHERS, AND THE ARRAY RUNNING HOTTER THAN THE FLEET -
  a localised electrical fault. A cracked cell drives its bypass diode into
  conduction, and the bypassed substring dissipates the power it no longer
  exports, which lifts the whole array's average temperature. Telemetry cannot say
  WHICH module, and only imaging can, so requiresPhysicalVerification must be TRUE.

  YOU ARE NOT GIVEN PER-STRING TEMPERATURES and you do not need them. The thermal
  reading is an ARRAY average against a fleet median, and a bypassed substring is
  enough to lift that average. Do not report the absence of per-string temperature
  as a reason the cause cannot be established - the array figure is the measurement
  this decision is made on, and treating it as insufficient would send a drone to
  every array on the site.

  SIGNATURES THAT DISAGREE - an even loss that is nonetheless hot, or a localised
  loss that is cold. Say the cause is not established, do not choose between the
  mechanisms, and set requiresPhysicalVerification TRUE.

WHEN BOTH SIGNALS POINT THE SAME WAY, SAY SO. A string materially below the array
AND an array above the fleet median is not an ambiguous case - it is the localised
electrical fault, and reporting it as unresolvable understates what the telemetry
established. The remaining unknown is WHICH MODULE, not WHAT KIND OF FAULT, and
that is the correct reason to ask for imaging. Do not describe those two agreeing
signals as "conflicting".

If the array is within tolerance, say so plainly and set
requiresPhysicalVerification to false - do not invent a reason to fly a drone at a
healthy array.

DO NOT CLAIM AMBIGUITY YOU HAVE THE EVIDENCE TO RESOLVE. Saying "only imaging can
distinguish these" about an array that is evenly down and at fleet temperature is
wrong, and it wastes a drone sortie the operator has a limited number of.

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
function buildFacts(
  panelId: string,
  siteSeconds: number,
  injected: ScenarioEvent[] = [],
): TriageFacts | null {
  const panel = farm.zones.flatMap((z) => z.panels).find((p) => p.id === panelId);
  if (!panel) return null;

  // The operator's own injections are merged into the site the same way the
  // console merges them, so the agent and the screen are looking at one world.
  // Second argument is the set of arrays with approved work orders, which the
  // server has no business knowing; the injections are the third.
  const frame = liveFrameAt(siteSeconds, new Set(), injected);
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

  let parsed;
  try {
    parsed = TriageRequest.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'bad-request', reason: parsed.error.issues[0]?.message ?? 'invalid body' },
      { status: 400 },
    );
  }

  const { panelId, siteSeconds, injected = [] } = parsed.data;

  const facts = buildFacts(panelId, siteSeconds, injected);
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
