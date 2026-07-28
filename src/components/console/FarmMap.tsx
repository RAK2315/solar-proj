'use client';

/**
 * FarmMap — SVG, not canvas. 120 array rects across 3 zones, plus the drone route.
 *
 * The diagonal <pattern> hatch on anomalous arrays is the detail that makes a
 * screenshot of this read as an engineering drawing rather than a heatmap, and it
 * is also the accessibility fix: colour is never the only signal. Critical arrays
 * carry the hatch AND a dashed selection rect AND an ID tag.
 *
 * Healthy arrays are desaturated blue and recede to nearly-background on purpose —
 * a control room scans for anomalies, not for green.
 *
 * SVG geometry note: zone origins come from farm.json; cell size and gaps are
 * presentation and live here. 120 rects is nowhere near an SVG perf concern.
 */

import {
  useFarm, usePanelStatus, useRouteProgress, useZoneSummary,
} from '@/store/selectors';
import type { PanelArray, PanelStatus, Zone } from '@/lib/types';

const VIEW_W = 1000;
const VIEW_H = 700;
const CELL_W = 100;
const CELL_H = 28;
const GAP_X = 12;
const GAP_Y = 10;

const FAULTED = 'B-17';

const STATUS_FILL: Record<PanelStatus, string> = {
  healthy: 'var(--panel-healthy)',
  warning: 'var(--panel-warning)',
  critical: 'var(--panel-critical)',
  scheduled: 'var(--panel-scheduled)',
};

const cellX = (zone: Zone, p: PanelArray) => zone.originX + (p.col - 1) * (CELL_W + GAP_X);
const cellY = (zone: Zone, p: PanelArray) => zone.originY + (p.row - 1) * (CELL_H + GAP_Y);

function PanelCell({ zone, panel }: { zone: Zone; panel: PanelArray }) {
  const status = usePanelStatus(panel.id);
  const anomalous = status !== 'healthy';
  const x = cellX(zone, panel);
  const y = cellY(zone, panel);

  return (
    <g>
      <rect
        x={x} y={y} width={CELL_W} height={CELL_H}
        fill={STATUS_FILL[status]}
        fillOpacity={anomalous ? 0.9 : 0.55}
        stroke={anomalous ? STATUS_FILL[status] : 'var(--line-hairline)'}
        strokeWidth={anomalous ? 1 : 0.5}
        style={{ transition: 'fill 200ms linear, fill-opacity 200ms linear' }}
      />
      {/* Hatch, not just colour. This is the engineering-drawing read. */}
      {anomalous && (
        <rect x={x} y={y} width={CELL_W} height={CELL_H} fill={`url(#hatch-${status})`} />
      )}
    </g>
  );
}

/**
 * Zone health is recomputed from the CURRENT frame rather than read from
 * farm.json, because farm.json is static geometry and knows nothing about a fault
 * that develops at t=6. The card shows the worst status in the zone and the
 * percentage of arrays that are nominal.
 */
function ZoneCard({ zone }: { zone: Zone }) {
  const { label, pct } = useZoneSummary(zone.id);

  const colour = label === 'CRITICAL' ? 'var(--panel-critical)'
    : label === 'SCHEDULED' ? 'var(--panel-scheduled)'
      : label === 'DEGRADED' ? 'var(--panel-warning)' : 'var(--sev-active)';

  const w = 96;
  const x = zone.originX - w - 26;
  const y = zone.originY + 10;

  return (
    <g>
      <rect x={x} y={y} width={w} height={40} fill="var(--surface-panel)"
        stroke="var(--line-hairline)" />
      <text x={x + 10} y={y + 19} fill="var(--text-primary)"
        style={{ font: '600 15px var(--font-cond)', letterSpacing: '0.1em' }}>
        {zone.id}
      </text>
      <circle cx={x + 12} cy={y + 30} r={3} fill={colour} />
      <text x={x + 21} y={y + 33} fill={colour}
        style={{ font: '500 8px var(--font-mono)', letterSpacing: '0.08em' }}>
        {label} {pct}%
      </text>
    </g>
  );
}

function ZoneBlock({ zone }: { zone: Zone }) {
  const w = zone.cols * CELL_W + (zone.cols - 1) * GAP_X;
  const h = zone.rows * CELL_H + (zone.rows - 1) * GAP_Y;
  return (
    <g>
      <rect
        x={zone.originX - 10} y={zone.originY - 10} width={w + 20} height={h + 20}
        fill="none" stroke="var(--line-hairline)" strokeWidth={1}
      />
      {/* Row numbers down the left edge, the way a site drawing is annotated. */}
      {Array.from({ length: zone.rows }, (_, r) => (
        <text
          key={r}
          x={zone.originX - 18} y={zone.originY + r * (CELL_H + GAP_Y) + CELL_H / 2 + 3}
          textAnchor="end" fill="var(--text-muted)"
          style={{ font: '500 8px var(--font-mono)' }}
        >
          {String(r + 1).padStart(2, '0')}
        </text>
      ))}
      {zone.panels.map((p) => <PanelCell key={p.id} zone={zone} panel={p} />)}
    </g>
  );
}

