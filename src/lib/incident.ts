/**
 * src/lib/incident.ts — one array's problem, as a single object.
 *
 * WHAT WAS WRONG WITHOUT IT. Everything this product knows about a failing array
 * was already on screen and it was spread across a dozen components that had never
 * been introduced to each other: a deviation here, a thermal grid there, a
 * paragraph of agent prose, a forecast band, a queue position, an approval button.
 * Each was correct. Together they were a list of facts rather than an argument,
 * and an operator — or anyone being shown this for the first time — had to
 * assemble the reasoning themselves out of parts laid side by side.
 *
 * An incident IS the argument. It has a shape: something was observed, evidence
 * was gathered, a cause was proposed, a consequence was projected, an action was
 * recommended, a human decided. That shape is the product. This module makes it a
 * thing the code can hold rather than a thing the reader has to infer.
 *
 * DERIVED, NEVER STORED. There is no incident table and nothing writes to one.
 * An incident is a pure function of the site at a moment plus what the operator
 * has done, exactly like the event feed and the queue. Scrub time backwards and
 * the incident rewinds with it, because there is nowhere for a stale one to hide.
 *
 * ONE STRUCTURE, TWO VIEWS. `chain` is the reasoning in its logical order; the
 * timeline is the same steps filtered to those that have actually happened and
 * sorted by when. They cannot disagree about what occurred, because there is only
 * one of them.
 *
 * WHAT THIS MODULE MAY NOT DO. It states no fact that the rest of the product has
 * not already computed. Every step carries the BASIS of its claim and the name of
 * what produced it, so a reader can tell a measurement from a projection from an
 * assumption from a sentence a language model wrote — which is the distinction
 * this whole project rests on, and the one an ordinary dashboard destroys by
 * rendering all four at the same weight.
 */

import type { Cause } from './causes';
import { hasCapturedEvidence } from './data';
import { clockAt } from './physics';
import { scenario, type ScenarioEvent } from './live';
import type { Detection } from './types';

/**
 * How a claim came to be true. This is the distinction the product exists to
 * preserve, so it is a field rather than a convention.
 */
export type Basis =
  /** An instrument produced it: the trained detector, the thermal capture. */
  | 'measured'
  /** The physics model produced it: deviation, cell temperature, the deadline. */
  | 'modelled'
  /** A deterministic function over the above: the queue rank, the loss integral. */
  | 'derived'
  /** A declared assumption, stated so it can be argued with. */
  | 'stated'
  /** A language model wrote the words, over figures it was handed and never sourced. */
  | 'written'
  /** A person did it. The only basis the software cannot manufacture. */
  | 'operator';

export const BASIS_LABEL: Record<Basis, string> = {
  measured: 'measured',
  modelled: 'from the model',
  derived: 'calculated',
  stated: 'declared assumption',
  written: 'written by the agent',
  operator: 'operator',
};

/**
 * `pending` and `blocked` are different and the difference matters. Pending means
 * this step has not happened yet; blocked means it cannot happen for this array,
 * and saying which is the difference between a console that is waiting and one
 * that is stuck.
 */
export type StepState = 'done' | 'active' | 'pending' | 'blocked';

export type StepKey =
  | 'observation' | 'evidence' | 'hypothesis'
  | 'forecast' | 'recommendation' | 'decision';

export interface ChainStep {
  key: StepKey;
  /**
   * Alternatives eliminated to reach this step, each with its reason.
   *
   * The refusals are half the reasoning and they used to be invisible. A console
   * that only ever states its conclusion is asking to be trusted; one that shows
   * what it ruled out, and on what, is showing its work.
   */
  ruledOut?: RuledOut[];
  /** What this step is, in the operator's language. */
  label: string;
  state: StepState;
  /** What it establishes, in one plain sentence. Absent until it has happened. */
  says?: string;
  basis?: Basis;
  /** What produced the claim, named so it can be checked rather than trusted. */
  source?: string;
  /** Site seconds at which it became true. Only set on completed steps. */
  at?: number;
}

export type IncidentState =
  | 'clear'          // nothing wrong with this array
  | 'detected'       // telemetry says something is wrong, cause unknown
  | 'investigating'  // a drone is on its way or on station
  | 'diagnosed'      // evidence is back and a cause is proposed
  | 'scheduled'      // an operator approved work
  | 'declined';      // an operator declined, with a reason

