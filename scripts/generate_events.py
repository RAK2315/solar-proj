"""
generate_events.py -> data/events.json

The scripted event feed. Copy is frozen (CLAUDE.md sec 2, filled at Phase 0); every
NUMBER in that copy is interpolated from data/telemetry.json and data/farm.json at
generation time, so an event body can never drift away from the physics behind it.

Two surfaces read this one file:
  - the console EventFeed reads title + body
  - the cinematic MissionLog reads logLine, and skips events that have none
One t-ordered script, two renderings. See correction C12.

Run:  python scripts/generate_events.py   (after generate_telemetry.py)
"""

import json
import os
import sys

import physics as P

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OUT = 'data/events.json'
TELEMETRY = 'data/telemetry.json'
FARM = 'data/farm.json'

DEMO_FRAME_T = 12   # must match DEMO_FRAME_T in src/lib/types.ts


def build(numbers: dict) -> list[dict]:
    """The frozen script. {placeholders} are filled from telemetry, never typed."""
    rows = [
        dict(id='ev-01-scan', t=0, source='SYSTEM', severity='info',
             title='SCAN CYCLE COMPLETE',
             body='{arrayCount} arrays polled. {anomaliesBefore} anomalies open, '
                  '0 critical.',
             expandable=False),

        dict(id='ev-02-queue', t=3, source='INSPECTION QUEUE', severity='info',
             title='QUEUE STEADY',
             body='{queueIdle} tasks scheduled. No dispatch pending.',
             expandable=False),

        dict(id='ev-03-shortfall', t=6, source='PANEL B-17', severity='critical',
             title='OUTPUT SHORTFALL — B-17',
             body='INV-B is producing {actualKW} kW against an expected '
                  '{expectedKW} kW.',
             expandable=True, linkedPanelId='B-17'),

        dict(id='ev-04-triage', t=10, source='SYSTEM', severity='active',
             title='TRIAGE OPENED — B-17',
             body='String {stringId} compared against INV-A and INV-C at '
                  '{irradiance} W/m².',
             expandable=True, linkedPanelId='B-17'),

        dict(id='ev-05-dispatch', t=18, source='DRONE 01', severity='active',
             title='DRONE 01 DISPATCHED — B-17',
             body='Telemetry cannot separate soiling from physical damage. '
                  'Drone 01 dispatched to B-17. Battery 88%.',
             expandable=True, linkedPanelId='B-17',
             logLine='Anomaly detected: B-17, Zone B.'),

        dict(id='ev-06-deviation', t=22, source='PANEL B-17', severity='critical',
             title='ARRAY DEVIATION HOLDING',
             body='B-17 array output is {arrayDevAbs}% below expected and not '
                  'recovering.',
             expandable=False, linkedPanelId='B-17',
             logLine='B-17 output is ~{arrayDevRounded}% below expected.'),

        dict(id='ev-07-transit', t=28, source='DRONE 01', severity='active',
             title='DRONE 01 OVER ZONE B',
             body='En route to B-17. Altitude 40 m. Battery 86%.',
             expandable=False,
             logLine='Drone reaching Zone B.'),

        dict(id='ev-08-lock', t=34, source='DRONE 01', severity='active',
             title='TARGET LOCK — B-17',
             body='Drone 01 on station over B-17. Altitude 12 m. Battery 84%.',
             expandable=False, linkedPanelId='B-17',
             logLine='Target lock: B-17.'),

        dict(id='ev-09-rgb', t=40, source='SURFACE SCAN', severity='warning',
             title='SURFACE CRACK SUSPECTED — B-17',
             body='RGB pass complete. Defect localised to module {moduleId}.',
             expandable=True, linkedPanelId='B-17',
             logLine='Surface crack suspected on {moduleId}.'),

        dict(id='ev-10-thermal', t=48, source='THERMAL SCAN', severity='warning',
             title='THERMAL ANOMALY — ROW {hotRow}',
             body='Contiguous hot band across R{hotRow} C{hotColFirst}–C{hotColLast}, '
                  'ΔT +{hotDeltaT} °C. {clusters} cluster — bypass-diode signature.',
             expandable=True, linkedPanelId='B-17',
             logLine='Thermal scan: hotspot confirmed.'),

        dict(id='ev-11-evidence', t=56, source='DRONE 01', severity='active',
             title='EVIDENCE UPLINKED',
             body='RGB, thermal and inverter acoustic captured. Drone 01 returning '
                  'to PAD-01.',
             expandable=False, linkedPanelId='B-17',
             logLine='Evidence of physical damage found.'),

        dict(id='ev-12-prognosis', t=62, source='SYSTEM', severity='critical',
             title='PROGNOSIS — RISK HIGH',
             body='Defect state fused with the 72 h forecast. Cracked cell crosses '
                  'the propagation threshold at {actBefore}.',
             expandable=True, linkedPanelId='B-17',
             logLine='Inspection result: needs human intervention.'),

        dict(id='ev-13-recommendation', t=74, source='INSPECTION QUEUE',
             severity='critical',
             title='RECOMMENDATION READY — INC-B17',
             body='Ranked #1 of {queueFull} by loss × severity × urgency. '
                  'Est. loss {loss72h} MWh/72h. Awaiting operator approval.',
             expandable=True, linkedPanelId='B-17',
             logLine='Recommendation ready — awaiting operator.'),

        dict(id='ev-14-workorder', t=84, source='INSPECTION QUEUE', severity='active',
             title='WORK ORDER #INC-B17 CREATED',
             body='B-17 scheduled. Queue {queueFull} → {queueIdle} tasks. '
                  'Approved by operator.',
             expandable=False, linkedPanelId='B-17'),
    ]

    out = []
    for row in rows:
        event = dict(row)
        event['timestamp'] = P.timestamp_at(row['t'])
        event['title'] = row['title'].format(**numbers)
        event['body'] = row['body'].format(**numbers)
        if 'logLine' in row:
            event['logLine'] = row['logLine'].format(**numbers)
        out.append(event)
    return out


