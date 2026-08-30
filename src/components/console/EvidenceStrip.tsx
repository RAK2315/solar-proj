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

/**
 * A captured frame. The label sits ON the image as a chip rather than under it as a
 * caption — a frame with its channel burned into the corner is how a UAV payload
 * presents itself, and it means the label cannot drift away from the image when the
 * column reflows.
 */
function Thumb({ src, label, caption }: { src: string; label: string; caption?: string }) {
  return (
    <figure style={{ margin: 0, display: 'grid', gap: 'var(--sp-2)', minWidth: 0 }}>
      <div style={{
        border: '1px solid var(--line-active)', background: 'var(--surface-inset)',
        aspectRatio: '4 / 3', overflow: 'hidden', position: 'relative',
      }}>
        {/* Static committed artefacts, not remote images — next/image would add a
            loader for files that are already local and already sized. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label}
          style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
        <figcaption
          className="chip"
          style={{
            position: 'absolute', left: 0, bottom: 0,
            background: 'var(--surface-void)', color: 'var(--sev-active)',
          }}
        >
          {label}
        </figcaption>
      </div>
      {caption && (
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>{caption}</span>
      )}
    </figure>
  );
}

export function EvidenceStrip() {
  const evidence = useEvidence();
  const detection = useDetection();

  const thumbs = [
    evidence.thermal && {
      src: evidence.thermal, label: 'THERMAL', caption: 'IR · ironbow LUT · UAV frame',
    },
    (evidence.rgbAnnotated || evidence.rgb) && {
      src: (evidence.rgbAnnotated || evidence.rgb)!,
      label: 'RGB',
      // The confidence is whatever the model returned. Never rounded up, and
      // invariant I11 rejects the spec's placeholder 0.84 by name.
      caption: detection
        ? `VIS · ${detection.label} ${confidence(detection.confidence)}`
        : undefined,
    },
  ].filter(Boolean) as Array<{ src: string; label: string; caption?: string }>;

  if (!thumbs.length && !evidence.audio && !evidence.flyover) return null;

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
      {thumbs.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${thumbs.length}, 1fr)`,
          gap: 'var(--sp-4)',
        }}>
          {thumbs.map((t) => <Thumb key={t.label} {...t} />)}
        </div>
      )}

      {/* WHAT THE RGB FRAME ACTUALLY IS. The detection is real, on an image the
          model never saw — but the source dataset is ground-level photography, so
          the frame is a panel on a floor with the photographer's shoes in it, not
          an aerial capture of Bhadla. Presenting it as drone imagery would be the
          one unforced error in an evidence panel built entirely around declared
          provenance, and it is the first thing anyone will notice. Say it first. */}
      {/* Promoted out of t-micro. This paragraph is the most important sentence in
          the evidence panel — it is the project declining to overclaim, in the one
          place where overclaiming would be easiest — and at 11 px on a projector
          nobody was reading it, which made the honesty invisible and therefore
          worthless. Provenance that cannot be read is not provenance. */}
      {(evidence.rgb || evidence.rgbAnnotated) && detection && (
        <p className="t-prose" style={{
          color: 'var(--text-secondary)', margin: 0, fontSize: 12, lineHeight: 1.5,
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>
            This photo came from the training dataset, not from our drone.
          </strong>{' '}
          It is a ground-level shot of a panel, held back from training so the model
          had never seen it. The box is the model&rsquo;s own output on it, and it was{' '}
          {Math.round(detection.confidence * 100)}% sure — {confidence(detection.confidence)}
          {' '}as returned. The thermal frame beside it is a real UAV capture; the cell
          grid below is measured from it.
        </p>
      )}

      {evidence.audio && (
        <div style={{ display: 'grid', gap: 3 }}>
          <span className="t-h2" style={{ color: 'var(--text-secondary)' }}>Inverter audio · INV-B</span>
          <audio controls src={evidence.audio} style={{ width: '100%', height: 30 }} />
        </div>
      )}

      {evidence.flyover && (
        <div style={{ display: 'grid', gap: 3 }}>
          <span className="t-h2" style={{ color: 'var(--text-secondary)' }}>Drone flyover</span>
          <video
            src={evidence.flyover} muted loop autoPlay playsInline
            style={{ width: '100%', border: '1px solid var(--line-active)' }}
          />
        </div>
      )}
    </div>
  );
}
