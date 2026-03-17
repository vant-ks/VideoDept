import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Edit2, Trash2, Copy, Projector, GripVertical, ChevronDown, ChevronUp, MonitorPlay, Ruler, Map, Layers } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/utils/helpers';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { useProjectionScreenAPI, type ProjectionScreen } from '@/hooks/useProjectionScreenAPI';
import { useProjectionSurfaceAPI, type ProjectionSurface, type ProjectorPosition, normalizeAssignments } from '@/hooks/useProjectionSurfaceAPI';
import { ProjectionSurfaceModal } from '@/components/ProjectionSurfaceModal';
import { useProductionEvents, getSocket } from '@/hooks/useProductionEvents';
import type { EntityEvent } from '@/hooks/useProductionEvents';
import { io as socketIO } from 'socket.io-client';
import { apiClient } from '@/services';
import { IOPortsPanel, DevicePortDraft } from '@/components/IOPortsPanel';
import { FormatFormModal } from '@/components/FormatFormModal';
import type { Format } from '@/types';
import { secondaryDevices as SECONDARY_DEVICE_OPTIONS } from '@/data/sampleData';
import { useVenueStore, DECK_SIZES, type VenueData } from '@/hooks/useVenueStore';
import { usePreferencesStore } from '@/hooks/usePreferencesStore';
import { DimLine, snapTo, formatMasImperial, CANVAS_SNAP_INCHES, SNAP_INCH_OPTIONS } from '@/components/VenueCanvasUtils';
import { calcBlend, calcCones, autoCalcNProj, MIN_OVERLAP_PCT, type BlendResult, type ConePoint } from '@/components/blend/blendEngine';
import { useLEDScreenAPI, type LEDScreen } from '@/hooks/useLEDScreenAPI';
import { BlendDiagram } from '@/components/blend/BlendDiagram';
import { ConeView, type ConeViewType } from '@/components/blend/ConeView';

// Projector placement types
const PROJECTOR_TYPES = [
  { label: 'Main Stage',           code: 'MAIN'  },
  { label: 'Image Magnification',  code: 'IMAG'  },
  { label: 'Lobby / Foyer',        code: 'LOBBY' },
  { label: 'Overflow',             code: 'OVR'   },
  { label: 'Breakout Room',        code: 'BREAK' },
  { label: 'Confidence',           code: 'CONF'  },
  { label: 'Rear Projection',      code: 'REAR'  },
  { label: 'Haze / Special FX',    code: 'HAZE'  },
] as const;

type ProjectorTypeCode = typeof PROJECTOR_TYPES[number]['code'];

// Form fields
interface ProjectorFormFields {
  name?: string;
  manufacturer?: string;
  model?: string;
  equipmentUuid?: string;
  projectorType?: ProjectorTypeCode | '';
  secondaryDevice?: string;
  note?: string;
  version?: number;
}

function buildPortDrafts(spec: any): DevicePortDraft[] {
  const ioPorts = spec.equipment_io_ports || [];
  if (ioPorts.length > 0) {
    return ioPorts.map((p: any) => ({
      specPortUuid: p.uuid,
      portLabel:    p.label || p.id,
      ioType:       p.io_type,
      direction:    p.port_type as 'INPUT' | 'OUTPUT',
      formatUuid:   null,
      note:         null,
    }));
  }
  return [
    ...(spec.inputs  || []).map((p: any) => ({ portLabel: p.label, ioType: p.type, direction: 'INPUT'  as const, formatUuid: null, note: null })),
    ...(spec.outputs || []).map((p: any) => ({ portLabel: p.label, ioType: p.type, direction: 'OUTPUT' as const, formatUuid: null, note: null })),
  ];
}

// ── Layout Tab ────────────────────────────────────────────────────────────────
const L_PAD = 40;
const L_SVG_W = 800;
const L_FT_M = 0.3048;
// Visual dot grid spacing for the Layout canvas (kept coarse for performance).
// Movement snap is controlled by CANVAS_SNAP_INCHES in VenueCanvasUtils.
const SCREEN_DOT_GRID_M = 0.5;
// Depth of the screen rect in the top-down view (thin bar)
const SCREEN_DEPTH_M = 0.18;

