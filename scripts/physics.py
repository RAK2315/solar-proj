"""
physics.py — the PV performance model. THE single source of every number on screen.

Nothing here is invented. The cell-temperature model and the power equation are NREL
PVWatts; the coefficients are representative crystalline-silicon values, stated below;
the two solved parameters are called out explicitly as solved.

    T_cell = T_amb + ((NOCT - 20) / 800) * G                    [NREL PVWatts]
    P_dc   = P_rated * (G/1000) * (1 + gamma*(T_cell - 25)) * f_soil * f_mismatch
    P_ac   = P_dc * eta_inv

Imported by generate_farm.py, generate_telemetry.py, generate_events.py and
thermal_hotspot.py. If a constant needs to change, it changes HERE and the invariants
in src/lib/types.ts catch every downstream consequence.

Frozen values and their provenance: docs/contract-freeze.md
"""

import math

# ── Model coefficients ──────────────────────────────────────────────────────
# Provenance for each of these is the table in docs/contract-freeze.md §4.

NOCT = 45.0          # degC   nominal operating cell temperature, standard c-Si datasheet
GAMMA = -0.0037      # /degC  power temperature coefficient. Representative c-Si; the
                     #        typical band is -0.0035..-0.0040 and this is a mid-value,
                     #        NOT a specific module's datasheet figure. Say so if asked.
ETA_INV = 0.98       #        inverter efficiency, typical utility-scale central inverter
F_SOIL = 0.97        #        nominal soiling derate, representative for Rajasthan pre-clean

# ── Solved parameters ───────────────────────────────────────────────────────
# Both are SOLVED to reproduce an observable we are demonstrating, which is a
# legitimate move as long as it is declared. It is declared here.

P_RATED_STRING = 49.61    # kW  solved so expected == 36.10 kW at demo conditions.
                          #     CLAUDE.md's original 40.0 yields 29.11 kW (correction C1).
F_MISMATCH_FAULTED = 0.4160   # solved so the string deviation is exactly -58.4%.
                              # Every other term cancels, so deviation == f_mismatch - 1.

# ── Site geometry ───────────────────────────────────────────────────────────

STRINGS_PER_ARRAY = 7     # correction C3 / plan 03 sec 4 resolution (a)
FAULTED_STRINGS = 5       # of B-17's 7 -> array deviation = string deviation * 5/7
ARRAYS_PER_ZONE = 40      # 5 rows x 8 cols
ZONE_ROWS, ZONE_COLS = 5, 8
PARK_NAMEPLATE_MW = 500.0 # a 500 MW block of Bhadla's 2,245 MW (correction C4)
MODULES_PER_ARRAY = 637   # ~545 W modules; descriptive only, nothing on screen reads it

# ── Demo conditions (frozen, CLAUDE.md sec 2 / sec 19) ──────────────────────

G_DEMO = 890.0            # W/m2
T_AMB_DEMO = 35.0         # degC
WIND_DEMO = 1.6           # m/s
CLOUD_DEMO = 0.0          # %
DEMO_HOUR = 10.0          # site local hour the telemetry window sits at

# Wall-clock labels. The 90-second demo clock compresses ~19 minutes of site time,
# so these are display strings frozen in CLAUDE.md sec 19 (anomaly 09:48, inspection
# 10:04, result 10:05) rather than anything derived from t. Conditions are held
# constant across the window so every frame is comparable to every other.
DEMO_TIMESTAMPS = ((0, '09:47'), (6, '09:48'), (18, '09:49'),
                   (22, '10:04'), (56, '10:05'), (84, '10:06'))


def timestamp_at(t: float) -> str:
    """The display clock for demo second t."""
    label = DEMO_TIMESTAMPS[0][1]
    for start, text in DEMO_TIMESTAMPS:
        if t >= start:
            label = text
    return label

# ── Soiling levels for the non-B-17 anomalies ───────────────────────────────
# These arrays are GENERATED with a reduced soiling factor, never painted amber.
# Correction C11: exactly 2 arrays cross the warning threshold, because CLAUDE.md
# sec 2 puts ANOMALIES at 2 before the fault and 3 after.

F_SOIL_HEAVY = 0.86       # heavy soiling -> crosses the warning threshold
F_SOIL_MILD = 0.93        # mild soiling  -> stays healthy, but earns a queue entry
WARNING_DEVIATION_PCT = -8.0    # array deviation at or below this reads as 'warning'
CRITICAL_DEVIATION_PCT = -16.0  # ...and at or below this, 'critical'

SOILED_HEAVY_ARRAYS = ('A-08', 'C-31')   # -> status 'warning', queue INC-A08 / INC-C31
SOILED_MILD_ARRAYS = ('A-22',)           # -> status 'healthy', queue INC-A22

