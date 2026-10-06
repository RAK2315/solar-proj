'use client';

/**
 * FieldMap: the 120 arrays in two dimensions.
 *
 * Shown when the browser cannot draw the twin or cannot draw it fast enough. It
 * reads the same selectors the twin does, so there is no second data path and no
 * way for the two views to disagree about the site.
 */

import { arrayCentre } from '@/lib/scene';
import { useFarm, useSiteFrame } from '@/store/selectors';
import { useSession } from '@/store/session';

export function FieldMap() {
  const farm = useFarm();
  const frame = useSiteFrame();
  const selected = useSession((s) => s.selectedPanelId);
  const select = useSession((s) => s.selectPanel);
  const armed = useSession((s) => s.armedHazard);
  const dropHazard = useSession((s) => s.dropHazard);

  // With no camera to drag across, a held footprint is dropped on an array.
  const press = (id: string) => {
    if (!armed) { select(id); return; }
    const c = arrayCentre(id);
    dropHazard(armed, { x: c.x, z: c.z });
  };

  return (
    <div className="sy-map" role="group" aria-label="Field map">
      {farm.zones.map((z) => (
        <div key={z.id} className="zone">
          <p className="one">Zone <span className="id">{z.id}</span></p>
          <div className="cells" style={{ gridTemplateColumns: `repeat(${z.cols}, minmax(0, 1fr))` }}>
            {[...z.panels].sort((a, b) => a.row - b.row || a.col - b.col).map((p) => (
              <button
                key={p.id}
                type="button"
                className="cell id"
                data-panel-id={p.id}
                data-sev={frame.panels[p.id]?.status}
                data-affected={frame.affected[p.id] !== undefined}
                aria-label={`Array ${p.id}`}
                aria-pressed={p.id === selected}
                onClick={() => press(p.id)}
              >
                {p.id}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
