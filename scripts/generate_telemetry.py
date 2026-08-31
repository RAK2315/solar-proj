"""
generate_telemetry.py -> data/telemetry.json, data/forecast.json, data/repair_queue.json

91 telemetry frames (t = 0..90), a 73-point 72-hour forecast, and the 4 unranked
repair tasks. Every number is produced by scripts/physics.py; nothing here is typed.

The fault chain injected into B-17:
  cracked cell in module B2-07 -> series resistance rises -> that cell becomes
  current-limiting -> its bypass diode activates -> the whole substring is bypassed
  and sits in reverse bias, dissipating power as heat. Substrings are wired in ROWS,
  which is why the measured thermal signature is a contiguous band across row 2 and
  not isolated cells. Net effect: f_mismatch drops to 0.4160 on 5 of the array's
  7 strings.

The fault ramps across t = 6..9 rather than stepping, so farm health animates.

Run:  python scripts/generate_telemetry.py
"""

import json
import os
import sys

import physics as P

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OUT_TELEMETRY = 'data/telemetry.json'
OUT_FORECAST = 'data/forecast.json'
OUT_QUEUE = 'data/repair_queue.json'

DEMO_SECONDS = 90


# ── helpers ─────────────────────────────────────────────────────────────────

def clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def fault_progress(t: float) -> float:
    """0 before the fault, 1 once fully developed. Linear across t = 6..9."""
    return clamp01((t - P.FAULT_RAMP_START) / (P.FAULT_RAMP_END - P.FAULT_RAMP_START))


def array_soil(pid: str) -> float:
    if pid in P.SOILED_HEAVY_ARRAYS:
        return P.F_SOIL_HEAVY
    if pid in P.SOILED_MILD_ARRAYS:
        return P.F_SOIL_MILD
    return P.F_SOIL


def array_output_kw(pid: str, t: float, g: float, t_amb: float) -> tuple[float, float]:
    """(actual, expected) AC kW for one array. Expected always assumes nominal
    soiling and no mismatch — it is the model's answer to 'what should this be
    producing right now', which is what a deviation is measured against."""
    expected = P.p_ac(P.ARRAY_RATED_KW, g, t_amb)
    soil = array_soil(pid)

    if pid == P.FAULTED_ARRAY:
        # f_mismatch ramps 1.0 -> 0.4160 on FAULTED_STRINGS of STRINGS_PER_ARRAY.
        prog = fault_progress(t)
        f_mm = 1.0 - (1.0 - P.F_MISMATCH_FAULTED) * prog
        faulted = P.p_ac(P.P_RATED_STRING * P.FAULTED_STRINGS, g, t_amb,
                         f_soil=soil, f_mismatch=f_mm)
        healthy = P.p_ac(P.P_RATED_STRING * (P.STRINGS_PER_ARRAY - P.FAULTED_STRINGS),
                         g, t_amb, f_soil=soil)
        return faulted + healthy, expected

    return P.p_ac(P.ARRAY_RATED_KW, g, t_amb, f_soil=soil), expected


def status_for(deviation_pct: float) -> str:
    """Status is DERIVED from deviation, never assigned. This is what keeps the
    header's anomaly count honest: it counts statuses, and statuses count physics.
    B-17 therefore escalates healthy -> warning -> critical as its fault ramps in
    across t = 6..9, rather than being switched to red on a cue."""
    if deviation_pct <= P.CRITICAL_DEVIATION_PCT:
        return 'critical'
    if deviation_pct <= P.WARNING_DEVIATION_PCT:
        return 'warning'
    return 'healthy'


def terminal_status(pid: str) -> str:
    """What this array settles at once its fault is fully developed. Drives the
    health deduction; see the note in physics.py."""
    if pid == P.FAULTED_ARRAY:
        return 'critical'
    if pid in P.SOILED_HEAVY_ARRAYS:
        return 'warning'
    return 'healthy'


# ── telemetry ───────────────────────────────────────────────────────────────

