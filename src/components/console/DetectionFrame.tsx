'use client';

/**
 * DetectionFrame — a captured frame with the model's boxes drawn on it.
 *
 * ONE PLACE THAT DOES THE COORDINATE MAPPING, because there are two callers and
 * the first version got it wrong in one of them. The model returns boxes in the
 * pixels of the canvas it was handed — which is the WebGL drawing buffer, not the
 * window, not the CSS size of the element, and not the device-pixel size either
 * once `dpr` is capped at 1.5. Dividing by `window.innerWidth`, as the cinematic
 * overlay did, put every box in roughly the right area and slightly the wrong
 * place, which is the most misleading kind of wrong a detection box can be.
 *
 * So the frame's own dimensions travel with the result, and the boxes are
 * expressed as a percentage of those. A percentage is then correct at any
 * rendered size, which is what lets the same result appear full-width in the
 * dossier and overlaid on the cinematic without a second calculation.
 */

import { useRef } from 'react';

import type { DetectorResult } from '@/store/detector';

export function DetectionFrame({ result, showImage = true }: {
  result: DetectorResult;
  /** False in the cinematic, where the live scene IS the image. */
  showImage?: boolean;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [w, h] = result.frameSize;

  return (
    <div style={{ position: 'relative', lineHeight: 0, width: '100%', height: showImage ? undefined : '100%' }}>
      {showImage && (
        /* `next/image` optimises assets it can resolve at build time. This is a
           data URL produced by `canvas.toDataURL` a moment ago, so there is
           nothing to optimise and the loader would only add a failure mode. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={result.frame}
          alt="The frame the detector was run on"
          style={{ width: '100%', display: 'block', border: '1px solid var(--line-active)' }}
        />
      )}

      {result.detections.map((d, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${(d.box[0] / w) * 100}%`,
            top: `${(d.box[1] / h) * 100}%`,
            width: `${(d.box[2] / w) * 100}%`,
            height: `${(d.box[3] / h) * 100}%`,
            border: '2px solid var(--sev-active)',
            boxShadow: '0 0 0 1px rgb(0 0 0 / 55%)',
          }}
        >
          <span
            className="t-micro"
            style={{
              position: 'absolute', top: -17, left: -2,
              background: 'var(--sev-active)', color: 'var(--text-inverse)',
              padding: '1px 5px', whiteSpace: 'nowrap',
            }}
          >
            {d.label} {d.confidence.toFixed(2)}
          </span>
        </span>
      ))}
    </div>
  );
}
