'use client';

/**
 * CinematicView — the drone's point of view, t ∈ [18, 74).
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
 *   TargetReticle  projected onto the damaged module, from target lock
 */

import { CinematicBackground } from './CinematicBackground';
import { MissionLog } from './MissionLog';
import { PanelLabels } from './PanelLabels';
import { PiPConsole } from './PiPConsole';
import { StatusPill } from './StatusPill';
import { TargetReticle } from './TargetReticle';
import { Timecode } from './Timecode';

export function CinematicView() {
  return (
    <div style={{
      width: 'var(--shell-w)', height: 'var(--shell-h)',
      position: 'relative', overflow: 'hidden',
      background: 'var(--surface-inset)',
    }}>
      <CinematicBackground />
      <PanelLabels />
      <TargetReticle />
      <MissionLog />
      <Timecode />
      <PiPConsole />
      <StatusPill />
    </div>
  );
}
