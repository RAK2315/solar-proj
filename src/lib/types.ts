/**
 * src/lib/types.ts — the single schema owner.
 *
 * Copied from `plan/schemas.ts` at Phase 0 (contract freeze). That file is now
 * historical; THIS file is the source of truth. Do not edit `plan/schemas.ts`.
 *
 * ONE definition per shape: Zod schemas are the source of truth, TypeScript types
 * are inferred from them via z.infer. Never hand-write a type that mirrors a schema.
 *
 * Used by:
 *   - src/store/selectors.ts   (types only)
 *   - scripts/validate_data.ts (parsing + assertInvariants)  → `npm run validate:data`
 *
 * ─── CHANGED FROM plan/schemas.ts AT PHASE 0 ─────────────────────────────────
 *
 * I10 — rebuilt on the MEASURED thermal result, not the spec's invented story.
 *   plan/schemas.ts asserted 4 defects at (2,5)(2,6)(4,5)(4,6) with ΔT +8/+6/+5,
 *   from CLAUDE.md §8. `scripts/thermal_hotspot.py` measured a real Raptor Maps
 *   UAV thermal image and found a CONTIGUOUS BAND in row 2 — (2,3)(2,4)(2,5)(2,6),
 *   ONE connected cluster, ΔT ≈ +2.8 °C cell-mean.
 *   The measurement leads and the story follows. A contiguous row is also the
 *   truer bypass-diode signature: substrings are wired in rows, so a bypassed
 *   substring heats as a band, not as two disconnected pairs.
 *   Rationale in full: docs/dataset-provenance.md §"Measured result".
 *
 * I10 also gained a MAGNITUDE GUARD. The single easiest way to lie here is to
 *   raise THERMAL_SPAN_C until ΔT reads +8 °C to match the spec. The guard makes
 *   that fail loudly, exactly as I11 does for detection confidence.
 *
 * I4 — array deviation is −41.7%, not −41.8%.
 *   The chain is exact: deviation = f_mismatch − 1 (every other term cancels), so
 *   dev_string = −58.40% and dev_array = −58.40 × 5/7 = −41.714%.
 *   plan/03 §4 quoted −58.45 → −41.75 → "−41.8". Recomputed: −41.7.
 *
 * DemoEvent gained `logLine` — the cinematic mission-log caption. One t-ordered
 *   script feeds both the console feed and the log; see the field comment.
 *
 * CellGrid gained its provenance fields (sourceImage, sourceDataset, anomalyClass,
 *   sigma, thermalSpanC) as REQUIRED. thermal_hotspot.py already writes them, and
 *   a cell grid you cannot trace to a source frame is decoration.
 *
 * Full record of every Phase 0 decision: docs/contract-freeze.md
 *   ────────────────────────────────────────────────────────────────────────────
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
/**
 * The detector's classes, VERBATIM as the dataset ships them — including the two
 * Turkish labels (`BakimGereken` = "maintenance required", `Saglam` = "intact").
 *
 * CLAUDE.md §11 proposed `['crack','soiling','delamination','hotspot']`. Those are
 * names for a model that does not exist. Renaming a trained model's classes to
 * something tidier is the same category of lie as rounding up a metric, so the real
 * ones stay and only `Cracked` ever reaches the screen.
 *
 * Source: dataset/rgb-solar-panel-fault-v2/data.yaml (nc: 5), counted in
 * docs/dataset-provenance.md. `Cracked` is class index 1.
 */
export const DetectionClass = z.enum([
  'BakimGereken', 'Cracked', 'Dirty', 'Good', 'Saglam',
]);

/** The one class the demo actually shows. */
export const ON_SCREEN_DETECTION_CLASS = 'Cracked';
/**
 * Who reported an event.
 *
 * This used to be a closed enum containing the literal `PANEL B-17`, which was
 * fine while B-17 was the only array anything ever happened to and became a
 * quiet lie the moment a second one appeared: the live feed reported every fault
 * on the site as coming from PANEL B-17, because the type would not let it say
 * anything else. It is now the fixed subsystem names plus `PANEL <id>` for any
 * array — still constrained, still validated, no longer hardcoded to one panel.
 */
