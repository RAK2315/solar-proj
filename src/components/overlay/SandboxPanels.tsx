'use client';

/**
 * The sandbox screen's rehearsal faults: break an array and watch the plan
 * re-derive.
 *
 * An injection writes a scenario event and nothing else. The array's reading,
 * status and place in the queue all come out of the same physics that evaluates
 * the committed faults, which is the difference between a test case and a fake.
 */

import { RotateCcw } from 'lucide-react';

import { clockOf } from '@/lib/format';
import { nextRehearsalTarget } from '@/lib/rehearsal';
import { useInjected, useScenarioEvents, useSiteFrame } from '@/store/selectors';
import { INJECTABLE, useSession, type InjectableId } from '@/store/session';
import { Blk } from './Block';

export function InjectPanel() {
  const frame = useSiteFrame();
  const injected = useInjected();
  const injectFault = useSession((s) => s.injectFault);
  const clearInjected = useSession((s) => s.clearInjected);
  const taken = new Set(injected.map((e) => e.panelId));
  const target = nextRehearsalTarget(frame, taken, injected.length + 1);
  return (
    <Blk b="inject" title={<>Rehearsal faults<span className="count num">{injected.length} active</span></>}>
      <p className="one">Test a fault signature on <span className="id">{target ?? 'no available array'}</span>. The selected fault develops on the site clock and joins the same repair queue.</p>
      <div className="inject">
        {(Object.keys(INJECTABLE) as InjectableId[]).map((kind) => (
          <button key={kind} type="button" className="tool" disabled={!target} onClick={() => target && injectFault(target, kind)}>
            {INJECTABLE[kind].label}
          </button>
        ))}
        <button type="button" className="tool" disabled={injected.length === 0} onClick={() => clearInjected()}>
          <RotateCcw size={18} strokeWidth={1.75} aria-hidden />Clear rehearsal faults
        </button>
      </div>
    </Blk>
  );
}

export function ScenarioPanel() {
  const events = useScenarioEvents();
  return (
    <Blk b="events" title="Scenario">
      <p className="one">Recorded fault mechanisms, plus your rehearsal injections. Weather hazards are explained separately in Scenario effects.</p>
      <ol className="events">
        {events.map((e) => (
          <li key={e.id}>
            <span className="num">{clockOf(e.startHour)}</span>
            <span className="id">{e.panelId}</span>
            <span className="says">{e.injected ? 'Rehearsal: ' : ''}{e.mechanism}</span>
          </li>
        ))}
      </ol>
    </Blk>
  );
}
