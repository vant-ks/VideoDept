/**
 * MultiViewLayout — quad-panel 3D projection canvas.
 *
 * Four synchronized views in a 2×2 grid with a right-side inspector:
 *   ┌─────────────┬─────────────┐  ┌──────────┐
 *   │  TOP (X-Y)  │ FRONT (X-Z) │  │          │
 *   │             │             │  │ INSPECTOR│
 *   ├─────────────┼─────────────┤  │          │
 *   │  SIDE (Y-Z) │   BLEND     │  │          │
 *   │             │             │  │          │
 *   └─────────────┴─────────────┘  └──────────┘
 *
 * Top toolbar: snap grid | alignment ops | selection count
 */

import React, { useState, useCallback, useRef } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { SNAP_INCH_OPTIONS } from '@/components/VenueCanvasUtils';
import type { VenueData } from '@/hooks/useVenueStore';
import type { ProjectionSurface, ProjectorPosition, SurfaceMatte } from '@/hooks/useProjectionSurfaceAPI';
import type { ProjectionScreen } from '@/hooks/useProjectionScreenAPI';
import type { LEDScreen } from '@/hooks/useLEDScreenAPI';

import { TopViewCanvas }   from './views/TopViewCanvas';
import { SideViewCanvas }  from './views/SideViewCanvas';
import { FrontViewCanvas } from './views/FrontViewCanvas';
import { BlendViewCanvas } from './views/BlendViewCanvas';
import { InspectorPanel }  from './InspectorPanel';
import type { SelectedEntity, ViewId, ViewCanvasProps, ViewControls, AlignMode, AnchorPoint } from './viewTypes';

// ── Props ────────────────────────────────────────────────────────────────────
interface MultiViewLayoutProps {
  venueData: VenueData;
  surfaces: ProjectionSurface[];
  projectors: ProjectionScreen[];
  equipmentSpecs: any[];
  ledWalls: LEDScreen[];
  onSurfacePatch: (uuid: string, patch: Partial<ProjectionSurface>) => void;
  onPositionPatch: (surfaceUuid: string, posId: string, patch: Partial<ProjectorPosition>) => void;
  onLEDWallPatch: (uuid: string, xM: number, yM: number) => void;
  onMattePatch?: (surfaceUuid: string, matteId: string, patch: Partial<SurfaceMatte>) => void;
}

// ── Alignment helpers ─────────────────────────────────────────────────────────
function alignObjects(
  surfaces: ProjectionSurface[],
  ledWalls: LEDScreen[],
  selectionSet: ReadonlySet<string>,
  mode: AlignMode,
  onSurfacePatch: (uuid: string, patch: Partial<ProjectionSurface>) => void,
  onLEDWallPatch: (uuid: string, x: number, y: number) => void,
) {
  type Item = { uuid: string; cx: number; cy: number; halfW: number; kind: 'surface' | 'ledwall' };
  const items: Item[] = [];
  selectionSet.forEach(uuid => {
    const s = surfaces.find(x => x.uuid === uuid);
    if (s) { items.push({ uuid, cx: s.posDsXM ?? 0, cy: s.posDsYM ?? 0, halfW: (s.widthM ?? 0) / 2, kind: 'surface' }); return; }
    const w = ledWalls.find(x => x.uuid === uuid);
    if (w) { items.push({ uuid, cx: w.posDsXM ?? 0, cy: w.posDsYM ?? 0, halfW: 0, kind: 'ledwall' }); }
  });
  if (items.length < 2) return;
  const apply = (it: Item, newCX: number, newCY: number) =>
    it.kind === 'surface' ? onSurfacePatch(it.uuid, { posDsXM: newCX, posDsYM: newCY }) : onLEDWallPatch(it.uuid, newCX, newCY);
  switch (mode) {
    case 'left':     { const t = Math.min(...items.map(i => i.cx - i.halfW)); items.forEach(i => apply(i, t + i.halfW, i.cy)); break; }
    case 'centerH':  { const t = items.reduce((a,i) => a + i.cx, 0) / items.length; items.forEach(i => apply(i, t, i.cy)); break; }
    case 'right':    { const t = Math.max(...items.map(i => i.cx + i.halfW)); items.forEach(i => apply(i, t - i.halfW, i.cy)); break; }
    case 'top':      { const t = Math.max(...items.map(i => i.cy)); items.forEach(i => apply(i, i.cx, t)); break; }
    case 'centerV':  { const t = items.reduce((a,i) => a + i.cy, 0) / items.length; items.forEach(i => apply(i, i.cx, t)); break; }
    case 'bottom':   { const t = Math.min(...items.map(i => i.cy)); items.forEach(i => apply(i, i.cx, t)); break; }
    case 'distributeH': {
      const s = [...items].sort((a,b) => a.cx - b.cx); if (s.length < 3) return;
      const step = (s[s.length-1].cx - s[0].cx) / (s.length - 1);
      s.forEach((it,i) => apply(it, s[0].cx + i*step, it.cy)); break;
    }
    case 'distributeV': {
      const s = [...items].sort((a,b) => a.cy - b.cy); if (s.length < 3) return;
      const step = (s[s.length-1].cy - s[0].cy) / (s.length - 1);
      s.forEach((it,i) => apply(it, it.cx, s[0].cy + i*step)); break;
    }
  }
}

