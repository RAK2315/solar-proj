'use client';

/**
 * LeftRail — live events, drone status, signal quality.
 *
 * EventFeed is newest-first and grows as `t` advances. It is a pure filter over
 * events.json, so seeking backwards removes rows rather than leaving them stuck.
 *
 * Signal quality is the one piece of decorative chrome in the console. It is
 * derived from the drone's mission state rather than animated, because a bar that
 * jitters on its own timer would be a second clock — the thing this project bans.
 */

import { AnimatePresence } from 'framer-motion';

import { num, pctPlain } from '@/lib/format';
import { useDroneState, useVisibleEvents } from '@/store/selectors';
import { EventCard } from './EventCard';

function RailSection({ title, children, note }: {
  title: string; children: React.ReactNode; note?: string;
}) {
  return (
    <section style={{ display: 'grid', gap: 'var(--sp-2)', minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 className="t-h1" style={{ color: 'var(--text-secondary)' }}>{title}</h2>
        {note && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Bar({ label, value, colour = 'var(--sev-active)' }: {
  label: string; value: number; colour?: string;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 44px', gap: 'var(--sp-2)', alignItems: 'center' }}>
      <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ height: 4, background: 'var(--surface-inset)', display: 'block' }}>
        <span style={{
          display: 'block', height: '100%', width: `${value}%`, background: colour,
          transition: 'width 200ms linear',
        }} />
      </span>
      <span className="t-data" style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>
        {pctPlain(value)}
      </span>
    </div>
  );
}

export function LeftRail() {
  const visible = useVisibleEvents();
  const drone = useDroneState();

  const active = drone.status !== 'STANDBY';
  const uplink = active ? 92 : 74;
  const downlink = active ? 89 : 71;

  return (
    <aside
      className="area-left panel hair-r"
      style={{
        display: 'grid', gridTemplateRows: '1fr auto auto',
        gap: 'var(--sp-4)', padding: 'var(--sp-4) var(--sp-3)', minHeight: 0,
      }}
    >
      <RailSection title="Live events" note={`${visible.length}`}>
        <div style={{ display: 'grid', gap: 'var(--sp-2)', overflowY: 'auto', minHeight: 0, alignContent: 'start' }}>
          <AnimatePresence initial={false}>
            {visible.map((e) => <EventCard key={e.id} event={e} />)}
          </AnimatePresence>
          {visible.length === 0 && (
            <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
              Monitoring. No events this cycle.
            </span>
          )}
        </div>
      </RailSection>

      <RailSection title="Drone status">
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="t-data-em">DRONE 01</span>
            <span
              className="t-h2"
              style={{ color: active ? 'var(--sev-active)' : 'var(--text-muted)' }}
            >
              {drone.status}
            </span>
          </div>
          <Bar label="BATT" value={drone.batteryPct} colour={
            drone.batteryPct < 20 ? 'var(--sev-critical)' : 'var(--sev-active)'
          } />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="t-micro" style={{ color: 'var(--text-muted)' }}>PAD</span>
            <span className="t-data" style={{ color: 'var(--text-secondary)' }}>{drone.padId}</span>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginTop: 'var(--sp-2)', paddingTop: 'var(--sp-2)',
            borderTop: '1px solid var(--line-hairline)',
          }}>
            <span className="t-data-em" style={{ color: 'var(--text-secondary)' }}>DRONE 02</span>
            <span className="t-h2" style={{ color: 'var(--text-muted)' }}>STANDBY</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="t-micro" style={{ color: 'var(--text-muted)' }}>PAD</span>
            <span className="t-data" style={{ color: 'var(--text-muted)' }}>PAD-02</span>
          </div>
        </div>
      </RailSection>

      <RailSection title="Signal quality">
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          <Bar label="UP" value={uplink} />
          <Bar label="DN" value={downlink} />
          <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
            LINK {active ? 'C2 · 2.4 GHz' : 'IDLE'} · LAT {num(active ? 41 : 12, 0)} ms
          </span>
        </div>
      </RailSection>
    </aside>
  );
}
