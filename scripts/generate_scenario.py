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

# THREE CRACKS, NOT ONE.
#
# One fault was enough to tell the scripted story and far too few to USE the console
# with: an operator could look at exactly one interesting array and 119 identical
# healthy ones, so nothing could be compared against anything. These are the same
# MECHANISM at three depths — a cracked cell driving its bypass diode into
# conduction — separated by how many of the array's seven strings the crack has
# reached and how far the mismatch derate has fallen on them.
#
# Depth is what the operator is meant to read, because it is what changes the
# ranking. Array deviation works out as faultedStrings x (terminalMismatch - 1) / 7:
#
#   A-31   2 of 7 at 0.68   ->  string -32.0%,  array  -9.1%   warning
#   B-17   5 of 7 at 0.4160 ->  string -58.4%,  array -41.7%   critical   (frozen)
#   C-07   6 of 7 at 0.34   ->  string -66.0%,  array -56.6%   critical, worse
#
# B-17 keeps its frozen pair exactly. It is the array the committed evidence, the
# cached agent run and every invariant describe, and it does not move.
#
# `accessCost` is a SITE FACT — how far the truck drives — in the same category as
# which arrays are soiled. It belongs to the event because the live queue ranks
# arrays the committed repair_queue.json has never heard of.
EVENTS = [
    {
        'id': 'evt-b17-crack',
        'type': 'mismatch-fault',
        'panelId': P.FAULTED_ARRAY,
        # 10:04 site time — the inspection timestamp frozen in CLAUDE.md sec 19.
        'startHour': 10 + 4 / 60,
        # Develops over three site minutes, so health animates rather than jumping.
        'rampMinutes': 3.0,
        'faultedStrings': P.FAULTED_STRINGS,
        'terminalMismatch': P.F_MISMATCH_FAULTED,
        'accessCost': 1.0,
        'moduleId': P.FAULTED_MODULE,
        'stringId': P.FAULTED_STRING_ID,
        'mechanism': 'cracked cell driving its bypass diode into conduction',
    },
    {
        'id': 'evt-a31-crack',
        'type': 'mismatch-fault',
        'panelId': 'A-31',
        'startHour': 11 + 20 / 60,
        'rampMinutes': 4.0,
        'faultedStrings': 2,
        'terminalMismatch': 0.68,
        'accessCost': 1.0,
        'moduleId': 'A3-04',
        'stringId': 'A-31-S1',
        'mechanism': 'early hairline crack, two strings bypassed',
    },
    {
        'id': 'evt-c07-crack',
        'type': 'mismatch-fault',
        'panelId': 'C-07',
        'startHour': 12 + 40 / 60,
        'rampMinutes': 6.0,
        'faultedStrings': 6,
        'terminalMismatch': 0.34,
        # Far edge of the block, same longer drive C-31 carries in the committed queue.
        'accessCost': 1.4,
        'moduleId': 'C1-11',
        'stringId': 'C-07-S5',
        'mechanism': 'advanced crack propagation, six strings bypassed',
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
        n, mm = e['faultedStrings'], e['terminalMismatch']
        # Printed so the depth of each fault is checkable in one line, the same way
        # generate_telemetry.py prints the figures it produced.
        dev_string = (mm - 1.0) * 100.0
        dev_array = dev_string * n / P.STRINGS_PER_ARRAY
        print(f'  event          {e["id"]}  {e["panelId"]}  at {h:02d}:{m:02d} '
              f'over {e["rampMinutes"]} min  |  {n} of {P.STRINGS_PER_ARRAY} strings '
              f'at f_mismatch {mm}  ->  string {dev_string:.1f}%, array {dev_array:.1f}%')


if __name__ == '__main__':
    main()
