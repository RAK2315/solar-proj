'use client';

/**
 * TargetReticle — four corner brackets over the inspected panel, with a label tab.
 *
 * The confidence in the label is THE MODEL'S ACTUAL OUTPUT, read from
 * b17_detection.json. Until the Colab run lands there is no detection, and the
 * label says what is actually true at that moment — "surface scan in progress" —
 * rather than borrowing the spec's placeholder 0.84. Invariant I11 fails the build
 * if that number ever appears without having been measured.
 *
 * The reticle itself appears at target lock; the label only once the RGB pass has
 * produced something to claim.
 */

import { confidence } from '@/lib/format';
import { BEAT, useAfter, useDetection } from '@/store/selectors';

/** Screen-space box over the panel. Matches where the plate's subject sits. */
const BOX = { left: '36%', top: '30%', width: '28%', height: '34%' };
const ARM = 34;

function Corner({ style }: { style: React.CSSProperties }) {
  return (
    <span aria-hidden style={{
      position: 'absolute', width: ARM, height: ARM,
      borderColor: 'var(--iron-80)', ...style,
    }} />
  );
}

export function TargetReticle() {
  const locked = useAfter(BEAT.targetLock);
  const scanned = useAfter(BEAT.rgbScan);
  const detection = useDetection();

  if (!locked) return null;

  const label = detection
    ? `B-17 — ${detection.label.toLowerCase()} suspected (${confidence(detection.confidence)})`
    : 'B-17 — surface scan in progress';

  return (
    <div style={{ position: 'absolute', ...BOX, animation: 'reticle-breathe 2.4s ease-in-out infinite' }}>
      <Corner style={{ top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopStyle: 'solid', borderLeftStyle: 'solid' }} />
      <Corner style={{ top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopStyle: 'solid', borderRightStyle: 'solid' }} />
      <Corner style={{ bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomStyle: 'solid', borderLeftStyle: 'solid' }} />
      <Corner style={{ bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomStyle: 'solid', borderRightStyle: 'solid' }} />

      {scanned && (
        <span
          className="t-data-em"
          style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 'var(--sp-2)',
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
