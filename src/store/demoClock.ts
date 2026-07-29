/**
 * src/store/demoClock.ts — THE clock. The only source of time in this application.
 *
 * Console, 3D scene, event feed, mission log, PiP, camera and drone position all
 * derive from one number: `t`, in seconds since demo start. Nothing else has a timer.
 *
 * Two pieces of mutable state exist in the entire app, and they are both here:
 *   t         — advanced by the single rAF loop in src/hooks/useDemoClock.ts
 *   approved  — set once, by the operator, at the human gate
 * Plus `playing`, `speed` and `viewOverride`, which are rehearsal controls and are
 * never read by anything the audience sees.
 *
 * EVERYTHING ELSE IS A PURE FUNCTION OF `t`. If you are about to add a third piece
 * of demo state, you have found a bug in your design, not a missing feature — the
 * symptom will be that seeking backwards leaves something stuck.
 *
 * Keep this store tiny. Derived state belongs in src/store/selectors.ts as useMemo
 * over `t`, so that `useDemoClock(s => s.t)` stays a granular subscription and
 * `useDemoClock.getState().t` stays readable from inside useFrame without
 * subscribing at all — which is exactly what CameraRig needs.
 */

import { create } from 'zustand';

import type { DemoView } from '@/lib/types';

/** Demo length in seconds. Matches CLAUDE.md §2's table. */
export const DEMO_DURATION = 90;

/** The cinematic occupies t ∈ [18, 74). Console holds either side. */
export const CINEMATIC_IN = 18;
export const CINEMATIC_OUT = 74;

/** Rehearsal seek step, seconds. */
export const SEEK_STEP = 5;

/** Which view `t` alone implies. Pure — no state, no store access. */
export function viewAt(t: number): DemoView {
  return t >= CINEMATIC_IN && t < CINEMATIC_OUT ? 'cinematic' : 'console';
}

export interface DemoClockState {
  t: number;
  playing: boolean;
  speed: number;               // 0.5 | 1 | 2 — rehearsal only
  approved: boolean;           // the human gate at t≈84

  /**
   * Rehearsal override for the C / V keys. `null` means the view follows `t`,
   * which is the only state the demo is ever shown in. It lives here rather than
   * as a derived `view` field so that `view` stays a pure function of `t` —
   * writing `view` on every tick would make seeking depend on tick order.
   */
  viewOverride: DemoView | null;

  /**
   * Rehearsal readout visibility, toggled with `D`.
   *
   * Defaults ON while developing and OFF in a production build. It is a build
   * instrument, not part of the product — nobody watching the demo should see a
   * scrub bar, and the console is meant to read as a control room rather than a
   * player. `npm run build` ships it hidden.
   */
  debug: boolean;

  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (t: number) => void;
  seekBy: (dt: number) => void;
  setSpeed: (s: number) => void;
  forceView: (v: DemoView) => void;   // pressing the same view again clears it
  clearViewOverride: () => void;
  toggleDebug: () => void;
  approve: () => void;
  reset: () => void;
  _tick: (dt: number) => void;        // called ONLY by useDemoClockDriver
}

const clampT = (t: number) => Math.max(0, Math.min(DEMO_DURATION, t));

export const useDemoClock = create<DemoClockState>((set, get) => ({
  t: 0,
  playing: false,
  speed: 1,
  approved: false,
  viewOverride: null,
  debug: process.env.NODE_ENV === 'development',

  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  toggle: () => set((s) => ({ playing: !s.playing })),
  seek: (t) => set({ t: clampT(t) }),
  seekBy: (dt) => set((s) => ({ t: clampT(s.t + dt) })),
  setSpeed: (speed) => set({ speed }),
  forceView: (v) => set((s) => ({ viewOverride: s.viewOverride === v ? null : v })),
  clearViewOverride: () => set({ viewOverride: null }),
  toggleDebug: () => set((s) => ({ debug: !s.debug })),
  approve: () => set({ approved: true }),
  // `debug` deliberately survives a reset — it is a property of the rehearsal
  // session, not of the run.
  reset: () => set({ t: 0, playing: false, approved: false, viewOverride: null }),

  _tick: (dt) => {
    const { t, playing, speed } = get();
    if (!playing) return;
    const next = Math.min(DEMO_DURATION, t + dt * speed);
    set(next >= DEMO_DURATION ? { t: next, playing: false } : { t: next });
  },
}));

/** The view actually rendered: `t` unless a rehearsal key is holding it. */
export const useView = (): DemoView =>
  useDemoClock((s) => s.viewOverride ?? viewAt(s.t));
