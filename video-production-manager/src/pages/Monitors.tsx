import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Edit2, Trash2, Tv2, GripVertical } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { useSendsAPI } from '@/hooks/useSendsAPI';
import { useProductionEvents } from '@/hooks/useProductionEvents';
import { apiClient } from '@/services';
import { getCurrentUserId } from '@/utils/userUtils';
import type { Send } from '@/types';

// Form fields collected by the Monitor modal
interface MonitorFormFields {
  id?: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  equipmentUuid?: string;
  secondaryDevice?: string;   // repurposed as "location"
  outputConnector?: string;
  note?: string;
  version?: number;
}

export default function Monitors() {
  const { activeProject } = useProjectStore();
  const equipmentLib = useEquipmentLibrary();
  const oldStore = useProductionStore();
  const sendsAPI = useSendsAPI();

  // Equipment specs from library
  const equipmentSpecs =
    equipmentLib.equipmentSpecs.length > 0
      ? equipmentLib.equipmentSpecs
      : oldStore.equipmentSpecs;

  // Local state: only MONITOR-type sends
  const [localMonitors, setLocalMonitors] = useState<Send[]>([]);

  // Drag-to-reorder state
  const isDragInProgress = useRef(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Production ID
  const productionId =
    activeProject?.production?.id || oldStore.production?.id;

  // Fetch equipment on mount
  useEffect(() => {
    if (equipmentLib.equipmentSpecs.length === 0) {
      equipmentLib.fetchFromAPI();
    }
  }, []);

  // Fetch monitors (filtered sends) from API on mount
  useEffect(() => {
    if (productionId && oldStore.isConnected) {
      sendsAPI
        .fetchSends(productionId)
        .then(data => setLocalMonitors(data.filter(s => s.type === 'MONITOR')))
        .catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);

  // Real-time WebSocket updates
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback(
      (event) => {
        if (event.entityType !== 'send') return;
        if (event.entity?.type !== 'MONITOR') return;
        if (isDragInProgress.current) return;
        setLocalMonitors(prev => {
          if (prev.some(m => (m as any).uuid === event.entity.uuid)) return prev;
          return [...prev, event.entity];
        });
      },
      []
    ),
    onEntityUpdated: useCallback(
      (event) => {
        if (event.entityType !== 'send') return;
        if (isDragInProgress.current) return;
        setLocalMonitors(prev =>
          prev.map(m =>
            (m as any).uuid === event.entity.uuid ? event.entity : m
          ).filter(m => m.type === 'MONITOR')
        );
      },
      []
    ),
    onEntityDeleted: useCallback(
      (event) => {
        if (event.entityType !== 'send') return;
        setLocalMonitors(prev => prev.filter(m => (m as any).uuid !== event.entityId));
      },
      []
    ),
  });

  // ── Modal state ────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Send | null>(null);
  const [formData, setFormData] = useState<MonitorFormFields>({
    manufacturer: '',
    model: '',
    secondaryDevice: '',
    outputConnector: 'HDMI',
    note: '',
  });
  const [errors, setErrors] = useState<string[]>([]);

  // ── Sorted monitors ────────────────────────────────────────────────────────
  const sortedMonitors = useMemo(() => {
    return [...localMonitors].sort((a, b) => {
      const aMatch = a.id.match(/^MON\s*(\d+)$/i);
      const bMatch = b.id.match(/^MON\s*(\d+)$/i);
      const aNum = aMatch ? parseInt(aMatch[1], 10) : Infinity;
      const bNum = bMatch ? parseInt(bMatch[1], 10) : Infinity;
      if (aNum !== bNum) return aNum - bNum;
      return a.id.localeCompare(b.id);
    });
  }, [localMonitors]);

  // ── Equipment spec lookups ─────────────────────────────────────────────────
  const monitorSpecs = useMemo(
    () => equipmentSpecs.filter(spec => spec.category === 'MONITOR'),
    [equipmentSpecs]
  );

  const MONITOR_MANUFACTURERS = useMemo(
    () =>
      Array.from(new Set(monitorSpecs.map(spec => spec.manufacturer))).sort(),
    [monitorSpecs]
  );

  const MONITOR_MODELS_BY_MANUFACTURER = useMemo(() => {
    const result: Record<string, string[]> = {};
    MONITOR_MANUFACTURERS.forEach(mfr => {
      result[mfr] = monitorSpecs
        .filter(spec => spec.manufacturer === mfr)
        .map(spec => spec.model)
        .sort();
    });
    return result;
  }, [MONITOR_MANUFACTURERS, monitorSpecs]);

  const CONNECTOR_OPTIONS = ['HDMI', 'SDI', 'DisplayPort', 'USB-C', 'NDI'];

  // ── Helpers ────────────────────────────────────────────────────────────────
  const generateId = (): string => {
    const nums = localMonitors
      .map(m => {
        const match = m.id.match(/^MON\s*(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `MON ${max + 1}`;
  };

  const getSpecForForm = () => {
    if (!formData.manufacturer || !formData.model) return null;
    return monitorSpecs.find(
      s =>
        s.manufacturer === formData.manufacturer && s.model === formData.model
    ) || null;
  };

  // Resolve hRes/vRes/rate from manufacturer+model name
  const resolveResolution = (manufacturer: string, model: string) => {
    const m = model.toLowerCase();
    // 4K indicators
    if (m.includes('4k') || m.includes('qled') || m.includes('oled') || m.includes('neo') || m.includes('8k') || m.includes('bravia') || m.includes('4ks') || m.includes('uh')) {
      return { hRes: 3840, vRes: 2160, rate: 60 };
    }
    // 1080p broadcast monitors
    return { hRes: 1920, vRes: 1080, rate: 60 };
  };

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleAddNew = () => {
    setFormData({ manufacturer: '', model: '', secondaryDevice: '', outputConnector: 'HDMI', note: '' });
    setEditingMonitor(null);
    setErrors([]);
    setIsModalOpen(true);
  };

  const handleModelChange = (model: string) => {
    const spec = monitorSpecs.find(
      s => s.manufacturer === formData.manufacturer && s.model === model
    );
    setFormData({
      ...formData,
      model,
      equipmentUuid: spec?.uuid,
    });
  };

  const handleEdit = (monitor: Send) => {
    const record = monitor as any;
    setFormData({
      id: record.id,
      name: record.name,
      manufacturer: record.manufacturer || '',
      model: record.model || '',
      equipmentUuid: record.equipmentUuid,
      secondaryDevice: record.secondaryDevice || '',
      outputConnector: record.outputConnector || 'HDMI',
      note: record.note || '',
      version: record.version,
    });
    setEditingMonitor(monitor);
    setErrors([]);
    setIsModalOpen(true);
  };

  const handleSave = async (action: 'close' | 'duplicate' = 'close') => {
    const newErrors: string[] = [];
    if (!formData.manufacturer?.trim()) newErrors.push('Manufacturer is required');
    if (!formData.model?.trim()) newErrors.push('Model is required');
    if (newErrors.length > 0) { setErrors(newErrors); return; }

    const spec = getSpecForForm();
    const { hRes, vRes, rate } = resolveResolution(formData.manufacturer || '', formData.model || '');

    try {
      if (editingMonitor) {
        const uuid = (editingMonitor as any).uuid;
        const result = await sendsAPI.updateSend(uuid, {
          name: formData.name,
          type: 'MONITOR',
          hRes,
          vRes,
          rate,
          equipmentUuid: formData.equipmentUuid,
          secondaryDevice: formData.secondaryDevice,
          outputConnector: formData.outputConnector,
          note: formData.note,
          version: formData.version,
        });
        if ('error' in result) {
          setErrors([`Save conflict: ${(result as any).message || 'Monitor was modified by another user.'}`]);
          return;
        }
        setLocalMonitors(prev =>
          prev.map(m => (m as any).uuid === uuid ? result as Send : m)
        );
      } else {
        const newId = generateId();
        const created = await sendsAPI.createSend({
          id: newId,
          productionId: productionId!,
          name: formData.name || newId,
          type: 'MONITOR',
          hRes,
          vRes,
          rate,
          equipmentUuid: formData.equipmentUuid,
          secondaryDevice: formData.secondaryDevice,
          outputConnector: formData.outputConnector,
          note: formData.note,
        });
        setLocalMonitors(prev => [...prev, created]);
      }

      if (action === 'duplicate') {
        const newId = generateId();
        setFormData({ ...formData, id: newId, name: newId });
        setEditingMonitor(null);
        setErrors([]);
      } else {
        setIsModalOpen(false);
        setFormData({ manufacturer: '', model: '', secondaryDevice: '', outputConnector: 'HDMI', note: '' });
        setEditingMonitor(null);
        setErrors([]);
      }
    } catch (err) {
      console.error('Failed to save monitor:', err);
      setErrors(['Failed to save monitor. Please try again.']);
    }
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm('Are you sure you want to delete this monitor?')) return;
    try {
      await sendsAPI.deleteSend(uuid);
      // State handled by WS entity:deleted
    } catch (err) {
      console.error('Failed to delete monitor:', err);
      alert('Failed to delete monitor. Please try again.');
    }
  };

  // ── Drag-to-reorder ────────────────────────────────────────────────────────
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
    const draggedIdx = draggedIndex;
    const dragOverIdx = dragOverIndex;
    setDraggedIndex(null);
    setDragOverIndex(null);

    if (draggedIdx === null || dragOverIdx === null || draggedIdx === dragOverIdx) {
      isDragInProgress.current = false;
      return;
    }

    const snapshot = sortedMonitors.map(m => ({
      uuid: (m as any).uuid as string,
      oldId: m.id,
      version: ((m as any).version ?? 1) as number,
    }));

    const reordered = [...snapshot];
    const [dragged] = reordered.splice(draggedIdx, 1);
    reordered.splice(dragOverIdx, 0, dragged);

    const updates = reordered
      .map((m, i) => ({ ...m, newId: `MON ${i + 1}` }))
      .filter(u => u.oldId !== u.newId);

    if (updates.length === 0) {
      isDragInProgress.current = false;
      return;
    }

    const { userId, userName } = getCurrentUserId();
    try {
      await Promise.all(
        updates.map(u =>
          apiClient.put(`/sends/${u.uuid}`, {
            id: u.newId,
            version: u.version,
            userId,
            userName,
          })
        )
      );
      if (productionId) {
        const fresh = await sendsAPI.fetchSends(productionId);
        setLocalMonitors(fresh.filter(s => s.type === 'MONITOR'));
      }
    } catch (err) {
      console.error('❌ Monitor drag renumber failed:', err);
      alert('Failed to renumber monitors. Please refresh the page.');
    } finally {
      isDragInProgress.current = false;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-textPrimary">Monitors</h1>
        </div>
        <button onClick={handleAddNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Monitor
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm text-av-text-muted mb-1">Total Monitors</p>
          <p className="text-3xl font-bold text-av-text">{localMonitors.length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-av-text-muted mb-1">Broadcast Monitors</p>
          <p className="text-3xl font-bold text-av-accent">
            {localMonitors.filter(m => {
              const spec = monitorSpecs.find(s => s.uuid === (m as any).equipmentUuid);
              return spec && ['Sony', 'Flanders Scientific', 'Blackmagic Design', 'Lilliput'].includes(spec.manufacturer);
            }).length}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-av-text-muted mb-1">Consumer TVs</p>
          <p className="text-3xl font-bold text-av-info">
            {localMonitors.filter(m => {
              const spec = monitorSpecs.find(s => s.uuid === (m as any).equipmentUuid);
              return spec && ['Samsung', 'LG', 'Sony'].includes(spec.manufacturer) &&
                (spec.model.toLowerCase().includes('qled') || spec.model.toLowerCase().includes('oled') ||
                 spec.model.toLowerCase().includes('frame') || spec.model.toLowerCase().includes('bravia') ||
                 spec.model.toLowerCase().includes('ur'));
            }).length}
          </p>
        </Card>
      </div>

      {/* Monitor Cards */}
      {localMonitors.length === 0 ? (
        <Card className="p-12 text-center">
          <Tv2 className="w-12 h-12 text-av-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-av-text mb-2">No Monitors Yet</h3>
          <p className="text-av-text-muted mb-4">
            Add confidence monitors, reference displays, and on-set TVs
          </p>
          <button onClick={handleAddNew} className="btn-primary flex items-center gap-2 mx-auto">
            <Plus className="w-4 h-4" />
            Add Monitor
          </button>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedMonitors.map((monitor, index) => {
            const record = monitor as any;
            const spec = monitorSpecs.find(s => s.uuid === record.equipmentUuid);
            const hasEquipment = !!spec;

            return (
              <Card
                key={record.uuid || monitor.id}
                className={`p-4 transition-colors ${
                  dragOverIndex === index ? 'border-av-accent/60 bg-av-accent/5' : 'hover:border-av-accent/30'
                } ${draggedIndex === index ? 'opacity-50' : ''}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
              >
                <div className="flex items-center gap-3">
                  {/* Drag handle */}
                  <div className="cursor-grab active:cursor-grabbing text-av-text-muted hover:text-av-text">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`font-semibold ${hasEquipment ? 'text-av-text' : 'text-av-warning'}`}>
                        {monitor.id}
                        {monitor.name && monitor.name !== monitor.id && (
                          <span className="text-av-text-muted font-normal ml-1">— {monitor.name}</span>
                        )}
                      </span>
                      {spec && (
                        <span className={`text-sm ${hasEquipment ? 'text-av-text-secondary' : 'text-av-warning'}`}>
                          {spec.manufacturer} {spec.model}
                        </span>
                      )}
                      {!hasEquipment && (
                        <span className="text-xs text-av-warning">No equipment assigned</span>
                      )}
                      {record.outputConnector && (
                        <Badge>{record.outputConnector}</Badge>
                      )}
                    </div>

                    {/* Secondary info row */}
                    {(record.secondaryDevice || record.note) && (
                      <div className="flex items-center gap-4 mt-1 text-xs text-av-text-muted flex-wrap">
                        {record.secondaryDevice && (
                          <span>📍 {record.secondaryDevice}</span>
                        )}
                        {record.note && (
                          <span className="italic">{record.note}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(monitor)}
                      className="p-2 text-av-text-muted hover:text-av-text hover:bg-av-surface rounded-md transition-colors"
                      title="Edit monitor"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(record.uuid)}
                      className="p-2 text-av-text-muted hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                      title="Delete monitor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-av-surface border border-av-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-av-text mb-6">
                {editingMonitor ? 'Edit Monitor' : 'Add Monitor'}
              </h2>

              {errors.length > 0 && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
                  {errors.map((e, i) => (
                    <p key={i} className="text-sm text-red-400">{e}</p>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-av-text-muted mb-1">
                    Name <span className="text-av-text-muted/60 font-normal">(optional label)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder={`e.g. Stage Left Confidence`}
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
                    onChange={e =>
                      setFormData({ ...formData, manufacturer: e.target.value, model: '', equipmentUuid: undefined })
                    }
                    className="input-field w-full"
                  >
                    <option value="">Select manufacturer...</option>
                    {MONITOR_MANUFACTURERS.map(mfr => (
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
                    {(MONITOR_MODELS_BY_MANUFACTURER[formData.manufacturer || ''] || []).map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-av-text-muted mb-1">
                    Location / Purpose
                  </label>
                  <input
                    type="text"
                    value={formData.secondaryDevice || ''}
                    onChange={e => setFormData({ ...formData, secondaryDevice: e.target.value })}
                    placeholder="e.g. Stage Left, Broadcast Position, Green Room"
                    className="input-field w-full"
                  />
                </div>

                {/* Output Connector */}
                <div>
                  <label className="block text-sm font-medium text-av-text-muted mb-1">
                    Output Connector
                  </label>
                  <select
                    value={formData.outputConnector || 'HDMI'}
                    onChange={e => setFormData({ ...formData, outputConnector: e.target.value })}
                    className="input-field w-full"
                  >
                    {CONNECTOR_OPTIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-av-text-muted mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.note || ''}
                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Any additional notes..."
                    rows={2}
                    className="input-field w-full resize-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-av-border">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setErrors([]);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-3">
                  {!editingMonitor && (
                    <button
                      onClick={() => handleSave('duplicate')}
                      className="btn-secondary"
                    >
                      Save & Add Another
                    </button>
                  )}
                  <button onClick={() => handleSave('close')} className="btn-primary">
                    {editingMonitor ? 'Save Changes' : 'Add Monitor'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
