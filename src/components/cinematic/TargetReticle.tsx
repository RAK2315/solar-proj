'use client';

/**
 * TargetReticle — corner brackets framing THE DAMAGED MODULE, and only it.
 *
 * The rect is projected from the module's own four corners using the same pure
 * camera the scene is rendered with (`reticleRect` in lib/scene.ts). The first cut
 * used a fixed screen box, which sat over four arrays at once — and a reticle that
 * frames four things while the caption names one is quietly telling the audience
 * the overlay is decoration. Now it tracks the module through the orbit.
 *
 * The confidence in the label is THE MODEL'S ACTUAL OUTPUT from b17_detection.json.
 * Until the Colab run lands there is no detection, so the label says what is true
 * at that moment rather than borrowing the spec's placeholder 0.84 — which
 * invariant I11 would fail the build over anyway.
 */

import { confidence } from '@/lib/format';
import { reticleRect } from '@/lib/scene';
import { BEAT, useAfter, useDemoClockT, useDetection } from '@/store/selectors';

const ARM = 30;

function Corner({ style }: { style: React.CSSProperties }) {
  return (
    <span aria-hidden style={{
      position: 'absolute', width: ARM, height: ARM,
      borderColor: 'var(--iron-80)', ...style,
    }} />
  );
}

export function TargetReticle() {
  const t = useDemoClockT();
  const locked = useAfter(BEAT.targetLock);
  const scanned = useAfter(BEAT.rgbScan);
  const detection = useDetection();

  const rect = reticleRect(t);
  if (!locked || !rect.visible) return null;

  const label = detection
    ? `B-17 · B2-07 — ${detection.label.toLowerCase()} suspected (${confidence(detection.confidence)})`
    : 'B-17 · B2-07 — surface scan in progress';

  return (
    <div
      style={{
        position: 'absolute',
        left: `${rect.left * 100}%`,
        top: `${rect.top * 100}%`,
        width: `${rect.width * 100}%`,
        height: `${rect.height * 100}%`,
        animation: 'reticle-breathe 2.4s ease-in-out infinite',
      }}
    >
      <Corner style={{ top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopStyle: 'solid', borderLeftStyle: 'solid' }} />
      <Corner style={{ top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopStyle: 'solid', borderRightStyle: 'solid' }} />
      <Corner style={{ bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomStyle: 'solid', borderLeftStyle: 'solid' }} />
      <Corner style={{ bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomStyle: 'solid', borderRightStyle: 'solid' }} />

      {/* Centre tick — reads as a sensor boresight rather than a selection box. */}
      <span aria-hidden style={{
        position: 'absolute', left: '50%', top: '50%', width: 1, height: 14,
        background: 'var(--iron-80)', transform: 'translate(-50%, -50%)', opacity: 0.7,
      }} />

      {scanned && (
        <span
          className="t-data-em"
          style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)', marginTop: 'var(--sp-3)',
            background: 'color-mix(in srgb, var(--surface-panel) 94%, transparent)',
            border: '1px solid var(--iron-80)',
            color: 'var(--iron-80)',
            padding: '5px var(--sp-3)',
            whiteSpace: 'nowrap',
            fontSize: 14,
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
