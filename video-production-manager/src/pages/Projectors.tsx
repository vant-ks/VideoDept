import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Edit2, Trash2, Copy, Projector, GripVertical, ChevronDown, ChevronUp, MonitorPlay, Ruler, Map, Layers } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/utils/helpers';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { useProjectionScreenAPI, type ProjectionScreen } from '@/hooks/useProjectionScreenAPI';
import { useProjectionSurfaceAPI, type ProjectionSurface } from '@/hooks/useProjectionSurfaceAPI';
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
import { DimLine, snapTo, formatMasImperial, CANVAS_SNAP_M } from '@/components/VenueCanvasUtils';

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
  selectedSurfaceId: string | null;
  onSelectSurface: (uuid: string | null) => void;
  onSurfaceMove: (uuid: string, xM: number, yM: number) => void;
  onGoToStaging: () => void;
}> = ({ venueData, surfaces, projectors, equipmentSpecs, selectedSurfaceId, onSelectSurface, onSurfaceMove, onGoToStaging }) => {
  const hasRoom = venueData.roomWidthM > 0 && venueData.roomDepthM > 0;
  const svgRef = useRef<SVGSVGElement>(null);

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

  // ─ Drag state ──────────────────────────────────────────────────────────────
  const dragRef = useRef<{
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
    const [sx, sy] = getSvgPoint(e);
    dragRef.current = {
      uuid: surf.uuid,
      startSvgX: sx,
      startSvgY: sy,
      startXM: surf.posDsXM ?? 0,
      startYM: surf.posDsYM ?? 0,
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
    onSurfaceMove(dragRef.current.uuid, snapTo(rawX, CANVAS_SNAP_M), snapTo(rawY, CANVAS_SNAP_M));
  }

  function handlePointerUp() {
    dragRef.current = null;
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
          {selectedSurfaceId && (
            <span className="text-xs text-emerald-400 font-medium">
              {surfaces.find(s => s.uuid === selectedSurfaceId)?.name} selected — drag to reposition
            </span>
          )}
          <span className="text-xs text-av-text-muted">
            {venueData.roomWidthM.toFixed(1)} m W × {venueData.roomDepthM.toFixed(1)} m D
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${L_SVG_W} ${Math.max(svgH, 200)}`}
          className="w-full border border-av-border/40 rounded bg-[#0d1520] select-none"
          style={{ maxHeight: 720, minHeight: 200, touchAction: 'none' }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
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
          {/* Projectors + throw cones */}
          {surfaces.flatMap(surf =>
            (surf.projectorAssignments ?? []).flatMap(asgn => {
              const proj = projectors.find(p => p.uuid === asgn.projectorUuid);
              if (!proj) return [];
              const spec = proj.equipmentUuid ? equipmentSpecs.find(e => e.uuid === proj.equipmentUuid) : null;
              const lensThrow = spec?.specs?.throwRatio && surf.widthM ? spec.specs.throwRatio * surf.widthM : null;
              const throwM = asgn.throwDistM ?? lensThrow;
              if (!throwM) return [];
              const sx = surf.posDsXM ?? 0;
              const sy = surf.posDsYM ?? 0;
              const projX = sx + (asgn.horizOffsetM ?? 0);
              const projY = surf.surfaceType === 'REAR' ? sy + throwM : sy - throwM;
              const sw = surf.widthM ?? 2;
              const px = wx(projX); const py = wy(projY);
              const sL = wx(sx - sw / 2); const sR = wx(sx + sw / 2); const sY = wy(sy);
              return [(
                <g key={`${surf.uuid}-${asgn.projectorUuid}`} pointerEvents="none">
                  <polygon points={`${px},${py} ${sL},${sY} ${sR},${sY}`}
                    fill="rgba(245,200,60,0.07)" stroke="rgba(245,200,60,0.2)" strokeWidth="0.8" />
                  <circle cx={px} cy={py} r={5} fill="#f0c030" stroke="#d4a820" strokeWidth="1" />
                  <text x={px} y={py - 7} textAnchor="middle" fontSize={9} fill="#f0c030">{proj.id}</text>
                </g>
              )];
            })
          )}
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
            <span>Screen (drag to reposition)</span>
          </div>
        )}
        {surfaces.some(s => (s.projectorAssignments ?? []).length > 0) && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#f0c030', border: '1px solid #d4a820' }} />
            <span>Projector (requires throw distance)</span>
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

  // ── Surfaces state ────────────────────────────────────────────────────────
  const [localSurfaces, setLocalSurfaces]         = useState<ProjectionSurface[]>([]);
  const [selectedSurfaceId, setSelectedSurfaceId] = useState<string | null>(null);
  const [surfaceModalOpen, setSurfaceModalOpen]   = useState(false);
  const [editingSurface, setEditingSurface]       = useState<ProjectionSurface | null>(null);

  // Clear selection if the selected surface is removed
  useEffect(() => {
    if (selectedSurfaceId && !localSurfaces.find(s => s.uuid === selectedSurfaceId)) {
      setSelectedSurfaceId(null);
    }
  }, [localSurfaces, selectedSurfaceId]);

  const handleSurfaceMove = useCallback(async (uuid: string, xM: number, yM: number) => {
    setLocalSurfaces(prev => prev.map(s => s.uuid === uuid ? { ...s, posDsXM: xM, posDsYM: yM } : s));
    const surf = localSurfaces.find(s => s.uuid === uuid);
    if (surf) {
      await projectionSurfaceAPI.updateSurface(uuid, { posDsXM: xM, posDsYM: yM, version: surf.version });
    }
  }, [localSurfaces, projectionSurfaceAPI]);

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
        setLocalSurfaces(prev =>
          prev.some(s => s.uuid === event.entity.uuid) ? prev : [...prev, event.entity]
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
        setLocalSurfaces(prev =>
          prev.map(s => s.uuid === event.entity.uuid ? event.entity : s)
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
              <Card
                key={proj.uuid}
                className={`p-4 transition-colors cursor-pointer select-none ${
                  dragOverIndex === index ? 'border-av-accent/60 bg-av-accent/5' : 'hover:border-av-accent/30'
                } ${draggedIndex === index ? 'opacity-50' : ''}`}
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
                {localSurfaces.reduce((n, s) => n + (s.projectorAssignments?.length || 0), 0)}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-av-text-muted mb-1">Total Lumens</p>
              <p className="text-3xl font-bold text-av-accent">
                {(() => {
                  const total = localSurfaces.reduce((sum, surf) => {
                    return sum + (surf.projectorAssignments || []).reduce((s2, a) => {
                      const proj = localProjectors.find(p => p.uuid === a.projectorUuid);
                      const spec = proj?.equipmentUuid ? equipmentSpecs.find(e => e.uuid === proj.equipmentUuid) : null;
                      return s2 + (spec?.specs?.lumens || 0);
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
                const assignedProjs = (surf.projectorAssignments || []).map(a => {
                  const proj = localProjectors.find(p => p.uuid === a.projectorUuid);
                  const spec = proj?.equipmentUuid ? equipmentSpecs.find(e => e.uuid === proj.equipmentUuid) : null;
                  return { proj, spec };
                });
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

                return (
                  <Card
                    key={surf.uuid}
                    className={`p-4 cursor-pointer transition-colors ${isSelected ? 'ring-1 ring-emerald-500/40 bg-emerald-500/5' : ''}`}
                    onClick={() => setSelectedSurfaceId(isSelected ? null : surf.uuid)}
                  >
                    <div className="flex items-start justify-between">
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
                          </div>
                          {assignedProjs.length > 0 && (
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {assignedProjs.map(({ proj, spec }, i) => proj ? (
                                <span key={i} className="text-xs px-2 py-0.5 rounded bg-av-surface-light border border-av-border text-av-text-muted">
                                  {proj.id}{spec ? ` · ${spec.manufacturer} ${spec.model}` : ''}
                                </span>
                              ) : null)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <button
                          onClick={() => { setEditingSurface(surf); setSurfaceModalOpen(true); }}
                          className="btn-secondary text-xs flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={async () => {
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
                  </Card>
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
          selectedSurfaceId={selectedSurfaceId}
          onSelectSurface={setSelectedSurfaceId}
          onSurfaceMove={handleSurfaceMove}
          onGoToStaging={() => setActiveTab('staging')}
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
