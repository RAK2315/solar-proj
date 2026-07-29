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
 *
 * And it is B-17's output, about B-17. When an operator flies this same camera to
 * another array the brackets still frame the module the aircraft is over, but the
 * label does NOT claim a crack there — no classifier has been run on that array's
 * imagery.
 *
 * What it shows instead is what IS measured for it: the array's own deviation from
 * the model, right now. The first attempt printed "no classifier output for this
 * array", which is true and useless — a reticle that spends its one line of text
 * on what it does not know is worse than one that spends it on what it does. The
 * absence of a defect claim is the honesty; the detail rail carries the full
 * explanation under "no capture on file".
 */

import { confidence, pct } from '@/lib/format';
import { M, reticleRect } from '@/lib/scene';
import { useFlightCue } from '@/store/flightCue';
import { useCurrentFrame, useDetection } from '@/store/selectors';

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
  const cue = useFlightCue();
  const detection = useDetection();
  const frame = useCurrentFrame();

  const locked = cue.t >= M.lock;
  const scanned = cue.t >= M.rgb;

  const rect = reticleRect(cue.t, cue.target);
  if (!locked || !rect.visible) return null;

  const reading = frame.panels[cue.targetId];
  const label = cue.cracked
    ? (detection
      ? `${cue.targetId} · B2-07 — ${detection.label.toLowerCase()} suspected (${confidence(detection.confidence)})`
      : `${cue.targetId} · B2-07 — surface scan in progress`)
    : `${cue.targetId} — RGB + thermal pass · ${pct(reading?.deviationPct ?? 0)} vs expected`;

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
