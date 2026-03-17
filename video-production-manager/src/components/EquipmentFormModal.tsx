import { useState, useEffect } from 'react';
import { X, Plus, Copy, Archive, ChevronDown } from 'lucide-react';
import type { EquipmentSpec, IOPort } from '@/types';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';

interface EquipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (equipment: Omit<EquipmentSpec, 'id'>) => void;
  onDuplicate?: (equipment: EquipmentSpec) => void;
  onArchive?: (equipment: EquipmentSpec) => void;
  editingEquipment?: EquipmentSpec | null;
}

export default function EquipmentFormModal({ isOpen, onClose, onSave, onDuplicate, onArchive, editingEquipment }: EquipmentFormModalProps) {
  const { connectorTypes } = useEquipmentLibrary();
  const portTypes = connectorTypes.length > 0 ? connectorTypes : ['SDI', 'HDMI', 'DisplayPort', 'NDI'];
  
  const [formData, setFormData] = useState<Partial<EquipmentSpec>>({
    category: 'COMPUTER',
    manufacturer: '',
    model: '',
    ioArchitecture: 'direct',
    inputs: [],
    outputs: [],
    cardSlots: 0,
    cards: [],
    deviceFormats: [],
    formatByIO: true,
    isSecondaryDevice: false,
    specs: {}
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [specsOpen, setSpecsOpen] = useState(true);

  useEffect(() => {
    if (editingEquipment) {
      setFormData({
        category: (editingEquipment.category || 'COMPUTER').toUpperCase() as any,
        manufacturer: editingEquipment.manufacturer || '',
        model: editingEquipment.model || '',
        ioArchitecture: editingEquipment.ioArchitecture || 'direct',
        inputs: editingEquipment.inputs || [],
        outputs: editingEquipment.outputs || [],
        cardSlots: editingEquipment.cardSlots || 0,
        cards: editingEquipment.cards || [],
        deviceFormats: editingEquipment.deviceFormats || [],
        formatByIO: true,
        isSecondaryDevice: editingEquipment.isSecondaryDevice || false,
        specs: (editingEquipment.specs as Record<string, any>) || {}
      });
    } else {
      setFormData({
        category: 'COMPUTER',
        manufacturer: '',
        model: '',
        ioArchitecture: 'direct',
        inputs: [],
        outputs: [],
        cardSlots: 0,
        cards: [],
        deviceFormats: [],
        formatByIO: true,
        isSecondaryDevice: false
      });
    }
    setErrors([]);
  }, [editingEquipment]);

  if (!isOpen) return null;

  const getSpec = (key: string) => ((formData.specs as Record<string, any>) ?? {})[key] ?? '';
  const setSpec = (key: string, value: any) =>
    setFormData(f => ({ ...f, specs: { ...((f.specs as Record<string, any>) ?? {}), [key]: value } }));
  const getSpecBool = (key: string) => !!((formData.specs as Record<string, any>) ?? {})[key];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    if (!formData.manufacturer?.trim()) newErrors.push('Manufacturer is required');
    if (!formData.model?.trim()) newErrors.push('Model is required');
    if (!formData.category) newErrors.push('Category is required');
    if (!formData.ioArchitecture) newErrors.push('I/O Architecture is required');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData as Omit<EquipmentSpec, 'id'>);
    onClose();
  };

  const categories = [
    { value: 'COMPUTER', label: 'Computer' },
    { value: 'CAMERA', label: 'Camera' },
    { value: 'CCU', label: 'CCU' },
    { value: 'CAM_SWITCHER', label: 'Camera Switcher' },
    { value: 'VISION_SWITCHER', label: 'Vision Switcher' },
    { value: 'ROUTER', label: 'Router' },
    { value: 'LED_PROCESSOR', label: 'LED Processor' },
    { value: 'LED_TILE', label: 'LED Tile' },
    { value: 'PROJECTOR', label: 'Projector' },
    { value: 'RECORDER', label: 'Recorder' },
    { value: 'MONITOR', label: 'Monitor' },
    { value: 'CONVERTER', label: 'Converter' },
    { value: 'CABLE_SNAKE', label: 'Cable Snake' },
    { value: 'STREAM_ENCODER', label: 'Stream Encoder' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-av-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-av-border">
          <h2 className="text-2xl font-bold text-av-text">
            {editingEquipment ? 'Edit Equipment' : 'Add Equipment'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-av-surface-light rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-av-text-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-md p-4">
              <ul className="list-disc list-inside text-sm text-red-400">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

        {/* Basic Info - Category and I/O Architecture */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="input-field w-full"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                I/O Architecture *
              </label>
              <select
                value={formData.ioArchitecture}
                onChange={(e) => setFormData({ ...formData, ioArchitecture: e.target.value as 'direct' | 'card-based' })}
                className="input-field w-full"
              >
                <option value="direct">Direct I/O Only</option>
                <option value="card-based">Expansion I/O</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                Manufacturer *
              </label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="input-field w-full"
                placeholder="e.g., Sony, Panasonic"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                Model *
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="input-field w-full"
                placeholder="e.g., HDCU-5500"
              />
            </div>
          </div>

          {/* Direct I/O Ports — always shown */}
          <div className="space-y-4">
              {/* Inputs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-av-text">Inputs</label>
                  <button
                    type="button"
                    onClick={() => setFormData(f => ({
                      ...f,
                      inputs: [...(f.inputs || []), { id: `in-${Date.now()}`, type: portTypes[0] || 'SDI', label: '' }]
                    }))}
                    className="text-xs px-2 py-1 bg-av-accent/20 text-av-accent rounded hover:bg-av-accent/30 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {(formData.inputs || []).length === 0 && (
                    <p className="text-xs text-av-text-muted">No inputs configured</p>
                  )}
                  {(formData.inputs || []).map((port) => {
                    const inputOptions = port.type && !portTypes.includes(port.type)
                      ? [...portTypes, port.type]
                      : portTypes;
                    return (
                    <div key={port.id} className="flex items-center gap-2">
                      <select
                        value={port.type}
                        onChange={(e) => setFormData(f => ({ ...f, inputs: (f.inputs || []).map(p => p.id === port.id ? { ...p, type: e.target.value } : p) }))}
                        className="input-field flex-1 text-sm"
                      >
                        {inputOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input
                        type="text"
                        value={port.label || ''}
                        onChange={(e) => setFormData(f => ({ ...f, inputs: (f.inputs || []).map(p => p.id === port.id ? { ...p, label: e.target.value } : p) }))}
                        placeholder="Label"
                        className="input-field flex-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, inputs: (f.inputs || []).filter(p => p.id !== port.id) }))}
                        className="p-1.5 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );})}
                </div>
              </div>

              {/* Outputs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-av-text">Outputs</label>
                  <button
                    type="button"
                    onClick={() => setFormData(f => ({
                      ...f,
                      outputs: [...(f.outputs || []), { id: `out-${Date.now()}`, type: portTypes[0] || 'SDI', label: '' }]
                    }))}
                    className="text-xs px-2 py-1 bg-av-accent/20 text-av-accent rounded hover:bg-av-accent/30 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {(formData.outputs || []).length === 0 && (
                    <p className="text-xs text-av-text-muted">No outputs configured</p>
                  )}
                  {(formData.outputs || []).map((port) => {
                    const outputOptions = port.type && !portTypes.includes(port.type)
                      ? [...portTypes, port.type]
                      : portTypes;
                    return (
                    <div key={port.id} className="flex items-center gap-2">
                      <select
                        value={port.type}
                        onChange={(e) => setFormData(f => ({ ...f, outputs: (f.outputs || []).map(p => p.id === port.id ? { ...p, type: e.target.value } : p) }))}
                        className="input-field flex-1 text-sm"
                      >
                        {outputOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input
                        type="text"
                        value={port.label || ''}
                        onChange={(e) => setFormData(f => ({ ...f, outputs: (f.outputs || []).map(p => p.id === port.id ? { ...p, label: e.target.value } : p) }))}
                        placeholder="Label"
                        className="input-field flex-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, outputs: (f.outputs || []).filter(p => p.id !== port.id) }))}
                        className="p-1.5 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );})}
                </div>
              </div>
          </div>

          {/* Expansion I/O Cards — always shown below direct I/O */}
          <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-av-text">Expansion I/O Cards</label>
                <button
                  type="button"
                  onClick={() => setFormData(f => ({
                    ...f,
                    cards: [...(f.cards || []), { id: `card-${Date.now()}`, slotNumber: (f.cards || []).length + 1, inputs: [], outputs: [] }]
                  }))}
                  className="text-xs px-2 py-1 bg-av-accent/20 text-av-accent rounded hover:bg-av-accent/30 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Card
                </button>
              </div>
              {(formData.cards || []).length === 0 && (
                <p className="text-xs text-av-text-muted">No cards added</p>
              )}
              <div className="space-y-3">
                {(formData.cards || []).map((card, cardIdx) => (
                  <div key={card.id} className="border border-av-border rounded-md overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-av-surface-light">
                      <span className="text-sm font-medium text-av-text">Card {cardIdx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, cards: (f.cards || []).filter(c => c.id !== card.id) }))}
                        className="p-1 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-3 space-y-3">
                      {/* Card Inputs */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-av-text-muted">Inputs</span>
                          <button
                            type="button"
                            onClick={() => setFormData(f => ({
                              ...f,
                              cards: (f.cards || []).map(c => c.id !== card.id ? c : {
                                ...c,
                                inputs: [...c.inputs, { id: `in-${Date.now()}`, type: portTypes[0] || 'SDI', label: '' }]
                              })
                            }))}
                            className="text-xs px-1.5 py-0.5 bg-av-accent/20 text-av-accent rounded hover:bg-av-accent/30 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>
                        {card.inputs.length === 0 && <p className="text-xs text-av-text-muted">No inputs</p>}
                        <div className="space-y-1.5">
                          {card.inputs.map(port => (
                            <div key={port.id} className="flex items-center gap-2">
                              <select
                                value={port.type}
                                onChange={(e) => setFormData(f => ({
                                  ...f,
                                  cards: (f.cards || []).map(c => c.id !== card.id ? c : {
                                    ...c,
                                    inputs: c.inputs.map(p => p.id !== port.id ? p : { ...p, type: e.target.value })
                                  })
                                }))}
                                className="input-field flex-1 text-sm"
                              >
                                {portTypes.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <input
                                type="text"
                                value={port.label || ''}
                                onChange={(e) => setFormData(f => ({
                                  ...f,
                                  cards: (f.cards || []).map(c => c.id !== card.id ? c : {
                                    ...c,
                                    inputs: c.inputs.map(p => p.id !== port.id ? p : { ...p, label: e.target.value })
                                  })
                                }))}
                                placeholder="Label"
                                className="input-field flex-1 text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData(f => ({
                                  ...f,
                                  cards: (f.cards || []).map(c => c.id !== card.id ? c : {
                                    ...c,
                                    inputs: c.inputs.filter(p => p.id !== port.id)
                                  })
                                }))}
                                className="p-1.5 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Card Outputs */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-av-text-muted">Outputs</span>
                          <button
                            type="button"
                            onClick={() => setFormData(f => ({
                              ...f,
                              cards: (f.cards || []).map(c => c.id !== card.id ? c : {
                                ...c,
                                outputs: [...c.outputs, { id: `out-${Date.now()}`, type: portTypes[0] || 'SDI', label: '' }]
                              })
                            }))}
                            className="text-xs px-1.5 py-0.5 bg-av-accent/20 text-av-accent rounded hover:bg-av-accent/30 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>
                        {card.outputs.length === 0 && <p className="text-xs text-av-text-muted">No outputs</p>}
                        <div className="space-y-1.5">
                          {card.outputs.map(port => (
                            <div key={port.id} className="flex items-center gap-2">
                              <select
                                value={port.type}
                                onChange={(e) => setFormData(f => ({
                                  ...f,
                                  cards: (f.cards || []).map(c => c.id !== card.id ? c : {
                                    ...c,
                                    outputs: c.outputs.map(p => p.id !== port.id ? p : { ...p, type: e.target.value })
                                  })
                                }))}
                                className="input-field flex-1 text-sm"
                              >
                                {portTypes.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <input
                                type="text"
                                value={port.label || ''}
                                onChange={(e) => setFormData(f => ({
                                  ...f,
                                  cards: (f.cards || []).map(c => c.id !== card.id ? c : {
                                    ...c,
                                    outputs: c.outputs.map(p => p.id !== port.id ? p : { ...p, label: e.target.value })
                                  })
                                }))}
                                placeholder="Label"
                                className="input-field flex-1 text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData(f => ({
                                  ...f,
                                  cards: (f.cards || []).map(c => c.id !== card.id ? c : {
                                    ...c,
                                    outputs: c.outputs.filter(p => p.id !== port.id)
                                  })
                                }))}
                                className="p-1.5 rounded hover:bg-av-danger/20 text-av-text-muted hover:text-av-danger"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          </div>

          {/* Category-Specific Spec Panels */}
          {(formData.category === 'LED_TILE' || formData.category === 'LED_PROCESSOR' || formData.category === 'PROJECTOR') && (
            <div className="border border-av-border rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setSpecsOpen(o => !o)}
                className="flex items-center justify-between w-full px-4 py-3 bg-av-surface-light hover:bg-av-surface-light/80 transition-colors"
              >
                <span className="text-sm font-semibold text-av-text">
                  {formData.category === 'LED_TILE' && 'LED Tile Specs'}
                  {formData.category === 'LED_PROCESSOR' && 'LED Processor Specs'}
                  {formData.category === 'PROJECTOR' && 'Projector Specs'}
                </span>
                <ChevronDown className={`w-4 h-4 text-av-text-muted transition-transform ${specsOpen ? 'rotate-180' : ''}`} />
              </button>

              {specsOpen && formData.category === 'LED_TILE' && (
                <div className="p-4 space-y-4">
                  <p className="text-xs text-av-text-muted">Required fields</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Pixel Pitch (mm) *</label>
                      <input type="number" step="0.01" value={getSpec('pixelPitch')} onChange={e => setSpec('pixelPitch', parseFloat(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 2.6" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Panel Width (mm) *</label>
                      <input type="number" step="1" value={getSpec('panelWidthMm')} onChange={e => setSpec('panelWidthMm', parseFloat(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Panel Height (mm) *</label>
                      <input type="number" step="1" value={getSpec('panelHeightMm')} onChange={e => setSpec('panelHeightMm', parseFloat(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Pixels H *</label>
                      <input type="number" step="1" value={getSpec('pixelsH')} onChange={e => setSpec('pixelsH', parseInt(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 192" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Pixels V *</label>
                      <input type="number" step="1" value={getSpec('pixelsV')} onChange={e => setSpec('pixelsV', parseInt(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 192" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Weight (kg) *</label>
                      <input type="number" step="0.01" value={getSpec('weightKg')} onChange={e => setSpec('weightKg', parseFloat(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 7.5" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Power Max (W) *</label>
                      <input type="number" step="1" value={getSpec('powerMaxW')} onChange={e => setSpec('powerMaxW', parseFloat(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 800" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Power Avg (W) *</label>
                      <input type="number" step="1" value={getSpec('powerAvgW')} onChange={e => setSpec('powerAvgW', parseFloat(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 320" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Max Chain Length *</label>
                      <input type="number" step="1" value={getSpec('maxChainLength')} onChange={e => setSpec('maxChainLength', parseInt(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 20" />
                    </div>
                  </div>
                  <p className="text-xs text-av-text-muted pt-1">Optional fields</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Refresh Rate (Hz)</label>
                      <input type="number" step="1" value={getSpec('refreshRateHz')} onChange={e => setSpec('refreshRateHz', parseInt(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 3840" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Brightness (nits)</label>
                      <input type="number" step="1" value={getSpec('brightnessNits')} onChange={e => setSpec('brightnessNits', parseInt(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 1000" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Scan Type</label>
                      <input type="text" value={getSpec('scanType')} onChange={e => setSpec('scanType', e.target.value)} className="input-field w-full text-sm" placeholder="e.g. 1/4" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">IP Rating</label>
                      <input type="text" value={getSpec('ipRating')} onChange={e => setSpec('ipRating', e.target.value)} className="input-field w-full text-sm" placeholder="e.g. IP65" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Cabinet Depth (mm)</label>
                      <input type="number" step="1" value={getSpec('cabinetDepthMm')} onChange={e => setSpec('cabinetDepthMm', parseFloat(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 108" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Mounting System</label>
                      <input type="text" value={getSpec('mountingSystem')} onChange={e => setSpec('mountingSystem', e.target.value)} className="input-field w-full text-sm" placeholder="e.g. Touring" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={getSpecBool('isCurved')} onChange={e => setSpec('isCurved', e.target.checked)} className="w-4 h-4 text-av-accent rounded border-av-border" />
                      <span className="text-sm text-av-text">Curved</span>
                    </label>
                    {getSpecBool('isCurved') && (
                      <div>
                        <label className="block text-xs font-medium text-av-text mb-1">Curve Radius (mm)</label>
                        <input type="number" step="1" value={getSpec('curveRadiusMm')} onChange={e => setSpec('curveRadiusMm', parseFloat(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 1000" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {specsOpen && formData.category === 'LED_PROCESSOR' && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Max Total Pixels *</label>
                      <input type="number" step="1" value={getSpec('maxPixels')} onChange={e => setSpec('maxPixels', parseInt(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 8294400" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Ethernet Outputs *</label>
                      <input type="number" step="1" value={getSpec('ethernetOutputs')} onChange={e => setSpec('ethernetOutputs', parseInt(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 16" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Max Pixels / Port *</label>
                      <input type="number" step="1" value={getSpec('maxPixelsPerPort')} onChange={e => setSpec('maxPixelsPerPort', parseInt(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 650000" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Max Width (px) *</label>
                      <input type="number" step="1" value={getSpec('maxWidth')} onChange={e => setSpec('maxWidth', parseInt(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 16384" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Max Height (px) *</label>
                      <input type="number" step="1" value={getSpec('maxHeight')} onChange={e => setSpec('maxHeight', parseInt(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 8192" />
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={getSpecBool('hasGenlock')} onChange={e => setSpec('hasGenlock', e.target.checked)} className="w-4 h-4 text-av-accent rounded border-av-border" />
                      <span className="text-sm text-av-text">Genlock</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={getSpecBool('supportsHdr')} onChange={e => setSpec('supportsHdr', e.target.checked)} className="w-4 h-4 text-av-accent rounded border-av-border" />
                      <span className="text-sm text-av-text">HDR Support</span>
                    </label>
                  </div>
                </div>
              )}

              {specsOpen && formData.category === 'PROJECTOR' && (
                <div className="p-4 space-y-4">
                  <p className="text-xs text-av-text-muted">Required fields</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Lumens *</label>
                      <input type="number" step="1" value={getSpec('lumens')} onChange={e => setSpec('lumens', parseInt(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 20000" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Native Width (px) *</label>
                      <input type="number" step="1" value={getSpec('nativeW')} onChange={e => setSpec('nativeW', parseInt(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 1920" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Native Height (px) *</label>
                      <input type="number" step="1" value={getSpec('nativeH')} onChange={e => setSpec('nativeH', parseInt(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 1200" />
                    </div>
                  </div>
                  <p className="text-xs text-av-text-muted pt-1">Optional fields</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Throw Ratio Min</label>
                      <input type="number" step="0.01" value={getSpec('throwRatioMin')} onChange={e => setSpec('throwRatioMin', parseFloat(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 1.39" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Throw Ratio Max</label>
                      <input type="number" step="0.01" value={getSpec('throwRatioMax')} onChange={e => setSpec('throwRatioMax', parseFloat(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 2.10" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Lens Shift V (%)</label>
                      <input type="number" step="0.1" value={getSpec('lensShiftVPct')} onChange={e => setSpec('lensShiftVPct', parseFloat(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 56" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-av-text mb-1">Lens Shift H (%)</label>
                      <input type="number" step="0.1" value={getSpec('lensShiftHPct')} onChange={e => setSpec('lensShiftHPct', parseFloat(e.target.value) || '')} className="input-field w-full text-sm" placeholder="e.g. 10" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Secondary Device — always at bottom */}
          <div className="bg-av-surface-light border border-av-border rounded-md p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isSecondaryDevice || false}
                onChange={(e) => setFormData({ ...formData, isSecondaryDevice: e.target.checked })}
                className="mt-0.5 w-4 h-4 text-av-accent rounded border-av-border focus:ring-2 focus:ring-av-accent"
              />
              <div>
                <span className="text-sm font-medium text-av-text">Available as Secondary Device</span>
                <p className="text-xs text-av-text-muted mt-1">
                  Check this if this equipment can be used as a secondary device for sources (e.g., converters, scalers, processors)
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-av-border">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            {editingEquipment && onDuplicate && (
              <button
                type="button"
                onClick={() => { onDuplicate(editingEquipment); onClose(); }}
                className="btn-secondary flex items-center gap-2"
              >
                <Copy className="w-4 h-4" /> Duplicate
              </button>
            )}
            {editingEquipment && onArchive && (
              <button
                type="button"
                onClick={() => { onArchive(editingEquipment); onClose(); }}
                className="btn-secondary flex items-center gap-2 hover:text-amber-400 hover:border-amber-400/50"
              >
                <Archive className="w-4 h-4" /> Archive
              </button>
            )}
            <button
              type="submit"
              className="btn-primary"
            >
              {editingEquipment ? 'Update Equipment' : 'Add Equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
