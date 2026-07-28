/**
 * ⚠️ HISTORICAL — SUPERSEDED AT PHASE 0. Do not edit, do not import.
 *    The live file is `src/lib/types.ts`. It differs deliberately:
 *      · I10 rebuilt on the MEASURED thermal band (2,3)(2,4)(2,5)(2,6) @ ΔT ≈ +2.8 °C
 *        plus a magnitude guard — not the invented (2,5)(2,6)(4,5)(4,6) @ +8/+6/+5 below
 *      · I4 asserts −41.71 ±0.05, not −41.8 ±0.1 (the exact chain gives −41.714)
 *      · DemoEvent.logLine and CellGrid's provenance fields added
 *    Rationale: docs/contract-freeze.md
 *
 * plan/schemas.ts — runnable companion to plan/03-data-model.md
 *
 * Copy this to `src/lib/types.ts` at the start of the build. It is written to be
 * the real file, not pseudocode.
 *
 * ONE definition per shape: Zod schemas are the source of truth, TypeScript types
 * are inferred from them via z.infer. Never hand-write a type that mirrors a schema.
 *
 * Used by:
 *   - src/store/selectors.ts   (types only)
 *   - scripts/validate_data.ts (parsing + assertInvariants)  → `npm run validate:data`
 *
 * Keep in sync with plan/03-data-model.md, or delete that doc and let this be truth.
 */

import { z } from 'zod';

/* ────────────────────────────────────────────────────────────────────────────
 * Enums — the complete legal sets. Nothing outside these values is valid.
 * ──────────────────────────────────────────────────────────────────────────── */

export const Severity = z.enum(['info', 'active', 'warning', 'critical']);
export const PanelStatus = z.enum(['healthy', 'warning', 'critical', 'scheduled']);
export const ZoneId = z.enum(['A', 'B', 'C']);
export const DefectType = z.enum(['dead', 'crack', 'hotspot', 'soiling']);
export const RiskLevel = z.enum(['low', 'medium', 'high']);
/** Triage classifies an observation (can be critical); prognosis classifies a
 *  projection (tops out at high). Deliberately different sets — do not unify. */
export const TriageSeverity = z.enum(['low', 'medium', 'high', 'critical']);
export const DroneStatus = z.enum(['STANDBY', 'ACTIVE', 'RETURNING']);
export const DemoView = z.enum(['console', 'cinematic']);
export const AgentStage = z.enum(['triage', 'prognosis', 'recommendation']);
export const DetectionClass = z.enum(['crack', 'soiling', 'delamination', 'hotspot']);
export const EventSource = z.enum([
  'SYSTEM', 'PANEL B-17', 'DRONE 01', 'DRONE 02',
  'SURFACE SCAN', 'THERMAL SCAN', 'INSPECTION QUEUE',
]);

/* ────────────────────────────────────────────────────────────────────────────
 * farm.json — static site geometry
 * ──────────────────────────────────────────────────────────────────────────── */

export const PanelArray = z.object({
  id: z.string().regex(/^[ABC]-\d{2}$/),   // "B-17"
  zone: ZoneId,
  row: z.number().int().nonnegative(),
  col: z.number().int().nonnegative(),
  inverterId: z.string(),                   // "INV-B"
  ratedKW: z.number().positive(),           // array nameplate (8 strings worth)
  stringsPerArray: z.number().int().positive(),   // 7 — see 03 §4 resolution (a)
  moduleCount: z.number().int().positive(),
  cellRows: z.number().int().positive(),    // 5 — drives the anomaly matrix
  cellCols: z.number().int().positive(),    // 7
  installDate: z.string(),                  // ISO date
  lastServiced: z.string(),                 // ISO date
});

export const Zone = z.object({
  id: ZoneId,
  label: z.string(),
  health: z.number().min(0).max(100),
  rows: z.number().int().positive(),
  cols: z.number().int().positive(),
  originX: z.number(),                      // SVG layout coords
  originY: z.number(),
  panels: z.array(PanelArray),
});

export const Inverter = z.object({
  id: z.string(),                           // "INV-A"
  zone: ZoneId,
  ratedKW: z.number().positive(),
  efficiency: z.number().min(0).max(1),     // 0.98
});

export const DronePad = z.object({
  id: z.string(),                           // "PAD-01"
  x: z.number(),
  y: z.number(),
});

export const Farm = z.object({
  id: z.string(),
  name: z.literal('Bhadla Solar Park'),
  region: z.literal('Rajasthan, India'),
  lat: z.number(),                          // 27.540 — verified, see 00 C4
  lon: z.number(),                          // 71.915
  azimuth: z.number(),                      // 180
  tilt: z.number(),                         // 25
  capacityMW: z.number().positive(),        // 500 (a block of Bhadla's 2,245 MW)
  zones: z.array(Zone).length(3),
  inverters: z.array(Inverter).length(3),
  dronePads: z.array(DronePad).length(2),
});

