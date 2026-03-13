import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, EmptyState } from '@/components/ui';
import { Radio, Plus, Edit2, Trash2, Copy, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useStreamAPI, type Stream } from '@/hooks/useStreamAPI';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { useProductionEvents } from '@/hooks/useProductionEvents';
import { IOPortsPanel, type DevicePortDraft } from '@/components/IOPortsPanel';
import { FormatFormModal } from '@/components/FormatFormModal';
import { apiClient } from '@/services';
import type { Format } from '@/types';

const STREAM_PLATFORMS = [
  'YouTube', 'YouTube (Backup)',
  'Facebook Live', 'Instagram Live',
  'Twitch',
  'Vimeo',
  'LinkedIn Live',
  'Zoom',
  'Teams',
  'Custom RTMP',
];

// TODO: Future enhancement — computers with video capture cards, expansion I/O, or
// secondary devices (via isSecondaryDevice) can serve as stream encoders. Add
// 'computer' category support when building that workflow.

interface PlatformFieldConfig {
  urlLabel: string;
  urlPlaceholder: string;
  keyLabel: string;
  keyPlaceholder: string;
  isUrlField: boolean; // false = plain text input (Meeting ID), true = URL input
}

const PLATFORM_FIELD_DEFAULTS: PlatformFieldConfig = {
  urlLabel: 'RTMP URL', urlPlaceholder: 'rtmp://…',
  keyLabel: 'Stream Key', keyPlaceholder: 'xxxx-xxxx-xxxx-xxxx',
  isUrlField: true,
};

const PLATFORM_FIELDS: Record<string, PlatformFieldConfig> = {
  'Zoom':  { urlLabel: 'Meeting ID',  urlPlaceholder: '123 456 7890',                                         keyLabel: 'Passcode', keyPlaceholder: '',         isUrlField: false },
  'Teams': { urlLabel: 'Meeting URL', urlPlaceholder: 'https://teams.microsoft.com/l/meetup-join/…',         keyLabel: 'Password', keyPlaceholder: '',         isUrlField: false },
};

function getPlatformFields(platform?: string): PlatformFieldConfig {
  return PLATFORM_FIELDS[platform ?? ''] ?? PLATFORM_FIELD_DEFAULTS;
}

const PLATFORM_COLORS: Record<string, string> = {
  'YouTube':          'bg-red-500/15 text-red-400',
  'YouTube (Backup)': 'bg-red-500/10 text-red-400/70',
  'Facebook Live':    'bg-blue-500/15 text-blue-400',
  'Instagram Live':   'bg-pink-500/15 text-pink-400',
  'Twitch':           'bg-purple-500/15 text-purple-400',
  'Vimeo':            'bg-teal-500/15 text-teal-400',
  'LinkedIn Live':    'bg-blue-600/15 text-blue-300',
  'Zoom':             'bg-blue-400/15 text-blue-300',
  'Teams':            'bg-indigo-500/15 text-indigo-400',
  'Custom RTMP':      'bg-av-surface text-av-text-muted',
};

