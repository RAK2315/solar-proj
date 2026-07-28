/**
 * scripts/sync_artefacts.mjs — run by `predev` and `prebuild`.
 *
 * Two jobs:
 *   1. Copy the evidence binaries from data/evidence/ (the source of truth) into
 *      public/evidence/ (what the browser can actually fetch).
 *   2. Write data/evidence_manifest.json — which artefacts exist, plus an inlined
 *      copy of the detection JSON when the Colab run has landed.
 *
 * Why a manifest rather than optional imports: artefacts arrive across three
 * different phases, and a bundler cannot import a file that does not exist yet.
 * The manifest is always present, so `src/lib/data.ts` has exactly one import and
 * no try/catch. Absent artefacts are `null`, and plan/04 §4 is explicit that an
 * absent evidence slot renders as ABSENT — never as a placeholder box, and never
 * as a stub file, because a stub in data/evidence/ is fabricated evidence.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'data/evidence';
const PUBLIC = 'public/evidence';
const MANIFEST = 'data/artefacts.json';

/** key → filename in data/evidence/. Keys are what selectors ask for. */
const ARTEFACTS = {
  thermal: 'b17_thermal.png',
  rgb: 'b17_rgb.jpg',
  rgbAnnotated: 'b17_rgb_annotated.jpg',
  audio: 'b17_inverter_audio.wav',
  flyover: 'b17_flyover.mp4',
};

mkdirSync(PUBLIC, { recursive: true });

const files = {};
let copied = 0;
for (const [key, name] of Object.entries(ARTEFACTS)) {
  const from = join(SRC, name);
  if (existsSync(from)) {
    copyFileSync(from, join(PUBLIC, name));
    files[key] = `/evidence/${name}`;
    copied += 1;
  } else {
    files[key] = null;
  }
}

// Artefacts that arrive in LATER phases, inlined so the app has exactly one
// import instead of a conditional one a bundler cannot resolve. Both are null
// until their phase lands, and neither is ever stubbed — a stub file in data/ is
// fabricated evidence, which is the one thing this project cannot afford.
const readIfPresent = (path) =>
  (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null);

const detection = readIfPresent(join(SRC, 'b17_detection.json'));   // Phase 3, Colab
const agent = readIfPresent('data/agent_cache.json');               // Phase 6, Groq

writeFileSync(
  MANIFEST,
  `${JSON.stringify({ files, detection, agent }, null, 2)}\n`,
  'utf8',
);

const missing = Object.entries(files).filter(([, v]) => v === null).map(([k]) => k);
console.log(
  `sync:artefacts — ${copied}/${Object.keys(ARTEFACTS).length} binaries copied to ${PUBLIC}` +
  `${missing.length ? `, absent: ${missing.join(', ')}` : ''}`,
);
console.log(
  `                 detection: ${detection ? `${detection.label} @ ${detection.confidence}` : 'not yet (Phase 3, Colab)'}`,
);
console.log(
  `                 agent cache: ${agent ? agent.meta.model : 'not yet (Phase 6, Groq)'}`,
);
