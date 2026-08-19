'use client';

/**
 * LeftRail — live events, drone status, signal quality.
 *
 * The feed is a pure filter over the event source, so seeking backwards removes
 * rows rather than leaving them stuck.
 *
 * Signal quality is derived from the drone's mission state rather than animated.
 * A bar that jitters on its own timer would be a second clock, which is the thing
 * this project bans outright.
 *
 * LAYOUT. The feed scrolls and the two instrument blocks are pinned to the bottom
 * against a shared rule, the way a control-room strip is built: the thing that
 * changes gets the room, the thing that must always be visible gets an anchor.
 */

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import { pctPlain } from '@/lib/format';
import {
  useActiveMissions, useAllFeedEvents, useDroneState, useFeedEvents, useFeedFilter,
  useMode,
} from '@/store/selectors';
import { useSession, type FeedFilter } from '@/store/session';
import { EventCard } from './EventCard';

/** How many events the feed shows before VIEW ALL is needed. */
const FEED_PREVIEW = 6;

const FILTER_LABEL: Record<FeedFilter, string> = {
  all: 'ALL',
  warning: 'WARN+',
  critical: 'CRIT',
};

/** A titled instrument block in the pinned lower half. */
function Instrument({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
      <span className="t-h2" style={{ color: 'var(--text-secondary)' }}>{title}</span>
      {children}
    </div>
  );
}

/** Five wide cells. Coarse on purpose — this is a fuel gauge, not a percentage. */
function Cells({ value, colour }: { value: number; colour: string }) {
  const lit = Math.round((value / 100) * 5);
  return (
    <span className="seg" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <i
          key={i}
          style={{
            width: 13, height: 15,
            background: i < lit ? colour : 'var(--line-hairline)',
          }}
        />
      ))}
    </span>
  );
}

function DroneRow({ id, status, battery }: {
  id: string; status: string; battery: number;
}) {
  const active = status !== 'STANDBY';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 'var(--sp-2)',
    }}>
      <span className="t-data" style={{ color: 'var(--text-primary)' }}>
        {id}{' '}
        <span className="t-micro" style={{ color: active ? 'var(--sev-active)' : 'var(--text-secondary)' }}>
          {active ? status : 'DOCK'}
        </span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <Cells
          value={battery}
          colour={battery < 30 ? 'var(--sev-critical)'
            : active ? 'var(--sev-warning)' : 'var(--sev-active)'}
        />
        <span className="t-micro" style={{ color: 'var(--text-secondary)', minWidth: 34, textAlign: 'right' }}>
          {pctPlain(battery)}
        </span>
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
      className="area-left hair-r"
      style={{
        background: 'var(--surface-inset)',
        display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: 0,
      }}
    >
      <header className="panel hair-b" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 'var(--sp-2)', padding: 'var(--sp-3)',
      }}>
        <h2 className="t-h1" style={{ color: 'var(--text-primary)', margin: 0 }}>Live events</h2>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <button
            type="button"
            className="btn-reset t-micro"
            onClick={cycleFilter}
            aria-label={`Event severity filter: ${filter}. Click to change.`}
            style={{
              color: filter === 'all' ? 'var(--text-secondary)' : 'var(--sev-warning)',
              border: '1px solid var(--line-active)', padding: '2px 6px',
            }}
          >
            ⇄ {FILTER_LABEL[filter]}
          </button>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: 'var(--sev-active)',
            }} aria-hidden />
            <span className="t-micro" style={{ color: 'var(--sev-active)' }}>SYNCED</span>
          </span>
        </span>
      </header>

      <div className="scroll-y" style={{ display: 'grid', alignContent: 'start' }}>
        <AnimatePresence initial={false}>
          {shown.map((e) => <EventCard key={e.id} event={e} />)}
        </AnimatePresence>

        {visible.length === 0 && (
          <p className="t-data" style={{ color: 'var(--text-secondary)', padding: 'var(--sp-4)', margin: 0 }}>
            {filter === 'all'
              ? 'Monitoring. No events this cycle.'
              : `No ${filter}-or-above events. ${total} hidden by the filter.`}
          </p>
        )}

        {visible.length > FEED_PREVIEW && (
          <button
            type="button"
            className="btn-reset t-micro"
            onClick={() => setShowAll((v) => !v)}
            style={{
              color: 'var(--sev-active)', padding: 'var(--sp-3)', textAlign: 'left',
              borderBottom: '1px solid var(--line-hairline)',
            }}
          >
            {showAll ? '↑ SHOW FEWER' : `VIEW ALL ${visible.length} EVENTS →`}
          </button>
        )}
      </div>

      <div className="panel hair-t" style={{
        padding: 'var(--sp-4) var(--sp-3)', display: 'grid', gap: 'var(--sp-4)',
      }}>
        <Instrument title="Drone status">
          <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
            <DroneRow id="DRONE 01" status={drone.status} battery={drone.batteryPct} />
            <DroneRow id="DRONE 02" status="STANDBY" battery={100} />
          </div>
        </Instrument>

        <Instrument title="Comms signal">
          <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
            {([['UP', uplink], ['DOWN', downlink]] as const).map(([label, v]) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
              }}>
                <span className="t-micro" style={{ color: 'var(--text-secondary)', minWidth: 34 }}>
                  {label}
                </span>
                {/* A rising staircase rather than equal cells: a link meter is read
                    as "how many bars", and equal bars make 3/5 and 4/5 look alike. */}
                <span aria-hidden style={{
                  display: 'flex', alignItems: 'flex-end', gap: 2, height: 18, flex: 1,
                }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} style={{
                      width: 13, height: `${(i + 1) * 20}%`,
                      background: i < Math.round((v / 100) * 5)
                        ? 'var(--sev-active)' : 'var(--line-hairline)',
                    }} />
                  ))}
                </span>
                <span className="t-micro" style={{ color: 'var(--sev-active)' }}>
                  {pctPlain(v)}
                </span>
              </div>
            ))}
            <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
              LINK {active ? 'C2 · 2.4 GHz' : 'IDLE'} · SYSTEM STATUS NOMINAL
            </span>
          </div>
        </Instrument>
      </div>
    </aside>
  );
}