export function FarmMap() {
  const farm = useFarm();
  const progress = useRouteProgress();
  const status = usePanelStatus(FAULTED);

  const zoneB = farm.zones.find((z) => z.id === 'B')!;
  const target = zoneB.panels.find((p) => p.id === FAULTED)!;
  const tx = cellX(zoneB, target);
  const ty = cellY(zoneB, target);

  const pad = farm.dronePads[0];
  // A single quadratic bend so the route reads as a flight path, not a ruler line.
  const end = { x: tx + CELL_W / 2, y: ty + CELL_H / 2 };
  const ctrl = { x: (pad.x + end.x) / 2 - 60, y: (pad.y + end.y) / 2 };
  const route = `M ${pad.x} ${pad.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`;

  // Drone position: the quadratic Bézier evaluated at `progress`. Sampled from t,
  // never integrated, so it lands in the same place whichever direction you seek.
  const bez = (a: number, b: number, c: number, k: number) =>
    (1 - k) * (1 - k) * a + 2 * (1 - k) * k * b + k * k * c;
  const dronePos = {
    x: bez(pad.x, ctrl.x, end.x, progress),
    y: bez(pad.y, ctrl.y, end.y, progress),
  };

  return (
    <div className="area-map inset" style={{ position: 'relative', padding: 'var(--sp-4)' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 'var(--sp-3)', gap: 'var(--sp-4)',
      }}>
        <span className="t-h1" style={{ color: 'var(--text-primary)' }}>
          {farm.name.toUpperCase()}
          <span className="t-micro" style={{ color: 'var(--text-muted)', marginLeft: 'var(--sp-3)' }}>
            {farm.region.toUpperCase()} · {farm.lat.toFixed(3)}° N, {farm.lon.toFixed(3)}° E ·{' '}
            {farm.tilt}° / {farm.azimuth}°
          </span>
        </span>
        <span
          className="t-micro"
          style={{
            color: 'var(--text-secondary)', border: '1px solid var(--line-active)',
            padding: '4px var(--sp-3)', whiteSpace: 'nowrap',
          }}
        >
          MAP MODE: SCHEMATIC ▾
        </span>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        style={{ width: '100%', height: 'calc(100% - 46px)' }}
        role="img"
        aria-label={`Site map, ${FAULTED} is ${status}`}
      >
        <defs>
          {(['warning', 'critical', 'scheduled'] as const).map((s) => (
            <pattern
              key={s} id={`hatch-${s}`}
              width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"
            >
              <line x1={0} y1={0} x2={0} y2={6} stroke="var(--surface-inset)" strokeWidth={2.5} strokeOpacity={0.55} />
            </pattern>
          ))}
          <marker id="route-head" markerWidth={6} markerHeight={6} refX={3} refY={3} orient="auto">
            <circle cx={3} cy={3} r={2.5} fill="var(--sev-active)" />
          </marker>
        </defs>

        {farm.zones.map((z) => <ZoneBlock key={z.id} zone={z} />)}
        {farm.zones.map((z) => <ZoneCard key={`card-${z.id}`} zone={z} />)}

        {/* Drone pads */}
        {farm.dronePads.map((p) => (
          <g key={p.id}>
            <rect x={p.x - 7} y={p.y - 7} width={14} height={14} fill="none"
              stroke="var(--line-active)" strokeWidth={1} />
            <text x={p.x + 14} y={p.y + 4} className="t-micro" fill="var(--text-muted)"
              style={{ fontSize: 10 }}>{p.id}</text>
          </g>
        ))}

        {/* Route: dash geometry computed from t, NOT a CSS keyframe. `pathLength={1}`
            normalises the path so `${progress} 1` draws exactly the flown fraction —
            which means seeking backwards retracts it, and seeking forwards does not
            replay it. That is the whole test. */}
        {progress > 0 && (
          <>
            <path
              d={route} fill="none" stroke="var(--line-active)" strokeWidth={1}
              strokeDasharray="2 4" opacity={0.5}
            />
            <path
              d={route} fill="none" stroke="var(--sev-active)" strokeWidth={1.75}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${progress} 1`}
            />
            <circle cx={dronePos.x} cy={dronePos.y} r={4} fill="var(--sev-active)" />
            <circle cx={dronePos.x} cy={dronePos.y} r={9} fill="none"
              stroke="var(--sev-active)" strokeWidth={1} opacity={0.5} />
          </>
        )}

        {/* Selection: dashed rect + ID tag. Colour is never the only signal. */}
        <rect
          x={tx - 4} y={ty - 4} width={CELL_W + 8} height={CELL_H + 8}
          fill="none"
          stroke={STATUS_FILL[status]}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={status === 'healthy' ? 0.35 : 1}
        />
        <rect x={tx - 4} y={ty - 22} width={54} height={16} fill={STATUS_FILL[status]} />
        <text x={tx + 1} y={ty - 10} className="t-micro" fill="var(--text-inverse)"
          style={{ fontSize: 10, fontWeight: 700 }}>{FAULTED}</text>
      </svg>

      {/* Legend — centred under the map, the way a site drawing keys its symbols. */}
      <div style={{
        position: 'absolute', bottom: 'var(--sp-3)', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 'var(--sp-5)', alignItems: 'center',
        background: 'var(--surface-panel)', border: '1px solid var(--line-hairline)',
        padding: 'var(--sp-2) var(--sp-4)',
      }}>
        {([['healthy', 'Healthy'], ['warning', 'Warning'], ['critical', 'Critical'],
          ['scheduled', 'Scheduled']] as const).map(([k, label]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <span style={{
              width: 13, height: 9, background: STATUS_FILL[k],
              opacity: k === 'healthy' ? 0.55 : 0.9,
              border: `1px solid ${STATUS_FILL[k]}`,
            }} />
            <span className="t-h2" style={{ color: 'var(--text-muted)' }}>{label}</span>
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <span style={{
            width: 15, borderTop: '1px dashed var(--sev-active)', display: 'inline-block',
          }} />
          <span className="t-h2" style={{ color: 'var(--text-muted)' }}>Drone route</span>
        </span>
      </div>
    </div>
  );
}
