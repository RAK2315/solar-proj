/**
 * ppt/round-1/crop.mjs: cuts each deck picture out of a raw 1920x1080 capture.
 *
 * A crop and nothing else: no resize, no colour change, no retouching. The
 * rectangles are listed here so content.md can say exactly what was cut away.
 */
//   node ppt/round-1/crop.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW = join(HERE, 'raw');
const OUT = join(HERE, 'images');
mkdirSync(OUT, { recursive: true });

// [output, raw capture, left, top, right, bottom]
const CROPS = [
  ['01-twin-field', 'site-3d', 270, 300, 1500, 870],
  ['03-drone-detection', 'flight-08', 440, 180, 1490, 900],
  ['03-evidence-dossier', 'dossier-top', 785, 143, 1865, 700],
  ['03-thermal-pass', 'flight-11', 440, 250, 1490, 850],
  ['05-sandbox-dust', 'sandbox-dust-dropped', 600, 185, 1905, 1065],
  ['05-queue-day-plan', 'queue-top', 150, 292, 1865, 625],
  ['07-two-futures', 'workflow-futures', 150, 225, 1865, 1010],
  ['07-analytics-outlook', 'analytics-top', 150, 142, 1865, 930],
  ['ref-07-cost-of-waiting', 'incident-top', 1397, 462, 1863, 1040],
  ['ref-07-tariff', 'analytics-tariff', 1024, 432, 1865, 953],
  ['spare-b17-array-panel', 'site-b17-focus', 560, 190, 1905, 1065],
  ['spare-electrical-cutaway', 'workflow-cutaway', 150, 225, 1865, 985],
  ['spare-repair-crew', 'repair-field-2', 110, 120, 1530, 1065],
];

for (const [name, raw, l, t, r, b] of CROPS) {
  await sharp(join(RAW, `${raw}.png`)).extract({ left: l, top: t, width: r - l, height: b - t }).toFile(join(OUT, `${name}.png`));
  console.log(`${name}.png  ${r - l} x ${b - t}  from ${raw}.png`);
}
