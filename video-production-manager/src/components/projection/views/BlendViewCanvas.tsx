/**
 * BlendViewCanvas — Pixel-space & physical blend zone schematic.
 *
 * Inspired by the Alford Widescreen Calculator layout.
 * Shows:
 *   ① Physical screen face with per-projector coverage zones (color-coded)
 *   ② Overlap regions (hatched)
 *   ③ Pixel output canvas map (proportional to pixel counts)
 *   ④ Lens-shift / coverage warnings
 *
 * Not a draggable canvas — read-only schematic tied to the selected surface.
 * A surface picker dropdown is shown when nothing is selected.
 */

import React, { useState, useMemo } from 'react';
import { calcBlend, MIN_OVERLAP_PCT } from '@/components/blend/blendEngine';
import { formatMasImperial } from '@/components/VenueCanvasUtils';
import { derivePositionStats } from '../shared/objectRelations';
import type { ViewCanvasProps } from '../viewTypes';

const W      = 540;
const H_PHYS = 160; // Height of the physical schematic
const H_SIG  = 60;  // Height of the pixel/signal map strip
const H_WARN = 36;  // Warning bar
const PAD    = 28;

// Zone colours cycling for up to 6 projector positions
const ZONE_FILLS   = ['rgba(91,138,255,0.28)', 'rgba(255,133,91,0.28)', 'rgba(91,255,171,0.28)', 'rgba(255,91,205,0.28)', 'rgba(255,222,91,0.28)', 'rgba(91,222,255,0.28)'];
const ZONE_STROKES = ['#5b8aff', '#ff855b', '#5bffab', '#ff5bcd', '#ffde5b', '#5bdeff'];
const OVERLAP_FILL = 'rgba(255,255,150,0.15)';
const OVERLAP_STROKE = 'rgba(255,255,150,0.5)';

