'use client';

/**
 * ConsoleRoot — the operator console. Fixed 1920×1080, three columns.
 *
 * This component must stay a pure function of the store with no route-level state,
 * because at Phase 7 the cinematic view renders a SECOND instance of it at
 * scale(0.31) as the PiP. Two live instances, one clock — which is what makes the
 * PiP prove the two halves are one system rather than claim it.
 *
 * The module screens swap out the map AND the right rail; the header, the event
 * feed and the queue footer stay put, because events do not stop happening because
 * an operator changed screens. Demo mode always renders the map: the scripted
 * incident has beats that only exist there.
 */

import { useMode, useModule } from '@/store/selectors';
import { DetailPanel } from './DetailPanel';
import { Dossier } from './Dossier';
import { FarmMap } from './FarmMap';
import { HeaderBar } from './HeaderBar';
import { IconRail } from './IconRail';
import { LeftRail } from './LeftRail';
import { RepairQueueBar } from './RepairQueueBar';
import { SiteKpiStrip } from './SiteKpiStrip';
import { AnalyticsModule } from './modules/AnalyticsModule';
import { DronesModule } from './modules/DronesModule';
import { MissionsModule } from './modules/MissionsModule';
import { RepairsModule } from './modules/RepairsModule';
import { ScenarioModule } from './modules/ScenarioModule';

function ModuleArea() {
  const mode = useMode();
  const screen = useModule();

  if (mode === 'demo' || screen === 'site') {
    return <><FarmMap /><DetailPanel /></>;
  }
  if (screen === 'drones') return <DronesModule />;
  if (screen === 'missions') return <MissionsModule />;
  if (screen === 'repairs') return <RepairsModule />;
  if (screen === 'scenario') return <ScenarioModule />;
  return <AnalyticsModule />;
}

export function ConsoleRoot() {
  return (
    <div className="console-root">
      <HeaderBar />
      <SiteKpiStrip />
      <IconRail />
      <LeftRail />
      <ModuleArea />
      <RepairQueueBar />
      {/* Last child, positioned against .console-root rather than the viewport —
          the PiP renders a second ConsoleRoot inside a scale(0.31) wrapper and a
          fixed overlay would escape it to cover the whole screen. */}
      <Dossier />
    </div>
  );
}
