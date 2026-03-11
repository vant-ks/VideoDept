import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Edit2, Trash2, Copy, AlertCircle, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { useSourcesAPI } from '@/hooks/useSourcesAPI';
import { useProductionEvents } from '@/hooks/useProductionEvents';
import { apiClient } from '@/services';
import { getCurrentUserId } from '@/utils/userUtils';
import type { Source, Format } from '@/types';
import { IOPortsPanel, type DevicePortDraft } from '@/components/IOPortsPanel';
import { FormatFormModal, displayFormatId } from '@/components/FormatFormModal';

interface ComputerFormFields {
  name?: string;
  type?: string;
  secondaryDevice?: string;
  secondaryDevicePort?: string;
  primaryDevicePort?: string;
  note?: string;
  equipmentUuid?: string;
  version?: number;
}

export const Computers: React.FC = () => {
  const { activeProject } = useProjectStore();
  const oldStore = useProductionStore();
  const equipmentLib = useEquipmentLibrary();
  const sourcesAPI = useSourcesAPI();

  const [sources, setSources] = useState<Source[]>([]);
  const [conflictError, setConflictError] = useState<{
    currentVersion: number;
    clientVersion: number;
    serverData: Source;
  } | null>(null);

  const productionId = activeProject?.production?.id || oldStore.production?.id;

  // Equipment specs — prefer library store over legacy store
  const equipmentSpecs = equipmentLib.equipmentSpecs.length > 0
    ? equipmentLib.equipmentSpecs
    : oldStore.equipmentSpecs;

  const computerEquipment = useMemo(
    () => equipmentSpecs.filter(spec => spec.category === 'computer'),
    [equipmentSpecs]
  );

  const secondaryDeviceOptions = useMemo(
    () => equipmentSpecs.filter(spec => spec.isSecondaryDevice),
    [equipmentSpecs]
  );

  // Fetch equipment specs on mount
  useEffect(() => {
    if (equipmentLib.equipmentSpecs.length === 0) {
      equipmentLib.fetchFromAPI();
    }
  }, []);

  // Load computers from API on mount
  useEffect(() => {
    if (productionId && oldStore.isConnected) {
      sourcesAPI.fetchSources(productionId)
        .then(allSources => {
          setSources(allSources.filter((s: Source) => s.category === 'COMPUTER'));
        })
        .catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);

  // Sort by COMP # for consistent visual ordering
  const sortedSources = useMemo(() => {
    return [...sources].sort((a, b) => {
      const aMatch = a.id.match(/^COMP\s*(\d+)$/i);
      const bMatch = b.id.match(/^COMP\s*(\d+)$/i);
      const aNum = aMatch ? parseInt(aMatch[1], 10) : Infinity;
      const bNum = bMatch ? parseInt(bMatch[1], 10) : Infinity;
      if (aNum !== bNum) return aNum - bNum;
      return a.id.localeCompare(b.id);
    });
  }, [sources]);

  // Real-time WebSocket event subscriptions
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback((event: any) => {
      if (event.entityType === 'source' && event.entity.category === 'COMPUTER') {
        console.log('🔔 Computer created by', event.userName);
        setSources(prev => {
          if (prev.some((s: Source) => s.uuid === event.entity.uuid)) return prev;
          return [...prev, event.entity];
        });
      }
    }, []),
    onEntityUpdated: useCallback((event: any) => {
      if (event.entityType === 'source' && event.entity.category === 'COMPUTER') {
        console.log('🔔 Computer updated by', event.userName);
        setSources(prev => prev.map((s: Source) =>
          s.uuid === event.entity.uuid ? event.entity : s
        ));
      }
    }, []),
    onEntityDeleted: useCallback((event: any) => {
      if (event.entityType === 'source') {
        console.log('🔔 Computer deleted by', event.userName);
        setSources(prev => prev.filter((s: Source) => s.uuid !== event.entityId));
      }
    }, [])
  });

  // ── Drag-to-reorder ──────────────────────────────────────────────────────
  const isDragInProgress = useRef(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ── Reveal panel state ───────────────────────────────────────────────────
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [cardPorts, setCardPorts] = useState<Record<string, DevicePortDraft[]>>({});
  const [cardPortsLoading, setCardPortsLoading] = useState<Set<string>>(new Set());
  const [formats, setFormats] = useState<Format[]>([]);

  useEffect(() => {
    apiClient.get('/formats')
      .then((res: any) => { if (Array.isArray(res)) setFormats(res); })
      .catch(() => {});
  }, []);

  const toggleReveal = useCallback(async (uuid: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(uuid)) { next.delete(uuid); } else { next.add(uuid); }
      return next;
    });
    if (!cardPorts[uuid]) {
      setCardPortsLoading(prev => new Set(prev).add(uuid));
      try {
        const ports = await apiClient.get<any[]>(`/device-ports/device/${uuid}`);
        setCardPorts(prev => ({
          ...prev,
          [uuid]: Array.isArray(ports)
            ? ports.map((p: any) => ({
                uuid:         p.uuid,
                specPortUuid: p.specPortUuid,
                portLabel:    p.portLabel,
                ioType:       p.ioType,
                direction:    p.direction as 'INPUT' | 'OUTPUT',
                formatUuid:   p.formatUuid ?? null,
                note:         p.note ?? null,
              }))
            : [],
        }));
      } catch {
        setCardPorts(prev => ({ ...prev, [uuid]: [] }));
      } finally {
        setCardPortsLoading(prev => { const s = new Set(prev); s.delete(uuid); return s; });
      }
    }
  }, [cardPorts]);

  // ── Modal state ──────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [formData, setFormData] = useState<ComputerFormFields>({
    name: '', type: '', secondaryDevice: '', secondaryDevicePort: '', primaryDevicePort: '', note: '', equipmentUuid: undefined,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [devicePorts, setDevicePorts] = useState<DevicePortDraft[]>([]);
  const [portsLoading, setPortsLoading] = useState(false);
  const [isCreateFormatOpen, setIsCreateFormatOpen] = useState(false);

  // ── ID generation ────────────────────────────────────────────────────────
  const generateId = useCallback((): string => {
    const numbers = sources.map(s => {
      const m = s.id.match(/^COMP\s*(\d+)$/i);
      return m ? parseInt(m[1], 10) : 0;
    }).filter(n => n > 0);
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `COMP ${max + 1}`;
  }, [sources]);

  // ── I/O helpers ──────────────────────────────────────────────────────────
  const buildPortsFromSpec = (spec: { inputs?: any[]; outputs?: any[] }): DevicePortDraft[] => [
    ...(spec.inputs || []).map((p: any) => ({
      portLabel: p.label || p.id || p.type,
      ioType:    p.type || p.id,
      direction: 'INPUT' as const,
    })),
    ...(spec.outputs || []).map((p: any) => ({
      portLabel: p.label || p.id || p.type,
      ioType:    p.type || p.id,
      direction: 'OUTPUT' as const,
    })),
  ];

  const handleTypeChange = (typeValue: string) => {
    const spec = computerEquipment.find(s => s.model === typeValue);
    setFormData(prev => ({ ...prev, type: typeValue, equipmentUuid: spec?.uuid }));
    if (spec) setDevicePorts(buildPortsFromSpec(spec));
  };

  // ── CRUD handlers ────────────────────────────────────────────────────────
  const handleAddNew = () => {
    const defaultSpec = computerEquipment.length > 0 ? computerEquipment[0] : null;
    setFormData({
      name: '',
      type: defaultSpec?.model || '',
      secondaryDevice: '',
      secondaryDevicePort: '',
      primaryDevicePort: '',
      note: '',
      equipmentUuid: defaultSpec?.uuid,
    });
    setDevicePorts(defaultSpec ? buildPortsFromSpec(defaultSpec) : []);
    setEditingSource(null);
    setErrors([]);
    setIsModalOpen(true);
  };

  const handleEdit = (source: Source) => {
    const record = source as any;
    setFormData({
      name: record.name || '',
      type: record.type || '',
      secondaryDevice: record.secondaryDevice || '',
      secondaryDevicePort: record.secondaryDevicePort || '',
      primaryDevicePort: record.primaryDevicePort || '',
      note: record.note || '',
      equipmentUuid: record.equipmentUuid,
      version: record.version,
    });
    setDevicePorts([]);
    setEditingSource(source);
    setErrors([]);
    setIsModalOpen(true);
    if (record.uuid) {
      setPortsLoading(true);
      apiClient.get<any[]>(`/device-ports/device/${record.uuid}`)
        .then((ports: any) => {
          const portArray = Array.isArray(ports) ? ports : (ports?.data ?? []);
          if (portArray.length > 0) {
            setDevicePorts(portArray.map((p: any) => ({
              uuid:         p.uuid,
              specPortUuid: p.specPortUuid,
              portLabel:    p.portLabel,
              ioType:       p.ioType,
              direction:    p.direction as 'INPUT' | 'OUTPUT',
              formatUuid:   p.formatUuid ?? null,
              note:         p.note ?? null,
            })));
          } else {
            // Seed from equipment spec if no ports saved yet
            const spec = computerEquipment.find(s => s.model === record.type);
            if (spec) setDevicePorts(buildPortsFromSpec(spec));
          }
        })
        .catch(console.error)
        .finally(() => setPortsLoading(false));
    }
  };

  const handleSave = async (action: 'close' | 'duplicate' = 'close') => {
    const newErrors: string[] = [];
    if (!formData.name?.trim()) newErrors.push('Name is required');
    if (!formData.type?.trim()) newErrors.push('Computer Type is required');
    if (newErrors.length > 0) { setErrors(newErrors); return; }

    setConflictError(null);
    try {
      let savedUuid: string | undefined;
      let savedId: string | undefined;

      if (editingSource?.uuid) {
        const result = await sourcesAPI.updateSource(editingSource.uuid, {
          id: editingSource.id,
          productionId,
          name: formData.name,
          type: formData.type,
          category: 'COMPUTER',
          secondaryDevice: formData.secondaryDevice || undefined,
          secondaryDevicePort: formData.secondaryDevicePort || undefined,
          primaryDevicePort: formData.primaryDevicePort || undefined,
          note: formData.note || undefined,
          equipmentUuid: formData.equipmentUuid,
          version: formData.version,
        } as any);
        if ('error' in result && (result as any).error === 'Conflict') {
          setConflictError(result as any);
          return;
        }
        savedUuid = editingSource.uuid;
        savedId = editingSource.id;
      } else {
        const newId = generateId();
        const created = await sourcesAPI.createSource({
          id: newId,
          productionId: productionId!,
          name: formData.name!,
          type: formData.type!,
          category: 'COMPUTER',
          secondaryDevice: formData.secondaryDevice || undefined,
          secondaryDevicePort: formData.secondaryDevicePort || undefined,
          primaryDevicePort: formData.primaryDevicePort || undefined,
          note: formData.note || undefined,
          equipmentUuid: formData.equipmentUuid,
        } as any);
        savedUuid = (created as any)?.uuid;
        savedId = newId;
      }

      if (savedUuid && devicePorts.length > 0) {
        try {
          await apiClient.post(`/device-ports/device/${savedUuid}/sync`, {
            productionId,
            deviceDisplayId: savedId,
            ports: devicePorts,
          });
          setCardPorts(prev => { const next = { ...prev }; delete next[savedUuid!]; return next; });
        } catch (portErr) {
          console.warn('device_ports sync failed (non-fatal):', portErr);
        }
      }

      if (action === 'duplicate') {
        setFormData(prev => ({ ...prev, name: `${prev.name} (Copy)` }));
        setEditingSource(null);
        setDevicePorts(devicePorts.map(p => ({ ...p, uuid: undefined })));
        setErrors([]);
      } else {
        setIsModalOpen(false);
        setFormData({ name: '', type: '', secondaryDevice: '', secondaryDevicePort: '', primaryDevicePort: '', note: '', equipmentUuid: undefined });
        setDevicePorts([]);
        setEditingSource(null);
        setErrors([]);
      }
    } catch (error: any) {
      console.error('Failed to save computer:', error);
      if (error?.response?.data?.code === 'PRODUCTION_NOT_FOUND') {
        setErrors(['Production not synced to database. Please refresh and try again.']);
      } else {
        setErrors([`Failed to save computer: ${error.message || 'Unknown error'}`]);
      }
    }
  };

  const handleDelete = async (uuid: string) => {
    if (confirm('Are you sure you want to delete this computer?')) {
      try {
        await sourcesAPI.deleteSource(uuid);
      } catch (error) {
        console.error('Failed to delete computer:', error);
        alert('Failed to delete computer');
      }
    }
  };

  // ── Drag-to-reorder handlers ─────────────────────────────────────────────
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

    const snapshot = sortedSources.map(s => ({
      uuid: s.uuid as string,
      oldId: s.id,
      version: ((s as any).version ?? 1) as number,
    }));

    const reordered = [...snapshot];
    const [dragged] = reordered.splice(draggedIdx, 1);
    reordered.splice(dragOverIdx, 0, dragged);

    const updates = reordered
      .map((s, i) => ({ ...s, newId: `COMP ${i + 1}` }))
      .filter(u => u.oldId !== u.newId);

    if (updates.length === 0) {
      isDragInProgress.current = false;
      return;
    }

    const { userId, userName } = getCurrentUserId();
    try {
      await Promise.all(
        updates.map(u =>
          apiClient.put(`/computers/${u.uuid}`, {
            id: u.newId,
            version: u.version,
            userId,
            userName,
          })
        )
      );
      if (productionId) {
        const fresh = await sourcesAPI.fetchSources(productionId);
        setSources(fresh.filter((s: Source) => s.category === 'COMPUTER'));
      }
    } catch (err) {
      console.error('❌ Drag renumber failed:', err);
      alert('Failed to renumber computers. Please refresh the page.');
    } finally {
      isDragInProgress.current = false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Conflict Alert */}
      {conflictError && (
        <Card className="p-4 border-av-warning bg-av-warning/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-av-warning mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-av-text mb-1">Conflict Detected</h3>
              <p className="text-sm text-av-text-muted mb-3">
                This computer was modified by another user. Your version: {conflictError.clientVersion}, Current: {conflictError.currentVersion}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setConflictError(null); setEditingSource(null); setIsModalOpen(false); }}
                  className="btn-secondary text-sm"
                >
                  Discard My Changes
                </button>
                <button
                  onClick={() => {
                    setEditingSource({ ...conflictError.serverData, version: conflictError.currentVersion } as Source);
                    setConflictError(null);
                    setIsModalOpen(true);
                  }}
                  className="btn-primary text-sm"
                >
                  Review & Retry
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-av-textPrimary">Computers</h1>
        <button onClick={handleAddNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Computer
        </button>
      </div>

      {/* List */}
      {sortedSources.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold text-av-text mb-2">No Computers Found</h3>
          <p className="text-av-text-muted mb-4">Add your first computer to get started</p>
          <button onClick={handleAddNew} className="btn-primary whitespace-nowrap">Add Computer</button>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedSources.map((source, index) => {
            const sourceUuid = source.uuid;
            const isExpanded = sourceUuid ? expandedSources.has(sourceUuid) : false;
            const isLoadingPorts = sourceUuid ? cardPortsLoading.has(sourceUuid) : false;
            const revealPorts = sourceUuid ? (cardPorts[sourceUuid] ?? []) : [];
            return (
              <Card
                key={source.uuid}
                className={`p-4 transition-colors select-none cursor-pointer
                  ${dragOverIndex === index ? 'border-av-accent bg-av-accent/5' : 'hover:border-av-accent/30'}
                  ${draggedIndex === index ? 'opacity-40' : ''}
                `}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
                onClick={() => sourceUuid && !isDragInProgress.current && toggleReveal(sourceUuid)}
                onDoubleClick={(e) => { e.stopPropagation(); handleEdit(source); }}
              >
                <div
                  className="grid items-center gap-3"
                  style={{ gridTemplateColumns: '14fr 18fr 28fr 24fr 16fr' }}
                >
                  {/* chevron + grip + COMP # */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {sourceUuid ? (
                      isExpanded
                        ? <ChevronUp className="w-4 h-4 text-av-accent flex-shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-av-text-muted flex-shrink-0" />
                    ) : null}
                    <GripVertical
                      className="w-4 h-4 text-av-text-muted cursor-grab flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm font-medium text-av-text truncate">{source.id}</span>
                  </div>

                  {/* NAME */}
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-av-text truncate">{source.name}</h3>
                  </div>

                  {/* NOTE */}
                  <div className="min-w-0">
                    {source.note ? (
                      <p className="text-sm text-av-text-muted line-clamp-2">{source.note}</p>
                    ) : (
                      <p className="text-xs text-av-text-muted/50 italic">No notes</p>
                    )}
                  </div>

                  {/* TYPE + SECONDARY DEVICE */}
                  <div className="flex flex-wrap gap-1.5">
                    {source.type && <Badge>{source.type}</Badge>}
                    {(source as any).secondaryDevice && (
                      <Badge variant="warning">{(source as any).secondaryDevice}</Badge>
                    )}
                  </div>

                  {/* BUTTONS */}
                  <div className="flex gap-1 justify-end items-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(source)}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        // Duplicate: open modal with same data, let user save as a new computer
                        handleEdit({ ...source, uuid: '' } as Source);
                        setEditingSource(null); // treat as new record
                      }}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-info transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(source.uuid)}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ── Reveal Panel ─────────────────────────────────────────────── */}
                {isExpanded && (() => {
                  const specCards = computerEquipment.find(s => s.uuid === (source as any).equipmentUuid)?.cards ?? [];
                  return (
                  <div className="mt-4 border-t border-av-border pt-4 space-y-4">
                    {/* Direct I/O ports */}
                    {isLoadingPorts ? (
                      <p className="text-xs text-av-text-muted italic">Loading ports…</p>
                    ) : revealPorts.length === 0 ? (
                      <p className="text-xs text-av-text-muted italic">
                        No ports configured. Open Edit to assign ports.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-av-text-muted uppercase tracking-wide border-b border-av-border">
                              <th className="text-left pb-1.5 pr-3 font-semibold w-16">Dir</th>
                              <th className="text-left pb-1.5 pr-3 font-semibold">Type</th>
                              <th className="text-left pb-1.5 pr-3 font-semibold">Label</th>
                              <th className="text-left pb-1.5 pr-3 font-semibold">Format</th>
                              <th className="text-left pb-1.5 font-semibold">Route / Note</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-av-border/40">
                            {revealPorts
                              .filter(p => p.direction === 'INPUT')
                              .map((port, i) => (
                                <tr key={`in-${i}`} className="hover:bg-av-surface-hover/40">
                                  <td className="py-1.5 pr-3">
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-warning/15 text-av-warning">IN</span>
                                  </td>
                                  <td className="py-1.5 pr-3 font-mono text-av-text-muted">{port.ioType}</td>
                                  <td className="py-1.5 pr-3 text-av-text">{port.portLabel}</td>
                                  <td className="py-1.5 pr-3 text-av-text-muted">—</td>
                                  <td className="py-1.5 text-av-text-muted">{port.note || '—'}</td>
                                </tr>
                              ))}
                            {revealPorts
                              .filter(p => p.direction === 'OUTPUT')
                              .map((port, i) => {
                                const fmtName = port.formatUuid
                                  ? displayFormatId(formats.find(f => f.uuid === port.formatUuid)?.id ?? port.formatUuid!)
                                  : '—';
                                return (
                                  <tr key={`out-${i}`} className="hover:bg-av-surface-hover/40">
                                    <td className="py-1.5 pr-3">
                                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-accent/15 text-av-accent">OUT</span>
                                    </td>
                                    <td className="py-1.5 pr-3 font-mono text-av-text-muted">{port.ioType}</td>
                                    <td className="py-1.5 pr-3 text-av-text">{port.portLabel}</td>
                                    <td className="py-1.5 pr-3 text-av-info">{fmtName}</td>
                                    <td className="py-1.5 text-av-text-muted">{port.note || '—'}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Expansion cards from spec */}
                    {specCards.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-av-text-muted uppercase tracking-wide mb-2">
                          Expansion I/O — {specCards.length} card{specCards.length !== 1 ? 's' : ''}
                        </p>
                        <div className="space-y-2">
                          {specCards.map((card, ci) => (
                            <div key={card.id} className="border border-av-border rounded-md p-2">
                              <p className="text-xs font-medium text-av-text mb-1.5">Card {card.slotNumber}</p>
                              <table className="w-full text-xs">
                                <tbody className="divide-y divide-av-border/40">
                                  {card.inputs.map((p, pi) => (
                                    <tr key={`c${ci}-in-${pi}`} className="hover:bg-av-surface-hover/40">
                                      <td className="py-1 pr-3 w-14">
                                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-warning/15 text-av-warning">IN</span>
                                      </td>
                                      <td className="py-1 pr-3 font-mono text-av-text-muted">{p.type}</td>
                                      <td className="py-1 text-av-text">{p.label || p.id}</td>
                                    </tr>
                                  ))}
                                  {card.outputs.map((p, pi) => (
                                    <tr key={`c${ci}-out-${pi}`} className="hover:bg-av-surface-hover/40">
                                      <td className="py-1 pr-3 w-14">
                                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-accent/15 text-av-accent">OUT</span>
                                      </td>
                                      <td className="py-1 pr-3 font-mono text-av-text-muted">{p.type}</td>
                                      <td className="py-1 text-av-text">{p.label || p.id}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })()}
              </Card>
            );
          })}
        </div>
      )}

      {/* Results count */}
      {sortedSources.length > 0 && (
        <div className="text-center text-sm text-av-text-muted">
          {sortedSources.length} computer{sortedSources.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* ── Inline Modal ──────────────────────────────────────────────────── */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-av-surface border border-av-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-av-border">
                <h2 className="text-2xl font-bold text-av-text">
                  {editingSource ? 'Edit Computer' : 'Add New Computer'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({ name: '', type: '', secondaryDevice: '', secondaryDevicePort: '', primaryDevicePort: '', note: '', equipmentUuid: undefined });
                    setDevicePorts([]);
                    setErrors([]);
                    setEditingSource(null);
                  }}
                  className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-text transition-colors"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); handleSave('close'); }}
                className="p-6 space-y-4"
              >
                {errors.length > 0 && (
                  <div className="p-3 rounded-md bg-av-danger/10 border border-av-danger/30">
                    {errors.map((err, i) => (
                      <p key={i} className="text-sm text-av-danger">{err}</p>
                    ))}
                  </div>
                )}

                {/* Row 1: Name + Computer Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-2">
                      Name <span className="text-av-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="input-field w-full"
                      placeholder="e.g., Main Presentation Laptop"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-2">
                      Computer Type <span className="text-av-danger">*</span>
                    </label>
                    <select
                      value={formData.type || ''}
                      onChange={(e) => handleTypeChange(e.target.value)}
                      className="input-field w-full"
                    >
                      {computerEquipment.length === 0 && (
                        <option value="">No equipment specs found</option>
                      )}
                      {computerEquipment.map(spec => (
                        <option key={spec.id} value={spec.model}>
                          {spec.manufacturer} {spec.model}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* I/O Ports Panel — shown when type is selected, ports exist, or loading */}
                {(portsLoading || devicePorts.length > 0 || formData.type) && (
                  <IOPortsPanel
                    ports={devicePorts}
                    onChange={setDevicePorts}
                    formats={formats}
                    isLoading={portsLoading}
                    emptyText={formData.type ? 'No spec ports found for this type. Add ports manually.' : undefined}
                    onCreateCustomFormat={() => setIsCreateFormatOpen(true)}
                  />
                )}

                {/* Secondary Device */}
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Secondary Device
                  </label>
                  <select
                    value={formData.secondaryDevice || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, secondaryDevice: e.target.value }))}
                    className="input-field w-full"
                  >
                    <option value="">None</option>
                    {secondaryDeviceOptions.map(spec => (
                      <option key={spec.id} value={`${spec.manufacturer} ${spec.model}`}>
                        {spec.manufacturer} {spec.model} ({spec.category})
                      </option>
                    ))}
                  </select>
                </div>

                {formData.secondaryDevice && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-av-text mb-2">
                        Secondary Device Port
                      </label>
                      <input
                        type="text"
                        value={formData.secondaryDevicePort || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, secondaryDevicePort: e.target.value }))}
                        className="input-field w-full"
                        placeholder="e.g., HDMI In 1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-av-text mb-2">
                        Primary Device Port
                      </label>
                      <select
                        value={formData.primaryDevicePort || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, primaryDevicePort: e.target.value }))}
                        className="input-field w-full"
                      >
                        <option value="">— select port —</option>
                        {devicePorts.map((p, i) => (
                          <option key={i} value={p.portLabel}>
                            [{p.direction === 'INPUT' ? 'IN' : 'OUT'}] {p.portLabel} ({p.ioType})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">Notes</label>
                  <textarea
                    value={formData.note || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                    className="input-field w-full"
                    rows={3}
                    placeholder="Additional notes about this computer..."
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => handleSave('close')}
                    className="btn-primary flex-1"
                  >
                    Save & Close
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave('duplicate')}
                    className="btn-secondary flex-1"
                  >
                    Save & Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setFormData({ name: '', type: '', secondaryDevice: '', secondaryDevicePort: '', primaryDevicePort: '', note: '', equipmentUuid: undefined });
                      setDevicePorts([]);
                      setErrors([]);
                      setEditingSource(null);
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Create custom format — modal over modal */}
          <FormatFormModal
            isOpen={isCreateFormatOpen}
            onClose={() => setIsCreateFormatOpen(false)}
            onSaved={(fmt) => { setFormats(prev => [...prev, fmt]); setIsCreateFormatOpen(false); }}
          />
        </>
      )}
    </div>
  );
};
