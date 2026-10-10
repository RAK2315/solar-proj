import { MeshStandardMaterial } from 'three';

import { cellGrid } from '@/lib/data';
import { SCENE, SCENE_MATERIAL, TWIN } from '@/lib/scenePalette';

/** One cell construction keeps the detailed inspection row part of the field. */
export function panelMaterial(dark: boolean): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    color: dark ? TWIN.panel : SCENE.panel,
    metalness: dark ? TWIN.panelMetalness : SCENE_MATERIAL.panelMetalness,
    roughness: SCENE_MATERIAL.panelRoughness,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 cellUv; varying float topFace;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ncellUv = vec2(uv.x, 1.0 - uv.y); topFace = step(0.5, normal.y);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 cellUv; varying float topFace;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 grid = cellUv * vec2(${cellGrid.cols.toFixed(1)}, ${cellGrid.rows.toFixed(1)});
        vec2 cell = abs(fract(grid) - 0.5);
        float seam = smoothstep(0.46, 0.49, max(cell.x, cell.y));
        float busbar = 1.0 - smoothstep(0.015, 0.025, abs(fract(grid.x * 3.0) - 0.5));
        float finger = 1.0 - smoothstep(0.04, 0.12, abs(fract(grid.y * 18.0) - 0.5));
        float grain = sin(grid.x * 93.0 + grid.y * 51.0) * sin(grid.x * 37.0 - grid.y * 71.0);
        diffuseColor.rgb *= 1.0 + grain * 0.025 * topFace;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.3, seam * topFace);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.37, 0.43, 0.49), busbar * 0.42 * (1.0 - seam) * topFace);
        diffuseColor.rgb += finger * 0.025 * (1.0 - seam) * topFace;
        float edge = step(0.488, max(abs(cellUv.x - 0.5), abs(cellUv.y - 0.5)));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.52, 0.58, 0.64), edge * topFace);
      `);
  };
  return material;
}
