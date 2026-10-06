'use client';

/**
 * The live event feed: the newest things that actually happened on the site.
 *
 * Derived from site time, missions and work orders, so scrubbing the clock back
 * un-happens them. The severity filter is a view control and nothing else.
 */

import { eventCase } from '@/lib/format';
import { useFeedEvents, useFeedFilter } from '@/store/selectors';
import { useSession } from '@/store/session';

const SHOWN = 3;
const FILTER_LABEL = { all: 'All', warning: 'Warnings', critical: 'Critical' } as const;
const FALLBACK_LINE = {
  webgl: 'This browser cannot draw the 3D field. Showing the 2D map.',
  fps: 'The 3D field fell below 30 frames a second. Showing the 2D map.',
} as const;

const sevOf = (s: string) => (s === 'active' ? 'scheduled' : s);

export function FeedPanel() {
  const events = [...useFeedEvents()].sort((a, b) => b.t - a.t).slice(0, SHOWN);
  const filter = useFeedFilter();
  const cycle = useSession((s) => s.cycleFeedFilter);
  const select = useSession((s) => s.selectPanel);
  const fallback = useSession((s) => s.twinFallback);

  return (
    <section className="blk glass sy-feed" data-b="feed" data-sev={events[0] ? sevOf(events[0].severity) : undefined}>
      <header className="blk-hd">
        <h2>Live events</h2>
        <button type="button" className="tool" aria-label={`Event filter: ${FILTER_LABEL[filter]}. Change it`} onClick={cycle}>
          {FILTER_LABEL[filter]}
        </button>
      </header>
      <div className="blk-bd">
        {fallback && <p className="one" role="status">{FALLBACK_LINE[fallback]}</p>}
        {events.length === 0 ? (
          <p className="empty">Nothing at this severity yet. Events appear as the site runs.</p>
        ) : (
          <ol className="feed">
            {events.map((e) => (
              <li key={e.id} data-sev={sevOf(e.severity)}>
                <span className="num">{e.timestamp}</span>
                {e.linkedPanelId ? (
                  <button type="button" className="ttl" onClick={() => select(e.linkedPanelId ?? null)}>
                    <i className="dot" />{eventCase(e.title)}
                  </button>
                ) : <span className="ttl"><i className="dot" />{eventCase(e.title)}</span>}
                <span className="says" title={e.body}>{e.body}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
