/**
 * src/lib/data.ts — the ONE place /data enters the application.
 *
 * Components never import from `@data/...` and never read a JSON file. They call a
 * hook from `src/store/selectors.ts`, which reads from here. That single seam is
 * what makes a schema change a one-file edit, and it is why `check:literals` can
 * be confident that a number appearing in a component came from the physics model.
 *
 * The JSON is imported at BUILD time, not fetched. There is no loading state
 * anywhere in this app because nothing loads — see plan/04 §4. If you ever find
 * yourself wanting a spinner, you have accidentally introduced a runtime fetch.
 *
 * On the casts below: `npm run validate:data` already parses every one of these
 * files against the same Zod schemas and asserts I1–I16, and it runs in `prebuild`.
 * Re-parsing at runtime would cost startup time to re-prove something the build
 * already refused to ship without. The cast is safe precisely because the gate exists.
 */

import farmJson from '@data/farm.json';
import telemetryJson from '@data/telemetry.json';
import eventsJson from '@data/events.json';
import forecastJson from '@data/forecast.json';
import queueJson from '@data/repair_queue.json';
import cellgridJson from '@data/evidence/b17_cellgrid.json';
import artefactsJson from '@data/artefacts.json';

import type {
  AgentCache, CellGrid, DemoEvent, Detection, Farm, Forecast, PanelArray,
  RepairTask, TelemetryFrame,
} from './types';

export const farm = farmJson as unknown as Farm;
export const telemetry = telemetryJson as unknown as TelemetryFrame[];
export const events = eventsJson as unknown as DemoEvent[];
export const forecast = forecastJson as unknown as Forecast;
export const repairQueue = queueJson as unknown as RepairTask[];
export const cellGrid = cellgridJson as unknown as CellGrid;

/** Every array, flattened, in map order. */
export const panels: PanelArray[] = farm.zones.flatMap((z) => z.panels);

const panelById = new Map(panels.map((p) => [p.id, p]));
export const getPanel = (id: string): PanelArray | undefined => panelById.get(id);

/**
 * Artefacts that arrive in later phases, written by `scripts/sync_artefacts.mjs`
 * on every `predev` / `prebuild`.
 *
 * A manifest rather than optional imports, because a bundler cannot import a file
 * that does not exist yet and these land across three different phases. One import
 * that is always present, with nulls inside it.
 *
 * plan/04 §4: an absent slot renders as ABSENT — never a placeholder box, never a
 * stub file. Until Colab lands, the RGB thumbnail simply does not appear, which is
 * honest and keeps the console presentable at every phase rather than only at the end.
 */
export type EvidenceKey = 'thermal' | 'rgb' | 'rgbAnnotated' | 'audio' | 'flyover';

const artefacts = artefactsJson as {
  files: Record<EvidenceKey, string | null>;
  detection: Detection | null;
  agent: AgentCache | null;
};

export const evidenceUrl = (key: EvidenceKey): string | null => artefacts.files[key];
export const hasEvidence = (key: EvidenceKey): boolean => artefacts.files[key] !== null;

/**
 * The real model output, or null until Colab lands (Phase 3). Never stub this: the
 * entire point of the reticle is that its confidence is a measurement, and
 * invariant I11 rejects the spec's placeholder 0.84 by name.
 */
export const detection: Detection | null = artefacts.detection;

/**
 * Cached agent reasoning, or null until Phase 6. The LLM writes prose ABOUT
 * numbers; `run_agent.py` cross-checks every numeric field against telemetry.json
 * and refuses to write a cache that contradicts the physics.
 */
export const agentCache: AgentCache | null = artefacts.agent;
