import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Edit2, Trash2, Copy, Tv2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { useSendsAPI } from '@/hooks/useSendsAPI';
import { useProductionEvents, getSocket } from '@/hooks/useProductionEvents';
import type { EntityEvent } from '@/hooks/useProductionEvents';
import { io as socketIO } from 'socket.io-client';
import { apiClient } from '@/services';
import { getCurrentUserId, getCurrentUserName } from '@/utils/userUtils';
import { IOPortsPanel, DevicePortDraft } from '@/components/IOPortsPanel';
import { FormatFormModal } from '@/components/FormatFormModal';
import type { Send, Format } from '@/types';
import { secondaryDevices as SECONDARY_DEVICE_OPTIONS } from '@/data/sampleData';

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

const MOUNT_OPTIONS = [
  'POLE MOUNT STAND',
  'DSM STAND',
  'TALL DSM STAND',
  'DSM SURROUND',
] as const;

// Form fields collected by the Monitor modal
interface MonitorFormFields {
  id?: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  equipmentUuid?: string;
  monitorType?: MonitorTypeCode | '';  // placement type (drives ID prefix)
  secondaryDevice?: string;            // adapter / converter in signal chain
  mountOptions?: string[];             // support/mount equipment
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
  // Format list for IOPortsPanel
  const [formats, setFormats]             = useState<Format[]>([]);
  // Per-card ports (for the expanded summary)
  const [cardPorts, setCardPorts]         = useState<Record<string, any[]>>({});
  // Per-edit device port drafts
  const [devicePorts, setDevicePorts]     = useState<DevicePortDraft[]>([]);
  const [portsLoading, setPortsLoading]   = useState(false);
  const [isCreateFormatOpen, setIsCreateFormatOpen] = useState(false);
  const [expandedMonitors, setExpandedMonitors] = useState<Set<string>>(new Set());

