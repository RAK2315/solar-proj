"""
run_agent.py -> data/agent_cache.json

Runs the three reasoning stages ONCE against Groq and commits the result. The demo
never calls an LLM; it reads this file. That removes the entire class of demo-day
failures involving networks, rate limits and cold starts, and it makes the output
auditable — a judge can diff the committed cache.

THE LOAD-BEARING RULE, and the reason this script is 400 lines instead of 40:

    The model writes PROSE ABOUT numbers. It never produces one.

Every numeric field in every response is cross-checked against telemetry.json and
forecast.json before anything is written. So is every number that appears in the
free-text reasoning, because that is where a fabricated figure actually hides — the
reference implementation's own agent output claims a "60% output drop" when its
telemetry says 58.4%, and nothing caught it. This does.

A stage that fails the cross-check is retried with a correction. If it still fails,
the script exits non-zero and writes NOTHING. A stale cache is recoverable; a cache
that contradicts the physics is the one thing this project cannot ship.

Usage:
    python scripts/run_agent.py              # writes data/agent_cache.json
    python scripts/run_agent.py --dry-run    # prints, writes nothing
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone

import physics as P

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OUT = 'data/agent_cache.json'
PROMPT_VERSION = '2026-07-28.1'
DEMO_FRAME_T = 12

# Numbers the model is allowed to write, beyond those derived from the data below.
# Small counts and durations that describe structure rather than measurement.
STRUCTURAL_NUMBERS = {0, 1, 2, 3, 4, 5, 6, 7, 12, 24, 25, 35, 48, 72, 120}


# ── env ─────────────────────────────────────────────────────────────────────

def load_env(path='.env.local'):
    """Minimal .env reader. The key is never printed, logged or written out."""
    if not os.path.exists(path):
        return
    with open(path, encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


# ── the facts, loaded once ──────────────────────────────────────────────────

def load_facts():
    j = lambda p: json.load(open(p, encoding='utf-8'))
    telemetry = j('data/telemetry.json')
    forecast = j('data/forecast.json')
    farm = j('data/farm.json')
    cellgrid = j('data/evidence/b17_cellgrid.json')
    detection = (j('data/evidence/b17_detection.json')
                 if os.path.exists('data/evidence/b17_detection.json') else None)

    frame = telemetry[DEMO_FRAME_T]
    b17 = frame['panels']['B-17']
    inv = frame['inverters']
    panel = next(p for z in farm['zones'] for p in z['panels'] if p['id'] == 'B-17')
    hot = sorted(cellgrid['defects'], key=lambda d: (d['row'], d['col']))

    # Cell temperature the cracked band actually reaches, and the daily CELL
    # cycling amplitude — the quantity that drives crack propagation. Both derived,
    # neither typed. (CLAUDE.md sec 9.2's "19 C ambient cycling" was invented; see
    # correction C19.)
    cell_temps = [P.ambient_at(h) + ((P.NOCT - 20.0) / 800.0) * P.irradiance_at(h)
                  for h in range(P.FORECAST_HOURS + 1)]
    cell_cycle_c = max(cell_temps) - min(cell_temps)

    return {
        'frame': frame, 'b17': b17, 'inv': inv, 'panel': panel,
        'forecast': forecast, 'cellgrid': cellgrid, 'hot': hot,
        'detection': detection,
        'cell_cycle_c': cell_cycle_c,
        'peak_cell_c': max(cell_temps),
        'irradiance_peak': max(p['irradiance'] for p in forecast['points']),
    }


# ── prompts ─────────────────────────────────────────────────────────────────

TRIAGE_SYSTEM = """You are the triage stage of an autonomous solar-farm maintenance agent.
You receive SCADA telemetry and site conditions. You decide what is wrong, how severe
it is, and critically - whether telemetry alone is sufficient to diagnose, or whether
physical verification is required.

Be specific and quantitative. NEVER state a number that is not given to you below;
do not round, restate approximately, or convert.

BIND EVERY NUMBER TO EXACTLY ONE OBJECT. The string deviation and the array
deviation are different quantities measured on different things. A faulted STRING
is at the string deviation; the ARRAY containing it is at the array deviation,
because only some of its strings are faulted. Never attribute one to the other.

THE DECISION THAT MATTERS: telemetry alone cannot tell you WHY output is down.
Heavy localised soiling and physical cell damage (a cracked cell driving its bypass
diode into conduction) produce very similar string-level signatures under clear-sky,
high-irradiance conditions, and both raise cell temperature. State this ambiguity
explicitly, name both candidate mechanisms, and say that only imaging - visual and
thermal - can distinguish them. That is why a drone is dispatched.

