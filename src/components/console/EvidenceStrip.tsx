'use client';

/**
 * EvidenceStrip — thermal + RGB thumbnails, inverter audio, flyover clip.
 *
 * plan/04 §4: PRESENT SLOTS RENDER, ABSENT SLOTS ARE ABSENT. Never a placeholder
 * box and never a stub file. Until the Colab run lands, the RGB thumbnail simply
 * does not appear — which is honest, and which keeps the console presentable at
 * every phase rather than only at the end.
 *
 * The reveal beats come from the demo script; whether the file exists comes from
 * the evidence manifest. A slot needs both.
 */

import { confidence } from '@/lib/format';
import { useDetection, useEvidence } from '@/store/selectors';

function Thumb({ src, label, caption }: { src: string; label: string; caption?: string }) {
  return (
    <figure style={{ margin: 0, display: 'grid', gap: 3, minWidth: 0 }}>
      <div style={{
        border: '1px solid var(--line-active)', background: 'var(--surface-inset)',
        aspectRatio: '4 / 3', overflow: 'hidden', display: 'grid', placeItems: 'center',
      }}>
        {/* Static committed artefacts, not remote images — next/image would add a
            loader for files that are already local and already sized. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label}
          style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
      </div>
      <figcaption className="t-micro" style={{ color: 'var(--text-muted)' }}>
        {label}{caption && <span style={{ color: 'var(--text-secondary)' }}> · {caption}</span>}
      </figcaption>
    </figure>
  );
}

export function EvidenceStrip() {
  const evidence = useEvidence();
  const detection = useDetection();

  const thumbs = [
    evidence.thermal && { src: evidence.thermal, label: 'THERMAL', caption: 'ironbow' },
    (evidence.rgbAnnotated || evidence.rgb) && {
      src: (evidence.rgbAnnotated || evidence.rgb)!,
      label: 'RGB',
      // The confidence is whatever the model returned. Never rounded up, and
      // invariant I11 rejects the spec's placeholder 0.84 by name.
      caption: detection ? `${detection.label} ${confidence(detection.confidence)}` : undefined,
    },
  ].filter(Boolean) as Array<{ src: string; label: string; caption?: string }>;

  if (!thumbs.length && !evidence.audio && !evidence.flyover) return null;

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
      {thumbs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${thumbs.length}, 1fr)`, gap: 'var(--sp-3)' }}>
          {thumbs.map((t) => <Thumb key={t.label} {...t} />)}
        </div>
      )}

      {/* WHAT THE RGB FRAME ACTUALLY IS. The detection is real, on an image the
          model never saw — but the source dataset is ground-level photography, so
          the frame is a panel on a floor with the photographer's shoes in it, not
          an aerial capture of Bhadla. Presenting it as drone imagery would be the
          one unforced error in an evidence panel built entirely around declared
          provenance, and it is the first thing anyone will notice. Say it first. */}
      {(evidence.rgb || evidence.rgbAnnotated) && detection && (
        <p className="t-micro" style={{ color: 'var(--text-muted)', margin: 0 }}>
          RGB frame is a <strong style={{ color: 'var(--text-secondary)' }}>detector
          validation image</strong> from the held-out test split — ground-level
          photography from the training dataset, not a capture of this site. The box
          and the {confidence(detection.confidence)} are the model&rsquo;s real output
          on an image it never saw. Thermal is a UAV frame; see the cell grid below.
        </p>
      )}

      {evidence.audio && (
        <div style={{ display: 'grid', gap: 3 }}>
          <span className="t-h2" style={{ color: 'var(--text-muted)' }}>Inverter audio · INV-B</span>
          <audio controls src={evidence.audio} style={{ width: '100%', height: 30 }} />
        </div>
      )}

      {evidence.flyover && (
        <div style={{ display: 'grid', gap: 3 }}>
          <span className="t-h2" style={{ color: 'var(--text-muted)' }}>Drone flyover</span>
          <video
            src={evidence.flyover} muted loop autoPlay playsInline
            style={{ width: '100%', border: '1px solid var(--line-active)' }}
          />
        </div>
      )}
    </div>
  );
}
