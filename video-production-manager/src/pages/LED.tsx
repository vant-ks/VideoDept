import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, Grid, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/utils/helpers';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { useLEDScreenAPI, type LEDScreen, type LEDScreenInput, type TileGrid, type TileCell } from '@/hooks/useLEDScreenAPI';
import { useProductionEvents } from '@/hooks/useProductionEvents';
import type { EntityEvent } from '@/hooks/useProductionEvents';
import type { EquipmentSpec } from '@/types';

// ── Computed wall stats ───────────────────────────────────────────────────────

interface WallStats {
  totalPanels: number;
  totalWeightKg: number;
  totalPowerMaxW: number;
  dominantLabel: string; // "pixelsH×pixelsV" of most common tile spec
  totalPixelsW: number;
  totalPixelsH: number;
}

function computeWallStats(
  tileGrid: TileGrid | null | undefined,
  tileSpecs: EquipmentSpec[]
): WallStats {
  if (!tileGrid) {
    return { totalPanels: 0, totalWeightKg: 0, totalPowerMaxW: 0, dominantLabel: '—', totalPixelsW: 0, totalPixelsH: 0 };
  }

  const tileCells: TileCell[] = tileGrid.cells.flat().filter(c => c.type === 'TILE');
  const totalPanels = tileCells.length;

  let totalWeightKg = 0;
  let totalPowerMaxW = 0;
  let totalPixelsW = 0;
  let totalPixelsH = 0;
  const specCounts: Record<string, number> = {};

  for (const cell of tileCells) {
    if (!cell.tileSpecUuid) continue;
    const spec = tileSpecs.find(s => s.uuid === cell.tileSpecUuid);
    if (!spec?.specs) continue;
    const s = spec.specs as Record<string, any>;
    totalWeightKg += Number(s.weightKg ?? 0);
    totalPowerMaxW += Number(s.powerMaxW ?? 0);
    const pH = Number(s.pixelsH ?? 0);
    const pV = Number(s.pixelsV ?? 0);
    totalPixelsW += pH;
    totalPixelsH += pV;
    const key = `${pH}×${pV}`;
    specCounts[key] = (specCounts[key] ?? 0) + 1;
  }

  const dominantLabel =
    Object.entries(specCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  return { totalPanels, totalWeightKg, totalPowerMaxW, dominantLabel, totalPixelsW, totalPixelsH };
}

// ── Wall grid slot constants ──────────────────────────────────────────────────
const TOTAL_SLOTS = 12;

// ── Form state ────────────────────────────────────────────────────────────────
interface WallFormData {
  name: string;
  processorUuid: string;
  gridCols: string;
  gridRows: string;
  note: string;
  version?: number;
}

const emptyForm = (): WallFormData => ({
  name: '',
  processorUuid: '',
  gridCols: '',
  gridRows: '',
  note: '',
});

// ── Main component ────────────────────────────────────────────────────────────

const LED: React.FC = () => {
  const { activeProjectId: productionId } = useProjectStore();
  const { equipmentSpecs } = useEquipmentLibrary();
  const ledAPI = useLEDScreenAPI();

  const [walls, setWalls] = useState<LEDScreen[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'walls' | 'planner'>('walls');
  const [isLoading, setIsLoading] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWall, setEditingWall] = useState<LEDScreen | null>(null);
  const [formData, setFormData] = useState<WallFormData>(emptyForm());
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Derived data
  const ledProcessors = useMemo(
    () => equipmentSpecs.filter(s => s.category === 'led-processor'),
    [equipmentSpecs]
  );
  const ledTiles = useMemo(
    () => equipmentSpecs.filter(s => s.category === 'led-tile'),
    [equipmentSpecs]
  );

  // ── Load walls ──────────────────────────────────────────────────────────────
  const loadWalls = useCallback(async () => {
    if (!productionId) return;
    setIsLoading(true);
    try {
      const data = await ledAPI.fetchLEDScreens(productionId);
      setWalls(data);
    } catch (err) {
      console.error('Failed to load LED walls:', err);
    } finally {
      setIsLoading(false);
    }
  }, [productionId, ledAPI]);

  useEffect(() => {
    loadWalls();
  }, [loadWalls]);

  // ── WebSocket real-time updates ─────────────────────────────────────────────
  useProductionEvents({
    productionId: productionId ?? undefined,
    onEntityCreated: useCallback((event: EntityEvent) => {
      if (event.entityType !== 'ledScreen') return;
      const created = event.entity as LEDScreen;
      setWalls(prev =>
        prev.some(w => w.uuid === created.uuid) ? prev : [...prev, created]
      );
    }, []),
    onEntityUpdated: useCallback((event: EntityEvent) => {
      if (event.entityType !== 'ledScreen') return;
      const updated = event.entity as LEDScreen;
      setWalls(prev => prev.map(w => w.uuid === updated.uuid ? updated : w));
    }, []),
    onEntityDeleted: useCallback((event: EntityEvent) => {
      if (event.entityType !== 'ledScreen') return;
      setWalls(prev => prev.filter(w => w.uuid !== event.entityId));
    }, []),
  });

  // ── Slot assignment helpers ─────────────────────────────────────────────────
  const nextAvailableSlot = useCallback((): number => {
    const usedSlots = new Set(walls.map(w => w.sortOrder));
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      if (!usedSlots.has(i)) return i;
    }
    return walls.length;
  }, [walls]);

  // ── Modal open helpers ──────────────────────────────────────────────────────
  const handleAddToSlot = (slotIndex: number) => {
    setEditingWall(null);
    setFormData({ ...emptyForm(), gridCols: '4', gridRows: '3' });
    setFormErrors([]);
    setModalOpen(true);
  };

  const handleEdit = (wall: LEDScreen) => {
    setEditingWall(wall);
    setFormData({
      name: wall.name,
      processorUuid: wall.processorUuid ?? '',
      gridCols: wall.tileGrid ? String(wall.tileGrid.cols) : '',
      gridRows: wall.tileGrid ? String(wall.tileGrid.rows) : '',
      note: wall.note ?? '',
      version: wall.version,
    });
    setFormErrors([]);
    setModalOpen(true);
  };

  const handleDelete = async (wall: LEDScreen) => {
    if (!confirm(`Delete wall "${wall.name}"? This cannot be undone.`)) return;
    try {
      await ledAPI.deleteLEDScreen(wall.uuid);
      setWalls(prev => prev.filter(w => w.uuid !== wall.uuid));
    } catch (err) {
      console.error('Failed to delete LED wall:', err);
      alert('Failed to delete wall. Please try again.');
    }
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const errors: string[] = [];
    if (!formData.name.trim()) errors.push('Wall name is required');
    if (errors.length > 0) { setFormErrors(errors); return; }

    setIsSaving(true);
    try {
      // Build initial tile_grid if grid size provided and no existing grid
      let tileGrid: TileGrid | null = editingWall?.tileGrid ?? null;
      const cols = parseInt(formData.gridCols, 10);
      const rows = parseInt(formData.gridRows, 10);
      if (!editingWall && cols > 0 && rows > 0) {
        tileGrid = {
          cols,
          rows,
          cells: Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => ({ type: 'VOID' as const }))
          ),
        };
      }

      if (editingWall) {
        const result = await ledAPI.updateLEDScreen(editingWall.uuid, {
          name: formData.name.trim(),
          processorUuid: formData.processorUuid || null,
          note: formData.note || null,
          tileGrid,
          version: formData.version,
        });
        if ('error' in result) {
          setFormErrors([`Save conflict: ${(result as any).message || 'Record modified by another user.'}`]);
          return;
        }
        setWalls(prev => prev.map(w => w.uuid === editingWall.uuid ? (result as LEDScreen) : w));
      } else {
        const slot = nextAvailableSlot();
        const created = await ledAPI.createLEDScreen({
          productionId: productionId!,
          name: formData.name.trim(),
          sortOrder: slot,
          processorUuid: formData.processorUuid || null,
          note: formData.note || null,
          tileGrid,
        });
        setWalls(prev =>
          prev.some(w => w.uuid === created.uuid)
            ? prev.map(w => w.uuid === created.uuid ? created : w)
            : [...prev, created]
        );
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to save LED wall:', err);
      setFormErrors(['Failed to save wall. Please try again.']);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Build 12-slot ordered array ─────────────────────────────────────────────
  const slots: (LEDScreen | null)[] = useMemo(() => {
    const arr: (LEDScreen | null)[] = Array(TOTAL_SLOTS).fill(null);
    for (const wall of walls) {
      const idx = wall.sortOrder;
      if (idx >= 0 && idx < TOTAL_SLOTS) {
        arr[idx] = wall;
      }
    }
    // Overflow walls (sortOrder >= 12) pushed to first available null slot
    const overflow = walls.filter(w => w.sortOrder < 0 || w.sortOrder >= TOTAL_SLOTS);
    for (const wall of overflow) {
      const idx = arr.indexOf(null);
      if (idx !== -1) arr[idx] = wall;
    }
    return arr;
  }, [walls]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-av-textPrimary">LED</h1>
        {activeSubTab === 'walls' && (
          <button
            onClick={() => handleAddToSlot(nextAvailableSlot())}
            disabled={walls.length >= TOTAL_SLOTS}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Add Wall
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-av-border">
        <button
          onClick={() => setActiveSubTab('walls')}
          className={cn(
            'px-4 py-2 font-medium transition-colors relative flex items-center gap-2',
            activeSubTab === 'walls' ? 'text-av-accent' : 'text-av-text-muted hover:text-av-text'
          )}
        >
          <Grid className="w-4 h-4" />
          Walls
          {activeSubTab === 'walls' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-av-accent" />
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('planner')}
          className={cn(
            'px-4 py-2 font-medium transition-colors relative flex items-center gap-2',
            activeSubTab === 'planner' ? 'text-av-accent' : 'text-av-text-muted hover:text-av-text'
          )}
        >
          <Layers className="w-4 h-4" />
          Planner
          {activeSubTab === 'planner' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-av-accent" />
          )}
        </button>
      </div>

      {/* ── Walls Tab ───────────────────────────────────────────────────── */}
      {activeSubTab === 'walls' && (
        <WallsTab
          slots={slots}
          tileSpecs={ledTiles}
          processorSpecs={ledProcessors}
          isLoading={isLoading}
          onAddToSlot={handleAddToSlot}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* ── Planner Tab (Stage 6) ────────────────────────────────────────── */}
      {activeSubTab === 'planner' && (
        <Card className="p-12 text-center">
          <Layers className="w-12 h-12 text-av-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-av-text mb-2">Planner Coming in Stage 6</h3>
          <p className="text-av-text-muted">
            Interactive tile grid canvas — build LED walls cell by cell from your equipment library.
          </p>
        </Card>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      {modalOpen && (
        <WallModal
          isEditing={!!editingWall}
          formData={formData}
          errors={formErrors}
          processorSpecs={ledProcessors}
          isSaving={isSaving}
          onChange={updates => setFormData(prev => ({ ...prev, ...updates }))}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};

// ── WallsTab ──────────────────────────────────────────────────────────────────

interface WallsTabProps {
  slots: (LEDScreen | null)[];
  tileSpecs: EquipmentSpec[];
  processorSpecs: EquipmentSpec[];
  isLoading: boolean;
  onAddToSlot: (index: number) => void;
  onEdit: (wall: LEDScreen) => void;
  onDelete: (wall: LEDScreen) => void;
}

const WallsTab: React.FC<WallsTabProps> = ({
  slots,
  tileSpecs,
  processorSpecs,
  isLoading,
  onAddToSlot,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
          <div key={i} className="h-48 rounded-lg bg-av-surface animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {slots.map((wall, index) =>
        wall ? (
          <WallCard
            key={wall.uuid}
            wall={wall}
            slotIndex={index}
            tileSpecs={tileSpecs}
            processorSpecs={processorSpecs}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : (
          <EmptySlot key={`empty-${index}`} slotIndex={index} onAdd={onAddToSlot} />
        )
      )}
    </div>
  );
};

// ── WallCard ──────────────────────────────────────────────────────────────────

interface WallCardProps {
  wall: LEDScreen;
  slotIndex: number;
  tileSpecs: EquipmentSpec[];
  processorSpecs: EquipmentSpec[];
  onEdit: (wall: LEDScreen) => void;
  onDelete: (wall: LEDScreen) => void;
}

const WallCard: React.FC<WallCardProps> = ({
  wall,
  slotIndex,
  tileSpecs,
  processorSpecs,
  onEdit,
  onDelete,
}) => {
  const stats = useMemo(
    () => computeWallStats(wall.tileGrid, tileSpecs),
    [wall.tileGrid, tileSpecs]
  );

  const processorSpec = processorSpecs.find(s => s.uuid === wall.processorUuid);
  const processorLabel = processorSpec
    ? `${processorSpec.manufacturer} ${processorSpec.model}`
    : null;

  const gridLabel = wall.tileGrid
    ? `${wall.tileGrid.cols}×${wall.tileGrid.rows}`
    : null;

  return (
    <Card className="p-4 flex flex-col gap-3 hover:border-av-accent/40 transition-colors">
      {/* Slot badge + name */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-av-accent/15 border border-av-accent/30 text-av-accent">
              W{slotIndex + 1}
            </span>
            {gridLabel && (
              <span className="text-[10px] text-av-text-muted font-mono">{gridLabel}</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-av-text leading-tight truncate">
            {wall.name}
          </h3>
        </div>
        <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onEdit(wall)}
            className="p-1.5 rounded hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(wall)}
            className="p-1.5 rounded hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <StatRow label="Panels" value={stats.totalPanels > 0 ? String(stats.totalPanels) : '—'} />
        <StatRow label="Tile" value={stats.dominantLabel} />
        <StatRow
          label="Weight"
          value={stats.totalWeightKg > 0 ? `${stats.totalWeightKg.toFixed(1)} kg` : '—'}
        />
        <StatRow
          label="Power"
          value={stats.totalPowerMaxW > 0 ? `${stats.totalPowerMaxW} W` : '—'}
        />
      </div>

      {/* Processor badge */}
      {processorLabel ? (
        <div className="text-[10px] text-av-info truncate border-t border-av-border pt-2">
          {processorLabel}
        </div>
      ) : (
        <div className="text-[10px] text-av-text-muted/50 italic border-t border-av-border pt-2">
          No processor assigned
        </div>
      )}
    </Card>
  );
};

const StatRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <span className="text-av-text-muted">{label}: </span>
    <span className="text-av-text font-medium">{value}</span>
  </div>
);

// ── EmptySlot ─────────────────────────────────────────────────────────────────

interface EmptySlotProps {
  slotIndex: number;
  onAdd: (index: number) => void;
}

const EmptySlot: React.FC<EmptySlotProps> = ({ slotIndex, onAdd }) => (
  <button
    onClick={() => onAdd(slotIndex)}
    className={cn(
      'h-48 rounded-lg border-2 border-dashed border-av-border',
      'flex flex-col items-center justify-center gap-2',
      'text-av-text-muted hover:text-av-accent hover:border-av-accent/50',
      'transition-colors cursor-pointer group'
    )}
  >
    <Plus className="w-6 h-6 opacity-50 group-hover:opacity-100 transition-opacity" />
    <span className="text-xs font-medium">
      Add Wall <span className="opacity-60">W{slotIndex + 1}</span>
    </span>
  </button>
);

// ── WallModal ─────────────────────────────────────────────────────────────────

interface WallModalProps {
  isEditing: boolean;
  formData: WallFormData;
  errors: string[];
  processorSpecs: EquipmentSpec[];
  isSaving: boolean;
  onChange: (updates: Partial<WallFormData>) => void;
  onSave: () => void;
  onClose: () => void;
}

const WallModal: React.FC<WallModalProps> = ({
  isEditing,
  formData,
  errors,
  processorSpecs,
  isSaving,
  onChange,
  onSave,
  onClose,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave();
    }
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onKeyDown={handleKeyDown}>
      <div className="bg-av-surface border border-av-border rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-av-border">
          <h2 className="text-lg font-semibold text-av-text">
            {isEditing ? 'Edit Wall' : 'Add Wall'}
          </h2>
          <button
            onClick={onClose}
            className="text-av-text-muted hover:text-av-text transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {errors.length > 0 && (
            <div className="bg-av-danger/10 border border-av-danger/30 rounded-lg p-3">
              {errors.map((e, i) => (
                <p key={i} className="text-sm text-av-danger">{e}</p>
              ))}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-av-text mb-1.5">
              Wall Name <span className="text-av-danger">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => onChange({ name: e.target.value })}
              placeholder="e.g. Center LED Wall"
              className="input-field w-full"
              autoFocus
            />
          </div>

          {/* Processor */}
          <div>
            <label className="block text-sm font-medium text-av-text mb-1.5">
              LED Processor
            </label>
            <select
              value={formData.processorUuid}
              onChange={e => onChange({ processorUuid: e.target.value })}
              className="input-field w-full"
            >
              <option value="">— None —</option>
              {processorSpecs.map(p => (
                <option key={p.uuid} value={p.uuid ?? p.id}>
                  {p.manufacturer} {p.model}
                </option>
              ))}
            </select>
            {processorSpecs.length === 0 && (
              <p className="text-xs text-av-text-muted mt-1">
                No LED processors in equipment library yet.
              </p>
            )}
          </div>

          {/* Starting grid size (only on create) */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-av-text mb-1.5">
                Starting Grid Size (optional)
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-av-text-muted">Columns</label>
                  <input
                    type="number"
                    value={formData.gridCols}
                    onChange={e => onChange({ gridCols: e.target.value })}
                    min="1"
                    max="30"
                    placeholder="cols"
                    className="input-field w-full mt-1"
                  />
                </div>
                <span className="text-av-text-muted mt-5">×</span>
                <div className="flex-1">
                  <label className="text-xs text-av-text-muted">Rows</label>
                  <input
                    type="number"
                    value={formData.gridRows}
                    onChange={e => onChange({ gridRows: e.target.value })}
                    min="1"
                    max="30"
                    placeholder="rows"
                    className="input-field w-full mt-1"
                  />
                </div>
              </div>
              <p className="text-xs text-av-text-muted mt-1.5">
                Creates an empty grid — tile it in the Planner tab.
              </p>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-av-text mb-1.5">
              Note
            </label>
            <input
              type="text"
              value={formData.note}
              onChange={e => onChange({ note: e.target.value })}
              placeholder="Optional note"
              className="input-field w-full"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={onSave} disabled={isSaving} className="btn-primary disabled:opacity-50">
            {isSaving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Wall'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LED;
