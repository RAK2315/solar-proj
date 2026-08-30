/**
 * The packed telemetry is the same site as the committed telemetry.
 *
 * `data/telemetry_client.json` is what the browser gets; `data/telemetry.json` is
 * what every invariant in validate_data.ts is asserted against. If those two ever
 * describe different sites, the build would be checking one thing and shipping
 * another — and the check would still pass, because it never reads the shipped
 * file. That is the failure this test exists to make impossible.
 *
 * It reads the raw JSON off disk rather than going through `lib/data`, so it is
 * comparing the two committed artefacts and not a value against itself.
 */

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { unpackTelemetry, type PackedTelemetry } from './telemetryPack';
import type { TelemetryFrame } from './types';

const source = JSON.parse(readFileSync('data/telemetry.json', 'utf8')) as TelemetryFrame[];
const packed = JSON.parse(readFileSync('data/telemetry_client.json', 'utf8')) as PackedTelemetry;

describe('packed telemetry', () => {
  it('rebuilds the committed telemetry byte for byte', () => {
    // Serialised, not deep-equal: key ORDER has to survive too, because that is
    // what lets the packer prove its round trip against the original bytes.
    expect(JSON.stringify(unpackTelemetry(packed))).toBe(JSON.stringify(source));
  });

  it('is small enough that the dev server cannot truncate it', () => {
    // The 1.6 MB original arrived as one JSON.parse line in the layout chunk and
    // was cut in half on roughly half of all page loads. 200 kB is a generous
    // ceiling; the packed file is around 52 kB.
    const bytes = readFileSync('data/telemetry_client.json').byteLength;
    expect(bytes).toBeLessThan(200_000);
  });

  it('stores the arrays that never change exactly once', () => {
    // The whole saving rests on this: the demo is one incident on one array. If a
    // future scenario moves more arrays the file grows, and the size test above
    // is what would notice.
    const moved = new Set(packed.frames.flatMap((f) => Object.keys(f.panels)));
    expect(moved.size).toBeLessThanOrEqual(3);
    expect([...moved]).toContain('B-17');
  });
});
