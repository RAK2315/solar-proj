/**
 * src/lib/physics.ts — the TS mirror of scripts/physics.py.
 *
 * WHY THIS EXISTS. Until now every number came from 91 pre-generated frames, which
 * is right for a scripted demo and useless for a live console: an operator can look
 * at any array at any time, and the site keeps running after second 90.
 *
 * So the browser computes telemetry from the model directly. The credibility
 * property is unchanged — every number is still traceable to a documented PV
 * performance model — but it is now traceable to THIS file as well as the Python.
 *
 * WHICH MEANS THE TWO MUST AGREE, EXACTLY. physics.test.ts recomputes the committed
 * telemetry.json frame by frame from these functions and fails on any divergence.
 * That golden test is the whole reason this file is allowed to exist; without it,
 * a port is just a second place for the numbers to drift.
 *
 * Model, verbatim from NREL PVWatts:
 *   T_cell = T_amb + ((NOCT - 20) / 800) * G
 *   P_dc   = P_rated * (G/1000) * (1 + gamma*(T_cell - 25)) * f_soil * f_mismatch
 *   P_ac   = P_dc * eta_inv
 */

/* ── Coefficients. Provenance: docs/contract-freeze.md §4. ───────────────── */

export const NOCT = 45.0;        // °C, nominal operating cell temperature, c-Si
export const GAMMA = -0.0037;    // /°C, power temperature coefficient (representative)
export const ETA_INV = 0.98;     // inverter efficiency
export const F_SOIL = 0.97;      // nominal soiling derate

/* ── Solved parameters — declared as solved, not discovered. ─────────────── */

/** Solved so expected == 36.10 kW at demo conditions. */
export const P_RATED_STRING = 49.61;
/** Solved so the string deviation is exactly −58.4 %. */
export const F_MISMATCH_FAULTED = 0.4160;

/* ── Site ────────────────────────────────────────────────────────────────── */

export const STRINGS_PER_ARRAY = 7;
export const FAULTED_STRINGS = 5;
export const ARRAY_RATED_KW = P_RATED_STRING * STRINGS_PER_ARRAY;   // 347.27
export const PARK_NAMEPLATE_MW = 500.0;

/** Reference conditions the frozen figures are quoted at. */
export const G_REF = 890.0;
export const T_AMB_REF = 35.0;
export const WIND_REF = 1.6;
export const DEMO_HOUR = 10.0;

/* ── Soiling and thresholds ──────────────────────────────────────────────── */

export const F_SOIL_HEAVY = 0.86;    // crosses the warning threshold
export const F_SOIL_MILD = 0.93;     // stays healthy, still worth queueing
export const WARNING_DEVIATION_PCT = -8.0;
export const CRITICAL_DEVIATION_PCT = -16.0;

export const SOILED_HEAVY_ARRAYS = ['A-08', 'C-31'] as const;
export const SOILED_MILD_ARRAYS = ['A-22'] as const;

/* ── Fleet health index ──────────────────────────────────────────────────── */

export const HEALTH_DEDUCTION: Record<string, number> = {
  healthy: 0,
  warning: 3.0,
  critical: 14.0,
  scheduled: 14.0,
};

/* ── Crack propagation ───────────────────────────────────────────────────── */

export const T_PROP_C = 65.0;
export const DOSE_BUDGET_H = 5.0;
export const HOT_BAND_DELTA_T_C = 2.8;

/* ── Forecast shape ──────────────────────────────────────────────────────── */

export const FORECAST_HOURS = 72;
export const FORECAST_PEAK_HOUR = 15.0;
export const FORECAST_PEAK_DAY3_C = 38.1;
export const FORECAST_WARMING_PER_DAY_C = 0.5;
export const POA_SHAPE = 0.5;
export const IRRADIANCE_TREND_PER_DAY = 5.0;

/* ── The model ───────────────────────────────────────────────────────────── */

/** NREL PVWatts NOCT cell-temperature model. */
export const cellTemp = (tAmb: number, g: number): number =>
  tAmb + ((NOCT - 20) / 800) * g;

/** AC power for a nameplate under given conditions. */
export function pAc(
  pRated: number,
  g: number,
  tAmb: number,
  fSoil = F_SOIL,
  fMismatch = 1.0,
): number {
  const tc = cellTemp(tAmb, g);
  const pDc = pRated * (g / 1000) * (1 + GAMMA * (tc - 25)) * fSoil * fMismatch;
  return pDc * ETA_INV;
}

/** Output per kW of nameplate. 0.727669 at reference conditions. */
export const derate = (g = G_REF, tAmb = T_AMB_REF, fSoil = F_SOIL): number =>
  pAc(1, g, tAmb, fSoil);

