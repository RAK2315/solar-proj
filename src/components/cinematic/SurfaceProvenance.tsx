'use client';

/**
 * SurfaceProvenance — says what the module surface is made of, where you can see it.
 *
 * From target lock the camera is 7 m off a module textured with a photograph of a
 * real panel. That is ordinary digital-twin practice, but at that distance the
 * render stops looking like a render, and an audience watching the detector fire
 * on it would be entitled to think it was a camera frame. So it is stated, not
 * discovered. Source, split and licence sit behind SHOW WORKINGS.
 */

import { panelTexture, panelTextureDataset } from '@/lib/data';
import { hasCrackMechanism } from '@/lib/live';
import { M } from '@/lib/scene';
import { useFlightCue } from '@/store/flightCue';
import { useSession } from '@/store/session';

export function SurfaceProvenance() {
  const cue = useFlightCue();
  const injected = useSession((s) => s.injected);
  // The cinematic is outside ConsoleRoot, so `.hide-workings` does not reach it.
  const showWorkings = useSession((s) => s.showWorkings);

  if (!cue.active || cue.t < M.lock || cue.t > M.thermalDone) return null;

  // Gated exactly where the drawn crack is: a soiled array must not be described
  // as carrying a picture of broken glass.
  const cracked = hasCrackMechanism(cue.targetId, injected);
  const shown = cracked ? panelTexture('cracked') : panelTexture('intact');
  if (!shown) return null;

  return (
    <div
      style={{
        position: 'absolute', bottom: 84, left: '50%', transform: 'translateX(-50%)',
        maxWidth: '62%', textAlign: 'center', pointerEvents: 'none', zIndex: 7,
        background: 'var(--surface-panel)', border: '1px solid var(--line-hairline)',
        padding: '5px 12px',
      }}
    >
      <span className="t-micro" style={{ color: 'var(--text-primary)' }}>
        The module surface here is a photograph of a real{' '}
        {cracked ? 'cracked' : 'intact'} panel
        <span style={{ color: 'var(--text-secondary)' }}>
          {' '}— surface material for the render, not a camera frame
        </span>
      </span>
      {showWorkings && (
        <span
          className="t-micro"
          style={{ color: 'var(--text-muted)', display: 'block', marginTop: 2 }}
        >
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
