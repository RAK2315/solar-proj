'use client';

/**
 * CinematicView — the drone's point of view.
 *
 * Occupies the same 1920×1080 box as the console; `view` decides which is visible.
 * Everything here is an overlay on top of ONE swap seam, `CinematicBackground`,
 * which becomes the R3F scene at Phase 8 without any of this changing.
 *
 * Layout follows CLAUDE.md §15:
 *   MissionLog     top-left, 78% width
 *   Timecode       top-right
 *   PiPConsole     bottom-left, the real console at scale(0.31)
 *   StatusPill     bottom-right, hard cuts
 *   PanelLabels    array ID tags, so the target is identifiable not asserted
 *   TargetReticle  projected onto the inspected module, from target lock
 *
 * It shows the scripted incident during a demo run and a REAL DISPATCHED MISSION
 * in live mode — same splines, same overlays, driven by a flight cue rather than
 * by the demo clock (src/store/flightCue.ts). Which is the point: there is one
 * inspection sequence in this product, and the 90-second recording is one thing
 * it can be pointed at.
 */

import { CinematicBackground } from './CinematicBackground';
import { MissionLog } from './MissionLog';
import { PanelLabels } from './PanelLabels';
import { PiPConsole } from './PiPConsole';
import { ReturnToConsole } from './ReturnToConsole';
import { StatusPill } from './StatusPill';
import { useMode } from '@/store/selectors';
import { FlightSpeed } from './FlightSpeed';
import { LiveReticle } from './LiveReticle';
import { TargetReticle } from './TargetReticle';
import { Timecode } from './Timecode';

export function CinematicView() {
  const mode = useMode();

  return (
    // `viewfinder` pins this subtree to the dark palette whatever theme the
    // console is in. See globals.css: a camera feed with a document's colours is
    // a screen you cannot read.
    <div className="viewfinder" style={{
      width: 'var(--shell-w)', height: 'var(--shell-h)',
      position: 'relative', overflow: 'hidden',
      background: 'var(--surface-inset)',
    }}>
      <CinematicBackground />
      <PanelLabels />
      <TargetReticle />
      {/* The detector, run over the drone's own camera while it is on station.
          Renders nothing at all until an ONNX export exists, see LiveReticle. */}
      <LiveReticle />
      {/* Live mode only: the scripted demo runs on its own clock and a speed
          control there would be a second answer to "what time is it". */}
      {mode === 'live' && <FlightSpeed />}
      <MissionLog />
      <Timecode />
      <PiPConsole />
      <StatusPill />
      <ReturnToConsole />
    </div>
  );
}