/* ────────────────────────────────────────────────────────────────────────────
 * telemetry.json — one frame per demo second
 * ──────────────────────────────────────────────────────────────────────────── */

export const InverterReading = z.object({
  actualKW: z.number(),
  expectedKW: z.number(),
  deviationPct: z.number(),                 // negative = shortfall
});

export const PanelReading = z.object({
  actualKW: z.number(),
  expectedKW: z.number(),
  deviationPct: z.number(),                 // ARRAY-level deviation (-41.8 for B-17)
  stringDeviationPct: z.number().optional(), // STRING-level (-58.4). Present on B-17 only.
  cellTempC: z.number(),
  status: PanelStatus,
});

export const TelemetryFrame = z.object({
  t: z.number().min(0).max(90),
  timestamp: z.string(),                    // "09:47" — display only
  ambientC: z.number(),
  irradiance: z.number(),                   // W/m²
  windMs: z.number(),
  cloudPct: z.number().min(0).max(100),
  farmOutputMW: z.number(),
  farmHealth: z.number().min(0).max(100),
  inverters: z.record(z.string(), InverterReading),
  panels: z.record(z.string(), PanelReading),
});

export const Telemetry = z.array(TelemetryFrame).length(91);   // I1

/* ────────────────────────────────────────────────────────────────────────────
 * events.json
 * ──────────────────────────────────────────────────────────────────────────── */

export const DemoEvent = z.object({
  id: z.string(),
  t: z.number().min(0).max(90),
  timestamp: z.string(),                    // "09:48"
  source: EventSource,
  severity: Severity,
  title: z.string(),
  body: z.string(),
  expandable: z.boolean(),
  linkedPanelId: z.string().optional(),
});

export const Events = z.array(DemoEvent);

/* ────────────────────────────────────────────────────────────────────────────
 * forecast.json
 * ──────────────────────────────────────────────────────────────────────────── */

export const ForecastPoint = z.object({
  hourOffset: z.number().int().min(0).max(72),
  ambientC: z.number(),
  irradiance: z.number(),
  cloudPct: z.number().min(0).max(100),
});

export const Forecast = z.object({
  points: z.array(ForecastPoint).length(73),      // I2
  peakAmbientC: z.number(),                        // 38.1
  clearHours: z.number(),                          // 72
  summary: z.string(),                             // "72H CLEAR — DELAY IS COSTLY"
  projected72hLossMWh: z.number(),                 // 1.44 — integrated, not typed
  actBefore: z.string().regex(/^\d{2}:\d{2}$/),    // "14:00" — computed crossing
});

/* ────────────────────────────────────────────────────────────────────────────
 * evidence
 * ──────────────────────────────────────────────────────────────────────────── */

export const CellDefect = z.object({
  row: z.number().int().min(1),             // 1-indexed to match R1..R5 labels
  col: z.number().int().min(1),
  type: DefectType,
  deltaTC: z.number(),
});

export const CellGrid = z.object({
  panelId: z.literal('B-17'),
  rows: z.literal(5),
  cols: z.literal(7),
  baselineTempC: z.number(),
  defects: z.array(CellDefect),
  matrix: z.array(z.array(z.number())),     // [5][7] of ΔT — drives AnomalyMatrix
  clusters: z.number().int().nonnegative(),
});

export const Detection = z.object({
  label: DetectionClass,
  confidence: z.number().gt(0).lte(1),      // WHATEVER THE MODEL RETURNED
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),  // normalised xywh
  model: z.string(),                        // "yolov8n-solar-defect"
  mAP50: z.number().gt(0).lte(1),           // the REAL training metric
});

/* ────────────────────────────────────────────────────────────────────────────
 * agent_cache.json — prose only; every number is cross-checked against telemetry
 * ──────────────────────────────────────────────────────────────────────────── */

export const TriageOutput = z.object({
  severity: TriageSeverity,
  suspectComponent: z.string(),                    // "INV-B"
  reasoning: z.string(),                           // 2-3 sentences, operator-facing
  requiresPhysicalVerification: z.literal(true),   // I12 — load-bearing, enforced by type
  verificationRationale: z.string(),
  confidence: z.number().min(0).max(1),
});

export const PrognosisOutput = z.object({
  degradationMechanism: z.string(),
  projected72hLossMWh: z.number(),
  riskLevel: RiskLevel,
  actBefore: z.string().regex(/^\d{2}:\d{2}$/),
  reasoning: z.string(),                           // 3-4 sentences
  confidence: z.number().min(0).max(1),
});

export const RecommendationOutput = z.object({
  primaryAction: z.string(),
  steps: z.array(z.string()).min(2).max(4),
  costOfDelayNote: z.string(),
  workOrderRef: z.literal('INC-B17'),
});

