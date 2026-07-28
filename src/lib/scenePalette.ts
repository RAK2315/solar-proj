/**
 * src/lib/scenePalette.ts — the 3D scene's material colours, in one place.
 *
 * plan/04 §1 rule 1 says "no raw hex in src/components/". That rule was written for
 * the console, where every colour is a CSS custom property — but three.js materials
 * cannot read CSS variables, so the scene needs literals somewhere. Somewhere is
 * here, named and cited, rather than scattered across four files with the panel
 * blue written out twice.
 *
 * Every value comes from CLAUDE.md §14's scene spec. These are SCENE colours, not
 * semantic ones: nothing here carries meaning about severity or temperature. The
 * ironbow ramp is the semantic one and it lives in src/lib/ironbow.ts.
 */

export const SCENE = {
  /** §14: "sandy albedo (#B5A183), roughness 0.95" */
  ground: '#b5a183',

  /** §14: "material: metalness 0.35, roughness 0.25, colour #2B4A7A" */
  panel: '#2b4a7a',

  /** §14: "instanced cylinders, r 0.05, h 1.2, colour #9AA0A8" */
  post: '#9aa0a8',

  /** §14: "gradient shader, warm horizon → pale zenith. No HDRI (filesize)." */
  skyZenith: '#7fa8d4',
  skyHorizon: '#e7c9a0',

  /** §14: "directional light, low elevation, warm #FFE8C4, intensity 2.2" */
  sun: '#ffe8c4',
  /** §14: "hemisphere light, sky #8FB0D9 / ground #B5A183, intensity 0.4" */
  skyFill: '#8fb0d9',

  /** §14: "low-poly glTF, 4 rotors, orange payload block, green/red nav lights" */
  droneBody: '#1b1f26',
  dronePayload: '#e2701f',
  droneLens: '#0d1015',
  droneHub: '#2a2f38',
  droneRotor: '#0e1219',
  navStarboard: '#2ef08a',
  navPort: '#ff3b30',

  /** The single blob shadow §14 permits. */
  shadow: '#000000',

  /** Emissive tint on the cracked module during the thermal pass. */
  hotBand: '#ff7a1a',
} as const;

/** Material constants, also from §14, so they are not retyped per mesh. */
export const SCENE_MATERIAL = {
  panelMetalness: 0.35,
  panelRoughness: 0.25,
  postMetalness: 0.1,
  postRoughness: 0.8,
  groundRoughness: 0.95,
  sunIntensity: 2.2,
  hemisphereIntensity: 0.45,
} as const;