export const BlendViewCanvas: React.FC<ViewCanvasProps> = ({
  surfaces, projectors, equipmentSpecs, selected, onSelect,
  selectionSet: _selSet, onBoxSelect: _onBoxSelect, controlsRef: _controlsRef,
  onPositionPatch,
}) => {
  // Per-surface overlap override
  const [overlapOverrides, setOverlapOverrides] = useState<Record<string, number>>({});

  // Which surface to display: prefer selected surface/position, else first surface
  const activeSurfUuid: string | null = useMemo(() => {
    if (selected?.kind === 'surface')  return selected.surfaceUuid;
    if (selected?.kind === 'position') return selected.surfaceUuid;
    return surfaces[0]?.uuid ?? null;
  }, [selected, surfaces]);

  const surf = surfaces.find(s => s.uuid === activeSurfUuid) ?? null;
  const positions = surf?.projectorAssignments ?? [];
  const overlapPct = overlapOverrides[activeSurfUuid ?? ''] ?? 15;

  // Spec lookup for first unit in first position
  const firstPos = positions[0];
  const firstUnit = firstPos?.stackedUnits[0];
  const proj0  = firstUnit ? projectors.find(p => p.uuid === firstUnit.projectorUuid) : null;
  const spec0  = proj0?.equipmentUuid ? equipmentSpecs.find(s => s.uuid === proj0.equipmentUuid) : null;
  const nativeW = spec0?.specs?.nativeW ?? 1920;
  const nativeH = spec0?.specs?.nativeH ?? 1080;
  const throwRatio: number | undefined = spec0?.specs?.throwRatio ?? spec0?.specs?.throwRatioMin ?? undefined;

  const surfW = surf?.widthM ?? 0;
  const surfH = surf?.heightM ?? 0;
  const nProj = positions.length;

  const avgThrow = nProj > 0
    ? positions.reduce((a, p) => a + (p.throwDistM ?? 0), 0) / nProj
    : 0;

  const blendRes = surf && surfW > 0 && nProj > 0
    ? calcBlend({
        screenW: surfW, screenH: surfH, nativeW, nativeH,
        nProj, overlapPct, throwDistM: avgThrow || undefined, throwRatio,
      })
    : null;

  // ── Physical schematic dims ───────────────────────────────────────────────
  const physScale  = surfW > 0 ? (W - 2 * PAD) / surfW : 0;  // px/meter for physical zone
  const physLeft   = PAD;
  const physTop    = PAD + 16; // leave room for surface name
  const physRight  = PAD + surfW * physScale;
  const physBottom = physTop + H_PHYS;
  const physH      = H_PHYS;

  // ── Total SVG height ──────────────────────────────────────────────────────
  const svgH = physBottom + (blendRes ? H_SIG + 20 + H_WARN : H_WARN) + 16;

  return (
    <div className="w-full h-full flex flex-col bg-[#0d1520] rounded overflow-hidden">
      {/* ── Header controls ── */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-av-border/30 flex-shrink-0">
        {/* Surface picker */}
        <select
          value={activeSurfUuid ?? ''}
          onChange={e => onSelect({ kind: 'surface', surfaceUuid: e.target.value }, false)}
          className="text-xs bg-av-surface border border-av-border/60 rounded px-2 py-1 text-av-text flex-1 focus:outline-none"
        >
          {surfaces.length === 0 && <option value="">No surfaces</option>}
          {surfaces.map(s => (
            <option key={s.uuid} value={s.uuid}>{s.name}</option>
          ))}
        </select>

        {/* Overlap control */}
        {blendRes && nProj > 1 && (
          <>
            <label className="text-xs text-av-text-muted whitespace-nowrap">Overlap</label>
            <input
              type="range" min={MIN_OVERLAP_PCT} max={40} value={overlapPct}
              onChange={e => setOverlapOverrides(p => ({ ...p, [activeSurfUuid!]: +e.target.value }))}
              className="w-24 accent-amber-400"
            />
            <span className="text-xs text-amber-400 w-7 text-right">{overlapPct}%</span>
          </>
        )}

        {blendRes && (
          <span className="text-xs text-av-text-muted ml-auto">
            {nProj}× {nativeW}×{nativeH} → {blendRes.canvasW.toLocaleString()}×{blendRes.canvasH} px
          </span>
        )}
      </div>

      {/* ── Schematic SVG ── */}
      <div className="flex-1 overflow-auto">
        {!surf ? (
          <div className="flex items-center justify-center h-full text-av-text-muted text-sm">
            Select a surface to view blend layout
          </div>
        ) : !blendRes || nProj === 0 ? (
          <div className="p-4 text-xs text-av-text-muted space-y-1">
            <p className="font-medium text-av-text">{surf.name}</p>
            {nProj === 0 && <p>No projector positions assigned. Add positions in the Screens tab.</p>}
            {nProj > 0 && !blendRes && <p>Could not compute blend — check screen width and projector spec.</p>}
          </div>
        ) : (
          <svg viewBox={`0 0 ${W} ${svgH}`} className="w-full" style={{ minHeight: svgH }}>
            {/* Surface name */}
            <text x={W / 2} y={physTop - 4} textAnchor="middle" fontSize={10}
              fill="#94a3b8" fontWeight="600">{surf.name}  —  {surf.widthM?.toFixed(2)}m × {surf.heightM?.toFixed(2)}m</text>

            {/* ── Physical zone fills ── */}
            {blendRes.zones_ap.map((zone, i) => {
              const zX  = physLeft + zone.l * physScale;
              const zW  = zone.w * physScale;
              const pos = positions[i];
              const td  = pos?.throwDistM;
              const posLabel = pos?.label ?? `P${i + 1}`;
              return (
                <g key={`zone-${i}`}
                  style={{ cursor: pos ? 'pointer' : 'default' }}
                  onClick={e => { e.stopPropagation(); pos && surf && onSelect({ kind: 'position', surfaceUuid: surf.uuid, positionId: pos.id }, false); }}
                >
                  <rect x={zX} y={physTop} width={zW} height={physH}
                    fill={ZONE_FILLS[i % ZONE_FILLS.length]}
                    stroke={ZONE_STROKES[i % ZONE_STROKES.length]}
                    strokeWidth={0.8}
                  />
                  {/* Zone label */}
                  <text x={zX + zW / 2} y={physTop + 16} textAnchor="middle"
                    fontSize={10} fontWeight="700" fill={ZONE_STROKES[i % ZONE_STROKES.length]}>
                    {posLabel}
                  </text>
                  {/* Throw info */}
                  {td && (
                    <text x={zX + zW / 2} y={physTop + 30} textAnchor="middle"
                      fontSize={8.5} fill={ZONE_STROKES[i % ZONE_STROKES.length] + 'cc'}>
                      {td.toFixed(1)} m throw
                    </text>
                  )}
                  {/* Zone width */}
                  <text x={zX + zW / 2} y={physBottom - 10} textAnchor="middle"
                    fontSize={8} fill="rgba(255,255,255,0.5)">
                    {formatMasImperial(zone.w)}
                  </text>
                </g>
              );
            })}

            {/* Screen outline */}
            <rect x={physLeft} y={physTop} width={surfW * physScale} height={physH}
              fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.2} rx={2}
            />

            {/* Overlap zones — drawn on top */}
            {blendRes.zones_ap.map((zone, i) => {
              if (zone.oR <= 0) return null;
              const ovX = physLeft + (zone.r - zone.oR) * physScale;
              const ovW = zone.oR * physScale;
              return (
                <g key={`ov-${i}`} pointerEvents="none">
                  <rect x={ovX} y={physTop} width={ovW} height={physH}
                    fill={OVERLAP_FILL} stroke={OVERLAP_STROKE} strokeWidth={0.8} />
                  {/* Overlap width label */}
                  <line x1={ovX} y1={physBottom + 6} x2={ovX + ovW} y2={physBottom + 6}
                    stroke={OVERLAP_STROKE} strokeWidth={0.8} />
                  <text x={ovX + ovW / 2} y={physBottom + 15} textAnchor="middle"
                    fontSize={7.5} fill="rgba(255,255,150,0.7)">
                    {formatMasImperial(zone.oR)} overlap
                  </text>
                </g>
              );
            })}

            {/* ── Pixel canvas strip ── */}
            {(() => {
              const sigTop  = physBottom + 32;
              const sigLeft = physLeft;
              const sigW    = W - 2 * PAD;
              const sigH    = H_SIG;
              const pxScale = sigW / blendRes.canvasW;

              return (
                <g>
                  <text x={sigLeft} y={sigTop - 4} fontSize={8.5} fill="#64748b">
                    Output signal canvas: {blendRes.canvasW.toLocaleString()} × {blendRes.canvasH} px
                  </text>
                  {/* Canvas background */}
                  <rect x={sigLeft} y={sigTop} width={sigW} height={sigH}
                    fill="rgba(30,40,60,0.8)" stroke="rgba(100,130,190,0.3)" strokeWidth={1} rx={2} />

                  {/* Per-projector signal blocks */}
                  {blendRes.zones_ap.map((zone, i) => {
                    const bX = sigLeft + zone.pxS * pxScale;
                    const bW = (zone.pxE - zone.pxS) * pxScale;
                    return (
                      <g key={`sig-${i}`}>
                        <rect x={bX} y={sigTop} width={bW} height={sigH}
                          fill={ZONE_FILLS[i % ZONE_FILLS.length]}
                          stroke={ZONE_STROKES[i % ZONE_STROKES.length]}
                          strokeWidth={0.8} opacity={0.85}
                        />
                        <text x={bX + bW / 2} y={sigTop + sigH / 2 + 4} textAnchor="middle"
                          fontSize={9} fontWeight="600" fill="#fff">
                          {zone.pxW.toLocaleString()}px
                        </text>
                      </g>
                    );
                  })}

                  {/* Overlap regions in signal space */}
                  {blendRes.zones_ap.map((zone, i) => {
                    if (zone.oR <= 0 || i === blendRes.zones_ap.length - 1) return null;
                    const nextZone = blendRes.zones_ap[i + 1];
                    if (!nextZone) return null;
                    const ovPxStart = nextZone.pxS;
                    const ovPxEnd   = nextZone.pxS + blendRes.oPx;
                    const ovX_ = sigLeft + ovPxStart * pxScale;
                    const ovW_ = blendRes.oPx * pxScale;
                    return (
                      <rect key={`sov-${i}`} x={ovX_} y={sigTop} width={ovW_} height={sigH}
                        fill={OVERLAP_FILL} stroke={OVERLAP_STROKE} strokeWidth={0.8}
                        pointerEvents="none"
                      />
                    );
                  })}

                  {/* Pixel ruler ticks */}
                  {[0, 0.25, 0.5, 0.75, 1].map(frac => {
                    const px = Math.round(frac * blendRes.canvasW);
                    const rx = sigLeft + frac * sigW;
                    return (
                      <g key={`tick-${frac}`} pointerEvents="none">
                        <line x1={rx} y1={sigTop + sigH} x2={rx} y2={sigTop + sigH + 5}
                          stroke="rgba(255,255,255,0.2)" strokeWidth={0.8} />
                        <text x={rx} y={sigTop + sigH + 13} textAnchor="middle"
                          fontSize={7.5} fill="rgba(255,255,255,0.3)">{px.toLocaleString()}</text>
                      </g>
                    );
                  })}
                </g>
              );
            })()}

            {/* ── Warnings ── */}
            {blendRes.warn.map((w, i) => (
              <text key={i} x={physLeft} y={svgH - 8 + i * 12}
                fontSize={8.5} fill="#f59e0b">⚠ {w}</text>
            ))}

            {/* Computed stats row */}
            <text x={W / 2} y={svgH - 4} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.25)">
              {`projW: ${blendRes.projW.toFixed(2)} m  ·  overlap: ${blendRes.oPhys.toFixed(2)} m  ·  ${blendRes.oPx} px/side  ·  OverlapPct: ${overlapPct}%`}
            </text>
          </svg>
        )}
      </div>
    </div>
  );
};