def main() -> None:
    telemetry = json.load(open(TELEMETRY, encoding='utf-8'))
    farm = json.load(open(FARM, encoding='utf-8'))
    forecast = json.load(open('data/forecast.json', encoding='utf-8'))
    queue = json.load(open('data/repair_queue.json', encoding='utf-8'))
    cellgrid = json.load(open('data/evidence/b17_cellgrid.json', encoding='utf-8'))

    frame = telemetry[DEMO_FRAME_T]
    first = telemetry[0]
    b17 = frame['panels']['B-17']
    inv_b = frame['inverters']['INV-B']

    hot = sorted(cellgrid['defects'], key=lambda d: (d['row'], d['col']))
    anomalies_before = sum(1 for p in first['panels'].values()
                           if p['status'] in ('warning', 'critical'))

    numbers = {
        'arrayCount': sum(len(z['panels']) for z in farm['zones']),
        'anomaliesBefore': anomalies_before,
        # INC-B17 does not exist until the agent creates it, so the idle queue is
        # one shorter than the file. Approving moves B-17 to 'scheduled' and the
        # count returns to idle — CLAUDE.md sec 2 at t=74 and t=84.
        'queueFull': len(queue),
        'queueIdle': len(queue) - 1,
        'actualKW': f'{inv_b["actualKW"]:.2f}',
        'expectedKW': f'{inv_b["expectedKW"]:.2f}',
        'irradiance': f'{frame["irradiance"]:.0f}',
        'stringId': P.FAULTED_STRING_ID,
        'moduleId': P.FAULTED_MODULE,
        'arrayDevAbs': f'{abs(b17["deviationPct"]):.1f}',
        'arrayDevRounded': f'{abs(b17["deviationPct"]):.0f}',
        'hotRow': hot[0]['row'],
        'hotColFirst': hot[0]['col'],
        'hotColLast': hot[-1]['col'],
        'hotDeltaT': f'{max(d["deltaTC"] for d in hot):.1f}',
        'clusters': cellgrid['clusters'],
        'actBefore': forecast['actBefore'],
        'loss72h': f'{forecast["projected72hLossMWh"]:.2f}',
    }

    events = build(numbers)

    os.makedirs('data', exist_ok=True)
    json.dump(events, open(OUT, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)

    print(f'wrote {OUT}  ({len(events)} events, '
          f'{sum(1 for e in events if "logLine" in e)} with mission-log lines)')
    for e in events:
        print(f'  t={e["t"]:2d} [{e["timestamp"]}] {e["source"]:16} '
              f'{e["severity"]:8} {e["title"]}')
        print(f'          {e["body"]}')


if __name__ == '__main__':
    main()
