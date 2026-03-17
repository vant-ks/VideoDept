/**
 * LedPlannerTab.tsx — Interactive LED Wall Grid Canvas
 * =====================================================
 * Planner sub-tab inside the LED page. Lets users assemble LED walls
 * cell by cell from the equipment library.
 *
 * Features:
 * - Wall selector dropdown (12 walls)
 * - Proportional SVG grid (cell sizes scale with tile physical mm dims)
 * - Click to paint cell with selected tile spec
 * - Void mode: click occupied cell to clear it
 * - +/- buttons to add/remove columns and rows
 * - Right panel live stats (panels, pixels, weight, power, loading %)
 * - Chain routing overlay (routeChains via LedWallPlanner math)
 *
 * Ported math from: imports/_unpack/led_visualizer/LedWallPlanner.jsx
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Minus, ZapOff } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useLedEquipment, type LedPanelSpec } from '@/hooks/useLedEquipment';
import type { LEDScreen, TileGrid, TileCell } from '@/hooks/useLEDScreenAPI';
import type { EquipmentSpec } from '@/types';

// ── Chain colors (mirrors LedWallPlanner.jsx) ────────────────────────────────

const CHAIN_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#a855f7', '#06b6d4', '#ec4899', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#e11d48',
  '#8b5cf6', '#10b981', '#f43f5e', '#0ea5e9',
];

// ── Chain direction type ──────────────────────────────────────────────────────

type ChainDirection = 'serpentine_ltr' | 'serpentine_rtl' | 'ltr' | 'rtl' | 'ttb' | 'btt';

interface RoutedCell {
  row: number;
  col: number;
  chainId: number;
  chainOrder: number;
  portId: number;
}

// ── Chain routing math (ported from LedWallPlanner.jsx routeChains()) ────────
// Adapted for TileGrid: only routes through TILE cells, skips VOID.

function routeChains(
  grid: TileGrid,
  panel: LedPanelSpec,
  maxPxPerPort: number,
  direction: ChainDirection,
): { routedCells: RoutedCell[]; chainCount: number } {
  const tileCells: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (grid.cells[r]?.[c]?.type === 'TILE') {
        tileCells.push({ row: r, col: c });
      }
    }
  }
  if (tileCells.length === 0) return { routedCells: [], chainCount: 0 };

  let ordered: Array<{ row: number; col: number }>;
  if (direction === 'ltr') {
    ordered = [...tileCells].sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
  } else if (direction === 'rtl') {
    ordered = [...tileCells].sort((a, b) => a.row !== b.row ? a.row - b.row : b.col - a.col);
  } else if (direction === 'serpentine_ltr') {
    ordered = [...tileCells].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.row % 2 === 0 ? a.col - b.col : b.col - a.col;
    });
  } else if (direction === 'serpentine_rtl') {
    ordered = [...tileCells].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.row % 2 === 0 ? b.col - a.col : a.col - b.col;
    });
  } else if (direction === 'ttb') {
    ordered = [...tileCells].sort((a, b) => a.col !== b.col ? a.col - b.col : a.row - b.row);
  } else {
    // btt
    ordered = [...tileCells].sort((a, b) => a.col !== b.col ? a.col - b.col : b.row - a.row);
  }

  const pixelsPerPanel = panel.pixelsH * panel.pixelsV;
  const maxPx = maxPxPerPort > 0 ? maxPxPerPort : 650000;
  const routedCells: RoutedCell[] = [];
  let chainId = 0;
  let portId = 0;
  let pxInPort = 0;
  let chainLen = 0;

  for (const cell of ordered) {
    const wouldExceedPort = pxInPort + pixelsPerPanel > maxPx;
    const wouldExceedChain = chainLen >= panel.maxChainPanels;

    if (wouldExceedPort || wouldExceedChain) {
      if (wouldExceedPort) { portId++; pxInPort = 0; }
      chainId++;
      chainLen = 0;
    }
    routedCells.push({ ...cell, chainId, chainOrder: chainLen, portId });
    pxInPort += pixelsPerPanel;
    chainLen++;
  }

  return { routedCells, chainCount: chainId + 1 };
}

// ── Pure grid mutation helpers ────────────────────────────────────────────────

function makeVoidRow(cols: number): TileCell[] {
  return Array.from({ length: cols }, () => ({ type: 'VOID' as const }));
}

function addRow(grid: TileGrid): TileGrid {
  return { ...grid, rows: grid.rows + 1, cells: [...grid.cells, makeVoidRow(grid.cols)] };
}

function removeRow(grid: TileGrid): TileGrid {
  if (grid.rows <= 1) return grid;
  return { ...grid, rows: grid.rows - 1, cells: grid.cells.slice(0, -1) };
}

function addCol(grid: TileGrid): TileGrid {
  return {
    ...grid,
    cols: grid.cols + 1,
    cells: grid.cells.map(row => [...row, { type: 'VOID' as const }]),
  };
}

function removeCol(grid: TileGrid): TileGrid {
  if (grid.cols <= 1) return grid;
  return {
    ...grid,
    cols: grid.cols - 1,
    cells: grid.cells.map(row => row.slice(0, -1)),
  };
}

function paintCell(
  grid: TileGrid,
  row: number,
  col: number,
  tileSpecUuid: string,
  variant: TileCell['variant'],
): TileGrid {
  const cells = grid.cells.map((r, ri) =>
    ri !== row
      ? r
      : r.map((c, ci) =>
          ci !== col
            ? c
            : ({ type: 'TILE' as const, tileSpecUuid, variant: variant ?? 'STANDARD' }),
        ),
  );
  return { ...grid, cells };
}

function clearCell(grid: TileGrid, row: number, col: number): TileGrid {
  const cells = grid.cells.map((r, ri) =>
    ri !== row
      ? r
      : r.map((c, ci) => (ci !== col ? c : { type: 'VOID' as const })),
  );
  return { ...grid, cells };
}

// ── Tile variant SVG path builder ─────────────────────────────────────────────
// Returns an SVG `d` attribute or null (use rect for STANDARD)

function variantPath(
  variant: TileCell['variant'],
  x: number,
  y: number,
  w: number,
  h: number,
): string | null {
  const notch = Math.min(w, h) * 0.35; // notch size
  switch (variant) {
    case 'R_CORNER':
      // Full rect minus bottom-right triangle notch
      return `M${x},${y} L${x + w},${y} L${x + w},${y + h - notch} L${x + w - notch},${y + h} L${x},${y + h} Z`;
    case 'L_CORNER':
      // Full rect minus bottom-left triangle notch
      return `M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x + notch},${y + h} L${x},${y + h - notch} Z`;
    case 'HALF_H':
      // Top half only
      return `M${x},${y} L${x + w},${y} L${x + w},${y + h / 2} L${x},${y + h / 2} Z`;
    case 'HALF_V':
      // Left half only
      return `M${x},${y} L${x + w / 2},${y} L${x + w / 2},${y + h} L${x},${y + h} Z`;
    case 'QUARTER':
      // Top-left quarter
      return `M${x},${y} L${x + w / 2},${y} L${x + w / 2},${y + h / 2} L${x},${y + h / 2} Z`;
    default:
      return null; // use <rect>
  }
}

// ── WallCanvas SVG ────────────────────────────────────────────────────────────

interface WallCanvasProps {
  grid: TileGrid;
  cellPxW: number;
  cellPxH: number;
  voidMode: boolean;
  chainMap: Map<string, RoutedCell>;
  showChains: boolean;
  hoveredChain: number | null;
  onHoverChain: (id: number | null) => void;
  onCellClick: (row: number, col: number) => void;
}

const WallCanvas: React.FC<WallCanvasProps> = ({
  grid,
  cellPxW,
  cellPxH,
  voidMode,
  chainMap,
  showChains,
  hoveredChain,
  onHoverChain,
  onCellClick,
}) => {
  const svgW = grid.cols * cellPxW + 2;
  const svgH = grid.rows * cellPxH + 2;

  // Chain routing line paths
  const chainPaths = useMemo(() => {
    if (!showChains || chainMap.size === 0) return [];
    const byChain = new Map<number, RoutedCell[]>();
    for (const rc of chainMap.values()) {
      const arr = byChain.get(rc.chainId) ?? [];
      arr.push(rc);
      byChain.set(rc.chainId, arr);
    }
    return Array.from(byChain.entries()).map(([chainId, cells]) => {
      const ordered = cells.sort((a, b) => a.chainOrder - b.chainOrder);
      const pts = ordered.map(rc => ({
        x: rc.col * cellPxW + cellPxW / 2 + 1,
        y: rc.row * cellPxH + cellPxH / 2 + 1,
      }));
      if (pts.length < 2) return null;
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`;
      return { chainId, d, color: CHAIN_COLORS[chainId % CHAIN_COLORS.length] };
    }).filter(Boolean) as Array<{ chainId: number; d: string; color: string }>;
  }, [chainMap, showChains, cellPxW, cellPxH]);

  return (
    <svg
      width={svgW}
      height={svgH}
      style={{ display: 'block', cursor: voidMode ? 'crosshair' : 'pointer' }}
    >
      <defs>
        <marker id="led-arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="#7a8ba3" />
        </marker>
      </defs>

      {/* Background */}
      <rect x={1} y={1} width={grid.cols * cellPxW} height={grid.rows * cellPxH} fill="#060d1a" rx={2} />

      {/* Cells */}
      {grid.cells.map((row, ri) =>
        row.map((cell, ci) => {
          const x = ci * cellPxW + 1;
          const y = ri * cellPxH + 1;
          const w = cellPxW - 1;
          const h = cellPxH - 1;
          const chainInfo = chainMap.get(`${ri},${ci}`);
          const cId = chainInfo?.chainId ?? -1;
          const isHovered = hoveredChain !== null && cId === hoveredChain;
          const isDimmed = hoveredChain !== null && cId !== hoveredChain;

          let fillColor: string;
          let strokeColor: string;

          if (cell.type === 'VOID') {
            fillColor = '#0c1829';
            strokeColor = '#1a2d4d';
          } else if (showChains && cId >= 0) {
            const base = CHAIN_COLORS[cId % CHAIN_COLORS.length];
            fillColor = base + (isDimmed ? '15' : '30');
            strokeColor = base;
          } else {
            fillColor = '#1a2d4d';
            strokeColor = '#3b82f6';
          }

          const strokeWidth = isHovered ? 1.5 : cell.type === 'TILE' ? 0.8 : 0.4;
          const strokeOpacity = isDimmed ? 0.2 : cell.type === 'TILE' ? 0.7 : 0.3;

          const pathD = cell.type === 'TILE' ? variantPath(cell.variant, x, y, w, h) : null;

          return (
            <g
              key={`${ri}-${ci}`}
              onClick={() => onCellClick(ri, ci)}
              onMouseEnter={() => cId >= 0 && onHoverChain(cId)}
              onMouseLeave={() => onHoverChain(null)}
            >
              {pathD ? (
                <path
                  d={pathD}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity={strokeOpacity}
                  rx={1}
                />
              ) : (
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity={strokeOpacity}
                  rx={1}
                />
              )}
              {/* Chain order label */}
              {showChains && chainInfo && cellPxW >= 32 && (
                <text
                  x={x + w / 2}
                  y={y + h / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={cellPxW < 40 ? 7 : 9}
                  fill={isDimmed ? '#7a8ba3' + '40' : '#ffffff' + 'aa'}
                  style={{ pointerEvents: 'none' }}
                >
                  {chainInfo.chainOrder + 1}
                </text>
              )}
            </g>
          );
        }),
      )}

      {/* Chain routing lines */}
      {showChains &&
        chainPaths.map(cp => (
          <path
            key={cp.chainId}
            d={cp.d}
            fill="none"
            stroke={cp.color}
            strokeWidth={hoveredChain === cp.chainId ? 2.5 : 1.2}
            strokeOpacity={hoveredChain !== null && hoveredChain !== cp.chainId ? 0.1 : 0.7}
            strokeDasharray={hoveredChain === cp.chainId ? undefined : '3 2'}
            markerEnd="url(#led-arrowhead)"
            style={{ pointerEvents: 'none', transition: 'stroke-width 0.15s, stroke-opacity 0.15s' }}
          />
        ))}
    </svg>
  );
};

