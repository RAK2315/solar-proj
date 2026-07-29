'use client';

/**
 * Mounts the single rAF loop and the rehearsal key handler. Renders nothing.
 *
 * It lives in src/app/ rather than src/components/ on purpose: components/ is
 * where the lint rules ban timers, and this is the one place a timer is legal.
 * Mounted once, in the root layout, so the clock survives every view switch.
 */

import { useEffect } from 'react';

import { useDemoClockDriver, useRehearsalKeys } from '@/hooks/useDemoClock';
import { useSession } from '@/store/session';

export function ClockDriver() {
  useDemoClockDriver();
  useRehearsalKeys();

  // Restore the operator's session AFTER mount. The store is configured with
  // skipHydration precisely so this happens here and not during render — reading
  // storage while rendering would have the server and the client disagree about
  // the first paint.
  useEffect(() => {
    void useSession.persist.rehydrate();
  }, []);

  return null;
}
