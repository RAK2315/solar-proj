'use client';

/**
 * The console. One route, one view: the twin, with the panels floating over it.
 *
 * `100dvh` and no scale wrapper. The old console was a fixed 1920x1080 design
 * fitted to the window by a CSS transform, and R3F sizes its canvas from
 * post-transform pixels, which is the bug that wrapper kept causing.
 */

import { Shell } from '@/components/shell/Shell';

export default function Page() {
  return <Shell />;
}
