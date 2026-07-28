/**
 * src/lib/format.ts — every number on screen is formatted here, never inline.
 *
 * One place decides that power renders `15.02 kW`, that deviation renders `−58.4 %`
 * with a REAL minus sign (U+2212, not a hyphen), and that nothing ever loses its
 * unit. At 12px monospace the difference between − and - is visible, and it is the
 * kind of detail that makes an interface look instrumented rather than mocked up.
 *
 * Pure, I/O-free, no React. plan/02 §6 rule 5.
 */

/** U+2212 MINUS SIGN. Not a hyphen-minus. This is deliberate — plan/04 §7. */
export const MINUS = '−';

/** Replace the ASCII hyphen JS produces with a typographic minus. */
const sign = (s: string): string => s.replace(/^-/, MINUS);

export const num = (v: number, dp = 1): string => sign(v.toFixed(dp));

/** Deviation, always signed, always with its unit: `−58.4 %`, `0.0 %`. */
export const pct = (v: number, dp = 1): string => `${sign(v.toFixed(dp))} %`;

/** Power. Strings and arrays are quoted to 2dp — `15.02 kW`. */
export const kW = (v: number, dp = 2): string => `${sign(v.toFixed(dp))} kW`;

/** Farm output. Whole MW — the KPI is 34px and a decimal there is noise. */
export const MW = (v: number, dp = 0): string => `${sign(v.toFixed(dp))} MW`;

export const MWh = (v: number, dp = 2): string => `${sign(v.toFixed(dp))} MWh`;

export const degC = (v: number, dp = 1): string => `${sign(v.toFixed(dp))} °C`;

/** Temperature DELTA — always explicitly signed, because +2.8 and 2.8 differ. */
export const deltaT = (v: number, dp = 1): string =>
  `${v >= 0 ? '+' : MINUS}${Math.abs(v).toFixed(dp)} °C`;

export const wm2 = (v: number, dp = 0): string => `${v.toFixed(dp)} W/m²`;

export const ms = (v: number, dp = 1): string => `${v.toFixed(dp)} m/s`;

/** Percentages that are ratios rather than deviations: battery, cloud, signal. */
export const pctPlain = (v: number, dp = 0): string => `${v.toFixed(dp)} %`;

/** Model confidence, as returned. Never rounded up — see invariant I11. */
export const confidence = (v: number): string => v.toFixed(2);

/** Elapsed demo time as `T+00:42`. */
export const timecode = (t: number): string => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `T+${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/** Hours to a human deadline distance: `3.9 h`. */
export const hours = (v: number, dp = 1): string => `${v.toFixed(dp)} h`;

/** `2026-03-14` → `14 MAR 2026`, the way a maintenance log reads. */
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const serviceDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
};