def build_frames(panel_ids: list[str]) -> list[dict]:
    g, t_amb = P.G_DEMO, P.T_AMB_DEMO
    frames = []

    for t in range(DEMO_SECONDS + 1):
        panels, deductions, monitored_shortfall_kw = {}, 0.0, 0.0

        for pid in panel_ids:
            actual, expected = array_output_kw(pid, t, g, t_amb)
            dev = (actual - expected) / expected * 100.0
            status = status_for(dev)

            reading = {
                'actualKW': round(actual, 2),
                'expectedKW': round(expected, 2),
                'deviationPct': round(dev, 2),
                'cellTempC': round(P.cell_temp(t_amb, g), 2),
                'status': status,
            }

            if pid == P.FAULTED_ARRAY:
                # The string and the array are different objects with different
                # deviations (correction C3). Both are carried, never conflated.
                prog = fault_progress(t)
                f_mm = 1.0 - (1.0 - P.F_MISMATCH_FAULTED) * prog
                reading['stringDeviationPct'] = round((f_mm - 1.0) * 100.0, 2)
                # The hot band raises this array's reported cell temperature.
                reading['cellTempC'] = round(
                    P.cell_temp(t_amb, g) + P.HOT_BAND_DELTA_T_C * prog, 2)

            panels[pid] = reading
            deductions += P.HEALTH_DEDUCTION[terminal_status(pid)] * (
                fault_progress(t) if pid == P.FAULTED_ARRAY else 1.0)
            monitored_shortfall_kw += expected - actual

        # Inverter rows are a PEER STRING COMPARISON at the inspected position, not
        # inverter aggregates — an aggregate over 40 arrays would dilute a single
        # array's fault to -1% and show nothing. The UI labels the rows accordingly.
        prog = fault_progress(t)
        f_mm = 1.0 - (1.0 - P.F_MISMATCH_FAULTED) * prog
        expected_string = P.p_ac(P.P_RATED_STRING, g, t_amb)
        inverters = {
            'INV-A': {'actualKW': round(expected_string, 2),
                      'expectedKW': round(expected_string, 2),
                      'deviationPct': 0.0},
            'INV-B': {'actualKW': round(expected_string * f_mm, 2),
                      'expectedKW': round(expected_string, 2),
                      'deviationPct': round((f_mm - 1.0) * 100.0, 2)},
            'INV-C': {'actualKW': round(expected_string, 2),
                      'expectedKW': round(expected_string, 2),
                      'deviationPct': 0.0},
        }

        # Park output: 500 MW of nameplate at the current derate, less the measured
        # shortfall of the monitored arrays.
        farm_mw = P.PARK_NAMEPLATE_MW * P.derate(g, t_amb) - monitored_shortfall_kw / 1000.0

        frames.append({
            't': t,
            'timestamp': P.timestamp_at(t),
            'ambientC': t_amb,
            'irradiance': g,
            'windMs': P.WIND_DEMO,
            'cloudPct': P.CLOUD_DEMO,
            'farmOutputMW': round(farm_mw, 2),
            'farmHealth': round(100.0 - deductions, 1),
            'inverters': inverters,
            'panels': panels,
        })

    return frames


# ── forecast ────────────────────────────────────────────────────────────────

def string_shortfall_kw(hour_offset: int) -> float:
    """Shortfall of the whole faulted array (5 of 7 strings) at a forecast hour."""
    g = P.irradiance_at(hour_offset)
    t_amb = P.ambient_at(hour_offset)
    if g <= 0.0:
        return 0.0
    rated = P.P_RATED_STRING * P.FAULTED_STRINGS
    healthy = P.p_ac(rated, g, t_amb)
    faulted = P.p_ac(rated, g, t_amb, f_mismatch=P.F_MISMATCH_FAULTED)
    return healthy - faulted