  // Drag-to-reorder state
  const isDragInProgress = useRef(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Production ID
  const productionId =
    activeProject?.production?.id || oldStore.production?.id;

  // Fetch fresh equipment specs on mount.
  useEffect(() => {
    equipmentLib.fetchFromAPI();
  }, []);

  // Listen for real-time equipment:updated events so port additions/removals
  // in the Equipment page are reflected here without a manual refresh.
  useEffect(() => {
    const handleEquipmentUpdated = () => {
      equipmentLib.fetchFromAPI();
    };
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
      if (ownSocket) {
        ownSocket.off('equipment:updated', handleEquipmentUpdated);
        ownSocket.disconnect();
      }
    };
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

  // Fetch formats for IOPortsPanel
  useEffect(() => {
    apiClient.get<Format[]>('/formats')
      .then(data => setFormats(data))
      .catch(() => {});
  }, []);

  // Fetch device ports for each monitor card
  useEffect(() => {
    localMonitors.forEach(m => {
      const uuid = (m as any).uuid;
      if (!uuid) return;
      apiClient.get<any[]>(`/device-ports/device/${uuid}`)
        .then(ports => setCardPorts(prev => ({ ...prev, [uuid]: ports })))
        .catch(() => {});
    });
  }, [localMonitors]);

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

  // ── Toggle card reveal ─────────────────────────────────────────────────────
  const toggleReveal = useCallback((uuid: string) => {
    setExpandedMonitors(prev => {
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

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleAddNew = () => {
    setFormData({ manufacturer: '', model: '', monitorType: '', secondaryDevice: '', mountOptions: [], note: '' });
    setDevicePorts([]);
    setEditingMonitor(null);
    setErrors([]);
    setIsModalOpen(true);
  };

  const handleModelChange = (model: string) => {
    const spec = monitorSpecs.find(
      s => s.manufacturer === formData.manufacturer && s.model === model
    );
    setFormData({ ...formData, model, equipmentUuid: spec?.uuid });
    setDevicePorts(spec ? buildPortDrafts(spec) : []);
  };

  const handleEdit = async (monitor: Send) => {
    const record = monitor as any;
    const spec = monitorSpecs.find(s => s.uuid === record.equipmentUuid);
    // Derive monitor type from the ID prefix (e.g. "FOH 1" → "FOH")
    const idTypeMatch = record.id.match(/^([A-Za-z]+)\s*\d+$/);
    const typeCodeFromId = idTypeMatch ? idTypeMatch[1].toUpperCase() : '';
    const derivedType = MONITOR_TYPES.find(t => t.code === typeCodeFromId)?.code
      ?? (MONITOR_TYPES.some(t => t.code === record.secondaryDevice) ? (record.secondaryDevice as MonitorTypeCode) : '');
    // If secondaryDevice is a legacy type code (old data), don't show it in the secondary device field
    const isLegacyTypeCode = MONITOR_TYPES.some(t => t.code === record.secondaryDevice);
    setFormData({
      id: record.id,
      name: record.name,
      manufacturer: spec?.manufacturer || '',
      model: spec?.model || '',
      equipmentUuid: record.equipmentUuid,
      monitorType: derivedType as MonitorTypeCode | '',
      secondaryDevice: isLegacyTypeCode ? '' : (record.secondaryDevice || ''),
      mountOptions: record.standard ? record.standard.split(',').filter(Boolean) : [],
      note: record.note || '',
      version: record.version,
    });
    setEditingMonitor(monitor);
    setErrors([]);
    setPortsLoading(true);
    setIsModalOpen(true);
    try {
      const ports = await apiClient.get<any[]>(`/device-ports/device/${record.uuid}`);
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
    if (!formData.monitorType?.trim()) newErrors.push('Monitor type is required');
    if (!formData.manufacturer?.trim()) newErrors.push('Manufacturer is required');
    if (!formData.model?.trim()) newErrors.push('Model is required');
    if (newErrors.length > 0) { setErrors(newErrors); return; }

    const { hRes, vRes, rate } = resolveResolution(formData.manufacturer || '', formData.model || '');

    try {
      let savedUuid: string;
      if (editingMonitor) {
        const uuid = (editingMonitor as any).uuid;
        const result = await sendsAPI.updateSend(uuid, {
          name: formData.name,
          type: 'MONITOR',
          hRes,
          vRes,
          rate,
          standard: formData.mountOptions?.filter(Boolean).join(',') || undefined,
          equipmentUuid: formData.equipmentUuid,
          secondaryDevice: formData.secondaryDevice || undefined,
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
        savedUuid = uuid;
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
          standard: formData.mountOptions?.filter(Boolean).join(',') || undefined,
          equipmentUuid: formData.equipmentUuid,
          secondaryDevice: formData.secondaryDevice || undefined,
          note: formData.note,
        });
        setLocalMonitors(prev =>
          prev.some(m => (m as any).uuid === (created as any).uuid)
            ? prev.map(m => (m as any).uuid === (created as any).uuid ? created : m)
            : [...prev, created]
        );
        savedUuid = (created as any).uuid;
      }

      // Sync device ports
      if (devicePorts.length > 0) {
        await apiClient.post(`/device-ports/device/${savedUuid}/sync`, { productionId, ports: devicePorts });
        const fresh = await apiClient.get<any[]>(`/device-ports/device/${savedUuid}`);
        setCardPorts(prev => ({ ...prev, [savedUuid]: fresh }));
      }

      if (action === 'duplicate') {
        const dupeId = generateId(formData.monitorType || 'MON');
        setFormData({ ...formData, id: dupeId, name: dupeId });
        setDevicePorts([...devicePorts]);
        setEditingMonitor(null);
        setErrors([]);
      } else {
        setIsModalOpen(false);
        setFormData({ manufacturer: '', model: '', monitorType: '', secondaryDevice: '', mountOptions: [], note: '' });
        setDevicePorts([]);
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
            const isExpanded = record.uuid ? expandedMonitors.has(record.uuid) : false;
            const revealPorts = (cardPorts[record.uuid] ?? []) as any[];
            // Derive monitor type label from the ID prefix (e.g. "FOH 1" → "FOH" → "Front-of-House")
            const idTypeMatch = monitor.id.match(/^([A-Za-z]+)\s*\d+$/);
            const typeCodeFromId = idTypeMatch ? idTypeMatch[1].toUpperCase() : '';
            const typeEntry = MONITOR_TYPES.find(t => t.code === typeCodeFromId);
            // Legacy guard: if secondaryDevice is a type code (old data), don't show as secondary device
            const isLegacyTypeCode = MONITOR_TYPES.some(t => t.code === record.secondaryDevice);

            return (
              <Card
                key={record.uuid || monitor.id}
                className={`p-4 transition-colors cursor-pointer select-none ${
                  dragOverIndex === index ? 'border-av-accent/60 bg-av-accent/5' : 'hover:border-av-accent/30'
                } ${draggedIndex === index ? 'opacity-50' : ''}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                onClick={() => record.uuid && !isDragInProgress.current && toggleReveal(record.uuid)}
                onDoubleClick={(e) => { e.stopPropagation(); handleEdit(monitor); }}
              >
                <div
                  className="grid items-center gap-3"
                    style={{ gridTemplateColumns: '30fr 30fr 30fr 10fr' }}
                >
                  {/* ID — chevron + grip + ID + name */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {record.uuid ? (
                      isExpanded
                        ? <ChevronUp className="w-4 h-4 text-av-accent flex-shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-av-text-muted flex-shrink-0" />
                    ) : null}
                    <GripVertical
                      className="w-4 h-4 text-av-text-muted cursor-grab flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="min-w-0">
                      <span className={`text-sm font-semibold ${hasEquipment ? 'text-av-text' : 'text-av-warning'}`}>
                        {monitor.id}
                      </span>
                      {monitor.name && monitor.name !== monitor.id && (
                        <span className="ml-1.5 text-xs font-normal text-av-text-muted italic truncate">
                          {monitor.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* NOTE */}
                  <div className="min-w-0">
                    {record.note ? (
                      <p className="text-xs text-av-text-muted truncate">{record.note}</p>
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
                    {!isLegacyTypeCode && record.secondaryDevice && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-av-info/15 border border-av-info/30 text-av-info font-medium">
                        {record.secondaryDevice}
                      </span>
                    )}
                    {(record.standard ? record.standard.split(',').filter(Boolean) : []).map((opt: string) => (
                      <span key={opt} className="px-1.5 py-0.5 rounded text-[10px] bg-av-surface border border-av-border text-av-text-secondary font-medium">
                        {opt}
                      </span>
                    ))}
                    {!hasEquipment && (
                      <span className="text-[10px] text-av-warning">No equipment</span>
                    )}
                  </div>

                  {/* BUTTONS */}
                  <div className="flex gap-1 justify-end items-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(monitor)}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        handleEdit({ ...monitor, uuid: '' } as Send);
                        setEditingMonitor(null);
                      }}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-info transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(record.uuid)}
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

            {/* ── Sticky header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-av-border flex-shrink-0">
              <h2 className="text-xl font-bold text-av-text">
                {editingMonitor ? 'Edit Monitor' : 'Add Monitor'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({ manufacturer: '', model: '', monitorType: '', secondaryDevice: '', mountOptions: [], note: '' });
                    setDevicePorts([]);
                    setErrors([]);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                {!editingMonitor && (
                  <button onClick={() => handleSave('duplicate')} className="btn-secondary">
                    Save & Add Another
                  </button>
                )}
                {editingMonitor && (
                  <button onClick={() => handleSave('duplicate')} className="btn-secondary">
                    Save & Duplicate
                  </button>
                )}
                <button onClick={() => handleSave('close')} className="btn-primary">
                  {editingMonitor ? 'Save Changes' : 'Add Monitor'}
                </button>
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="overflow-y-auto flex-1 p-6">

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
                    list="monitor-secondary-device-options"
                    value={formData.secondaryDevice || ''}
                    onChange={e => setFormData({ ...formData, secondaryDevice: e.target.value })}
                    placeholder="e.g., HDMI > SDI, BARREL, DECIMATOR"
                    className="input-field w-full"
                  />
                  <datalist id="monitor-secondary-device-options">
                    {SECONDARY_DEVICE_OPTIONS.map(opt => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>

                {/* Support Equipment */}
                <div>
                  <label className="block text-sm font-medium text-av-text-muted mb-2">
                    Support Equipment
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {MOUNT_OPTIONS.map(opt => (
                      <div
                        key={opt}
                        onClick={() => setFormData({
                          ...formData,
                          mountOptions: formData.mountOptions?.includes(opt)
                            ? formData.mountOptions.filter(o => o !== opt)
                            : [...(formData.mountOptions || []), opt]
                        })}
                        className={`cursor-pointer p-3 rounded-md border-2 transition-all ${
                          formData.mountOptions?.includes(opt)
                            ? 'border-av-accent bg-av-accent/10'
                            : 'border-av-border hover:border-av-accent/30'
                        }`}
                      >
                        <span className="text-sm text-av-text">{opt}</span>
                      </div>
                    ))}
                  </div>
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
    </div>
  );
}
