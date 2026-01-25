import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { EquipmentSpec } from '@/types';
import { useProductionStore } from '@/hooks/useStore';

interface EquipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (equipment: Omit<EquipmentSpec, 'id'>) => void;
  editingEquipment?: EquipmentSpec | null;
}

export default function EquipmentFormModal({ isOpen, onClose, onSave, editingEquipment }: EquipmentFormModalProps) {
  const { resolutions = [], frameRates = [] } = useProductionStore();
  
  const [formData, setFormData] = useState<Partial<EquipmentSpec>>({
    category: 'ccu',
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
        category: editingEquipment.category || 'ccu',
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
        category: 'ccu',
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
    { value: 'camera', label: 'Camera' },
    { value: 'ccu', label: 'CCU' },
    { value: 'switcher', label: 'Switcher' },
    { value: 'router', label: 'Router' },
    { value: 'led-processor', label: 'LED Processor' },
    { value: 'led-tile', label: 'LED Tile' },
    { value: 'projector', label: 'Projector' },
    { value: 'recorder', label: 'Recorder' },
    { value: 'monitor', label: 'Monitor' },
    { value: 'converter', label: 'Converter' }
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

          {/* Note about I/O */}
          <div className="bg-av-surface-light border border-av-border rounded-md p-4">
            <p className="text-sm text-av-text-muted">
              <strong className="text-av-text">Note:</strong> Inputs, outputs, and cards can be configured after creating the equipment by clicking the Edit button.
            </p>
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
