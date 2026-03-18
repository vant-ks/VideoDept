/**
 * FrontViewCanvas — X-Z front elevation view.
 *
 * Looking toward +Y (from audience toward stage).
 *   Horizontal axis → World X (width):  left = SL (−), right = SR (+)
 *   Vertical axis   → World Z (height): bottom = floor (Z=0), top = ceiling
 *
 * Draggable:
 *   - Screen rect     → changes posDsXM (X) and distFloorM (Z)
 *   - Projector dot   → changes horizOffsetM (X) and mountHeightM (Z)
 *   - Matte rect      → changes matte's xM / yM in image space
 *
 * Zoom: mouse wheel  |  Pan: middle-mouse drag
 */

import React, { useRef, useState, useEffect, useId } from 'react';
import { snapTo, formatMasImperial } from '@/components/VenueCanvasUtils';
import { DimLine } from '@/components/VenueCanvasUtils';
import { useViewTransform } from '../shared/useViewTransform';
import {
  screenBottomZ, screenTopZ, defaultMountHeight, applyMatteDrag,
} from '../shared/objectRelations';
import type { ViewCanvasProps } from '../viewTypes';
import type { ProjectionSurface, SurfaceMatte } from '@/hooks/useProjectionSurfaceAPI';

const W    = 540;
const H    = 370;
const PAD  = 28;

// Hatch pattern ID suffix — unique per instance to avoid SVG id collisions
let instanceId = 0;