# ── Fault location ──────────────────────────────────────────────────────────

FAULTED_ARRAY = 'B-17'
FAULTED_STRING_ID = 'B-17-S3'
FAULTED_MODULE = 'B2-07'
FAULT_RAMP_START, FAULT_RAMP_END = 6.0, 9.0   # demo seconds; ramps so health animates

# ΔT of the measured hot band, from scripts/thermal_hotspot.py on Raptor Maps 7916.jpg.
# Measured, not chosen. See docs/dataset-provenance.md.
HOT_BAND_DELTA_T_C = 2.8

# ── Fleet health index ──────────────────────────────────────────────────────
# A severity roll-up, NOT an energy ratio. Deliberately: 120 monitored arrays are
# ~30 MW of a 500 MW block, so an energy ratio would read 99.5% and say nothing.
# Conflating the two would also hide the difference between "dirty" and "about to
# fail", which is the entire point of the product.
# The weights are a calibration choice. They are stated here and nowhere else.

HEALTH_DEDUCTION = {
    'healthy': 0.0,
    'warning': 3.0,
    'critical': 14.0,
    'scheduled': 14.0,   # a scheduled fault is still a fault until the tech closes it
}

# Health is deducted against each array's TERMINAL status scaled by how far its fault
# has developed, not against the status label showing right now. Two reasons, both
# load-bearing: the index stays a continuous function of the underlying deviation
# (invariant I16 rejects any jump > 6 per frame), and it does not lurch when a
# deviation crosses a display threshold. The label is a threshold on the same number.

# ── Crack-propagation deadline model ────────────────────────────────────────
# Cumulative thermal dose: the cracked cell accrues time above a propagation
# threshold, and the deadline is when the accrued dose reaches the budget.
#
# T_PROP_C is an engineering threshold. DOSE_BUDGET_H is SOLVED to reproduce the
# frozen 14:00 deadline, on the same footing as F_MISMATCH_FAULTED above — a
# declared assumption, not a measurement. Both are stated in the README.

T_PROP_C = 65.0           # degC  cracked-cell propagation threshold
DOSE_BUDGET_H = 5.0       # h     above threshold before diode failure risk is material

# ── Forecast shape ──────────────────────────────────────────────────────────

FORECAST_HOURS = 72
FORECAST_PEAK_HOUR = 15.0       # ambient peaks mid-afternoon
FORECAST_PEAK_DAY3_C = 38.1     # frozen (CLAUDE.md sec 19); day 1 and 2 trend below it
FORECAST_WARMING_PER_DAY_C = 0.5
POA_SHAPE = 0.5                 # plane-of-array flattening exponent. A tilted plane sees
                                # a broader, flatter irradiance profile than a horizontal
                                # one; 0.5 is an empirical shape parameter, declared.
IRRADIANCE_TREND_PER_DAY = 5.0  # W/m2, clear-sky days trending slightly up


# ── The model ───────────────────────────────────────────────────────────────

def cell_temp(t_amb: float, g: float) -> float:
    """NREL PVWatts NOCT cell-temperature model. Verified verbatim against the
    Technical Reference (NREL/TP-6A20-60272)."""
    return t_amb + ((NOCT - 20.0) / 800.0) * g


def p_ac(p_rated: float, g: float, t_amb: float,
         f_soil: float = F_SOIL, f_mismatch: float = 1.0) -> float:
    """AC power for a nameplate p_rated under irradiance g and ambient t_amb."""
    t_c = cell_temp(t_amb, g)
    p_dc = p_rated * (g / 1000.0) * (1.0 + GAMMA * (t_c - 25.0)) * f_soil * f_mismatch
    return p_dc * ETA_INV


def derate(g: float = G_DEMO, t_amb: float = T_AMB_DEMO, f_soil: float = F_SOIL) -> float:
    """Output per kW of nameplate. 0.727669 at demo conditions."""
    return p_ac(1.0, g, t_amb, f_soil=f_soil)


# ── Forecast profiles ───────────────────────────────────────────────────────

