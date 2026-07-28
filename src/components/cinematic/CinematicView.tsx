'use client';

/**
 * CinematicView — full-bleed drone view with overlays. Occupies the same
 * 1920×1080 box as the console; `view` from the clock decides which is visible.
 *
 * PHASE 2: structure only. The background is a named seam (`CinematicBackground`)
 * so Phase 8 can swap <video> for <SolarFarmScene /> without the overlays changing.
 */

import { useDemoClock } from '@/store/demoClock';

export function CinematicView() {
  const t = useDemoClock((s) => s.t);

  return (
    <div
      className="inset"
      style={{ width: 'var(--shell-w)', height: 'var(--shell-h)', position: 'relative' }}
    >
      {/* CinematicBackground — Phase 7 video, Phase 8 R3F scene. One seam. */}
      <div
        className="slot"
        style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}
      >
        <span className="t-h1">Cinematic background</span>
        <span className="t-micro">Phase 7 &lt;video&gt; → Phase 8 &lt;SolarFarmScene /&gt;</span>
      </div>

      <div className="slot" style={{ position: 'absolute', top: 32, left: 32, width: '78%' }}>
        <span className="t-h2">Mission log</span>
        <span className="t-micro">typewriter 45 cps, from events[].logLine</span>
      </div>

      <div className="slot" style={{ position: 'absolute', top: 32, right: 32, width: 240 }}>
        <span className="t-h2">Timecode</span>
        <span className="t-micro">● REC · T+{String(Math.floor(t / 60)).padStart(2, '0')}:
          {String(Math.floor(t % 60)).padStart(2, '0')} · LIVE</span>
      </div>

      <div className="slot" style={{ position: 'absolute', bottom: 32, left: 32, width: '38%', aspectRatio: '4 / 3' }}>
        <span className="t-h2">PiP console</span>
        <span className="t-micro">the REAL &lt;ConsoleRoot /&gt; at scale(0.31) — Phase 7</span>
      </div>

      <div className="slot" style={{ position: 'absolute', bottom: 32, right: 32, width: 300 }}>
        <span className="t-h2">Status pill</span>
        <span className="t-micro">hard cuts, no transition</span>
      </div>
    </div>
  );
}
