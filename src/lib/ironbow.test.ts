/**
 * THE IRONBOW CONSISTENCY CHECK — plan/05 Phase 9.
 *
 * "the CSS ironbow() and the GLSL LUT produce the same colour for the same
 *  normalised value"
 *
 * That identity is the project's one aesthetic bet: the console's semantic ramp and
 * the thermal camera's LUT are the same ramp, so the thermal cut reads as one
 * instrument changing modes. A drift of one stop would break it silently — nothing
 * would look broken, it would just stop meaning anything.
 *
 * So this test reads globals.css off disk and parses the real declarations, rather
 * than trusting a copy.
 */

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  DELTA_T_DOMAIN, IRONBOW_STOPS, IRONBOW_TOKENS, hexToRgb, ironbowAt, ironbowForDeltaT,
  ironbowGlsl, normaliseDeltaT,
} from './ironbow';

const css = readFileSync('src/app/globals.css', 'utf8');

describe('the stylesheet and the TypeScript ramp are the same ramp', () => {
  it.each(IRONBOW_TOKENS.map((token, i) => [token, IRONBOW_STOPS[i]] as const))(
    '%s is declared as %s in globals.css',
    (token, expected) => {
      const match = css.match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`));
      expect(match, `${token} is not declared in globals.css`).not.toBeNull();
      expect(match![1].toLowerCase()).toBe(expected.toLowerCase());
    },
  );

  it('declares exactly seven stops — no one has quietly added an eighth', () => {
    const declared = css.match(/--iron-\d+:/g) ?? [];
    expect(declared).toHaveLength(IRONBOW_TOKENS.length);
  });
});

describe('the GLSL LUT agrees with the TypeScript one', () => {
  const glsl = ironbowGlsl();

  it('is generated from the same table, so every stop appears in it', () => {
    for (const hex of IRONBOW_STOPS) {
      const [r, g, b] = hexToRgb(hex);
      const triple = `vec3(${(r / 255).toFixed(4)}, ${(g / 255).toFixed(4)}, ${(b / 255).toFixed(4)})`;
      expect(glsl).toContain(triple);
    }
  });

  it('interpolates the same way — mix() is linear and so is ironbowAt()', () => {
    // Re-implement the generated shader's arithmetic in JS and compare across the
    // domain. A mismatch here means the two would diverge on screen.
    const stops = IRONBOW_STOPS.map(hexToRgb);
    const shaderEquivalent = (x: number) => {
      const s = Math.max(0, Math.min(1, x)) * (stops.length - 1);
      const i = Math.min(stops.length - 2, Math.floor(s));
      const f = s - i;
      return stops[i].map((c, ch) => c + (stops[i + 1][ch] - c) * f);
    };

    for (let k = 0; k <= 1.0001; k += 0.01) {
      const mine = ironbowAt(k);
      const theirs = shaderEquivalent(k);
      for (let ch = 0; ch < 3; ch += 1) {
        // ironbowAt rounds to integer bytes; the shader stays in floats. One step
        // of rounding is the whole permitted difference.
        expect(Math.abs(mine[ch] - theirs[ch]), `channel ${ch} at k=${k.toFixed(2)}`)
          .toBeLessThanOrEqual(0.5);
      }
    }
  });

  it('produces valid-looking GLSL rather than a string that happens to compile', () => {
    expect(glsl).toContain('vec3 ironbow(float x)');
    expect(glsl).toContain('clamp(x, 0.0, 1.0)');
    expect((glsl.match(/return mix\(/g) ?? [])).toHaveLength(IRONBOW_STOPS.length - 1);
  });
});

describe('the ramp is monotonic and covers its ends', () => {
  it('starts at the coldest stop and ends at the hottest', () => {
    expect(ironbowAt(0)).toEqual(hexToRgb(IRONBOW_STOPS[0]));
    expect(ironbowAt(1)).toEqual(hexToRgb(IRONBOW_STOPS[IRONBOW_STOPS.length - 1]));
  });

  it('gets brighter as it gets hotter, so heat reads as heat', () => {
    const lum = (k: number) => {
      const [r, g, b] = ironbowAt(k);
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };
    for (let k = 0.05; k <= 1; k += 0.05) {
      expect(lum(k), `luminance dipped at k=${k.toFixed(2)}`)
        .toBeGreaterThan(lum(k - 0.05) - 1);
    }
  });

  it('clamps rather than wrapping outside 0..1', () => {
    expect(ironbowAt(-3)).toEqual(ironbowAt(0));
    expect(ironbowAt(9)).toEqual(ironbowAt(1));
  });
});

describe('ΔT maps onto the ramp over the MEASURED range', () => {
  it('puts the coolest measured cell at the cold end', () => {
    expect(normaliseDeltaT(-6.3)).toBeLessThan(0.05);
  });

  it('puts the measured hot band in the hot end, where a thermographer looks', () => {
    expect(normaliseDeltaT(2.8)).toBeGreaterThan(0.9);
  });

  it('keeps the domain honest — it brackets the measurement, it does not invent it', () => {
    expect(DELTA_T_DOMAIN.min).toBeLessThan(-6.3);
    expect(DELTA_T_DOMAIN.max).toBeGreaterThan(2.8);
  });

  it('returns a CSS colour a browser will accept', () => {
    expect(ironbowForDeltaT(2.8)).toMatch(/^rgb\(\d+ \d+ \d+\)$/);
  });
});
