'use client';

/**
 * LiveTriage — the agent's reasoning about the array the operator selected.
 *
 * Demo mode has cached prose about B-17. Live mode has 120 arrays, so it asks the
 * model at request time, through /api/triage — which recomputes the facts from the
 * physics itself and runs the numeric cross-check before returning a word.
 *
 * THE THREE STATES ARE ALL VISIBLE, deliberately:
 *
 *   loading      the request is in flight, and it says so
 *   ready        the model's own reasoning, with its model ID and confidence
 *   unavailable  no key, no network, or the model would not stop inventing numbers
 *
 * That last one is the important one. It would be trivial to fall back to the cached
 * B-17 prose and have the panel always look full — and that prose would be about a
 * different array. Saying "unavailable" is the only honest option, so it is the one
 * that is built.
 */

import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';

import { hours, typographic } from '@/lib/format';
import { forecastOffset } from '@/lib/live';
import { clockAt } from '@/lib/physics';
import { useMode, useSelectedPanelId, useSiteSeconds } from '@/store/selectors';
import { useTriage } from '@/store/triage';

/** How far site time may move before the card's figures need a caveat. */
const STALE_AFTER_SITE_HOURS = 0.5;

/**
 * `compact` — the rail wants the verdict, the dossier wants the reasoning.
 *
 * The full card is a 5-line justified paragraph, a second paragraph, a provenance
 * line and a staleness warning. That is the right amount of detail to READ and the
 * wrong amount to GLANCE at, so the rail takes the first paragraph and the dossier
 * takes all of it.
 */
export function LiveTriage({ compact = false }: { compact?: boolean }) {
  const mode = useMode();
  const panelId = useSelectedPanelId();
  const siteSeconds = useSiteSeconds();
  const entry = useTriage((s) => s.byPanel[panelId]);
  const request = useTriage((s) => s.request);

  useEffect(() => {
    if (mode !== 'live') return;
    request(panelId, siteSeconds);
    // Intentionally not depending on siteSeconds: triage is a judgement about a
    // fault, not a per-tick reading. Re-requesting every frame would burn the rate
    // limit and make the prose flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, panelId, request]);

  if (mode !== 'live') return null;

  if (!entry || entry.status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: 'var(--sev-active)',
          animation: 'rec-pulse 1.2s steps(2, end) infinite',
        }} />
        <span className="t-data" style={{ color: 'var(--text-secondary)' }}>
          Triaging {panelId}…
        </span>
      </div>
    );
  }

  if (entry.status === 'unavailable') {
    return (
      <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <span className="chip" style={{ background: 'var(--sev-warning)' }}>
          AGENT UNAVAILABLE
        </span>
        <span className="t-data" style={{ color: 'var(--text-secondary)' }}>
          No reasoning for {panelId}. The telemetry above is unaffected — it comes from
          the site model, not the agent.
        </span>
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
          {entry.reason}
        </span>
      </div>
    );
  }

  const t = entry.triage;
  if (!t) return null;

  const elapsedHours = Math.max(0, (siteSeconds - (entry.requestedAt ?? siteSeconds)) / 3600);
  const stale = elapsedHours >= STALE_AFTER_SITE_HOURS;

  return (
    <article style={{
      border: '1px solid var(--sev-active)',
      background: 'color-mix(in srgb, var(--sev-active) 6%, var(--surface-panel))',
      padding: 'var(--sp-3)',
      display: 'grid', gap: 'var(--sp-2)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 'var(--sp-2)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} strokeWidth={2} aria-hidden style={{ color: 'var(--sev-active)' }} />
          <span className="t-h2" style={{ color: 'var(--sev-active)' }}>
            Triage · {panelId}
          </span>
        </span>
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
          {/* Triage runs once per array and the site keeps moving afterwards, so
              the readings above WILL drift away from the ones this paragraph was
              written about. That is correct behaviour and it reads as two systems
              contradicting each other unless the card says when it spoke. */}
          {entry.requestedAt !== undefined && (
            <>as at {clockAt(forecastOffset(entry.requestedAt))} · </>
          )}
          {entry.model}
        </span>
      </div>

      {stale && (
        <span className="t-micro" style={{ color: 'var(--sev-warning-ink)' }}>
          Site time has advanced {hours(elapsedHours)} since this ran. The numbers in
          State are current; the ones quoted here are from {clockAt(forecastOffset(entry.requestedAt ?? 0))}.
        </span>
      )}

      <p className="t-prose" style={{ color: 'var(--text-primary)', margin: 0 }}>
        {typographic(t.reasoning)}
      </p>

      {!compact && (
        <p className="t-prose" style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {typographic(t.verificationRationale)}
        </p>
      )}

      <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
        suspect {t.suspectComponent} · severity {t.severity} · confidence{' '}
        {t.confidence.toFixed(2)} · physical verification{' '}
        {t.requiresPhysicalVerification ? 'REQUIRED' : 'not required'}
      </span>

      {!compact && (
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
          Every number above was checked against this array&rsquo;s telemetry before it
          was shown.
        </span>
      )}
    </article>
  );
}
