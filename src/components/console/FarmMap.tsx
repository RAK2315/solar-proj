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

import { useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

import {
  useActiveMissions, useFarm, useMode, usePanelStatus, useRouteProgress,
  useSelectedPanelId, useSiteFrame, useZoneSummary,
} from '@/store/selectors';
import { useSession } from '@/store/session';
import type { PanelArray, PanelStatus, Zone } from '@/lib/types';

/* The viewBox carries a left gutter and a little headroom, because the zone
   annotations live OUTSIDE the blocks. Zone origins come from farm.json and start
   at x=58, so a card drawn to the left of a block used to land at x=-64 and was
   silently clipped away — the zone health readouts were not on screen at all. */
const VIEW_X = -136;
const VIEW_Y = -30;
const VIEW_W = 1096;
const VIEW_H = 754;
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

function PanelCell({
  zone, panel, selected, onSelect,
}: {
  zone: Zone; panel: PanelArray; selected: boolean; onSelect: (id: string) => void;
}) {
  const status = usePanelStatus(panel.id);
  const anomalous = status !== 'healthy';
  const x = cellX(zone, panel);
  const y = cellY(zone, panel);

  return (
    <g
      onClick={() => onSelect(panel.id)}
      style={{ cursor: 'pointer' }}
      role="button"
      tabIndex={0}
      aria-label={`Array ${panel.id}, ${status}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(panel.id); }}
    >
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
      {/* Every array carries its ID. 120 labels is a lot of ink and it is the
          difference between a heatmap and a drawing you can navigate: an operator
          who has been told "B-17" can find B-17 without counting rows. */}
      <text
        x={x + CELL_W - 5} y={y + CELL_H - 6}
        textAnchor="end"
        fill={anomalous ? 'var(--text-inverse)' : 'var(--text-secondary)'}
        style={{
          font: `${anomalous ? 700 : 500} 10px var(--font-mono)`,
          letterSpacing: '0.04em', pointerEvents: 'none',
        }}
      >
        {panel.id}
      </text>
      {selected && (
        <rect
          x={x - 3} y={y - 3} width={CELL_W + 6} height={CELL_H + 6}
          fill="none" stroke="var(--text-primary)" strokeWidth={1.5}
        />
      )}
      <title>{`${panel.id} — ${status}`}</title>
    </g>
  );
}

/**
 * Zone health is recomputed from the CURRENT frame rather than read from
 * farm.json, because farm.json is static geometry and knows nothing about a fault
 * that develops at t=6. The annotation shows the worst status in the zone and the
 * percentage of arrays that are nominal.
 *
 * The zone NAME is set large, rotated and nearly the colour of the background —
 * the way a block is labelled on a site drawing. It is the biggest text on the map
 * and the quietest, which is the only combination that lets a label that size not
 * compete with the thing it labels.
 */
function ZoneAnnotation({ zone }: { zone: Zone }) {
  const { label, pct } = useZoneSummary(zone.id);

  const colour = label === 'CRITICAL' ? 'var(--panel-critical)'
    : label === 'SCHEDULED' ? 'var(--panel-scheduled)'
      : label === 'DEGRADED' ? 'var(--panel-warning)' : 'var(--sev-active)';

  const h = zone.rows * CELL_H + (zone.rows - 1) * GAP_Y;
  const midY = zone.originY + h / 2;

  return (
    <g>
      <text
        x={-84} y={midY}
        textAnchor="middle"
        fill="var(--line-active)"
        style={{ font: '600 34px var(--font-cond)', letterSpacing: '0.18em' }}
        transform={`rotate(-90 ${-84} ${midY})`}
      >
        {zone.label.toUpperCase()}
      </text>

      <g transform={`translate(-136 ${zone.originY - 4})`}>
        <rect x={0} y={0} width={44} height={2} fill={colour} />
        <text x={0} y={20} fill={colour}
          style={{ font: '700 11px var(--font-mono)', letterSpacing: '0.06em' }}>
          {label}
        </text>
        <text x={0} y={36} fill="var(--text-secondary)"
          style={{ font: '500 11px var(--font-mono)' }}>
          {pct}% NOMINAL
        </text>
      </g>
    </g>
  );
}

function ZoneBlock({
  zone, selectedId, onSelect,
}: { zone: Zone; selectedId: string; onSelect: (id: string) => void }) {
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
          textAnchor="end" fill="var(--text-secondary)"
          style={{ font: '500 8px var(--font-mono)' }}
        >
          {String(r + 1).padStart(2, '0')}
        </text>
      ))}
      {zone.panels.map((p) => (
        <PanelCell
          key={p.id}
          zone={zone}
          panel={p}
          selected={p.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </g>
  );
}

export function FarmMap() {
  const farm = useFarm();
  const progress = useRouteProgress();
  const mode = useMode();
  const selected = useSelectedPanelId();
  const select = useSession((s) => s.selectPanel);
  // In live mode the route is drawn to whatever the operator dispatched to; in
  // demo mode it is the scripted run to B-17.
  const status = usePanelStatus(FAULTED);

  const zoneB = farm.zones.find((z) => z.id === 'B')!;
  const target = zoneB.panels.find((p) => p.id === FAULTED)!;
  const tx = cellX(zoneB, target);
  const ty = cellY(zoneB, target);

  const missions = useActiveMissions();
  const frame = useSiteFrame();

  // A view preference over a derived drawing, the same class of state as the feed's
  // SHOW ALL: it does not mirror the clock, so seeking cannot leave it wrong. The
  // viewBox shrinks around the centre, which is what makes it a zoom rather than a
  // scale — the strokes stay 1px and the drawing stays a drawing.
  const [zoom, setZoom] = useState(1);
  const zw = VIEW_W / zoom;
  const zh = VIEW_H / zoom;
  const zx = VIEW_X + (VIEW_W - zw) / 2;
  const zy = VIEW_Y + (VIEW_H - zh) / 2;

  /** Route geometry to any array — live missions and the scripted one share it. */
  const routeTo = (targetId: string, padIndex: number) => {
    const zone = farm.zones.find((z) => z.panels.some((p) => p.id === targetId));
    const panel = zone?.panels.find((p) => p.id === targetId);
    if (!zone || !panel) return null;
    const px = cellX(zone, panel) + CELL_W / 2;
    const py = cellY(zone, panel) + CELL_H / 2;
    const from = farm.dronePads[padIndex % farm.dronePads.length];
    const ctrlPt = { x: (from.x + px) / 2 - 60, y: (from.y + py) / 2 };
    return {
      d: `M ${from.x} ${from.y} Q ${ctrlPt.x} ${ctrlPt.y} ${px} ${py}`,
      from, ctrl: ctrlPt, end: { x: px, y: py },
    };
  };

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
    <div className="area-map" style={{
      position: 'relative', background: 'var(--surface-void)', overflow: 'hidden',
    }}>
      {/* A 40px survey grid behind the drawing. It costs nothing and it is what
          makes 120 hatched rectangles read as a plan rather than a heatmap. */}
      <span className="survey-grid" aria-hidden />

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: 'var(--sp-3)', gap: 'var(--sp-4)', pointerEvents: 'none',
      }}>
        <span style={{
          background: 'var(--surface-panel)', border: '1px solid var(--line-active)',
          padding: 'var(--sp-2) var(--sp-3)', display: 'grid', gap: 2,
        }}>
          <span className="t-h1" style={{ color: 'var(--text-primary)', letterSpacing: '0.2em' }}>
            {farm.name.toUpperCase()}
          </span>
          <span className="t-micro" style={{ color: 'var(--text-secondary)' }}>
            {farm.region.toUpperCase()} · {farm.lat.toFixed(3)}° N, {farm.lon.toFixed(3)}° E ·{' '}
            {farm.tilt}° / {farm.azimuth}° · {mode === 'live' ? frame.clock : 'REPLAY'}
          </span>
        </span>

        <span style={{ display: 'flex', gap: 'var(--sp-2)', pointerEvents: 'auto' }}>
          <span
            className="t-micro"
            style={{
              color: 'var(--text-secondary)', background: 'var(--surface-panel)',
              border: '1px solid var(--line-active)', padding: '7px var(--sp-3)',
              whiteSpace: 'nowrap', alignSelf: 'center',
            }}
          >
            {mode === 'live' ? 'CLICK AN ARRAY TO INSPECT' : 'SCHEMATIC · NORTH UP'}
          </span>
          {([['in', ZoomIn], ['out', ZoomOut]] as const).map(([dir, Icon]) => {
            const next = dir === 'in' ? Math.min(2.5, zoom * 1.25) : Math.max(1, zoom / 1.25);
            return (
              <button
                key={dir}
                type="button"
                className="btn-reset"
                onClick={() => setZoom(next)}
                disabled={next === zoom}
                aria-label={dir === 'in' ? 'Zoom in on the site map' : 'Zoom out of the site map'}
                style={{
                  width: 32, height: 32, display: 'grid', placeItems: 'center',
                  background: 'var(--surface-panel)',
                  border: '1px solid var(--line-active)',
                  color: next === zoom ? 'var(--text-secondary)' : 'var(--text-primary)',
                  cursor: next === zoom ? 'default' : 'pointer',
                }}
              >
                <Icon size={17} strokeWidth={1.75} aria-hidden />
              </button>
            );
          })}
        </span>
      </div>

      <svg
        viewBox={`${zx} ${zy} ${zw} ${zh}`}
        style={{
          width: '100%', height: '100%', position: 'relative', zIndex: 1,
          padding: 'var(--sp-4)', boxSizing: 'border-box',
        }}
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

        {farm.zones.map((z) => (
          <ZoneBlock key={z.id} zone={z} selectedId={selected} onSelect={select} />
        ))}
        {farm.zones.map((z) => <ZoneAnnotation key={`zone-${z.id}`} zone={z} />)}

        {/* Drone pads */}
        {farm.dronePads.map((p) => (
          <g key={p.id}>
            <rect x={p.x - 7} y={p.y - 7} width={14} height={14} fill="none"
              stroke="var(--line-active)" strokeWidth={1} />
            <text x={p.x + 14} y={p.y + 4} className="t-micro" fill="var(--text-secondary)"
              style={{ fontSize: 10 }}>{p.id}</text>
          </g>
        ))}

        {/* LIVE routes: one per airborne mission, drawn to the array the operator
            actually dispatched to. Same geometry as the scripted route — the demo
            is just the case where the target happens to be B-17. */}
        {mode === 'live' && missions.map((m, i) => {
          const r = routeTo(m.panelId, i);
          if (!r) return null;
          const k = m.phase === 'outbound' ? m.progress : 1;
          const bez2 = (a: number, b: number, c: number, t2: number) =>
            (1 - t2) * (1 - t2) * a + 2 * (1 - t2) * t2 * b + t2 * t2 * c;
          const dp = {
            x: bez2(r.from.x, r.ctrl.x, r.end.x, k),
            y: bez2(r.from.y, r.ctrl.y, r.end.y, k),
          };
          return (
            <g key={m.id}>
              <path d={r.d} fill="none" stroke="var(--line-active)" strokeWidth={1}
                strokeDasharray="2 4" opacity={0.5} />
              <path d={r.d} fill="none" stroke="var(--sev-active)" strokeWidth={1.75}
                strokeLinecap="round" pathLength={1} strokeDasharray={`${k} 1`} />
              <circle cx={dp.x} cy={dp.y} r={4} fill="var(--sev-active)" />
              <circle cx={dp.x} cy={dp.y} r={9} fill="none" stroke="var(--sev-active)"
                strokeWidth={1} opacity={0.5} />
              <text x={dp.x + 12} y={dp.y + 3} className="t-micro"
                fill="var(--sev-active)" style={{ fontSize: 9 }}>
                {m.droneId.replace('DRONE ', 'D')}
              </text>
            </g>
          );
        })}

        {/* Route: dash geometry computed from t, NOT a CSS keyframe. `pathLength={1}`
            normalises the path so `${progress} 1` draws exactly the flown fraction —
            which means seeking backwards retracts it, and seeking forwards does not
            replay it. That is the whole test. */}
        {mode === 'demo' && progress > 0 && (
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
            <span className="t-h2" style={{ color: 'var(--text-secondary)' }}>{label}</span>
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <span style={{
            width: 15, borderTop: '1px dashed var(--sev-active)', display: 'inline-block',
          }} />
          <span className="t-h2" style={{ color: 'var(--text-secondary)' }}>Drone route</span>
        </span>
      </div>
    </div>
  );
}
