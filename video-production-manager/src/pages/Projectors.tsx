import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Edit2, Trash2, Copy, Projector, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { useProjectionScreenAPI, type ProjectionScreen } from '@/hooks/useProjectionScreenAPI';
import { useProductionEvents, getSocket } from '@/hooks/useProductionEvents';
import type { EntityEvent } from '@/hooks/useProductionEvents';
import { io as socketIO } from 'socket.io-client';
import { apiClient } from '@/services';
import { IOPortsPanel, DevicePortDraft } from '@/components/IOPortsPanel';
import { FormatFormModal } from '@/components/FormatFormModal';
import type { Format } from '@/types';
import { secondaryDevices as SECONDARY_DEVICE_OPTIONS } from '@/data/sampleData';

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

export default function Projectors() {
  const { activeProject } = useProjectStore();
  const equipmentLib = useEquipmentLibrary();
  const oldStore = useProductionStore();
  const projectionScreenAPI = useProjectionScreenAPI();

  const equipmentSpecs =
    equipmentLib.equipmentSpecs.length > 0
      ? equipmentLib.equipmentSpecs
      : oldStore.equipmentSpecs;

  const productionId =
    activeProject?.production?.id || oldStore.production?.id;

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
      if (event.entityType !== 'projectionScreen') return;
      if (isDragInProgress.current) return;
      setLocalProjectors(prev => {
        if (prev.some(p => p.uuid === event.entity.uuid)) return prev;
        return [...prev, event.entity];
      });
    }, []),
    onEntityUpdated: useCallback((event: EntityEvent) => {
      if (event.entityType !== 'projectionScreen') return;
      if (isDragInProgress.current) return;
      setLocalProjectors(prev =>
        prev.map(p => p.uuid === event.entity.uuid ? event.entity : p)
      );
    }, []),
    onEntityDeleted: useCallback((event: EntityEvent) => {
      if (event.entityType !== 'projectionScreen') return;
      setLocalProjectors(prev => prev.filter(p => p.uuid !== event.entityId));
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
          <h1 className="text-3xl font-bold text-av-textPrimary">Projectors</h1>
        </div>
        <button onClick={handleAddNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Projector
        </button>
      </div>

      {/* Cards */}
      {localProjectors.length === 0 ? (
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
    </div>
  );
}
