import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import type { EquipmentSpec, IOPort } from '@/types';
import { useProductionStore } from '@/hooks/useStore';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';

interface EquipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (equipment: Omit<EquipmentSpec, 'id'>) => void;
  editingEquipment?: EquipmentSpec | null;
}

export default function EquipmentFormModal({ isOpen, onClose, onSave, editingEquipment }: EquipmentFormModalProps) {
  const { resolutions = [], frameRates = [] } = useProductionStore();
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
    isSecondaryDevice: false
  });

  // Separate state for resolution and rate when in device-wide mode
  const [deviceResolution, setDeviceResolution] = useState<string>(resolutions[0] || '1080p');
  const [deviceRate, setDeviceRate] = useState<string>(frameRates[0] || '60');

  const [errors, setErrors] = useState<string[]>([]);

  // Update form data when editingEquipment changes
  useEffect(() => {
    if (editingEquipment) {
      setFormData({
        category: editingEquipment.category || 'COMPUTER',
        manufacturer: editingEquipment.manufacturer || '',
        model: editingEquipment.model || '',
        ioArchitecture: editingEquipment.ioArchitecture || 'direct',
        inputs: editingEquipment.inputs || [],
        outputs: editingEquipment.outputs || [],
        cardSlots: editingEquipment.cardSlots || 0,
        cards: editingEquipment.cards || [],
        deviceFormats: editingEquipment.deviceFormats || [],
        formatByIO: editingEquipment.formatByIO !== undefined ? editingEquipment.formatByIO : true,
        isSecondaryDevice: editingEquipment.isSecondaryDevice || false
      });
      
      // Extract resolution and rate from device formats if available
      if (editingEquipment.deviceFormats && editingEquipment.deviceFormats.length > 0 && !editingEquipment.formatByIO) {
        const format = editingEquipment.deviceFormats[0];
        // Try to parse format like "1080p60" or "4K59.94"
        const match = format.match(/^(.+?)([\d.]+)$/);
        if (match) {
          setDeviceResolution(match[1]);
          setDeviceRate(match[2]);
        }
      }
    } else {
      // Reset to defaults when adding new equipment
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
      setDeviceResolution(resolutions[0] || '1080p');
      setDeviceRate(frameRates[0] || '60');
    }
    setErrors([]);
  }, [editingEquipment, resolutions, frameRates]);

  if (!isOpen) return null;

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

          {/* Basic Info - Category, I/O Architecture, and Format Assign */}
          <div className="grid grid-cols-3 gap-4">
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
                <option value="direct">Direct I/O</option>
                <option value="card-based">Card-Based</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                Format Assign *
              </label>
              <select
                value={formData.formatByIO ? 'per-io' : 'device-wide'}
                onChange={(e) => setFormData({ ...formData, formatByIO: e.target.value === 'per-io' })}
                className="input-field w-full"
              >
                <option value="per-io">Per I/O</option>
                <option value="device-wide">Device-wide</option>
              </select>
            </div>
          </div>

          {/* Device-wide Format Settings */}
          {!formData.formatByIO && (
            <div className="grid grid-cols-[2fr,1fr] gap-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Resolution Preset *
                </label>
                <select
                  value={deviceResolution}
                  onChange={(e) => {
                    setDeviceResolution(e.target.value);
                    setFormData({ ...formData, deviceFormats: [`${e.target.value}${deviceRate}`] });
                  }}
                  className="input-field w-full"
                  required={!formData.formatByIO}
                >
                  {resolutions.map(res => (
                    <option key={res} value={res}>{res}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Rate *
                </label>
                <select
                  value={deviceRate}
                  onChange={(e) => {
                    setDeviceRate(e.target.value);
                    setFormData({ ...formData, deviceFormats: [`${deviceResolution}${e.target.value}`] });
                  }}
                  className="input-field w-full"
                  required={!formData.formatByIO}
                >
                  {frameRates.map(rate => (
                    <option key={rate} value={rate}>{rate}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

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

          {/* Card Slots (for card-based) */}
          {formData.ioArchitecture === 'card-based' && (
            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                Total Card Slots
              </label>
              <input
                type="number"
                value={formData.cardSlots || 0}
                onChange={(e) => setFormData({ ...formData, cardSlots: parseInt(e.target.value) || 0 })}
                className="input-field w-full"
                min="0"
              />
            </div>
          )}

          {/* Secondary Device Checkbox */}
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

          {/* Direct I/O Ports */}
          {formData.ioArchitecture === 'direct' && (
            <div className="grid grid-cols-2 gap-6">
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

              {/* Outputs */
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
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-av-border">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
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
