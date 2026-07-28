'use client';

/**
 * The whole app. One route, two views (plan/04 §8).
 *
 * Both views stay MOUNTED and are shown by visibility, never by conditional
 * render. Two reasons, and the second is the load-bearing one:
 *   1. Switching views must not cost a mount — the cuts at t=18 and t=74 are hard.
 *   2. At Phase 7 the cinematic contains a second live <ConsoleRoot /> as the PiP.
 *      If the console unmounted whenever the cinematic was up, the PiP would be
 *      showing a component tree that had just been destroyed and rebuilt.
 */

import { CinematicView } from '@/components/cinematic/CinematicView';
import { ConsoleRoot } from '@/components/console/ConsoleRoot';
import { DebugReadout } from '@/components/DebugReadout';
import { useView } from '@/store/demoClock';

export default function Page() {
  const view = useView();

  return (
    <main
      style={{
        width: 'var(--shell-w)',
        height: 'var(--shell-h)',
        position: 'relative',
        overflow: 'hidden',
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
  );
}