export default function Streams() {
  const oldStore = useProductionStore();
  const { activeProject } = useProjectStore();
  const productionId = activeProject?.production?.id || oldStore.production?.id;
  const streamsAPI = useStreamAPI();
  const equipmentLib = useEquipmentLibrary();

  const equipmentSpecs =
    equipmentLib.equipmentSpecs.length > 0 ? equipmentLib.equipmentSpecs : oldStore.equipmentSpecs;

  // ── State ─────────────────────────────────────────────────────────────
  const [streams, setStreams]           = useState<Stream[]>([]);
  const [formats, setFormats]           = useState<Format[]>([]);
  const [cardPorts, setCardPorts]       = useState<Record<string, DevicePortDraft[]>>({});
  const [expandedUuid, setExpandedUuid] = useState<string | null>(null);
  const [showKey, setShowKey]           = useState<Record<string, boolean>>({});

  // Modal
  const [isModalOpen, setIsModalOpen]               = useState(false);
  const [editingUuid, setEditingUuid]               = useState<string | null>(null);
  const [editingVersion, setEditingVersion]         = useState<number | undefined>(undefined);
  const [devicePorts, setDevicePorts]               = useState<DevicePortDraft[]>([]);
  const [portsLoading, setPortsLoading]             = useState(false);
  const [isCreateFormatOpen, setIsCreateFormatOpen] = useState(false);
  const [showModalKey, setShowModalKey]             = useState(false);
  const [errors, setErrors]                         = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '', manufacturer: '', model: '', platform: '', url: '', streamKey: '', note: '',
    equipmentUuid: undefined as string | undefined,
  });

  // ── Bootstrap ────────────────────────────────────────────────────────
  useEffect(() => { equipmentLib.fetchFromAPI(); }, []);

  useEffect(() => {
    if (productionId && oldStore.isConnected) {
      streamsAPI.fetchStreams(productionId).then(setStreams).catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);

  useEffect(() => {
    apiClient.get<Format[]>('/formats').then(setFormats).catch(console.error);
  }, []);

  useEffect(() => {
    streams.forEach(s => {
      if (!cardPorts[s.uuid]) {
        apiClient.get<any[]>(`/device-ports/device/${s.uuid}`)
          .then(ports => setCardPorts(prev => ({ ...prev, [s.uuid]: ports })))
          .catch(() => {});
      }
    });
  }, [streams]);

  // ── WebSocket ────────────────────────────────────────────────────────
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback((event) => {
      if (event.entityType === 'stream') {
        setStreams(prev => prev.some(s => s.uuid === event.entity.uuid) ? prev : [...prev, event.entity]);
      }
    }, []),
    onEntityUpdated: useCallback((event) => {
      if (event.entityType === 'stream') {
        setStreams(prev => prev.map(s => s.uuid === event.entity.uuid ? event.entity : s));
      }
    }, []),
    onEntityDeleted: useCallback((event) => {
      if (event.entityType === 'stream') {
        setStreams(prev => prev.filter(s => s.uuid !== event.entityId));
      }
    }, []),
  });

  // ── Equipment helpers ─────────────────────────────────────────────────
  const encoderSpecs = useMemo(
    () => equipmentSpecs.filter(s => s.category?.toLowerCase() === 'stream-encoder'),
    [equipmentSpecs]
  );
  const manufacturers = useMemo(
    () => [...new Set(encoderSpecs.map(s => s.manufacturer))].sort(),
    [encoderSpecs]
  );
  const modelsByMfr = useMemo(() => {
    const result: Record<string, string[]> = {};
    manufacturers.forEach(m => {
      result[m] = encoderSpecs.filter(s => s.manufacturer === m).map(s => s.model).sort();
    });
    return result;
  }, [manufacturers, encoderSpecs]);

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

  const generateId = (): string => `STR ${streams.length + 1}`;

  // ── Handlers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingUuid(null);
    setEditingVersion(undefined);
    setDevicePorts([]);
    setErrors([]);
    setShowModalKey(false);
    setFormData({ name: '', manufacturer: '', model: '', platform: '', url: '', streamKey: '', note: '', equipmentUuid: undefined });
    setIsModalOpen(true);
  };

  const handleEdit = async (stream: Stream) => {
    const spec = encoderSpecs.find(s => s.uuid === stream.equipmentUuid);
    setEditingUuid(stream.uuid);
    setEditingVersion(stream.version);
    setErrors([]);
    setShowModalKey(false);
    setFormData({
      name:          stream.name,
      manufacturer:  spec?.manufacturer || '',
      model:         spec?.model        || '',
      platform:      stream.platform    || '',
      url:           stream.url         || '',
      streamKey:     stream.streamKey   || '',
      note:          stream.note        || '',
      equipmentUuid: stream.equipmentUuid,
    });
    setPortsLoading(true);
    setIsModalOpen(true);
    try {
      const ports = await apiClient.get<any[]>(`/device-ports/device/${stream.uuid}`);
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
    const spec = encoderSpecs.find(s => s.manufacturer === formData.manufacturer && s.model === model);
    setFormData(prev => ({ ...prev, model, equipmentUuid: spec?.uuid }));
    setDevicePorts(spec ? buildPortDrafts(spec) : []);
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm('Delete this stream?')) return;
    try {
      await streamsAPI.deleteStream(uuid);
      setStreams(prev => prev.filter(s => s.uuid !== uuid));
    } catch {
      alert('Failed to delete stream. Please try again.');
    }
  };

  const handleSave = async (action: 'close' | 'duplicate' = 'close') => {
    if (!formData.name || !productionId) { setErrors(['Name is required']); return; }
    setErrors([]);
    try {
      const payload = {
        productionId,
        name:          formData.name,
        platform:      formData.platform      || undefined,
        url:           formData.url           || undefined,
        streamKey:     formData.streamKey     || undefined,
        equipmentUuid: formData.equipmentUuid || undefined,
        note:          formData.note          || undefined,
        version:       editingVersion,
      };

      let savedUuid: string;
      if (editingUuid) {
        const updated = await streamsAPI.updateStream(editingUuid, payload);
        if ('error' in updated) { setErrors(['Version conflict. Please refresh and try again.']); return; }
        setStreams(prev => prev.map(s => s.uuid === editingUuid ? updated : s));
        savedUuid = editingUuid;
      } else {
        const created = await streamsAPI.createStream({ ...payload, id: generateId() });
        setStreams(prev => prev.some(s => s.uuid === created.uuid) ? prev : [...prev, created]);
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
        setFormData(prev => ({ ...prev, streamKey: '' }));
        setDevicePorts([...devicePorts]);
      } else {
        setIsModalOpen(false);
        setFormData({ name: '', manufacturer: '', model: '', platform: '', url: '', streamKey: '', note: '', equipmentUuid: undefined });
        setDevicePorts([]);
        setEditingUuid(null);
      }
    } catch {
      setErrors(['Failed to save stream. Please try again.']);
    }
  };

  const maskKey = (key: string) => key ? '•'.repeat(Math.min(key.length, 20)) : '';

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-av-text">Streams</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Stream
        </button>
      </div>

      {streams.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No Streams Yet"
          description="Add your first streaming destination"
          actionLabel="Add Stream"
          onAction={openAdd}
        />
      ) : (
        <div className="grid gap-3">
          {streams.map(stream => {
            const ports      = (cardPorts[stream.uuid] ?? []) as any[];
            const isExpanded = expandedUuid === stream.uuid;
            const spec       = encoderSpecs.find(s => s.uuid === stream.equipmentUuid);
            const platformColor = PLATFORM_COLORS[stream.platform || ''] || 'bg-av-surface text-av-text-muted';

            return (
              <Card key={stream.uuid} className="p-4">
                <div
                  className="grid items-center gap-3 cursor-pointer"
                  style={{ gridTemplateColumns: '30fr 30fr 30fr 10fr' }}
                  onClick={() => setExpandedUuid(isExpanded ? null : stream.uuid)}
                  onDoubleClick={(e) => { e.stopPropagation(); handleEdit(stream); }}
                >
                  {/* Col 1: chevron + ID + name */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-av-text-muted flex-shrink-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                    <Radio className="w-4 h-4 text-av-accent flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="font-semibold text-av-text">{stream.id}</span>
                      {stream.name && stream.name !== stream.id && (
                        <span className="text-xs text-av-text-muted italic ml-1.5">{stream.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Col 2: platform badge */}
                  <div className="flex items-center gap-2 min-w-0">
                    {stream.platform ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${platformColor}`}>
                        {stream.platform}
                      </span>
                    ) : (
                      <span className="text-xs text-av-text-muted italic">No platform</span>
                    )}
                  </div>

                  {/* Col 3: encoder model (or URL fallback) */}
                  <div className="text-sm text-av-text-muted truncate">
                    {spec
                      ? `${spec.manufacturer} ${spec.model}`
                      : stream.url
                        ? <span className="font-mono text-xs truncate">{stream.url}</span>
                        : ports.length > 0
                          ? `${ports.filter(p => p.direction === 'INPUT').length}in · ${ports.filter(p => p.direction === 'OUTPUT').length}out`
                          : <span className="italic">No encoder</span>}
                  </div>

                  {/* Col 4: actions */}
                  <div className="flex gap-1 justify-end items-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(stream)}
                      className="p-1.5 rounded hover:bg-av-surface-hover text-av-text-muted hover:text-av-text transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleEdit(stream).then(() => { setEditingUuid(null); setEditingVersion(undefined); })}
                      className="p-1.5 rounded hover:bg-av-surface-hover text-av-text-muted hover:text-av-text transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(stream.uuid)}
                      className="p-1.5 rounded hover:bg-av-surface-hover text-av-danger/70 hover:text-av-danger transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Revealed: stream details + I/O ports */}
                {isExpanded && (
                  <div className="mt-3 pl-6 border-t border-av-border pt-3 space-y-3">
                    {stream.url && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-av-text-muted w-24 flex-shrink-0">{getPlatformFields(stream.platform).urlLabel}</span>
                        <span className="text-xs font-mono text-av-info truncate">{stream.url}</span>
                      </div>
                    )}
                    {stream.streamKey && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-av-text-muted w-24 flex-shrink-0">{getPlatformFields(stream.platform).keyLabel}</span>
                        <span className="text-xs font-mono text-av-text-muted">
                          {showKey[stream.uuid] ? stream.streamKey : maskKey(stream.streamKey)}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); setShowKey(prev => ({ ...prev, [stream.uuid]: !prev[stream.uuid] })); }}
                          className="text-av-text-muted hover:text-av-text transition-colors"
                        >
                          {showKey[stream.uuid] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                    {stream.note && (
                      <p className="text-xs text-av-text-muted">{stream.note}</p>
                    )}
                    {ports.length > 0 && (
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
              <h2 className="text-xl font-bold text-av-text">{editingUuid ? 'Edit Stream' : 'Add Stream'}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                <button onClick={() => handleSave('duplicate')} className="btn-secondary">
                  {editingUuid ? 'Save & Duplicate' : 'Save & Add Another'}
                </button>
                <button onClick={() => handleSave('close')} className="btn-primary">
                  {editingUuid ? 'Save Changes' : 'Add Stream'}
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
                    placeholder="e.g. Main Stream"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-av-text mb-1">Platform</label>
                  <select
                    value={formData.platform}
                    onChange={e => setFormData(p => ({ ...p, platform: e.target.value }))}
                    className="input-field w-full"
                  >
                    <option value="">Select platform…</option>
                    {STREAM_PLATFORMS.map(pl => <option key={pl} value={pl}>{pl}</option>)}
                  </select>
                </div>

                {(() => {
                  const pf = getPlatformFields(formData.platform);
                  return (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-av-text mb-1">{pf.urlLabel}</label>
                        <input
                          type={pf.isUrlField ? 'url' : 'text'}
                          value={formData.url}
                          onChange={e => setFormData(p => ({ ...p, url: e.target.value }))}
                          className="input-field w-full font-mono text-sm"
                          placeholder={pf.urlPlaceholder}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-av-text mb-1">{pf.keyLabel}</label>
                        <div className="relative">
                          <input
                            type={showModalKey ? 'text' : 'password'}
                            value={formData.streamKey}
                            onChange={e => setFormData(p => ({ ...p, streamKey: e.target.value }))}
                            className="input-field w-full pr-10 font-mono text-sm"
                            placeholder={pf.keyPlaceholder || pf.keyLabel}
                            autoComplete="off"
                          />
                          <button
                            type="button"
                            onClick={() => setShowModalKey(p => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-av-text-muted hover:text-av-text transition-colors"
                          >
                            {showModalKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}

                <div>
                  <label className="block text-sm font-medium text-av-text mb-1">Encoder (optional)</label>
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
                    <label className="block text-sm font-medium text-av-text mb-1">Encoder Model</label>
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
