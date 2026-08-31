'use client';

/**
 * The console. One route, two views (plan/04 §8).
 *
 * It moved from `/` to `/console` when the landing page arrived. Nothing inside it
 * knows about routing — the two views are still chosen by the clock and the flight
 * cue, exactly as before.
 *
 * Both views stay MOUNTED and are shown by visibility, never by conditional
 * render. Two reasons, and the second is the load-bearing one:
 *   1. Switching views must not cost a mount — the cuts at t=18 and t=74 are hard.
 *   2. At Phase 7 the cinematic contains a second live <ConsoleRoot /> as the PiP.
 *      If the console unmounted whenever the cinematic was up, the PiP would be
 *      showing a component tree that had just been destroyed and rebuilt.
 */

import { MotionConfig } from 'framer-motion';

import { useFitToWindow, SHELL_H, SHELL_W } from '@/hooks/useFitToWindow';
import { CinematicView } from '@/components/cinematic/CinematicView';
import { ConsoleRoot } from '@/components/console/ConsoleRoot';
import { DebugReadout } from '@/components/DebugReadout';
import { useActiveView } from '@/store/flightCue';

export default function Page() {
  // Mode-aware: `t` decides during the scripted run, a dispatched mission decides
  // in live mode, and the C/V rehearsal keys override both.
  const view = useActiveView();

  // The design is 1920x1080 and stays that way; this scales it to whatever window
  // it has been opened in. See src/hooks/useFitToWindow.ts for why scaling rather
  // than reflowing.
  const scale = useFitToWindow();

  return (
    // reducedMotion="user" makes framer-motion honour the OS setting. The CSS
    // media query in globals.css cannot reach JS-driven animation, and the feed's
    // slide-in is JS-driven. The MATRIX FILL deliberately still runs under reduced
    // motion — it is information, not decoration (plan/04 §5).
    <MotionConfig reducedMotion="user">
    {/* The letterbox. Centres the scaled console and paints the ground behind it,
        so a window of any aspect ratio gets even margins rather than the console
        pinned to a corner.

        CENTRED BY ABSOLUTE POSITION, not by grid or flex alignment. An item WIDER
        than its container is the case those get wrong: `place-items: center` left
        the 1920 px box at x=0, the transform then scaled it about its own middle,
        and the console started 204 px in and ran off the right edge, which is
        very nearly the bug this was meant to fix. Half the container, minus half
        the element, is arithmetic that does not care whether it overflows. */}
    <div style={{
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      // A FIXED DARK BEZEL, not the theme's ground. This is the margin around a
      // 1920x1080 design being fitted to a smaller window, and it frames both a
      // light console and a dark cinematic. Following the theme made it a pale
      // border around the camera feed, which read as the scene having failed to
      // fill the screen.
      background: '#0b0e13',
    }}>
    <main
      style={{
        width: SHELL_W,
        height: SHELL_H,
        position: 'absolute',
        left: '50%',
        top: '50%',
        overflow: 'hidden',
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      <div
        aria-hidden={view !== 'console'}
        style={{ position: 'absolute', inset: 0, visibility: view === 'console' ? 'visible' : 'hidden' }}
      >
        <ConsoleRoot />
      </div>

      <div
        aria-hidden={view !== 'cinematic'}
        style={{ position: 'absolute', inset: 0, visibility: view === 'cinematic' ? 'visible' : 'hidden' }}
      >
        <CinematicView />
      </div>

      <DebugReadout />
    </main>
    </div>
    </MotionConfig>
  );
}
