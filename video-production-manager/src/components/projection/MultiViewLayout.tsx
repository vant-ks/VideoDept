/**
 * MultiViewLayout — quad-panel 3D projection canvas.
 *
 * Four synchronized views arranged in a 2×2 grid with a right-side inspector:
 *   ┌─────────────┬─────────────┐  ┌──────────┐
 *   │  TOP (X-Y)  │ FRONT (X-Z) │  │          │
 *   │             │             │  │ INSPECTOR│
 *   ├─────────────┼─────────────┤  │          │
 *   │  SIDE (Y-Z) │   BLEND     │  │          │
 *   │             │             │  │          │
 *   └─────────────┴─────────────┘  └──────────┘
 *
 * Props mirror the existing LayoutTab so swapping is straight-forward.
 * The existing LayoutTab is kept intact — MultiViewLayout coexists with it.
 */

import React, { useState, useCallback } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
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
import type { SelectedEntity, ViewId, ViewCanvasProps } from './viewTypes';

// ── Props (superset of LayoutTab props) ──────────────────────────────────────
interface MultiViewLayoutProps {
  venueData: VenueData;
  surfaces: ProjectionSurface[];
  projectors: ProjectionScreen[];
  equipmentSpecs: any[];
  ledWalls: LEDScreen[];
  // Callbacks for all entity mutations
  onSurfacePatch: (uuid: string, patch: Partial<ProjectionSurface>) => void;
  onPositionPatch: (surfaceUuid: string, posId: string, patch: Partial<ProjectorPosition>) => void;
  onLEDWallPatch: (uuid: string, xM: number, yM: number) => void;
  onMattePatch?: (surfaceUuid: string, matteId: string, patch: Partial<SurfaceMatte>) => void;
}

// ── ViewPane: titled panel wrapper ───────────────────────────────────────────
const VIEW_LABELS: Record<ViewId, string> = {
  top:   'Top  (X–Y)',
  side:  'Side  (Y–Z)',
  front: 'Front  (X–Z)',
  blend: 'Blend',
};

function ViewPane({
  id, maximized, onMaximize, children,
}: {
  id: ViewId;
  maximized: ViewId | null;
  onMaximize: (id: ViewId | null) => void;
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
      {/* Panel header */}
      <div className="flex items-center justify-between px-2 py-1 bg-av-surface/60 border-b border-av-border/30 flex-shrink-0">
        <span className="text-[10px] font-semibold text-av-text-muted uppercase tracking-wider">
          {VIEW_LABELS[id]}
        </span>
        <button
          onClick={() => onMaximize(isMax ? null : id)}
          className="p-0.5 rounded hover:bg-av-border/30 text-av-text-muted hover:text-av-text transition-colors"
          title={isMax ? 'Restore' : 'Maximize'}
        >
          {isMax
            ? <Minimize2 className="w-3 h-3" />
            : <Maximize2 className="w-3 h-3" />
          }
        </button>
      </div>
      {/* Canvas fills remaining space */}
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
  const [selected, setSelected] = useState<SelectedEntity>(null);
  const [snapInches, setSnapInches] = useState(3);
  const [maximized, setMaximized] = useState<ViewId | null>(null);

  // ── Shared canvas props factory ───────────────────────────────────────────
  const canvasProps: ViewCanvasProps = {
    venueData,
    surfaces,
    projectors,
    equipmentSpecs,
    ledWalls,
    snapInches,
    selected,
    onSelect: setSelected,
    onSurfacePatch,
    onPositionPatch,
    onLEDWallPatch,
    onMattePatch,
  };

  return (
    <div className="flex gap-3" style={{ height: 'calc(100vh - 220px)', minHeight: 520 }}>

      {/* ── Canvas grid ─────────────────────────────────────────────────── */}
      <div className={cn(
        'flex-1 grid gap-2 min-w-0',
        maximized
          ? 'grid-cols-1 grid-rows-1'
          : 'grid-cols-2 grid-rows-2',
      )}>
        <ViewPane id="top"   maximized={maximized} onMaximize={setMaximized}>
          <TopViewCanvas   {...canvasProps} />
        </ViewPane>
        <ViewPane id="front" maximized={maximized} onMaximize={setMaximized}>
          <FrontViewCanvas {...canvasProps} />
        </ViewPane>
        <ViewPane id="side"  maximized={maximized} onMaximize={setMaximized}>
          <SideViewCanvas  {...canvasProps} />
        </ViewPane>
        <ViewPane id="blend" maximized={maximized} onMaximize={setMaximized}>
          <BlendViewCanvas {...canvasProps} />
        </ViewPane>
      </div>

      {/* ── Right panel: inspector + toolbar ─────────────────────────── */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-2">

        {/* Snap toolbar */}
        <div className="flex items-center gap-2 px-2 py-1.5 bg-av-surface border border-av-border/40 rounded">
          <span className="text-[10px] text-av-text-muted">Snap</span>
          <div className="flex gap-1">
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
        </div>

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
            <button onClick={() => setSelected(null)}
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
            <span>Screen — drag in any view</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#f0c030', border: '1px solid #d4a820' }} />
            <span>Projector position</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded" style={{ background: 'rgba(20,184,166,0.2)', border: '1px solid #0d9488' }} />
            <span>LED wall</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded" style={{ background: 'rgba(255,255,150,0.15)', border: '1px solid rgba(255,255,150,0.5)' }} />
            <span>Matte (front view)</span>
          </div>
          <div className="mt-0.5 text-av-text-muted/60">
            Scroll = zoom · mid-drag = pan
          </div>
        </div>
      </div>
    </div>
  );
};