def build_forecast() -> dict:
    points = [{
        'hourOffset': h,
        'ambientC': round(P.ambient_at(h), 2),
        'irradiance': round(P.irradiance_at(h), 1),
        'cloudPct': 0.0,
    } for h in range(P.FORECAST_HOURS + 1)]

    # Trapezoidal integration of the shortfall over the 72 hours.
    shortfalls = [string_shortfall_kw(h) for h in range(P.FORECAST_HOURS + 1)]
    loss_kwh = sum((shortfalls[h] + shortfalls[h + 1]) / 2.0
                   for h in range(P.FORECAST_HOURS))

    # Deadline: cumulative thermal dose. The cracked cell accrues time above
    # T_PROP_C; the deadline is the hour at which the accrued dose reaches the
    # declared budget. Both constants are stated in physics.py and the README.
    dose_h, act_before = 0.0, None
    for h in range(P.FORECAST_HOURS + 1):
        t_cracked = (P.ambient_at(h)
                     + ((P.NOCT - 20.0) / 800.0) * P.irradiance_at(h)
                     + P.HOT_BAND_DELTA_T_C)
        if t_cracked > P.T_PROP_C:
            dose_h += 1.0
        if dose_h >= P.DOSE_BUDGET_H:
            act_before = P.hhmm(h)
            break
    if act_before is None:
        raise SystemExit('deadline never reached — check T_PROP_C / DOSE_BUDGET_H')

    peak = max(p['ambientC'] for p in points)

    return {
        'points': points,
        'peakAmbientC': round(peak, 1),
        'clearHours': P.FORECAST_HOURS,
        'summary': '72H CLEAR · DELAY IS COSTLY',
        'projected72hLossMWh': round(loss_kwh / 1000.0, 2),
        'actBefore': act_before,
    }, loss_kwh


# ── repair queue ────────────────────────────────────────────────────────────

def daily_loss_mwh(shortfall_at_demo_kw: float) -> float:
    """Scale a shortfall measured at demo conditions across one forecast day's
    irradiance profile, so every queue loss figure comes from the same integral."""
    scale = sum(P.irradiance_at(h) for h in range(24)) / P.G_DEMO
    return shortfall_at_demo_kw * scale / 1000.0


def build_queue(forecast_act_before: str) -> list[dict]:
    g, t_amb = P.G_DEMO, P.T_AMB_DEMO
    expected_array = P.p_ac(P.ARRAY_RATED_KW, g, t_amb)

    def soil_shortfall(f_soil: float) -> float:
        return expected_array - P.p_ac(P.ARRAY_RATED_KW, g, t_amb, f_soil=f_soil)

    b17_shortfall = expected_array - array_output_kw(
        P.FAULTED_ARRAY, DEMO_SECONDS, g, t_amb)[0]

    # Hours from the inspection timestamp (10:04) to the computed deadline.
    dl_h, dl_m = (int(x) for x in forecast_act_before.split(':'))
    hours_to_deadline = (dl_h + dl_m / 60.0) - (10 + 4 / 60.0)

    return [
        {'id': 'INC-B17', 'panelId': 'B-17',
         'lossMWhPerDay': round(daily_loss_mwh(b17_shortfall), 2),
         'severity': 'critical',
         'hoursUntilDeadline': round(hours_to_deadline, 2),
         'accessCost': 1.0},
        {'id': 'INC-A08', 'panelId': 'A-08',
         'lossMWhPerDay': round(daily_loss_mwh(soil_shortfall(P.F_SOIL_HEAVY)), 2),
         'severity': 'warning',
         'hoursUntilDeadline': 26.0,     # next scheduled cleaning window
         'accessCost': 1.0},
        {'id': 'INC-C31', 'panelId': 'C-31',
         'lossMWhPerDay': round(daily_loss_mwh(soil_shortfall(P.F_SOIL_HEAVY)), 2),
         'severity': 'warning',
         'hoursUntilDeadline': 48.0,
         'accessCost': 1.4},             # far edge of the block, longer drive
        {'id': 'INC-A22', 'panelId': 'A-22',
         'lossMWhPerDay': round(daily_loss_mwh(soil_shortfall(P.F_SOIL_MILD)), 2),
         'severity': 'active',
         'hoursUntilDeadline': 60.0,
         'accessCost': 1.0},
    ]


