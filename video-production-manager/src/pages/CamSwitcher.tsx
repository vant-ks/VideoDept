import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, EmptyState } from '@/components/ui';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useProductionStore } from '@/hooks/useStore';
import { useCamSwitcherAPI, CamSwitcher as CamSwitcherEntity } from '@/hooks/useCamSwitcherAPI';
import { useProductionEvents } from '@/hooks/useProductionEvents';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { IOPortsPanel, DevicePortDraft } from '@/components/IOPortsPanel';
import { FormatFormModal, displayFormatId } from '@/components/FormatFormModal';
import { apiClient } from '@/services';
import type { Format } from '@/types';
import { Tv2, Plus, Edit2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

export const CamSwitcher: React.FC = () => {
  const { activeProject } = useProjectStore();
  const oldStore = useProductionStore();
  const productionId = activeProject?.production?.id || oldStore.production?.id;

  const camSwitcherAPI = useCamSwitcherAPI();
  const { equipmentSpecs, fetchFromAPI: fetchEquipment } = useEquipmentLibrary();

  const [camSwitchers, setCamSwitchers]       = useState<CamSwitcherEntity[]>([]);
  const [formats, setFormats]                 = useState<Format[]>([]);
  const [cardPorts, setCardPorts]             = useState<Record<string, any[]>>({});
  const [expandedUuid, setExpandedUuid]       = useState<string | null>(null);
  const [devicePorts, setDevicePorts]         = useState<DevicePortDraft[]>([]);
  const [portsLoading, setPortsLoading]       = useState(false);
  const [isCreateFormatOpen, setIsCreateFormatOpen] = useState(false);
  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [editingUuid, setEditingUuid]         = useState<string | null>(null);
  const [editingVersion, setEditingVersion]   = useState<number | undefined>();
  const [formData, setFormData] = useState<{
    name: string; manufacturer: string; model: string;
    equipmentUuid: string | undefined; note: string;
  }>({ name: '', manufacturer: '', model: '', equipmentUuid: undefined, note: '' });

  // Bootstrap
  useEffect(() => { fetchEquipment(); }, []);

  useEffect(() => {
    apiClient.get<Format[]>('/formats')
      .then(data => setFormats(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!productionId) return;
    camSwitcherAPI.getCamSwitchers(productionId).then(setCamSwitchers).catch(() => {});
  }, [productionId]);

  useEffect(() => {
    camSwitchers.forEach(cs => {
      apiClient.get<any[]>(`/device-ports/device/${cs.uuid}`)
        .then(ports => setCardPorts(prev => ({ ...prev, [cs.uuid]: ports })))
        .catch(() => {});
    });
  }, [camSwitchers]);

  // WebSocket
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback((event) => {
      if (event.entityType === 'camSwitcher') {
        setCamSwitchers(prev => prev.some(c => c.uuid === event.entity.uuid) ? prev : [...prev, event.entity]);
      }
    }, []),
    onEntityUpdated: useCallback((event) => {
      if (event.entityType === 'camSwitcher') {
        setCamSwitchers(prev => prev.map(c => c.uuid === event.entity.uuid ? event.entity : c));
      }
    }, []),
    onEntityDeleted: useCallback((event) => {
      if (event.entityType === 'camSwitcher') {
        setCamSwitchers(prev => prev.filter(c => c.uuid !== event.entityId));
      }
    }, []),
  });

  // Equipment helpers
  const switcherSpecs = useMemo(
    () => equipmentSpecs.filter(s => s.category?.toLowerCase() === 'cam-switcher'),
    [equipmentSpecs]
  );
  const manufacturers = useMemo(
    () => [...new Set(switcherSpecs.map(s => s.manufacturer))].sort(),
    [switcherSpecs]
  );
  const modelsByMfr = useMemo(() => {
    const result: Record<string, string[]> = {};
    manufacturers.forEach(m => {
      result[m] = switcherSpecs.filter(s => s.manufacturer === m).map(s => s.model).sort();
    });
    return result;
  }, [manufacturers, switcherSpecs]);

  const buildPortDrafts = (spec: any): DevicePortDraft[] => {
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
  };

  // Handlers
  const handleAdd = () => {
    setEditingUuid(null);
    setEditingVersion(undefined);
    setDevicePorts([]);
    setFormData({ name: '', manufacturer: '', model: '', equipmentUuid: undefined, note: '' });
    setIsModalOpen(true);
  };

  const handleEdit = async (cs: CamSwitcherEntity) => {
    const r = cs as any;
    const spec = switcherSpecs.find(s => s.uuid === r.equipmentUuid);
    setEditingUuid(cs.uuid);
    setEditingVersion(cs.version);
    setFormData({
      name:          cs.name,
      manufacturer:  spec?.manufacturer || r.manufacturer || '',
      model:         spec?.model        || r.model        || '',
      equipmentUuid: r.equipmentUuid,
      note:          r.note || '',
    });
    setPortsLoading(true);
    setIsModalOpen(true);
    try {
      const ports = await apiClient.get<any[]>(`/device-ports/device/${cs.uuid}`);
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
    const spec = switcherSpecs.find(s => s.manufacturer === formData.manufacturer && s.model === model);
    setFormData(prev => ({ ...prev, model, equipmentUuid: spec?.uuid }));
    setDevicePorts(spec ? buildPortDrafts(spec) : []);
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm('Delete this cam switcher?')) return;
    try {
      await camSwitcherAPI.deleteCamSwitcher(uuid);
      setCamSwitchers(prev => prev.filter(c => c.uuid !== uuid));
    } catch {
      alert('Failed to delete cam switcher. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !productionId) return;
    try {
      const payload = {
        productionId,
        name:          formData.name,
        manufacturer:  formData.manufacturer  || undefined,
        model:         formData.model         || undefined,
        equipmentUuid: formData.equipmentUuid || undefined,
        note:          formData.note          || undefined,
        version:       editingVersion,
      };

      let savedUuid: string;
      if (editingUuid) {
        const updated = await camSwitcherAPI.updateCamSwitcher(editingUuid, payload);
        if ('error' in updated) { alert('Version conflict. Please refresh and try again.'); return; }
        setCamSwitchers(prev => prev.map(c => c.uuid === editingUuid ? updated : c));
        savedUuid = editingUuid;
      } else {
        const created = await camSwitcherAPI.createCamSwitcher(payload);
        setCamSwitchers(prev => prev.some(c => c.uuid === created.uuid) ? prev : [...prev, created]);
        savedUuid = created.uuid;
      }

      if (devicePorts.length > 0) {
        await apiClient.post(`/device-ports/device/${savedUuid}/sync`, { productionId, ports: devicePorts });
        const fresh = await apiClient.get<any[]>(`/device-ports/device/${savedUuid}`);
        setCardPorts(prev => ({ ...prev, [savedUuid]: fresh }));
      }

      setIsModalOpen(false);
      setFormData({ name: '', manufacturer: '', model: '', equipmentUuid: undefined, note: '' });
      setDevicePorts([]);
    } catch {
      alert('Failed to save cam switcher. Please try again.');
    }
  };

  // Render
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-av-text">Cam Switchers</h1>
        <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Cam Switcher
        </button>
      </div>

      {camSwitchers.length === 0 ? (
        <EmptyState
          icon={Tv2}
          title="No Cam Switchers Yet"
          description="Add your first camera switcher to start managing camera routing"
          actionLabel="Add Cam Switcher"
          onAction={handleAdd}
        />
      ) : (
        <div className="grid gap-3">
          {camSwitchers.map(cs => {
            const r         = cs as any;
            const ports     = (cardPorts[cs.uuid] ?? []) as any[];
            const isExpanded = expandedUuid === cs.uuid;
            const spec      = switcherSpecs.find(s => s.uuid === r.equipmentUuid);

            return (
              <Card key={cs.uuid} className="p-4">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setExpandedUuid(isExpanded ? null : cs.uuid)}
                >
                  <div className="text-av-text-muted">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  <Tv2 className="w-5 h-5 text-av-info flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-av-text">{cs.id}</span>
                      {cs.name && cs.name !== cs.id && (
                        <span className="text-av-text-muted text-sm">&mdash; {cs.name}</span>
                      )}
                      {spec && <span className="text-sm text-av-text-muted">{spec.manufacturer} {spec.model}</span>}
                    </div>
                    {ports.length > 0 && (
                      <p className="text-xs text-av-text-muted mt-0.5">
                        {ports.filter(p => p.direction === 'INPUT').length} in
                        {' · '}
                        {ports.filter(p => p.direction === 'OUTPUT').length} out
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleEdit(cs)} className="btn-secondary text-sm flex items-center gap-1">
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => handleDelete(cs.uuid)} className="btn-ghost text-sm text-av-danger">Delete</button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 pl-8 border-t border-av-border pt-3">
                    {ports.length === 0 ? (
                      <p className="text-xs text-av-text-muted italic">No ports configured.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-av-text-muted">
                            <th className="text-left pb-1 pr-3 w-10" />
                            <th className="text-left pb-1 pr-3">Type</th>
                            <th className="text-left pb-1 pr-3">Label</th>
                            <th className="text-left pb-1 pr-3">Format</th>
                            <th className="text-left pb-1">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ports.filter(p => p.direction === 'INPUT').map((port: any, i: number) => (
                            <tr key={`in-${i}`} className="hover:bg-av-surface-hover/40">
                              <td className="py-1 pr-3">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-warning/15 text-av-warning">IN</span>
                              </td>
                              <td className="py-1 pr-3 font-mono text-av-text-muted">{port.ioType}</td>
                              <td className="py-1 pr-3 text-av-text">{port.portLabel}</td>
                              <td className="py-1 pr-3 text-av-info">
                                {port.formatUuid ? displayFormatId(formats.find(f => f.uuid === port.formatUuid)?.id ?? port.formatUuid) : '—'}
                              </td>
                              <td className="py-1 text-av-text-muted">{port.note || '—'}</td>
                            </tr>
                          ))}
                          {ports.filter(p => p.direction === 'OUTPUT').map((port: any, i: number) => (
                            <tr key={`out-${i}`} className="hover:bg-av-surface-hover/40">
                              <td className="py-1 pr-3">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-accent/15 text-av-accent">OUT</span>
                              </td>
                              <td className="py-1 pr-3 font-mono text-av-text-muted">{port.ioType}</td>
                              <td className="py-1 pr-3 text-av-text">{port.portLabel}</td>
                              <td className="py-1 pr-3 text-av-info">
                                {port.formatUuid ? displayFormatId(formats.find(f => f.uuid === port.formatUuid)?.id ?? port.formatUuid) : '—'}
                              </td>
                              <td className="py-1 text-av-text-muted">{port.note || '—'}</td>
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
            className="bg-av-surface border border-av-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-av-text mb-6">{editingUuid ? 'Edit' : 'Add'} Cam Switcher</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-av-text mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="input-field w-full"
                    placeholder="e.g. Camera Switcher"
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
              <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-av-border">
                <button onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleSubmit} disabled={!formData.name} className="btn-primary">
                  {editingUuid ? 'Save Changes' : 'Add Cam Switcher'}
                </button>
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
};

export default CamSwitcher;
