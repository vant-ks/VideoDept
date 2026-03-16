/**
 * ConeView.tsx — front / top / side projection cone SVG views.
 * Ported from imports/_unpack/screen_calc/WidescreenBlendCalculator.jsx (ConeView component).
 * All coordinates in meters.
 */
import React, { useMemo } from 'react';
import type { ConePoint } from './blendEngine';

const ZONE_COLORS = [
  '#4f8ef7', '#e8652a', '#34d399', '#fbbf24',
  '#a78bfa', '#f472b6', '#22d3ee', '#fb923c',
];

export type ConeViewType = 'top' | 'side' | 'front';

interface ConeViewProps {
  cones: ConePoint[];
  /** Screen physical height (meters) */
  screenH: number;
  /** Screen bottom Y in room (meters) */
  posY?: number;
  view: ConeViewType;
  width?: number;
  height?: number;
}

export const ConeView: React.FC<ConeViewProps> = ({
  cones,
  screenH,
  posY = 0,
  view,
  width = 320,
  height = 220,
}) => {
  const pad = 28;
  const dW = width - pad * 2;
  const dH = height - pad * 2;

  const shapes = useMemo(() => {
    if (!cones.length) return [];

    if (view === 'top') {
      const maxZ = Math.max(...cones.map(c => Math.abs(c.pz)), 5) * 1.15;
      const allX = cones.flatMap(c => [c.sL, c.sR, c.px]);
      const minX = Math.min(...allX) - 1;
      const rangeX = Math.max(...allX) - minX + 2;
      const sx = (v: number) => pad + ((v - minX) / rangeX) * dW;
      const sz = (v: number) => pad + 20 + (v / maxZ) * (dH - 20);
      const screenLineX0 = sx(Math.min(...allX) - 1);
      const screenLineX1 = sx(Math.max(...allX) + 1);
      const screenLineY = sz(0);

      return cones.map((c, i) => ({
        i, col: ZONE_COLORS[i % ZONE_COLORS.length],
        view: 'top' as const,
        projPt: [sx(c.px), sz(Math.abs(c.pz))],
        scrPts: [[sx(c.sL), sz(0)], [sx(c.sR), sz(0)]],
        screenLine: [[screenLineX0, screenLineY], [screenLineX1, screenLineY]],
      }));
    }

    if (view === 'side') {
      const maxZ = Math.max(...cones.map(c => Math.abs(c.pz)), 5) * 1.15;
      const allY = [...cones.map(c => c.py), posY, posY + screenH, 0];
      const minY = Math.min(...allY) - 1;
      const maxY = Math.max(...allY) + 2;
      const rangeY = maxY - minY;
      const sx = (v: number) => pad + (v / maxZ) * dW;
      const sy = (v: number) => height - pad - ((v - minY) / rangeY) * dH;

      return cones.map((c, i) => ({
        i, col: ZONE_COLORS[i % ZONE_COLORS.length],
        view: 'side' as const,
        projPt: [sx(Math.abs(c.pz)), sy(c.py)],
        scrPts: [[sx(0), sy(c.sT)], [sx(0), sy(c.sB)]],
        floor: [[pad, sy(0)], [pad + dW, sy(0)]],
        screenLine: [[sx(0), sy(posY)], [sx(0), sy(posY + screenH)]],
      }));
    }

    // front view
    const allX = cones.flatMap(c => [c.sL, c.sR, c.px]);
    const allY = [posY, posY + screenH, ...cones.map(c => c.py), 0];
    const minX = Math.min(...allX) - 2;
    const maxX = Math.max(...allX) + 2;
    const rangeX = maxX - minX;
    const minY = Math.min(...allY) - 1;
    const maxY = Math.max(...allY) + 2;
    const rangeY = maxY - minY;
    const sx = (v: number) => pad + ((v - minX) / rangeX) * dW;
    const sy = (v: number) => height - pad - ((v - minY) / rangeY) * dH;
    const screenRect = {
      x: sx(cones[0].sL),
      y: sy(posY + screenH),
      w: sx(cones[cones.length - 1].sR) - sx(cones[0].sL),
      h: sy(posY) - sy(posY + screenH),
    };
    const floor = [[pad, sy(0)], [pad + dW, sy(0)]];

    return cones.map((c, i) => ({
      i, col: ZONE_COLORS[i % ZONE_COLORS.length],
      view: 'front' as const,
      rect: { x: sx(c.sL), y: sy(c.sT), w: sx(c.sR) - sx(c.sL), h: sy(c.sB) - sy(c.sT) },
      projPt: [sx(c.px), sy(c.py)],
      screenRect,
      floor,
    }));
  }, [cones, screenH, posY, view, width, height, pad, dW, dH]);

  if (!cones.length) return null;

  const VIEW_LABEL: Record<ConeViewType, string> = { top: 'TOP VIEW', side: 'SIDE VIEW', front: 'FRONT VIEW' };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
    >
      <rect width={width} height={height} fill="var(--color-av-surface, #0c1628)" rx={6} />
      <text
        x={width / 2}
        y={16}
        textAnchor="middle"
        fill="#e8652a"
        fontSize={10}
        fontWeight={700}
        letterSpacing={1.5}
      >
        {VIEW_LABEL[view]}
      </text>

      {view === 'top' && shapes.map(s => (
        <g key={s.i}>
          {s.i === 0 && (
            <line
              x1={(s as any).screenLine[0][0]} y1={(s as any).screenLine[0][1]}
              x2={(s as any).screenLine[1][0]} y2={(s as any).screenLine[1][1]}
              stroke="var(--color-av-border, #1a2d55)" strokeWidth={2} strokeDasharray="4 2"
            />
          )}
          <polygon
            points={`${(s as any).projPt[0]},${(s as any).projPt[1]} ${(s as any).scrPts[0][0]},${(s as any).scrPts[0][1]} ${(s as any).scrPts[1][0]},${(s as any).scrPts[1][1]}`}
            fill={s.col} fillOpacity={0.07} stroke={s.col} strokeWidth={0.8} strokeOpacity={0.5}
          />
          <circle cx={(s as any).projPt[0]} cy={(s as any).projPt[1]} r={4} fill={s.col} />
          <text x={(s as any).projPt[0]} y={(s as any).projPt[1] - 7} textAnchor="middle" fill={s.col} fontSize={9} fontWeight={700}>
            P{s.i + 1}
          </text>
        </g>
      ))}

      {view === 'side' && shapes.map(s => (
        <g key={s.i}>
          {s.i === 0 && (
            <>
              <line
                x1={(s as any).screenLine[0][0]} y1={(s as any).screenLine[0][1]}
                x2={(s as any).screenLine[1][0]} y2={(s as any).screenLine[1][1]}
                stroke="var(--color-av-text-muted, #7a8ba8)" strokeWidth={3}
              />
              <line
                x1={(s as any).floor[0][0]} y1={(s as any).floor[0][1]}
                x2={(s as any).floor[1][0]} y2={(s as any).floor[1][1]}
                stroke="var(--color-av-border, #1a2d55)" strokeWidth={1} strokeDasharray="3 3"
              />
            </>
          )}
          <polygon
            points={`${(s as any).projPt[0]},${(s as any).projPt[1]} ${(s as any).scrPts[0][0]},${(s as any).scrPts[0][1]} ${(s as any).scrPts[1][0]},${(s as any).scrPts[1][1]}`}
            fill={s.col} fillOpacity={0.07} stroke={s.col} strokeWidth={0.8} strokeOpacity={0.4}
          />
          <circle cx={(s as any).projPt[0]} cy={(s as any).projPt[1]} r={4} fill={s.col} />
          <text x={(s as any).projPt[0] + 8} y={(s as any).projPt[1] + 3} fill={s.col} fontSize={9} fontWeight={700}>
            P{s.i + 1}
          </text>
        </g>
      ))}

      {view === 'front' && shapes.map(s => (
        <g key={s.i}>
          {s.i === 0 && (
            <>
              <rect
                x={(s as any).screenRect.x} y={(s as any).screenRect.y}
                width={(s as any).screenRect.w} height={(s as any).screenRect.h}
                fill="none" stroke="var(--color-av-border, #1a2d55)" strokeWidth={1.5} strokeDasharray="5 3"
              />
              <line
                x1={(s as any).floor[0][0]} y1={(s as any).floor[0][1]}
                x2={(s as any).floor[1][0]} y2={(s as any).floor[1][1]}
                stroke="var(--color-av-border, #1a2d55)" strokeWidth={1} strokeDasharray="3 3"
              />
            </>
          )}
          <rect
            x={(s as any).rect.x} y={(s as any).rect.y}
            width={(s as any).rect.w} height={(s as any).rect.h}
            fill={s.col} fillOpacity={0.08} stroke={s.col} strokeWidth={1}
          />
          <circle cx={(s as any).projPt[0]} cy={(s as any).projPt[1]} r={4} fill={s.col} />
          <text x={(s as any).projPt[0]} y={(s as any).projPt[1] - 7} textAnchor="middle" fill={s.col} fontSize={9} fontWeight={700}>
            P{s.i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
};
