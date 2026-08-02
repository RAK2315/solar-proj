/**
 * scripts/validate_data.ts — THE BUILD GATE.  `npm run validate:data`
 *
 * Parses every committed JSON against the Zod schemas in src/lib/types.ts, then runs
 * assertInvariants (I1–I16). Wired into `prebuild`, so a number cannot drift into a
 * deployment: it fails the build, not the demo.
 *
 * Files that later phases produce (agent_cache.json, b17_detection.json) are reported
 * as SKIPPED when absent. Anything present but wrong is a hard failure — being early
 * in the build is an excuse for a missing file, never for a wrong one.
 */

import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';

import {
  AgentCache, CellGrid, DEMO_FRAME_T, Detection, Events, Farm, Forecast,
  RepairQueue, Telemetry, assertInvariants, priorityScore, rankQueue,
} from '../src/lib/types';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

function read<T extends z.ZodTypeAny>(path: string, schema: T, label: string): z.infer<T> {
  if (!existsSync(path)) {
    console.error(`${RED}MISSING${OFF}  ${path} — ${label}`);
    console.error(`         Run the generator that produces it, then try again.`);
    process.exit(1);
  }
  const parsed = schema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (!parsed.success) {
    console.error(`${RED}SCHEMA FAILED${OFF}  ${path} — ${label}`);
    for (const issue of parsed.error.issues) {
      console.error(`  ${RED}·${OFF} ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    process.exit(1);
  }
  console.log(`${GREEN}ok${OFF}  ${path.padEnd(36)} ${DIM}${label}${OFF}`);
  return parsed.data;
}

function readOptional<T extends z.ZodTypeAny>(
  path: string, schema: T, label: string, phase: string,
): z.infer<T> | null {
  if (!existsSync(path)) {
    console.log(`${DIM}--  ${path.padEnd(36)} not yet produced (${phase})${OFF}`);
    return null;
  }
  return read(path, schema, label);
}

// Binary artefacts are not schema-validated, but their absence must be visible.
const BINARY_EVIDENCE: Array<[string, string]> = [
  ['data/evidence/b17_thermal.png', 'ironbow thermal render'],
  ['data/evidence/b17_rgb.jpg', 'RGB evidence frame (Phase 3, Colab)'],
  ['data/evidence/b17_rgb_annotated.jpg', 'annotated detection (Phase 3, Colab)'],
  ['models/defect_yolov8n.pt', 'trained weights — provenance (Phase 3, Colab)'],
  ['docs/training/results.csv', 'training log (Phase 3, Colab)'],
  ['docs/training/training_curves.png', 'training curves (Phase 3, Colab)'],
  ['data/evidence/b17_inverter_audio.wav', 'inverter acoustic clip (Phase 7)'],
  ['data/evidence/b17_flyover.mp4', 'drone flyover clip (Phase 7)'],
];

function main(): void {
  console.log(`${BOLD}validate:data${OFF} — schemas\n`);

  const farm = read('data/farm.json', Farm, '1 farm, 3 zones, 120 arrays');
  const telemetry = read('data/telemetry.json', Telemetry, '91 frames, t = 0..90');
  const events = read('data/events.json', Events, 'scripted event feed');
  const forecast = read('data/forecast.json', Forecast, '73 points, 72 h');
  const cellgrid = read('data/evidence/b17_cellgrid.json', CellGrid, '5×7 measured ΔT');
  const queue = read('data/repair_queue.json', RepairQueue, '4 unranked tasks');
  const agent = readOptional('data/agent_cache.json', AgentCache,
    '3 cached reasoning stages', 'Phase 6');
  const detection = readOptional('data/evidence/b17_detection.json', Detection,
    'real model output', 'Phase 3, Colab');

  console.log(`\n${BOLD}binary evidence${OFF}`);
  for (const [path, label] of BINARY_EVIDENCE) {
    const mark = existsSync(path) ? `${GREEN}ok${OFF}` : `${DIM}--${OFF}`;
    console.log(`${mark}  ${path.padEnd(36)} ${DIM}${label}${OFF}`);
  }

  console.log(`\n${BOLD}invariants${OFF} — I1..I16, read at t = ${DEMO_FRAME_T}\n`);
  let result;
  try {
    result = assertInvariants({
      farm, telemetry, events, forecast, cellgrid, queue, agent, detection,
    });
  } catch (err) {
    console.error(`${RED}${BOLD}INVARIANT FAILED${OFF}`);
    console.error(`${RED}${(err as Error).message}${OFF}`);
    console.error(
      `\n${DIM}Fix the generator in scripts/, not the invariant. If the invariant is` +
      ` genuinely\nwrong, change it in src/lib/types.ts AND record why in` +
      ` docs/contract-freeze.md.${OFF}`,
    );
    process.exit(1);
  }

  const frame = telemetry[DEMO_FRAME_T];
  const b17 = frame.panels['B-17'];
  const ranked = rankQueue(queue);

  console.log(`${GREEN}PASS${OFF}  ${result.checked.join(' ')}`);
  for (const s of result.skipped) console.log(`${DIM}skip  ${s}${OFF}`);

  console.log(`\n${BOLD}headline figures, as generated${OFF}`);
  const rows: Array<[string, string]> = [
    ['string B-17-S3 deviation', `${b17.stringDeviationPct?.toFixed(2)} %`],
    ['array B-17 deviation', `${b17.deviationPct.toFixed(2)} %`],
    ['INV-B actual / expected', `${frame.inverters['INV-B'].actualKW.toFixed(2)} / ` +
      `${frame.inverters['INV-B'].expectedKW.toFixed(2)} kW`],
    ['farm output', `${frame.farmOutputMW.toFixed(2)} MW`],
    ['farm health (t=0 → t=12)', `${telemetry[0].farmHealth} → ${frame.farmHealth}`],
    ['B-17 cell temperature', `${b17.cellTempC.toFixed(2)} °C`],
    ['cell-grid baseline', `${cellgrid.baselineTempC.toFixed(1)} °C`],
    ['hot cells', cellgrid.defects
      .map((x) => `(${x.row},${x.col})`).sort().join(' ') +
      `  ΔT ≤ +${Math.max(...cellgrid.defects.map((x) => x.deltaTC)).toFixed(1)} °C, ` +
      `${cellgrid.clusters} cluster`],
    ['peak ambient (72 h)', `${forecast.peakAmbientC.toFixed(1)} °C`],
    ['projected 72 h loss', `${forecast.projected72hLossMWh.toFixed(2)} MWh`],
    ['act before', forecast.actBefore],
    ['queue #1', `${ranked[0].id} — ` +
      `${(priorityScore(ranked[0]) / priorityScore(ranked[1])).toFixed(1)}× over ` +
      `${ranked[1].id}`],
  ];
  for (const [label, value] of rows) {
    console.log(`  ${label.padEnd(26)} ${BOLD}${value}${OFF}`);
  }

  // The vision numbers get their own block: they are the ones most easily
  // misreported, so print exactly what is committed and nothing rounder.
  if (detection) {
    console.log(`\n${BOLD}vision, as the model returned it${OFF}`);
    console.log(`  ${'detection'.padEnd(26)} ${BOLD}${detection.label} ` +
      `@ ${detection.confidence}${OFF}  ${DIM}on ${detection.sourceImage} ` +
      `(${detection.split})${OFF}`);
    // "five-class" was written before the run and was wrong: the mean covers only
    // the classes with instances in the eval split, so it is a FOUR-class mean here.
    // The count comes from the data rather than from the sentence.
    const evaluated = Object.keys(detection.apPerClass).length;
    console.log(`  ${`mAP@50, ${evaluated}-class mean`.padEnd(26)} ${BOLD}${detection.mAP50}${OFF}` +
      `  ${DIM}classes with instances in ${detection.split}${OFF}`);
    for (const [cls, ap] of Object.entries(detection.apPerClass)) {
      const star = cls === 'Cracked' ? `  ${DIM}<- the only one on screen${OFF}` : '';
      console.log(`  ${`  AP@50 ${cls}`.padEnd(26)} ${ap}${star}`);
    }
    const undef = ['BakimGereken', 'Cracked', 'Dirty', 'Good', 'Saglam']
      .filter((c) => detection.apPerClass[c] === undefined);
    if (undef.length) {
      console.log(`  ${DIM}no test instances, AP undefined (not zero): ${undef.join(', ')}${OFF}`);
    }
  }

  console.log(`\n${GREEN}${BOLD}data is consistent.${OFF}`);
}

main();