export const FrontViewCanvas: React.FC<ViewCanvasProps> = ({
  venueData, surfaces, projectors, equipmentSpecs, ledWalls,
  snapInches, selected, onSelect, onSurfacePatch, onPositionPatch, onMattePatch,
}) => {
  const svgRef   = useRef<SVGSVGElement>(null);
  const vt       = useViewTransform(W, H);
  const { t: { zoom, panX, panY }, fitRect, onWheel, onMiddleDown, onMiddleMove, onMiddleUp, toBase } = vt;
  const patternId = useRef(`fhatch-${++instanceId}`).current;

  const [hudPos, setHudPos] = useState<{ xM: number; zM: number } | null>(null);

  const roomW  = venueData.roomWidthM;
  const roomH  = venueData.roomHeightM || 8;
  const hasRoom = roomW > 0;
  const SNAP_M  = snapInches * 0.0254;

  // Base-canvas scale — uniform
  const baseScale = hasRoom
    ? Math.min((W - 2 * PAD) / roomW, (H - 2 * PAD) / roomH)
    : 10;

  // World → base-canvas
  const fx = (worldX: number) => W / 2 + worldX * baseScale;      // X centered at 0 (DSC center)
  const fz = (worldZ: number) => H - PAD - worldZ * baseScale;     // Z: inverted (up = visually up)

  // Base-canvas → world
  const bx2x = (bx: number) => (bx - W / 2) / baseScale;
  const by2z = (by: number) => (H - PAD - by) / baseScale;

  useEffect(() => {
    if (!hasRoom) return;
    fitRect(fx(-roomW / 2), fz(roomH), roomW * baseScale, roomH * baseScale);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomW, roomH]);

  // ── Drag state ────────────────────────────────────────────────────────────
  const dragRef = useRef<
    | { kind: 'surface';  uuid: string; startSvgX: number; startSvgY: number; startX: number; startZ: number }
    | { kind: 'position'; surfaceUuid: string; posId: string; startSvgX: number; startSvgY: number; startHoriz: number; startMount: number }
    | { kind: 'matte';    surfaceUuid: string; matteId: string; startSvgX: number; startSvgY: number; matte: SurfaceMatte }
    | null
  >(null);

  function getSvgPt(e: { clientX: number; clientY: number }): [number, number] {
    const rect = svgRef.current!.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width)  * W,
      ((e.clientY - rect.top)  / rect.height) * H,
    ];
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    vt.onMiddleMove(e);
    if (!dragRef.current) return;
    const [sx_, sy_]   = getSvgPt(e);
    const [bx, by]     = toBase(sx_, sy_);
    const [bxS, byS]   = toBase(dragRef.current.startSvgX, dragRef.current.startSvgY);
    const dX = (bx - bxS) / baseScale;
    const dZ = -(by - byS) / baseScale;

    if (dragRef.current.kind === 'surface') {
      const newX = snapTo(dragRef.current.startX + dX, SNAP_M);
      const newZ = snapTo(Math.max(0, dragRef.current.startZ + dZ), SNAP_M);
      onSurfacePatch(dragRef.current.uuid, { posDsXM: newX, distFloorM: newZ });
      setHudPos({ xM: newX, zM: newZ });

    } else if (dragRef.current.kind === 'position') {
      const newH = snapTo(dragRef.current.startHoriz + dX, SNAP_M);
      const newM = snapTo(Math.max(0, dragRef.current.startMount + dZ), SNAP_M);
      onPositionPatch(dragRef.current.surfaceUuid, dragRef.current.posId, {
        horizOffsetM: newH,
        ...({ mountHeightM: newM } as any),
      });
      setHudPos({ xM: newH, zM: newM });

    } else if (dragRef.current.kind === 'matte') {
      const dr = dragRef.current as { kind: 'matte'; surfaceUuid: string; matteId: string; startSvgX: number; startSvgY: number; matte: SurfaceMatte };
      const srf = surfaces.find(s => s.uuid === dr.surfaceUuid);
      if (srf && onMattePatch) {
        const patch = applyMatteDrag(srf, dr.matte, dX, dZ);
        onMattePatch(dr.surfaceUuid, dr.matteId, patch);
        if (patch.xM !== undefined) setHudPos({ xM: patch.xM, zM: patch.yM ?? 0 });
      }
    }
  }

  function handlePointerUp() { dragRef.current = null; vt.onMiddleUp(); setHudPos(null); }

  const selSurf = selected?.kind === 'surface'
    ? surfaces.find(s => s.uuid === selected.surfaceUuid) ?? null : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-full rounded bg-[#0d1520] select-none"
      style={{ touchAction: 'none', outline: 'none' }}
      tabIndex={0}
      onWheel={onWheel}
      onPointerDown={vt.onMiddleDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={() => onSelect(null)}
    >
      <defs>
        {/* Matte hatch pattern */}
        <pattern id={patternId} patternUnits="userSpaceOnUse" width="6" height="6">
          <line x1="0" y1="0" x2="6" y2="6" stroke="rgba(255,255,150,0.35)" strokeWidth="0.8" />
          <line x1="-1" y1="5" x2="1" y2="7" stroke="rgba(255,255,150,0.35)" strokeWidth="0.8" />
          <line x1="5" y1="-1" x2="7" y2="1" stroke="rgba(255,255,150,0.35)" strokeWidth="0.8" />
        </pattern>
      </defs>

      <g transform={`translate(${panX} ${panY}) scale(${zoom})`}>

        {hasRoom && <>
          {/* Room face: dashed rect */}
          <rect
            x={fx(-roomW / 2)} y={fz(roomH)}
            width={roomW * baseScale} height={roomH * baseScale}
            fill="none" stroke="#2d4878" strokeWidth={1} strokeDasharray="6 3"
            pointerEvents="none"
          />
          {/* Floor line */}
          <line x1={fx(-roomW / 2)} y1={fz(0)} x2={fx(roomW / 2)} y2={fz(0)}
            stroke="#3a5c90" strokeWidth={1.5} pointerEvents="none" />
          {/* Center line (DSC column) */}
          <line x1={fx(0)} y1={fz(0)} x2={fx(0)} y2={fz(roomH)}
            stroke="#3a5c90" strokeWidth={0.8} strokeDasharray="4 4" pointerEvents="none" />

          {/* Height grid */}
          {Array.from({ length: Math.floor(roomH) }, (_, i) => i + 1).map(z => (
            <g key={`hg-${z}`} pointerEvents="none">
              <line x1={fx(-roomW / 2)} y1={fz(z)} x2={fx(roomW / 2)} y2={fz(z)}
                stroke="rgba(255,255,255,0.04)" strokeWidth={0.7} />
              <text x={fx(-roomW / 2) - 3} y={fz(z) + 3} textAnchor="end"
                fontSize={7.5} fill="rgba(255,255,255,0.25)">{z}m</text>
            </g>
          ))}

          {/* Labels */}
          <text x={fx(-roomW / 2) + 4} y={fz(0) + 14} fontSize={8} fill="#3a5c90" pointerEvents="none">SL</text>
          <text x={fx(roomW / 2) - 4} y={fz(0) + 14} textAnchor="end" fontSize={8} fill="#3a5c90" pointerEvents="none">SR</text>
          <text x={fx(0) + 3} y={fz(0) + 14} fontSize={8} fill="#5890d8" pointerEvents="none">C</text>
        </>}

        {/* LED walls */}
        {ledWalls.filter(w => w.posDsXM != null).map(wall => {
          const tileSp = wall.equipmentUuid ? equipmentSpecs.find(s => s.uuid === wall.equipmentUuid) : null;
          const panWMm = tileSp?.specs?.panelWidthMm ?? 500;
          const panHMm = tileSp?.specs?.panelHeightMm ?? 500;
          const cols  = wall.tileGrid?.cols ?? 1;
          const rows  = wall.tileGrid?.rows ?? 1;
          const wallWM = cols * (panWMm / 1000);
          const wallHM = rows * (panHMm / 1000);
          const cx = wall.posDsXM!;
          const zBot = 0; // assume floor-mounted for now
          const isSel = selected?.kind === 'ledwall' && selected.uuid === wall.uuid;
          return (
            <g key={`led-${wall.uuid}`} style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onSelect({ kind: 'ledwall', uuid: wall.uuid }); }}
            >
              {isSel && <rect
                x={fx(cx - wallWM / 2) - 4} y={fz(wallHM) - 4}
                width={wallWM * baseScale + 8} height={wallHM * baseScale + 8}
                fill="none" stroke="rgba(20,184,166,0.6)" strokeWidth={1.5}
                rx={3} strokeDasharray="4 2" pointerEvents="none" />}
              <rect
                x={fx(cx - wallWM / 2)} y={fz(wallHM)}
                width={wallWM * baseScale} height={wallHM * baseScale}
                fill={isSel ? 'rgba(20,184,166,0.38)' : 'rgba(20,184,166,0.18)'}
                stroke={isSel ? '#14b8a6' : '#0d9488'} strokeWidth={isSel ? 1.8 : 1.2} rx={2}
              />
              <text x={fx(cx)} y={fz(wallHM) - 5} textAnchor="middle" fontSize={9}
                fill={isSel ? '#14b8a6' : '#0d9488'} pointerEvents="none">{wall.name}</text>
            </g>
          );
        })}

        {/* Projection surfaces — full face rects */}
        {surfaces.map(surf => {
          const cx    = surf.posDsXM ?? 0;
          const w     = surf.widthM ?? 4;
          const h     = surf.heightM ?? 2.25;
          const zBot  = screenBottomZ(surf);
          const zTop  = screenTopZ(surf);
          const isSel = selected?.kind === 'surface' && selected.surfaceUuid === surf.uuid;
          const rX    = fx(cx - w / 2);
          const rY    = fz(zTop);
          const rW    = w * baseScale;
          const rH    = h * baseScale;
          const mattes = surf.mattes ?? [];

          return (
            <g key={surf.uuid}>
              {isSel && <rect x={rX - 5} y={rY - 5} width={rW + 10} height={rH + 10}
                fill="none" stroke="rgba(52,211,153,0.5)" strokeWidth={1.5}
                rx={4} strokeDasharray="4 2" pointerEvents="none" />}
              <rect x={rX} y={rY} width={rW} height={rH}
                fill={isSel ? 'rgba(52,211,153,0.18)' : 'rgba(60,190,150,0.12)'}
                stroke={isSel ? '#34d399' : '#30b890'}
                strokeWidth={isSel ? 1.8 : 1.2} rx={2}
                style={{ cursor: 'grab' }}
                onPointerDown={e => {
                  e.stopPropagation();
                  onSelect({ kind: 'surface', surfaceUuid: surf.uuid });
                  const [sx_, sy_] = getSvgPt(e);
                  dragRef.current = {
                    kind: 'surface', uuid: surf.uuid,
                    startSvgX: sx_, startSvgY: sy_,
                    startX: surf.posDsXM ?? 0,
                    startZ: surf.distFloorM ?? 0,
                  };
                  (e.target as Element).setPointerCapture(e.pointerId);
                }}
                onClick={e => { e.stopPropagation(); onSelect({ kind: 'surface', surfaceUuid: surf.uuid }); }}
              />
              {/* Screen name */}
              <text x={fx(cx)} y={rY - 5} textAnchor="middle" fontSize={9.5}
                fill={isSel ? '#34d399' : '#30b890'} pointerEvents="none">{surf.name}</text>
              {/* Screen type badge */}
              {surf.surfaceType && surf.surfaceType !== 'FRONT' && (
                <text x={fx(cx)} y={rY + 12} textAnchor="middle" fontSize={7.5}
                  fill="rgba(52,211,153,0.7)" pointerEvents="none">{surf.surfaceType}</text>
              )}

              {/* Surface mattes */}
              {mattes.map(matte => {
                // Convert image-space to world, then to SVG
                const leftEdgeX  = cx - w / 2;
                const topEdgeZ   = zTop;
                const mx  = fx(leftEdgeX + matte.xM);
                const my  = fz(topEdgeZ - matte.yM);
                const mw  = matte.widthM * baseScale;
                const mh_ = matte.heightM * baseScale;
                const isMatSel = selected?.kind === 'matte' &&
                  selected.surfaceUuid === surf.uuid && selected.matteId === matte.id;
                return (
                  <g key={matte.id}>
                    <rect x={mx} y={my} width={mw} height={mh_}
                      fill={`url(#${patternId})`}
                      stroke={isMatSel ? '#fef08a' : 'rgba(255,255,150,0.5)'}
                      strokeWidth={isMatSel ? 1.5 : 0.8}
                      rx={1}
                      style={{ cursor: 'grab' }}
                      onPointerDown={e => {
                        e.stopPropagation();
                        onSelect({ kind: 'matte', surfaceUuid: surf.uuid, matteId: matte.id });
                        const [sx_, sy_] = getSvgPt(e);
                        dragRef.current = {
                          kind: 'matte', surfaceUuid: surf.uuid, matteId: matte.id,
                          startSvgX: sx_, startSvgY: sy_, matte,
                        };
                        (e.target as Element).setPointerCapture(e.pointerId);
                      }}
                      onClick={e => { e.stopPropagation(); onSelect({ kind: 'matte', surfaceUuid: surf.uuid, matteId: matte.id }); }}
                    />
                    {matte.label && (
                      <text x={mx + mw / 2} y={my + mh_ / 2 + 3} textAnchor="middle"
                        fontSize={7.5} fill="rgba(255,255,150,0.8)" pointerEvents="none">
                        {matte.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Projector dots (X = horizOffset, Z = mountHeight) */}
              {(surf.projectorAssignments ?? []).map(pos => {
                const lensX  = cx + (pos.horizOffsetM ?? 0);
                const mountH = (pos as any).mountHeightM ?? defaultMountHeight(surf);
                const dotX   = fx(lensX);
                const dotY   = fz(mountH);
                const first  = pos.stackedUnits[0];
                const pName  = first ? projectors.find(p => p.uuid === first.projectorUuid)?.id ?? pos.label : pos.label;
                const isPosSel = selected?.kind === 'position' &&
                  selected.surfaceUuid === surf.uuid && selected.positionId === pos.id;
                // Coverage arc (width coverage at screen face)
                const tdM = pos.throwDistM;
                if (tdM) {
                  const first0 = pos.stackedUnits[0];
                  const proj0  = first0 ? projectors.find(p => p.uuid === first0.projectorUuid) : null;
                  const spec0  = proj0?.equipmentUuid ? equipmentSpecs.find(s => s.uuid === proj0.equipmentUuid) : null;
                  const tr     = spec0?.specs?.throwRatio ?? spec0?.specs?.throwRatioMin;
                  if (tr) {
                    const halfCov = (tdM / tr) / 2;
                    // Draw coverage extent lines on screen face
                    // (from screen edge left to screen edge right at the covered portion centered on lensX)
                  }
                }
                return (
                  <g key={`fp-${pos.id}`}
                    style={{ cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); onSelect({ kind: 'position', surfaceUuid: surf.uuid, positionId: pos.id }); }}
                    onPointerDown={e => {
                      e.stopPropagation();
                      onSelect({ kind: 'position', surfaceUuid: surf.uuid, positionId: pos.id });
                      const [sx_, sy_] = getSvgPt(e);
                      dragRef.current = {
                        kind: 'position', surfaceUuid: surf.uuid, posId: pos.id,
                        startSvgX: sx_, startSvgY: sy_,
                        startHoriz: pos.horizOffsetM ?? 0,
                        startMount: mountH,
                      };
                      (e.target as Element).setPointerCapture(e.pointerId);
                    }}
                  >
                    {/* Vertical offset line from screen center Z */}
                    <line x1={dotX} y1={fz(screenBottomZ(surf) + (surf.heightM ?? 0) / 2)}
                      x2={dotX} y2={dotY}
                      stroke="rgba(245,200,60,0.3)" strokeWidth={0.8} strokeDasharray="3 2"
                      pointerEvents="none" />
                    <circle cx={dotX} cy={dotY}
                      r={isPosSel ? 7 : 5}
                      fill={isPosSel ? '#fde047' : '#f0c030'}
                      stroke={isPosSel ? '#eab308' : '#d4a820'}
                      strokeWidth={isPosSel ? 2 : 1}
                    />
                    <text x={dotX} y={dotY - 8} textAnchor="middle"
                      fontSize={8.5} fill="#f0c030" pointerEvents="none">{pName}</text>
                  </g>
                );
              })}

              {/* Dim callouts when selected */}
              {isSel && (
                <g pointerEvents="none">
                  <DimLine x1={rX} y1={rY} x2={rX + rW} y2={rY}
                    label={formatMasImperial(w)} offset={-20} color="#34d399" />
                  <DimLine x1={rX} y1={rY} x2={rX} y2={rY + rH}
                    label={formatMasImperial(h)} offset={-22} color="#34d399" />
                  {zBot > 0 && <DimLine
                    x1={rX + rW + 20} y1={fz(0)} x2={rX + rW + 20} y2={fz(zBot)}
                    label={formatMasImperial(zBot)} offset={14} color="#a78bfa" />}
                </g>
              )}
            </g>
          );
        })}

        {/* DSC marker */}
        <line x1={fx(0) - 7} y1={fz(0)} x2={fx(0) + 7} y2={fz(0)}
          stroke="#5890d8" strokeWidth={1.5} pointerEvents="none" />
        <text x={fx(0) + 5} y={fz(0) - 3} fontSize={8} fill="#5890d8" pointerEvents="none">DSC</text>
      </g>

      {/* HUD */}
      {hudPos && (
        <g pointerEvents="none">
          <rect x={W - 172} y={8} width={160} height={21} rx={3}
            fill="rgba(13,21,32,0.93)" stroke="rgba(52,211,153,0.4)" strokeWidth={1} />
          <text x={W - 92} y={23} textAnchor="middle" fill="#34d399" fontSize={9} fontWeight="600"
            style={{ fontFamily: 'monospace' }}>
            {`X ${hudPos.xM >= 0 ? '+' : ''}${hudPos.xM.toFixed(2)}  Z ${hudPos.zM.toFixed(2)} m`}
          </text>
        </g>
      )}

      <text x={W - 4} y={H - 4} textAnchor="end" fontSize={7.5} fill="rgba(255,255,255,0.18)" pointerEvents="none">
        FRONT (X–Z)  ×{zoom.toFixed(2)}
      </text>
    </svg>
  );
};
