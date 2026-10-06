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

/**
 * Typographic pass over text we did NOT write — agent prose.
 *
 * The model writes `-58.4%` with an ASCII hyphen. Rendered beside a table that says
 * `−58.4 %` with a real U+2212, the two look like output from different systems.
 * This swaps the GLYPH and nothing else: no word, no digit, no unit is altered, and
 * it deliberately will not touch a hyphen inside an identifier like `B-17` or
 * `INV-B`, because the minus must be preceded by whitespace or an opening bracket.
 *
 * Presentation only. The committed cache keeps the model's characters verbatim.
 */
export const typographic = (text: string): string =>
  text.replace(/(^|[\s([])-(?=\d)/g, `$1${MINUS}`);

/** `2026-03-14` → `14 MAR 2026`, the way a maintenance log reads. */
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const serviceDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
};

/** Sentence case for a committed label written in capitals. */
export const sentence = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/**
 * Sentence case that leaves identifiers alone. The committed event copy is upper
 * case; sentence case is a settled rule, but `B-17`, `INV-B` and `DRONE 01` are
 * names and keep their own casing.
 */
export const eventCase = (s: string): string =>
  sentence(s).replace(
    /\b([a-z]-\d+(?:-s\d+)?|b\d-\d+|inv-[a-c]|inc-[a-z]\d+|pad-\d+|msn-\d+|drone \d+|surya)\b/g,
    (m) => m.toUpperCase(),
  );

/** `10.2` hours of the day as `10:12`. */
export const clockOf = (hour: number): string => {
  const m = Math.round(hour * 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