// ── Alignment icon (inline SVG, 14×14) ───────────────────────────────────────
function AlignIcon({ mode }: { mode: AlignMode }) {
  const s = { fill: 'currentColor' };
  switch (mode) {
    case 'left':        return <svg viewBox="0 0 14 14" width={14} height={14}><rect x={0} y={0} width={1.5} height={14} {...s}/><rect x={3} y={2} width={6} height={2.5} rx={0.5} {...s}/><rect x={3} y={6.5} width={9} height={2.5} rx={0.5} {...s}/><rect x={3} y={11} width={7} height={2.5} rx={0.5} {...s}/></svg>;
    case 'centerH':     return <svg viewBox="0 0 14 14" width={14} height={14}><rect x={6.25} y={0} width={1.5} height={14} {...s}/><rect x={2.5} y={2} width={9} height={2.5} rx={0.5} {...s}/><rect x={1} y={6.5} width={12} height={2.5} rx={0.5} {...s}/><rect x={3} y={11} width={8} height={2.5} rx={0.5} {...s}/></svg>;
    case 'right':       return <svg viewBox="0 0 14 14" width={14} height={14}><rect x={12.5} y={0} width={1.5} height={14} {...s}/><rect x={4.5} y={2} width={8} height={2.5} rx={0.5} {...s}/><rect x={2} y={6.5} width={10.5} height={2.5} rx={0.5} {...s}/><rect x={3.5} y={11} width={9} height={2.5} rx={0.5} {...s}/></svg>;
    case 'top':         return <svg viewBox="0 0 14 14" width={14} height={14}><rect x={0} y={0} width={14} height={1.5} {...s}/><rect x={2} y={3} width={2.5} height={6} rx={0.5} {...s}/><rect x={6.5} y={3} width={2.5} height={9} rx={0.5} {...s}/><rect x={11} y={3} width={2.5} height={7} rx={0.5} {...s}/></svg>;
    case 'centerV':     return <svg viewBox="0 0 14 14" width={14} height={14}><rect x={0} y={6.25} width={14} height={1.5} {...s}/><rect x={2} y={1.5} width={2.5} height={11} rx={0.5} {...s}/><rect x={6.5} y={3} width={2.5} height={8} rx={0.5} {...s}/><rect x={11} y={2} width={2.5} height={10} rx={0.5} {...s}/></svg>;
    case 'bottom':      return <svg viewBox="0 0 14 14" width={14} height={14}><rect x={0} y={12.5} width={14} height={1.5} {...s}/><rect x={2} y={4.5} width={2.5} height={8} rx={0.5} {...s}/><rect x={6.5} y={2} width={2.5} height={10.5} rx={0.5} {...s}/><rect x={11} y={3.5} width={2.5} height={9} rx={0.5} {...s}/></svg>;
    case 'distributeH': return <svg viewBox="0 0 14 14" width={14} height={14}><rect x={0} y={0} width={1.5} height={14} {...s}/><rect x={12.5} y={0} width={1.5} height={14} {...s}/><rect x={6.25} y={0} width={1.5} height={14} opacity={0.4} {...s}/><rect x={3} y={4} width={2.5} height={6} rx={0.5} {...s}/><rect x={9} y={4} width={2.5} height={6} rx={0.5} {...s}/></svg>;
    case 'distributeV': return <svg viewBox="0 0 14 14" width={14} height={14}><rect x={0} y={0} width={14} height={1.5} {...s}/><rect x={0} y={12.5} width={14} height={1.5} {...s}/><rect x={0} y={6.25} width={14} height={1.5} opacity={0.4} {...s}/><rect x={4} y={3} width={6} height={2.5} rx={0.5} {...s}/><rect x={4} y={9} width={6} height={2.5} rx={0.5} {...s}/></svg>;
    default: return null;
  }
}