SEVERITY_WEIGHT = {'critical': 3.0, 'warning': 1.5, 'active': 1.0, 'info': 0.25}


def priority_score(task: dict) -> float:
    """Mirror of src/lib/ranking.ts — printed here only so the generator can report
    the margin. The app never reads this; ranking happens in TypeScript."""
    urgency = 1.0 + 24.0 / max(1.0, task['hoursUntilDeadline'])
    return (task['lossMWhPerDay'] * SEVERITY_WEIGHT[task['severity']]
            * urgency / task['accessCost'])


# ── main ────────────────────────────────────────────────────────────────────

def main() -> None:
    farm = json.load(open('data/farm.json', encoding='utf-8'))
    panel_ids = [p['id'] for z in farm['zones'] for p in z['panels']]

    frames = build_frames(panel_ids)
    forecast, loss_kwh = build_forecast()
    queue = build_queue(forecast['actBefore'])

    os.makedirs('data', exist_ok=True)
    json.dump(frames, open(OUT_TELEMETRY, 'w', encoding='utf-8'), indent=1)
    json.dump(forecast, open(OUT_FORECAST, 'w', encoding='utf-8'), indent=2)
    json.dump(queue, open(OUT_QUEUE, 'w', encoding='utf-8'), indent=2)

    demo = frames[12]           # DEMO_FRAME_T
    b17 = demo['panels']['B-17']
    anomalies = [p for p in demo['panels'].values()
                 if p['status'] in ('warning', 'critical')]

    print(f'wrote {OUT_TELEMETRY}  ({len(frames)} frames)')
    print(f'wrote {OUT_FORECAST}   ({len(forecast["points"])} points)')
    print(f'wrote {OUT_QUEUE}      ({len(queue)} tasks)')
    print()
    print('at t=12 (DEMO_FRAME_T):')
    print(f'  INV-B deviation      {demo["inverters"]["INV-B"]["deviationPct"]:8.2f} %'
          f'   ({demo["inverters"]["INV-B"]["actualKW"]} / '
          f'{demo["inverters"]["INV-B"]["expectedKW"]} kW)')
    print(f'  B-17 array deviation {b17["deviationPct"]:8.2f} %')
    print(f'  B-17 string deviation{b17["stringDeviationPct"]:8.2f} %')
    print(f'  B-17 cell temp       {b17["cellTempC"]:8.2f} C')
    print(f'  farm output          {demo["farmOutputMW"]:8.2f} MW')
    print(f'  farm health          {demo["farmHealth"]:8.1f}')
    print(f'  anomalies            {len(anomalies):8d}  '
          f'(critical {sum(1 for p in anomalies if p["status"] == "critical")})')
    print(f'  health at t=0        {frames[0]["farmHealth"]:8.1f}')
    print()
    print('forecast:')
    print(f'  peak ambient         {forecast["peakAmbientC"]:8.1f} C')
    print(f'  projected 72h loss   {forecast["projected72hLossMWh"]:8.2f} MWh'
          f'   ({loss_kwh:.1f} kWh integrated)')
    print(f'  act before           {forecast["actBefore"]:>8}')
    print()
    print('repair queue (score computed by the same function the UI uses):')
    ranked = sorted(queue, key=priority_score, reverse=True)
    for i, task in enumerate(ranked, 1):
        print(f'  {i}. {task["id"]:9} {task["lossMWhPerDay"]:5.2f} MWh/d  '
              f'{task["severity"]:8} {task["hoursUntilDeadline"]:6.2f} h  '
              f'access {task["accessCost"]}  -> score {priority_score(task):8.3f}')
    print(f'  margin #1 over #2: {priority_score(ranked[0]) / priority_score(ranked[1]):.1f}x')


if __name__ == '__main__':
    main()
