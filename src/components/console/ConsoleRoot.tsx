'use client';

/**
 * ConsoleRoot — the operator console. Fixed 1920×1080, three columns.
 *
 * This component must stay a pure function of the store with no route-level state,
 * because at Phase 7 the cinematic view renders a SECOND instance of it at
 * scale(0.31) as the PiP. Two live instances, one clock — which is what makes the
 * PiP prove the two halves are one system rather than claim it.
 */

import { DetailPanel } from './DetailPanel';
import { FarmMap } from './FarmMap';
import { HeaderBar } from './HeaderBar';
import { LeftRail } from './LeftRail';
import { RepairQueueBar } from './RepairQueueBar';

export function ConsoleRoot() {
  return (
    <div className="console-root">
      <HeaderBar />
      <LeftRail />
      <FarmMap />
      <DetailPanel />
      <RepairQueueBar />
    </div>
  );
}