export const AgentCache = z.object({
  triage: TriageOutput,
  prognosis: PrognosisOutput,
  recommendation: RecommendationOutput,
  meta: z.object({
    model: z.string(),                             // "openai/gpt-oss-120b" — rendered on screen
    provider: z.literal('groq'),
    generatedAt: z.string(),
    promptVersion: z.string(),
  }),
});

/* ────────────────────────────────────────────────────────────────────────────
 * repair_queue.json — ranking happens in TS, never here and never in the LLM
 * ──────────────────────────────────────────────────────────────────────────── */

export const RepairTask = z.object({
  id: z.string(),                           // "INC-B17"
  panelId: z.string(),
  lossMWhPerDay: z.number().nonnegative(),
  severity: Severity,
  hoursUntilDeadline: z.number().positive(),
  accessCost: z.number().positive(),        // 1.0 normal, higher = harder to reach
});

export const RepairQueue = z.array(RepairTask).length(4);

/* ────────────────────────────────────────────────────────────────────────────
 * Inferred TypeScript types — never hand-write these
 * ──────────────────────────────────────────────────────────────────────────── */

export type Severity = z.infer<typeof Severity>;
export type PanelStatus = z.infer<typeof PanelStatus>;
export type ZoneId = z.infer<typeof ZoneId>;
export type DefectType = z.infer<typeof DefectType>;
export type RiskLevel = z.infer<typeof RiskLevel>;
export type DroneStatus = z.infer<typeof DroneStatus>;
export type DemoView = z.infer<typeof DemoView>;
export type AgentStage = z.infer<typeof AgentStage>;
export type Farm = z.infer<typeof Farm>;
export type Zone = z.infer<typeof Zone>;
export type PanelArray = z.infer<typeof PanelArray>;
export type Inverter = z.infer<typeof Inverter>;
export type DronePad = z.infer<typeof DronePad>;
export type TelemetryFrame = z.infer<typeof TelemetryFrame>;
export type InverterReading = z.infer<typeof InverterReading>;
export type PanelReading = z.infer<typeof PanelReading>;
export type DemoEvent = z.infer<typeof DemoEvent>;
export type ForecastPoint = z.infer<typeof ForecastPoint>;
export type Forecast = z.infer<typeof Forecast>;
export type CellDefect = z.infer<typeof CellDefect>;
export type CellGrid = z.infer<typeof CellGrid>;
export type Detection = z.infer<typeof Detection>;
export type TriageOutput = z.infer<typeof TriageOutput>;
export type PrognosisOutput = z.infer<typeof PrognosisOutput>;
export type RecommendationOutput = z.infer<typeof RecommendationOutput>;
export type AgentCache = z.infer<typeof AgentCache>;
export type RepairTask = z.infer<typeof RepairTask>;

/* ────────────────────────────────────────────────────────────────────────────
 * Invariants I1–I16 — see plan/03-data-model.md §5
 *
 * These are what stop slow drift over a long solo build. Run in `prebuild`.
 * ──────────────────────────────────────────────────────────────────────────── */

/** The frame the demo's headline numbers are read from (post-fault, pre-approval). */
export const DEMO_FRAME_T = 12;

const near = (actual: number, expected: number, tol: number, label: string) => {
  if (Math.abs(actual - expected) > tol) {
    throw new Error(
      `INVARIANT FAILED — ${label}: expected ${expected} ±${tol}, got ${actual}. ` +
      `Either the generator changed or a constant drifted. Fix the generator, not this file.`,
    );
  }
};

