'use client';

/**
 * PanelLabels — the array ID set on each array, the way a real site paints its row
 * numbers on the module frames.
 *
 * These exist to answer one specific doubt out loud: "did the drone actually go to
 * B-17, or to a panel that merely looks like the right one?" With the target
 * highlighted and its neighbours labelled around it, the answer is legible on
 * screen instead of asserted in a caption.
 *
 * Three things changed after watching this in flight. They were only up for the
 * last few seconds before target lock, so they read as a flourish that arrived to
 * make a point rather than as markings that were always there — now they are on
 * from the moment the aircraft is over the field. And they were chips: boxed,
 * bordered, bigger than the panels they sat on. Now they are small type set on the
 * array, scaled and faded by distance so the near ones read and the far ones
 * recede, with only the target given any weight.
 *
 * The third is where they are anchored. Projected from the array centre at panel
 * height, each tag hung in mid-air beside its modules, attached to nothing. It is
 * now projected from a point on the GROUND just in front of the row, the way a
 * site paints its row numbers on the dirt — see LABEL_GROUND_OFFSET_Z, which also
 * records why the offset cannot simply be made larger.
 *
 * Rendered as DOM rather than as 3D text: it uses the console's own IBM Plex, is
 * crisp at any distance, needs no font fetched at runtime, and is projected with
 * the SAME pure camera the scene is drawn with — so a tag cannot drift off the
 * array it names.
 */

import { LABEL_RANGE, M, visibleLabels } from '@/lib/scene';
import { useFlightCue } from '@/store/flightCue';

export function PanelLabels() {
  const cue = useFlightCue();

  // Up as soon as the aircraft is over the field, down once it has climbed away.
  if (cue.t < M.transit || cue.t > M.thermalDone + 3) return null;

  const labels = visibleLabels(cue.t, cue.targetId, undefined, 14);

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {labels.map((l) => {
        // Distance drives size and opacity, so the field reads with depth rather
        // than as a flat sheet of identically-sized tags pasted over it.
        const k = Math.max(0, Math.min(1, 1 - l.near / LABEL_RANGE));
        return (
          <span
            key={l.id}
            className="t-micro"
            style={{
              position: 'absolute',
              left: `${l.x * 100}%`,
              top: `${l.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              whiteSpace: 'nowrap',
              fontSize: l.faulted ? 12 : Math.round(7 + k * 4),
              letterSpacing: '0.08em',
              color: l.faulted ? 'var(--iron-95)' : 'var(--text-primary)',
              opacity: l.faulted ? 1 : 0.3 + k * 0.5,
              fontWeight: l.faulted ? 700 : 500,
              // A hairline shadow instead of a box: readable over both the panels
              // and the sand without covering either of them up.
              textShadow: '0 1px 2px rgba(0,0,0,0.85), 0 0 1px rgba(0,0,0,0.9)',
              borderBottom: l.faulted ? '1px solid var(--iron-95)' : 'none',
              paddingBottom: l.faulted ? 1 : 0,
            }}
          >
            {l.id}
          </span>
        );
      })}
    </div>
  );
}
