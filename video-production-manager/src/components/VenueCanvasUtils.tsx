import React from 'react';

/**
 * Shared SVG drawing primitives for venue/room canvas views.
 * Used by Staging, Projectors (Layout tab), and future LED/Screens pages.
 */

// ── DimLine ───────────────────────────────────────────────────────────────────
/**
 * Engineering-style dimension callout with arrow heads and a label.
 * Works for horizontal and vertical lines; `offset` pushes the callout
 * perpendicularly away from the measured edge.
 */
export const DimLine: React.FC<{
  x1: number; y1: number;
  x2: number; y2: number;
  label: string;
  /** Perpendicular offset of the callout line from the two anchor points */
  offset?: number;
  color?: string;
}> = ({ x1, y1, x2, y2, label, offset = 14, color = '#f59e0b' }) => {
  const isH = Math.abs(y2 - y1) < Math.abs(x2 - x1);
  const ox = isH ? 0 : offset;
  const oy = isH ? -offset : 0;
  const mx = (x1 + x2) / 2 + ox;
  const my = (y1 + y2) / 2 + oy;
  const markerSize = 4;

  return (
    <g>
      {/* Extension lines */}
      <line x1={x1} y1={y1} x2={x1 + ox} y2={y1 + oy}
        stroke={color} strokeWidth={0.8} strokeDasharray="2 2" opacity={0.6} />
      <line x1={x2} y1={y2} x2={x2 + ox} y2={y2 + oy}
        stroke={color} strokeWidth={0.8} strokeDasharray="2 2" opacity={0.6} />
      {/* Main callout line */}
      <line x1={x1 + ox} y1={y1 + oy} x2={x2 + ox} y2={y2 + oy}
        stroke={color} strokeWidth={1} opacity={0.9} />
      {/* Arrow heads */}
      {isH ? (
        <>
          <polygon points={`${x1+ox},${y1+oy} ${x1+ox+markerSize},${y1+oy-2} ${x1+ox+markerSize},${y1+oy+2}`}
            fill={color} opacity={0.9} />
          <polygon points={`${x2+ox},${y2+oy} ${x2+ox-markerSize},${y2+oy-2} ${x2+ox-markerSize},${y2+oy+2}`}
            fill={color} opacity={0.9} />
        </>
      ) : (
        <>
          <polygon points={`${x1+ox},${y1+oy} ${x1+ox-2},${y1+oy+markerSize} ${x1+ox+2},${y1+oy+markerSize}`}
            fill={color} opacity={0.9} />
          <polygon points={`${x2+ox},${y2+oy} ${x2+ox-2},${y2+oy-markerSize} ${x2+ox+2},${y2+oy-markerSize}`}
            fill={color} opacity={0.9} />
        </>
      )}
      {/* Label background + text */}
      <rect x={mx - label.length * 2.8} y={my - 6} width={label.length * 5.6} height={11}
        fill="#1a1d23" rx={2} opacity={0.85} />
      <text x={mx} y={my + 3.5} textAnchor="middle" fill={color} fontSize={8.5} fontWeight="600"
        style={{ fontFamily: 'monospace' }}>
        {label}
      </text>
    </g>
  );
};

// ── Canvas snap settings ─────────────────────────────────────────────────────
/**
 * Global movement snap increment for all venue canvases.
 * Edit `CANVAS_SNAP_INCHES` here to change snapping everywhere at once.
 * Default: 3 inches.
 */
export const CANVAS_SNAP_INCHES = 3;
/** Snap increment in feet — used by the Staging canvas. */
export const CANVAS_SNAP_FT = CANVAS_SNAP_INCHES / 12;        // 0.25 ft
/** Snap increment in meters — used by Projectors / Layout / LED canvases. */
export const CANVAS_SNAP_M  = CANVAS_SNAP_INCHES * 0.0254;    // ~0.076 m

// ── snapTo ────────────────────────────────────────────────────────────────────
/** Snap a value to the nearest multiple of `grid`. */
export function snapTo(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

// ── formatM ───────────────────────────────────────────────────────────────────
/** Format meters as "X' Y\"" for dimensioned labels. */
export function formatMasImperial(valueM: number): string {
  const totalIn = valueM / 0.0254;
  const ft = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn % 12);
  if (inches === 0) return `${ft}'`;
  if (ft === 0) return `${inches}"`;
  return `${ft}' ${inches}"`;
}
