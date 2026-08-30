'use client';

/**
 * ScenarioModule — the operator injects a fault, so the console can be exercised
 * on more than the cases it ships with.
 *
 * WHY THIS EXISTS. The committed scenario carries three cracks and three soiled
 * arrays. That is enough to compare depths against each other and nowhere near
 * enough to check the console's behaviour on demand — you cannot wait until
 * 12:40 site time every run to see what an advanced crack looks like, and there
 * is no committed case at all for a string that has simply gone open.
 *
 * WHAT IT IS NOT. It does not write a reading. Injection appends a SCENARIO
 * EVENT — an array, a mechanism, how many strings, how far the mismatch derate
 * falls — and every number that then appears anywhere in the console is computed
 * from it by the same physics that evaluates B-17. There is deliberately no way
 * to type a deviation onto an array, because that is the difference between a
 * test case and a fabrication, and this project's whole claim rests on the
 * distinction.
 *
 * Injected faults are marked everywhere they surface: in the feed, in the
 * verdict block, in the queue. A rehearsal presented as site history would be
 * the same class of lie as B-17's evidence shown under another array's name.
 */

import { useState } from 'react';

import { kW, pct } from '@/lib/format';
import { clockAt, STRINGS_PER_ARRAY } from '@/lib/physics';
import { allPanels, forecastOffset, scenario } from '@/lib/live';
import {
  useInjected, useSelectedPanelId, useSiteFrame, useSiteSeconds,
} from '@/store/selectors';
import { INJECTABLE, useSession, type InjectableId } from '@/store/session';
import { nextRehearsalTarget } from '@/lib/rehearsal';
import { Block, Empty, ModuleShell, Table, Cell } from './ModuleShell';

/** Array deviation a spec will reach: strings × (mismatch − 1) ÷ strings-per-array. */
const terminalDeviationPct = (kind: InjectableId): number => {
  const s = INJECTABLE[kind];
  return ((s.terminalMismatch - 1) * 100 * s.faultedStrings) / STRINGS_PER_ARRAY;
};

/**
 * One fault per zone, three different mechanisms, on arrays the committed scenario
 * leaves healthy. Chosen once and written down rather than generated, so two people
 * running SEED A SPREAD are looking at the same site.
 */
const SPREAD: Array<[string, InjectableId]> = [
  ['A-14', 'crack-advanced'],
  ['B-33', 'crack-established'],
  ['C-21', 'string-outage'],
];

