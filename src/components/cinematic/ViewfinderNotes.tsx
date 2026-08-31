'use client';

/**
 * ViewfinderNotes — one strip for everything the viewfinder has to disclose.
 *
 * WHY IT IS ONE COMPONENT. There were four separately-added overlays in the same
 * band, measured at y 687 / 710 / 791 / 828 in a 900 px window: the detector's
 * "the box is the module", the reticle's label tab, the surface-provenance line
 * and the flight-speed control. Each was added in a different phase to answer a
 * different fair objection, and none of them knew about the others. Individually
 * defensible, collectively unreadable — they overlapped each other and the PiP.
 *
 * So the two DISCLOSURES are stacked here, in one bordered strip, in the free
 * band between the PiP and the status pill. The reticle's tab stays where it is
 * because it is spatially bound to the module it names; the speed control moved
 * above the pill because it is a control, not a note.
 *
 * Both lines say what the picture is rather than what it appears to be. From
 * target lock the camera is 7 m off a module textured with a photograph of a real
 * panel; and the dataset labels the WHOLE MODULE as `Cracked`, so a box that hugs
 * the panel is the model working, not a claim about where the crack is.
 */

import { panelTexture, panelTextureDataset } from '@/lib/data';
import { hasCrackMechanism } from '@/lib/live';
import { M } from '@/lib/scene';
import { useFlightCue } from '@/store/flightCue';
import { useSession } from '@/store/session';
import { useLiveBoxes } from './LiveReticle';

export function ViewfinderNotes() {
  const cue = useFlightCue();
  const injected = useSession((s) => s.injected);
  // The cinematic is outside ConsoleRoot, so `.hide-workings` does not reach it.
  const showWorkings = useSession((s) => s.showWorkings);
  // The same predicate LiveReticle draws by, so the caption cannot outlive the
  // boxes it explains.
  const boxes = useLiveBoxes();

  if (!cue.active || cue.t < M.lock || cue.t > M.thermalDone) return null;

  // Gated exactly where the drawn crack is: a soiled array must not be described
  // as carrying a picture of broken glass.
  const cracked = hasCrackMechanism(cue.targetId, injected);
  const shown = cracked ? panelTexture('cracked') : panelTexture('intact');

  if (!shown && !boxes) return null;

  return (
    <div
      style={{
        // Bottom centre, inside the gap the PiP (right edge x=627) and the speed
        // control (left edge x=1525) leave free. 32% of the shell is 614px, so
        // centred it spans 653..1267 and clears both. Measured, not guessed.
        position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        maxWidth: '32%', textAlign: 'center', pointerEvents: 'none', zIndex: 7,
        background: 'color-mix(in srgb, var(--surface-panel) 92%, transparent)',
        border: '1px solid var(--line-hairline)',
        padding: '5px 12px',
        display: 'grid', gap: 2,
      }}
    >
      {shown && (
        <span className="t-micro" style={{ color: 'var(--text-primary)' }}>
          Module surface: a photograph of a real{' '}
          {cracked ? 'cracked' : 'intact'} panel
          <span style={{ color: 'var(--text-secondary)' }}>
            {' '}— render material, not a camera frame
          </span>
        </span>
      )}

      {boxes && (
        <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
          The box is the module, not the crack — this model labels modules
        </span>
      )}

      {shown && showWorkings && (
        <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
          {shown.sourceImage} · {panelTextureDataset.name} ({shown.split} split) ·{' '}
          {panelTextureDataset.licence} · our own weights score this file{' '}
          {shown.detectorOnTexture
            ? `${shown.detectorOnTexture.label} ${shown.detectorOnTexture.confidence.toFixed(2)}`
            : 'nothing'}
        </span>
      )}
    </div>
  );
}
