'use client';

/**
 * Mounts the single rAF loop and the rehearsal key handler. Renders nothing.
 *
 * It lives in src/app/ rather than src/components/ on purpose: components/ is
 * where the lint rules ban timers, and this is the one place a timer is legal.
 * Mounted once, in the root layout, so the clock survives every view switch.
 */

import { useDemoClockDriver, useRehearsalKeys } from '@/hooks/useDemoClock';

export function ClockDriver() {
  useDemoClockDriver();
  useRehearsalKeys();
  return null;
}
