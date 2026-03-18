/**
 * TopViewCanvas — X-Y top-down plan view.
 *
 * Looking down the −Z axis:  X = left/right (SR+),  Y = depth (upstage+)
 *
 * Draggable: projection surfaces (X,Y), LED walls (X,Y)
 * Click-selectable: projector dots
 * Zoom: mouse wheel  |  Pan: middle-mouse drag
 */

import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { DimLine, snapTo, formatMasImperial } from '@/components/VenueCanvasUtils';
import { calcBlend, calcCones } from '@/components/blend/blendEngine';
import { DECK_SIZES } from '@/hooks/useVenueStore';
import { useViewTransform } from '../shared/useViewTransform';
import { projectorLens3D } from '../shared/objectRelations';
import type { ViewCanvasProps } from '../viewTypes';
import type { ProjectionSurface } from '@/hooks/useProjectionSurfaceAPI';
import type { LEDScreen } from '@/hooks/useLEDScreenAPI';

const W = 540;
const H = 370;
const PAD = 28;
const FT_M = 0.3048;
const SCREEN_DEPTH_M = 0.18;

export const TopViewCanvas: React.FC<ViewCanvasProps> = ({
  venueData, surfaces, projectors, equipmentSpecs, ledWalls,
  snapInches, selected, onSelect,
  selectionSet = new Set() as ReadonlySet<string>,
  onBoxSelect, controlsRef,
  onSurfacePatch, onPositionPatch, onLEDWallPatch,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const vt = useViewTransform(W, H);
  const { t: { zoom, panX, panY }, fitRect, onWheel, onMiddleDown, onMiddleMove, onMiddleUp, toBase } = vt;

  const [hudPos, setHudPos] = useState<{ xM: number; yM: number } | null>(null);
  const [hoveredCone, setHoveredCone] = useState<{
    name: string; throwM: number; coveragePct: number; svgX: number; svgY: number;
  } | null>(null);

  const hasRoom = venueData.roomWidthM > 0 && venueData.roomDepthM > 0;
  const SNAP_M = snapInches * 0.0254;

  // Base-canvas scale (pixels/meter, pre-zoom)
  const baseScale = hasRoom ? (W - 2 * PAD) / venueData.roomWidthM : 10;
  const dscSvgX   = W / 2;
  const dscSvgY   = PAD + venueData.dscDepthFraction * venueData.roomDepthM * baseScale;

  // World → base-canvas coordinate functions (pre-zoom, pre-pan)
  const wx = (x: number) => dscSvgX + x * baseScale;
  const wy = (y: number) => dscSvgY - y * baseScale;

  // Fit room on first meaningful render
  useEffect(() => {
    if (!hasRoom) return;
    fitRect(PAD, PAD, venueData.roomWidthM * baseScale, venueData.roomDepthM * baseScale);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueData.roomWidthM, venueData.roomDepthM]);

  // ── Box-select state ───────────────────────────────────────────────────────
  const boxRef = useRef<{ bx0: number; by0: number; bx1: number; by1: number } | null>(null);
  const [boxRect, setBoxRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Populate controlsRef for ViewPane toolbar buttons
  useLayoutEffect(() => {
    if (!controlsRef) return;
    controlsRef.current = {
      zoomIn: () => vt.zoomIn(),
      zoomOut: () => vt.zoomOut(),
      fitToContent: () => {
        if (hasRoom) fitRect(PAD, PAD, venueData.roomWidthM * baseScale, venueData.roomDepthM * baseScale);
      },
    };
  });

  // ── Drag state ────────────────────────────────────────────────────────────
  const dragRef = useRef<{
    kind: 'surface' | 'ledwall';
    uuid: string;
    startSvgX: number; startSvgY: number;
    startXM: number;   startYM: number;
  } | null>(null);

  function getSvgPt(e: { clientX: number; clientY: number }): [number, number] {
    const rect = svgRef.current!.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * W,
      ((e.clientY - rect.top)  / rect.height) * H,
    ];
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    vt.onMiddleMove(e);
    // Box rubber-band update
    if (boxRef.current) {
      const [sx, sy] = getSvgPt(e);
      const [bx, by] = toBase(sx, sy);
      boxRef.current.bx1 = bx;
      boxRef.current.by1 = by;
      const bxMin = Math.min(boxRef.current.bx0, bx), bxMax = Math.max(boxRef.current.bx0, bx);
      const byMin = Math.min(boxRef.current.by0, by), byMax = Math.max(boxRef.current.by0, by);
      setBoxRect({ x: bxMin, y: byMin, w: bxMax - bxMin, h: byMax - byMin });
      return;
    }
    if (!dragRef.current) return;
    const [sx, sy] = getSvgPt(e);
    const [bx, by]   = toBase(sx, sy);
    const [bxS, byS] = toBase(dragRef.current.startSvgX, dragRef.current.startSvgY);
    const newX = snapTo(dragRef.current.startXM + (bx - bxS) / baseScale, SNAP_M);
    const newY = snapTo(dragRef.current.startYM - (by - byS) / baseScale, SNAP_M);
    if (dragRef.current.kind === 'ledwall') {
      onLEDWallPatch(dragRef.current.uuid, newX, newY);
    } else {
      onSurfacePatch(dragRef.current.uuid, { posDsXM: newX, posDsYM: newY });
    }
    setHudPos({ xM: newX, yM: newY });
  }

  function handlePointerUp() {
    // Commit box select if box was large enough (>5 SVG px in either dimension)
    if (boxRef.current) {
      const { bx0, by0, bx1, by1 } = boxRef.current;
      const bxMin = Math.min(bx0, bx1), bxMax = Math.max(bx0, bx1);
      const byMin = Math.min(by0, by1), byMax = Math.max(by0, by1);
      if ((bxMax - bxMin) * zoom > 5 || (byMax - byMin) * zoom > 5) {
        const hits: string[] = [];
        surfaces.forEach(s => {
          const px = wx(s.posDsXM ?? 0), py = wy(s.posDsYM ?? 0);
          if (px >= bxMin && px <= bxMax && py >= byMin && py <= byMax) hits.push(s.uuid);
        });
        ledWalls.filter(w => w.posDsXM != null && w.posDsYM != null).forEach(w => {
          const px = wx(w.posDsXM!), py = wy(w.posDsYM!);
          if (px >= bxMin && px <= bxMax && py >= byMin && py <= byMax) hits.push(w.uuid);
        });
        onBoxSelect?.(hits);
      }
      boxRef.current = null;
      setBoxRect(null);
    }
    dragRef.current = null;
    vt.onMiddleUp();
    setHudPos(null);
  }

  function startSurfaceDrag(e: React.PointerEvent<Element>, surf: ProjectionSurface) {
    e.stopPropagation();
    onSelect({ kind: 'surface', surfaceUuid: surf.uuid }, false);
    const [sx, sy] = getSvgPt(e);
    dragRef.current = {
      kind: 'surface', uuid: surf.uuid,
      startSvgX: sx, startSvgY: sy,
      startXM: surf.posDsXM ?? 0, startYM: surf.posDsYM ?? 0,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function startLEDDrag(e: React.PointerEvent<Element>, wall: LEDScreen) {
    e.stopPropagation();
    onSelect({ kind: 'ledwall', uuid: wall.uuid }, false);
    const [sx, sy] = getSvgPt(e);
    dragRef.current = {
      kind: 'ledwall', uuid: wall.uuid,
      startSvgX: sx, startSvgY: sy,
      startXM: wall.posDsXM ?? 0, startYM: wall.posDsYM ?? 0,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  const selSurf = selected?.kind === 'surface'
    ? surfaces.find(s => s.uuid === selected.surfaceUuid) ?? null : null;

  // ── Snap dot grid ─────────────────────────────────────────────────────────
  const GRID_M = 0.5;
  const snapDots: React.ReactNode[] = [];
  if (hasRoom) {
    const stepsX = Math.floor(venueData.roomWidthM / GRID_M);
    const stepsY = Math.floor(venueData.roomDepthM / GRID_M);
    const startXM = -venueData.roomWidthM / 2;
    for (let ix = 0; ix <= stepsX; ix++) {
      for (let iy = 0; iy <= stepsY; iy++) {
        snapDots.push(
          <circle key={`d${ix}_${iy}`}
            cx={wx(startXM + ix * GRID_M)} cy={wy(iy * GRID_M)} r={0.8}
            fill="rgba(255,255,255,0.09)" pointerEvents="none" />
        );
      }
    }
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-full rounded bg-[#0d1520] select-none"
      style={{ touchAction: 'none', outline: 'none' }}
      tabIndex={0}
      onWheel={onWheel}
      onPointerDown={e => {
        vt.onMiddleDown(e);
        // Start box-select on left-click on background (objects stopPropagation so only background reaches here)
        if (e.button === 0) {
          const [sx, sy] = getSvgPt(e);
          const [bx, by] = toBase(sx, sy);
          boxRef.current = { bx0: bx, by0: by, bx1: bx, by1: by };
        }
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={() => onSelect(null, false)}
    >
      {/* ── All world content inside the zoom/pan transform ── */}
      <g transform={`translate(${panX} ${panY}) scale(${zoom})`}>

        {hasRoom && <>
          {/* Audience zone fill */}
          <rect
            x={PAD} y={dscSvgY}
            width={venueData.roomWidthM * baseScale}
            height={venueData.roomDepthM * (1 - venueData.dscDepthFraction) * baseScale}
            fill="rgba(100,130,190,0.06)" pointerEvents="none"
          />
          {/* Room outline */}
          <rect
            x={PAD} y={PAD}
            width={venueData.roomWidthM * baseScale}
            height={venueData.roomDepthM * baseScale}
            fill="none" stroke="#2d4878" strokeWidth={1.5} strokeDasharray="6 3" pointerEvents="none"
          />
          {/* Snap dots */}
          {snapDots}
          {/* DSC reference line */}
          <line x1={PAD} y1={dscSvgY} x2={PAD + venueData.roomWidthM * baseScale} y2={dscSvgY}
            stroke="#3a5c90" strokeWidth={1} strokeDasharray="4 4" pointerEvents="none" />

          {/* Stage decks */}
          {venueData.stageDecks.map(deck => {
            const sz = DECK_SIZES[deck.type];
            const effW = deck.rotation === 90 ? sz.dFt : sz.wFt;
            const effD = deck.rotation === 90 ? sz.wFt : sz.dFt;
            const wM = effW * FT_M, dM = effD * FT_M;
            const legAlpha = (deck.legHeightIn - 8) / (48 - 8);
            const blue = Math.round(200 - legAlpha * 60);
            return (
              <rect key={deck.id}
                x={wx(deck.xFt * FT_M)} y={wy(deck.yFt * FT_M + dM)}
                width={wM * baseScale} height={dM * baseScale}
                fill={`rgba(70,120,${blue},0.5)`} stroke="#4878b8" strokeWidth={0.8} rx={1}
                pointerEvents="none"
              />
            );
          })}

          {/* Labels */}
          <text x={W / 2} y={PAD - 10} textAnchor="middle" fontSize={9} fill="#3a5c90" pointerEvents="none">UPSTAGE</text>
          <text x={W / 2} y={PAD + venueData.roomDepthM * baseScale + 16} textAnchor="middle" fontSize={9} fill="#3a5c90" pointerEvents="none">DOWNSTAGE</text>
          <text x={PAD + 4} y={dscSvgY - 5} fontSize={8} fill="#4a6a9a" pointerEvents="none">SL ←</text>
          <text x={PAD + venueData.roomWidthM * baseScale - 26} y={dscSvgY - 5} fontSize={8} fill="#4a6a9a" pointerEvents="none">→ SR</text>
        </>}

        {/* Projection surfaces */}
        {surfaces.map(surf => {
          const cx = surf.posDsXM ?? 0;
          const cy = surf.posDsYM ?? 0;
          const w  = surf.widthM ?? 2;
          const isSel    = selected?.kind === 'surface' && selected.surfaceUuid === surf.uuid;
          const isInSet  = selectionSet.has(surf.uuid);
          const rectX = wx(cx - w / 2);
          const rectY = wy(cy + SCREEN_DEPTH_M / 2);
          const rectW = w * baseScale;
          const rectH = Math.max(SCREEN_DEPTH_M * baseScale, 4);
          return (
            <g key={surf.uuid} style={{ cursor: 'grab' }}
              onPointerDown={e => startSurfaceDrag(e, surf)}
              onClick={e => { e.stopPropagation(); onSelect({ kind: 'surface', surfaceUuid: surf.uuid }, e.shiftKey); }}
            >
              {/* Multi-select set ring (amber) */}
              {isInSet && !isSel && (
                <rect x={rectX - 4} y={rectY - 12} width={rectW + 8} height={rectH + 24}
                  fill="none" stroke="rgba(251,191,36,0.5)" strokeWidth={1.5}
                  rx={3} strokeDasharray="4 2" pointerEvents="none" />
              )}
              {/* Primary selection ring (green) */}
              {isSel && (
                <rect x={rectX - 4} y={rectY - 12} width={rectW + 8} height={rectH + 24}
                  fill="none" stroke="rgba(52,211,153,0.5)" strokeWidth={1.5}
                  rx={3} strokeDasharray="4 2" pointerEvents="none" />
              )}
              <rect x={rectX} y={rectY} width={rectW} height={rectH}
                fill={isSel ? 'rgba(52,211,153,0.35)' : isInSet ? 'rgba(52,211,153,0.20)' : 'rgba(60,190,150,0.22)'}
                stroke={isSel ? '#34d399' : isInSet ? '#fbbf24' : '#30b890'}
                strokeWidth={isSel ? 1.8 : 1.2} rx={1}
              />
              <text x={wx(cx)} y={rectY - 5} textAnchor="middle" fontSize={10}
                fill={isSel ? '#34d399' : isInSet ? '#fbbf24' : '#30b890'} pointerEvents="none">
                {surf.name}
              </text>
            </g>
          );
        })}

        {/* Throw cones  projector dots */}
        {surfaces.flatMap(surf => {
          const assignments = surf.projectorAssignments ?? [];
          if (!assignments.length) return [];
          const surfW = surf.widthM ?? 4;
          const surfH = surf.heightM ?? 2.25;
          const sx = surf.posDsXM ?? 0;
          const sy = surf.posDsYM ?? 0;

          return assignments.flatMap(pos => {
            const first = pos.stackedUnits[0];
            const proj0 = first ? projectors.find(p => p.uuid === first.projectorUuid) : null;
            const spec0 = proj0?.equipmentUuid ? equipmentSpecs.find(s => s.uuid === proj0.equipmentUuid) : null;
            const nativeW = spec0?.specs?.nativeW ?? 1920;
            const nativeH = spec0?.specs?.nativeH ?? 1080;
            const throwRatio: number | undefined =
              spec0?.specs?.throwRatio ?? spec0?.specs?.throwRatioMin ?? undefined;
            const throwDistM = pos.throwDistM ?? (throwRatio ? throwRatio * surfW : null);
            if (!throwDistM) return [];

            const blendRes = calcBlend({ screenW: surfW, screenH: surfH, nativeW, nativeH, nProj: 1, overlapPct: 0, throwDistM, throwRatio });
            if (!blendRes) return [];

            const cones = calcCones({
              posX: sx + (pos.horizOffsetM ?? 0), posY: sy,
              screenH: surfH, mountRear: surf.surfaceType === 'REAR',
              throwDistM, throwRatio,
            }, blendRes);
            if (!cones.length) return [];

            const cone = cones[0];
            const projWorldY  = sy - cone.pz;
            const projSvgX    = wx(cone.px);
            const projSvgY    = wy(projWorldY);
            const screenSvgY  = wy(sy);
            const projCovM    = throwRatio ? throwDistM / throwRatio : surfW;
            const coveragePct = Math.min(100, Math.round((projCovM / surfW) * 100));

            const isPosSel = selected?.kind === 'position' &&
              selected.surfaceUuid === surf.uuid && selected.positionId === pos.id;

            return [(
              <g key={`cone-${surf.uuid}-${pos.id}`}>
                <polygon
                  points={`${projSvgX},${projSvgY} ${wx(cone.sL)},${screenSvgY} ${wx(cone.sR)},${screenSvgY}`}
                  fill={isPosSel ? 'rgba(245,200,60,0.12)' : 'rgba(245,200,60,0.06)'}
                  stroke={isPosSel ? 'rgba(245,200,60,0.45)' : 'rgba(245,200,60,0.2)'}
                  strokeWidth={0.8} pointerEvents="none"
                />
                {pos.stackedUnits.map((unit, ui) => {
                  const unitProj = projectors.find(p => p.uuid === unit.projectorUuid);
                  const name = unitProj?.id ?? unit.projectorUuid.slice(0, 6);
                  const dotX = projSvgX + ui * 12;
                  const isUnitSel = selected?.kind === 'position' &&
                    selected.surfaceUuid === surf.uuid && selected.positionId === pos.id;
                  return (
                    <g key={`dot-${unit.projectorUuid}`}>
                      <circle cx={dotX} cy={projSvgY}
                        r={isUnitSel ? 7 : 5}
                        fill={isUnitSel ? '#fde047' : '#f0c030'}
                        stroke={isUnitSel ? '#eab308' : '#d4a820'}
                        strokeWidth={isUnitSel ? 2 : 1}
                        style={{ cursor: 'pointer' }}
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => {
                          e.stopPropagation();
                          onSelect({ kind: 'position', surfaceUuid: surf.uuid, positionId: pos.id }, e.shiftKey);
                        }}
                        onPointerEnter={() => setHoveredCone({ name, throwM: throwDistM, coveragePct, svgX: dotX, svgY: projSvgY })}
                        onPointerLeave={() => setHoveredCone(null)}
                      />
                      {ui === 0 && (
                        <text x={projSvgX} y={projSvgY - 8} textAnchor="middle"
                          fontSize={8.5} fill="#f0c030" pointerEvents="none">{name}</text>
                      )}
                    </g>
                  );
                })}
              </g>
            )];
          });
        })}

        {/* LED walls */}
        {ledWalls.filter(w => w.posDsXM != null && w.posDsYM != null).map(wall => {
          const tileSp = wall.equipmentUuid ? equipmentSpecs.find(s => s.uuid === wall.equipmentUuid) : null;
          const panWMm = tileSp?.specs?.panelWidthMm ?? 500;
          const panHMm = tileSp?.specs?.panelHeightMm ?? 500;
          const cols   = wall.tileGrid?.cols ?? 1;
          const rows   = wall.tileGrid?.rows ?? 1;
          const wallWM = cols * (panWMm / 1000);
          const wallHM = rows * (panHMm / 1000);
          const cx = wall.posDsXM!;
          const cy = wall.posDsYM!;
          const isSel   = selected?.kind === 'ledwall' && selected.uuid === wall.uuid;
          const isInSet = selectionSet.has(wall.uuid);
          const rX = wx(cx - wallWM / 2);
          const rY = wy(cy + wallHM / 2);
          const rW = Math.max(wallWM * baseScale, 4);
          const rH = Math.max(wallHM * baseScale, 4);
          return (
            <g key={`led-${wall.uuid}`} style={{ cursor: 'grab' }}
              onPointerDown={e => startLEDDrag(e, wall)}
              onClick={e => { e.stopPropagation(); onSelect({ kind: 'ledwall', uuid: wall.uuid }, e.shiftKey); }}
            >
              {/* Multi-select ring (amber) */}
              {isInSet && !isSel && <rect x={rX - 3} y={rY - 3} width={rW + 6} height={rH + 6}
                fill="none" stroke="rgba(251,191,36,0.55)" strokeWidth={1.5}
                rx={3} strokeDasharray="4 2" pointerEvents="none" />}
              {/* Primary selection ring (teal) */}
              {isSel && <rect x={rX - 3} y={rY - 3} width={rW + 6} height={rH + 6}
                fill="none" stroke="rgba(20,184,166,0.6)" strokeWidth={1.5}
                rx={3} strokeDasharray="4 2" pointerEvents="none" />}
              <rect x={rX} y={rY} width={rW} height={rH}
                fill={isSel ? 'rgba(20,184,166,0.38)' : isInSet ? 'rgba(20,184,166,0.28)' : 'rgba(20,184,166,0.18)'}
                stroke={isSel ? '#14b8a6' : isInSet ? '#fbbf24' : '#0d9488'}
                strokeWidth={isSel ? 1.8 : 1.2} rx={2} />
              <text x={wx(cx)} y={rY - 5} textAnchor="middle" fontSize={9.5}
                fill={isSel ? '#14b8a6' : isInSet ? '#fbbf24' : '#0d9488'} pointerEvents="none">{wall.name}</text>
            </g>
          );
        })}

        {/* Dim callouts for selected surface */}
        {selSurf && (() => {
          const cx = selSurf.posDsXM ?? 0;
          const cy = selSurf.posDsYM ?? 0;
          const w  = selSurf.widthM ?? 2;
          const h  = selSurf.heightM;
          const rX = wx(cx - w / 2);
          const rY = wy(cy + SCREEN_DEPTH_M / 2);
          const rW = w * baseScale;
          return (
            <g pointerEvents="none">
              <DimLine x1={rX} y1={rY} x2={rX + rW} y2={rY}
                label={formatMasImperial(w)} offset={-20} color="#34d399" />
              {h && <DimLine
                x1={rX + rW} y1={rY - (h - SCREEN_DEPTH_M) * baseScale}
                x2={rX + rW} y2={rY + SCREEN_DEPTH_M * baseScale}
                label={formatMasImperial(h)} offset={22} color="#34d399" />}
              {Math.abs(cy) > 0.1 && <DimLine
                x1={dscSvgX} y1={dscSvgY} x2={dscSvgX} y2={wy(cy)}
                label={formatMasImperial(Math.abs(cy))} offset={-28} color="#a78bfa" />}
              {Math.abs(cx) > 0.1 && <DimLine
                x1={dscSvgX} y1={dscSvgY} x2={wx(cx)} y2={dscSvgY}
                label={formatMasImperial(Math.abs(cx))} offset={12} color="#a78bfa" />}
            </g>
          );
        })()}

        {/* DSC crosshair */}
        <line x1={dscSvgX - 7} y1={dscSvgY} x2={dscSvgX + 7} y2={dscSvgY}
          stroke="#5890d8" strokeWidth={1.5} pointerEvents="none" />
        <line x1={dscSvgX} y1={dscSvgY - 7} x2={dscSvgX} y2={dscSvgY + 7}
          stroke="#5890d8" strokeWidth={1.5} pointerEvents="none" />
        <text x={dscSvgX + 5} y={dscSvgY + 10} fontSize={8} fill="#5890d8" pointerEvents="none">DSC</text>
      </g>

      {/* ── Box-select rubber band (SVG space, not transformed) ── */}
      {boxRect && (() => {
        // Convert base-canvas coords to SVG pixel space
        const svgX = boxRect.x * zoom + panX;
        const svgY = boxRect.y * zoom + panY;
        const svgW2 = boxRect.w * zoom;
        const svgH2 = boxRect.h * zoom;
        return (
          <rect x={svgX} y={svgY} width={svgW2} height={svgH2}
            fill="rgba(99,179,237,0.07)" stroke="rgba(99,179,237,0.7)"
            strokeWidth={1} strokeDasharray="5 3" pointerEvents="none" />
        );
      })()}

      {/* ── HUD: drag coords (SVG space, not transformed) ── */}
      {hudPos && (
        <g pointerEvents="none">
          <rect x={W - 148} y={8} width={136} height={21} rx={3}
            fill="rgba(13,21,32,0.93)" stroke="rgba(52,211,153,0.4)" strokeWidth={1} />
          <text x={W - 80} y={23} textAnchor="middle" fill="#34d399" fontSize={9} fontWeight="600"
            style={{ fontFamily: 'monospace' }}>
            {`X ${hudPos.xM >= 0 ? '+' : ''}${hudPos.xM.toFixed(2)}  Y ${hudPos.yM >= 0 ? '+' : ''}${hudPos.yM.toFixed(2)} m`}
          </text>
        </g>
      )}

      {/* ── Cone hover tooltip ── */}
      {hoveredCone && (
        <g pointerEvents="none">
          <rect
            x={Math.min(Math.max(hoveredCone.svgX - 70, 4), W - 144)}
            y={hoveredCone.svgY - 54}
            width={140} height={48} rx={3}
            fill="rgba(13,21,32,0.94)" stroke="rgba(245,200,60,0.45)" strokeWidth={1} />
          <text
            x={Math.min(Math.max(hoveredCone.svgX, 74), W - 74)}
            y={hoveredCone.svgY - 38} textAnchor="middle" fill="#f0c030" fontSize={9.5} fontWeight="600">
            {hoveredCone.name}
          </text>
          <text
            x={Math.min(Math.max(hoveredCone.svgX, 74), W - 74)}
            y={hoveredCone.svgY - 24} textAnchor="middle" fill="#fef08a" fontSize={8.5}>
            {`Throw ${hoveredCone.throwM.toFixed(1)} m · ${hoveredCone.coveragePct}% coverage`}
          </text>
        </g>
      )}

      {/* Zoom hint */}
      <text x={W - 4} y={H - 4} textAnchor="end" fontSize={7.5} fill="rgba(255,255,255,0.18)" pointerEvents="none">
        {`×${zoom.toFixed(2)}  scroll=zoom  mid-drag=pan`}
      </text>
    </svg>
  );
};
