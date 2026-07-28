'use client';

/**
 * Sparkline — 40px trend under each header KPI.
 *
 * Plain SVG rather than recharts: at 40×28 with no axes, no tooltip and no legend,
 * a charting library is 90 kB to draw one polyline. recharts earns its place in
 * ForecastBand, where the band, the reference line and the axis all matter.
 */

interface Props {
  values: number[];
  colour?: string;
  width?: number;
  height?: number;
}

export function Sparkline({
  values, colour = 'var(--sev-active)', width = 88, height = 28,
}: Props) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);

  const points = values
    .map((v, i) => `${(i * step).toFixed(2)},${(height - ((v - min) / span) * height).toFixed(2)}`)
    .join(' ');

  const last = values[values.length - 1];
  const lastY = height - ((last - min) / span) * height;

  return (
    <svg width={width} height={height} aria-hidden style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={colour}
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={width} cy={lastY} r={2} fill={colour} />
    </svg>
  );
}
