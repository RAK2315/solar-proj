'use client';

/**
 * CinematicBackground — THE SWAP SEAM.
 *
 * Phase 7 ships a CC0 flyover plate. Phase 8 replaces the contents of this one
 * component with <SolarFarmScene />, and NOTHING ELSE CHANGES — the mission log,
 * timecode, status pill, PiP and reticle all sit above it and never know which is
 * underneath. That is the whole reason the seam exists: a bad day on the 3D scene
 * can never cost you a working demo.
 *
 * The clip is a background PLATE, not footage of Bhadla — it is a German
 * agrivoltaic site, warm-graded so it reads as arid. Nothing measured comes from
 * it. Provenance and the honest framing: docs/media-provenance.md.
 */

const SRC = '/cinematic/flyover.webm';

export function CinematicBackground() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'var(--surface-inset)' }}>
      <video
        src={SRC}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          // Warm/arid grade. A stylistic choice on a stock plate, stated in
          // docs/media-provenance.md rather than left for someone to notice.
          filter: 'sepia(0.42) saturate(1.15) hue-rotate(-12deg) contrast(1.05) brightness(0.92)',
        }}
      />

      {/* Sensor character: a faint scanline grid and a vignette, so the plate reads
          as a downlinked camera feed rather than as a stock video playing. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 1px, transparent 1px, transparent 3px)',
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