export interface Incident {
  /** `INC-B17`. The same identifier the repair queue and the work order use. */
  id: string;
  panelId: string;
  /** Site seconds when the fault began. Null when the array is clear. */
  openedAt: number | null;
  state: IncidentState;
  /**
   * What is wrong, and therefore what to do. Carried on the incident so callers
   * do not each re-derive it — and so nothing downstream can apply the crack's
   * escalation to an array that is merely dirty.
   */
  cause: Cause;
  chain: ChainStep[];
}

export interface IncidentInput {
  panelId: string;
  /** The array's deviation right now, in percent. Negative is a shortfall. */
  deviationPct: number;
  /** Its shortfall at reference conditions, which is what survives nightfall. */
  referenceShortfallKW: number;
  /** The fault on this array, committed or injected. Undefined when clear. */
  fault: ScenarioEvent | undefined;
  /** Site seconds elapsed since the inspecting drone reached the array, if any. */
  inspectedAt: number | null;
  /** Site seconds at which a drone was dispatched here, if one was. */
  dispatchedAt: number | null;
  /** 72-hour projected loss for THIS array, MWh. Zero when it is not deviating. */
  projectedLossMWh: number;
  /** Hours from now until this array's deadline, when one has been computed. */
  hoursUntilDeadline: number | null;
  /** Its position in the ranked queue, 1-based. Null when it is not ranked. */
  queueRank: number | null;
  /** An approved work order for this array. */
  workOrderAt: number | null;
  /** A recorded override, with the operator's reason. */
  override: { at: number; reason: string } | null;
  /** The committed detection, when this array is the one it was run on. */
  detection: Detection | null;
  /**
   * What the detector returned in THIS browser, on the frame the drone brought
   * back from this array. Distinct from `detection`, which was measured months
   * ago on a photograph: this one is about these pixels, and it is the only
   * detection that exists for an array we hold no committed capture for.
   */
  liveDetection: { label: string; confidence: number; frames: number } | null;
  /**
   * What is wrong and what to do about it — soiling, shading, a crack, or
   * nothing established. This is what makes the chain a TRIAGE rather than a
   * description: different causes reach different steps 3 and 5.
   */
  cause: Cause;
}

/** A cause that was considered and eliminated, with what eliminated it. */
export interface RuledOut { cause: string; because: string }

/** Site seconds → the site clock, for a sentence that names a time. */
const at = (siteSeconds: number): string => clockAt(siteSeconds / 3600);

const round = (v: number): number => Math.round(Math.abs(v));

/**
 * Build the incident.
 *
 * Read top to bottom this function IS the loop from CLAUDE.md §1, which is
 * deliberate — if a step ever stops being derivable here, the product has stopped
 * being able to justify that step, and that should be hard to miss.
 */
/**
 * The live run, as a sentence, or the empty string.
 *
 * Separate from the committed detection on purpose. One was measured on a
 * photograph before this code existed; the other ran seconds ago on pixels the
 * aircraft brought back. Collapsing them into one claim would lose the only
 * distinction that makes either worth quoting.
 */
function liveSentence(
  live: { label: string; confidence: number; frames: number } | null,
): string {
  if (!live) return '';
  return ` The detector then ran in this browser on the frame the drone returned and`
    + ` reported ${live.label.toLowerCase()} at ${live.confidence.toFixed(2)}`
    + `${live.frames > 1 ? `, the clearest of ${live.frames} frames` : ''}.`;
}

