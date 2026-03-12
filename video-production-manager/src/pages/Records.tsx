import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, EmptyState } from '@/components/ui';
import { Disc, Plus, Edit2, Trash2, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useRecordAPI, type RecordEntity } from '@/hooks/useRecordAPI';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { useProductionEvents } from '@/hooks/useProductionEvents';
import { IOPortsPanel, type DevicePortDraft } from '@/components/IOPortsPanel';
import { FormatFormModal } from '@/components/FormatFormModal';
import { apiClient } from '@/services';
import type { Format } from '@/types';

const RECORDING_FORMATS = [
  'ProRes 4444 XQ', 'ProRes 4444', 'ProRes 422 HQ', 'ProRes 422', 'ProRes 422 LT', 'ProRes 422 Proxy',
  'DNxHD 220x', 'DNxHD 220', 'DNxHD 145', 'DNxHD 36',
  'H.264', 'H.265 / HEVC',
  'BRAW 12:1', 'BRAW 8:1', 'BRAW 5:1', 'BRAW 3:1',
];

export default function Records() {
  const oldStore = useProductionStore();
  const { activeProject } = useProjectStore();
  const productionId = activeProject?.production?.id || oldStore.production?.id;
  const recordsAPI = useRecordAPI();
  const equipmentLib = useEquipmentLibrary();

  const equipmentSpecs =
    equipmentLib.equipmentSpecs.length > 0 ? equipmentLib.equipmentSpecs : oldStore.equipmentSpecs;

  // ── State ─────────────────────────────────────────────────────────────
  const [records, setRecords]           = useState<RecordEntity[]>([]);
  const [formats, setFormats]           = useState<Format[]>([]);
  const [cardPorts, setCardPorts]       = useState<Record<string, DevicePortDraft[]>>({});
  const [expandedUuid, setExpandedUuid] = useState<string | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen]               = useState(false);
  const [editingUuid, setEditingUuid]               = useState<string | null>(null);
  const [editingVersion, setEditingVersion]         = useState<number | undefined>(undefined);
  const [devicePorts, setDevicePorts]               = useState<DevicePortDraft[]>([]);
  const [portsLoading, setPortsLoading]             = useState(false);
  const [isCreateFormatOpen, setIsCreateFormatOpen] = useState(false);
  const [errors, setErrors]                         = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '', manufacturer: '', model: '', format: '', note: '',
    equipmentUuid: undefined as string | undefined,
  });

  // ── Bootstrap ────────────────────────────────────────────────────────
  useEffect(() => { equipmentLib.fetchFromAPI(); }, []);

  useEffect(() => {
    if (productionId && oldStore.isConnected) {
      recordsAPI.fetchRecords(productionId).then(setRecords).catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);

  useEffect(() => {
    apiClient.get<Format[]>('/formats').then(setFormats).catch(console.error);
  }, []);

  useEffect(() => {
    records.forEach(r => {
      if (!cardPorts[r.uuid]) {
        apiClient.get<any[]>(`/device-ports/device/${r.uuid}`)
          .then(ports => setCardPorts(prev => ({ ...prev, [r.uuid]: ports })))
          .catch(() => {});
      }
    });
  }, [records]);

  // ── WebSocket ────────────────────────────────────────────────────────
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback((event) => {
      if (event.entityType === 'record') {
        setRecords(prev => prev.some(r => r.uuid === event.entity.uuid) ? prev : [...prev, event.entity]);
      }
    }, []),
    onEntityUpdated: useCallback((event) => {
      if (event.entityType === 'record') {
        setRecords(prev => prev.map(r => r.uuid === event.entity.uuid ? event.entity : r));
      }
    }, []),
    onEntityDeleted: useCallback((event) => {
      if (event.entityType === 'record') {
        setRecords(prev => prev.filter(r => r.uuid !== event.entityId));
      }
    }, []),
  });

  // ── Equipment helpers ─────────────────────────────────────────────────
  const recorderSpecs = useMemo(
    () => equipmentSpecs.filter(s => s.category?.toLowerCase() === 'recorder'),
    [equipmentSpecs]
  );
  const manufacturers = useMemo(
    () => [...new Set(recorderSpecs.map(s => s.manufacturer))].sort(),
    [recorderSpecs]
  );
  const modelsByMfr = useMemo(() => {
    const result: Record<string, string[]> = {};
    manufacturers.forEach(m => {
      result[m] = recorderSpecs.filter(s => s.manufacturer === m).map(s => s.model).sort();
    });
    return result;
  }, [manufacturers, recorderSpecs]);

  const buildPortDrafts = (spec: any): DevicePortDraft[] => {
    const ioPorts = spec.equipment_io_ports || [];
    if (ioPorts.length > 0) {
      return ioPorts.map((p: any) => ({
        specPortUuid: p.uuid,
        portLabel: p.label || p.id,
        ioType: p.io_type,
        direction: p.port_type as 'INPUT' | 'OUTPUT',
        formatUuid: null,
        note: null,
      }));
    }
    return [
      ...(spec.inputs  || []).map((p: any) => ({ portLabel: p.label, ioType: p.type, direction: 'INPUT'  as const, formatUuid: null, note: null })),
      ...(spec.outputs || []).map((p: any) => ({ portLabel: p.label, ioType: p.type, direction: 'OUTPUT' as const, formatUuid: null, note: null })),
    ];
  };

  const generateId = (): string => {
    const count = records.length;
    return `REC ${count + 1}`;
  };

  // ── Handlers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingUuid(null);
    setEditingVersion(undefined);
    setDevicePorts([]);
    setErrors([]);
    setFormData({ name: '', manufacturer: '', model: '', format: '', note: '', equipmentUuid: undefined });
    setIsModalOpen(true);
  };

  const handleEdit = async (rec: RecordEntity) => {
    const spec = recorderSpecs.find(s => s.uuid === rec.equipmentUuid);
    setEditingUuid(rec.uuid);
    setEditingVersion(rec.version);
    setErrors([]);
    setFormData({
      name: rec.name,
      manufacturer: spec?.manufacturer || rec.manufacturer || '',
      model: spec?.model || rec.model || '',
      format: rec.format || '',
      note: rec.note || '',
      equipmentUuid: rec.equipmentUuid,
    });
    setPortsLoading(true);
    setIsModalOpen(true);
    try {
      const ports = await apiClient.get<any[]>(`/device-ports/device/${rec.uuid}`);
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

  const handleModelChange = (model: string) => {
    const spec = recorderSpecs.find(s => s.manufacturer === formData.manufacturer && s.model === model);
    setFormData(prev => ({ ...prev, model, equipmentUuid: spec?.uuid }));
    setDevicePorts(spec ? buildPortDrafts(spec) : []);
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm('Delete this recorder?')) return;
    try {
      await recordsAPI.deleteRecord(uuid);
      setRecords(prev => prev.filter(r => r.uuid !== uuid));
    } catch {
      alert('Failed to delete recorder. Please try again.');
    }
  };

  const handleSave = async (action: 'close' | 'duplicate' = 'close') => {
    if (!formData.name || !productionId) { setErrors(['Name is required']); return; }
    setErrors([]);
    try {
      const payload = {
        productionId,
        name:          formData.name,
        manufacturer:  formData.manufacturer  || undefined,
        model:         formData.model         || undefined,
        format:        formData.format        || undefined,
        equipmentUuid: formData.equipmentUuid || undefined,
        note:          formData.note          || undefined,
        version:       editingVersion,
      };

      let savedUuid: string;
      if (editingUuid) {
        const updated = await recordsAPI.updateRecord(editingUuid, payload);
        if ('error' in updated) { setErrors(['Version conflict. Please refresh and try again.']); return; }
        setRecords(prev => prev.map(r => r.uuid === editingUuid ? updated : r));
        savedUuid = editingUuid;
      } else {
        const created = await recordsAPI.createRecord({ ...payload, id: generateId() });
        setRecords(prev => prev.some(r => r.uuid === created.uuid) ? prev : [...prev, created]);
        savedUuid = created.uuid;
      }

      if (devicePorts.length > 0) {
        await apiClient.post(`/device-ports/device/${savedUuid}/sync`, { productionId, ports: devicePorts });
        const fresh = await apiClient.get<any[]>(`/device-ports/device/${savedUuid}`);
        setCardPorts(prev => ({ ...prev, [savedUuid]: fresh }));
      }

      if (action === 'duplicate') {
        setEditingUuid(null);
        setEditingVersion(undefined);
        setFormData(prev => ({ ...prev }));
        setDevicePorts([...devicePorts]);
      } else {
        setIsModalOpen(false);
        setFormData({ name: '', manufacturer: '', model: '', format: '', note: '', equipmentUuid: undefined });
        setDevicePorts([]);
        setEditingUuid(null);
      }
    } catch {
      setErrors(['Failed to save recorder. Please try again.']);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-av-text">Records</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Recorder
        </button>
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={Disc}
          title="No Recorders Yet"
          description="Add your first recording destination"
          actionLabel="Add Recorder"
          onAction={openAdd}
        />
      ) : (
        <div className="grid gap-3">
          {records.map(rec => {
            const ports      = (cardPorts[rec.uuid] ?? []) as any[];
            const isExpanded = expandedUuid === rec.uuid;
            const spec       = recorderSpecs.find(s => s.uuid === rec.equipmentUuid);
            const displayMfr = spec?.manufacturer || rec.manufacturer;
            const displayMdl = spec?.model        || rec.model;

            return (
              <Card key={rec.uuid} className="p-4">
                <div
                  className="grid items-center gap-3 cursor-pointer"
                  style={{ gridTemplateColumns: '30fr 30fr 30fr 10fr' }}
                  onClick={() => setExpandedUuid(isExpanded ? null : rec.uuid)}
                  onDoubleClick={(e) => { e.stopPropagation(); handleEdit(rec); }}
                >
                  {/* Col 1: chevron + ID + name */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-av-text-muted flex-shrink-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                    <Disc className="w-4 h-4 text-av-accent flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="font-semibold text-av-text">{rec.id}</span>
                      {rec.name && rec.name !== rec.id && (
                        <span className="text-xs text-av-text-muted italic ml-1.5">{rec.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Col 2: manufacturer + model */}
                  <div className="text-sm text-av-text-muted truncate">
                    {displayMfr && displayMdl
                      ? `${displayMfr} ${displayMdl}`
                      : displayMfr || displayMdl || <span className="italic">No equipment</span>}
                  </div>

                  {/* Col 3: format badge + port count */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {rec.format && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-av-accent/15 text-av-accent">
                        {rec.format}
                      </span>
                    )}
                    {ports.length > 0 && (
                      <span className="text-xs text-av-text-muted">
                        {ports.filter(p => p.direction === 'INPUT').length}in · {ports.filter(p => p.direction === 'OUTPUT').length}out
                      </span>
                    )}
                    {rec.note && (
                      <span className="text-xs text-av-text-muted truncate">{rec.note}</span>
                    )}
                  </div>

                  {/* Col 4: actions */}
                  <div className="flex gap-1 justify-end items-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(rec)}
                      className="p-1.5 rounded hover:bg-av-surface-hover text-av-text-muted hover:text-av-text transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { handleEdit(rec).then(() => { setEditingUuid(null); setEditingVersion(undefined); }); }}
                      className="p-1.5 rounded hover:bg-av-surface-hover text-av-text-muted hover:text-av-text transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(rec.uuid)}
                      className="p-1.5 rounded hover:bg-av-surface-hover text-av-danger/70 hover:text-av-danger transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Revealed I/O ports */}
                {isExpanded && (
                  <div className="mt-3 pl-6 border-t border-av-border pt-3">
                    {displayMfr && displayMdl && (
                      <p className="text-xs font-medium text-av-text-muted mb-2">{displayMfr} {displayMdl}</p>
                    )}
                    {ports.length === 0 ? (
                      <p className="text-xs text-av-text-muted italic">No ports configured.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-av-text-muted">
                            <th className="text-left pb-1 pr-3 w-10" />
                            <th className="text-left pb-1 pr-3">Type</th>
                            <th className="text-left pb-1 pr-3">Label</th>
                            <th className="text-left pb-1">Format</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ports.filter(p => p.direction === 'INPUT').map((p: any, i: number) => (
                            <tr key={`in-${i}`} className="hover:bg-av-surface-hover/40">
                              <td className="py-1 pr-3"><span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-warning/15 text-av-warning">IN</span></td>
                              <td className="py-1 pr-3 font-mono text-av-text-muted">{p.ioType}</td>
                              <td className="py-1 pr-3 text-av-text">{p.portLabel}</td>
                              <td className="py-1 text-av-info">{p.formatUuid ? (formats.find(f => f.uuid === p.formatUuid)?.id ?? '—') : '—'}</td>
                            </tr>
                          ))}
                          {ports.filter(p => p.direction === 'OUTPUT').map((p: any, i: number) => (
                            <tr key={`out-${i}`} className="hover:bg-av-surface-hover/40">
                              <td className="py-1 pr-3"><span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-accent/15 text-av-accent">OUT</span></td>
                              <td className="py-1 pr-3 font-mono text-av-text-muted">{p.ioType}</td>
                              <td className="py-1 pr-3 text-av-text">{p.portLabel}</td>
                              <td className="py-1 text-av-info">{p.formatUuid ? (formats.find(f => f.uuid === p.formatUuid)?.id ?? '—') : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-av-surface border border-av-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Sticky header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-av-border flex-shrink-0">
              <h2 className="text-xl font-bold text-av-text">{editingUuid ? 'Edit Recorder' : 'Add Recorder'}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                <button onClick={() => handleSave('duplicate')} className="btn-secondary">
                  {editingUuid ? 'Save & Duplicate' : 'Save & Add Another'}
                </button>
                <button onClick={() => handleSave('close')} className="btn-primary">
                  {editingUuid ? 'Save Changes' : 'Add Recorder'}
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-6">
              {errors.length > 0 && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
                  {errors.map((e, i) => <p key={i} className="text-sm text-red-400">{e}</p>)}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-av-text mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="input-field w-full"
                    placeholder="e.g. Main Recorder"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-av-text mb-1">Manufacturer</label>
                  <select
                    value={formData.manufacturer}
                    onChange={e => {
                      setFormData(p => ({ ...p, manufacturer: e.target.value, model: '', equipmentUuid: undefined }));
                      setDevicePorts([]);
                    }}
                    className="input-field w-full"
                  >
                    <option value="">Select manufacturer…</option>
                    {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {formData.manufacturer && (
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-1">Model</label>
                    <select
                      value={formData.model}
                      onChange={e => handleModelChange(e.target.value)}
                      className="input-field w-full"
                    >
                      <option value="">Select model…</option>
                      {(modelsByMfr[formData.manufacturer] || []).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-av-text mb-1">Recording Format</label>
                  <select
                    value={formData.format}
                    onChange={e => setFormData(p => ({ ...p, format: e.target.value }))}
                    className="input-field w-full"
                  >
                    <option value="">Select format…</option>
                    {RECORDING_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                {(devicePorts.length > 0 || portsLoading) && (
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-2">I/O Ports</label>
                    <IOPortsPanel
                      ports={devicePorts}
                      onChange={setDevicePorts}
                      formats={formats}
                      isLoading={portsLoading}
                      onCreateCustomFormat={() => setIsCreateFormatOpen(true)}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-av-text mb-1">Notes</label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={e => setFormData(p => ({ ...p, note: e.target.value }))}
                    className="input-field w-full"
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            </div>
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
