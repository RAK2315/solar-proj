/**
 * src/lib/telemetryPack.ts — the demo telemetry, small enough to ship.
 *
 * THE BUG THIS FIXES. `data/telemetry.json` is 1.09 MB of panel readings and all
 * of it was reaching the browser, as a single `JSON.parse('…')` line inside the
 * layout chunk. The dev server truncated that line on roughly one load in two;
 * the browser threw a SyntaxError, hydration never ran, and THE PAGE STILL LOOKED
 * COMPLETELY CORRECT because the server-rendered markup was all there. Nothing
 * responded to a click. That is the worst possible failure to have in front of an
 * audience, because it does not look like a failure.
 *
 * WHY IT COMPRESSES TO NOTHING. The demo is one incident on one array. Across all
 * 91 frames exactly ONE of the 120 arrays ever changes — B-17, the one the script
 * is about. The other 119 are byte-identical in every frame, repeated 91 times.
 *
 * So the packed form is a base map of all 120 readings plus, per frame, only the
 * entries that differ from it. Same data, ~1% of the bytes.
 *
 * LOSSLESS, AND PROVEN SO. This is a build-time transform of committed data, not a
 * summary of it: `scripts/pack_telemetry.ts` packs, unpacks with the function
 * below, and refuses to write unless the result is byte-identical to the original.
 * `telemetryPack.test.ts` asserts the same thing against the committed pair. If
 * the two ever disagree the build fails — the packed file cannot quietly drift
 * into being a different site from the one every invariant was checked against.
 */

import type { PanelReading, TelemetryFrame } from './types';

/** A frame with its panel readings reduced to the ones that differ from `base`. */
export type PackedFrame = Omit<TelemetryFrame, 'panels'> & {
  /** Only the arrays whose reading differs from `base` at this frame. */
  panels: Record<string, PanelReading>;
};

export interface PackedTelemetry {
  /** Every array's reading at frame 0 — the site as it stands before the fault. */
  base: Record<string, PanelReading>;
  frames: PackedFrame[];
}

/**
 * Rebuild the full 91 frames.
 *
 * Unchanged arrays SHARE the base object rather than being copied per frame. The
 * readings are read-only everywhere in this app, so 91 references to one object
 * is the same data as 91 copies of it, and it keeps the reconstruction free.
 *
 * Key order is preserved: spreading `delta` over `base` leaves a key that already
 * exists in `base` where it was, so a re-serialised frame is byte-identical to the
 * committed one. The round-trip check in the packer depends on that.
 */
export function unpackTelemetry(packed: PackedTelemetry): TelemetryFrame[] {
  return packed.frames.map((frame) => ({
    ...frame,
    panels: { ...packed.base, ...frame.panels },
  }));
}
