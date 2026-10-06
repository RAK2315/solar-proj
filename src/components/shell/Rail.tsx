'use client';

/**
 * Rail: where the operator is, what time the site thinks it is, and how the site
 * is doing. The only chrome on the screen.
 */

import {
  Activity, Box, FlaskConical, Grid2x2, ListOrdered, Map, Moon, Navigation, Pause, Play, ScanSearch,
  Sun,
} from 'lucide-react';

import { MW, num } from '@/lib/format';
import { useFlatField, useSiteFrame } from '@/store/selectors';
import { useSession, type ModuleId } from '@/store/session';

export type ScreenId = 'site' | 'incident' | 'queue' | 'analytics' | 'drones' | 'sandbox';

const NAV: Array<{ id: ScreenId; label: string; Icon: typeof Map }> = [
  { id: 'site', label: 'Site', Icon: Map },
  { id: 'incident', label: 'Incident', Icon: ScanSearch },
  { id: 'queue', label: 'Queue', Icon: ListOrdered },
  { id: 'analytics', label: 'Analytics', Icon: Activity },
  { id: 'drones', label: 'Drones', Icon: Navigation },
  { id: 'sandbox', label: 'Sandbox', Icon: FlaskConical },
];

/** A session saved by the old console may name a screen that no longer exists. */
const RENAMED: Partial<Record<ModuleId, ScreenId>> = {
  missions: 'drones', repairs: 'queue', scenario: 'sandbox',
};
export const screenOf = (m: ModuleId): ScreenId => RENAMED[m] ?? (m as ScreenId);

const SPEEDS = [1, 60, 600];

function Clock() {
  const running = useSession((s) => s.running);
  const scale = useSession((s) => s.timeScale);
  const toggle = useSession((s) => s.toggleRunning);
  const setScale = useSession((s) => s.setTimeScale);
  return (
    <div className="time" role="group" aria-label="Site clock">
      <button type="button" className="tool" aria-label={running ? 'Pause site clock' : 'Run site clock'} onClick={toggle}>
        {running ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
      </button>
      {SPEEDS.map((x) => (
        <button key={x} type="button" className="tool quiet num" aria-pressed={scale === x} aria-label={`Run site time at ${x}×`} onClick={() => setScale(x)}>{x}×</button>
      ))}
    </div>
  );
}

function Kpis() {
  const f = useSiteFrame();
  return (
    <dl className="kpis">
      <div><dd className="num">{f.clock}</dd><dt>site time</dt></div>
      <div><dd className="num">{MW(f.farmOutputMW)}</dd><dt>output</dt></div>
      <div><dd className="num">{num(f.farmHealth, 0)}</dd><dt>health</dt></div>
      <div><dd className="num">{f.anomalies}</dd><dt>anomalies</dt></div>
    </dl>
  );
}

function Prefs() {
  const theme = useSession((s) => s.theme);
  const toggleTheme = useSession((s) => s.toggleTheme);
  const setMode = useSession((s) => s.setTwinMode);
  const flat = useFlatField();
  // Without WebGL there is no 3D field to go back to.
  const stuck = useSession((s) => s.twinFallback === 'webgl');
  return (
    <div className="prefs">
      <button type="button" className="tool" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}>
        {theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
      </button>
      <button
        type="button" className="tool" disabled={stuck}
        aria-label={flat ? 'Show the field in 3D' : 'Show the field in 2D'}
        onClick={() => setMode(flat ? '3d' : '2d')}
      >
        {flat ? <Box size={16} aria-hidden /> : <Grid2x2 size={16} aria-hidden />}
      </button>
    </div>
  );
}

export function Rail({ screen }: { screen: ScreenId }) {
  const setModule = useSession((s) => s.setModule);
  return (
    <nav className="sy-rail glass" aria-label="Console">
      <span className="brand">Surya</span>
      <div className="tabs">
        {NAV.map(({ id, label, Icon }) => (
          <button key={id} type="button" aria-current={id === screen ? 'page' : undefined} onClick={() => setModule(id)}>
            <Icon size={18} strokeWidth={1.75} aria-hidden /><span>{label}</span>
          </button>
        ))}
      </div>
      <Clock />
      <Kpis />
      <Prefs />
    </nav>
  );
}