`severity` is OPERATIONAL URGENCY, not diagnostic certainty. A shortfall above 50%
on a string, with an intervention deadline inside the same working day, is at least
"high" by any operator's standard. Do not soften it because the root cause is still
ambiguous - the ambiguity is what the drone resolves, and it does not reduce the
urgency of the loss.

`confidence` is a probability between 0 and 1.

Respond with JSON only. No markdown, no preamble.

Schema:
{
  "severity": "low|medium|high|critical",
  "suspectComponent": string,
  "reasoning": string,          // 2-3 sentences, operator-facing
  "requiresPhysicalVerification": boolean,
  "verificationRationale": string,   // must name BOTH candidate mechanisms
  "confidence": number               // 0.0 - 1.0
}"""

PROGNOSIS_SYSTEM = """You are the prognosis stage of an autonomous solar-farm maintenance agent.
Given a confirmed physical defect and a 72-hour weather forecast, project how the defect
will evolve and produce a hard deadline for intervention.

Ground every claim in the mechanism. Do not produce a deadline you cannot justify from
the forecast and the defect state. NEVER state a number that is not given to you below -
copy the projected loss and the deadline EXACTLY as provided.

Respond with JSON only.

Schema:
{
  "degradationMechanism": string,
  "projected72hLossMWh": number,
  "riskLevel": "low|medium|high",
  "actBefore": string,        // "HH:MM"
  "reasoning": string,        // 3-4 sentences
  "confidence": number        // 0.0 - 1.0, a probability
}"""

RECOMMENDATION_SYSTEM = """You are the recommendation stage. Produce the specific physical
actions a field technician should take, in order. Be concrete: name components, name the
verification step. NEVER state a number that is not given to you below.

Respond with JSON only.

Schema:
{
  "primaryAction": string,
  "steps": string[],           // 2-4 items
  "costOfDelayNote": string,
  "workOrderRef": string
}"""


def triage_user(f):
    inv, b17, panel = f['inv'], f['b17'], f['panel']
    return f"""Site: a 500 MW block of Bhadla Solar Park, Rajasthan. 27.540N 71.915E.
Conditions: ambient {f['frame']['ambientC']:.1f} C, irradiance {f['frame']['irradiance']:.0f} W/m2, \
cloud {f['frame']['cloudPct']:.0f}%, wind {f['frame']['windMs']:.1f} m/s.

Peer string comparison at the inspected position (actual / expected kW, deviation):
  INV-A: {inv['INV-A']['actualKW']:.2f} / {inv['INV-A']['expectedKW']:.2f}   {inv['INV-A']['deviationPct']:.1f}%
  INV-B: {inv['INV-B']['actualKW']:.2f} / {inv['INV-B']['expectedKW']:.2f}  {inv['INV-B']['deviationPct']:.1f}%
  INV-C: {inv['INV-C']['actualKW']:.2f} / {inv['INV-C']['expectedKW']:.2f}   {inv['INV-C']['deviationPct']:.1f}%

Panel array B-17 (zone B, on {panel['inverterId']}), {panel['stringsPerArray']} strings:
  faulted string B-17-S3 deviation {b17['stringDeviationPct']:.1f}%
  array deviation {b17['deviationPct']:.2f}% ({P.FAULTED_STRINGS} of {panel['stringsPerArray']} strings faulted)
  array cell temperature {b17['cellTempC']:.1f} C against a {P.CELL_TEMP_DEMO_C:.1f} C fleet median
  last serviced {panel['lastServiced']}

Expected output is modelled as
  P = P_rated * (G/1000) * (1 + gamma*(T_cell - 25)) * f_soil * f_mismatch * eta_inv
with gamma = {P.GAMMA}/C, NOCT {P.NOCT:.0f} C, eta_inv {P.ETA_INV}.