export const EventSource = z.union([
  z.enum([
    'SYSTEM', 'DRONE 01', 'DRONE 02',
    'SURFACE SCAN', 'THERMAL SCAN', 'INSPECTION QUEUE',
  ]),
  z.string().regex(/^PANEL [A-C]-\d{2}$/, 'array sources read "PANEL <id>"'),
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
  ratedKW: z.number().positive(),           // array nameplate (7 strings worth)
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
  deviationPct: z.number(),                  // ARRAY-level deviation (−41.7 for B-17)
  stringDeviationPct: z.number().optional(), // STRING-level (−58.4). Present on B-17 only.
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
  /**
   * Short-form caption for the cinematic MissionLog, rendered at 28px.
   * Absent = this event never appears in the log. Added at Phase 0 so the feed
   * and the log stay ONE t-ordered script instead of two files that drift; the
   * two surfaces need different copy lengths, not different timelines.
   */
  logLine: z.string().optional(),
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
  // Provenance — written by thermal_hotspot.py, required so the measurement can
  // always be traced back to the exact source frame and the declared scaling.
  sourceImage: z.string(),                  // "7916.jpg"
  sourceDataset: z.string(),                // "RaptorMaps InfraredSolarModules (MIT)"
  anomalyClass: z.string(),                 // "Hot-Spot-Multi" — the dataset's own label
  sigma: z.number().positive(),             // threshold in std devs
  thermalSpanC: z.number().positive(),      // DECLARED °C across the 0–255 range
});