/* ── Diurnal profiles ────────────────────────────────────────────────────── */

const dayOf = (hourOffset: number) => Math.floor((DEMO_HOUR + hourOffset) / 24);
const hourOfDay = (hourOffset: number) => (DEMO_HOUR + hourOffset) % 24;

/**
 * Solved, not chosen: the only half-amplitude for which hour 0 reads exactly
 * 35.0 °C while day 3 peaks at exactly 38.1 °C. Comes out near 2.83 °C — a narrow
 * daily spread, which is the honest consequence of those two frozen numbers and
 * which strengthens the story rather than weakening it. See correction C19.
 */
const AMBIENT_HALF_AMPLITUDE = (() => {
  const peakDay1 = FORECAST_PEAK_DAY3_C - 2 * FORECAST_WARMING_PER_DAY_C;
  const phase = Math.cos((2 * Math.PI * (DEMO_HOUR - FORECAST_PEAK_HOUR)) / 24);
  return (peakDay1 - T_AMB_REF) / (1 - phase);
})();

export function ambientAt(hourOffset: number): number {
  const day = dayOf(hourOffset);
  const hod = hourOfDay(hourOffset);
  const peakDay = FORECAST_PEAK_DAY3_C - FORECAST_WARMING_PER_DAY_C * (2 - day);
  const meanDay = peakDay - AMBIENT_HALF_AMPLITUDE;
  return meanDay + AMBIENT_HALF_AMPLITUDE
    * Math.cos((2 * Math.PI * (hod - FORECAST_PEAK_HOUR)) / 24);
}

/** Solved so hour 0 reads exactly 890 W/m². */
const G_PEAK_DAY1 = (() => {
  const shape = Math.cos((Math.PI * (DEMO_HOUR - 12)) / 12) ** POA_SHAPE;
  return G_REF / shape;
})();

export function irradianceAt(hourOffset: number): number {
  const day = dayOf(hourOffset);
  const hod = hourOfDay(hourOffset);
  if (hod <= 6 || hod >= 18) return 0;
  const shape = Math.cos((Math.PI * (hod - 12)) / 12) ** POA_SHAPE;
  return (G_PEAK_DAY1 + IRRADIANCE_TREND_PER_DAY * day) * shape;
}

