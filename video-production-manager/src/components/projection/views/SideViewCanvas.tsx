/**
 * SideViewCanvas — Y-Z side elevation view.
 *
 * Looking toward +X (from Stage Left toward Stage Right).
 *   Horizontal axis → World Y (depth):  left = audience, right = upstage
 *   Vertical axis   → World Z (height): bottom = floor (Z=0), top = ceiling
 *
 * Draggable:
 *   - Projection surface bar → scrolls Y (throw distance changes) and Z (floor height)
 *   - Projector dot           → changes throwDistM (horizontal) and mountHeightM (vertical)
 *
 * Zoom: mouse wheel  |  Pan: middle-mouse drag
 */

import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { snapTo, formatMasImperial } from '@/components/VenueCanvasUtils';
import { DECK_SIZES } from '@/hooks/useVenueStore';
import { DimLine } from '@/components/VenueCanvasUtils';
import { useViewTransform } from '../shared/useViewTransform';
import {
  screenBottomZ, screenTopZ, screenCenterZ, projectorLens3D, defaultMountHeight,
} from '../shared/objectRelations';
import type { ViewCanvasProps } from '../viewTypes';
import type { ProjectionSurface } from '@/hooks/useProjectionSurfaceAPI';

const W     = 540;
const H     = 370;
const PAD   = 28;
const FT_M  = 0.3048;
const SCREEN_DEPTH_Y = 0.18; // screen "thickness" in Y direction