export const Detection = z.object({
  label: DetectionClass,
  confidence: z.number().gt(0).lte(1),      // WHATEVER THE MODEL RETURNED
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),  // normalised xywh
  model: z.string(),                        // "yolov8n-solar-defect"
  mAP50: z.number().gt(0).lte(1),           // the REAL five-class mean
  /**
   * Per-class AP@50, keyed by the dataset's own class names.
   *
   * Committed as DATA rather than quoted in the README from a screenshot, because
   * the five-class mean is misleading here and the honest number needs to be
   * checkable: `Saglam` has 27 boxes and scores near zero, dragging the mean down,
   * and `Dirty` has ZERO test instances so its AP is undefined rather than 0.0 —
   * which is why absent keys are legal and a 0.0 for Dirty would be a lie.
   * The number that matters for this project is AP@50 for `Cracked`.
   */
  apPerClass: z.record(z.string(), z.number().min(0).max(1)),
  /** Provenance — the exact file, and proof it was never trained on. */
  sourceImage: z.string(),
  split: z.string(),                        // "test (held out)"
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

/**
 * Runtime triage, for live mode.
 *
 * Identical to TriageOutput except that `requiresPhysicalVerification` is a real
 * boolean rather than `literal(true)`. The cached version is about B-17, which IS
 * faulted, so demanding true there is correct and invariant I12 enforces it. Live
 * mode triages all 120 arrays, and an agent that insists a nominal array needs a
 * drone is not being rigorous — it is being useless. Whether verification is
 * required for a DEVIATING array is still checked, in agentCheck.ts.
 */
export const LiveTriageOutput = TriageOutput.extend({
  requiresPhysicalVerification: z.boolean(),
});

export type LiveTriageOutput = z.infer<typeof LiveTriageOutput>;

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
export type TriageSeverity = z.infer<typeof TriageSeverity>;
export type DroneStatus = z.infer<typeof DroneStatus>;
export type DemoView = z.infer<typeof DemoView>;
export type AgentStage = z.infer<typeof AgentStage>;
export type DetectionClass = z.infer<typeof DetectionClass>;
export type EventSource = z.infer<typeof EventSource>;
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

/**
 * The measured hot cells, from scripts/thermal_hotspot.py on Raptor Maps 7916.jpg.
 * A contiguous band across row 2 — one connected cluster. NOT the four cells
 * CLAUDE.md §8 invented. If you change these, you must have re-run the extractor
 * and be able to show the new image.
 */
export const MEASURED_HOT_CELLS: ReadonlyArray<readonly [number, number]> = [
  [2, 3], [2, 4], [2, 5], [2, 6],
];

/**
 * Band the measured cell-mean ΔT must fall inside. The measurement is ≈ +2.8 °C.
 * The guard exists because raising THERMAL_SPAN_C is the one-line change that
 * would reproduce CLAUDE.md's fictional +8 °C, and it must not pass silently.
 */
export const DELTA_T_BAND_C = { min: 1.0, max: 5.0 } as const;

/** The declared 8-bit→°C scaling in thermal_hotspot.py. Changing it changes ΔT. */
export const DECLARED_THERMAL_SPAN_C = 25.0;

const near = (actual: number, expected: number, tol: number, label: string) => {
  if (Math.abs(actual - expected) > tol) {
    throw new Error(
      `INVARIANT FAILED — ${label}: expected ${expected} ±${tol}, got ${actual}. ` +
      `Either the generator changed or a constant drifted. Fix the generator, not this file.`,
    );
  }
};

/**
 * Projected 72-hour energy loss, in MWh.
 *
 * CLAUDE.md §2/§19 and plan/03 both carried **1.44**. That number is not derivable
 * from the frozen physics and nothing in the pack derives it — it appears to be
 * 0.48 MWh/day × 3, where 0.48 was itself a seed value typed into plan/03 §7's
 * queue table.
 *
 * The actual integral — the array's 105.4 kW shortfall (5 faulted strings of 7)
 * across the 72-hour forecast irradiance curve — is **3.07 MWh**, i.e. 1.01 MWh/day.
 * `generate_telemetry.py` computes it by trapezoidal integration and prints the
 * kWh figure it integrated. See correction C16.
 */
export const PROJECTED_72H_LOSS_MWH = 3.07;

export function assertInvariants(d: {
  farm: Farm;
  telemetry: TelemetryFrame[];
  events: DemoEvent[];
  forecast: Forecast;
  cellgrid: CellGrid;
  queue: RepairTask[];
  /** Phase 6. Absent until run_agent.py has produced a cache — I9/I12 skip. */
  agent: AgentCache | null;
  /** Phase 3 (Colab). Absent until the detector has run — I11 skips. */
  detection: Detection | null;
}): { checked: string[]; skipped: string[] } {
  const checked: string[] = [];
  const skipped: string[] = [];
  const f = d.telemetry.find((x) => x.t === DEMO_FRAME_T);
  if (!f) throw new Error(`INVARIANT FAILED — I1: no telemetry frame at t=${DEMO_FRAME_T}`);

  // I1 — frame count and monotonicity
  if (d.telemetry.length !== 91) throw new Error(`I1: expected 91 frames, got ${d.telemetry.length}`);
  d.telemetry.forEach((fr, i) => {
    if (fr.t !== i) throw new Error(`I1: frame ${i} has t=${fr.t}; must be 0..90 in order`);
  });

  // I2 — forecast length (also enforced by the schema)
  if (d.forecast.points.length !== 73) throw new Error(`I2: expected 73 forecast points`);

  // I3/I4/I5 — the deviations, each bound to exactly one object (see 03 §4).
  // dev = f_mismatch − 1 exactly, because every other term in P_ac cancels:
  //   string  −58.40 %          (f_mismatch 0.4160)
  //   array   −58.40 × 5/7      = −41.71 %   (5 faulted strings of 7)
  near(f.inverters['INV-B'].deviationPct, -58.4, 0.05, 'I3 INV-B string deviation');
  near(f.panels['B-17'].deviationPct, -41.71, 0.05, 'I4 B-17 array deviation');
  near(f.panels['B-17'].stringDeviationPct ?? NaN, -58.4, 0.05, 'I4 B-17 string deviation');
  near(f.inverters['INV-A'].deviationPct, 0.0, 0.01, 'I5 INV-A deviation');
  near(f.inverters['INV-C'].deviationPct, 0.0, 0.01, 'I5 INV-C deviation');
  checked.push('I1', 'I2', 'I3', 'I4', 'I5');

  // I6 — farm output at demo conditions (C2: 364, not 412)
  near(f.farmOutputMW, 364, 1.0, 'I6 farm output MW');
  checked.push('I6');

  // I7/I8/I9 — forecast-derived figures
  near(d.forecast.projected72hLossMWh, PROJECTED_72H_LOSS_MWH, 0.05,
    'I7 projected 72h loss MWh');
  near(d.forecast.peakAmbientC, 38.1, 0.05, 'I8 peak ambient C');
  if (d.forecast.actBefore !== '14:00') throw new Error(`I9: actBefore = ${d.forecast.actBefore}`);
  checked.push('I7', 'I8', 'I9');
  if (d.agent) {
    if (d.agent.prognosis.actBefore !== d.forecast.actBefore) {
      throw new Error(`I9: agent actBefore (${d.agent.prognosis.actBefore}) disagrees with forecast`);
    }
    if (Math.abs(d.agent.prognosis.projected72hLossMWh - d.forecast.projected72hLossMWh) > 0.01) {
      throw new Error(
        `I9: agent projected loss (${d.agent.prognosis.projected72hLossMWh}) disagrees with ` +
        `the forecast integral (${d.forecast.projected72hLossMWh}). The LLM writes prose ABOUT ` +
        'numbers; it never produces them. Re-run run_agent.py with the correct inputs.',
      );
    }
  } else {
    skipped.push('I9 agent cross-check (no agent_cache.json — Phase 6)');
  }

  // I10 — the cell grid is a real 5×7 whose hot cells came out of a real image.
  if (d.cellgrid.matrix.length !== 5 || d.cellgrid.matrix.some((r) => r.length !== 7)) {
    throw new Error('I10: cellgrid.matrix must be 5×7');
  }
  if (d.cellgrid.defects.length !== MEASURED_HOT_CELLS.length) {
    throw new Error(
      `I10: expected ${MEASURED_HOT_CELLS.length} defects, got ${d.cellgrid.defects.length}. ` +
      'Re-run scripts/thermal_hotspot.py and update MEASURED_HOT_CELLS to what it printed.',
    );
  }
  MEASURED_HOT_CELLS.forEach(([r, c]) => {
    const hit = d.cellgrid.defects.find((x) => x.row === r && x.col === c);
    if (!hit) throw new Error(`I10: missing measured defect at (${r},${c})`);
    // The matrix and the defect list must be the same data, not two edits.
    near(d.cellgrid.matrix[r - 1][c - 1], hit.deltaTC, 0.05, `I10 matrix/defect agree at (${r},${c})`);
  });
  if (d.cellgrid.clusters !== 1) {
    throw new Error(
      `I10: expected 1 connected cluster (the row-2 band is the bypass-diode signature), ` +
      `got ${d.cellgrid.clusters}`,
    );
  }
  // I10 magnitude guard — see DELTA_T_BAND_C. Do not widen this to fit a story.
  d.cellgrid.defects.forEach((x) => {
    if (x.deltaTC < DELTA_T_BAND_C.min || x.deltaTC > DELTA_T_BAND_C.max) {
      throw new Error(
        `I10: ΔT ${x.deltaTC} °C at (${x.row},${x.col}) is outside the measured band ` +
        `${DELTA_T_BAND_C.min}..${DELTA_T_BAND_C.max}. The source is 8-bit normalised, not ` +
        'radiometric — if you widened THERMAL_SPAN_C to reach CLAUDE.md §8\'s +8 °C, revert it. ' +
        'If the span changed for a stated physical reason, change this band and say why in the README.',
      );
    }
  });
  if (d.cellgrid.thermalSpanC !== DECLARED_THERMAL_SPAN_C) {
    throw new Error(
      `I10: thermalSpanC is ${d.cellgrid.thermalSpanC}, declared ${DECLARED_THERMAL_SPAN_C}. ` +
      'The scaling assumption is stated in the README and in the script docstring; ' +
      'changing it silently makes both wrong.',
    );
  }

  checked.push('I10');

  // I11 — the tripwire against yourself. 0.84 is the spec's placeholder, not a result.
  if (d.detection) {
    if (d.detection.confidence === 0.84) {
      throw new Error(
        'I11: detection.confidence is exactly 0.84 — the placeholder from CLAUDE.md §2. ' +
        'If the model genuinely returned 0.84, delete this check and note it in the README. ' +
        'Otherwise you are about to show a number you did not measure.',
      );
    }
    // The reticle claims a crack, so the detection had better be one.
    if (d.detection.label !== ON_SCREEN_DETECTION_CLASS) {
      throw new Error(
        `I11: detection.label is "${d.detection.label}", but the demo caption and the ` +
        `target reticle both say a crack. Re-run Cell 5 against an image where the ` +
        `model actually finds ${ON_SCREEN_DETECTION_CLASS}, or change what the UI claims.`,
      );
    }
    // The headline vision metric must be the per-class figure, and it must exist.
    if (d.detection.apPerClass[ON_SCREEN_DETECTION_CLASS] === undefined) {
      throw new Error(
        `I11: apPerClass has no entry for ${ON_SCREEN_DETECTION_CLASS}. That is the only ` +
        'AP figure this project is entitled to quote — the five-class mean is depressed ' +
        'by a 27-box class we never use. Copy it from Cell 4 output.',
      );
    }
    if (!d.detection.split.toLowerCase().includes('test')) {
      throw new Error(
        `I11: evidence image came from the "${d.detection.split}" split. The displayed ` +
        'confidence is only meaningful on data the model never trained on.',
      );
    }
    checked.push('I11');
  } else {
    skipped.push('I11 detection confidence (no b17_detection.json — Phase 3, Colab)');
  }

  // I12 — the load-bearing claim: telemetry alone cannot diagnose, so the drone must fly
  if (d.agent) {
    if (d.agent.triage.requiresPhysicalVerification !== true) {
      throw new Error('I12: triage must justify the drone dispatch');
    }
    checked.push('I12');
  } else {
    skipped.push('I12 triage justifies dispatch (no agent_cache.json — Phase 6)');
  }

  // I13 — deterministic ranking puts B-17 first, by a visible margin
  const ranked = rankQueue(d.queue);
  if (ranked[0].id !== 'INC-B17') throw new Error(`I13: queue #1 is ${ranked[0].id}, not INC-B17`);
  const margin = priorityScore(ranked[0]) / priorityScore(ranked[1]);
  if (margin < 1.5) throw new Error(`I13: B-17 leads by only ${margin.toFixed(2)}×; need ≥1.5×`);
  checked.push('I13');

  // I14 — events are in range and reference real panels
  const panelIds = new Set(d.farm.zones.flatMap((z) => z.panels.map((p) => p.id)));
  d.events.forEach((e) => {
    if (e.t < 0 || e.t > 90) throw new Error(`I14: event ${e.id} has t=${e.t}`);
    if (e.linkedPanelId && !panelIds.has(e.linkedPanelId)) {
      throw new Error(`I14: event ${e.id} links unknown panel ${e.linkedPanelId}`);
    }
  });
  checked.push('I14');

  // I15 is a manual check — no build-time way to ask Groq whether an ID is still live.
  skipped.push('I15 Groq model ID is current (manual — check console.groq.com/docs/deprecations)');

  // I16 — health is continuous; the fault ramps rather than jumping
  for (let i = 1; i < d.telemetry.length; i++) {
    const jump = Math.abs(d.telemetry[i].farmHealth - d.telemetry[i - 1].farmHealth);
    if (jump > 6) throw new Error(`I16: farmHealth jumps ${jump.toFixed(1)} at t=${i}`);
  }
  checked.push('I16');

  return { checked, skipped };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Deterministic ranking — re-exported by src/lib/ranking.ts
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
