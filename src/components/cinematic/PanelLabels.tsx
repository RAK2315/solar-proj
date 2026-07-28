'use client';

/**
 * PanelLabels — array ID tags floating over the arrays currently in shot.
 *
 * These exist to answer one specific doubt out loud: "did the drone actually go to
 * B-17, or to a panel that merely looks like the right one?" With B-17 highlighted
 * and its neighbours labelled around it, the answer is legible on screen instead of
 * asserted in a caption.
 *
 * Rendered as DOM rather than as 3D text: it uses the console's own IBM Plex,
 * stays crisp at any distance, needs no font fetched at runtime, and is projected
 * with the SAME pure camera the scene is drawn with — so a tag cannot drift off
 * the array it names.
 */

import { visibleLabels } from '@/lib/scene';
import { BEAT, useAfter, useDemoClockT } from '@/store/selectors';

export function PanelLabels() {
  const t = useDemoClockT();
  // Only once the aircraft is close enough for the tags to mean anything. During
  // transit they would be a wall of text over a field of identical panels.
  const near = useAfter(BEAT.targetLock - 4);
  const gone = useAfter(BEAT.thermalDone + 2);

  if (!near || gone) return null;

  const labels = visibleLabels(t);

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {labels.map((l) => (
        <span
          key={l.id}
          className={l.faulted ? 't-data-em' : 't-micro'}
          style={{
            position: 'absolute',
            left: `${l.x * 100}%`,
            top: `${l.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            padding: l.faulted ? '3px var(--sp-2)' : '2px 5px',
            whiteSpace: 'nowrap',
            background: l.faulted
              ? 'var(--sev-critical)'
              : 'color-mix(in srgb, var(--surface-panel) 78%, transparent)',
            color: l.faulted ? 'var(--text-inverse)' : 'var(--text-secondary)',
            border: l.faulted ? 'none' : '1px solid var(--line-hairline)',
            fontSize: l.faulted ? 13 : 10,
            letterSpacing: '0.06em',
          }}
        >
          {l.id}
        </span>
      ))}
    </div>
  );
}
