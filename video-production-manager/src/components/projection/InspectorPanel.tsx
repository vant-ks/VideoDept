/**
 * InspectorPanel — context-sensitive property editor.
 *
 * Switches content based on `selected` entity type:
 *   surface   → position, dimensions, surface type, gain
 *   position  → throw, offsets, mount height + derived stats (lens shift, coverage)
 *   matte     → image-space offset + size
 *   ledwall   → position, tile grid info
 *   null      → "nothing selected" hint
 *
 * All edits save on blur (Enter or focus-leave), consistent with
 * form patterns used elsewhere in VideoDept.
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/utils/helpers';
import { derivePositionStats } from './shared/objectRelations';
import type { SelectedEntity } from './viewTypes';
import type { ProjectionSurface, ProjectorPosition, SurfaceMatte } from '@/hooks/useProjectionSurfaceAPI';
import type { ProjectionScreen } from '@/hooks/useProjectionScreenAPI';
import type { LEDScreen } from '@/hooks/useLEDScreenAPI';

interface Props {
  selected: SelectedEntity;
  surfaces: ProjectionSurface[];
  projectors: ProjectionScreen[];
  equipmentSpecs: any[];
  ledWalls: LEDScreen[];
  onSurfacePatch: (uuid: string, patch: Partial<ProjectionSurface>) => void;
  onPositionPatch: (surfaceUuid: string, posId: string, patch: Partial<ProjectorPosition>) => void;
  onMattePatch?: (surfaceUuid: string, matteId: string, patch: Partial<SurfaceMatte>) => void;
  onLEDWallPatch: (uuid: string, xM: number, yM: number) => void;
}

// ── Small field components ────────────────────────────────────────────────────
function InspField({
  label, value, unit = '', readOnly = false, step = 0.1,
  onChange,
}: {
  label: string;
  value: string | number;
  unit?: string;
  readOnly?: boolean;
  step?: number;
  onChange?: (v: string) => void;
}) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => setLocal(String(value)), [value]);

  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-2 items-center">
      <label className="text-[10px] text-av-text-muted truncate">{label}</label>
      <div className="flex items-center gap-1">
        {readOnly ? (
          <span className="text-xs text-av-text font-mono">{local}</span>
        ) : (
          <input
            type="number"
            step={step}
            value={local}
            onChange={e => setLocal(e.target.value)}
            onBlur={() => onChange?.(local)}
            onKeyDown={e => e.key === 'Enter' && onChange?.(local)}
            className="w-20 text-xs text-right bg-av-surface border border-av-border/60 rounded px-1.5 py-0.5 text-av-text focus:outline-none focus:border-av-accent/60 font-mono"
          />
        )}
        {unit && <span className="text-[10px] text-av-text-muted w-6">{unit}</span>}
      </div>
    </div>
  );
}

function InspTextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-av-text-muted">{label}</span>
      <span className="text-xs text-av-text font-mono">{value}</span>
    </div>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <p className="text-[10px] font-semibold text-av-text-muted uppercase tracking-wider mt-3 mb-1 first:mt-0">
      {title}
    </p>
  );
}

function DivRow() {
  return <div className="border-t border-av-border/30 my-2" />;
}

// ── Surface inspector ─────────────────────────────────────────────────────────
function SurfaceInspector({ surf, onPatch }: {
  surf: ProjectionSurface;
  onPatch: (patch: Partial<ProjectionSurface>) => void;
}) {
  const p = (field: keyof ProjectionSurface) => (v: string) =>
    onPatch({ [field]: parseFloat(v) || 0 } as any);

  return (
    <div className="space-y-1.5">
      <SectionHead title="Position" />
      <InspField label="X (SR+)" value={(surf.posDsXM ?? 0).toFixed(3)} unit="m" step={0.05} onChange={v => onPatch({ posDsXM: parseFloat(v) || 0 })} />
      <InspField label="Y (upstage+)" value={(surf.posDsYM ?? 0).toFixed(3)} unit="m" step={0.1} onChange={v => onPatch({ posDsYM: parseFloat(v) || 0 })} />
      <InspField label="Floor to bot" value={(surf.distFloorM ?? 0).toFixed(3)} unit="m" step={0.05} onChange={v => onPatch({ distFloorM: parseFloat(v) || 0 })} />

      <DivRow />
      <SectionHead title="Image Area" />
      <InspField label="Width" value={(surf.widthM ?? 0).toFixed(3)} unit="m" step={0.1} onChange={v => onPatch({ widthM: parseFloat(v) || 0 })} />
      <InspField label="Height" value={(surf.heightM ?? 0).toFixed(3)} unit="m" step={0.1} onChange={v => onPatch({ heightM: parseFloat(v) || 0 })} />
      {surf.widthM && surf.heightM && (
        <InspTextRow label="Aspect" value={`${(surf.widthM / surf.heightM).toFixed(4)} : 1`} />
      )}

      <DivRow />
      <SectionHead title="Properties" />
      <div className="grid grid-cols-[1fr_auto] gap-x-2 items-center">
        <label className="text-[10px] text-av-text-muted">Type</label>
        <select
          value={surf.surfaceType ?? 'FRONT'}
          onChange={e => onPatch({ surfaceType: e.target.value as any })}
          className="text-xs bg-av-surface border border-av-border/60 rounded px-1.5 py-0.5 text-av-text focus:outline-none"
        >
          {['FRONT', 'REAR', 'DUAL_VISION', 'MAPPED'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <InspField label="Gain factor" value={(surf.gainFactor ?? 1).toFixed(2)} step={0.05} onChange={v => onPatch({ gainFactor: parseFloat(v) || 1 })} />
      <InspField label="Ambient lux" value={(surf.ambientLux ?? 0).toFixed(0)} step={10} onChange={v => onPatch({ ambientLux: parseInt(v) || 0 })} />

      {surf.projectorAssignments && surf.projectorAssignments.length > 0 && (
        <>
          <DivRow />
          <SectionHead title="Positions" />
          {surf.projectorAssignments.map(pos => (
            <InspTextRow key={pos.id} label={pos.label}
              value={pos.throwDistM ? `${pos.throwDistM.toFixed(1)} m` : '—'} />
          ))}
        </>
      )}
    </div>
  );
}

// ── Position inspector ────────────────────────────────────────────────────────
function PositionInspector({ surf, pos, projectors, equipmentSpecs, onPatch }: {
  surf: ProjectionSurface;
  pos: ProjectorPosition;
  projectors: ProjectionScreen[];
  equipmentSpecs: any[];
  onPatch: (patch: Partial<ProjectorPosition>) => void;
}) {
  const firstUnit = pos.stackedUnits[0];
  const proj0 = firstUnit ? projectors.find(p => p.uuid === firstUnit.projectorUuid) : null;
  const spec0 = proj0?.equipmentUuid ? equipmentSpecs.find(s => s.uuid === proj0.equipmentUuid) : null;
  const throwRatio: number | undefined =
    spec0?.specs?.throwRatio ?? spec0?.specs?.throwRatioMin ?? undefined;
  const mountH = (pos as any).mountHeightM;

  const stats = derivePositionStats(pos, surf, throwRatio);

  return (
    <div className="space-y-1.5">
      <SectionHead title="Throw" />
      <InspField label="Throw dist" value={(pos.throwDistM ?? 0).toFixed(3)} unit="m" step={0.1}
        onChange={v => onPatch({ throwDistM: parseFloat(v) || undefined })} />
      <InspField label="H offset" value={(pos.horizOffsetM ?? 0).toFixed(3)} unit="m" step={0.05}
        onChange={v => onPatch({ horizOffsetM: parseFloat(v) || 0 })} />
      <InspField label="V offset" value={(pos.vertOffsetM ?? 0).toFixed(3)} unit="m" step={0.05}
        onChange={v => onPatch({ vertOffsetM: parseFloat(v) || 0 })} />
      <InspField label="Mount height" value={(mountH ?? 0).toFixed(3)} unit="m" step={0.05}
        onChange={v => onPatch({ ...pos, mountHeightM: parseFloat(v) || 0 } as any)} />

      <DivRow />
      <SectionHead title="Derived" />
      <InspTextRow label="True 3D throw" value={`${stats.actualThrow3D.toFixed(2)} m`} />
      <InspTextRow label="H lens shift"  value={`${(stats.lensShift.horizontal * 100).toFixed(1)} %`} />
      <InspTextRow label="V lens shift"  value={`${(stats.lensShift.vertical   * 100).toFixed(1)} %`} />
      {stats.coverage && (
        <>
          <InspTextRow label="Coverage"
            value={`${(stats.coverage.coverageFraction * 100).toFixed(1)} %`} />
          <InspTextRow label="Proj width"
            value={`${stats.coverage.projCoverageM.toFixed(2)} m`} />
          {!stats.coverage.isSufficient && (
            <p className="text-[10px] text-amber-400 mt-1">⚠ Single projector insufficient — consider blend</p>
          )}
        </>
      )}
      {throwRatio && (
        <InspTextRow label="Throw ratio" value={`${throwRatio.toFixed(2)} : 1`} />
      )}

      <DivRow />
      <SectionHead title="Stacked Units" />
      {pos.stackedUnits.length === 0 && (
        <p className="text-[10px] text-av-text-muted/60 italic">No projectors assigned</p>
      )}
      {pos.stackedUnits.map((u, i) => {
        const p_ = projectors.find(pr => pr.uuid === u.projectorUuid);
        return (
          <InspTextRow key={i} label={`Unit ${i + 1}`}
            value={p_?.id ?? u.projectorUuid.slice(0, 8) + '…'} />
        );
      })}
    </div>
  );
}

// ── Matte inspector ───────────────────────────────────────────────────────────
function MatteInspector({ surf, matte, onPatch }: {
  surf: ProjectionSurface;
  matte: SurfaceMatte;
  onPatch: (patch: Partial<SurfaceMatte>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <SectionHead title="Matte — Image Space" />
      <p className="text-[10px] text-av-text-muted/70">X/Y from image top-left (meters)</p>
      <InspField label="X offset" value={matte.xM.toFixed(3)} unit="m" step={0.05}
        onChange={v => onPatch({ xM: Math.max(0, parseFloat(v) || 0) })} />
      <InspField label="Y offset" value={matte.yM.toFixed(3)} unit="m" step={0.05}
        onChange={v => onPatch({ yM: Math.max(0, parseFloat(v) || 0) })} />
      <InspField label="Width" value={matte.widthM.toFixed(3)} unit="m" step={0.05}
        onChange={v => onPatch({ widthM: Math.max(0.01, parseFloat(v) || 0) })} />
      <InspField label="Height" value={matte.heightM.toFixed(3)} unit="m" step={0.05}
        onChange={v => onPatch({ heightM: Math.max(0.01, parseFloat(v) || 0) })} />
      <DivRow />
      <InspTextRow label="Right edge" value={`${(matte.xM + matte.widthM).toFixed(3)} m`} />
      <InspTextRow label="Bottom edge" value={`${(matte.yM + matte.heightM).toFixed(3)} m`} />
      {surf.widthM && (
        <InspTextRow label="% of width"
          value={`${((matte.widthM / surf.widthM) * 100).toFixed(1)} %`} />
      )}
    </div>
  );
}

// ── LED Wall inspector ────────────────────────────────────────────────────────
function LEDWallInspector({ wall, onPatch }: {
  wall: LEDScreen;
  onPatch: (xM: number, yM: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <SectionHead title="Position" />
      <InspField label="X (SR+)" value={(wall.posDsXM ?? 0).toFixed(3)} unit="m" step={0.05}
        onChange={v => onPatch(parseFloat(v) || 0, wall.posDsYM ?? 0)} />
      <InspField label="Y (upstage+)" value={(wall.posDsYM ?? 0).toFixed(3)} unit="m" step={0.1}
        onChange={v => onPatch(wall.posDsXM ?? 0, parseFloat(v) || 0)} />
      <DivRow />
      <SectionHead title="Tile Grid" />
      <InspTextRow label="Columns" value={String(wall.tileGrid?.cols ?? 1)} />
      <InspTextRow label="Rows"    value={String(wall.tileGrid?.rows ?? 1)} />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export const InspectorPanel: React.FC<Props> = ({
  selected, surfaces, projectors, equipmentSpecs, ledWalls,
  onSurfacePatch, onPositionPatch, onMattePatch, onLEDWallPatch,
}) => {
  let heading = 'Inspector';
  let badge: string | null = null;
  let content: React.ReactNode = (
    <p className="text-xs text-av-text-muted/60 italic mt-4">
      Select a surface, projector position, matte, or LED wall in any view.
    </p>
  );

  if (selected?.kind === 'surface') {
    const surf = surfaces.find(s => s.uuid === selected.surfaceUuid);
    if (surf) {
      heading = surf.name;
      badge = 'Surface';
      content = (
        <SurfaceInspector
          surf={surf}
          onPatch={patch => onSurfacePatch(surf.uuid, patch)}
        />
      );
    }
  } else if (selected?.kind === 'position') {
    const surf = surfaces.find(s => s.uuid === selected.surfaceUuid);
    const pos  = surf?.projectorAssignments?.find(p => p.id === selected.positionId);
    if (surf && pos) {
      heading = pos.label;
      badge = 'Position';
      content = (
        <PositionInspector
          surf={surf} pos={pos}
          projectors={projectors} equipmentSpecs={equipmentSpecs}
          onPatch={patch => onPositionPatch(surf.uuid, pos.id, patch)}
        />
      );
    }
  } else if (selected?.kind === 'matte') {
    const surf  = surfaces.find(s => s.uuid === selected.surfaceUuid);
    const matte = surf?.mattes?.find(m => m.id === selected.matteId);
    if (surf && matte && onMattePatch) {
      heading = matte.label ?? 'Matte';
      badge = 'Matte';
      content = (
        <MatteInspector
          surf={surf} matte={matte}
          onPatch={patch => onMattePatch(surf.uuid, matte.id, patch)}
        />
      );
    }
  } else if (selected?.kind === 'ledwall') {
    const wall = ledWalls.find(w => w.uuid === selected.uuid);
    if (wall) {
      heading = wall.name;
      badge = 'LED Wall';
      content = (
        <LEDWallInspector
          wall={wall}
          onPatch={(xM, yM) => onLEDWallPatch(wall.uuid, xM, yM)}
        />
      );
    }
  }

  return (
    <div className="flex flex-col h-full bg-av-surface border-l border-av-border/40 select-none">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-av-border/40 flex-shrink-0">
        <span className="text-sm font-semibold text-av-text truncate flex-1">{heading}</span>
        {badge && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-av-accent/15 border border-av-accent/25 text-av-accent">
            {badge}
          </span>
        )}
      </div>
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 text-xs">
        {content}
      </div>
    </div>
  );
};
