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
import { clockOf, degC, hours, num, pctPlain } from '@/lib/format';
import { DUST_WASH_WINDOW_H, HAZARD_SPEC, type HazardKind } from '@/lib/hazard';
import {
  useHazardImpact, useHazards, useHeatwaveC, useScenarioEpochHour, useSiteFrame,
} from '@/store/selectors';
import { useSession } from '@/store/session';
import { Blk, Why } from './Block';

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
  const flat = useSession((s) => s.twinFallback !== null);
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
            <Icon size={18} strokeWidth={1.75} aria-hidden />{HAZARD_SPEC[id].label}
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

const WHAT: Record<HazardKind, string> = {
  dust: 'soiling until washed',
  cloud: 'shading, then it passes',
  heatwave: 'site-wide ambient',
};

/** The hazards in force, each removable, with what each one is declared to do. */
export function HazardsPanel() {
  const hazards = useHazards();
  const remove = useSession((s) => s.removeHazard);
  const clear = useSession((s) => s.clearHazards);
  const epoch = useScenarioEpochHour();

  return (
    <Blk
      b="hazards"
      title={<>Hazards<span className="count num">{hazards.length} dropped</span></>}
      aside={<Why />}
    >
      {hazards.length === 0 ? (
        <p className="empty well">None yet. Pick one from the palette and drop it on the field to see the plan re-derive.</p>
      ) : (
        <ol className="events hazards">
          {hazards.map((h) => (
            <li key={h.id} data-sev={h.kind === 'cloud' ? undefined : 'warning'}>
              <span className="num">{clockOf(h.startHour)}</span>
              <span className="says"><b>{HAZARD_SPEC[h.kind].label}</b>, {WHAT[h.kind]}</span>
              <button type="button" className="why" aria-label={`Remove the ${HAZARD_SPEC[h.kind].label.toLowerCase()} dropped at ${clockOf(h.startHour)}`} onClick={() => remove(h.id)}>
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ol>
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
        <p>Heatwave: {degC(HAZARD_SPEC.heatwave.intensity, 0)} added to ambient across the whole site.</p>
        <p>Expected output is read off the site reference, so an array under a footprint shows as a shortfall. Scenario starts at {clockOf(epoch)}.</p>
      </div>
      {hazards.length > 0 && <button type="button" className="tool" onClick={clear}>Clear hazards</button>}
    </Blk>
  );
}
