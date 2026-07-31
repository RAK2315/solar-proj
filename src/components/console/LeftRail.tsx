'use client';

/**
 * LeftRail — live events, drone status, signal quality.
 *
 * The feed is a pure filter over events.json, so seeking backwards removes rows
 * rather than leaving them stuck.
 *
 * Signal quality is derived from the drone's mission state rather than animated.
 * A bar that jitters on its own timer would be a second clock, which is the thing
 * this project bans outright.
 */

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import { num, pctPlain } from '@/lib/format';
import {
  useActiveMissions, useAllFeedEvents, useDroneState, useFeedEvents, useFeedFilter,
  useMode,
} from '@/store/selectors';
import { useSession, type FeedFilter } from '@/store/session';
import { EventCard } from './EventCard';

/** Segmented meter. Ten discrete cells read as an instrument; a smooth bar does not. */
function Meter({ value, colour = 'var(--sev-active)' }: { value: number; colour?: string }) {
  const lit = Math.round((value / 100) * 10);
  return (
    <span className="seg" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} data-on={i < lit ? 1 : 0} style={i < lit ? { background: colour } : undefined} />
      ))}
    </span>
  );
}

function Section({ title, action, children }: {
  title: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section style={{ display: 'grid', gap: 'var(--sp-3)', minHeight: 0 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        borderBottom: '1px solid var(--line-hairline)', paddingBottom: 'var(--sp-2)',
      }}>
        <h2 className="t-h1" style={{ color: 'var(--text-primary)' }}>
          <span style={{ color: 'var(--sev-active)', marginRight: 6 }}>●</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** How many events the feed shows before VIEW ALL is needed. */
const FEED_PREVIEW = 6;

const FILTER_LABEL: Record<FeedFilter, string> = {
  all: '⇄ ALL',
  warning: '⇄ WARNING+',
  critical: '⇄ CRITICAL',
};

function DroneRow({ id, status, battery, pad }: {
  id: string; status: string; battery: number; pad: string;
}) {
  const active = status !== 'STANDBY';
  return (
    <div style={{ display: 'grid', gap: 3 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <span className="t-data-em" style={{ minWidth: 62 }}>{id}</span>
        <span
          className="badge"
          style={{ color: active ? 'var(--sev-active)' : 'var(--text-muted)', borderColor: 'var(--line-active)' }}
        >
          {status}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <Meter value={battery} colour={battery < 20 ? 'var(--sev-critical)' : 'var(--sev-active)'} />
          <span className="t-data" style={{ color: 'var(--text-secondary)', minWidth: 38, textAlign: 'right' }}>
            {pctPlain(battery)}
          </span>
        </span>
      </div>
      <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
        {active ? 'IN FLIGHT' : 'IDLE'} · {pad}
      </span>
    </div>
  );
}

export function LeftRail() {
  const mode = useMode();
  const visible = useFeedEvents();
  const total = useAllFeedEvents().length;
  const filter = useFeedFilter();
  const cycleFilter = useSession((s) => s.cycleFeedFilter);
  const [showAll, setShowAll] = useState(false);
  const demoDrone = useDroneState();
  const missions = useActiveMissions();

  // A view preference over a derived list — not demo content. The seek-backwards
  // guarantee is about state that MIRRORS the clock; how many rows the operator
  // wants visible is theirs and survives a seek unchanged, which is correct.
  const shown = showAll ? visible : visible.slice(0, FEED_PREVIEW);

  // Live mode reports the drones that are actually flying; demo mode reports the
  // scripted one.
  const drone = mode === 'demo'
    ? demoDrone
    : {
      status: (missions[0]?.phase === 'returning' ? 'RETURNING'
        : missions.length > 0 ? 'ACTIVE' : 'STANDBY') as 'STANDBY' | 'ACTIVE' | 'RETURNING',
      batteryPct: missions.length > 0 ? 88 - 12 * (missions[0]?.progress ?? 0) : 100,
      padId: 'PAD-01',
    };

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
      <Section
        title="Live events"
        action={(
          <button
            type="button"
            className="btn-reset t-micro"
            onClick={cycleFilter}
            aria-label={`Event severity filter: ${filter}. Click to change.`}
            style={{ color: filter === 'all' ? 'var(--text-muted)' : 'var(--sev-warning)' }}
          >
            {FILTER_LABEL[filter]}
          </button>
        )}
      >
        <div style={{
          display: 'grid', gap: 'var(--sp-2)', overflowY: 'auto',
          minHeight: 0, alignContent: 'start',
        }}>
          <AnimatePresence initial={false}>
            {shown.map((e) => <EventCard key={e.id} event={e} />)}
          </AnimatePresence>
          {visible.length === 0 && (
            <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
              {filter === 'all'
                ? 'Monitoring. No events this cycle.'
                : `No ${filter}-or-above events. ${total} hidden by the filter.`}
            </span>
          )}
          {visible.length > FEED_PREVIEW && (
            <button
              type="button"
              className="btn-reset t-micro"
              onClick={() => setShowAll((v) => !v)}
              style={{ color: 'var(--text-muted)', paddingTop: 'var(--sp-2)', textAlign: 'left' }}
            >
              {showAll
                ? '↑ SHOW FEWER'
                : `VIEW ALL ${visible.length} EVENTS →`}
            </button>
          )}
        </div>
      </Section>

      <Section title="Drone status">
        <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
          <DroneRow id="DRONE 01" status={drone.status} battery={drone.batteryPct} pad={drone.padId} />
          <DroneRow id="DRONE 02" status="STANDBY" battery={100} pad="PAD-02" />
        </div>
      </Section>

      <Section title="Signal quality">
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          {([['Uplink', uplink], ['Downlink', downlink]] as const).map(([label, v]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <span className="t-data" style={{ color: 'var(--text-secondary)', minWidth: 66 }}>
                {label}
              </span>
              <Meter value={v} />
              <span className="t-data" style={{ color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                {pctPlain(v)}
              </span>
            </div>
          ))}
          <span className="t-micro" style={{ color: 'var(--sev-active)' }}>
            SYSTEM STATUS NOMINAL
          </span>
          <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
            LINK {active ? 'C2 · 2.4 GHz' : 'IDLE'} · LAT {num(active ? 41 : 12, 0)} ms
          </span>
        </div>
      </Section>
    </aside>
  );
}