// ── Chain legend ──────────────────────────────────────────────────────────────

interface ChainLegendProps {
  chainMap: Map<string, RoutedCell>;
  hoveredChain: number | null;
  onHover: (id: number | null) => void;
}

const ChainLegend: React.FC<ChainLegendProps> = ({ chainMap, hoveredChain, onHover }) => {
  const chains = useMemo(() => {
    const byChain = new Map<number, { id: number; portId: number; count: number }>();
    for (const rc of chainMap.values()) {
      const entry = byChain.get(rc.chainId);
      if (entry) {
        entry.count++;
      } else {
        byChain.set(rc.chainId, { id: rc.chainId, portId: rc.portId, count: 1 });
      }
    }
    return Array.from(byChain.values()).sort((a, b) => a.id - b.id);
  }, [chainMap]);

  if (chains.length === 0) return null;

  return (
    <div className="mt-3 border border-av-border rounded-lg p-3 bg-av-surface">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-av-text-muted mb-2">
        Data Chains
      </div>
      <div className="flex flex-wrap gap-2">
        {chains.map(ch => {
          const color = CHAIN_COLORS[ch.id % CHAIN_COLORS.length];
          const isHovered = hoveredChain === ch.id;
          return (
            <div
              key={ch.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-all"
              style={{
                border: `1px solid ${isHovered ? color : '#1a2d4d'}`,
                background: isHovered ? color + '20' : 'transparent',
              }}
              onMouseEnter={() => onHover(ch.id)}
              onMouseLeave={() => onHover(null)}
            >
              <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} />
              <span className="text-[11px] text-av-text">Ch {ch.id + 1}</span>
              <span className="text-[10px] text-av-text-muted">P{ch.portId + 1} · {ch.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Stats panel ───────────────────────────────────────────────────────────────

interface PlannerStats {
  totalPanels: number;
  voidCount: number;
  totalPixels: number;
  totalWeightKg: number;
  totalWeightLbs: number;
  totalPowerMaxW: number;
  totalPowerAvgW: number;
  estimatedChains: number;
  processorLoadingPct: number;
  circuitCount: number;
}

interface StatsPanelProps {
  stats: PlannerStats;
  processorSpec: EquipmentSpec | undefined;
  activeTilePanel: LedPanelSpec | null;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, processorSpec, activeTilePanel }) => {
  const loadingColor =
    stats.processorLoadingPct > 100
      ? 'text-av-danger'
      : stats.processorLoadingPct > 85
        ? 'text-yellow-400'
        : 'text-green-400';

  return (
    <div className="bg-av-surface border border-av-border rounded-lg p-4 space-y-3 text-xs">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-av-text-muted">
        Wall Stats
      </div>

      {/* Panels */}
      <div className="space-y-1.5">
        <StatLine label="Panels" value={String(stats.totalPanels)} />
        <StatLine label="Void cells" value={String(stats.voidCount)} />
        <StatLine
          label="Total pixels"
          value={stats.totalPixels > 0 ? stats.totalPixels.toLocaleString() : '—'}
        />
      </div>

      <div className="border-t border-av-border" />

      {/* Processor loading */}
      {processorSpec ? (
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-av-text-muted">Processor load</span>
            <span className={cn('font-semibold', loadingColor)}>
              {stats.processorLoadingPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 bg-av-bg rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                stats.processorLoadingPct > 100
                  ? 'bg-av-danger'
                  : stats.processorLoadingPct > 85
                    ? 'bg-yellow-400'
                    : 'bg-green-400',
              )}
              style={{ width: `${Math.min(stats.processorLoadingPct, 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-av-text-muted mt-1 truncate">
            {processorSpec.manufacturer} {processorSpec.model}
          </div>
        </div>
      ) : (
        <div className="text-[10px] text-av-text-muted italic">No processor assigned</div>
      )}

      <StatLine
        label="Est. chains"
        value={stats.estimatedChains > 0 ? String(stats.estimatedChains) : '—'}
      />

      <div className="border-t border-av-border" />

      {/* Weight */}
      <div className="space-y-1.5">
        <StatLine
          label="Weight"
          value={
            stats.totalWeightKg > 0
              ? `${stats.totalWeightKg.toFixed(1)} kg`
              : '—'
          }
        />
        {stats.totalWeightKg > 0 && (
          <StatLine label="" value={`${stats.totalWeightLbs.toFixed(0)} lbs`} />
        )}
      </div>

      <div className="border-t border-av-border" />

      {/* Power */}
      <div className="space-y-1.5">
        <StatLine
          label="Power max"
          value={stats.totalPowerMaxW > 0 ? `${stats.totalPowerMaxW.toLocaleString()} W` : '—'}
        />
        <StatLine
          label="Power avg"
          value={stats.totalPowerAvgW > 0 ? `${stats.totalPowerAvgW.toLocaleString()} W` : '—'}
        />
        <StatLine
          label="Circuits 15A/120V"
          value={stats.circuitCount > 0 ? String(stats.circuitCount) : '—'}
        />
      </div>

      {activeTilePanel && (
        <>
          <div className="border-t border-av-border" />
          <div className="text-[10px] text-av-text-muted space-y-0.5">
            <div className="font-medium text-av-text">{activeTilePanel.manufacturer} {activeTilePanel.model}</div>
            <div>{activeTilePanel.panelWidthMm}×{activeTilePanel.panelHeightMm}mm · {activeTilePanel.pixelPitchMm}mm pitch</div>
            <div>{activeTilePanel.pixelsH}×{activeTilePanel.pixelsV} px/panel</div>
          </div>
        </>
      )}
    </div>
  );
};

const StatLine: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-av-text-muted">{label}</span>
    <span className="text-av-text font-medium">{value}</span>
  </div>
);

// ── Tile picker modal ─────────────────────────────────────────────────────────

interface TilePickerModalProps {
  tileSpecs: EquipmentSpec[];
  builtinPanels: LedPanelSpec[];
  selectedTileUuid: string;
  selectedVariant: NonNullable<TileCell['variant']>;
  onSelect: (uuid: string, variant: NonNullable<TileCell['variant']>) => void;
  onClose: () => void;
}

const VARIANTS: Array<{ value: NonNullable<TileCell['variant']>; label: string }> = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'R_CORNER', label: 'R Corner' },
  { value: 'L_CORNER', label: 'L Corner' },
  { value: 'HALF_H', label: 'Half H' },
  { value: 'HALF_V', label: 'Half V' },
  { value: 'QUARTER', label: 'Quarter' },
];

const TilePickerModal: React.FC<TilePickerModalProps> = ({
  tileSpecs,
  builtinPanels,
  selectedTileUuid,
  selectedVariant,
  onSelect,
  onClose,
}) => {
  const [uuid, setUuid] = useState(selectedTileUuid);
  const [variant, setVariant] = useState<NonNullable<TileCell['variant']>>(selectedVariant);

  const hasLibraryTiles = tileSpecs.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-av-surface border border-av-border rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-av-border">
          <h2 className="text-base font-semibold text-av-text">Select Tile</h2>
          <button onClick={onClose} className="text-av-text-muted hover:text-av-text text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-av-text mb-1.5">
              Tile Spec {!hasLibraryTiles && <span className="text-[10px] text-av-text-muted">(built-in library)</span>}
            </label>
            <select
              value={uuid}
              onChange={e => setUuid(e.target.value)}
              className="input-field w-full"
            >
              <option value="">— Select —</option>
              {hasLibraryTiles
                ? tileSpecs.map(s => (
                    <option key={s.uuid ?? s.id} value={s.uuid ?? s.id ?? ''}>
                      {s.manufacturer} {s.model}
                      {s.specs?.panelWidthMm
                        ? ` (${s.specs.panelWidthMm}×${s.specs.panelHeightMm}mm)`
                        : ''}
                    </option>
                  ))
                : builtinPanels.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.manufacturer} {p.model} ({p.panelWidthMm}×{p.panelHeightMm}mm)
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-av-text mb-1.5">Variant</label>
            <div className="grid grid-cols-3 gap-2">
              {VARIANTS.map(v => (
                <button
                  key={v.value}
                  onClick={() => setVariant(v.value)}
                  className={cn(
                    'px-2 py-1.5 rounded text-xs font-medium border transition-colors',
                    variant === v.value
                      ? 'bg-av-accent/20 border-av-accent text-av-accent'
                      : 'border-av-border text-av-text-muted hover:border-av-accent/40',
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-5 pb-5">
          <button onClick={onClose} className="btn-secondary text-sm">
            Cancel
          </button>
          <button
            onClick={() => uuid && onSelect(uuid, variant)}
            disabled={!uuid}
            className="btn-primary text-sm disabled:opacity-40"
          >
            Paint Cell
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main LedPlannerTab component ──────────────────────────────────────────────

interface LedPlannerTabProps {
  walls: LEDScreen[];
  tileSpecs: EquipmentSpec[];
  processorSpecs: EquipmentSpec[];
  onUpdateWall: (uuid: string, tileGrid: TileGrid, version: number) => Promise<void>;
}

const LedPlannerTab: React.FC<LedPlannerTabProps> = ({
  walls,
  tileSpecs,
  processorSpecs,
  onUpdateWall,
}) => {
  const { panels: builtinPanels } = useLedEquipment();

  // ── Wall selection ──────────────────────────────────────────────────────────
  const [selectedWallUuid, setSelectedWallUuid] = useState<string>(walls[0]?.uuid ?? '');

  const selectedWall = walls.find(w => w.uuid === selectedWallUuid) ?? walls[0] ?? null;

  // ── Local working grid ──────────────────────────────────────────────────────
  const [localGrid, setLocalGrid] = useState<TileGrid | null>(selectedWall?.tileGrid ?? null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectWall = useCallback(
    (uuid: string) => {
      setSelectedWallUuid(uuid);
      const wall = walls.find(w => w.uuid === uuid);
      setLocalGrid(wall?.tileGrid ?? null);
      setIsDirty(false);
    },
    [walls],
  );

  // Sync when walls prop changes (e.g. after save)
  const lastSyncedUuid = React.useRef<string>('');
  React.useEffect(() => {
    if (!selectedWall || isDirty) return;
    if (lastSyncedUuid.current === selectedWall.uuid) return;
    lastSyncedUuid.current = selectedWall.uuid;
    setLocalGrid(selectedWall.tileGrid ?? null);
  }, [selectedWall, isDirty]);

  // ── Painting state ──────────────────────────────────────────────────────────
  const [voidMode, setVoidMode] = useState(false);
  const [selectedTileUuid, setSelectedTileUuid] = useState<string>(
    () => tileSpecs[0]?.uuid ?? tileSpecs[0]?.id ?? builtinPanels[0]?.id ?? '',
  );
  const [selectedVariant, setSelectedVariant] = useState<NonNullable<TileCell['variant']>>('STANDARD');

  // ── Tile picker modal ───────────────────────────────────────────────────────
  const [pickerCell, setPickerCell] = useState<{ row: number; col: number } | null>(null);

  // ── Chain routing ───────────────────────────────────────────────────────────
  const [chainDir, setChainDir] = useState<ChainDirection>('serpentine_ltr');
  const [showChains, setShowChains] = useState(false);
  const [hoveredChain, setHoveredChain] = useState<number | null>(null);

  // Active tile panel spec for canvas sizing and chain routing
  const activeTileSpec = tileSpecs.find(
    s => s.uuid === selectedTileUuid || s.id === selectedTileUuid,
  );

  const activeTilePanel: LedPanelSpec = activeTileSpec
    ? {
        id: activeTileSpec.uuid ?? activeTileSpec.id,
        manufacturer: activeTileSpec.manufacturer,
        model: activeTileSpec.model,
        pixelPitchMm: Number((activeTileSpec.specs as any)?.pixelPitch ?? 0),
        panelWidthMm: Number((activeTileSpec.specs as any)?.panelWidthMm ?? 500),
        panelHeightMm: Number((activeTileSpec.specs as any)?.panelHeightMm ?? 500),
        pixelsH: Number((activeTileSpec.specs as any)?.pixelsH ?? 0),
        pixelsV: Number((activeTileSpec.specs as any)?.pixelsV ?? 0),
        weightKg: Number((activeTileSpec.specs as any)?.weightKg ?? 0),
        powerMaxW: Number((activeTileSpec.specs as any)?.powerMaxW ?? 0),
        powerAvgW: Number((activeTileSpec.specs as any)?.powerAvgW ?? 0),
        maxChainPanels: Number((activeTileSpec.specs as any)?.maxChainLength ?? 16),
      }
    : (builtinPanels.find(p => p.id === selectedTileUuid) ?? builtinPanels[0]);

  // Processor for current wall
  const processorSpec = processorSpecs.find(s => s.uuid === selectedWall?.processorUuid);
  const maxPxPerPort = Number((processorSpec?.specs as any)?.maxPixelsPerPort ?? 650000);
  const maxTotalPx = Number((processorSpec?.specs as any)?.maxPixels ?? 0);

  // ── Computed chain routing ──────────────────────────────────────────────────
  const chainMap = useMemo((): Map<string, RoutedCell> => {
    if (!localGrid || !activeTilePanel || !showChains) return new Map();
    const { routedCells } = routeChains(localGrid, activeTilePanel, maxPxPerPort, chainDir);
    const map = new Map<string, RoutedCell>();
    for (const rc of routedCells) map.set(`${rc.row},${rc.col}`, rc);
    return map;
  }, [localGrid, activeTilePanel, maxPxPerPort, chainDir, showChains]);

  // ── Live stats ──────────────────────────────────────────────────────────────
  const stats = useMemo((): PlannerStats | null => {
    if (!localGrid) return null;
    let totalPanels = 0;
    let voidCount = 0;
    let totalPixels = 0;
    let totalWeightKg = 0;
    let totalPowerMaxW = 0;
    let totalPowerAvgW = 0;

    for (const row of localGrid.cells) {
      for (const cell of row) {
        if (cell.type === 'TILE') {
          totalPanels++;
          const spec = tileSpecs.find(
            s => s.uuid === cell.tileSpecUuid || s.id === cell.tileSpecUuid,
          );
          const s = (spec?.specs ?? {}) as Record<string, any>;
          const fallback = activeTilePanel;
          const pH = Number(s.pixelsH ?? fallback?.pixelsH ?? 0);
          const pV = Number(s.pixelsV ?? fallback?.pixelsV ?? 0);
          totalPixels += pH * pV;
          totalWeightKg += Number(s.weightKg ?? fallback?.weightKg ?? 0);
          totalPowerMaxW += Number(s.powerMaxW ?? fallback?.powerMaxW ?? 0);
          totalPowerAvgW += Number(s.powerAvgW ?? fallback?.powerAvgW ?? 0);
        } else {
          voidCount++;
        }
      }
    }

    const maxChain = activeTilePanel?.maxChainPanels ?? 16;
    const estimatedChains = maxChain > 0 ? Math.ceil(totalPanels / maxChain) : 0;
    const processorLoadingPct = maxTotalPx > 0 ? (totalPixels / maxTotalPx) * 100 : 0;
    const circuitCount = totalPowerMaxW > 0 ? Math.ceil(totalPowerMaxW / (15 * 120)) : 0;

    return {
      totalPanels,
      voidCount,
      totalPixels,
      totalWeightKg,
      totalWeightLbs: totalWeightKg * 2.205,
      totalPowerMaxW,
      totalPowerAvgW,
      estimatedChains,
      processorLoadingPct,
      circuitCount,
    };
  }, [localGrid, tileSpecs, activeTilePanel, maxTotalPx]);

  // ── Canvas cell sizing (proportional to tile mm dimensions) ─────────────────
  const MAX_CANVAS_W = 620;
  const cellW_mm = activeTilePanel?.panelWidthMm ?? 500;
  const cellH_mm = activeTilePanel?.panelHeightMm ?? 500;
  const cellPxW = localGrid
    ? Math.max(16, Math.min(80, Math.floor(MAX_CANVAS_W / localGrid.cols)))
    : 40;
  const cellPxH = Math.max(8, Math.round(cellPxW * (cellH_mm / cellW_mm)));

  // ── Cell click handler ──────────────────────────────────────────────────────
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!localGrid) return;
      const cell = localGrid.cells[row]?.[col];
      if (!cell) return;

      if (voidMode) {
        if (cell.type === 'TILE') {
          setLocalGrid(clearCell(localGrid, row, col));
          setIsDirty(true);
        }
        return;
      }

      if (selectedTileUuid) {
        // Paint directly
        setLocalGrid(paintCell(localGrid, row, col, selectedTileUuid, selectedVariant));
        setIsDirty(true);
      } else {
        // Open picker
        setPickerCell({ row, col });
      }
    },
    [localGrid, voidMode, selectedTileUuid, selectedVariant],
  );

  // ── Grid mutation helper ────────────────────────────────────────────────────
  const mutateGrid = (fn: (g: TileGrid) => TileGrid) => {
    setLocalGrid(prev => (prev ? fn(prev) : prev));
    setIsDirty(true);
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedWall || !localGrid || !isDirty) return;
    setIsSaving(true);
    try {
      await onUpdateWall(selectedWall.uuid, localGrid, selectedWall.version);
      setIsDirty(false);
      lastSyncedUuid.current = '';
    } catch (err) {
      console.error('Failed to save tile grid:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (walls.length === 0) {
    return (
      <div className="text-center py-16 text-av-text-muted">
        <p className="text-sm">No LED walls yet — add a wall in the Walls tab first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Top bar: wall selector + grid resize + void toggle + save ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Wall selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-av-text-muted">Wall:</label>
          <select
            value={selectedWallUuid}
            onChange={e => handleSelectWall(e.target.value)}
            className="input-field text-sm"
          >
            {walls.map(w => (
              <option key={w.uuid} value={w.uuid}>
                W{w.sortOrder + 1}: {w.name}
              </option>
            ))}
          </select>
        </div>

        {localGrid && (
          <>
            {/* Grid size controls */}
            <div className="flex items-center gap-1 border border-av-border rounded-md p-1 text-xs">
              <span className="text-av-text-muted px-1">Cols:</span>
              <button
                onClick={() => mutateGrid(removeCol)}
                className="p-1 hover:bg-av-surface-light rounded transition-colors text-av-text-muted hover:text-av-text"
                title="Remove column"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-av-text font-mono w-6 text-center">{localGrid.cols}</span>
              <button
                onClick={() => mutateGrid(addCol)}
                className="p-1 hover:bg-av-surface-light rounded transition-colors text-av-text-muted hover:text-av-text"
                title="Add column"
              >
                <Plus className="w-3 h-3" />
              </button>
              <span className="text-av-text-muted px-1 ml-1">Rows:</span>
              <button
                onClick={() => mutateGrid(removeRow)}
                className="p-1 hover:bg-av-surface-light rounded transition-colors text-av-text-muted hover:text-av-text"
                title="Remove row"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-av-text font-mono w-6 text-center">{localGrid.rows}</span>
              <button
                onClick={() => mutateGrid(addRow)}
                className="p-1 hover:bg-av-surface-light rounded transition-colors text-av-text-muted hover:text-av-text"
                title="Add row"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Void toggle */}
            <button
              onClick={() => setVoidMode(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border',
                voidMode
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : 'bg-av-surface text-av-text-muted border-av-border hover:border-av-accent/50',
              )}
              title="Toggle void mode: click painted cells to clear them"
            >
              <ZapOff className="w-3.5 h-3.5" />
              {voidMode ? 'Void ON' : 'Void'}
            </button>
          </>
        )}

        <div className="ml-auto flex gap-2">
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save Grid'}
            </button>
          )}
        </div>
      </div>

      {/* ── Tile selector row ── */}
      {localGrid && (
        <div className="flex items-center gap-3 flex-wrap px-3 py-2 bg-av-surface border border-av-border rounded-lg">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-av-text-muted">
            Paint Tile:
          </span>

          <select
            value={selectedTileUuid}
            onChange={e => setSelectedTileUuid(e.target.value)}
            className="input-field text-sm flex-1 min-w-36"
          >
            <option value="">— Select tile —</option>
            {tileSpecs.length > 0
              ? tileSpecs.map(s => (
                  <option key={s.uuid ?? s.id} value={s.uuid ?? s.id ?? ''}>
                    {s.manufacturer} {s.model}
                    {(s.specs as any)?.panelWidthMm
                      ? ` (${(s.specs as any).panelWidthMm}×${(s.specs as any).panelHeightMm}mm)`
                      : ''}
                  </option>
                ))
              : builtinPanels.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.manufacturer} {p.model} ({p.panelWidthMm}×{p.panelHeightMm}mm)
                  </option>
                ))}
          </select>

          <select
            value={selectedVariant}
            onChange={e => setSelectedVariant(e.target.value as NonNullable<TileCell['variant']>)}
            className="input-field text-sm w-32"
          >
            {VARIANTS.map(v => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-av-text-muted cursor-pointer select-none ml-2">
            <input
              type="checkbox"
              checked={showChains}
              onChange={e => setShowChains(e.target.checked)}
              className="accent-av-accent"
            />
            Chain routing
          </label>

          {showChains && (
            <select
              value={chainDir}
              onChange={e => setChainDir(e.target.value as ChainDirection)}
              className="input-field text-sm w-40"
            >
              <option value="serpentine_ltr">Serpentine L→R</option>
              <option value="serpentine_rtl">Serpentine R→L</option>
              <option value="ltr">Left to Right</option>
              <option value="rtl">Right to Left</option>
              <option value="ttb">Top to Bottom</option>
              <option value="btt">Bottom to Top</option>
            </select>
          )}
        </div>
      )}

      {/* ── Main area: canvas + stats side panel ── */}
      <div className="flex gap-4 items-start">
        {/* Canvas area */}
        <div className="flex-1 min-w-0">
          {localGrid ? (
            <div className="bg-[#060d1a] border border-av-border rounded-lg p-4 overflow-auto">
              <WallCanvas
                grid={localGrid}
                cellPxW={cellPxW}
                cellPxH={cellPxH}
                voidMode={voidMode}
                chainMap={chainMap}
                showChains={showChains}
                hoveredChain={hoveredChain}
                onHoverChain={setHoveredChain}
                onCellClick={handleCellClick}
              />
              <div className="mt-2 text-[11px] text-center text-[#7a8ba3]">
                {selectedWall?.name} — {localGrid.cols}×{localGrid.rows}
                {activeTilePanel
                  ? ` — ${activeTilePanel.manufacturer} ${activeTilePanel.model}`
                  : ''}
              </div>
            </div>
          ) : (
            <div className="bg-av-surface border border-av-border rounded-lg p-8 text-center text-av-text-muted">
              <p className="text-sm">
                No grid defined for this wall.
                <br />
                Edit the wall in the Walls tab to set a starting grid size.
              </p>
            </div>
          )}

          {/* Chain legend */}
          {showChains && chainMap.size > 0 && (
            <ChainLegend
              chainMap={chainMap}
              hoveredChain={hoveredChain}
              onHover={setHoveredChain}
            />
          )}
        </div>

        {/* Stats panel */}
        {stats && (
          <div className="w-52 flex-shrink-0">
            <StatsPanel
              stats={stats}
              processorSpec={processorSpec}
              activeTilePanel={activeTilePanel}
            />
          </div>
        )}
      </div>

      {/* ── Tile picker modal ── */}
      {pickerCell && (
        <TilePickerModal
          tileSpecs={tileSpecs}
          builtinPanels={builtinPanels}
          selectedTileUuid={selectedTileUuid}
          selectedVariant={selectedVariant}
          onSelect={(uuid, variant) => {
            setSelectedTileUuid(uuid);
            setSelectedVariant(variant);
            if (localGrid) {
              setLocalGrid(paintCell(localGrid, pickerCell.row, pickerCell.col, uuid, variant));
              setIsDirty(true);
            }
            setPickerCell(null);
          }}
          onClose={() => setPickerCell(null)}
        />
      )}
    </div>
  );
};

export default LedPlannerTab;
