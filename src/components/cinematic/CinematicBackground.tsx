'use client';

/**
 * CinematicBackground — THE SWAP SEAM, now swapped.
 *
 * Phase 7 shipped a CC0 flyover plate here. Phase 8 replaced its contents with the
 * R3F scene, and NOTHING ELSE CHANGED — the mission log, timecode, status pill,
 * PiP and reticle all sit above it and never knew which was underneath. That was
 * the entire point of building the seam first.
 *
 * The video path is kept and still works. It is the fallback if WebGL is
 * unavailable on the demo machine, and it is one boolean away if the scene ever
 * misbehaves on a projector five minutes before showing it.
 *
 * The scene is a SIMULATION of the modelled site, not footage. It is built from
 * farm.json's own geometry, so the field you fly over is the field the map draws.
 * Provenance for the video fallback: docs/media-provenance.md.
 */

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

/** R3F must not render on the server — there is no WebGL context there. */
const SolarFarmScene = dynamic(() => import('@/components/scene/SolarFarmScene'), {
  ssr: false,
  loading: () => null,
});

const VIDEO_SRC = '/cinematic/flyover.webm';

/** Flip to true to fall back to the committed CC0 plate. */
const FORCE_VIDEO = false;

function hasWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ?? canvas.getContext('webgl'),
    );
  } catch {
    return false;
  }
}

function VideoPlate() {
  return (
    <video
      src={VIDEO_SRC}
      autoPlay
      muted
      loop
      playsInline
      aria-hidden
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        // Warm/arid grade — a stylistic choice on a stock plate, stated in
        // docs/media-provenance.md rather than left for someone to notice.
        filter: 'sepia(0.42) saturate(1.15) hue-rotate(-12deg) contrast(1.05) brightness(0.92)',
      }}
    />
  );
}

export function CinematicBackground() {
  // Decided after mount: the server cannot know whether WebGL exists, and guessing
  // wrong would mean a hydration mismatch on the most visible element on screen.
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => setWebgl(hasWebGL()), []);

  const useScene = webgl === true && !FORCE_VIDEO;

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'var(--surface-inset)',
    }}>
      {useScene ? <SolarFarmScene /> : webgl === false ? <VideoPlate /> : null}

      {/* Sensor character over whichever is underneath: faint scanlines and a
          vignette, so the frame reads as a downlinked camera feed. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.13) 0px, rgba(0,0,0,0.13) 1px, transparent 1px, transparent 3px)',
          mixBlendMode: 'multiply',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at center, transparent 45%, rgba(7,10,15,0.55) 100%)',
        }}
      />
    </div>
  );
}
