"""
generate_farm.py -> data/farm.json

Static site geometry: 1 farm, 3 zones, 120 panel arrays, 3 inverters, 2 drone pads.
Nothing time-varying lives here; that is generate_telemetry.py's job.

Run:  python scripts/generate_farm.py
"""

import json
import os
import sys

import physics as P

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OUT = 'data/farm.json'

# ── SVG layout ──────────────────────────────────────────────────────────────
# Only the zone origins reach farm.json; cell size and gaps are presentation and
# live in the design layer. viewBox is 1000 x 700.

ORIGIN_X = 58
ZONE_ORIGIN_Y = {'A': 40, 'B': 250, 'C': 460}

ZONE_LABEL = {'A': 'ZONE A', 'B': 'ZONE B', 'C': 'ZONE C'}

# Drone pads sit below the zone stack, on the map's left edge.
DRONE_PADS = [
    {'id': 'PAD-01', 'x': 58, 'y': 664},
    {'id': 'PAD-02', 'x': 892, 'y': 664},
]

# Commissioning dates by zone — a real park is built in blocks, not all at once.
INSTALL_DATE = {'A': '2024-09-12', 'B': '2024-11-08', 'C': '2025-02-19'}

# Service history. B-17's date is frozen (CLAUDE.md sec 19); the rest are on a
# deterministic 6-week rotation by array index so the data is reproducible without
# a random seed anywhere.
SERVICE_ROTATION = ['2026-05-02', '2026-05-16', '2026-05-30', '2026-06-13',
                    '2026-06-27', '2026-07-11']
B17_LAST_SERVICED = '2026-03-14'


def array_id(zone: str, index: int) -> str:
    """Row-major 1-based numbering: index 17 in zone B is B-17, at row 3 col 1."""
    return f'{zone}-{index:02d}'


def row_col(index: int) -> tuple[int, int]:
    """1-based row and column for a row-major index over ZONE_ROWS x ZONE_COLS."""
    return (index - 1) // P.ZONE_COLS + 1, (index - 1) % P.ZONE_COLS + 1


def build_panel(zone: str, index: int) -> dict:
    pid = array_id(zone, index)
    row, col = row_col(index)
    return {
        'id': pid,
        'zone': zone,
        'row': row,
        'col': col,
        'inverterId': f'INV-{zone}',
        'ratedKW': round(P.ARRAY_RATED_KW, 2),
        'stringsPerArray': P.STRINGS_PER_ARRAY,
        'moduleCount': P.MODULES_PER_ARRAY,
        'cellRows': 5,      # the anomaly matrix is a map of this physical layout
        'cellCols': 7,
        'installDate': INSTALL_DATE[zone],
        'lastServiced': (B17_LAST_SERVICED if pid == P.FAULTED_ARRAY
                         else SERVICE_ROTATION[index % len(SERVICE_ROTATION)]),
    }


def static_status(pid: str) -> str:
    """Status implied by static soiling alone. The B-17 fault is injected in
    telemetry, not here, so B-17 reads healthy in farm.json."""
    if pid in P.SOILED_HEAVY_ARRAYS:
        return 'warning'
    return 'healthy'


def build_zone(zone: str) -> dict:
    panels = [build_panel(zone, i) for i in range(1, P.ARRAYS_PER_ZONE + 1)]
    deductions = sum(P.HEALTH_DEDUCTION[static_status(p['id'])] for p in panels)
    return {
        'id': zone,
        'label': ZONE_LABEL[zone],
        'health': round(100.0 - deductions, 1),
        'rows': P.ZONE_ROWS,
        'cols': P.ZONE_COLS,
        'originX': ORIGIN_X,
        'originY': ZONE_ORIGIN_Y[zone],
        'panels': panels,
    }


def main() -> None:
    zones = [build_zone(z) for z in ('A', 'B', 'C')]

    # Inverter nameplate is the sum of the arrays it drives — one inverter per zone.
    inverters = [{
        'id': f'INV-{z}',
        'zone': z,
        'ratedKW': round(P.ARRAY_RATED_KW * P.ARRAYS_PER_ZONE, 2),
        'efficiency': P.ETA_INV,
    } for z in ('A', 'B', 'C')]

    farm = {
        'id': 'bhadla-block-01',
        'name': 'Bhadla Solar Park',
        'region': 'Rajasthan, India',
        'lat': 27.540,        # correction C4 — verified, was 27.53
        'lon': 71.915,
        'azimuth': 180.0,
        'tilt': 25.0,
        'capacityMW': P.PARK_NAMEPLATE_MW,
        'zones': zones,
        'inverters': inverters,
        'dronePads': DRONE_PADS,
    }

    os.makedirs('data', exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(farm, fh, indent=2)

    b17 = next(p for p in zones[1]['panels'] if p['id'] == P.FAULTED_ARRAY)
    total = sum(len(z['panels']) for z in zones)
    print(f'wrote {OUT}')
    print(f'  {total} arrays across {len(zones)} zones, '
          f'{P.ZONE_ROWS}x{P.ZONE_COLS} per zone')
    print(f'  {P.FAULTED_ARRAY}: zone {b17["zone"]} row {b17["row"]} col {b17["col"]}, '
          f'{b17["ratedKW"]} kW, {b17["stringsPerArray"]} strings')
    print(f'  zone health A/B/C: ' + ' / '.join(str(z['health']) for z in zones))
    print(f'  soiled: heavy {P.SOILED_HEAVY_ARRAYS}, mild {P.SOILED_MILD_ARRAYS}')


if __name__ == '__main__':
    main()
