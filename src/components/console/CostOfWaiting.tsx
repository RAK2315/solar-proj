'use client';

/**
 * CostOfWaiting — fix it now, in six hours, tomorrow, or in three days.
 *
 * THE ONE MOMENT THE PRODUCT EARNS ITS NAME. Everything else on this screen
 * describes the present: the array is down, here is the photograph, here is the
 * hot band. A good monitoring system and a camera can do all of that. None of it
 * answers the question an operator is actually holding, which is not whether to
 * fix this but WHEN — against four other jobs, two crews and a hot week.
 *
 * So the operator picks a moment and the console says what that moment costs.
 * The figures come from `src/lib/defer.ts`: the array's own shortfall integrated
 * across the committed forecast curve, and past the computed deadline, the
 * declared change of mechanism — a failed bypass diode opens the strings instead
 * of derating them, so the cost per hour steps up and stays up.
 *
 * WHY THE BARS ARE NOT A CHART LIBRARY. Four values, one of which is zero by
 * definition. A charting component here would bring axes, a legend, a tooltip and
 * a responsive container to render four rectangles, and the reading an operator
 * takes is comparative rather than quantitative — this one is twice that one.
 * Plain divs, widths as percentages of the worst case.
 *
 * THE BREACH IS DRAWN, NOT ANNOTATED. An option past the deadline is a different
 * colour and carries the consequence in words, because a red bar with no sentence
 * is a mood rather than an argument.
 */

import { useState } from 'react';
import { Clock } from 'lucide-react';

import { MWh, hours } from '@/lib/format';
import { type DeferOutcome } from '@/lib/defer';

function Bar({ outcome, worst, selected, onSelect }: {
  outcome: DeferOutcome;
  worst: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const width = worst > 0 ? Math.max(1.5, (outcome.lostMWh / worst) * 100) : 0;
  // Of the bar, the portion that accrues after the diode has failed. Drawn as a
  // separate segment so the step is visible as a change in KIND, not just size.
  const afterPct = outcome.lostMWh > 0
    ? (outcome.afterBreachMWh / outcome.lostMWh) * 100
    : 0;

  const colour = outcome.breaches ? 'var(--sev-critical)' : 'var(--sev-warning)';

  return (
    <button
      type="button"
      className="btn-reset"
      onClick={onSelect}
      aria-label={`Repair ${outcome.label.toLowerCase()} — ${MWh(outcome.lostMWh)} lost`}
      aria-pressed={selected}
      style={{
        display: 'grid', gridTemplateColumns: '86px 1fr auto', alignItems: 'center',
        gap: 'var(--sp-3)', width: '100%', textAlign: 'left',
        padding: '5px var(--sp-2)',
        background: selected ? 'var(--surface-raised)' : 'transparent',
        borderLeft: `2px solid ${selected ? colour : 'transparent'}`,
      }}
    >
      <span
        className="t-data"
        style={{ color: selected ? 'var(--text-primary)' : 'var(--text-secondary)' }}
      >
        {outcome.label}
      </span>

      <span style={{ display: 'block', height: 14, background: 'var(--surface-inset)' }}>
        <span style={{ display: 'flex', height: '100%', width: `${width}%` }}>
          <span style={{ flex: `1 1 ${100 - afterPct}%`, background: 'var(--sev-warning)' }} />
          {afterPct > 0 && (
            <span style={{ flex: `1 1 ${afterPct}%`, background: 'var(--sev-critical)' }} />
          )}
        </span>
      </span>

      <span className="t-data-em" style={{ color: outcome.breaches ? colour : 'var(--text-primary)' }}>
        {MWh(outcome.lostMWh)}
      </span>
    </button>
  );
}

export function CostOfWaiting({ outcomes, hoursUntilDeadline }: {
  outcomes: DeferOutcome[];
  hoursUntilDeadline: number | null;
}) {
  const [selectedId, setSelectedId] = useState('now');

  // Nothing to weigh up on an array that is not losing anything. Absent rather
  // than a row of zeroes — a chart of nothing is still a claim that there was
  // something worth charting.
  const worst = Math.max(...outcomes.map((o) => o.lostMWh));
  if (!(worst > 0.001)) return null;

  const selected = outcomes.find((o) => o.id === selectedId) ?? outcomes[0];
  const now = outcomes[0];

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
      <div style={{ display: 'grid', gap: 2 }}>
        {outcomes.map((o) => (
          <Bar
            key={o.id}
            outcome={o}
            worst={worst}
            selected={o.id === selectedId}
            onSelect={() => setSelectedId(o.id)}
          />
        ))}
      </div>

      {/* The consequence, in words, for whatever the operator just picked. This is
          the sentence the whole component exists to produce. */}
      <p className="t-prose" style={{
        color: 'var(--text-primary)', margin: 0, fontSize: 13, lineHeight: 1.5,
      }}>
        {selected.id === now.id ? (
          <>
            Fixing it now still costs {MWh(selected.lostMWh)} — the energy already gone
            while a crew gets there.
          </>
        ) : (
          <>
            Waiting until <strong>{selected.label.toLowerCase()}</strong> costs a further{' '}
            <strong style={{ color: selected.breaches ? 'var(--sev-critical-ink)' : 'var(--sev-warning-ink)' }}>
              {MWh(selected.extraMWh)}
            </strong>
            {selected.breaches ? (
              <>
                {' '}— and it crosses the deadline. Past that point the bypass diode is
                projected to fail, which opens the affected strings instead of derating
                them: {MWh(selected.afterBreachMWh)} of that total accrues at the higher
                rate, and the loss does not come back when the panel cools.
              </>
            ) : (
              '.'
            )}
          </>
        )}
      </p>

      <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
        {hoursUntilDeadline !== null && Number.isFinite(hoursUntilDeadline)
          ? `Deadline in ${hours(hoursUntilDeadline)} — computed from cumulative thermal dose, `
            + 'not looked up. Red is loss after the diode fails, a declared mechanism.'
          : 'No propagation deadline for this array; waiting costs more, linearly.'}
      </span>
    </div>
  );
}

/** The control's own heading, used where the rail needs one. */
export function CostOfWaitingHeading() {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Clock size={13} strokeWidth={2} aria-hidden style={{ color: 'var(--sev-warning)' }} />
      <span className="t-h2" style={{ color: 'var(--sev-warning)' }}>What waiting costs</span>
    </span>
  );
}