const LayoutTab: React.FC<{
  venueData: VenueData;
  surfaces: ProjectionSurface[];
  projectors: ProjectionScreen[];
  equipmentSpecs: any[];
  ledWalls: LEDScreen[];
  selectedSurfaceId: string | null;
  selectedProjectorUuid: string | null;
  onSelectSurface: (uuid: string | null) => void;
  onSelectProjector: (uuid: string) => void;
  onSurfaceMove: (uuid: string, xM: number, yM: number) => void;
  onLEDWallMove: (uuid: string, xM: number, yM: number) => void;
  onGoToStaging: () => void;
  onGoToLED: () => void;
}> = ({ venueData, surfaces, projectors, equipmentSpecs, ledWalls, selectedSurfaceId, selectedProjectorUuid, onSelectSurface, onSelectProjector, onSurfaceMove, onLEDWallMove, onGoToStaging, onGoToLED }) => {
  const hasRoom = venueData.roomWidthM > 0 && venueData.roomDepthM > 0;
  const svgRef = useRef<SVGSVGElement>(null);
  const [snapInches, setSnapInches] = useState(CANVAS_SNAP_INCHES);
  const [hudPos, setHudPos] = useState<{ xM: number; yM: number } | null>(null);
  const [selectedLEDId, setSelectedLEDId] = useState<string | null>(null);
  const [hoveredCone, setHoveredCone] = useState<{
    projName: string;
    throwM: number;
    coveragePct: number;
    stackCount: number;
    svgX: number;
    svgY: number;
  } | null>(null);
  const [hoveredLEDWall, setHoveredLEDWall] = useState<{
    name: string;
    cols: number;
    rows: number;
    svgX: number;
    svgY: number;
  } | null>(null);

  if (!hasRoom) {
    return (
      <Card className="p-12 text-center border-dashed">
        <Map className="w-12 h-12 text-av-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-av-text mb-2">Room Layout Not Configured</h3>
        <p className="text-av-text-muted mb-4">
          Set room dimensions in Staging to enable the layout view.
        </p>
        <button onClick={onGoToStaging} className="btn-primary mx-auto flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Go to Staging
        </button>
      </Card>
    );
  }

  const scale = (L_SVG_W - 2 * L_PAD) / venueData.roomWidthM;
  const svgH = venueData.roomDepthM * scale + 2 * L_PAD;
  const dscSvgX = L_SVG_W / 2;
  const dscSvgY = L_PAD + venueData.dscDepthFraction * venueData.roomDepthM * scale;
  const wx = (x: number) => dscSvgX + x * scale;
  const wy = (y: number) => dscSvgY - y * scale;
  const SNAP_M = snapInches * 0.0254;

  // ─ Drag state ──────────────────────────────────────────────────────────────
  const dragRef = useRef<{
    kind: 'surface' | 'ledwall';
    uuid: string;
    startSvgX: number;
    startSvgY: number;
    startXM: number;
    startYM: number;
  } | null>(null);

  function getSvgPoint(e: React.PointerEvent<Element>): [number, number] {
    const svg = svgRef.current;
    if (!svg) return [e.clientX, e.clientY];
    const rect = svg.getBoundingClientRect();
    const scaleX = L_SVG_W / rect.width;
    const scaleY = Math.max(svgH, 200) / rect.height;
    return [
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top)  * scaleY,
    ];
  }

  function handleSurfacePointerDown(e: React.PointerEvent<Element>, surf: ProjectionSurface) {
    e.stopPropagation();
    onSelectSurface(surf.uuid);
    setSelectedLEDId(null);
    const [sx, sy] = getSvgPoint(e);
    dragRef.current = {
      kind: 'surface',
      uuid: surf.uuid,
      startSvgX: sx,
      startSvgY: sy,
      startXM: surf.posDsXM ?? 0,
      startYM: surf.posDsYM ?? 0,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function handleLEDWallPointerDown(e: React.PointerEvent<Element>, wall: LEDScreen) {
    e.stopPropagation();
    setSelectedLEDId(wall.uuid);
    onSelectSurface(null);
    const [sx, sy] = getSvgPoint(e);
    dragRef.current = {
      kind: 'ledwall',
      uuid: wall.uuid,
      startSvgX: sx,
      startSvgY: sy,
      startXM: wall.posDsXM ?? 0,
      startYM: wall.posDsYM ?? 0,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current) return;
    const [sx, sy] = getSvgPoint(e);
    const dxM = (sx - dragRef.current.startSvgX) / scale;
    const dyM = -(sy - dragRef.current.startSvgY) / scale;
    const rawX = dragRef.current.startXM + dxM;
    const rawY = dragRef.current.startYM + dyM;
    const snappedX = snapTo(rawX, SNAP_M);
    const snappedY = snapTo(rawY, SNAP_M);
    if (dragRef.current.kind === 'ledwall') {
      onLEDWallMove(dragRef.current.uuid, snappedX, snappedY);
    } else {
      onSurfaceMove(dragRef.current.uuid, snappedX, snappedY);
    }
    setHudPos({ xM: snappedX, yM: snappedY });
  }

  function handlePointerUp() {
    dragRef.current = null;
    setHudPos(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<SVGSVGElement>) {
    if (!selectedSurfaceId && !selectedLEDId) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const dx = e.key === 'ArrowLeft' ? -SNAP_M : e.key === 'ArrowRight' ? SNAP_M : 0;
      const dy = e.key === 'ArrowUp'   ?  SNAP_M : e.key === 'ArrowDown'  ? -SNAP_M : 0;
      if (selectedSurfaceId) {
        const surf = surfaces.find(s => s.uuid === selectedSurfaceId);
        if (surf) onSurfaceMove(selectedSurfaceId, snapTo((surf.posDsXM ?? 0) + dx, SNAP_M), snapTo((surf.posDsYM ?? 0) + dy, SNAP_M));
      } else if (selectedLEDId) {
        const wall = ledWalls.find(w => w.uuid === selectedLEDId);
        if (wall) onLEDWallMove(selectedLEDId, snapTo((wall.posDsXM ?? 0) + dx, SNAP_M), snapTo((wall.posDsYM ?? 0) + dy, SNAP_M));
      }
    }
  }

  // ─ visual dot grid (0.5 m spacing — coarser than movement snap for performance) ────
  const snapDots: React.ReactNode[] = [];
  const stepsX = Math.floor(venueData.roomWidthM / SCREEN_DOT_GRID_M);
  const stepsY = Math.floor(venueData.roomDepthM / SCREEN_DOT_GRID_M);
  const startXM = -venueData.roomWidthM / 2;
  for (let ix = 0; ix <= stepsX; ix++) {
    for (let iy = 0; iy <= stepsY; iy++) {
      const px = wx(startXM + ix * SCREEN_DOT_GRID_M);
      const py = wy(iy * SCREEN_DOT_GRID_M);
      snapDots.push(
        <circle key={`d${ix}_${iy}`} cx={px} cy={py} r={0.9}
          fill="rgba(255,255,255,0.1)" pointerEvents="none" />
      );
    }
  }

  const selectedSurf = surfaces.find(s => s.uuid === selectedSurfaceId) ?? null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-av-text">Room Layout — Top Down</h3>
        <div className="flex items-center gap-3">
          {(selectedSurfaceId || selectedLEDId) && (
            <span className="text-xs text-emerald-400 font-medium">
              {selectedSurfaceId
                ? (surfaces.find(s => s.uuid === selectedSurfaceId)?.name ?? '')
                : (ledWalls.find(w => w.uuid === selectedLEDId)?.name ?? '')}
              {' '}selected — drag or ↑↓←→ nudge
            </span>
          )}
          <span className="text-xs text-av-text-muted">
            {venueData.roomWidthM.toFixed(1)} m W × {venueData.roomDepthM.toFixed(1)} m D
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-av-text-muted">Snap:</span>
            <select
              value={snapInches}
              onChange={e => setSnapInches(+e.target.value)}
              className="text-xs bg-av-surface border border-av-border/60 rounded px-1.5 py-0.5 text-av-text focus:outline-none"
            >
              {SNAP_INCH_OPTIONS.map(v => (
                <option key={v} value={v}>{v < 12 ? `${v}"` : `${v / 12}'`}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${L_SVG_W} ${Math.max(svgH, 200)}`}
          className="w-full border border-av-border/40 rounded bg-[#0d1520] select-none"
          style={{ maxHeight: 720, minHeight: 200, touchAction: 'none', outline: 'none' }}
          tabIndex={0}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onKeyDown={handleKeyDown}
          onClick={() => onSelectSurface(null)}
        >
          {/* Audience zone */}
          <rect
            x={L_PAD} y={dscSvgY}
            width={venueData.roomWidthM * scale}
            height={venueData.roomDepthM * (1 - venueData.dscDepthFraction) * scale}
            fill="rgba(100,130,190,0.07)" pointerEvents="none"
          />
          {/* Room outline */}
          <rect
            x={L_PAD} y={L_PAD}
            width={venueData.roomWidthM * scale}
            height={venueData.roomDepthM * scale}
            fill="none" stroke="#2d4878" strokeWidth="1.5" strokeDasharray="6 3" pointerEvents="none"
          />
          {/* Snap dots */}
          {snapDots}
          {/* DSC reference line */}
          <line
            x1={L_PAD} y1={dscSvgY}
            x2={L_PAD + venueData.roomWidthM * scale} y2={dscSvgY}
            stroke="#3a5c90" strokeWidth="1" strokeDasharray="4 4" pointerEvents="none"
          />
          {/* Stage decks (read-only) */}
          {venueData.stageDecks.map(deck => {
            const sz = DECK_SIZES[deck.type];
            const effW = deck.rotation === 90 ? sz.dFt : sz.wFt;
            const effD = deck.rotation === 90 ? sz.wFt : sz.dFt;
            const wM = effW * L_FT_M;
            const dM = effD * L_FT_M;
            const legAlpha = (deck.legHeightIn - 8) / (48 - 8);
            const blue = Math.round(200 - legAlpha * 60);
            return (
              <rect
                key={deck.id}
                x={wx(deck.xFt * L_FT_M)}
                y={wy(deck.yFt * L_FT_M + dM)}
                width={wM * scale}
                height={dM * scale}
                fill={`rgba(70,120,${blue},0.5)`}
                stroke="#4878b8" strokeWidth="0.8" rx="1" pointerEvents="none"
              />
            );
          })}
          {/* Projection surfaces — draggable */}
          {surfaces.map(surf => {
            const cx = surf.posDsXM ?? 0;
            const cy = surf.posDsYM ?? 0;
            const w  = surf.widthM ?? 2;
            const isSelected = surf.uuid === selectedSurfaceId;
            const rectX = wx(cx - w / 2);
            const rectY = wy(cy + SCREEN_DEPTH_M / 2);
            const rectW = w * scale;
            const rectH = Math.max(SCREEN_DEPTH_M * scale, 4);
            return (
              <g
                key={surf.uuid}
                style={{ cursor: 'grab' }}
                onPointerDown={e => handleSurfacePointerDown(e, surf)}
                onClick={e => { e.stopPropagation(); onSelectSurface(surf.uuid); }}
              >
                {isSelected && (
                  <rect
                    x={rectX - 4} y={rectY - 12}
                    width={rectW + 8} height={rectH + 24}
                    fill="none" stroke="rgba(52,211,153,0.5)" strokeWidth={2}
                    rx={3} strokeDasharray="4 2" pointerEvents="none"
                  />
                )}
                <rect
                  x={rectX} y={rectY}
                  width={rectW} height={rectH}
                  fill={isSelected ? 'rgba(52,211,153,0.35)' : 'rgba(60,190,150,0.25)'}
                  stroke={isSelected ? '#34d399' : '#30b890'}
                  strokeWidth={isSelected ? 1.8 : 1.2} rx="1"
                />
                {surf.heightM && (
                  <line
                    x1={rectX} y1={rectY - surf.heightM * scale + rectH}
                    x2={rectX} y2={rectY + rectH}
                    stroke={isSelected ? '#34d399' : '#30b890'}
                    strokeWidth={2} opacity={0.5} pointerEvents="none"
                  />
                )}
                <text x={wx(cx)} y={rectY - 4} textAnchor="middle" fontSize={10}
                  fill={isSelected ? '#34d399' : '#30b890'} pointerEvents="none">
                  {surf.name}
                </text>
              </g>
            );
          })}
          {/* Projectors + throw cones — driven by calcCones() */}
          {surfaces.flatMap(surf => {
            const assignments = surf.projectorAssignments ?? [];
            if (!assignments.length) return [];
            const surfW = surf.widthM ?? 4;
            const surfH = surf.heightM ?? 2.25;
            const sx = surf.posDsXM ?? 0;
            const sy = surf.posDsYM ?? 0;
            return assignments.flatMap(pos => {
              // Get spec from the first stacked unit's projector
              const firstUnit = pos.stackedUnits[0];
              const proj0 = firstUnit ? projectors.find(p => p.uuid === firstUnit.projectorUuid) : null;
              const spec0 = proj0?.equipmentUuid ? equipmentSpecs.find(s => s.uuid === proj0.equipmentUuid) : null;
              const nativeW = spec0?.specs?.nativeW ?? 1920;
              const nativeH = spec0?.specs?.nativeH ?? 1080;
              const throwRatio: number | undefined =
                spec0?.specs?.throwRatio ?? spec0?.specs?.throwRatioMin ?? undefined;
              const throwDistM = pos.throwDistM ?? (throwRatio ? throwRatio * surfW : null);
              if (!throwDistM) return [];

              const blendRes = calcBlend({
                screenW: surfW,
                screenH: surfH,
                nativeW,
                nativeH,
                nProj: 1,
                overlapPct: 0,
                throwDistM,
                throwRatio,
              });
              if (!blendRes) return [];

              const cones = calcCones({
                posX: sx + (pos.horizOffsetM ?? 0),
                posY: sy,
                screenH: surfH,
                mountRear: surf.surfaceType === 'REAR',
                throwDistM,
                throwRatio,
              }, blendRes);
              if (!cones.length) return [];

              const cone = cones[0];
              // pz is signed: +throwDist for front, -throwDist for rear
              const projWorldY = sy - cone.pz;
              const projSvgX = wx(cone.px);
              const projSvgY = wy(projWorldY);
              const screenSvgY = wy(sy);

              const projCoverageM = throwRatio ? throwDistM / throwRatio : surfW;
              const coveragePct = Math.min(100, Math.round((projCoverageM / surfW) * 100));

              return [(
                <g key={`cone-${surf.uuid}-${pos.id}`}>
                  {/* Throw cone triangle */}
                  <polygon
                    points={`${projSvgX},${projSvgY} ${wx(cone.sL)},${screenSvgY} ${wx(cone.sR)},${screenSvgY}`}
                    fill="rgba(245,200,60,0.07)" stroke="rgba(245,200,60,0.22)" strokeWidth="0.8"
                    pointerEvents="none"
                  />
                  {/* Per-stackedUnit projector dots */}
                  {pos.stackedUnits.map((unit, ui) => {
                    const unitProj = projectors.find(p => p.uuid === unit.projectorUuid);
                    const name = unitProj?.id ?? unit.projectorUuid.slice(0, 6);
                    const dotX = projSvgX + ui * 14;
                    return (
                      <g key={`dot-${unit.projectorUuid}`}>
                        <circle
                          cx={dotX} cy={projSvgY}
                          r={unit.projectorUuid === selectedProjectorUuid ? 7 : 5}
                          fill={unit.projectorUuid === selectedProjectorUuid ? '#fde047' : '#f0c030'}
                          stroke={unit.projectorUuid === selectedProjectorUuid ? '#eab308' : '#d4a820'}
                          strokeWidth={unit.projectorUuid === selectedProjectorUuid ? 2 : 1}
                          style={{ cursor: 'pointer' }}
                          onClick={e => { e.stopPropagation(); onSelectProjector(unit.projectorUuid); }}
                          onPointerEnter={() => setHoveredCone({
                            projName: name,
                            throwM: throwDistM,
                            coveragePct,
                            stackCount: pos.stackedUnits.length,
                            svgX: dotX,
                            svgY: projSvgY,
                          })}
                          onPointerLeave={() => setHoveredCone(null)}
                        />
                        {ui === 0 && (
                          <text x={projSvgX} y={projSvgY - 8} textAnchor="middle"
                            fontSize={9} fill="#f0c030" pointerEvents="none">
                            {name}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              )];
            });
          })}
          {/* LED Wall rectangles — draggable */}
          {ledWalls.filter(w => w.posDsXM != null && w.posDsYM != null).map(wall => {
            const tileSpec = wall.equipmentUuid
              ? equipmentSpecs.find(s => s.uuid === wall.equipmentUuid)
              : null;
            const panelWMm = tileSpec?.specs?.panelWidthMm ?? 500;
            const panelHMm = tileSpec?.specs?.panelHeightMm ?? 500;
            const cols = wall.tileGrid?.cols ?? 1;
            const rows = wall.tileGrid?.rows ?? 1;
            const wallWM = cols * (panelWMm / 1000);
            const wallHM = rows * (panelHMm / 1000);
            const cx = wall.posDsXM!;
            const cy = wall.posDsYM!;
            const isSelected = wall.uuid === selectedLEDId;
            const rectX = wx(cx - wallWM / 2);
            const rectY = wy(cy + wallHM / 2);
            const rectW = Math.max(wallWM * scale, 4);
            const rectH = Math.max(wallHM * scale, 4);
            return (
              <g
                key={`led-${wall.uuid}`}
                style={{ cursor: 'grab' }}
                onPointerDown={e => handleLEDWallPointerDown(e, wall)}
                onClick={e => { e.stopPropagation(); onGoToLED(); }}
              >
                {isSelected && (
                  <rect
                    x={rectX - 4} y={rectY - 4}
                    width={rectW + 8} height={rectH + 8}
                    fill="none" stroke="rgba(20,184,166,0.6)" strokeWidth={2}
                    rx={3} strokeDasharray="4 2" pointerEvents="none"
                  />
                )}
                <rect
                  x={rectX} y={rectY}
                  width={rectW} height={rectH}
                  fill={isSelected ? 'rgba(20,184,166,0.40)' : 'rgba(20,184,166,0.20)'}
                  stroke={isSelected ? '#14b8a6' : '#0d9488'}
                  strokeWidth={isSelected ? 1.8 : 1.2} rx="2"
                />
                <text x={wx(cx)} y={rectY - 4} textAnchor="middle" fontSize={10}
                  fill={isSelected ? '#14b8a6' : '#0d9488'} pointerEvents="none">
                  {wall.name}
                </text>
                {/* Invisible hover target over the rect */}
                <rect
                  x={rectX} y={rectY} width={rectW} height={rectH}
                  fill="transparent"
                  onPointerEnter={() => setHoveredLEDWall({
                    name: wall.name,
                    cols,
                    rows,
                    svgX: rectX + rectW / 2,
                    svgY: rectY,
                  })}
                  onPointerLeave={() => setHoveredLEDWall(null)}
                />
              </g>
            );
          })}
          {/* Dimension callouts for selected surface */}
          {selectedSurf && (() => {
            const cx = selectedSurf.posDsXM ?? 0;
            const cy = selectedSurf.posDsYM ?? 0;
            const w = selectedSurf.widthM ?? 2;
            const h = selectedSurf.heightM;
            const rectX = wx(cx - w / 2);
            const rectY = wy(cy + SCREEN_DEPTH_M / 2);
            const rectW = w * scale;
            return (
              <g pointerEvents="none">
                {/* Width */}
                <DimLine
                  x1={rectX} y1={rectY}
                  x2={rectX + rectW} y2={rectY}
                  label={formatMasImperial(w)}
                  offset={-20}
                  color="#34d399"
                />
                {/* Height */}
                {h && (
                  <DimLine
                    x1={rectX + rectW} y1={rectY - (h - SCREEN_DEPTH_M) * scale}
                    x2={rectX + rectW} y2={rectY + SCREEN_DEPTH_M * scale}
                    label={formatMasImperial(h)}
                    offset={22}
                    color="#34d399"
                  />
                )}
                {/* Upstage distance from DSC */}
                {Math.abs(cy) > 0.1 && (
                  <DimLine
                    x1={dscSvgX} y1={dscSvgY}
                    x2={dscSvgX} y2={wy(cy)}
                    label={formatMasImperial(Math.abs(cy))}
                    offset={-28}
                    color="#a78bfa"
                  />
                )}
                {/* Lateral offset from DSC centerline */}
                {Math.abs(cx) > 0.1 && (
                  <DimLine
                    x1={dscSvgX} y1={dscSvgY}
                    x2={wx(cx)} y2={dscSvgY}
                    label={formatMasImperial(Math.abs(cx))}
                    offset={12}
                    color="#a78bfa"
                  />
                )}
              </g>
            );
          })()}
          {/* DSC crosshair */}
          <line x1={dscSvgX - 8} y1={dscSvgY} x2={dscSvgX + 8} y2={dscSvgY} stroke="#5890d8" strokeWidth="1.5" pointerEvents="none" />
          <line x1={dscSvgX} y1={dscSvgY - 8} x2={dscSvgX} y2={dscSvgY + 8} stroke="#5890d8" strokeWidth="1.5" pointerEvents="none" />
          {/* Labels */}
          <text x={L_SVG_W / 2} y={L_PAD - 8} textAnchor="middle" fontSize={10} fill="#3a5c90" pointerEvents="none">UPSTAGE</text>
          <text x={L_SVG_W / 2} y={svgH - 4} textAnchor="middle" fontSize={10} fill="#3a5c90" pointerEvents="none">DOWNSTAGE / AUDIENCE</text>
          <text x={L_PAD + 4} y={dscSvgY - 5} fontSize={9} fill="#4a6a9a" pointerEvents="none">SL ←</text>
          <text x={L_PAD + venueData.roomWidthM * scale - 28} y={dscSvgY - 5} fontSize={9} fill="#4a6a9a" pointerEvents="none">→ SR</text>
          <text x={dscSvgX + 5} y={dscSvgY + 11} fontSize={9} fill="#5890d8" pointerEvents="none">DSC</text>
          {/* Drag coordinates HUD */}
          {hudPos && (
            <g pointerEvents="none">
              <rect x={L_SVG_W - 152} y={L_PAD + 5} width={140} height={22}
                rx={3} fill="rgba(13,21,32,0.92)" stroke="rgba(52,211,153,0.4)" strokeWidth={1} />
              <text x={L_SVG_W - 82} y={L_PAD + 20} textAnchor="middle"
                fill="#34d399" fontSize={9.5} fontWeight="600" style={{ fontFamily: 'monospace' }}>
                {`X ${hudPos.xM >= 0 ? '+' : ''}${hudPos.xM.toFixed(2)} m  \u00b7  Y ${hudPos.yM >= 0 ? '+' : ''}${hudPos.yM.toFixed(2)} m`}
              </text>
            </g>
          )}
          {/* Projector cone hover tooltip */}
          {hoveredCone && (
            <g pointerEvents="none">
              <rect
                x={Math.min(Math.max(hoveredCone.svgX - 75, L_PAD), L_SVG_W - 155)}
                y={hoveredCone.svgY - 60}
                width={150} height={52}
                rx={3} fill="rgba(13,21,32,0.94)" stroke="rgba(245,200,60,0.45)" strokeWidth={1}
              />
              <text
                x={Math.min(Math.max(hoveredCone.svgX, L_PAD + 75), L_SVG_W - 80)}
                y={hoveredCone.svgY - 44}
                textAnchor="middle" fill="#f0c030" fontSize={9.5} fontWeight="600">
                {hoveredCone.projName}
              </text>
              <text
                x={Math.min(Math.max(hoveredCone.svgX, L_PAD + 75), L_SVG_W - 80)}
                y={hoveredCone.svgY - 30}
                textAnchor="middle" fill="#fef08a" fontSize={8.5}>
                {`Throw: ${hoveredCone.throwM.toFixed(1)} m · ${hoveredCone.coveragePct}% coverage`}
              </text>
              <text
                x={Math.min(Math.max(hoveredCone.svgX, L_PAD + 75), L_SVG_W - 80)}
                y={hoveredCone.svgY - 17}
                textAnchor="middle" fill="#fef08a" fontSize={8.5}>
                {hoveredCone.stackCount > 1 ? `Stack: ${hoveredCone.stackCount} units` : 'Single unit'}
              </text>
            </g>
          )}
          {/* LED Wall hover tooltip */}
          {hoveredLEDWall && (
            <g pointerEvents="none">
              <rect
                x={Math.min(Math.max(hoveredLEDWall.svgX - 70, L_PAD), L_SVG_W - 145)}
                y={hoveredLEDWall.svgY - 46}
                width={140} height={40}
                rx={3} fill="rgba(13,21,32,0.92)" stroke="rgba(20,184,166,0.45)" strokeWidth={1}
              />
              <text
                x={Math.min(Math.max(hoveredLEDWall.svgX, L_PAD + 70), L_SVG_W - 75)}
                y={hoveredLEDWall.svgY - 30}
                textAnchor="middle" fill="#14b8a6" fontSize={9.5} fontWeight="600">
                {hoveredLEDWall.name}
              </text>
              <text
                x={Math.min(Math.max(hoveredLEDWall.svgX, L_PAD + 70), L_SVG_W - 75)}
                y={hoveredLEDWall.svgY - 17}
                textAnchor="middle" fill="#99f6e4" fontSize={8.5}>
                {`${hoveredLEDWall.cols}×${hoveredLEDWall.rows} grid`}
              </text>
            </g>
          )}
        </svg>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-av-text-muted">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-2.5 rounded" style={{ background: 'rgba(70,120,200,0.5)', border: '1px solid #4878b8' }} />
          <span>Stage Deck (read-only)</span>
        </div>
        {surfaces.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-2.5 rounded" style={{ background: 'rgba(60,190,150,0.25)', border: '1px solid #30b890' }} />
            <span>Screen (drag or ↑↓←→ nudge)</span>
          </div>
        )}
        {surfaces.some(s => (s.projectorAssignments ?? []).length > 0) && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#f0c030', border: '1px solid #d4a820' }} />
            <span>Projector (hover for details)</span>
          </div>
        )}
        {ledWalls.some(w => w.posDsXM != null) && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-2.5 rounded" style={{ background: 'rgba(20,184,166,0.20)', border: '1px solid #0d9488' }} />
            <span>LED Wall (drag or ↑↓←→ nudge)</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 ml-1"><div className="w-3 h-0.5 bg-violet-400" /><span>offset / distance</span></div>
      </div>
    </Card>
  );
};

export default function Projectors() {
  const { activeProject } = useProjectStore();
  const equipmentLib = useEquipmentLibrary();
  const oldStore = useProductionStore();
  const projectionScreenAPI = useProjectionScreenAPI();
  const projectionSurfaceAPI = useProjectionSurfaceAPI();
  const ledScreenAPI = useLEDScreenAPI();
  const { setActiveTab } = usePreferencesStore();
  const { getVenue } = useVenueStore();

  const equipmentSpecs =
    equipmentLib.equipmentSpecs.length > 0
      ? equipmentLib.equipmentSpecs
      : oldStore.equipmentSpecs;

  const productionId =
    activeProject?.production?.id || oldStore.production?.id;
  const venueData = getVenue(productionId || '');

  // ── Sub-tab ───────────────────────────────────────────────────────────────
  const [activeSubTab, setActiveSubTab] = useState<'projectors' | 'screens' | 'layout'>('projectors');

  // ── LED Walls state (for Layout canvas) ───────────────────────────────────
  const [localLEDWalls, setLocalLEDWalls] = useState<LEDScreen[]>([]);

  // ── Surfaces state ────────────────────────────────────────────────────────
  const [localSurfaces, setLocalSurfaces]         = useState<ProjectionSurface[]>([]);
  const [selectedSurfaceId, setSelectedSurfaceId] = useState<string | null>(null);
  const [selectedProjectorUuid, setSelectedProjectorUuid] = useState<string | null>(null);
  const [surfaceModalOpen, setSurfaceModalOpen]   = useState(false);
  const [editingSurface, setEditingSurface]       = useState<ProjectionSurface | null>(null);

  // ── Projection Analysis UI state ─────────────────────────────────────────
  // analysisOpenIds: which surface cards have the analysis panel expanded
  const [analysisOpenIds, setAnalysisOpenIds] = useState<Set<string>>(new Set());
  // overlapPct override per surface uuid (default 15%)
  const [surfaceOverlapPcts, setSurfaceOverlapPcts] = useState<Record<string, number>>({});
  // cone view mode per surface
  const [surfaceConeViews, setSurfaceConeViews] = useState<Record<string, ConeViewType>>({});

  // ── Projection Positions management ──────────────────────────────────────
  const [addPosForm, setAddPosForm] = useState<{
    surfaceUuid: string;
    label: string;
    projectorUuid: string;
    throwDistM: string;
    horizOffsetM: string;
  } | null>(null);
  const [editPosForm, setEditPosForm] = useState<{
    surfaceUuid: string;
    positionId: string;
    label: string;
    throwDistM: string;
    horizOffsetM: string;
  } | null>(null);
  const [addUnitForm, setAddUnitForm] = useState<{
    surfaceUuid: string;
    positionId: string;
    projectorUuid: string;
  } | null>(null);

  const toggleAnalysis = (uuid: string) =>
    setAnalysisOpenIds(prev => {
      const next = new Set(prev);
      next.has(uuid) ? next.delete(uuid) : next.add(uuid);
      return next;
    });

  // ── Position helpers ──────────────────────────────────────────────────────
  const patchSurfacePositions = useCallback(async (surfaceUuid: string, newPositions: ProjectorPosition[]) => {
    const surf = localSurfaces.find(s => s.uuid === surfaceUuid);
    if (!surf) return;
    const result = await projectionSurfaceAPI.updateSurface(surfaceUuid, {
      projectorAssignments: newPositions as any,
      version: surf.version,
    });
    if ('error' in result) {
      console.error('Version conflict saving positions:', result);
      return;
    }
    setLocalSurfaces(prev => prev.map(s =>
      s.uuid === surfaceUuid ? { ...(result as ProjectionSurface), projectorAssignments: newPositions } : s
    ));
  }, [localSurfaces, projectionSurfaceAPI]);

  const handleAddPosition = useCallback(async (surfaceUuid: string) => {
    if (!addPosForm) return;
    const surf = localSurfaces.find(s => s.uuid === surfaceUuid);
    if (!surf) return;
    const existing = surf.projectorAssignments ?? [];
    const newPos: ProjectorPosition = {
      id: crypto.randomUUID(),
      label: addPosForm.label.trim() || `P${existing.length + 1}`,
      horizOffsetM: parseFloat(addPosForm.horizOffsetM) || 0,
      throwDistM: addPosForm.throwDistM ? parseFloat(addPosForm.throwDistM) : undefined,
      stackedUnits: addPosForm.projectorUuid ? [{ projectorUuid: addPosForm.projectorUuid }] : [],
      blendZoneIndex: existing.length,
    };
    await patchSurfacePositions(surfaceUuid, [...existing, newPos]);
    setAddPosForm(null);
  }, [addPosForm, localSurfaces, patchSurfacePositions]);

  const handleEditPosition = useCallback(async (surfaceUuid: string) => {
    if (!editPosForm) return;
    const surf = localSurfaces.find(s => s.uuid === surfaceUuid);
    if (!surf) return;
    const updated = (surf.projectorAssignments ?? []).map(p =>
      p.id === editPosForm.positionId ? {
        ...p,
        label: editPosForm.label.trim() || p.label,
        throwDistM: editPosForm.throwDistM ? parseFloat(editPosForm.throwDistM) : undefined,
        horizOffsetM: parseFloat(editPosForm.horizOffsetM) || 0,
      } : p
    );
    await patchSurfacePositions(surfaceUuid, updated);
    setEditPosForm(null);
  }, [editPosForm, localSurfaces, patchSurfacePositions]);

  const handleRemovePosition = useCallback(async (surfaceUuid: string, positionId: string) => {
    const surf = localSurfaces.find(s => s.uuid === surfaceUuid);
    if (!surf) return;
    await patchSurfacePositions(surfaceUuid, (surf.projectorAssignments ?? []).filter(p => p.id !== positionId));
  }, [localSurfaces, patchSurfacePositions]);

  const handleAddUnit = useCallback(async (surfaceUuid: string) => {
    if (!addUnitForm || !addUnitForm.projectorUuid) return;
    const surf = localSurfaces.find(s => s.uuid === surfaceUuid);
    if (!surf) return;
    const updated = (surf.projectorAssignments ?? []).map(p =>
      p.id === addUnitForm.positionId
        ? { ...p, stackedUnits: [...p.stackedUnits, { projectorUuid: addUnitForm.projectorUuid }] }
        : p
    );
    await patchSurfacePositions(surfaceUuid, updated);
    setAddUnitForm(null);
  }, [addUnitForm, localSurfaces, patchSurfacePositions]);

  const handleRemoveUnit = useCallback(async (surfaceUuid: string, positionId: string, projectorUuid: string) => {
    const surf = localSurfaces.find(s => s.uuid === surfaceUuid);
    if (!surf) return;
    const updated = (surf.projectorAssignments ?? []).map(p =>
      p.id === positionId
        ? { ...p, stackedUnits: p.stackedUnits.filter(u => u.projectorUuid !== projectorUuid) }
        : p
    );
    await patchSurfacePositions(surfaceUuid, updated);
  }, [localSurfaces, patchSurfacePositions]);

  // Clear selection if the selected surface is removed
  useEffect(() => {
    if (selectedSurfaceId && !localSurfaces.find(s => s.uuid === selectedSurfaceId)) {
      setSelectedSurfaceId(null);
    }
  }, [localSurfaces, selectedSurfaceId]);

  // Scroll-to-card on tab switch for bidirectional navigation
  useEffect(() => {
    if (activeSubTab === 'projectors' && selectedProjectorUuid) {
      setTimeout(() => {
        projectorCardRefs.current[selectedProjectorUuid]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [activeSubTab, selectedProjectorUuid]);

  useEffect(() => {
    if (activeSubTab === 'screens' && selectedSurfaceId) {
      setTimeout(() => {
        surfaceCardRefs.current[selectedSurfaceId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [activeSubTab, selectedSurfaceId]);

  const handleSurfaceMove = useCallback(async (uuid: string, xM: number, yM: number) => {
    setLocalSurfaces(prev => prev.map(s => s.uuid === uuid ? { ...s, posDsXM: xM, posDsYM: yM } : s));
    const surf = localSurfaces.find(s => s.uuid === uuid);
    if (surf) {
      await projectionSurfaceAPI.updateSurface(uuid, { posDsXM: xM, posDsYM: yM, version: surf.version });
    }
  }, [localSurfaces, projectionSurfaceAPI]);

  const handleLEDWallMove = useCallback(async (uuid: string, xM: number, yM: number) => {
    setLocalLEDWalls(prev => prev.map(w => w.uuid === uuid ? { ...w, posDsXM: xM, posDsYM: yM } : w));
    const wall = localLEDWalls.find(w => w.uuid === uuid);
    if (wall) {
      await ledScreenAPI.updateLEDScreen(uuid, { posDsXM: xM, posDsYM: yM, version: wall.version });
    }
  }, [localLEDWalls, ledScreenAPI]);

  // ── State ─────────────────────────────────────────────────────────────────
  const [localProjectors, setLocalProjectors] = useState<ProjectionScreen[]>([]);
  const [formats, setFormats]                 = useState<Format[]>([]);
  const [cardPorts, setCardPorts]             = useState<Record<string, any[]>>({});
  const [devicePorts, setDevicePorts]         = useState<DevicePortDraft[]>([]);
  const [portsLoading, setPortsLoading]       = useState(false);
  const [expandedUuids, setExpandedUuids]     = useState<Set<string>>(new Set());
  const [isCreateFormatOpen, setIsCreateFormatOpen] = useState(false);

  // Drag-to-reorder state
  const isDragInProgress = useRef(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Refs for scroll-to-card bidirectional navigation
  const projectorCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const surfaceCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Modal
  const [isModalOpen, setIsModalOpen]           = useState(false);
  const [editingProjector, setEditingProjector] = useState<ProjectionScreen | null>(null);
  const [formData, setFormData]                 = useState<ProjectorFormFields>({
    manufacturer: '', model: '', projectorType: '', note: '',
  });
  const [errors, setErrors] = useState<string[]>([]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => { equipmentLib.fetchFromAPI(); }, []);

  // Listen for real-time equipment:updated so port changes reflect here
  useEffect(() => {
    const handleEquipmentUpdated = () => equipmentLib.fetchFromAPI();
    const sharedSocket = getSocket();
    let ownSocket: ReturnType<typeof socketIO> | null = null;
    if (sharedSocket) {
      sharedSocket.on('equipment:updated', handleEquipmentUpdated);
    } else {
      const apiUrl = (localStorage.getItem('api_server_url') || import.meta.env.VITE_API_URL || 'http://localhost:3010').replace(/\/api\/?$/, '');
      ownSocket = socketIO(apiUrl, { transports: ['websocket', 'polling'] });
      ownSocket.on('equipment:updated', handleEquipmentUpdated);
    }
    return () => {
      sharedSocket?.off('equipment:updated', handleEquipmentUpdated);
      if (ownSocket) { ownSocket.off('equipment:updated', handleEquipmentUpdated); ownSocket.disconnect(); }
    };
  }, []);

  useEffect(() => {
    if (productionId) {
      projectionScreenAPI.fetchProjectionScreens(productionId)
        .then(setLocalProjectors)
        .catch(console.error);
    }
  }, [productionId]);

  useEffect(() => {
    if (productionId) {
      projectionSurfaceAPI.fetchSurfaces(productionId)
        .then(setLocalSurfaces)
        .catch(console.error);
    }
  }, [productionId]);

  useEffect(() => {
    if (productionId) {
      ledScreenAPI.fetchLEDScreens(productionId)
        .then(setLocalLEDWalls)
        .catch(console.error);
    }
  }, [productionId]);

  useEffect(() => {
    apiClient.get<Format[]>('/formats').then(setFormats).catch(() => {});
  }, []);

  useEffect(() => {
    localProjectors.forEach(p => {
      if (!cardPorts[p.uuid]) {
        apiClient.get<any[]>(`/device-ports/device/${p.uuid}`)
          .then(ports => setCardPorts(prev => ({ ...prev, [p.uuid]: ports })))
          .catch(() => {});
      }
    });
  }, [localProjectors]);

  // ── Real-time WebSocket ───────────────────────────────────────────────────
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback((event: EntityEvent) => {
      if (event.entityType === 'projectionScreen') {
        if (isDragInProgress.current) return;
        setLocalProjectors(prev =>
          prev.some(p => p.uuid === event.entity.uuid) ? prev : [...prev, event.entity]
        );
      }
      if (event.entityType === 'projectionSurface') {
        const normalized = { ...event.entity, projectorAssignments: normalizeAssignments((event.entity.projectorAssignments ?? []) as any[]) };
        setLocalSurfaces(prev =>
          prev.some(s => s.uuid === normalized.uuid) ? prev : [...prev, normalized]
        );
      }
      if (event.entityType === 'ledScreen') {
        setLocalLEDWalls(prev =>
          prev.some(w => w.uuid === event.entity.uuid) ? prev : [...prev, event.entity]
        );
      }
    }, []),
    onEntityUpdated: useCallback((event: EntityEvent) => {
      if (event.entityType === 'projectionScreen') {
        if (isDragInProgress.current) return;
        setLocalProjectors(prev =>
          prev.map(p => p.uuid === event.entity.uuid ? event.entity : p)
        );
      }
      if (event.entityType === 'projectionSurface') {
        const normalized = { ...event.entity, projectorAssignments: normalizeAssignments((event.entity.projectorAssignments ?? []) as any[]) };
        setLocalSurfaces(prev =>
          prev.map(s => s.uuid === normalized.uuid ? normalized : s)
        );
      }
      if (event.entityType === 'ledScreen') {
        setLocalLEDWalls(prev =>
          prev.map(w => w.uuid === event.entity.uuid ? event.entity : w)
        );
      }
    }, []),
    onEntityDeleted: useCallback((event: EntityEvent) => {
      if (event.entityType === 'projectionScreen') {
        setLocalProjectors(prev => prev.filter(p => p.uuid !== event.entityId));
      }
      if (event.entityType === 'projectionSurface') {
        setLocalSurfaces(prev => prev.filter(s => s.uuid !== event.entityId));
      }
      if (event.entityType === 'ledScreen') {
        setLocalLEDWalls(prev => prev.filter(w => w.uuid !== event.entityId));
      }
    }, []),
  });

  // ── Equipment spec lookups ────────────────────────────────────────────────
  const projectorSpecs = useMemo(
    () => equipmentSpecs.filter(s => s.category?.toUpperCase() === 'PROJECTOR'),
    [equipmentSpecs]
  );

  const PROJECTOR_MANUFACTURERS = useMemo(
    () => [...new Set(projectorSpecs.map(s => s.manufacturer))].sort(),
    [projectorSpecs]
  );

  const PROJECTOR_MODELS_BY_MFR = useMemo(() => {
    const result: Record<string, string[]> = {};
    PROJECTOR_MANUFACTURERS.forEach(mfr => {
      result[mfr] = projectorSpecs
        .filter(s => s.manufacturer === mfr)
        .map(s => s.model)
        .sort();
    });
    return result;
  }, [PROJECTOR_MANUFACTURERS, projectorSpecs]);

  // ── Sorted projectors ─────────────────────────────────────────────────────
  const sortedProjectors = useMemo(() => {
    const typeOrder = PROJECTOR_TYPES.map(t => t.code);
    return [...localProjectors].sort((a, b) => {
      const aMatch = a.id.match(/^([A-Za-z]+)\s*(\d+)$/);
      const bMatch = b.id.match(/^([A-Za-z]+)\s*(\d+)$/);
      const aCode  = aMatch ? aMatch[1].toUpperCase() : '';
      const bCode  = bMatch ? bMatch[1].toUpperCase() : '';
      const aNum   = aMatch ? parseInt(aMatch[2], 10) : Infinity;
      const bNum   = bMatch ? parseInt(bMatch[2], 10) : Infinity;
      const aPos   = typeOrder.indexOf(aCode as ProjectorTypeCode);
      const bPos   = typeOrder.indexOf(bCode as ProjectorTypeCode);
      const aSort  = aPos === -1 ? 9999 : aPos;
      const bSort  = bPos === -1 ? 9999 : bPos;
      if (aSort !== bSort) return aSort - bSort;
      return aNum - bNum;
    });
  }, [localProjectors]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const generateId = (typeCode: string) => {
    const count = localProjectors.filter(p => {
      const match = p.id.match(/^([A-Za-z]+)\s*\d+$/);
      return match && match[1].toUpperCase() === typeCode.toUpperCase();
    }).length;
    return `${typeCode} ${count + 1}`;
  };

  const toggleReveal = useCallback((uuid: string) => {
    setExpandedUuids(prev => {
      const next = new Set(prev);
      if (next.has(uuid)) { next.delete(uuid); } else { next.add(uuid); }
      return next;
    });
    if (!cardPorts[uuid]) {
      apiClient.get<any[]>(`/device-ports/device/${uuid}`)
        .then(ports => setCardPorts(prev => ({ ...prev, [uuid]: ports })))
        .catch(() => {});
    }
  }, [cardPorts]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const handleAddNew = () => {
    setFormData({ manufacturer: '', model: '', projectorType: '', secondaryDevice: '', note: '' });
    setDevicePorts([]);
    setEditingProjector(null);
    setErrors([]);
    setIsModalOpen(true);
  };

  const handleModelChange = (model: string) => {
    const spec = projectorSpecs.find(
      s => s.manufacturer === formData.manufacturer && s.model === model
    );
    setFormData({ ...formData, model, equipmentUuid: spec?.uuid });
    setDevicePorts(spec ? buildPortDrafts(spec) : []);
  };

  const handleEdit = async (proj: ProjectionScreen) => {
    const spec = projectorSpecs.find(s => s.uuid === proj.equipmentUuid);
    const idTypeMatch = proj.id.match(/^([A-Za-z]+)\s*\d+$/);
    const typeCodeFromId = idTypeMatch ? idTypeMatch[1].toUpperCase() : '';
    const derivedType = PROJECTOR_TYPES.find(t => t.code === typeCodeFromId)?.code ?? '';
    setFormData({
      name:          proj.name,
      manufacturer:  spec?.manufacturer || '',
      model:         spec?.model || '',
      equipmentUuid: proj.equipmentUuid,
      projectorType: derivedType as ProjectorTypeCode | '',
      secondaryDevice: '',
      note:          proj.note || '',
      version:       proj.version,
    });
    setEditingProjector(proj);
    setErrors([]);
    setPortsLoading(true);
    setIsModalOpen(true);
    try {
      const ports = await apiClient.get<any[]>(`/device-ports/device/${proj.uuid}`);
      setDevicePorts(ports.map((p: any) => ({
        uuid:         p.uuid,
        specPortUuid: p.specPortUuid,
        portLabel:    p.portLabel,
        ioType:       p.ioType,
        direction:    p.direction as 'INPUT' | 'OUTPUT',
        formatUuid:   p.formatUuid ?? null,
        note:         p.note ?? null,
      })));
    } catch {
      setDevicePorts(spec ? buildPortDrafts(spec) : []);
    } finally {
      setPortsLoading(false);
    }
  };

  const handleSave = async (action: 'close' | 'duplicate' = 'close') => {
    const newErrors: string[] = [];
    if (!formData.projectorType?.trim()) newErrors.push('Projector type is required');
    if (!formData.manufacturer?.trim()) newErrors.push('Manufacturer is required');
    if (!formData.model?.trim()) newErrors.push('Model is required');
    if (newErrors.length > 0) { setErrors(newErrors); return; }

    try {
      let savedUuid: string;

      if (editingProjector) {
        const result = await projectionScreenAPI.updateProjectionScreen(editingProjector.uuid, {
          name:          formData.name,
          manufacturer:  formData.manufacturer,
          model:         formData.model,
          equipmentUuid: formData.equipmentUuid,
          note:          formData.note,
          version:       formData.version,
        });
        if ('error' in result) {
          setErrors([`Save conflict: ${(result as any).message || 'Record modified by another user.'}`]);
          return;
        }
        setLocalProjectors(prev =>
          prev.map(p => p.uuid === editingProjector.uuid ? (result as ProjectionScreen) : p)
        );
        savedUuid = editingProjector.uuid;
      } else {
        const newId = generateId(formData.projectorType || 'PROJ');
        const created = await projectionScreenAPI.createProjectionScreen({
          productionId: productionId!,
          id:           newId,
          name:         formData.name || newId,
          manufacturer: formData.manufacturer,
          model:        formData.model,
          equipmentUuid: formData.equipmentUuid,
          note:         formData.note,
        });
        setLocalProjectors(prev =>
          prev.some(p => p.uuid === created.uuid)
            ? prev.map(p => p.uuid === created.uuid ? created : p)
            : [...prev, created]
        );
        savedUuid = created.uuid;
      }

      // Sync device ports
      if (devicePorts.length > 0) {
        await apiClient.post(`/device-ports/device/${savedUuid}/sync`, { productionId, ports: devicePorts });
        const fresh = await apiClient.get<any[]>(`/device-ports/device/${savedUuid}`);
        setCardPorts(prev => ({ ...prev, [savedUuid]: fresh }));
      }

      if (action === 'duplicate') {
        const dupeId = generateId(formData.projectorType || 'PROJ');
        setFormData({ ...formData, name: dupeId });
        setDevicePorts([...devicePorts]);
        setEditingProjector(null);
        setErrors([]);
      } else {
        setIsModalOpen(false);
        setFormData({ manufacturer: '', model: '', projectorType: '', secondaryDevice: '', note: '' });
        setDevicePorts([]);
        setEditingProjector(null);
        setErrors([]);
      }
    } catch (err) {
      console.error('Failed to save projector:', err);
      setErrors(['Failed to save projector. Please try again.']);
    }
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm('Are you sure you want to delete this projector?')) return;
    try {
      await projectionScreenAPI.deleteProjectionScreen(uuid);
      // WS entity:deleted handles state
    } catch (err) {
      console.error('Failed to delete projector:', err);
      alert('Failed to delete projector. Please try again.');
    }
  };

  // ── Drag-to-reorder ───────────────────────────────────────────────────────
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
    isDragInProgress.current = true;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => setDragOverIndex(null);

  const handleDragEnd = async () => {
    const draggedIdx  = draggedIndex;
    const dragOverIdx = dragOverIndex;
    setDraggedIndex(null);
    setDragOverIndex(null);

    if (draggedIdx === null || dragOverIdx === null || draggedIdx === dragOverIdx) {
      isDragInProgress.current = false;
      return;
    }

    const snapshot = sortedProjectors.map(p => ({
      uuid:    p.uuid,
      oldId:   p.id,
      version: p.version,
    }));

    const reordered = [...snapshot];
    const [dragged] = reordered.splice(draggedIdx, 1);
    reordered.splice(dragOverIdx, 0, dragged);

    // Renumber per-type: MAIN 1, MAIN 2 … IMAG 1, IMAG 2 …
    const typeCounts: Record<string, number> = {};
    const updates = reordered
      .map(p => {
        const typeMatch = p.oldId.match(/^([A-Za-z]+)\s*\d+$/);
        const typeCode  = typeMatch ? typeMatch[1].toUpperCase() : 'PROJ';
        typeCounts[typeCode] = (typeCounts[typeCode] || 0) + 1;
        return { ...p, newId: `${typeCode} ${typeCounts[typeCode]}` };
      })
      .filter(u => u.oldId !== u.newId);

    if (updates.length === 0) { isDragInProgress.current = false; return; }

    try {
      await Promise.all(
        updates.map(u =>
          projectionScreenAPI.updateProjectionScreen(u.uuid, { id: u.newId, version: u.version } as any)
        )
      );
      if (productionId) {
        const fresh = await projectionScreenAPI.fetchProjectionScreens(productionId);
        setLocalProjectors(fresh);
      }
    } catch (err) {
      console.error('❌ Projector drag renumber failed:', err);
      alert('Failed to renumber projectors. Please refresh the page.');
    } finally {
      isDragInProgress.current = false;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-textPrimary">Projection</h1>
        </div>
        {activeSubTab === 'projectors' && (
          <button onClick={handleAddNew} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Projector
          </button>
        )}
        {activeSubTab === 'screens' && (
          <button onClick={() => { setEditingSurface(null); setSurfaceModalOpen(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Screen
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-av-border">
        <button
          onClick={() => setActiveSubTab('projectors')}
          className={cn(
            'px-4 py-2 font-medium transition-colors relative flex items-center gap-2',
            activeSubTab === 'projectors' ? 'text-av-accent' : 'text-av-text-muted hover:text-av-text'
          )}
        >
          <Projector className="w-4 h-4" />
          Projectors
          {activeSubTab === 'projectors' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-av-accent" />
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('screens')}
          className={cn(
            'px-4 py-2 font-medium transition-colors relative flex items-center gap-2',
            activeSubTab === 'screens' ? 'text-av-accent' : 'text-av-text-muted hover:text-av-text'
          )}
        >
          <MonitorPlay className="w-4 h-4" />
          Screens
          {activeSubTab === 'screens' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-av-accent" />
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('layout')}
          className={cn(
            'px-4 py-2 font-medium transition-colors relative flex items-center gap-2',
            activeSubTab === 'layout' ? 'text-av-accent' : 'text-av-text-muted hover:text-av-text'
          )}
        >
          <Map className="w-4 h-4" />
          Layout
          {activeSubTab === 'layout' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-av-accent" />
          )}
        </button>
      </div>

      {/* ── Projectors Tab ───────────────────────────────────────────────── */}
      {activeSubTab === 'projectors' && (
      <>{localProjectors.length === 0 ? (
        <Card className="p-12 text-center">
          <Projector className="w-12 h-12 text-av-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-av-text mb-2">No Projectors Yet</h3>
          <p className="text-av-text-muted mb-4">
            Add projection screens, IMAG rigs, and lobby displays
          </p>
          <button onClick={handleAddNew} className="btn-primary flex items-center gap-2 mx-auto">
            <Plus className="w-4 h-4" />
            Add Projector
          </button>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedProjectors.map((proj, index) => {
            const spec        = projectorSpecs.find(s => s.uuid === proj.equipmentUuid);
            const hasEquipment = !!spec;
            const isExpanded  = expandedUuids.has(proj.uuid);
            const revealPorts = (cardPorts[proj.uuid] ?? []) as any[];
            const idTypeMatch = proj.id.match(/^([A-Za-z]+)\s*\d+$/);
            const typeCodeFromId = idTypeMatch ? idTypeMatch[1].toUpperCase() : '';
            const typeEntry   = PROJECTOR_TYPES.find(t => t.code === typeCodeFromId);

            return (
              <div key={proj.uuid} ref={el => { projectorCardRefs.current[proj.uuid] = el; }}>
              <Card
                className={`p-4 transition-colors cursor-pointer select-none ${
                  dragOverIndex === index ? 'border-av-accent/60 bg-av-accent/5' : 'hover:border-av-accent/30'
                } ${draggedIndex === index ? 'opacity-50' : ''} ${
                  proj.uuid === selectedProjectorUuid ? 'ring-1 ring-amber-400/50 bg-amber-400/5' : ''
                }`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                onClick={() => !isDragInProgress.current && toggleReveal(proj.uuid)}
                onDoubleClick={e => { e.stopPropagation(); handleEdit(proj); }}
              >
                <div
                  className="grid items-center gap-3"
                  style={{ gridTemplateColumns: '30fr 30fr 30fr 10fr' }}
                >
                  {/* ID — chevron + grip + ID + name */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-av-accent flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-av-text-muted flex-shrink-0" />
                    }
                    <GripVertical
                      className="w-4 h-4 text-av-text-muted cursor-grab flex-shrink-0"
                      onClick={e => e.stopPropagation()}
                    />
                    <div className="min-w-0">
                      <span className={`text-sm font-semibold ${hasEquipment ? 'text-av-text' : 'text-av-warning'}`}>
                        {proj.id}
                      </span>
                      {proj.name && proj.name !== proj.id && (
                        <span className="ml-1.5 text-xs font-normal text-av-text-muted italic truncate">
                          {proj.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* NOTE */}
                  <div className="min-w-0">
                    {proj.note ? (
                      <p className="text-xs text-av-text-muted truncate">{proj.note}</p>
                    ) : (
                      <p className="text-xs text-av-text-muted/40 italic">No notes</p>
                    )}
                  </div>

                  {/* TAGS */}
                  <div className="flex flex-wrap gap-1">
                    {typeEntry && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-av-accent/15 border border-av-accent/30 text-av-accent font-bold">
                        {typeEntry.code}
                      </span>
                    )}
                    {spec && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-av-info/15 border border-av-info/30 text-av-info font-medium truncate max-w-[120px]">
                        {spec.manufacturer} {spec.model}
                      </span>
                    )}
                    {!hasEquipment && (
                      <span className="text-[10px] text-av-warning">No equipment</span>
                    )}
                  </div>

                  {/* BUTTONS */}
                  <div className="flex gap-1 justify-end items-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setSelectedProjectorUuid(proj.uuid); setActiveSubTab('layout'); }}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-amber-400 transition-colors"
                      title="View on Layout"
                    >
                      <Map className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(proj)}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        handleEdit({ ...proj, uuid: '' } as ProjectionScreen);
                        setEditingProjector(null);
                      }}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-info transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(proj.uuid)}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ── Reveal Panel ── */}
                {isExpanded && (
                  <div className="mt-4 border-t border-av-border pt-4">
                    {spec && (
                      <p className="text-sm font-medium text-av-text-secondary mb-3">
                        {spec.manufacturer} {spec.model}
                      </p>
                    )}
                    {revealPorts.length === 0 ? (
                      <p className="text-xs text-av-text-muted italic">
                        No ports configured. Open Edit to assign ports.
                      </p>
                    ) : (
                      <div className="overflow-x-auto px-2">
                        <table className="w-full text-xs table-fixed">
                          <thead>
                            <tr className="text-av-text-muted uppercase tracking-wide border-b border-av-border">
                              <th className="text-left pb-1.5 pr-3 font-semibold w-[10%]">Dir</th>
                              <th className="text-left pb-1.5 pr-3 font-semibold w-[15%]">Type</th>
                              <th className="text-left pb-1.5 pr-3 font-semibold w-[25%]">Label</th>
                              <th className="text-left pb-1.5 pr-3 font-semibold w-[25%]">Format</th>
                              <th className="text-left pb-1.5 font-semibold w-[25%]">Note</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-av-border/40">
                            {revealPorts.filter((p: any) => p.direction === 'INPUT').map((port: any, i: number) => (
                              <tr key={`in-${i}`} className="hover:bg-av-surface-hover/40">
                                <td className="py-1.5 pr-3">
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-warning/15 text-av-warning">IN</span>
                                </td>
                                <td className="py-1.5 pr-3 font-mono text-av-text-muted truncate">{port.ioType}</td>
                                <td className="py-1.5 pr-3 text-av-text truncate">{port.portLabel}</td>
                                <td className="py-1.5 pr-3 text-av-text-muted">—</td>
                                <td className="py-1.5 text-av-text-muted truncate">{port.note || '—'}</td>
                              </tr>
                            ))}
                            {revealPorts.filter((p: any) => p.direction === 'OUTPUT').map((port: any, i: number) => {
                              const fmtName = port.formatUuid
                                ? (formats.find(f => f.uuid === port.formatUuid)?.id ?? '—')
                                : '—';
                              return (
                                <tr key={`out-${i}`} className="hover:bg-av-surface-hover/40">
                                  <td className="py-1.5 pr-3">
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-accent/15 text-av-accent">OUT</span>
                                  </td>
                                  <td className="py-1.5 pr-3 font-mono text-av-text-muted truncate">{port.ioType}</td>
                                  <td className="py-1.5 pr-3 text-av-text truncate">{port.portLabel}</td>
                                  <td className="py-1.5 pr-3 text-av-info truncate">{fmtName}</td>
                                  <td className="py-1.5 text-av-text-muted truncate">{port.note || '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-av-surface border border-av-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

            {/* Sticky header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-av-border flex-shrink-0">
              <h2 className="text-xl font-bold text-av-text">
                {editingProjector ? 'Edit Projector' : 'Add Projector'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({ manufacturer: '', model: '', projectorType: '', secondaryDevice: '', note: '' });
                    setDevicePorts([]);
                    setErrors([]);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                {!editingProjector && (
                  <button onClick={() => handleSave('duplicate')} className="btn-secondary">
                    Save & Add Another
                  </button>
                )}
                {editingProjector && (
                  <button onClick={() => handleSave('duplicate')} className="btn-secondary">
                    Save & Duplicate
                  </button>
                )}
                <button onClick={() => handleSave('close')} className="btn-primary">
                  {editingProjector ? 'Save Changes' : 'Add Projector'}
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-6">

              {errors.length > 0 && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
                  {errors.map((e, i) => (
                    <p key={i} className="text-sm text-red-400">{e}</p>
                  ))}
                </div>
              )}

              <div className="space-y-4">

                {/* Projector Type */}
                <div>
                  <label className="block text-sm font-medium text-av-text-muted mb-2">
                    Type <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROJECTOR_TYPES.map(({ label, code }) => (
                      <label
                        key={code}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                          formData.projectorType === code
                            ? 'border-av-accent bg-av-accent/10 text-av-text'
                            : 'border-av-border hover:border-av-accent/40 text-av-text-muted'
                        }`}
                      >
                        <input
                          type="radio"
                          name="projectorType"
                          value={code}
                          checked={formData.projectorType === code}
                          onChange={() => setFormData({ ...formData, projectorType: code })}
                          className="sr-only"
                        />
                        <span className="text-xs font-mono font-semibold w-12 flex-shrink-0 text-av-accent">{code}</span>
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-av-text-muted mb-1">
                    Name <span className="text-av-text-muted/60 font-normal">(optional label)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Stage Left IMAG"
                    className="input-field w-full"
                  />
                </div>

                {/* Manufacturer */}
                <div>
                  <label className="block text-sm font-medium text-av-text-muted mb-1">
                    Manufacturer <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.manufacturer || ''}
                    onChange={e => setFormData({ ...formData, manufacturer: e.target.value, model: '', equipmentUuid: undefined })}
                    className="input-field w-full"
                  >
                    <option value="">Select manufacturer...</option>
                    {PROJECTOR_MANUFACTURERS.map(mfr => (
                      <option key={mfr} value={mfr}>{mfr}</option>
                    ))}
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-av-text-muted mb-1">
                    Model <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.model || ''}
                    onChange={e => handleModelChange(e.target.value)}
                    disabled={!formData.manufacturer}
                    className="input-field w-full disabled:opacity-50"
                  >
                    <option value="">Select model...</option>
                    {(PROJECTOR_MODELS_BY_MFR[formData.manufacturer || ''] || []).map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                {/* I/O Ports */}
                {formData.model && (devicePorts.length > 0 || portsLoading) && (
                  <div>
                    <label className="block text-sm font-medium text-av-text-muted mb-2">I/O Ports</label>
                    <IOPortsPanel
                      ports={devicePorts}
                      onChange={setDevicePorts}
                      formats={formats}
                      isLoading={portsLoading}
                      onCreateCustomFormat={() => setIsCreateFormatOpen(true)}
                    />
                  </div>
                )}

                {/* Secondary Device */}
                <div>
                  <label className="block text-sm font-medium text-av-text-muted mb-1">
                    Secondary Device <span className="text-av-text-muted/60 font-normal">(adapter / converter)</span>
                  </label>
                  <input
                    type="text"
                    list="projector-secondary-device-options"
                    value={formData.secondaryDevice || ''}
                    onChange={e => setFormData({ ...formData, secondaryDevice: e.target.value })}
                    placeholder="e.g., HDMI > SDI, DECIMATOR"
                    className="input-field w-full"
                  />
                  <datalist id="projector-secondary-device-options">
                    {SECONDARY_DEVICE_OPTIONS.map(opt => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-av-text-muted mb-1">Notes</label>
                  <textarea
                    value={formData.note || ''}
                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Any additional notes..."
                    rows={2}
                    className="input-field w-full resize-none"
                  />
                </div>

              </div>
            </div>{/* end scrollable body */}
          </div>
        </div>
      )}

      {isCreateFormatOpen && (
        <FormatFormModal
          isOpen={isCreateFormatOpen}
          onClose={() => setIsCreateFormatOpen(false)}
          onSaved={fmt => { setFormats(prev => [...prev, fmt]); setIsCreateFormatOpen(false); }}
        />
      )}
      </>
      )}

      {/* ── Screens Tab ──────────────────────────────────────────────────── */}
      {activeSubTab === 'screens' && (
        <div className="space-y-6">

          {/* Summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5">
              <p className="text-sm text-av-text-muted mb-1">Surfaces</p>
              <p className="text-3xl font-bold text-av-text">{localSurfaces.length}</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-av-text-muted mb-1">Projectors Assigned</p>
              <p className="text-3xl font-bold text-av-text">
                {localSurfaces.reduce((n, s) =>
                  n + (s.projectorAssignments ?? []).reduce((sum, pos) => sum + pos.stackedUnits.length, 0), 0
                )}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-av-text-muted mb-1">Total Lumens</p>
              <p className="text-3xl font-bold text-av-accent">
                {(() => {
                  const total = localSurfaces.reduce((sum, surf) => {
                    return sum + (surf.projectorAssignments || []).reduce((s2, pos) => {
                      return s2 + pos.stackedUnits.reduce((s3, unit) => {
                        const proj = localProjectors.find(p => p.uuid === unit.projectorUuid);
                        const spec = proj?.equipmentUuid ? equipmentSpecs.find(e => e.uuid === proj.equipmentUuid) : null;
                        return s3 + (spec?.specs?.lumens || 0);
                      }, 0);
                    }, 0);
                  }, 0);
                  return total > 0 ? (total >= 1000 ? `${(total / 1000).toFixed(0)}K` : total) : '—';
                })()}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-av-text-muted mb-1">Mattes</p>
              <p className="text-3xl font-bold text-av-text">
                {localSurfaces.reduce((n, s) => n + (s.mattes?.length || 0), 0) || '—'}
              </p>
            </Card>
          </div>

          {/* Surface cards */}
          {localSurfaces.length > 0 && (
            <div className="space-y-3">
              {localSurfaces.map(surf => {
                const isSelected = surf.uuid === selectedSurfaceId;
                const positions = surf.projectorAssignments ?? [];
                const widthFt = surf.widthM ? Math.floor(surf.widthM / 0.3048) : 0;
                const widthIn = surf.widthM ? Math.round((surf.widthM / 0.0254) % 12) : 0;
                const heightFt = surf.heightM ? Math.floor(surf.heightM / 0.3048) : 0;
                const heightIn = surf.heightM ? Math.round((surf.heightM / 0.0254) % 12) : 0;
                const diagM = surf.widthM && surf.heightM ? Math.sqrt(surf.widthM ** 2 + surf.heightM ** 2) : 0;
                const diagFt = diagM ? Math.floor(diagM / 0.3048) : 0;
                const diagIn = diagM ? Math.round((diagM / 0.0254) % 12) : 0;
                const SURFACE_TYPE_LABELS: Record<string, string> = {
                  FRONT: 'Front', REAR: 'Rear', DUAL_VISION: 'Dual Vision', MAPPED: 'Mapped'
                };

                // ── Projection Analysis for this surface ──────────────────
                const overlapPct = surfaceOverlapPcts[surf.uuid] ?? 15;
                const analysisOpen = analysisOpenIds.has(surf.uuid);
                const coneView = surfaceConeViews[surf.uuid] ?? 'top';

                // Pick spec from the first unit of the first position
                const firstPos = positions[0];
                const firstUnitUuid = firstPos?.stackedUnits?.[0]?.projectorUuid;
                const firstProj = firstUnitUuid ? localProjectors.find(p => p.uuid === firstUnitUuid) : null;
                const firstAssignSpec = firstProj?.equipmentUuid ? equipmentSpecs.find(e => e.uuid === firstProj.equipmentUuid) : null;
                const nativeW = (firstAssignSpec?.specs as any)?.nativeW as number | undefined;
                const nativeH = (firstAssignSpec?.specs as any)?.nativeH as number | undefined;
                const throwRatioSpec = (firstAssignSpec?.specs as any)?.throwRatioMin as number | undefined
                  ?? (firstAssignSpec?.specs as any)?.throwRatioMax as number | undefined;
                const firstThrowDistM = firstPos?.throwDistM;

                // Auto-determine nProj
                let analysisNProj = positions.length;
                let analysisSingle = false;
                let analysisCoverage: number | undefined;
                if (positions.length === 1 && surf.widthM && nativeW && throwRatioSpec && firstThrowDistM) {
                  const auto = autoCalcNProj(surf.widthM, firstThrowDistM, throwRatioSpec, overlapPct);
                  analysisNProj = auto.nProj;
                  analysisSingle = auto.single;
                  analysisCoverage = auto.projCoverage;
                }

                // Run blend calc
                let blendResult: BlendResult | null = null;
                let conePoints: ConePoint[] = [];
                if (surf.widthM && surf.heightM && nativeW && nativeH && analysisNProj > 0) {
                  blendResult = calcBlend({
                    screenW: surf.widthM,
                    screenH: surf.heightM,
                    nativeW,
                    nativeH,
                    nProj: analysisNProj,
                    overlapPct,
                    throwDistM: firstThrowDistM,
                    throwRatio: throwRatioSpec,
                    mountRear: surf.surfaceType === 'REAR',
                  });
                  if (blendResult) {
                    conePoints = calcCones(
                      {
                        posX: surf.posDsXM ?? 0,
                        posY: surf.posDsYM ?? 0,
                        screenH: surf.heightM,
                        projHeight: surf.distFloorM ? surf.distFloorM + surf.heightM : undefined,
                        mountRear: surf.surfaceType === 'REAR',
                        throwDistM: firstThrowDistM,
                        throwRatio: throwRatioSpec,
                      },
                      blendResult,
                    );
                  }
                }

                const hasEnoughForAnalysis = !!surf.widthM && !!nativeW;

                return (
                  <div key={surf.uuid} ref={el => { surfaceCardRefs.current[surf.uuid] = el; }}>
                  <Card
                    className={`p-4 transition-colors ${isSelected ? 'ring-1 ring-emerald-500/40 bg-emerald-500/5' : ''}`}
                  >
                    {/* Card header — click to select surface */}
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => setSelectedSurfaceId(isSelected ? null : surf.uuid)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MonitorPlay className="w-5 h-5 text-av-accent flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-av-text">{surf.name}</span>
                            {surf.surfaceType && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-av-accent/15 border border-av-accent/30 text-av-accent font-bold uppercase">
                                {SURFACE_TYPE_LABELS[surf.surfaceType] || surf.surfaceType}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-av-text-muted flex-wrap">
                            {surf.widthM && surf.heightM && (
                              <span>{widthFt}' {widthIn}" × {heightFt}' {heightIn}" ({diagFt}' {diagIn}" diag)</span>
                            )}
                            {surf.gainFactor && surf.gainFactor !== 1 && (
                              <span>Gain {surf.gainFactor.toFixed(2)}×</span>
                            )}
                            {surf.mattes && surf.mattes.length > 0 && (
                              <span>{surf.mattes.length} matte{surf.mattes.length > 1 ? 's' : ''}</span>
                            )}
                            {positions.length > 0 && (
                              <span className="text-av-accent/70">
                                {positions.length} position{positions.length !== 1 ? 's' : ''} · {positions.reduce((n, p) => n + p.stackedUnits.length, 0)} unit{positions.reduce((n, p) => n + p.stackedUnits.length, 0) !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        {hasEnoughForAnalysis && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleAnalysis(surf.uuid); }}
                            className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 ${
                              analysisOpen
                                ? 'border-av-accent/50 text-av-accent bg-av-accent/10'
                                : 'border-av-border text-av-text-muted hover:border-av-accent/40 hover:text-av-accent'
                            }`}
                          >
                            <Layers className="w-3 h-3" />
                            Analysis
                            <ChevronDown className={`w-3 h-3 transition-transform ${analysisOpen ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedSurfaceId(surf.uuid); setActiveSubTab('layout'); }}
                          className="btn-secondary text-xs flex items-center gap-1"
                          title="View on Layout"
                        >
                          <Map className="w-3 h-3" /> Layout
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingSurface(surf); setSurfaceModalOpen(true); }}
                          className="btn-secondary text-xs flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`Delete surface "${surf.name}"?`)) return;
                            await projectionSurfaceAPI.deleteSurface(surf.uuid);
                            setLocalSurfaces(prev => prev.filter(s => s.uuid !== surf.uuid));
                          }}
                          className="p-1.5 rounded text-av-danger hover:bg-av-danger/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* ── Projection Positions ──────────────────────────── */}
                    <div className="mt-3 pt-3 border-t border-av-border/60" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-av-text-muted uppercase tracking-wider">Projection Positions</span>
                        <button
                          onClick={() => {
                            const nextLabel = `P${(surf.projectorAssignments?.length ?? 0) + 1}`;
                            setAddPosForm(addPosForm?.surfaceUuid === surf.uuid
                              ? null
                              : { surfaceUuid: surf.uuid, label: nextLabel, projectorUuid: '', throwDistM: '', horizOffsetM: '0' });
                            setEditPosForm(null);
                            setAddUnitForm(null);
                          }}
                          className="text-[11px] text-av-accent hover:text-av-accent/80 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Position
                        </button>
                      </div>

                      {positions.length === 0 && addPosForm?.surfaceUuid !== surf.uuid && (
                        <p className="text-xs text-av-text-muted/60 italic">No positions assigned. Use "Add Position" to assign projectors.</p>
                      )}

                      {positions.map(pos => {
                        const isEditingThis = editPosForm?.surfaceUuid === surf.uuid && editPosForm.positionId === pos.id;
                        const isAddingUnitHere = addUnitForm?.surfaceUuid === surf.uuid && addUnitForm.positionId === pos.id;
                        return (
                          <div key={pos.id} className="mb-1.5 rounded border border-av-border/50 bg-av-surface-light/20 p-2">
                            {isEditingThis ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-[10px] text-av-text-muted block mb-0.5">Label</label>
                                    <input type="text" value={editPosForm.label}
                                      onChange={e => setEditPosForm({ ...editPosForm, label: e.target.value })}
                                      className="input-field w-full text-xs h-7" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-av-text-muted block mb-0.5">Throw (m)</label>
                                    <input type="number" step="0.1" value={editPosForm.throwDistM}
                                      onChange={e => setEditPosForm({ ...editPosForm, throwDistM: e.target.value })}
                                      placeholder="e.g. 15.5" className="input-field w-full text-xs h-7" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-av-text-muted block mb-0.5">H Offset (m)</label>
                                    <input type="number" step="0.05" value={editPosForm.horizOffsetM}
                                      onChange={e => setEditPosForm({ ...editPosForm, horizOffsetM: e.target.value })}
                                      className="input-field w-full text-xs h-7" />
                                  </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <button onClick={() => setEditPosForm(null)} className="btn-secondary text-xs py-1 px-2">Cancel</button>
                                  <button onClick={() => handleEditPosition(surf.uuid)} className="btn-primary text-xs py-1 px-2">Save</button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs flex-wrap">
                                    <span className="font-bold text-av-accent text-[11px] w-6 flex-shrink-0">{pos.label}</span>
                                    {pos.throwDistM ? (
                                      <span className="text-av-text">{pos.throwDistM.toFixed(1)} m</span>
                                    ) : (
                                      <span className="text-av-text-muted/50 italic text-[11px]">no throw</span>
                                    )}
                                    {pos.horizOffsetM !== 0 && (
                                      <span className="text-av-text-muted text-[11px]">
                                        H {pos.horizOffsetM >= 0 ? '+' : ''}{pos.horizOffsetM.toFixed(2)} m
                                      </span>
                                    )}
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-av-surface border border-av-border/60 text-av-text-muted">
                                      {pos.stackedUnits.length} unit{pos.stackedUnits.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => { setEditPosForm({ surfaceUuid: surf.uuid, positionId: pos.id, label: pos.label, throwDistM: pos.throwDistM?.toString() ?? '', horizOffsetM: pos.horizOffsetM.toString() }); setAddPosForm(null); setAddUnitForm(null); }}
                                      className="p-1 rounded hover:bg-av-surface text-av-text-muted hover:text-av-accent transition-colors" title="Edit position"
                                    ><Edit2 className="w-3 h-3" /></button>
                                    <button
                                      onClick={() => { setAddUnitForm(addUnitForm?.positionId === pos.id ? null : { surfaceUuid: surf.uuid, positionId: pos.id, projectorUuid: '' }); setEditPosForm(null); }}
                                      className="p-1 rounded hover:bg-av-surface text-av-text-muted hover:text-av-info transition-colors" title="Add unit to stack"
                                    ><Plus className="w-3 h-3" /></button>
                                    <button
                                      onClick={() => handleRemovePosition(surf.uuid, pos.id)}
                                      className="p-1 rounded hover:bg-av-surface text-av-text-muted hover:text-av-danger transition-colors" title="Remove position"
                                    ><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </div>
                                {/* Stacked units */}
                                {pos.stackedUnits.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5 pl-7">
                                    {pos.stackedUnits.map((unit, ui) => {
                                      const p = localProjectors.find(pr => pr.uuid === unit.projectorUuid);
                                      return (
                                        <span key={ui} className="text-[10px] px-2 py-0.5 rounded-full bg-av-accent/10 border border-av-accent/20 text-av-accent flex items-center gap-1">
                                          {p?.id ?? <span className="text-av-warning">Unknown</span>}
                                          {pos.stackedUnits.length > 1 && (
                                            <button onClick={() => handleRemoveUnit(surf.uuid, pos.id, unit.projectorUuid)} className="ml-0.5 hover:text-av-danger transition-colors leading-none">×</button>
                                          )}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                                {/* Add unit form */}
                                {isAddingUnitHere && (
                                  <div className="flex items-center gap-2 mt-2 pl-7">
                                    <select
                                      value={addUnitForm.projectorUuid}
                                      onChange={e => setAddUnitForm({ ...addUnitForm, projectorUuid: e.target.value })}
                                      className="input-field text-xs h-7 flex-1"
                                    >
                                      <option value="">Select projector...</option>
                                      {sortedProjectors
                                        .filter(p => !pos.stackedUnits.some(u => u.projectorUuid === p.uuid))
                                        .map(p => <option key={p.uuid} value={p.uuid}>{p.id}{p.name && p.name !== p.id ? ` — ${p.name}` : ''}</option>)
                                      }
                                    </select>
                                    <button onClick={() => handleAddUnit(surf.uuid)} disabled={!addUnitForm.projectorUuid} className="btn-primary text-xs py-1 px-2 disabled:opacity-50">Add</button>
                                    <button onClick={() => setAddUnitForm(null)} className="btn-secondary text-xs py-1 px-2">Cancel</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add Position form */}
                      {addPosForm?.surfaceUuid === surf.uuid && (
                        <div className="mt-2 rounded border border-av-accent/30 bg-av-accent/5 p-3 space-y-2">
                          <p className="text-[11px] font-semibold text-av-accent">New Position</p>
                          <div className="grid grid-cols-4 gap-2">
                            <div>
                              <label className="text-[10px] text-av-text-muted block mb-0.5">Label</label>
                              <input type="text" value={addPosForm.label}
                                onChange={e => setAddPosForm({ ...addPosForm, label: e.target.value })}
                                className="input-field w-full text-xs h-7" />
                            </div>
                            <div>
                              <label className="text-[10px] text-av-text-muted block mb-0.5">Projector</label>
                              <select value={addPosForm.projectorUuid}
                                onChange={e => setAddPosForm({ ...addPosForm, projectorUuid: e.target.value })}
                                className="input-field w-full text-xs h-7">
                                <option value="">Select...</option>
                                {sortedProjectors.map(p => <option key={p.uuid} value={p.uuid}>{p.id}{p.name && p.name !== p.id ? ` — ${p.name}` : ''}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-av-text-muted block mb-0.5">Throw (m)</label>
                              <input type="number" step="0.1" value={addPosForm.throwDistM}
                                onChange={e => setAddPosForm({ ...addPosForm, throwDistM: e.target.value })}
                                placeholder="15.5" className="input-field w-full text-xs h-7" />
                            </div>
                            <div>
                              <label className="text-[10px] text-av-text-muted block mb-0.5">H Offset (m)</label>
                              <input type="number" step="0.05" value={addPosForm.horizOffsetM}
                                onChange={e => setAddPosForm({ ...addPosForm, horizOffsetM: e.target.value })}
                                className="input-field w-full text-xs h-7" />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setAddPosForm(null)} className="btn-secondary text-xs py-1 px-2">Cancel</button>
                            <button onClick={() => handleAddPosition(surf.uuid)} className="btn-primary text-xs py-1 px-2">Add Position</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Projection Analysis panel ─────────────────────── */}
                    {analysisOpen && (
                      <div className="mt-4 pt-4 border-t border-av-border" onClick={e => e.stopPropagation()}>
                        {!hasEnoughForAnalysis ? (
                          <p className="text-xs text-av-text-muted">Set screen width and assign a projector with spec data to calculate.</p>
                        ) : positions.length === 0 ? (
                          <p className="text-xs text-av-text-muted">Assign a projector to calculate projection analysis.</p>
                        ) : !nativeW || !nativeH ? (
                          <p className="text-xs text-av-text-muted">Projector spec is missing native resolution. Add it in the Equipment Library.</p>
                        ) : (
                          <>
                            {/* Status chip + auto-calc summary */}
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              {analysisSingle ? (
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                                  SINGLE PROJECTOR
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                                  {analysisNProj}× BLEND
                                </span>
                              )}
                              {analysisCoverage !== undefined && (
                                <span className="text-xs text-av-text-muted">
                                  1 projector covers {(analysisCoverage * 3.281).toFixed(1)}' of {(surf.widthM! * 3.281).toFixed(1)}' screen
                                </span>
                              )}
                              {blendResult && analysisNProj > 1 && (
                                <span className="text-xs text-av-text-muted">
                                  Canvas: {blendResult.canvasW.toLocaleString()} × {blendResult.canvasH.toLocaleString()} px
                                </span>
                              )}
                            </div>

                            {/* Overlap control (blend mode only) */}
                            {!analysisSingle && (
                              <div className="flex items-center gap-3 mb-3">
                                <label className="text-xs text-av-text-muted whitespace-nowrap">Overlap %</label>
                                <input
                                  type="range"
                                  min={MIN_OVERLAP_PCT}
                                  max={40}
                                  value={overlapPct}
                                  onChange={e => setSurfaceOverlapPcts(p => ({ ...p, [surf.uuid]: +e.target.value }))}
                                  className="flex-1 accent-av-accent"
                                />
                                <span className="text-xs text-av-text w-8 text-right">{overlapPct}%</span>
                              </div>
                            )}

                            {/* Blend diagram */}
                            {blendResult && (
                              <div className="mb-3 overflow-x-auto">
                                <BlendDiagram
                                  screenW={surf.widthM!}
                                  screenH={surf.heightM!}
                                  result={blendResult}
                                  width={560}
                                  height={160}
                                />
                              </div>
                            )}

                            {/* Cone view (only when throw data available) */}
                            {conePoints.length > 0 && (
                              <>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs text-av-text-muted">Cone view:</span>
                                  {(['top', 'side', 'front'] as ConeViewType[]).map(v => (
                                    <button
                                      key={v}
                                      onClick={() => setSurfaceConeViews(p => ({ ...p, [surf.uuid]: v }))}
                                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                                        coneView === v
                                          ? 'border-av-accent/50 text-av-accent bg-av-accent/10'
                                          : 'border-av-border text-av-text-muted hover:border-av-accent/40'
                                      }`}
                                    >
                                      {v}
                                    </button>
                                  ))}
                                </div>
                                <ConeView
                                  cones={conePoints}
                                  screenH={surf.heightM!}
                                  posY={surf.posDsYM ?? 0}
                                  view={coneView}
                                  width={320}
                                  height={200}
                                />
                              </>
                            )}

                            {/* Warnings */}
                            {blendResult?.warn.map((w, i) => (
                              <p key={i} className="text-xs text-amber-400 mt-1">⚠ {w}</p>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </Card>
                  </div>
                );
              })}
            </div>
          )}

          {localSurfaces.length === 0 && (
            <Card className="p-12 text-center border-dashed">
              <MonitorPlay className="w-12 h-12 text-av-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-av-text mb-2">No Projection Surfaces Yet</h3>
              <p className="text-av-text-muted mb-4">
                Add a screen to configure dimensions, surface type, throw distances, and lux calculations.
              </p>
              <button
                onClick={() => { setEditingSurface(null); setSurfaceModalOpen(true); }}
                className="btn-primary flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Add Screen
              </button>
            </Card>
          )}
        </div>
      )}

      {/* ── Layout Tab ───────────────────────────────────────────────────── */}
      {activeSubTab === 'layout' && productionId && (
        <LayoutTab
          venueData={venueData}
          surfaces={localSurfaces}
          projectors={localProjectors}
          equipmentSpecs={equipmentSpecs}
          ledWalls={localLEDWalls}
          selectedSurfaceId={selectedSurfaceId}
          selectedProjectorUuid={selectedProjectorUuid}
          onSelectSurface={(uuid) => { setSelectedSurfaceId(uuid); if (uuid) setActiveSubTab('screens'); }}
          onSelectProjector={(uuid) => { setSelectedProjectorUuid(uuid); setActiveSubTab('projectors'); }}
          onSurfaceMove={handleSurfaceMove}
          onLEDWallMove={handleLEDWallMove}
          onGoToStaging={() => setActiveTab('staging')}
          onGoToLED={() => setActiveTab('led')}
        />
      )}

      {/* ── Projection Surface Modal ─────────────────────────────────────── */}
      {productionId && (
        <ProjectionSurfaceModal
          isOpen={surfaceModalOpen}
          onClose={() => { setSurfaceModalOpen(false); setEditingSurface(null); }}
          onSave={async (data) => {
            if (editingSurface) {
              const updated = await projectionSurfaceAPI.updateSurface(editingSurface.uuid, data) as ProjectionSurface;
              setLocalSurfaces(prev => prev.map(s => s.uuid === updated.uuid ? updated : s));
            } else {
              const created = await projectionSurfaceAPI.createSurface({ ...data, productionId });
              // Dedup: WS event may have already added it before the HTTP response returned
              setLocalSurfaces(prev => prev.some(s => s.uuid === created.uuid) ? prev : [...prev, created]);
            }
          }}
          editingSurface={editingSurface}
          projectors={localProjectors}
          equipmentSpecs={equipmentSpecs}
          productionId={productionId}
        />
      )}
    </div>
  );
}
