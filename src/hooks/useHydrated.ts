'use client';

/**
 * src/hooks/useHydrated.ts — has this page actually woken up?
 *
 * THE FAILURE THIS EXISTS TO MAKE VISIBLE. The console is server-rendered, so the
 * full markup arrives and paints before any JavaScript runs. If hydration then
 * fails — a truncated chunk, a bad deploy, a browser that choked — the page looks
 * PERFECT and ignores every click. Nothing is greyed out, nothing shows an error,
 * the numbers are all there and all correct. It is the worst way for a demo to
 * fail, because for the first thirty seconds it does not look like a failure at
 * all; it looks like the presenter forgot how their own product works.
 *
 * (That is not hypothetical here. data/telemetry.json used to ship whole into the
 * client bundle and the dev server truncated it on about half of all loads. The
 * cause is fixed — see src/lib/telemetryPack.ts — but the class of failure is not
 * fixable, because any hydration error at all produces it.)
 *
 * HOW IT WORKS. `false` on the server and on the first client render, `true` after
 * an effect runs. Effects only run once React has attached, so a `true` here means
 * the same thing a click means: the page is live. The two renders agree on `false`,
 * so there is no hydration mismatch — the flip happens after.
 *
 * This is a liveness check, not a loading state. Nothing in this app loads.
 */

import { useEffect, useState } from 'react';

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
