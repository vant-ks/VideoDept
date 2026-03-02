import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Edit2, Trash2, Tv2, GripVertical } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { useSendsAPI } from '@/hooks/useSendsAPI';
import { useSourcesAPI } from '@/hooks/useSourcesAPI';
import { useProductionEvents } from '@/hooks/useProductionEvents';
import type { EntityEvent } from '@/hooks/useProductionEvents';
import { apiClient } from '@/services';
import { getCurrentUserId, getCurrentUserName } from '@/utils/userUtils';
import { secondaryDevices as SECONDARY_DEVICES } from '@/data/sampleData';
import type { Send, Source } from '@/types';

// Monitor placement / purpose types
const MONITOR_TYPES = [
  { label: 'Front-of-House',       code: 'FOH'   },
  { label: 'Backstage',            code: 'BSM'   },
  { label: 'Operator',             code: 'OPMON' },
  { label: 'Downstage Confidence', code: 'DSM'   },
  { label: 'Downstage Producer',   code: 'PROD'  },
  { label: 'Green Room',           code: 'GRN'   },
  { label: 'Digital Signage',      code: 'DIG'   },
  { label: 'In-Room Display',      code: 'DIS'   },
] as const;

type MonitorTypeCode = typeof MONITOR_TYPES[number]['code'];

// Per-connector signal routing entry
interface ConnectorRouting {
  portId: string;
  portLabel: string;
  portType: string;
  direction: 'input' | 'output';
  sourceSignal: string;        // what signal feeds / comes from this connector
  hasSecondaryDevice: boolean; // toggle: inline device in signal path
  secondaryDevice: string;     // which secondary device is in-line
}

// Form fields collected by the Monitor modal
interface MonitorFormFields {
  id?: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  equipmentUuid?: string;
  monitorType?: MonitorTypeCode | '';  // placement type (stored in secondary_device)
  note?: string;
  version?: number;
  connectorRouting?: ConnectorRouting[];
}

// Build connector routing array from an equipment spec.
// Handles both local format (spec.inputs / spec.outputs) and API format (spec.equipment_io_ports).
function initConnectorRouting(spec: any): ConnectorRouting[] {
  let inputs: any[] = [];
  let outputs: any[] = [];

  if (Array.isArray(spec.equipment_io_ports) && spec.equipment_io_ports.length > 0) {
    // API shape: { port_type: 'INPUT'|'OUTPUT', io_type, label, id }
    inputs  = spec.equipment_io_ports.filter((p: any) => p.port_type === 'INPUT');
    outputs = spec.equipment_io_ports.filter((p: any) => p.port_type === 'OUTPUT');
    return [
      ...inputs.map((p: any) => ({
        portId:             p.id,
        portLabel:          p.label || p.id,
        portType:           p.io_type,
        direction:          'input' as const,
        sourceSignal:       '',
        hasSecondaryDevice: false,
        secondaryDevice:    '',
      })),
      ...outputs.map((p: any) => ({
        portId:             p.id,
        portLabel:          p.label || p.id,
        portType:           p.io_type,
        direction:          'output' as const,
        sourceSignal:       '',
        hasSecondaryDevice: false,
        secondaryDevice:    '',
      })),
    ];
  }

  // Local / legacy shape: spec.inputs[] / spec.outputs[]
  return [
    ...(spec.inputs || []).map((p: any) => ({
      portId:             p.id,
      portLabel:          p.label,
      portType:           p.type,
      direction:          'input' as const,
      sourceSignal:       '',
      hasSecondaryDevice: false,
      secondaryDevice:    '',
    })),
    ...(spec.outputs || []).map((p: any) => ({
      portId:             p.id,
      portLabel:          p.label,
      portType:           p.type,
      direction:          'output' as const,
      sourceSignal:       '',
      hasSecondaryDevice: false,
      secondaryDevice:    '',
    })),
  ];
}

