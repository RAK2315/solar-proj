/**
 * src/lib/ironbow.ts — THE ramp. One definition, three consumers.
 *
 * The aesthetic bet of this project is that the console's semantic colour ramp and
 * the thermal camera's false-colour LUT are the SAME ramp, so that when the feed
 * goes thermal at t=48 it reads as one instrument changing modes rather than as two
 * applications. That only holds if they actually agree.
 *
 * Before this file the seven stops existed in three places — globals.css tokens,
 * a nearest-stop lookup in AnomalyMatrix, and vec3 literals in the GLSL shader —
 * and nothing checked them against each other. Now:
 *
 *   AnomalyMatrix   calls ironbowForDeltaT()
 *   ThermalPass     builds its shader from ironbowGlsl()
 *   globals.css     still declares --iron-* for the semantic aliases, and
 *                   ironbow.test.ts PARSES THAT FILE and fails if it has drifted
 *
 * scripts/thermal_hotspot.py carries the same stops for its matplotlib render.
 * If you reshade the ramp, reshade it here and in that script, and the test will
 * tell you if you missed the stylesheet.
 */

/** --iron-00 … --iron-100. Cold to saturated. */
export const IRONBOW_STOPS = [
  '#1b1035',   // --iron-00   coldest / nominal-idle
  '#4a1d6e',   // --iron-20   healthy
  '#9b2a63',   // --iron-40   elevated
  '#d94a3d',   // --iron-60   warning
  '#f08b2a',   // --iron-80   high
  '#ffc94d',   // --iron-95   critical
  '#fff3d6',   // --iron-100  peak / saturated
] as const;

/** The CSS custom-property name each stop must be declared under. */
export const IRONBOW_TOKENS = [
  '--iron-00', '--iron-20', '--iron-40', '--iron-60', '--iron-80', '--iron-95',
  '--iron-100',
] as const;

export type Rgb = readonly [number, number, number];

/** '#rrggbb' → [0..255, 0..255, 0..255] */
export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const STOP_RGB: Rgb[] = IRONBOW_STOPS.map(hexToRgb);

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Ramp colour for a normalised 0..1 value, linearly interpolated between stops.
 *
 * This is the reference implementation. The GLSL below is generated from the same
 * table and must agree with it — ironbow.test.ts checks that they do, to within a
 * rounding step, across the whole domain.
 */
export function ironbowAt(k: number): Rgb {
  const x = clamp01(k) * (STOP_RGB.length - 1);
  const i = Math.min(STOP_RGB.length - 2, Math.floor(x));
  const f = x - i;
  const a = STOP_RGB[i];
  const b = STOP_RGB[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

export const ironbowCss = (k: number): string => {
  const [r, g, b] = ironbowAt(k);
  return `rgb(${r} ${g} ${b})`;
};

/**
 * ΔT in °C → normalised ramp position.
 *
 * The domain is the measured cell grid's actual range, not a guess: the coldest
 * cell reads about −6.3 °C against the array median and the hot band about +2.8.
 * Mapping the ramp across THAT means the band lands in the orange/amber end where
 * a thermographer expects heat, and the cool corners sit in the deep purples.
 */
export const DELTA_T_DOMAIN = { min: -6.5, max: 3.2 } as const;

export const normaliseDeltaT = (dt: number): number =>
  clamp01((dt - DELTA_T_DOMAIN.min) / (DELTA_T_DOMAIN.max - DELTA_T_DOMAIN.min));

export const ironbowForDeltaT = (dt: number): string => ironbowCss(normaliseDeltaT(dt));

/**
 * The same ramp as a GLSL function, generated from the same table.
 *
 * Written out rather than sampled from a texture because seven stops of linear
 * interpolation is cheaper than a texture fetch, and because a generated function
 * cannot fall out of sync with the array above the way a hand-typed one did.
 */
export function ironbowGlsl(fnName = 'ironbow'): string {
  const consts = STOP_RGB
    .map(([r, g, b], i) =>
      `    vec3 c${i} = vec3(${(r / 255).toFixed(4)}, ${(g / 255).toFixed(4)}, ${(b / 255).toFixed(4)});`)
    .join('\n');

  const branches = STOP_RGB.slice(0, -1)
    .map((_, i) =>
      i === STOP_RGB.length - 2
        ? `    return mix(c${i}, c${i + 1}, s - ${i}.0);`
        : `    if (s < ${i + 1}.0) return mix(c${i}, c${i + 1}, s - ${i}.0);`)
    .join('\n');

  return `  vec3 ${fnName}(float x) {
    x = clamp(x, 0.0, 1.0);
${consts}
    float s = x * ${(STOP_RGB.length - 1).toFixed(1)};
${branches}
  }`;
}
