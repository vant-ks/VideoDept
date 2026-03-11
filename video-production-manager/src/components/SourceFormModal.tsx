import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Source, Format } from '@/types';
import { SourceService, apiClient } from '@/services';
import { useProductionStore } from '@/hooks/useStore';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { IOPortsPanel, type DevicePortDraft } from '@/components/IOPortsPanel';
import { FormatFormModal } from '@/components/FormatFormModal';

interface SourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (source: Source, devicePorts: DevicePortDraft[]) => void;
  onSaveAndDuplicate?: (source: Source, devicePorts: DevicePortDraft[]) => void;
  existingSources: Source[];
  editingSource?: Source | null;
  typeFieldLabel?: string; // Optional label for the Type field (e.g., "Computer Type" for Computers page)
  entityLabel?: string; // Optional label for the entity (e.g., "Computer" for Computers page) — used in modal title
}

export function SourceFormModal({ 
  isOpen, 
  onClose, 
  onSave,
  onSaveAndDuplicate,
  existingSources,
  editingSource,
  typeFieldLabel = 'Type', // Default to 'Type', can be overridden (e.g., 'Computer Type')
  entityLabel = 'Source' // Default to 'Source', can be overridden (e.g., 'Computer')
}: SourceFormModalProps) {
  const oldStoreEquipmentSpecs = useProductionStore(state => state.equipmentSpecs) || [];
  const equipmentLibSpecs = useEquipmentLibrary(state => state.equipmentSpecs);
  // Prefer the equipment library store (kept in sync by Equipment page) over the old store
  const equipmentSpecs = equipmentLibSpecs.length > 0 ? equipmentLibSpecs : oldStoreEquipmentSpecs;
  
  // Filter equipment that can be used as secondary devices
  const secondaryDeviceOptions = equipmentSpecs.filter(spec => spec.isSecondaryDevice);
  
  // Computer type options come from equipment library (COMPUTER category)
  const computerEquipment = equipmentSpecs.filter(spec => spec.category === 'COMPUTER');
  
  // Get default type — first computer equipment model, with fallback
  const defaultType = computerEquipment.length > 0 ? computerEquipment[0].model : 'Laptop - PC MISC';
  
  const [formData, setFormData] = useState<Partial<Source>>({
    id: '',
    type: defaultType,
    name: '',
    note: '',
    secondaryDevice: '',
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isDuplicateId, setIsDuplicateId] = useState(false);

  // device_ports state — managed in parallel with formData
  const [devicePorts, setDevicePorts] = useState<DevicePortDraft[]>([]);
  const [portsLoading, setPortsLoading] = useState(false);
  const [formats, setFormats] = useState<Format[]>([]);
  const [isCreateFormatOpen, setIsCreateFormatOpen] = useState(false);

  // Load formats once on mount
  useEffect(() => {
    apiClient.get('/formats')
      .then((res: any) => { if (Array.isArray(res.data)) setFormats(res.data); })
      .catch(() => {});
  }, []);

  // Reset form + load device_ports when modal opens/closes or editing source changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingSource) {
      setFormData({
        ...editingSource,
        type: editingSource.type || defaultType,
      });
      // Load existing device_ports
      if (editingSource.uuid) {
        setPortsLoading(true);
        apiClient.get(`/device-ports/device/${editingSource.uuid}`)
          .then((res: any) => {
            if (Array.isArray(res.data)) {
              setDevicePorts(res.data.map((p: any) => ({
                uuid: p.uuid,
                specPortUuid: p.specPortUuid,
                portLabel: p.portLabel,
                ioType: p.ioType,
                direction: p.direction,
                formatUuid: p.formatUuid,
                note: p.note,
              })));
            } else {
              setDevicePorts([]);
            }
          })
          .catch(() => setDevicePorts([]))
          .finally(() => setPortsLoading(false));
      } else {
        setDevicePorts([]);
      }
    } else {
      // Auto-generate ID for new source
      console.log('🔧 SourceFormModal: Auto-generating ID for new source');
      const newId = SourceService.generateId(existingSources);
      console.log('🔧 Generated newId:', newId);
      setFormData({
        id: newId,
        type: defaultType,
        name: '',
      });
      setDevicePorts([]);
    }
  }, [isOpen, editingSource, existingSources, defaultType]);

  const handleChange = (field: keyof Source, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors([]); // Clear errors on change
    
    // Check for duplicate ID (excluding the current editing source)
    if (field === 'id') {
      const isDuplicate = existingSources.some(s => 
        s.id === value && s.uuid !== editingSource?.uuid
      );
      setIsDuplicateId(isDuplicate);
    }
  };

  const handleSubmit = (e: React.FormEvent | React.MouseEvent, action: 'close' | 'duplicate' = 'close') => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🚀 SourceFormModal handleSubmit called');
    console.log('🚀 Current formData.id:', formData.id);
    console.log('🚀 existingSources:', existingSources.map(s => ({ id: s.id, uuid: s.uuid })));
    
    // Validate
    const validation = SourceService.validate(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    // Note: Duplicate IDs are allowed with visual warnings (red text in UI)
    // The uuid is the immutable primary key, id is user-editable

    const sourceData = formData as Source;
    
    if (action === 'duplicate' && onSaveAndDuplicate) {
      onSaveAndDuplicate(sourceData, devicePorts);
    } else {
      onSave(sourceData, devicePorts);
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({ id: '', type: defaultType, name: '' });
    setDevicePorts([]);
    setErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-av-surface border border-av-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-av-border">
          <h2 className="text-2xl font-bold text-av-text">
            {editingSource ? `Edit ${entityLabel}` : `Add New ${entityLabel}`}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-4 rounded-md bg-av-danger/10 border border-av-danger/30">
              <p className="text-sm font-medium text-av-danger mb-2">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-sm text-av-danger space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ID and Type Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                ID <span className="text-av-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => handleChange('id', e.target.value)}
                className={`input-field w-full ${isDuplicateId ? 'border-red-500 border-2' : ''}`}
                placeholder="SRC 1"
                required
              />
              {isDuplicateId && (
                <p className="text-xs text-red-500 mt-1">
                  ⚠️ This ID already exists. Duplicates will be highlighted in red.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                {typeFieldLabel} <span className="text-av-danger">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="input-field w-full"
                required
              >
                {computerEquipment.map(spec => (
                  <option key={spec.id} value={spec.model}>{spec.manufacturer} {spec.model}</option>
                ))}
                {computerEquipment.length === 0 && (
                  <option value="Laptop - PC MISC">Laptop - PC MISC</option>
                )}
              </select>
            </div>
          </div>

          {/* Name and Secondary Device Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                Name <span className="text-av-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="input-field w-full"
                placeholder="e.g., Main Presentation Laptop"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                Secondary Device
              </label>
              <select
                value={formData.secondaryDevice || ''}
                onChange={(e) => handleChange('secondaryDevice', e.target.value)}
                className="input-field w-full"
              >
                <option value="">None</option>
                {secondaryDeviceOptions.map((equipment) => (
                  <option key={equipment.id} value={`${equipment.manufacturer} ${equipment.model}`}>
                    {equipment.manufacturer} {equipment.model} ({equipment.category})
                  </option>
                ))}
              </select>
              {secondaryDeviceOptions.length === 0 && (
                <p className="text-xs text-av-text-muted mt-1">
                  No equipment marked as secondary device.
                </p>
              )}
            </div>
          </div>

          {/* Secondary Device Ports — shown only when a secondary device is selected */}
          {formData.secondaryDevice && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Secondary Device Port
                </label>
                <input
                  type="text"
                  value={(formData as any).secondaryDevicePort || ''}
                  onChange={(e) => handleChange('secondaryDevicePort' as keyof Source, e.target.value)}
                  className="input-field w-full"
                  placeholder="e.g., HDMI In 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Primary Device Port
                </label>
                <select
                  value={(formData as any).primaryDevicePort || ''}
                  onChange={(e) => handleChange('primaryDevicePort' as keyof Source, e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">Select port...</option>
                  {devicePorts.map((p, i) => (
                    <option key={i} value={p.portLabel}>
                      [{p.direction === 'INPUT' ? 'IN' : 'OUT'}] {p.portLabel} ({p.ioType})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* I/O Ports Panel */}
          <div>
            <label className="block text-sm font-medium text-av-text mb-2">
              I/O Ports
              <span className="text-xs text-av-text-muted ml-2">format &amp; signal per port</span>
            </label>
            <IOPortsPanel
              ports={devicePorts}
              onChange={setDevicePorts}
              formats={formats}
              isLoading={portsLoading}
              emptyText={
                editingSource?.uuid
                  ? 'No ports saved for this device yet.'
                  : 'Save the device first, then assign ports via its equipment spec.'
              }
              onCreateCustomFormat={() => setIsCreateFormatOpen(true)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-av-text mb-2">
              Notes
            </label>
            <textarea
              value={formData.note || ''}
              onChange={(e) => handleChange('note', e.target.value)}
              className="input-field w-full"
              rows={3}
              placeholder="Additional notes about this source..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={(e) => handleSubmit(e as any, 'close')} 
              className="btn-primary flex-1"
            >
              Save & Close
            </button>
            <button 
              type="button" 
              onClick={(e) => handleSubmit(e as any, 'duplicate')} 
              className="btn-secondary flex-1"
            >
              Save & Duplicate
            </button>
            <button 
              type="button" 
              onClick={handleClose} 
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
  );
}