No imaging has been captured yet. Only SCADA telemetry is available."""


def prognosis_user(f):
    hot = f['hot']
    cells = '\n'.join(
        f"    ({d['row']},{d['col']}) {d['type']:8} dT +{d['deltaTC']:.1f} C" for d in hot)
    det = f['detection']
    det_line = (f"  RGB detection: {det['label']}, confidence {det['confidence']}"
                if det else "  RGB detection: pending (detector output not yet available)")
    return f"""Confirmed defect on B-17 from drone inspection:
{det_line}
  Thermal: {len(hot)} anomalous cells forming ONE connected cluster - a contiguous band across row {hot[0]['row']}
{cells}
  dT is a cell-mean, derived by linearly scaling 8-bit normalised thermal intensity
  across a declared temperature span - the source sensor is not radiometric, so dT is a
  relative rise above the array median, NOT an absolute temperature and NOT a peak-pixel
  reading. Substrings are wired in rows, so a contiguous hot row is the signature of a
  bypass diode conducting.
  Inverter acoustic signature: irregular switching harmonics on INV-B

Current shortfall: {f['b17']['stringDeviationPct']:.1f}% on string B-17-S3; \
{f['b17']['deviationPct']:.2f}% across the B-17 array.

72-hour forecast: clear, 0% cloud throughout.
  peak ambient {f['forecast']['peakAmbientC']:.1f} C
  peak irradiance {f['irradiance_peak']:.0f} W/m2
  projected peak CELL temperature {f['peak_cell_c']:.1f} C
  daily cell thermal cycling amplitude {f['cell_cycle_c']:.1f} C

COMPUTED VALUES - copy these into your JSON exactly, do not recompute or round:
  projected72hLossMWh = {f['forecast']['projected72hLossMWh']}
  actBefore = "{f['forecast']['actBefore']}"

The deadline was computed as the hour at which the cracked cell's cumulative time above
a {P.T_PROP_C:.0f} C propagation threshold reaches a declared {P.DOSE_BUDGET_H:.0f}-hour dose budget."""


def recommendation_user(f, triage, prognosis):
    return f"""Confirmed on array B-17, string B-17-S3, module B2-07, inverter INV-B:
  cracked cell with a contiguous hot band across row {f['hot'][0]['row']}, \
cells {f['hot'][0]['col']}-{f['hot'][-1]['col']}
  string shortfall {f['b17']['stringDeviationPct']:.1f}%
  mechanism: {prognosis['degradationMechanism']}
  risk {prognosis['riskLevel']}, act before {prognosis['actBefore']}
  projected loss {f['forecast']['projected72hLossMWh']} MWh over 72 hours