def _day_of(hour_offset: int) -> int:
    """Day index 0,1,2,3 for an offset measured from DEMO_HOUR on day 1."""
    return int((DEMO_HOUR + hour_offset) // 24)


def _hour_of_day(hour_offset: int) -> float:
    return (DEMO_HOUR + hour_offset) % 24.0


def ambient_at(hour_offset: int) -> float:
    """Diurnal ambient. Peaks at FORECAST_PEAK_HOUR, warms FORECAST_WARMING_PER_DAY_C
    per day, and is pinned so hour_offset 0 reads exactly T_AMB_DEMO."""
    day = _day_of(hour_offset)
    hod = _hour_of_day(hour_offset)
    peak_day = FORECAST_PEAK_DAY3_C - FORECAST_WARMING_PER_DAY_C * (2 - day)
    mean_day = peak_day - _AMBIENT_HALF_AMPLITUDE
    return mean_day + _AMBIENT_HALF_AMPLITUDE * math.cos(
        2.0 * math.pi * (hod - FORECAST_PEAK_HOUR) / 24.0)


def _solve_ambient_half_amplitude() -> float:
    """Solved, not chosen: the only half-amplitude for which hour_offset 0 (10:00 on
    day 1) reads exactly 35.0 degC while day 3 peaks at exactly 38.1 degC.

    It comes out near 2.8 degC, i.e. a ~5.7 degC daily spread. That is a narrow range
    for a desert, and it is the honest consequence of the two frozen numbers. It also
    strengthens the story rather than weakening it: warm nights mean the module never
    cools down, which is exactly why 72 clear hours is costly.
    """
    peak_day1 = FORECAST_PEAK_DAY3_C - 2 * FORECAST_WARMING_PER_DAY_C
    phase = math.cos(2.0 * math.pi * (DEMO_HOUR - FORECAST_PEAK_HOUR) / 24.0)
    # T_AMB_DEMO = (peak_day1 - A) + A*phase  ->  solve for A
    return (peak_day1 - T_AMB_DEMO) / (1.0 - phase)


_AMBIENT_HALF_AMPLITUDE = _solve_ambient_half_amplitude()


def irradiance_at(hour_offset: int) -> float:
    """Clear-sky plane-of-array irradiance. Zero outside 06:00-18:00, peaking at solar
    noon, pinned so hour_offset 0 reads exactly G_DEMO."""
    day = _day_of(hour_offset)
    hod = _hour_of_day(hour_offset)
    if hod <= 6.0 or hod >= 18.0:
        return 0.0
    shape = math.cos(math.pi * (hod - 12.0) / 12.0) ** POA_SHAPE
    return (_G_PEAK_DAY1 + IRRADIANCE_TREND_PER_DAY * day) * shape


def _solve_g_peak_day1() -> float:
    """Solved so hour_offset 0 (10:00) reads exactly G_DEMO = 890 W/m2."""
    shape_at_demo = math.cos(math.pi * (DEMO_HOUR - 12.0) / 12.0) ** POA_SHAPE
    return G_DEMO / shape_at_demo


_G_PEAK_DAY1 = _solve_g_peak_day1()


def hhmm(hour_offset: int) -> str:
    """Wall-clock label for a forecast offset."""
    hod = _hour_of_day(hour_offset)
    return f'{int(hod):02d}:{int(round((hod % 1) * 60)):02d}'


# ── Derived demo figures, computed once so nothing re-derives them ──────────

EXPECTED_STRING_KW = p_ac(P_RATED_STRING, G_DEMO, T_AMB_DEMO)
ACTUAL_STRING_KW = p_ac(P_RATED_STRING, G_DEMO, T_AMB_DEMO, f_mismatch=F_MISMATCH_FAULTED)
DEV_STRING_PCT = (ACTUAL_STRING_KW - EXPECTED_STRING_KW) / EXPECTED_STRING_KW * 100.0
DEV_ARRAY_PCT = DEV_STRING_PCT * FAULTED_STRINGS / STRINGS_PER_ARRAY
ARRAY_RATED_KW = P_RATED_STRING * STRINGS_PER_ARRAY
CELL_TEMP_DEMO_C = cell_temp(T_AMB_DEMO, G_DEMO)


if __name__ == '__main__':
    print(f'T_cell            {CELL_TEMP_DEMO_C:9.4f} C')
    print(f'derate            {derate():9.6f}')
    print(f'expected string   {EXPECTED_STRING_KW:9.4f} kW')
    print(f'actual string     {ACTUAL_STRING_KW:9.4f} kW')
    print(f'dev string        {DEV_STRING_PCT:9.4f} %')
    print(f'dev array         {DEV_ARRAY_PCT:9.4f} %')
    print(f'array nameplate   {ARRAY_RATED_KW:9.4f} kW')
    print(f'park output       {PARK_NAMEPLATE_MW * derate():9.4f} MW')
    print(f'ambient half-amp  {_AMBIENT_HALF_AMPLITUDE:9.4f} C  (spread '
          f'{2 * _AMBIENT_HALF_AMPLITUDE:.2f} C)')
    print(f'G peak day 1      {_G_PEAK_DAY1:9.4f} W/m2')