// Parse routing from output_connector JSON and MERGE with current spec.
// The spec is the source of truth for which ports exist; saved routing provides
// previously-assigned signal values for ports that still exist.
// New ports added to the spec appear with empty routing; removed ports are dropped.
function parseConnectorRouting(outputConnector: string | undefined, spec: any): ConnectorRouting[] {
  // Always start from the current spec so port additions/removals are reflected
  const fresh = spec ? initConnectorRouting(spec) : [];
  if (!fresh.length) return fresh;
  if (!outputConnector) return fresh;
  try {
    const parsed = JSON.parse(outputConnector);
    if (!Array.isArray(parsed)) return fresh;
    // Build lookup of saved routing by portId
    const savedMap = new Map<string, ConnectorRouting>(
      (parsed as ConnectorRouting[]).map(r => [r.portId, r])
    );
    // Merge: spec determines ports, saved data fills in signal assignments
    return fresh.map(port => {
      const saved = savedMap.get(port.portId);
      if (!saved) return port; // new port on spec — starts empty
      return {
        ...port,               // spec-derived label/type/direction
        sourceSignal:       saved.sourceSignal,
        hasSecondaryDevice: saved.hasSecondaryDevice,
        secondaryDevice:    saved.secondaryDevice,
      };
    });
  } catch {}
  return fresh;
}

