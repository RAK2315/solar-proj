'use client';

/**
 * FieldMap: the 120 arrays in two dimensions.
 *
 * Shown when the operator asks for it, and when the browser cannot draw the twin
 * or cannot draw it fast enough. It reads the same selectors the twin does, so
 * there is no second data path and no way for the two views to disagree about
 * the site.
 *
 * Drawn as an engineering plan: each zone in its own frame, and status carried
 * by a hatch as well as a colour, so a warning reads on a projector that has
 * washed the orange out.
 */

import { arrayCentre } from '@/lib/scene';
import { useFarm, useSiteFrame, useZoneBreakdown } from '@/store/selectors';
import { useSession } from '@/store/session';

const LEGEND: Array<{ sev: string; label: string; affected?: boolean }> = [
  { sev: 'healthy', label: 'Healthy' },
  { sev: 'warning', label: 'Warning' },
  { sev: 'critical', label: 'Critical' },
  { sev: 'scheduled', label: 'Work order' },
  { sev: 'healthy', label: 'Under a hazard', affected: true },
];

export function FieldMap() {
  const farm = useFarm();
  const frame = useSiteFrame();
  const zones = useZoneBreakdown();
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
      {farm.zones.map((z) => {
        const tally = zones.find((b) => b.id === z.id);
        const off = tally ? tally.warning + tally.critical : 0;
        return (
          <section key={z.id} className="zone" data-sev={tally?.critical ? 'critical' : tally?.warning ? 'warning' : undefined}>
            <header>
              <h2>Zone <span className="id">{z.id}</span></h2>
              <span className="count num">{off === 0 ? `${z.panels.length} arrays, all nominal` : `${off} of ${z.panels.length} off nominal`}</span>
            </header>
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
          </section>
        );
      })}
      <ul className="legend" aria-label="Legend">
        {LEGEND.map((l) => (
          <li key={l.label}><i className="cell" data-sev={l.sev} data-affected={l.affected ?? false} aria-hidden />{l.label}</li>
        ))}
      </ul>
    </div>
  );
}