export function buildIncident(input: IncidentInput): Incident {
  const {
    panelId, deviationPct, referenceShortfallKW, fault,
    inspectedAt, dispatchedAt, projectedLossMWh, hoursUntilDeadline,
    queueRank, workOrderAt, override, detection, liveDetection, cause,
  } = input;

  // Deviating is judged at REFERENCE conditions, not at this hour. A cracked
  // array is cracked at midnight; the sun is simply not up to prove it, and an
  // incident that closed itself every evening would be worse than none.
  const deviating = referenceShortfallKW > 0.5;
  // Site seconds are measured from the scenario epoch, and the fault declares an
  // absolute site hour, so the incident opens where those two meet. Read from the
  // committed scenario rather than written down here — a second copy of the epoch
  // is a second thing that can be wrong.
  const openedAt = fault
    ? Math.max(0, (fault.startHour - scenario.epochHour) * 3600)
    : null;

  const chain: ChainStep[] = [];

  // ── 1. OBSERVATION — SCADA noticed. It cannot say why. ────────────────────
  chain.push(deviating
    ? {
      key: 'observation',
      label: 'What was observed',
      state: 'done',
      says: `${panelId} is producing about ${round(deviationPct)}% less than the model `
        + 'expects for these conditions.',
      basis: 'modelled',
      source: 'expected output from physics.ts, against the array reading',
      at: openedAt ?? undefined,
    }
    : {
      key: 'observation',
      label: 'What was observed',
      state: 'done',
      says: `${panelId} is producing what the model expects. Nothing is open on it.`,
      basis: 'modelled',
      source: 'expected output from physics.ts, against the array reading',
    });

  // ── 2. EVIDENCE — the agent refuses to guess, so it goes and looks. ───────
  // This step is the whole reason the drone exists, and the honest version of it
  // is the one where the software says it does not know yet.
  const inspected = inspectedAt !== null;
  const flying = dispatchedAt !== null && !inspected;

  chain.push({
    key: 'evidence',
    label: 'What was checked',
    state: !deviating ? 'pending'
      : inspected ? 'done'
        : flying ? 'active'
          // Settled without imaging is a completed step, not a waiting one. It
          // used to render as "pending" for ever on a soiled array, which read as
          // the console failing to get round to it.
          : !cause.needsDrone ? 'done' : 'pending',
    says: !deviating
      ? undefined
      : inspected
        ? hasCapturedEvidence(panelId) && detection
          // "on the frame" was doing too much work: the frame in question is the
          // committed photograph, not anything this drone brought back, and the
          // sentence sat next to a live capture where it read as describing that.
          ? `A drone captured ${panelId}. The detector found ${detection.label.toLowerCase()} `
            + `at ${detection.confidence.toFixed(2)} on the committed capture, and a thermal `
            + 'capture of the same module shows a hot band across four cells in row 2.'
            + liveSentence(liveDetection)
          : `A drone inspected ${panelId} and returned.${liveSentence(liveDetection)
            || ' No imagery is held on file for this array, so nothing below rests '
              + 'on a capture.'}`
        : flying
          ? `A drone is on its way to ${panelId}. Telemetry cannot separate dirt from `
            + 'physical damage, so the agent asked for imaging rather than guessing.'
          // THE REFUSAL. When the cause is already settled without imaging, the
          // agent declines to fly and says what it would have learnt: nothing.
          : !cause.needsDrone
            ? `No inspection needed. ${cause.says} Imaging would confirm what the `
              + 'telemetry and the site record already establish.'
            : `Telemetry alone cannot say WHY ${panelId} is down — soiling, shading and a `
              + 'cracked cell look alike from here. Physical verification is needed.',
    basis: inspected && (hasCapturedEvidence(panelId) || liveDetection)
      ? 'measured' : 'modelled',
    // The provenance line has to follow the claim above it. It used to say "the
    // ambiguity is a property of the telemetry" under every array — including
    // ones where the console had just said there was NO ambiguity and no
    // inspection was needed, which read as the two halves of one step arguing.
    source: inspected && hasCapturedEvidence(panelId)
      ? 'YOLOv8n on a held-out frame, and a UAV thermal capture'
      : inspected && liveDetection
        ? 'YOLOv8n, run in this browser on the frame the drone returned'
      : !cause.needsDrone
        ? 'per-string monitoring and the thermal sensor, which agree'
        : 'the ambiguity is a property of the telemetry, not a judgement',
    at: inspectedAt ?? dispatchedAt ?? undefined,
  });

  // ── 3. HYPOTHESIS — a named mechanism, from the site record. ──────────────
  // The MECHANISM is a site fact. The PROSE about it is the language model's, and
  // the two are labelled differently on purpose: one is checkable, one is writing.
  const mechanism = fault?.mechanism;
  chain.push({
    key: 'hypothesis',
    label: 'What is wrong',
    // Settled for ANY cause now, not only for a recorded mechanism. A soiled
    // array used to reach this step and have nothing to say, which made dirt look
    // like an unsolved case rather than a solved one with a cheap answer.
    state: !deviating ? 'pending' : cause.id === 'unexplained' ? 'blocked' : 'done',
    // THE AGENT'S PARAGRAPH IS DELIBERATELY NOT HERE. It used to be appended, and
    // the same five sentences then appeared twice on one screen — once in this
    // step and again in the agent card beside it. The chain is the DETERMINISTIC
    // reading: what the site record and the instruments establish. The card is the
    // model's prose about it. Two kinds of claim, said once each.
    says: !deviating ? undefined
      : `${cause.label}. ${mechanism ? `${capitalise(mechanism)}. ` : ''}${cause.says}`,
    ruledOut: deviating && cause.ruledOut.length ? cause.ruledOut : undefined,
    basis: 'modelled',
    source: 'the site record, this array\'s soiling derate, and the site geometry',
    at: openedAt ?? undefined,
  });

  // ── 4. FORECAST — the step nobody else does. ──────────────────────────────
  // THE ESCALATION BELONGS TO THE CRACK AND TO NOTHING ELSE. The thermal-dose
  // deadline is a statement about a cracked cell heating past its propagation
  // threshold; a soiled array has no cell to crack and no diode to fail. This
  // step told A-08 that "the cell crosses its heat threshold in 25.9 hours",
  // which is the crack narrative wearing another array's name — the same class
  // of error as showing B-17's thermal grid under another array.
  const escalates = cause.id === 'crack';
  const hasDeadline = escalates
    && hoursUntilDeadline !== null
    && Number.isFinite(hoursUntilDeadline);
  chain.push({
    key: 'forecast',
    label: 'What happens if nothing is done',
    state: !deviating ? 'pending' : projectedLossMWh > 0.01 ? 'done' : 'pending',
    says: projectedLossMWh > 0.01
      ? `About ${projectedLossMWh.toFixed(1)} MWh never generated over the next three days`
        + (hasDeadline
          ? `, and the cracked cell crosses its heat threshold in ${hoursUntilDeadline!.toFixed(1)} `
            + 'hours. After that the bypass diode is projected to fail, and the affected strings '
            + 'go open rather than derated.'
          : '. The loss grows steadily; nothing here gets suddenly worse.')
      : undefined,
    basis: 'modelled',
    source: hasDeadline
      ? 'the shortfall integrated over the 72 h forecast; the deadline from the thermal-dose model'
      : 'the shortfall integrated over the 72 h forecast',
    at: openedAt ?? undefined,
  });

  // ── 5. RECOMMENDATION — ranked by a pure function, never by the model. ────
  chain.push({
    key: 'recommendation',
    label: 'What to do first',
    state: !deviating ? 'pending' : queueRank !== null ? 'done' : 'blocked',
    says: queueRank !== null
      ? `${cause.action} `
        + (queueRank === 1
          ? `It is #1 of the site's open work by loss, severity and how little time is left.`
          : `${panelId} is #${queueRank} in the queue; higher-ranked work is costing more per hour.`)
      : deviating
        ? `${cause.action} It cannot be ranked against the rest — no deadline or access `
          + 'cost is on file for this array — so it is reported rather than dropped.'
        : undefined,
    basis: 'derived',
    source: 'priorityScore() — loss × severity × urgency ÷ access. A pure function, shown on the Repairs screen.',
    at: openedAt ?? undefined,
  });

  // ── 6. DECISION — the only step the software cannot take. ─────────────────
  chain.push({
    key: 'decision',
    label: 'What a person decided',
    state: workOrderAt !== null || override ? 'done' : deviating ? 'active' : 'pending',
    says: workOrderAt !== null
      ? `Work order raised at ${at(workOrderAt)}. A crew is assigned to ${panelId}.`
      : override
        ? `Declined at ${at(override.at)} — ${override.reason}. No work order was raised.`
        : deviating
          ? 'Waiting for an operator. Nothing is scheduled until a person approves it.'
          : undefined,
    basis: 'operator',
    source: 'the approval gate — the agent raises no work order on its own',
    at: workOrderAt ?? override?.at ?? undefined,
  });

  const state: IncidentState = !deviating ? 'clear'
    : workOrderAt !== null ? 'scheduled'
      : override ? 'declined'
        : inspected ? 'diagnosed'
          : flying ? 'investigating'
            : 'detected';

  return { id: `INC-${panelId.replace('-', '')}`, panelId, openedAt, state, cause, chain };
}

/**
 * The steps that have actually happened, oldest first — the receipt of the loop.
 *
 * Derived from `chain` rather than assembled separately, so the two can never
 * tell different stories about what occurred or when.
 */
export function incidentTimeline(incident: Incident): ChainStep[] {
  return incident.chain
    .filter((s) => s.state === 'done' && s.at !== undefined)
    .sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
}

/** Whether a step's claim rests on captured imagery — used to keep claims scoped. */
export const stepRestsOnCapture = (step: ChainStep): boolean =>
  step.key === 'evidence' && step.basis === 'measured';

const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