export const SideViewCanvas: React.FC<ViewCanvasProps> = ({
  venueData, surfaces, projectors, equipmentSpecs, ledWalls,
  snapInches, selected, onSelect,
  selectionSet: _selSet, onBoxSelect: _onBoxSelect, controlsRef,
  onSurfacePatch, onPositionPatch,
}) => {
  const svgRef  = useRef<SVGSVGElement>(null);
  const vt      = useViewTransform(W, H);
  const { t: { zoom, panX, panY }, fitRect, onWheel, onMiddleDown, onMiddleMove, onMiddleUp, toBase } = vt;

  const [hudPos, setHudPos] = useState<{ yM: number; zM: number } | null>(null);

  const roomH  = venueData.roomHeightM || 8;
  const roomD  = venueData.roomDepthM;
  const dscFrac = venueData.dscDepthFraction;
  const hasRoom = roomD > 0;
  const SNAP_M  = snapInches * 0.0254;

  // Y world extent
  const minY = -(1 - dscFrac) * roomD; // audience end (most negative)
  const maxY =  dscFrac       * roomD; // upstage wall (most positive)

  // Base-canvas scale — uniform so 1 m H = 1 m V
  const baseScale = hasRoom ? Math.min(
    (W - 2 * PAD) / roomD,
    (H - 2 * PAD) / roomH,
  ) : 10;

  // World → base-canvas
  const sy = (worldY: number) => PAD + (worldY - minY) * baseScale;   // depth → X
  const sz = (worldZ: number) => H - PAD - worldZ * baseScale;         // height → Y (inverted)

  // Base-canvas → world (for drag)
  const bx2y = (bx: number) => minY + (bx - PAD) / baseScale;
  const by2z = (by: number) => (H - PAD - by) / baseScale;

  // Fit on room change
  useEffect(() => {
    if (!hasRoom) return;
    fitRect(sy(minY), sz(roomH), roomD * baseScale, roomH * baseScale);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomD, roomH]);

  useLayoutEffect(() => {
    if (!controlsRef) return;
    controlsRef.current = {
      zoomIn: () => vt.zoomIn(),
      zoomOut: () => vt.zoomOut(),
      fitToContent: () => {
        if (hasRoom) fitRect(sy(minY), sz(roomH), roomD * baseScale, roomH * baseScale);
      },
    };
  });

  // ── Drag state ────────────────────────────────────────────────────────────
  const dragRef = useRef<
    | { kind: 'surface'; uuid: string; startSvgX: number; startSvgY: number; startY: number; startZ: number }
    | { kind: 'position'; surfaceUuid: string; posId: string; startSvgX: number; startSvgY: number; startThrow: number; startMount: number }
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
    const dY = (bx - bxS) / baseScale;
    const dZ = -(by - byS) / baseScale;

    if (dragRef.current.kind === 'surface') {
      const newY = snapTo(dragRef.current.startY + dY, SNAP_M);
      const newZ = snapTo(Math.max(0, dragRef.current.startZ + dZ), SNAP_M);
      onSurfacePatch(dragRef.current.uuid, { posDsYM: newY, distFloorM: newZ });
      setHudPos({ yM: newY, zM: newZ });
    } else {
      const newThrow = snapTo(Math.max(0.5, dragRef.current.startThrow - dY), SNAP_M);
      const newMount = snapTo(Math.max(0, dragRef.current.startMount + dZ), SNAP_M);
      onPositionPatch(dragRef.current.surfaceUuid, dragRef.current.posId, {
        throwDistM: newThrow,
        ...(newMount !== undefined ? { mountHeightM: newMount } as any : {}),
      });
      setHudPos({ yM: newThrow, zM: newMount });
    }
  }

  function handlePointerUp() { dragRef.current = null; vt.onMiddleUp(); setHudPos(null); }

  function startSurfaceDrag(e: React.PointerEvent<Element>, surf: ProjectionSurface) {
    e.stopPropagation();
    onSelect({ kind: 'surface', surfaceUuid: surf.uuid }, false);
    const [sx_, sy_] = getSvgPt(e);
    dragRef.current = {
      kind: 'surface', uuid: surf.uuid,
      startSvgX: sx_, startSvgY: sy_,
      startY: surf.posDsYM ?? 0,
      startZ: surf.distFloorM ?? 0,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

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
      onClick={() => onSelect(null, false)}
    >
      <g transform={`translate(${panX} ${panY}) scale(${zoom})`}>

        {hasRoom && <>
          {/* Floor fill */}
          <rect x={sy(minY)} y={sz(roomH)} width={roomD * baseScale} height={roomH * baseScale}
            fill="rgba(13,20,32,0.6)" pointerEvents="none" />
          {/* Floor line */}
          <line x1={sy(minY)} y1={sz(0)} x2={sy(maxY)} y2={sz(0)}
            stroke="#3a5c90" strokeWidth={1.5} pointerEvents="none" />
          {/* Ceiling line */}
          <line x1={sy(minY)} y1={sz(roomH)} x2={sy(maxY)} y2={sz(roomH)}
            stroke="#2d4878" strokeWidth={1} strokeDasharray="5 3" pointerEvents="none" />
          {/* Walls */}
          <line x1={sy(minY)} y1={sz(0)} x2={sy(minY)} y2={sz(roomH)}
            stroke="#2d4878" strokeWidth={1} strokeDasharray="5 3" pointerEvents="none" />
          <line x1={sy(maxY)} y1={sz(0)} x2={sy(maxY)} y2={sz(roomH)}
            stroke="#2d4878" strokeWidth={1} strokeDasharray="5 3" pointerEvents="none" />
          {/* DSC vertical reference */}
          <line x1={sy(0)} y1={sz(0)} x2={sy(0)} y2={sz(roomH)}
            stroke="#3a5c90" strokeWidth={1} strokeDasharray="4 4" pointerEvents="none" />
          <text x={sy(0) + 3} y={sz(0.1)} fontSize={8} fill="#5890d8" pointerEvents="none">DSC</text>

          {/* Stage decks — shown as height-filled rects */}
          {venueData.stageDecks.map(deck => {
            const dSz = DECK_SIZES[deck.type];
            const effD = deck.rotation === 90 ? dSz.wFt : dSz.dFt;
            const dM   = effD * FT_M;
            const legH = deck.legHeightIn * 0.0254; // leg height in meters
            const deckH = legH + 0.04; // ~40 mm platform thickness
            const deckY0 = deck.yFt * FT_M;
            return (
              <rect key={deck.id}
                x={sy(deckY0)} y={sz(deckH)}
                width={Math.max(dM * baseScale, 2)} height={deckH * baseScale}
                fill="rgba(70,120,200,0.45)" stroke="#4878b8" strokeWidth={0.8} rx={1}
                pointerEvents="none"
              />
            );
          })}

          {/* Height grid lines (every 1 m) */}
          {Array.from({ length: Math.floor(roomH) }, (_, i) => i + 1).map(z => (
            <g key={`hgrid-${z}`} pointerEvents="none">
              <line x1={sy(minY)} y1={sz(z)} x2={sy(maxY)} y2={sz(z)}
                stroke="rgba(255,255,255,0.04)" strokeWidth={0.7} />
              <text x={sy(minY) - 3} y={sz(z) + 3} textAnchor="end"
                fontSize={7.5} fill="rgba(255,255,255,0.25)">{z}m</text>
            </g>
          ))}

          {/* Labels */}
          <text x={sy(minY) + 4} y={sz(0) + 14} fontSize={8} fill="#3a5c90" pointerEvents="none">AUDIENCE</text>
          <text x={sy(maxY) - 4} y={sz(0) + 14} textAnchor="end" fontSize={8} fill="#3a5c90" pointerEvents="none">UPSTAGE</text>
          <text x={sy(minY) - 3} y={sz(roomH) + 3} textAnchor="end" fontSize={7.5} fill="#2d4878" pointerEvents="none">ceil</text>
        </>}

        {/* Projection surfaces */}
        {surfaces.map(surf => {
          const surfY   = surf.posDsYM ?? 0;
          const zBot    = screenBottomZ(surf);
          const zTop    = screenTopZ(surf);
          const rectX   = sy(surfY - SCREEN_DEPTH_Y / 2);
          const rectY   = sz(zTop);
          const rectW   = Math.max(SCREEN_DEPTH_Y * baseScale, 4);
          const rectH   = (zTop - zBot) * baseScale;
          const isSel   = selected?.kind === 'surface' && selected.surfaceUuid === surf.uuid;

          return (
            <g key={surf.uuid} style={{ cursor: 'grab' }}
              onPointerDown={e => startSurfaceDrag(e, surf)}
              onClick={e => { e.stopPropagation(); onSelect({ kind: 'surface', surfaceUuid: surf.uuid }, e.shiftKey); }}
            >
              {isSel && (
                <rect x={rectX - 5} y={rectY - 5} width={rectW + 10} height={rectH + 10}
                  fill="none" stroke="rgba(52,211,153,0.5)" strokeWidth={1.5}
                  rx={3} strokeDasharray="4 2" pointerEvents="none" />
              )}
              <rect x={rectX} y={rectY} width={rectW} height={rectH}
                fill={isSel ? 'rgba(52,211,153,0.35)' : 'rgba(60,190,150,0.22)'}
                stroke={isSel ? '#34d399' : '#30b890'}
                strokeWidth={isSel ? 1.8 : 1.2} rx={1}
              />
              {/* Floor-drop anchor line */}
              <line x1={sy(surfY)} y1={sz(zBot)} x2={sy(surfY)} y2={sz(0)}
                stroke={isSel ? 'rgba(52,211,153,0.3)' : 'rgba(60,190,150,0.15)'}
                strokeWidth={0.8} strokeDasharray="3 3" pointerEvents="none" />
              <text x={sy(surfY)} y={rectY - 5} textAnchor="middle" fontSize={9}
                fill={isSel ? '#34d399' : '#30b890'} pointerEvents="none">{surf.name}</text>
            </g>
          );
        })}

        {/* Projector positions — vertical throw cone in Y-Z plane */}
        {surfaces.flatMap(surf => {
          const assignments = surf.projectorAssignments ?? [];
          if (!assignments.length) return [];
          const surfY   = surf.posDsYM ?? 0;
          const zBot    = screenBottomZ(surf);
          const zTop    = screenTopZ(surf);
          const isRear  = surf.surfaceType === 'REAR';

          return assignments.flatMap(pos => {
            const td          = pos.throwDistM;
            if (!td) return [];
            const mountH      = (pos as any).mountHeightM ?? defaultMountHeight(surf);
            const projY       = isRear ? surfY + td : surfY - td;
            const projX       = sy(projY);
            const projZsvg    = sz(mountH);
            const screenSvgX  = sy(surfY);

            const isPosSel = selected?.kind === 'position' &&
              selected.surfaceUuid === surf.uuid && selected.positionId === pos.id;

            const first    = pos.stackedUnits[0];
            const unitProj = first ? projectors.find(p => p.uuid === first.projectorUuid) : null;
            const posName  = unitProj?.id ?? pos.label;

            return [(
              <g key={`side-cone-${surf.uuid}-${pos.id}`}>
                {/* Vertical throw triangle */}
                <polygon
                  points={`${projX},${projZsvg} ${screenSvgX},${sz(zTop)} ${screenSvgX},${sz(zBot)}`}
                  fill={isPosSel ? 'rgba(245,200,60,0.12)' : 'rgba(245,200,60,0.06)'}
                  stroke={isPosSel ? 'rgba(245,200,60,0.45)' : 'rgba(245,200,60,0.18)'}
                  strokeWidth={0.8} pointerEvents="none"
                />
                {/* Throw distance line (floor plan) */}
                <line x1={projX} y1={sz(0)} x2={screenSvgX} y2={sz(0)}
                  stroke="rgba(245,200,60,0.2)" strokeWidth={0.6}
                  strokeDasharray="3 3" pointerEvents="none" />
                {/* Projector dot — draggable */}
                <circle cx={projX} cy={projZsvg}
                  r={isPosSel ? 7 : 5}
                  fill={isPosSel ? '#fde047' : '#f0c030'}
                  stroke={isPosSel ? '#eab308' : '#d4a820'}
                  strokeWidth={isPosSel ? 2 : 1}
                  style={{ cursor: 'pointer' }}
                  onPointerDown={e => {
                    e.stopPropagation();
                    onSelect({ kind: 'position', surfaceUuid: surf.uuid, positionId: pos.id }, false);
                    const [sx_, sy_] = getSvgPt(e);
                    dragRef.current = {
                      kind: 'position',
                      surfaceUuid: surf.uuid, posId: pos.id,
                      startSvgX: sx_, startSvgY: sy_,
                      startThrow: td,
                      startMount: mountH,
                    };
                    (e.target as Element).setPointerCapture(e.pointerId);
                  }}
                  onClick={e => { e.stopPropagation(); onSelect({ kind: 'position', surfaceUuid: surf.uuid, positionId: pos.id }, e.shiftKey); }}
                />
                {/* Label */}
                <text x={projX} y={projZsvg - 8} textAnchor="middle"
                  fontSize={8.5} fill="#f0c030" pointerEvents="none">{posName}</text>
                {/* Mount height label */}
                <text x={projX + 8} y={projZsvg + 3} fontSize={7.5} fill="rgba(240,192,48,0.7)" pointerEvents="none">
                  {mountH.toFixed(1)}m
                </text>

                {/* Dim: throw distance */}
                {isPosSel && (
                  <DimLine
                    x1={projX} y1={sz(zBot) + 18} x2={screenSvgX} y2={sz(zBot) + 18}
                    label={formatMasImperial(td)} offset={14} color="#f0c030"
                  />
                )}
              </g>
            )];
          });
        })}

        {/* Selected surface dim callouts */}
        {selSurf && (() => {
          const surfY = selSurf.posDsYM ?? 0;
          const zBot  = screenBottomZ(selSurf);
          const zTop  = screenTopZ(selSurf);
          const h     = selSurf.heightM ?? 0;
          return (
            <g pointerEvents="none">
              {h > 0 && <DimLine
                x1={sy(surfY) + 20} y1={sz(zBot)}
                x2={sy(surfY) + 20} y2={sz(zTop)}
                label={formatMasImperial(h)} offset={18} color="#34d399"
              />}
              {zBot > 0 && <DimLine
                x1={sy(surfY) + 20} y1={sz(0)}
                x2={sy(surfY) + 20} y2={sz(zBot)}
                label={formatMasImperial(zBot)} offset={18} color="#a78bfa"
              />}
            </g>
          );
        })()}

      </g>

      {/* HUD */}
      {hudPos && (
        <g pointerEvents="none">
          <rect x={W - 172} y={8} width={160} height={21} rx={3}
            fill="rgba(13,21,32,0.93)" stroke="rgba(52,211,153,0.4)" strokeWidth={1} />
          <text x={W - 92} y={23} textAnchor="middle" fill="#34d399" fontSize={9} fontWeight="600"
            style={{ fontFamily: 'monospace' }}>
            {`Y ${hudPos.yM >= 0 ? '+' : ''}${hudPos.yM.toFixed(2)} m  Z ${hudPos.zM.toFixed(2)} m`}
          </text>
        </g>
      )}

      <text x={W - 4} y={H - 4} textAnchor="end" fontSize={7.5} fill="rgba(255,255,255,0.18)" pointerEvents="none">
        SIDE (Y–Z)  ×{zoom.toFixed(2)}
      </text>
    </svg>
  );
};