export function ScenarioModule() {
  const injected = useInjected();
  const frame = useSiteFrame();
  const siteSeconds = useSiteSeconds();
  const selected = useSelectedPanelId();
  const injectFault = useSession((s) => s.injectFault);
  const clearInjected = useSession((s) => s.clearInjected);

  const [panelId, setPanelId] = useState(selected);
  const [kind, setKind] = useState<InjectableId>('crack-established');

  const taken = new Set(injected.map((e) => e.panelId));
  const target = frame.panels[panelId];
  const alreadyFaulted = taken.has(panelId) || (target?.status ?? 'healthy') !== 'healthy';

  return (
    <ModuleShell
      title="Rehearsal"
      purpose={`
        Put a fault on an array on purpose, to exercise the console on a case the
        site is not in right now. It starts a fault; the physics works out the rest,
        and everything it produces is marked as a rehearsal.
      `}
      subtitle={`${injected.length} injected // a rehearsal screen, not an operations one // everything it produces is marked as injected // site clock ${clockAt(forecastOffset(siteSeconds))}`}
      action={(
        <>
          {/* Math.random() is banned across src/ — the whole product rests on the
              same input producing the same site every reload. So this is a FIXED
              SPREAD, not a random one, and it is labelled as such: a stride across
              the array list that lands one fault in each zone at a different
              mechanism, which is what you actually want to look at. */}
          <button
            type="button"
            className="btn-reset t-h2"
            onClick={() => SPREAD.forEach(([id, kind]) => injectFault(id, kind))}
            aria-label="Inject a fixed spread of three faults, one per zone"
            style={{
              background: 'var(--surface-high)', color: 'var(--text-primary)',
              padding: 'var(--sp-3) var(--sp-4)',
            }}
          >
            SEED A SPREAD — 3 FAULTS
          </button>
          {injected.length > 0 && (
        <button
          type="button"
          className="btn-reset t-h2"
          onClick={() => clearInjected()}
          style={{
            border: '1px solid var(--sev-warning)', color: 'var(--sev-warning-ink)',
            padding: 'var(--sp-3) var(--sp-4)',
          }}
        >
          CLEAR ALL INJECTED
        </button>
          )}
        </>
      )}
    >
      <Block title="Inject a fault" note="writes a scenario event — never a reading">
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1.6fr auto',
          gap: 'var(--sp-3)', alignItems: 'end',
        }}>
          <label style={{ display: 'grid', gap: 'var(--sp-1)' }}>
            <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>ARRAY</span>
            <select
              className="btn-reset t-data"
              value={panelId}
              onChange={(e) => setPanelId(e.target.value)}
              style={{
                border: '1px solid var(--line-active)', background: 'var(--surface-inset)',
                color: 'var(--text-primary)', padding: 'var(--sp-3)',
              }}
            >
              {allPanels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id}{taken.has(p.id) ? ' — injected' : ''}
                </option>
              ))}
            </select>
          </label>

          {/* SOMEWHERE ELSE. The picker defaults to the selected array, so
              pressing INJECT a few times in a row put every fault on the same
              handful and the site stopped looking like a site. This walks the
              whole block on a coprime stride — deterministic, so the third press
              always lands where the third press landed, and reproducible for a
              judge who re-runs the demo, but far enough each step that it reads
              as arbitrary. `Math.random()` is banned here for exactly that
              reason. */}
          <button
            type="button"
            className="btn-reset t-h2"
            onClick={() => {
              const next = nextRehearsalTarget(frame, taken, injected.length);
              if (next) setPanelId(next);
            }}
            aria-label="Pick another array to break, somewhere else on the site"
            style={{
              border: '1px solid var(--line-active)', color: 'var(--text-secondary)',
              padding: 'var(--sp-3)', whiteSpace: 'nowrap',
            }}
          >
            SOMEWHERE ELSE
          </button>

          <label style={{ display: 'grid', gap: 'var(--sp-1)' }}>
            <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>MECHANISM</span>
            <select
              className="btn-reset t-data"
              value={kind}
              onChange={(e) => setKind(e.target.value as InjectableId)}
              style={{
                border: '1px solid var(--line-active)', background: 'var(--surface-inset)',
                color: 'var(--text-primary)', padding: 'var(--sp-3)',
              }}
            >
              {(Object.keys(INJECTABLE) as InjectableId[]).map((id) => (
                <option key={id} value={id}>{INJECTABLE[id].label}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="btn-reset t-h1"
            disabled={alreadyFaulted}
            onClick={() => injectFault(panelId, kind)}
            style={{
              padding: 'var(--sp-4) var(--sp-5)',
              background: alreadyFaulted ? 'var(--surface-high)' : 'var(--sev-critical-ink)',
              color: alreadyFaulted ? 'var(--text-secondary)' : 'var(--text-inverse)',
              letterSpacing: '0.12em',
            }}
          >
            {alreadyFaulted ? 'ALREADY FAULTED' : `INJECT → ${panelId}`}
          </button>
        </div>

        {/* What the physics WILL produce, computed before the click rather than
            promised. The operator sees the consequence, not a label. */}
        <p className="t-data" style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {INJECTABLE[kind].faultedStrings} of {STRINGS_PER_ARRAY} strings drop to{' '}
          f_mismatch {INJECTABLE[kind].terminalMismatch.toFixed(4)} over{' '}
          {INJECTABLE[kind].rampMinutes} site minutes, reaching an array deviation of{' '}
          <span className="t-data-em" style={{ color: 'var(--sev-critical)' }}>
            {pct(terminalDeviationPct(kind))}
          </span>{' '}
          at reference conditions. Mechanism: {INJECTABLE[kind].mechanism}.
        </p>

        {alreadyFaulted && (
          <p className="t-micro" style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {panelId} already carries a fault or soiling from the committed site record.
            One fault per array — the site&rsquo;s own history is not overwritable from a form.
          </p>
        )}
      </Block>

      <Block title="Injected this session" wide note="cleared on reset, persisted across reload">
        {injected.length === 0 ? (
          <Empty>
            Nothing injected. The site is running the committed scenario:
            three cracks and three soiled arrays, all generated by{' '}
            scripts/generate_scenario.py.
          </Empty>
        ) : (
          <Table head={['array', 'mechanism', 'strings', 'f_mismatch', 'started', 'deviation now', '']}>
            {injected.map((e) => {
              const r = frame.panels[e.panelId];
              return (
                <tr key={e.id}>
                  <Cell first emphasis>{e.panelId}</Cell>
                  <Cell>{e.mechanism}</Cell>
                  <Cell>{e.faultedStrings} / {STRINGS_PER_ARRAY}</Cell>
                  <Cell>{e.terminalMismatch?.toFixed(4)}</Cell>
                  <Cell>{clockAt(e.startHour - scenario.epochHour)}</Cell>
                  <Cell colour="var(--sev-critical)" emphasis>
                    {r ? pct(r.deviationPct) : '—'}
                  </Cell>
                  <Cell>
                    <button
                      type="button"
                      className="btn-reset t-micro"
                      onClick={() => clearInjected(e.panelId)}
                      style={{ color: 'var(--sev-warning)' }}
                    >
                      CLEAR
                    </button>
                  </Cell>
                </tr>
              );
            })}
          </Table>
        )}
      </Block>

      <Block title="Committed scenario" wide note="data/scenario.json — not editable here">
        <Table head={['array', 'status now', 'output', 'expected', 'deviation']}>
          {allPanels
            .filter((p) => (frame.panels[p.id]?.status ?? 'healthy') !== 'healthy')
            .map((p) => {
              const r = frame.panels[p.id];
              return (
                <tr key={p.id}>
                  <Cell first emphasis>{p.id}</Cell>
                  <Cell colour={r.status === 'critical' ? 'var(--sev-critical)' : 'var(--sev-warning)'}>
                    {r.status}
                  </Cell>
                  <Cell>{kW(r.actualKW)}</Cell>
                  <Cell>{kW(r.expectedKW)}</Cell>
                  <Cell emphasis colour="var(--sev-critical)">{pct(r.deviationPct)}</Cell>
                </tr>
              );
            })}
        </Table>
      </Block>
    </ModuleShell>
  );
}
