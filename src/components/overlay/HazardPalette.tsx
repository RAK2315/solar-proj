'use client';

/**
 * HazardPalette: the hero's tools. Pick a hazard, drag it onto the field, drop.
 *
 * A drop writes one scenario event into the session and nothing else. The
 * readings, the queue, the deadlines and the plan all re-derive from it, which is
 * the point of the demonstration: nothing downstream is stored.
 *
 * The drag is handled on the window, not on the canvas, because it can begin on a
 * button here. Two gestures reach the same drop: press a tool and release over
 * the field, or click a tool and then click the field.
 */

import { Cloud, RotateCcw, ThermometerSun, Wind, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { twinProbe } from '@/components/twin/probe';
import { MWh, clockOf, degC, hours, num, pctPlain } from '@/lib/format';
import { lostRevenue } from '@/lib/money';
import { DUST_WASH_WINDOW_H, HAZARD_SPEC, type HazardEvent, type HazardKind } from '@/lib/hazard';
import { describeHazard, HAZARD_GUIDE } from '@/lib/sandboxGuide';
import {
  OUTLOOK_HOURS, useFlatField, useHazardCostMWh, useHazardImpact, useHazards, useHeatwaveC,
  useScenarioEpochHour, useSiteFrame,
} from '@/store/selectors';
import { useSession } from '@/store/session';
import { Blk, Why } from './Block';
import { TariffBasis } from './Tariff';

const TOOLS: Array<{ id: HazardKind; Icon: typeof Wind }> = [
  { id: 'dust', Icon: Wind },
  { id: 'cloud', Icon: Cloud },
  { id: 'heatwave', Icon: ThermometerSun },
];

const DAY_SECONDS = 24 * 3600;
const SEEK_STEP_SECONDS = 60;

const overField = (x: number, y: number) => document.elementFromPoint(x, y)?.tagName === 'CANVAS';

/** Follows the pointer while a footprint is held, and drops it over the field. */
function useHazardDrag() {
  const armed = useSession((s) => s.armedHazard);

  useEffect(() => {
    if (!armed || armed === 'heatwave') return undefined;
    const { moveHazardDraft, dropHazard } = useSession.getState();

    const at = (e: PointerEvent) => (
      overField(e.clientX, e.clientY) ? twinProbe.toGround?.(e.clientX, e.clientY) ?? null : null
    );
    const onMove = (e: PointerEvent) => moveHazardDraft(at(e));
    const onUp = (e: PointerEvent) => {
      const p = at(e);
      if (!p) return;
      dropHazard(armed, p);
      // The click that completes this press would otherwise select whatever
      // array is under the pointer. It is swallowed once, and the guard is
      // lifted on the next press in case no click follows a drag.
      const swallow = (c: MouseEvent) => { c.stopPropagation(); c.preventDefault(); };
      window.addEventListener('click', swallow, { capture: true, once: true });
      window.addEventListener('pointerdown', () => window.removeEventListener('click', swallow, true), { once: true });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [armed]);
}

export function HazardPalette() {
  useHazardDrag();
  const armed = useSession((s) => s.armedHazard);
  const arm = useSession((s) => s.armHazard);
  const drop = useSession((s) => s.dropHazard);
  const reset = useSession((s) => s.resetSession);
  const rehearse = useSession((s) => s.loadRehearsal);
  const setSiteSeconds = useSession((s) => s.setSiteSeconds);
  const flat = useFlatField();
  const heat = useHeatwaveC();
  const frame = useSiteFrame();
  /** Whether the pressed tool was already held, so a second click puts it back. */
  const heldBefore = useRef(false);

  const press = (kind: HazardKind) => {
    if (kind === 'heatwave') drop('heatwave');
    else arm(armed === kind ? null : kind);
  };

  return (
    <section className="blk glass sy-palette" data-b="tools" aria-label="Hazards">
      <h2 className="palette-title">Scenario tools</h2>
      <p className="one">
        {armed
          ? flat ? 'Now pick an array on the map.' : 'Now drop it on the field. Esc puts it back.'
          : 'Pick a hazard, then drag it onto the field.'}
      </p>
      <div className="toolcol" role="toolbar" aria-label="Hazard tools">
        {TOOLS.map(({ id, Icon }) => (
          <button
            key={id}
            type="button"
            className="tool"
            aria-pressed={id === 'heatwave' ? heat > 0 : armed === id}
            disabled={id === 'heatwave' && heat > 0}
            // Arming on the press, not the click, is what lets the same pointer
            // carry the footprint onto the field without letting go.
            onPointerDown={() => {
              heldBefore.current = armed === id;
              if (id !== 'heatwave' && armed !== id) arm(id);
            }}
            onClick={(e) => {
              // A keyboard activation has no press before it, so it toggles here.
              if (id === 'heatwave' || e.detail === 0) press(id);
              else if (heldBefore.current) arm(null);
            }}
          >
            <Icon size={18} strokeWidth={1.75} aria-hidden /><span>{HAZARD_SPEC[id].label}<small>{id === 'heatwave' ? 'Applies across the site' : id === 'cloud' ? 'Temporary weather footprint' : 'Leaves dust until removed'}</small></span>
          </button>
        ))}
        <span className="sep" aria-hidden />
        <button type="button" className="tool" aria-keyshortcuts="R" onClick={reset}>
          <RotateCcw size={18} strokeWidth={1.75} aria-hidden />Reset
        </button>
        <button type="button" className="tool" aria-keyshortcuts="S" onClick={rehearse}>Rehearsal</button>
      </div>
      <label className="scrub">
        <span className="one">Site time <span className="num">{frame.clock}</span></span>
        <input
          type="range" min={0} max={DAY_SECONDS} step={SEEK_STEP_SECONDS}
          value={Math.min(DAY_SECONDS, Math.round(frame.siteSeconds))}
          aria-label="Site time, first 24 hours"
          onChange={(e) => setSiteSeconds(Number(e.target.value))}
        />
      </label>
    </section>
  );
}

/** One line on what the hazards did to the plan. Sits with the queue it reordered. */
export function ImpactLine() {
  const impact = useHazardImpact();
  if (!impact) return null;

  const parts = [`${impact.affected} ${impact.affected === 1 ? 'array' : 'arrays'} affected`];
  if (impact.added > 0) parts.push(`${impact.added} ${impact.added === 1 ? 'job' : 'jobs'} added`);
  if (impact.displaced > 0) parts.push(`${impact.displaced} displaced`);
  if (Math.abs(impact.outputDeltaMW) >= 0.05) {
    parts.push(`site output ${num(Math.abs(impact.outputDeltaMW), 1)} MW ${impact.outputDeltaMW < 0 ? 'lower' : 'higher'}`);
  }
  const shift = impact.firstDeadlineShiftH;

  return (
    <p className="well impact" role="status" data-sev="warning">
      {parts.join(', ')}
      {impact.first && (
        <>, <span className="id">{impact.first}</span> {impact.firstHeld ? 'still first' : 'now first'}</>
      )}
      {shift !== null && Math.abs(shift) >= 0.05 && (
        <>, its deadline {num(Math.abs(shift), 1)} h {shift < 0 ? 'sooner' : 'later'}</>
      )}.
    </p>
  );
}

function HazardExplanation({ hazard }: { hazard: HazardEvent }) {
  const frame = useSiteFrame();
  const epoch = useScenarioEpochHour();
  const select = useSession((s) => s.selectPanel);
  const setModule = useSession((s) => s.setModule);
  const remove = useSession((s) => s.removeHazard);
  const explained = describeHazard(hazard, epoch + frame.siteSeconds / 3600, Object.keys(frame.panels));
  const guide = HAZARD_GUIDE[hazard.kind];
  const next = explained.state === 'Passed' ? 'The cloud has cleared. Compare output with expected again. Open any remaining shortfall as an incident and review its evidence.' : explained.state === 'Waiting' ? 'The site clock is before this drop. Advance to its start time to see the scenario develop.' : guide.next;
  const Icon = TOOLS.find((t) => t.id === hazard.kind)!.Icon;
  const zones = [...new Set(explained.affected.map((id) => id.split('-')[0]))];
  return <article className="hazard-explanation" data-kind={hazard.kind}>
    <header><span className="hazard-icon"><Icon size={20} aria-hidden /></span><div><h3>{HAZARD_SPEC[hazard.kind].label}</h3><p>{guide.effect} · <span className="num">{clockOf(hazard.startHour)}</span></p></div><button type="button" className="why" aria-label={`Remove the ${HAZARD_SPEC[hazard.kind].label.toLowerCase()} dropped at ${clockOf(hazard.startHour)}`} onClick={() => remove(hazard.id)}><X size={14} aria-hidden /></button></header>
    <div className="hazard-live"><span className="chip" data-sev={explained.state === 'Passed' || explained.state === 'Waiting' ? 'info' : 'active'}>{explained.state}</span><strong className="num">{explained.affected.length} {explained.affected.length === 1 ? 'array' : 'arrays'} affected now</strong></div>
    <dl className="hazard-reading">
      <div><dt>{hazard.kind === 'heatwave' ? 'Ambient rise now' : 'Peak irradiance reduction now'}</dt><dd className="num">{hazard.kind === 'heatwave' ? degC(hazard.intensity * explained.strength) : pctPlain(hazard.intensity * explained.strength * 100)}</dd></div>
      <div><dt>Extent</dt><dd>{hazard.kind === 'heatwave' ? 'Whole site' : zones.length ? `Zones ${zones.join(', ')}` : `${explained.inside.length} arrays in footprint`}</dd></div>
      <div><dt>{hazard.kind === 'cloud' ? 'Passes at, site time' : 'Persists'}</dt><dd>{explained.endsAt === null ? 'Until removed from scenario' : clockOf(explained.endsAt)}</dd></div>
    </dl>
    <details open><summary>Why the readings changed</summary><p>{guide.why}</p><p>Declared scenario input. Effects develop over <span className="num">{hazard.rampMinutes} min</span> of site time.</p></details>
    <div className="hazard-response"><strong>Recommended response</strong><p>{guide.action}</p></div>
    <details><summary>What to check next</summary><p>{next}</p></details>
    {explained.affected.length > 0 && <details><summary>Inspect affected arrays <span className="num">({explained.affected.length})</span></summary><div className="affected-arrays">{explained.affected.map((id) => <button key={id} type="button" className="tool quiet id" onClick={() => { select(id); setModule('incident'); }}>{id}</button>)}</div></details>}
  </article>;
}

/** The hazards in force, each removable, with what each one is declared to do. */
export function HazardsPanel() {
  const hazards = useHazards();
  const clear = useSession((s) => s.clearHazards);
  const epoch = useScenarioEpochHour();
  const cost = useHazardCostMWh();

  return (
    <Blk
      b="hazards"
      title={<>Scenario effects<span className="count num">{hazards.length} dropped</span></>}
      aside={<Why />}
    >
      {hazards.length === 0 ? (
        <div className="scenario-intro"><p>Choose a hazard from the tools, then place its footprint on the field. Heatwave applies site-wide.</p><p>Advance the site clock to see it develop. Output, array status and the plan are recalculated from the same model.</p><div className="scenario-guides">{TOOLS.map(({ id, Icon }) => <details key={id}><summary><Icon size={18} aria-hidden /><span>{HAZARD_SPEC[id].label}<small>{HAZARD_GUIDE[id].effect}</small></span></summary><p>{HAZARD_GUIDE[id].why}</p><p><strong>Response: </strong>{HAZARD_GUIDE[id].action}</p></details>)}</div></div>
      ) : (
        <div className="hazard-cards">{hazards.slice().reverse().map((h) => <HazardExplanation key={h.id} hazard={h} />)}</div>
      )}
      {/* What makes the sandbox a decision tool: the same what-if, in rupees. */}
      {cost && (
        <p className="well cost" role="status">
          Across the {OUTLOOK_HOURS} h scenario forecast these cost the modelled arrays <b className="num">{MWh(cost.mwh)}</b>,
          {' '}<b className="num">{lostRevenue(cost.mwh)}</b> of revenue, <TariffBasis />.
          Forecast band <span className="num">{lostRevenue(cost.low)} to {lostRevenue(cost.high)}</span>.
        </p>
      )}
      <div className="work workings">
        <p>Declared scenario assumptions, not measurements of Bhadla:</p>
        <p>
          Dust storm: soiling that keeps {pctPlain(HAZARD_SPEC.dust.intensity * 100)} of irradiance off the cells
          at its centre, {HAZARD_SPEC.dust.radius} m radius, until washed. A wash is due
          within {hours(DUST_WASH_WINDOW_H, 0)}.
        </p>
        <p>
          Cloud bank: shades {pctPlain(HAZARD_SPEC.cloud.intensity * 100)} at its centre, {HAZARD_SPEC.cloud.radius} m
          radius, for {hours(HAZARD_SPEC.cloud.durationHours)}, then passes. It makes no repair work.
        </p>
        <p>Heatwave: {degC(HAZARD_SPEC.heatwave.intensity)} added to ambient across the whole site.</p>
        <p>Expected output is read off the site reference, so an array under a footprint shows as a shortfall. Scenario starts at {clockOf(epoch)}.</p>
      </div>
      {hazards.length > 0 && <button type="button" className="tool" onClick={clear}>Clear hazards</button>}
    </Blk>
  );
}