/** Wall-clock label for an hour offset from the reference hour. */
export function clockAt(hourOffset: number): string {
  const hod = hourOfDay(hourOffset);
  const h = Math.floor(hod);
  const m = Math.round((hod % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/* ── Derived reference figures ───────────────────────────────────────────── */

export const EXPECTED_STRING_KW = pAc(P_RATED_STRING, G_REF, T_AMB_REF);
export const ACTUAL_STRING_KW = pAc(P_RATED_STRING, G_REF, T_AMB_REF, F_SOIL, F_MISMATCH_FAULTED);
export const DEV_STRING_PCT = ((ACTUAL_STRING_KW - EXPECTED_STRING_KW) / EXPECTED_STRING_KW) * 100;
export const DEV_ARRAY_PCT = (DEV_STRING_PCT * FAULTED_STRINGS) / STRINGS_PER_ARRAY;
export const CELL_TEMP_REF_C = cellTemp(T_AMB_REF, G_REF);

/* ── Per-array evaluation, for ANY array at ANY conditions ──────────────── */

export type PanelStatusValue = 'healthy' | 'warning' | 'critical' | 'scheduled';

export interface ArrayConditions {
  /** 0 = healthy, 1 = fully developed mismatch fault. */
  faultProgress?: number;
  /**
   * How many of the array's strings the fault reaches, and how far the mismatch
   * derate falls on them once it is fully developed.
   *
   * Defaulted to B-17's frozen pair, so every existing caller — the golden test
   * included — computes byte-identical numbers. They are parameters rather than
   * constants because a crack is not one size: a hairline that has reached two
   * strings and one that has taken six are the same MECHANISM at different
   * depths, and a console that can only render one of them cannot be used to
   * compare two.
   */
  faultedStrings?: number;
  terminalMismatch?: number;
  /** Soiling derate for this array. Defaults to nominal. */
  fSoil?: number;
  /** Already dispatched and scheduled for repair. */
  scheduled?: boolean;
}

export interface ArrayReading {
  actualKW: number;
  expectedKW: number;
  deviationPct: number;
  stringDeviationPct?: number;
  cellTempC: number;
  status: PanelStatusValue;
}

/**
 * What one array is producing, and what it should be.
 *
 * `expected` always assumes nominal soiling and no mismatch — it is the model's
 * answer to "what should this be producing right now", which is what a deviation
 * is measured against.
 */
export function evaluateArray(
  g: number,
  tAmb: number,
  {
    faultProgress = 0,
    faultedStrings = FAULTED_STRINGS,
    terminalMismatch = F_MISMATCH_FAULTED,
    fSoil = F_SOIL,
    scheduled = false,
  }: ArrayConditions = {},
): ArrayReading {
  const expected = pAc(ARRAY_RATED_KW, g, tAmb);

  let actual: number;
  let stringDeviationPct: number | undefined;

  if (faultProgress > 0) {
    const fMismatch = 1 - (1 - terminalMismatch) * faultProgress;
    const faulted = pAc(P_RATED_STRING * faultedStrings, g, tAmb, fSoil, fMismatch);
    const healthy = pAc(P_RATED_STRING * (STRINGS_PER_ARRAY - faultedStrings), g, tAmb, fSoil);
    actual = faulted + healthy;
    stringDeviationPct = (fMismatch - 1) * 100;
  } else {
    actual = pAc(ARRAY_RATED_KW, g, tAmb, fSoil);
  }

  const deviationPct = expected > 0 ? ((actual - expected) / expected) * 100 : 0;

  return {
    actualKW: actual,
    expectedKW: expected,
    deviationPct,
    stringDeviationPct,
    cellTempC: cellTemp(tAmb, g) + HOT_BAND_DELTA_T_C * faultProgress,
    status: scheduled ? 'scheduled' : statusFor(deviationPct),
  };
}

/**
 * After sunset there is no generation, so there is nothing to deviate FROM.
 *
 * This matters more than it sounds. A dark array reads 0.00 kW actual against
 * 0.00 kW expected, which the deviation formula floors to 0.0 % and the status
 * function then calls `healthy`. That is arithmetically right and operationally
 * misleading: the array is not healthy, it is unobservable, and a console that
 * cannot tell those apart will happily report a cracked panel as fine all night.
 */
export const isDark = (g: number): boolean => g <= 0;

/**
 * The hour at which a cracked cell's cumulative time above the propagation
 * threshold reaches the declared dose budget — the deadline the prognosis stage
 * is built on, as a function rather than as one frozen string.
 *
 * The mirror of the loop in scripts/generate_telemetry.py, and it reproduces
 * that script's 14:00 for a fault beginning at the epoch. ΔT is the MEASURED
 * band rise for a bypassed substring in reverse bias; it does not scale with how
 * many strings the crack has reached, because the number of affected strings
 * changes the power lost, not the temperature one shorted substring runs at.
 *
 * Returns hours since the epoch, or null if the forecast never accrues the dose.
 */
export function crackDeadlineHour(
  faultStartHourOffset: number,
  deltaTC = HOT_BAND_DELTA_T_C,
): number | null {
  let dose = 0;
  for (let h = Math.max(0, Math.floor(faultStartHourOffset)); h <= FORECAST_HOURS; h += 1) {
    if (cellTemp(ambientAt(h), irradianceAt(h)) + deltaTC > T_PROP_C) dose += 1;
    if (dose >= DOSE_BUDGET_H) return h;
  }
  return null;
}

/** Status is DERIVED from deviation, never assigned. */
export function statusFor(deviationPct: number): PanelStatusValue {
  if (deviationPct <= CRITICAL_DEVIATION_PCT) return 'critical';
  if (deviationPct <= WARNING_DEVIATION_PCT) return 'warning';
  return 'healthy';
}

/** Soiling derate an array carries by default, from the committed site state. */
export function soilFor(panelId: string): number {
  if ((SOILED_HEAVY_ARRAYS as readonly string[]).includes(panelId)) return F_SOIL_HEAVY;
  if ((SOILED_MILD_ARRAYS as readonly string[]).includes(panelId)) return F_SOIL_MILD;
  return F_SOIL;
}

/**
 * Fleet health: a severity roll-up, NOT an energy ratio.
 *
 * 120 monitored arrays are ~30 MW of a 500 MW block, so an energy ratio would read
 * 99.5% and say nothing — and it would hide the difference between "dirty" and
 * "about to fail", which is the entire point of the product. Deductions scale with
 * fault MAGNITUDE rather than the status label, so the index stays continuous.
 */
export function fleetHealth(
  arrays: Array<{ terminalStatus: PanelStatusValue; progress: number }>,
): number {
  let deductions = 0;
  for (const a of arrays) deductions += HEALTH_DEDUCTION[a.terminalStatus] * a.progress;
  return Math.max(0, 100 - deductions);
}

/** Park output: nameplate at the current derate, less the monitored shortfall. */
export const parkOutputMW = (g: number, tAmb: number, monitoredShortfallKW: number): number =>
  PARK_NAMEPLATE_MW * derate(g, tAmb) - monitoredShortfallKW / 1000;
