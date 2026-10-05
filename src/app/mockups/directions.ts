/**
 * THROWAWAY. The four directions and the screen inventory for the design gate in
 * plan/rework/06-design-system.md. Deleted with the rest of /mockups after the pick.
 */

export const DIRECTIONS = {
  a: 'Broadcast',
  b: 'Instrument',
  c: 'Glass',
  d: 'Annotated',
  e: 'Glass with rail',
} as const;

export type Dir = keyof typeof DIRECTIONS;
export const DIRS = Object.keys(DIRECTIONS) as Dir[];
export const isDir = (v: string): v is Dir => v in DIRECTIONS;

export const SCREENS = {
  twin: 'Site',
  fallback: 'Site, 2D fallback',
  incident: 'Incident',
  dossier: 'Dossier',
  queue: 'Queue',
  analytics: 'Analytics',
  drones: 'Drones',
  sandbox: 'Sandbox',
  landing: 'Landing',
} as const;

export type Screen = keyof typeof SCREENS;
export const SCREEN_IDS = Object.keys(SCREENS) as Screen[];
export const isScreen = (v: string): v is Screen => v in SCREENS;
