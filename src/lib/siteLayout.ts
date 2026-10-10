import { farm } from './data';
import { PANEL_H, PANEL_W, PANEL_SPACING_X, PANELS_PER_ARRAY, arrayCentre } from './scene';

export const ARRAY_WIDTH = PANEL_W + PANEL_SPACING_X * (PANELS_PER_ARRAY - 1);

/** Boundaries follow the existing twin geometry; these are schematic, not a survey. */
export const SITE_ZONES = farm.zones.map((zone) => {
  const centres = zone.panels.map((panel) => arrayCentre(panel.id));
  const minX = Math.min(...centres.map((p) => p.x)) - ARRAY_WIDTH / 2 - 3;
  const maxX = Math.max(...centres.map((p) => p.x)) + ARRAY_WIDTH / 2 + 3;
  const minZ = Math.min(...centres.map((p) => p.z)) - PANEL_H / 2 - 3;
  const maxZ = Math.max(...centres.map((p) => p.z)) + PANEL_H / 2 + 3;
  return { id: zone.id, minX, maxX, minZ, maxZ, x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
});
