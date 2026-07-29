"""
generate_scenario.py -> data/scenario.json

The site's SCHEDULED EVENTS for live mode.

Live mode needs faults that appear over time rather than 91 frozen frames. They must
not be random: `Math.random()` is banned across src/ so that what an operator sees is
reproducible, and so that a judge who reloads the page sees the same site. This file
is the committed schedule that replaces randomness.

An event says WHEN something starts and HOW LONG it takes to develop. What it then
DOES is physics — src/lib/physics.ts evaluates the array, exactly as the Python does.
Nothing here is a measurement; these are operational facts about the site, in the same
category as which arrays are soiled.

Run:  python scripts/generate_scenario.py
"""

import json
import os
import sys

import physics as P

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OUT = 'data/scenario.json'

# Site clock starts at the reference hour the frozen figures are quoted at, so a
# live session opens on conditions the whole project is already calibrated to.
EPOCH_HOUR = P.DEMO_HOUR

# 1 real second = 60 site seconds. A full solar day passes in 24 minutes, which is
# slow enough to read and fast enough to watch a fault develop.
DEFAULT_TIME_SCALE = 60

EVENTS = [
    {
        'id': 'evt-b17-crack',
        'type': 'mismatch-fault',
        'panelId': P.FAULTED_ARRAY,
        # 10:04 site time — the inspection timestamp frozen in CLAUDE.md sec 19.
        'startHour': 10 + 4 / 60,
        # Develops over three site minutes, so health animates rather than jumping.
        'rampMinutes': 3.0,
        'moduleId': P.FAULTED_MODULE,
        'stringId': P.FAULTED_STRING_ID,
        'mechanism': 'cracked cell driving its bypass diode into conduction',
    },
]

# Arrays that are already soiled when the session opens. Same set the frozen
# telemetry uses, so live mode and demo mode describe the same site.
SOILING = (
    [{'panelId': p, 'fSoil': P.F_SOIL_HEAVY} for p in P.SOILED_HEAVY_ARRAYS]
    + [{'panelId': p, 'fSoil': P.F_SOIL_MILD} for p in P.SOILED_MILD_ARRAYS]
)


def main() -> None:
    scenario = {
        'epochHour': EPOCH_HOUR,
        'defaultTimeScale': DEFAULT_TIME_SCALE,
        'soiling': SOILING,
        'events': EVENTS,
    }

    os.makedirs('data', exist_ok=True)
    json.dump(scenario, open(OUT, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)

    print(f'wrote {OUT}')
    print(f'  epoch          {EPOCH_HOUR:.2f} h  ({int(EPOCH_HOUR):02d}:'
          f'{int((EPOCH_HOUR % 1) * 60):02d} site time)')
    print(f'  time scale     {DEFAULT_TIME_SCALE}x  (a solar day in '
          f'{24 * 60 / DEFAULT_TIME_SCALE:.0f} real minutes)')
    print(f'  soiled arrays  {len(SOILING)}')
    for e in EVENTS:
        h = int(e['startHour'])
        m = round((e['startHour'] % 1) * 60)
        print(f'  event          {e["id"]}  {e["panelId"]}  at {h:02d}:{m:02d} '
              f'over {e["rampMinutes"]} min')


if __name__ == '__main__':
    main()