The work order reference is INC-B17. Use exactly that string for workOrderRef."""


# ── the numeric cross-check ─────────────────────────────────────────────────

def allowed_numbers(f):
    """Every number the model may legitimately write, built from the data itself."""
    inv, b17 = f['inv'], f['b17']
    values = set(STRUCTURAL_NUMBERS)
    for v in (
        b17['deviationPct'], b17['stringDeviationPct'], b17['actualKW'], b17['expectedKW'],
        b17['cellTempC'], f['frame']['ambientC'], f['frame']['irradiance'],
        f['frame']['windMs'], f['frame']['cloudPct'], f['frame']['farmOutputMW'],
        f['forecast']['peakAmbientC'], f['forecast']['projected72hLossMWh'],
        f['forecast']['clearHours'], f['cell_cycle_c'], f['peak_cell_c'],
        f['irradiance_peak'], P.CELL_TEMP_DEMO_C, P.T_PROP_C, P.DOSE_BUDGET_H,
        P.NOCT, P.ETA_INV, P.GAMMA, P.STRINGS_PER_ARRAY, P.FAULTED_STRINGS,
    ):
        values.add(round(abs(float(v)), 2))
    for r in inv.values():
        for v in (r['actualKW'], r['expectedKW'], r['deviationPct']):
            values.add(round(abs(float(v)), 2))
    for d in f['hot']:
        values.update({float(d['row']), float(d['col']), round(abs(d['deltaTC']), 2)})
    if f['detection']:
        values.add(round(f['detection']['confidence'], 2))

    # Each value is also legal at 0 and 1 decimal places, because prose rounds.
    expanded = set()
    for v in values:
        expanded.update({round(v, 2), round(v, 1), float(round(v))})
    return expanded


NUMBER_RE = re.compile(r'\d+(?:\.\d+)?')

# Component identifiers contain digits that are NOT measurements. "B-17" is a name,
# not the number seventeen, and flagging it would make the check unusable — which is
# how a strict check quietly gets switched off. Strip names first, then scan.
IDENTIFIER_RE = re.compile(
    r'\b(?:INV|PAD|INC)-[A-Z0-9]+\b'      # INV-B, PAD-01, INC-B17
    r'|\b[A-C]-\d{2}(?:-S\d+)?\b'         # B-17, B-17-S3
    r'|\bB\d-\d{2}\b'                     # B2-07
    r'|\b[RCS]\d\b'                       # R2, C3, S3
    r'|\(\s*\d+\s*,\s*\d+\s*\)'           # (2,3) cell coordinates
    r'|\b\d+-bit\b'                       # 8-bit
    r'|\d{1,2}:\d{2}',                    # 14:00 — checked as an exact field instead
    re.IGNORECASE,
)


def prose_numbers(obj):
    """Every measurement-shaped number appearing in any string field of a response."""
    out = []
    if isinstance(obj, dict):
        for v in obj.values():
            out.extend(prose_numbers(v))
    elif isinstance(obj, list):
        for v in obj:
            out.extend(prose_numbers(v))
    elif isinstance(obj, str):
        out.extend(float(m) for m in NUMBER_RE.findall(IDENTIFIER_RE.sub(' ', obj)))
    return out


def check_prose(stage, payload, allowed):
    """Fail on any number in the prose that is not in the data.

    This is the check that catches a fabricated figure. It is deliberately strict:
    the model has every number it needs in the prompt, so anything else it writes
    it made up."""
    bad = []
    for n in prose_numbers(payload):
        if not any(abs(n - a) < 0.005 for a in allowed):
            bad.append(n)
    if bad:
        raise ValueError(
            f'{stage}: prose contains {len(bad)} number(s) not present in the data: '
            f'{sorted(set(bad))}. The model writes prose ABOUT numbers; it never '
            f'produces one. Tighten the prompt or add the value to the prompt.')


def check_triage(payload, f):
    if payload.get('requiresPhysicalVerification') is not True:
        raise ValueError(
            'triage: requiresPhysicalVerification must be true. It is the justification '
            'for the drone existing - without it the entire mission has no reason to '
            'happen. Tighten the prompt until the model reaches it on the evidence.')
    # Severity is operational urgency. The console badge is derived from physics and
    # already reads CRITICAL; an agent calling the same event "medium" next to it
    # looks like two systems that do not talk to each other.
    if payload.get('severity') not in ('high', 'critical'):
        raise ValueError(
            f"triage: severity is {payload.get('severity')!r}. A >50% string shortfall "
            'with a same-day deadline is at least high. Diagnostic ambiguity belongs in '
            'confidence, not in severity.')
    # Any real component in the fault chain is a legitimate answer. The first run
    # named "String B-17-S3", which is arguably MORE precise than the inverter -
    # the fault is inside the string, and INV-B is only where it is observed.
    # Demanding one answer would have been forcing a worse one.
    suspect = str(payload.get('suspectComponent', ''))
    if not any(x in suspect for x in ('INV-B', 'B-17', 'B2-07')):
        raise ValueError(
            f'triage: suspectComponent is {suspect!r}; it must name a real component '
            'in the fault chain (INV-B, the B-17 array, string B-17-S3, or module B2-07).')
    if not 0.0 <= float(payload.get('confidence', -1)) <= 1.0:
        raise ValueError('triage: confidence must be a probability between 0 and 1')

    # THE LOAD-BEARING CLAIM. Without this sentence the drone has no reason to fly,
    # and the whole demo is a dashboard that guessed. CLAUDE.md sec 9.1 names it as
    # the thing to tighten the prompt over until the model reaches it.
    rationale = str(payload.get('verificationRationale', '')).lower()
    missing = []
    if 'soil' not in rationale:
        missing.append('soiling as a candidate mechanism')
    if not any(w in rationale for w in ('crack', 'physical damage', 'cell damage')):
        missing.append('physical cell damage as the competing mechanism')
    if not any(w in rationale for w in ('imag', 'thermal', 'visual', 'camera', 'inspect')):
        missing.append('imaging as the thing that distinguishes them')
    if missing:
        raise ValueError(
            'triage: verificationRationale does not carry the load-bearing claim. '
            f'Missing: {"; ".join(missing)}. Telemetry cannot separate heavy soiling '
            'from a cracked cell under these conditions - both depress string output '
            'and raise cell temperature - and only imaging can. Say exactly that.')


def check_prognosis(payload, f):
    want_loss = f['forecast']['projected72hLossMWh']
    got_loss = float(payload.get('projected72hLossMWh', -1))
    if abs(got_loss - want_loss) > 0.01:
        raise ValueError(
            f'prognosis: projected72hLossMWh is {got_loss}, but the forecast integral '
            f'is {want_loss}. The LLM does not get to produce this number.')
    if payload.get('actBefore') != f['forecast']['actBefore']:
        raise ValueError(
            f"prognosis: actBefore is {payload.get('actBefore')!r}, computed value is "
            f"{f['forecast']['actBefore']!r}.")
    if payload.get('riskLevel') not in ('low', 'medium', 'high'):
        raise ValueError(f"prognosis: bad riskLevel {payload.get('riskLevel')!r}")
    if not 0.0 <= float(payload.get('confidence', -1)) <= 1.0:
        raise ValueError(
            f"prognosis: confidence is {payload.get('confidence')!r}; it must be a "
            'probability between 0 and 1, not a rating out of 10.')


def check_recommendation(payload, f):
    if payload.get('workOrderRef') != 'INC-B17':
        raise ValueError(f"recommendation: workOrderRef must be INC-B17, got "
                         f"{payload.get('workOrderRef')!r}")
    steps = payload.get('steps')
    if not isinstance(steps, list) or not 2 <= len(steps) <= 4:
        raise ValueError('recommendation: steps must be a list of 2-4 items')


# ── Groq ────────────────────────────────────────────────────────────────────

def call(client, model, system, user, correction=None):
    messages = [{'role': 'system', 'content': system},
                {'role': 'user', 'content': user}]
    if correction:
        messages.append({'role': 'user', 'content':
                         f'Your previous answer was rejected: {correction}\n'
                         f'Answer again, correcting exactly that. JSON only.'})
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.2,
        response_format={'type': 'json_object'},
    )
    return json.loads(resp.choices[0].message.content)


def run_stage(client, model, name, system, user, validate, allowed, attempts=4):
    correction = None
    for attempt in range(1, attempts + 1):
        try:
            payload = call(client, model, system, user, correction)
            validate(payload)
            check_prose(name, payload, allowed)
            print(f'  {name:15} ok on attempt {attempt}')
            return payload
        except Exception as exc:                      # noqa: BLE001 - report and retry
            correction = str(exc)
            print(f'  {name:15} attempt {attempt} rejected: {correction[:150]}')
    raise SystemExit(
        f'\n{name} failed {attempts} attempts. NOTHING WAS WRITTEN.\n'
        f'Last rejection: {correction}\n'
        'A stale cache is recoverable; a cache that contradicts the physics is not.')


# ── main ────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true', help='print, write nothing')
    args = ap.parse_args()

    load_env()
    api_key = os.environ.get('GROQ_API_KEY')
    model = os.environ.get('GROQ_MODEL', 'openai/gpt-oss-120b')
    if not api_key:
        raise SystemExit('GROQ_API_KEY missing. Put it in .env.local (never in src/).')

    from groq import Groq
    client = Groq(api_key=api_key)

    f = load_facts()
    allowed = allowed_numbers(f)

    print(f'model  : {model}')
    print(f'facts  : string {f["b17"]["stringDeviationPct"]:.1f}%, '
          f'array {f["b17"]["deviationPct"]:.2f}%, '
          f'loss {f["forecast"]["projected72hLossMWh"]} MWh, '
          f'deadline {f["forecast"]["actBefore"]}')
    print(f'         peak cell {f["peak_cell_c"]:.1f} C, '
          f'cell cycling {f["cell_cycle_c"]:.1f} C')
    print()

    triage = run_stage(client, model, 'triage', TRIAGE_SYSTEM, triage_user(f),
                       lambda p: check_triage(p, f), allowed)
    prognosis = run_stage(client, model, 'prognosis', PROGNOSIS_SYSTEM, prognosis_user(f),
                          lambda p: check_prognosis(p, f), allowed)
    recommendation = run_stage(
        client, model, 'recommendation', RECOMMENDATION_SYSTEM,
        recommendation_user(f, triage, prognosis),
        lambda p: check_recommendation(p, f), allowed)

    cache = {
        'triage': triage,
        'prognosis': prognosis,
        'recommendation': recommendation,
        'meta': {
            'model': model,
            'provider': 'groq',
            'generatedAt': datetime.now(timezone.utc).isoformat(timespec='seconds'),
            'promptVersion': PROMPT_VERSION,
        },
    }

    print()
    print(json.dumps(cache, indent=2, ensure_ascii=False))

    if args.dry_run:
        print('\n--dry-run: nothing written.')
        return

    json.dump(cache, open(OUT, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
    print(f'\nwrote {OUT}')
    print('Every numeric field and every number in the prose was cross-checked '
          'against telemetry.json and forecast.json.')


if __name__ == '__main__':
    main()
