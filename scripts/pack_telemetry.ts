/**
 * scripts/pack_telemetry.ts — `npm run pack:telemetry`, run by predev and prebuild.
 *
 * Writes data/telemetry_client.json: the same 91 frames as data/telemetry.json,
 * with the 119 arrays that never change stored once instead of ninety-one times.
 * See src/lib/telemetryPack.ts for why that file exists at all.
 *
 * THE ONLY THING THAT MAKES THIS SAFE is the round trip below. A build step that
 * rewrites the data every number on screen is checked against is exactly the kind
 * of thing that quietly becomes a second source of truth. So this packs, unpacks
 * with the function the APPLICATION uses, re-serialises, and refuses to write
 * unless the bytes match the original exactly. Not "equivalent" — identical.
 *
 * telemetry.json stays the source of truth. validate_data.ts still reads it, and
 * every invariant is still asserted against it. This file is a shipping format.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { unpackTelemetry, type PackedFrame, type PackedTelemetry } from '../src/lib/telemetryPack';
import type { PanelReading, TelemetryFrame } from '../src/lib/types';

const SOURCE = 'data/telemetry.json';
const OUT = 'data/telemetry_client.json';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

const raw = readFileSync(SOURCE, 'utf8');
const frames = JSON.parse(raw) as TelemetryFrame[];

if (!frames.length) {
  console.error(`${RED}pack:telemetry${OFF}  ${SOURCE} is empty.`);
  process.exit(1);
}

const base = frames[0].panels as Record<string, PanelReading>;
const baseJson = new Map(
  Object.entries(base).map(([id, reading]) => [id, JSON.stringify(reading)]),
);

/**
 * A frame's panel entries that differ from the base, in the base's own key order.
 *
 * Order matters: `{ ...base, ...delta }` puts a delta key back where the base had
 * it, so the reconstructed frame re-serialises to the original bytes. Iterating
 * the base rather than the frame is what guarantees that.
 */
function deltaFor(frame: TelemetryFrame): Record<string, PanelReading> {
  const panels = frame.panels as Record<string, PanelReading>;
  const delta: Record<string, PanelReading> = {};
  for (const [id, reading] of Object.entries(panels)) {
    if (JSON.stringify(reading) !== baseJson.get(id)) delta[id] = reading;
  }
  return delta;
}

const packed: PackedTelemetry = {
  base,
  frames: frames.map((frame): PackedFrame => ({ ...frame, panels: deltaFor(frame) })),
};

// The round trip. Nothing is written unless this holds.
const rebuilt = JSON.stringify(unpackTelemetry(packed));
if (rebuilt !== JSON.stringify(frames)) {
  console.error(`${RED}pack:telemetry FAILED${OFF}  the packed form does not rebuild ${SOURCE}.`);
  console.error(`  Nothing was written. ${OUT} is unchanged, so the build still ships`);
  console.error(`  the data every invariant was checked against.`);
  process.exit(1);
}

const out = JSON.stringify(packed);
writeFileSync(OUT, out);

const changed = new Set(packed.frames.flatMap((f) => Object.keys(f.panels)));
const pct = ((out.length / raw.length) * 100).toFixed(1);

console.log(`\n${BOLD}pack:telemetry${OFF} — the demo telemetry, small enough to ship\n`);
console.log(`  frames                     ${BOLD}${frames.length}${OFF}`);
console.log(`  arrays                     ${BOLD}${Object.keys(base).length}${OFF}`);
console.log(`  arrays that ever change    ${BOLD}${changed.size}${OFF}  ${DIM}${[...changed].join(', ') || '(none)'}${OFF}`);
console.log(`  ${SOURCE}      ${BOLD}${(raw.length / 1024).toFixed(0)} kB${OFF}`);
console.log(`  ${OUT}  ${BOLD}${(out.length / 1024).toFixed(0)} kB${OFF}  ${DIM}${pct}% of the original${OFF}`);
console.log(`\n${GREEN}${BOLD}round trip exact.${OFF} ${DIM}unpacking reproduces ${SOURCE} byte for byte.${OFF}\n`);