export default function Monitors() {
  const { activeProject } = useProjectStore();
  const equipmentLib = useEquipmentLibrary();
  const oldStore = useProductionStore();
  const sendsAPI = useSendsAPI();
  const sourcesAPI = useSourcesAPI();

  // Equipment specs from library
  const equipmentSpecs =
    equipmentLib.equipmentSpecs.length > 0
      ? equipmentLib.equipmentSpecs
      : oldStore.equipmentSpecs;

  // Local state: only MONITOR-type sends
  const [localMonitors, setLocalMonitors] = useState<Send[]>([]);
  // Production sources for signal source dropdown
  const [localSources, setLocalSources] = useState<Source[]>([]);

  // Drag-to-reorder state
  const isDragInProgress = useRef(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Production ID
  const productionId =
    activeProject?.production?.id || oldStore.production?.id;

  // Always fetch fresh equipment specs on mount so port changes made in the
  // Equipment page are immediately reflected when the Monitor modal opens.
  useEffect(() => {
    equipmentLib.fetchFromAPI();
  }, []);

  // Fetch monitors (filtered sends) from API on mount
  useEffect(() => {
    if (productionId) {
      sendsAPI
        .fetchSends(productionId)
        .then(data => setLocalMonitors(data.filter(s => s.type === 'MONITOR')))
        .catch(console.error);
    }
  }, [productionId]);

  // Fetch production sources for signal source dropdown
  useEffect(() => {
    if (productionId) {
      sourcesAPI
        .fetchSources(productionId)
        .then(data => setLocalSources(data))
        .catch(console.error);
    }
  }, [productionId]);

  // Real-time WebSocket updates
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback(
      (event: EntityEvent) => {
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
      (event: EntityEvent) => {
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
      (event: EntityEvent) => {
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
    monitorType: '',
    note: '',
    connectorRouting: [],
  });
  const [errors, setErrors] = useState<string[]>([]);

  // ── Sorted monitors ────────────────────────────────────────────────────────
  const sortedMonitors = useMemo(() => {
    const typeOrder = MONITOR_TYPES.map(t => t.code);
    return [...localMonitors].sort((a, b) => {
      const aMatch = a.id.match(/^([A-Za-z]+)\s*(\d+)$/);
      const bMatch = b.id.match(/^([A-Za-z]+)\s*(\d+)$/);
      const aCode = aMatch ? aMatch[1].toUpperCase() : '';
      const bCode = bMatch ? bMatch[1].toUpperCase() : '';
      const aNum  = aMatch ? parseInt(aMatch[2], 10) : Infinity;
      const bNum  = bMatch ? parseInt(bMatch[2], 10) : Infinity;
      const aPos  = typeOrder.indexOf(aCode as MonitorTypeCode);
      const bPos  = typeOrder.indexOf(bCode as MonitorTypeCode);
      const aSort = aPos === -1 ? 9999 : aPos;
      const bSort = bPos === -1 ? 9999 : bPos;
      if (aSort !== bSort) return aSort - bSort;
      return aNum - bNum;
    });
  }, [localMonitors]);

  // ── Equipment spec lookups ─────────────────────────────────────────────────
  const monitorSpecs = useMemo(
    () => equipmentSpecs.filter(spec => spec.category.toLowerCase() === 'monitor'),
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

  // ── Helpers ────────────────────────────────────────────────────────────────
  const generateId = (typeCode: string): string => {
    const count = localMonitors.filter(m => {
      const match = m.id.match(/^([A-Za-z]+)\s*\d+$/);
      return match && match[1].toUpperCase() === typeCode.toUpperCase();
    }).length;
    return `${typeCode} ${count + 1}`;
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

  // ── Connector routing helpers ──────────────────────────────────────────────
  const updateConnectorRouting = (portId: string, changes: Partial<ConnectorRouting>) => {
    setFormData(prev => ({
      ...prev,
      connectorRouting: (prev.connectorRouting || []).map(r =>
        r.portId === portId ? { ...r, ...changes } : r
      ),
    }));
  };

  // Source options for signal dropdown: production sources
  const sourceOptions = useMemo(() => {
    return localSources.map(src => ({
      value: src.id,
      label: src.name && src.name !== src.id ? `${src.id} — ${src.name}` : src.id,
    }));
  }, [localSources]);

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleAddNew = () => {
    setFormData({ manufacturer: '', model: '', monitorType: '', note: '', connectorRouting: [] });
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
      connectorRouting: spec ? initConnectorRouting(spec) : [],
    });
  };

  const handleEdit = (monitor: Send) => {
    const record = monitor as any;
    const spec = monitorSpecs.find(s => s.uuid === record.equipmentUuid);
    const routing = parseConnectorRouting(record.outputConnector, spec);
    setFormData({
      id: record.id,
      name: record.name,
      manufacturer: spec?.manufacturer || '',
      model: spec?.model || '',
      equipmentUuid: record.equipmentUuid,
      monitorType: (record.secondaryDevice || '') as MonitorTypeCode | '',
      note: record.note || '',
      version: record.version,
      connectorRouting: routing,
    });
    setEditingMonitor(monitor);
    setErrors([]);
    setIsModalOpen(true);
  };

  const handleSave = async (action: 'close' | 'duplicate' = 'close') => {
    const newErrors: string[] = [];
    if (!formData.monitorType?.trim()) newErrors.push('Monitor type is required');
    if (!formData.manufacturer?.trim()) newErrors.push('Manufacturer is required');
    if (!formData.model?.trim()) newErrors.push('Model is required');
    if (newErrors.length > 0) { setErrors(newErrors); return; }

    const spec = getSpecForForm();
    const { hRes, vRes, rate } = resolveResolution(formData.manufacturer || '', formData.model || '');

    const routingJson = formData.connectorRouting && formData.connectorRouting.length > 0
      ? JSON.stringify(formData.connectorRouting)
      : undefined;

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
          secondaryDevice: formData.monitorType,
          outputConnector: routingJson,
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
        const newId = generateId(formData.monitorType || 'MON');
        const created = await sendsAPI.createSend({
          id: newId,
          productionId: productionId!,
          name: formData.name || newId,
          type: 'MONITOR',
          hRes,
          vRes,
          rate,
          equipmentUuid: formData.equipmentUuid,
          secondaryDevice: formData.monitorType,
          outputConnector: routingJson,
          note: formData.note,
        });
        // Upsert: WS may have already added it; replace if present, append if not
        setLocalMonitors(prev =>
          prev.some(m => (m as any).uuid === (created as any).uuid)
            ? prev.map(m => (m as any).uuid === (created as any).uuid ? created : m)
            : [...prev, created]
        );
      }

      if (action === 'duplicate') {
        const dupeId = generateId(formData.monitorType || 'MON');
        setFormData({ ...formData, id: dupeId, name: dupeId });
        setEditingMonitor(null);
        setErrors([]);
      } else {
        setIsModalOpen(false);
        setFormData({ manufacturer: '', model: '', monitorType: '', note: '', connectorRouting: [] });
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

    // Renumber per-type: FOH 1, FOH 2 ... BSM 1, BSM 2 ...
    const typeCounts: Record<string, number> = {};
    const updates = reordered
      .map(m => {
        const typeMatch = m.oldId.match(/^([A-Za-z]+)\s*\d+$/);
        const typeCode = typeMatch ? typeMatch[1].toUpperCase() : 'MON';
        typeCounts[typeCode] = (typeCounts[typeCode] || 0) + 1;
        return { ...m, newId: `${typeCode} ${typeCounts[typeCode]}` };
      })
      .filter(u => u.oldId !== u.newId);

    if (updates.length === 0) {
      isDragInProgress.current = false;
      return;
    }

    const userId = getCurrentUserId();
    const userName = getCurrentUserName();
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
                    </div>

                    {/* Connector routing summary */}
                    {(() => {
                      let routing: ConnectorRouting[] = [];
                      try {
                        const parsed = record.outputConnector ? JSON.parse(record.outputConnector) : null;
                        if (Array.isArray(parsed)) routing = parsed;
                      } catch {}
                      const assigned = routing.filter(r => r.sourceSignal || r.hasSecondaryDevice);
                      return assigned.length > 0 ? (
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {assigned.map(r => (
                            <span key={r.portId} className="text-xs text-av-text-muted flex items-center gap-1">
                              <span className="text-av-text-secondary">{r.portLabel}</span>
                              {r.sourceSignal && <span>← {r.sourceSignal}</span>}
                              {r.hasSecondaryDevice && r.secondaryDevice && (
                                <Badge className="text-[10px] px-1 py-0">{r.secondaryDevice}</Badge>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : null;
                    })()}

                    {/* Type badge + notes row */}
                    {(record.secondaryDevice || record.note) && (
                      <div className="flex items-center gap-3 mt-1 text-xs text-av-text-muted flex-wrap">
                        {record.secondaryDevice && (() => {
                          const typeEntry = MONITOR_TYPES.find(t => t.code === record.secondaryDevice);
                          return typeEntry ? (
                            <span className="px-1.5 py-0.5 rounded bg-av-surface border border-av-border text-av-text-secondary font-medium">
                              {typeEntry.label}
                            </span>
                          ) : null;
                        })()}
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
          <div className="bg-av-surface border border-av-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                {/* Monitor Type */}
                <div>
                  <label className="block text-sm font-medium text-av-text-muted mb-2">
                    Type <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {MONITOR_TYPES.map(({ label, code }) => (
                      <label
                        key={code}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                          formData.monitorType === code
                            ? 'border-av-accent bg-av-accent/10 text-av-text'
                            : 'border-av-border hover:border-av-accent/40 text-av-text-muted'
                        }`}
                      >
                        <input
                          type="radio"
                          name="monitorType"
                          value={code}
                          checked={formData.monitorType === code}
                          onChange={() => setFormData({ ...formData, monitorType: code })}
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
                      setFormData({ ...formData, manufacturer: e.target.value, model: '', equipmentUuid: undefined, connectorRouting: [] })
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

                {/* Connector Routing — shown once a model is selected */}
                {formData.model && (formData.connectorRouting || []).length > 0 && (() => {
                  const routing = formData.connectorRouting || [];
                  const inputs = routing.filter(r => r.direction === 'input');
                  const outputs = routing.filter(r => r.direction === 'output');

                  const ConnectorRow = ({ r }: { r: ConnectorRouting }) => (
                    <div key={r.portId} className="rounded-md border border-av-border bg-av-bg p-3 space-y-2">
                      {/* Port header */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-av-text">{r.portLabel}</span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-av-surface text-av-text-muted border border-av-border">
                          {r.portType}
                        </span>
                      </div>

                      {/* Source Signal */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-av-text-muted w-28 flex-shrink-0">
                          {r.direction === 'input' ? 'Source Signal' : 'Feeds'}
                        </span>
                        <select
                          value={r.sourceSignal}
                          onChange={e => updateConnectorRouting(r.portId, { sourceSignal: e.target.value })}
                          className="input-field flex-1 text-sm py-1"
                        >
                          <option value="">— unassigned —</option>
                          {sourceOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Secondary device toggle + picker */}
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-av-text-muted cursor-pointer w-28 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={r.hasSecondaryDevice}
                            onChange={e => updateConnectorRouting(r.portId, {
                              hasSecondaryDevice: e.target.checked,
                              secondaryDevice: e.target.checked ? r.secondaryDevice : '',
                            })}
                            className="rounded border-av-border"
                          />
                          Secondary Device
                        </label>
                        {r.hasSecondaryDevice && (
                          <select
                            value={r.secondaryDevice}
                            onChange={e => updateConnectorRouting(r.portId, { secondaryDevice: e.target.value })}
                            className="input-field flex-1 text-sm py-1"
                          >
                            <option value="">Select inline device...</option>
                            {SECONDARY_DEVICES.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  );

                  return (
                    <div className="space-y-3">
                      {inputs.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-av-text-muted uppercase tracking-wider mb-2">
                            Inputs
                          </h3>
                          <div className="space-y-2">
                            {inputs.map(r => <ConnectorRow key={r.portId} r={r} />)}
                          </div>
                        </div>
                      )}
                      {outputs.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-av-text-muted uppercase tracking-wider mb-2">
                            Outputs
                          </h3>
                          <div className="space-y-2">
                            {outputs.map(r => <ConnectorRow key={r.portId} r={r} />)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

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
                    setFormData({ manufacturer: '', model: '', monitorType: '', note: '', connectorRouting: [] });
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
