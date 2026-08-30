'use client';

/**
 * DebugReadout — rehearsal instrument. Not part of the demo; toggled with `D`.
 *
 * It reads the clock and drives nothing. It exists so that "did that beat fire at
 * the right second?" is answerable by looking rather than by counting.
 */

import {
  CINEMATIC_IN, CINEMATIC_OUT, DEMO_DURATION, useDemoClock, useView, viewAt,
} from '@/store/demoClock';

const KEYS = 'SPACE play/pause · ←→ seek 5s · 1 2 3 speed · R reset · SHIFT+R full reset · C V view · D hide';

export function DebugReadout() {
  const t = useDemoClock((s) => s.t);
  const playing = useDemoClock((s) => s.playing);
  const speed = useDemoClock((s) => s.speed);
  const approved = useDemoClock((s) => s.approved);
  const viewOverride = useDemoClock((s) => s.viewOverride);
  const debug = useDemoClock((s) => s.debug);
  const toggleDebug = useDemoClock((s) => s.toggleDebug);
  const view = useView();

  if (!debug) return null;

  return (
    <div
      className="panel"
      style={{
        position: 'fixed', bottom: 12, right: 12, zIndex: 50,
        border: '1px solid var(--line-active)', padding: 'var(--sp-3)',
        minWidth: 320, display: 'grid', gap: 'var(--sp-2)', cursor: 'pointer',
      }}
      onClick={toggleDebug}
      title="click or press D to hide"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="t-kpi" style={{ fontSize: 26 }}>
          {t.toFixed(2)}
          <span className="t-kpi-unit" style={{ marginLeft: 4, color: 'var(--text-secondary)' }}>s</span>
        </span>
        <span
          className="t-h2"
          style={{ color: playing ? 'var(--sev-active)' : 'var(--text-muted)' }}
        >
          {playing ? '▶ PLAYING' : '❚❚ PAUSED'} · {speed}×
        </span>
      </div>

      {/* Scrub bar with the cinematic window marked, so both cuts are visible. */}
      <div style={{ position: 'relative', height: 6, background: 'var(--surface-inset)' }}>
        <div
          style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${(CINEMATIC_IN / DEMO_DURATION) * 100}%`,
            width: `${((CINEMATIC_OUT - CINEMATIC_IN) / DEMO_DURATION) * 100}%`,
            background: 'var(--line-active)',
          }}
        />
        <div
          style={{
            position: 'absolute', top: -2, bottom: -2, width: 2,
            left: `${(t / DEMO_DURATION) * 100}%`, background: 'var(--sev-critical)',
          }}
        />
      </div>

      <div
        className="t-data"
        style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0 var(--sp-3)' }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>view</span>
        <span>
          {view}
          {viewOverride && (
            <span style={{ color: 'var(--sev-warning)' }}> · forced (t implies {viewAt(t)})</span>
          )}
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>approved</span>
        <span style={{ color: approved ? 'var(--panel-scheduled)' : 'var(--text-muted)' }}>
          {String(approved)}
        </span>
      </div>

      <div className="t-micro" style={{ color: 'var(--text-muted)' }}>{KEYS}</div>
    </div>
  );
}