export function assertInvariants(d: {
  farm: Farm;
  telemetry: TelemetryFrame[];
  events: DemoEvent[];
  forecast: Forecast;
  agent: AgentCache;
  cellgrid: CellGrid;
  detection: Detection;
  queue: RepairTask[];
}): void {
  const f = d.telemetry.find((x) => x.t === DEMO_FRAME_T);
  if (!f) throw new Error(`INVARIANT FAILED — I1: no telemetry frame at t=${DEMO_FRAME_T}`);

  // I1 — frame count and monotonicity
  if (d.telemetry.length !== 91) throw new Error(`I1: expected 91 frames, got ${d.telemetry.length}`);
  d.telemetry.forEach((fr, i) => {
    if (fr.t !== i) throw new Error(`I1: frame ${i} has t=${fr.t}; must be 0..90 in order`);
  });

  // I2 — forecast length (also enforced by the schema)
  if (d.forecast.points.length !== 73) throw new Error(`I2: expected 73 forecast points`);

  // I3/I4/I5 — the deviations, each bound to exactly one object (see 03 §4)
  near(f.inverters['INV-B'].deviationPct, -58.4, 0.05, 'I3 INV-B string deviation');
  near(f.panels['B-17'].deviationPct, -41.8, 0.1, 'I4 B-17 array deviation');
  near(f.inverters['INV-A'].deviationPct, 0.0, 0.01, 'I5 INV-A deviation');
  near(f.inverters['INV-C'].deviationPct, 0.0, 0.01, 'I5 INV-C deviation');

  // I6 — farm output at demo conditions (C2: 364, not 412)
  near(f.farmOutputMW, 364, 1.0, 'I6 farm output MW');

  // I7/I8/I9 — forecast-derived figures
  near(d.forecast.projected72hLossMWh, 1.44, 0.05, 'I7 projected 72h loss MWh');
  near(d.forecast.peakAmbientC, 38.1, 0.05, 'I8 peak ambient C');
  if (d.forecast.actBefore !== '14:00') throw new Error(`I9: actBefore = ${d.forecast.actBefore}`);
  if (d.agent.prognosis.actBefore !== d.forecast.actBefore) {
    throw new Error(`I9: agent actBefore (${d.agent.prognosis.actBefore}) disagrees with forecast`);
  }

  // I10 — the cell grid is a real 5×7 with the four known defects
  if (d.cellgrid.matrix.length !== 5 || d.cellgrid.matrix.some((r) => r.length !== 7)) {
    throw new Error('I10: cellgrid.matrix must be 5×7');
  }
  const expectedCells = [[2, 5], [2, 6], [4, 5], [4, 6]];
  if (d.cellgrid.defects.length !== 4) throw new Error(`I10: expected 4 defects`);
  expectedCells.forEach(([r, c]) => {
    if (!d.cellgrid.defects.some((x) => x.row === r && x.col === c)) {
      throw new Error(`I10: missing defect at (${r},${c})`);
    }
  });

  // I11 — the tripwire against yourself. 0.84 is the spec's placeholder, not a result.
  if (d.detection.confidence === 0.84) {
    throw new Error(
      'I11: detection.confidence is exactly 0.84 — the placeholder from CLAUDE.md §2. ' +
      'If the model genuinely returned 0.84, delete this check and note it in the README. ' +
      'Otherwise you are about to show a number you did not measure.',
    );
  }

  // I12 — the load-bearing claim: telemetry alone cannot diagnose, so the drone must fly
  if (d.agent.triage.requiresPhysicalVerification !== true) {
    throw new Error('I12: triage must justify the drone dispatch');
  }

  // I13 — deterministic ranking puts B-17 first, by a visible margin
  const ranked = rankQueue(d.queue);
  if (ranked[0].id !== 'INC-B17') throw new Error(`I13: queue #1 is ${ranked[0].id}, not INC-B17`);
  const margin = priorityScore(ranked[0]) / priorityScore(ranked[1]);
  if (margin < 1.5) throw new Error(`I13: B-17 leads by only ${margin.toFixed(2)}×; need ≥1.5×`);

  // I14 — events are in range and reference real panels
  const panelIds = new Set(d.farm.zones.flatMap((z) => z.panels.map((p) => p.id)));
  d.events.forEach((e) => {
    if (e.t < 0 || e.t > 90) throw new Error(`I14: event ${e.id} has t=${e.t}`);
    if (e.linkedPanelId && !panelIds.has(e.linkedPanelId)) {
      throw new Error(`I14: event ${e.id} links unknown panel ${e.linkedPanelId}`);
    }
  });

  // I16 — health is continuous; the fault ramps rather than jumping
  for (let i = 1; i < d.telemetry.length; i++) {
    const jump = Math.abs(d.telemetry[i].farmHealth - d.telemetry[i - 1].farmHealth);
    if (jump > 6) throw new Error(`I16: farmHealth jumps ${jump.toFixed(1)} at t=${i}`);
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Deterministic ranking — src/lib/ranking.ts
 *
 * Never LLM-decided. This is the function you show a judge who asks
 * "how does it prioritise?" — which is worth more than any LLM output here.
 * Pure, no I/O, unit-testable.
 * ──────────────────────────────────────────────────────────────────────────── */

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 3.0,
  warning: 1.5,
  active: 1.0,
  info: 0.25,
};

export function priorityScore(task: RepairTask): number {
  // Urgency grows hyperbolically as the deadline closes: a 4-hour deadline is
  // worth 7× a 24-hour one, not 6× linearly. That shape is why B-17 dominates.
  const urgency = 1 + 24 / Math.max(1, task.hoursUntilDeadline);
  return (task.lossMWhPerDay * SEVERITY_WEIGHT[task.severity] * urgency) / task.accessCost;
}

export function rankQueue(tasks: RepairTask[]): RepairTask[] {
  return [...tasks].sort((a, b) => priorityScore(b) - priorityScore(a));
}
