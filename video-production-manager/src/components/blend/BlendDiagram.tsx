/**
 * BlendDiagram.tsx — top-down SVG blend zone diagram.
 * Shows physical screen, per-projector coverage zones, and blend regions.
 */
import React from 'react';
import type { BlendResult } from './blendEngine';
import { fmtAR } from './blendEngine';

// Colour palette for projector zones (matches WidescreenBlendCalculator palette)
const ZONE_COLORS = [
  '#4f8ef7', '#e8652a', '#34d399', '#fbbf24',
  '#a78bfa', '#f472b6', '#22d3ee', '#fb923c',
];

interface BlendDiagramProps {
  /** Screen physical width (meters) */
  screenW: number;
  /** Screen physical height (meters) */
  screenH: number;
  result: BlendResult;
  width?: number;
  height?: number;
}

export const BlendDiagram: React.FC<BlendDiagramProps> = ({
  screenW,
  screenH,
  result,
  width = 600,
  height = 180,
}) => {
  const pad = { t: 34, r: 14, b: 42, l: 14 };
  const dW = width - pad.l - pad.r;
  const dH = height - pad.t - pad.b;
  const scale = dW / screenW;
  const sH = Math.min(dH * 0.65, screenH * scale);
  const sY = pad.t + (dH - sH) / 2;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block w-full"
      style={{ maxWidth: width }}
    >
      {/* Screen label */}
      <text
        x={pad.l + dW / 2}
        y={sY - 8}
        textAnchor="middle"
        fill="var(--color-av-text-muted, #7a8ba8)"
        fontSize={10}
      >
        {screenW.toFixed(1)} m × {screenH.toFixed(1)} m ({fmtAR(screenW, screenH)})
      </text>

      {/* Screen outline */}
      <rect
        x={pad.l}
        y={sY}
        width={dW}
        height={sH}
        fill="none"
        stroke="var(--color-av-border, #1a2d55)"
        strokeWidth={1.5}
        strokeDasharray="5 3"
      />

      {/* Projector zones */}
      {result.zones_ap.map((ap, i) => {
        const x = pad.l + ap.l * scale;
        const w = ap.w * scale;
        const col = ZONE_COLORS[i % ZONE_COLORS.length];
        return (
          <g key={i}>
            {/* Zone fill */}
            <rect x={x} y={sY} width={w} height={sH} fill={col} fillOpacity={0.10} stroke={col} strokeWidth={1} />

            {/* Left blend region */}
            {ap.oL > 0 && (
              <rect
                x={x}
                y={sY}
                width={ap.oL * scale}
                height={sH}
                fill="#e8652a"
                fillOpacity={0.20}
              />
            )}

            {/* Right blend region */}
            {ap.oR > 0 && (
              <rect
                x={x + w - ap.oR * scale}
                y={sY}
                width={ap.oR * scale}
                height={sH}
                fill="#e8652a"
                fillOpacity={0.20}
              />
            )}

            {/* Center tick */}
            <line
              x1={pad.l + ap.cx * scale}
              y1={sY + sH}
              x2={pad.l + ap.cx * scale}
              y2={sY + sH + 10}
              stroke={col}
              strokeWidth={1.5}
            />
            <circle cx={pad.l + ap.cx * scale} cy={sY + sH + 14} r={3} fill={col} />
            <text
              x={pad.l + ap.cx * scale}
              y={sY + sH + 26}
              textAnchor="middle"
              fill={col}
              fontSize={9}
              fontWeight={700}
            >
              {ap.label}
            </text>

            {/* Zone width label inside rect */}
            <text
              x={x + w / 2}
              y={sY + sH / 2 + 3}
              textAnchor="middle"
              fill={col}
              fillOpacity={0.7}
              fontSize={8}
            >
              {ap.w.toFixed(2)} m
            </text>
          </g>
        );
      })}

      {/* Overlap pixel labels */}
      {result.zones_ap.slice(0, -1).map((ap, i) => {
        const oS = pad.l + (ap.r - result.oPhys) * scale;
        const oW = result.oPhys * scale;
        return (
          <text
            key={`ol${i}`}
            x={oS + oW / 2}
            y={sY - 18}
            textAnchor="middle"
            fill="#e8652a"
            fontSize={8}
            fontWeight={600}
          >
            {result.oPx}px / {result.oPhys.toFixed(2)} m
          </text>
        );
      })}

      {/* Canvas summary */}
      <text
        x={pad.l + dW / 2}
        y={height - 6}
        textAnchor="middle"
        fill="var(--color-av-text, #e2e8f0)"
        fontSize={10}
        fontWeight={600}
      >
        Canvas: {result.canvasW.toLocaleString()} × {result.canvasH.toLocaleString()} px ({fmtAR(result.canvasW, result.canvasH)})
      </text>
    </svg>
  );
};