// ── ViewPane: titled panel with per-view toolbar ──────────────────────────────
const VIEW_LABELS: Record<ViewId, string> = {
  top:   'Top  (X–Y)',
  side:  'Side  (Y–Z)',
  front: 'Front  (X–Z)',
  blend: 'Blend',
};

function ViewPane({
  id, maximized, onMaximize, controlsRef, children,
}: {
  id: ViewId;
  maximized: ViewId | null;
  onMaximize: (id: ViewId | null) => void;
  controlsRef: React.MutableRefObject<ViewControls | null>;
  children: React.ReactNode;
}) {
  const isMax = maximized === id;
  const isHidden = maximized !== null && !isMax;
  if (isHidden) return null;

  return (
    <div className={cn(
      'flex flex-col rounded border border-av-border/40 overflow-hidden bg-[#0d1520]',
      isMax ? 'col-span-2 row-span-2' : '',
    )}>
      {/* Panel header — label on left, per-view toolbar on right */}
      <div className="flex items-center justify-between px-2 py-1 bg-av-surface/60 border-b border-av-border/30 flex-shrink-0">
        <span className="text-[10px] font-semibold text-av-text-muted uppercase tracking-wider">
          {VIEW_LABELS[id]}
        </span>
        <div className="flex items-center gap-0.5">
          {/* Zoom out */}
          <button
            onClick={() => controlsRef.current?.zoomOut()}
            className="p-0.5 rounded hover:bg-av-border/30 text-av-text-muted hover:text-av-text transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          {/* Zoom in */}
          <button
            onClick={() => controlsRef.current?.zoomIn()}
            className="p-0.5 rounded hover:bg-av-border/30 text-av-text-muted hover:text-av-text transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          {/* Fit to content */}
          <button
            onClick={() => controlsRef.current?.fitToContent()}
            className="p-0.5 rounded hover:bg-av-border/30 text-av-text-muted hover:text-av-text transition-colors"
            title="Fit to Content"
          >
            <Maximize className="w-3 h-3" />
          </button>
          {/* Maximize / restore */}
          <button
            onClick={() => onMaximize(isMax ? null : id)}
            className="p-0.5 rounded hover:bg-av-border/30 text-av-text-muted hover:text-av-text transition-colors ml-0.5"
            title={isMax ? 'Restore' : 'Maximize'}
          >
            {isMax ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export const MultiViewLayout: React.FC<MultiViewLayoutProps> = ({
  venueData, surfaces, projectors, equipmentSpecs, ledWalls,
  onSurfacePatch, onPositionPatch, onLEDWallPatch, onMattePatch,
}) => {
  // ── Selection ──────────────────────────────────────────────────────────────
  const [selected, setSelected]       = useState<SelectedEntity>(null);
  const [selectionSet, setSelectionSet] = useState<Set<string>>(new Set());

  const handleSelect = useCallback((entity: SelectedEntity, additive: boolean) => {
    if (!additive || entity === null) {
      // Non-additive: replace selection
      setSelected(entity);
      setSelectionSet(entity && (entity.kind === 'surface' || entity.kind === 'ledwall')
        ? new Set([entity.kind === 'surface' ? entity.surfaceUuid : (entity as any).uuid])
        : new Set());
    } else {
      // Additive (Shift): toggle in set, update primary
      const uuid = entity.kind === 'surface' ? entity.surfaceUuid
        : entity.kind === 'ledwall'  ? (entity as any).uuid
        : null;
      if (!uuid) { setSelected(entity); return; }
      setSelectionSet(prev => {
        const next = new Set(prev);
        if (next.has(uuid)) { next.delete(uuid); } else { next.add(uuid); }
        return next;
      });
      setSelected(entity);
    }
  }, []);

  const handleBoxSelect = useCallback((uuids: string[]) => {
    if (uuids.length === 0) { setSelected(null); setSelectionSet(new Set()); return; }
    setSelectionSet(new Set(uuids));
    // Set primary to first matched surface, then first LED wall
    const firstSurf = surfaces.find(s => uuids.includes(s.uuid));
    if (firstSurf) { setSelected({ kind: 'surface', surfaceUuid: firstSurf.uuid }); return; }
    const firstWall = ledWalls.find(w => uuids.includes(w.uuid));
    if (firstWall) { setSelected({ kind: 'ledwall', uuid: firstWall.uuid }); }
  }, [surfaces, ledWalls]);

  // ── Per-view controls refs ─────────────────────────────────────────────────
  const ctrlTop   = useRef<ViewControls | null>(null);
  const ctrlFront = useRef<ViewControls | null>(null);
  const ctrlSide  = useRef<ViewControls | null>(null);
  const ctrlBlend = useRef<ViewControls | null>(null);

  // ── Layout state ───────────────────────────────────────────────────────────
  const [snapInches, setSnapInches] = useState(3);
  const [maximized, setMaximized]   = useState<ViewId | null>(null);
  const [anchorPoint, setAnchorPoint] = useState<AnchorPoint>('center');

  // ── Shared canvas props factory ────────────────────────────────────────────
  const baseCanvasProps = {
    venueData, surfaces, projectors, equipmentSpecs, ledWalls,
    snapInches,
    selected,
    onSelect: handleSelect,
    selectionSet,
    onBoxSelect: handleBoxSelect,
    onSurfacePatch,
    onPositionPatch,
    onLEDWallPatch,
    onMattePatch,
  } satisfies Omit<ViewCanvasProps, 'controlsRef'>;

  // ── Alignment helper ───────────────────────────────────────────────────────
  const handleAlign = (mode: AlignMode) =>
    alignObjects(surfaces, ledWalls, selectionSet, mode, onSurfacePatch, onLEDWallPatch);

  const canAlign  = selectionSet.size >= 2;
  const canDistrib = selectionSet.size >= 3;

  const alignBtn = (mode: AlignMode, title: string, disabled = !canAlign) => (
    <button
      key={mode}
      onClick={() => handleAlign(mode)}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1 rounded transition-colors',
        disabled
          ? 'text-av-text-muted/30 cursor-not-allowed'
          : 'text-av-text-muted hover:text-av-text hover:bg-av-border/30',
      )}
    >
      <AlignIcon mode={mode} />
    </button>
  );

  return (
    <div className="flex flex-col gap-2" style={{ height: 'calc(100vh - 220px)', minHeight: 520 }}>

      {/* ── Top toolbar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-2 py-1.5 bg-av-surface border border-av-border/40 rounded flex-shrink-0 flex-wrap">

        {/* Snap grid */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-av-text-muted">Snap</span>
          {SNAP_INCH_OPTIONS.map(v => (
            <button
              key={v}
              onClick={() => setSnapInches(v)}
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded border transition-colors',
                snapInches === v
                  ? 'border-av-accent/50 text-av-accent bg-av-accent/10'
                  : 'border-av-border/60 text-av-text-muted hover:border-av-accent/40',
              )}
            >
              {v < 12 ? `${v}"` : `${v / 12}'`}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-av-border/40 flex-shrink-0" />

        {/* Align group: X axis */}
        <div className="flex items-center gap-0">
          <span className="text-[9px] text-av-text-muted mr-1 select-none">X</span>
          {alignBtn('left',    'Align left edges')}
          {alignBtn('centerH', 'Align centers (H)')}
          {alignBtn('right',   'Align right edges')}
          {alignBtn('distributeH', 'Distribute horizontally', !canDistrib)}
        </div>

        <div className="w-px h-4 bg-av-border/40 flex-shrink-0" />

        {/* Align group: Y axis */}
        <div className="flex items-center gap-0">
          <span className="text-[9px] text-av-text-muted mr-1 select-none">Y</span>
          {alignBtn('top',     'Align upstage edges')}
          {alignBtn('centerV', 'Align centers (V)')}
          {alignBtn('bottom',  'Align downstage edges')}
          {alignBtn('distributeV', 'Distribute vertically', !canDistrib)}
        </div>

        {/* Selection count */}
        {selectionSet.size > 0 && (
          <>
            <div className="w-px h-4 bg-av-border/40 flex-shrink-0" />
            <span className="text-[10px] text-av-accent">
              {selectionSet.size} selected
            </span>
            <button
              onClick={() => { setSelected(null); setSelectionSet(new Set()); }}
              className="text-[10px] text-av-text-muted hover:text-av-text"
              title="Clear selection"
            >×</button>
          </>
        )}
      </div>

      {/* ── Canvas grid + inspector ──────────────────────────────────────── */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* Canvas grid */}
        <div className={cn(
          'flex-1 grid gap-2 min-w-0',
          maximized ? 'grid-cols-1 grid-rows-1' : 'grid-cols-2 grid-rows-2',
        )}>
          <ViewPane id="top"   maximized={maximized} onMaximize={setMaximized} controlsRef={ctrlTop}>
            <TopViewCanvas   {...baseCanvasProps} controlsRef={ctrlTop} />
          </ViewPane>
          <ViewPane id="front" maximized={maximized} onMaximize={setMaximized} controlsRef={ctrlFront}>
            <FrontViewCanvas {...baseCanvasProps} controlsRef={ctrlFront} />
          </ViewPane>
          <ViewPane id="side"  maximized={maximized} onMaximize={setMaximized} controlsRef={ctrlSide}>
            <SideViewCanvas  {...baseCanvasProps} controlsRef={ctrlSide} />
          </ViewPane>
          <ViewPane id="blend" maximized={maximized} onMaximize={setMaximized} controlsRef={ctrlBlend}>
            <BlendViewCanvas {...baseCanvasProps} controlsRef={ctrlBlend} />
          </ViewPane>
        </div>

        {/* Right panel */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-2">

          {/* Selection breadcrumb */}
          {selected && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-av-accent/8 border border-av-accent/20 rounded text-[10px]">
              <span className="text-av-text-muted capitalize">{selected.kind}</span>
              <span className="text-av-text-muted">›</span>
              <span className="text-av-accent font-medium truncate">
                {selected.kind === 'surface' && surfaces.find(s => s.uuid === selected.surfaceUuid)?.name}
                {selected.kind === 'position' && (() => {
                  const surf = surfaces.find(s => s.uuid === selected.surfaceUuid);
                  const pos  = surf?.projectorAssignments?.find(p => p.id === selected.positionId);
                  return `${surf?.name} / ${pos?.label}`;
                })()}
                {selected.kind === 'matte' && 'Matte'}
                {selected.kind === 'ledwall' && ledWalls.find(w => w.uuid === selected.uuid)?.name}
              </span>
              <button onClick={() => handleSelect(null, false)}
                className="ml-auto text-av-text-muted hover:text-av-text">×</button>
            </div>
          )}

          {/* Inspector panel */}
          <div className="flex-1 min-h-0 rounded border border-av-border/40 overflow-hidden">
            <InspectorPanel
              selected={selected}
              surfaces={surfaces}
              projectors={projectors}
              equipmentSpecs={equipmentSpecs}
              ledWalls={ledWalls}
              anchorPoint={anchorPoint}
              onAnchorChange={setAnchorPoint}
              onSurfacePatch={onSurfacePatch}
              onPositionPatch={onPositionPatch}
              onMattePatch={onMattePatch}
              onLEDWallPatch={onLEDWallPatch}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-1 px-2 py-1.5 bg-av-surface border border-av-border/40 rounded text-[9.5px] text-av-text-muted">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded" style={{ background: 'rgba(60,190,150,0.25)', border: '1px solid #30b890' }} />
              <span>Screen — drag · Shift+click = multi-select</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#f0c030', border: '1px solid #d4a820' }} />
              <span>Projector position</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded" style={{ background: 'rgba(20,184,166,0.2)', border: '1px solid #0d9488' }} />
              <span>LED wall</span>
            </div>
            <div className="mt-0.5 text-av-text-muted/60">
              Scroll = zoom · mid-drag = pan · drag bg = box select
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
