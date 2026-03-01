import React, { useState, useEffect } from 'react';
import { X, Plus, Copy } from 'lucide-react';
import type { Source, ConnectorType, SourceType } from '@/types';
import { SourceService } from '@/services';
import { useProductionStore } from '@/hooks/useStore';

interface SourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (source: Source) => void;
  onSaveAndDuplicate?: (source: Source) => void;
  existingSources: Source[];
  editingSource?: Source | null;
  typeFieldLabel?: string; // Optional label for the Type field (e.g., "Computer Type" for Computers page)
}

// Resolution presets
interface ResolutionPreset {
  label: string;
  hRes: number;
  vRes: number;
}

const resolutionPresets: ResolutionPreset[] = [
  { label: '1920x1080 (Full HD)', hRes: 1920, vRes: 1080 },
  { label: '1280x720 (HD)', hRes: 1280, vRes: 720 },
  { label: '3840x2160 (4K UHD)', hRes: 3840, vRes: 2160 },
  { label: '2560x1440 (QHD)', hRes: 2560, vRes: 1440 },
  { label: '1024x768 (XGA)', hRes: 1024, vRes: 768 },
  { label: '1680x1050 (WSXGA+)', hRes: 1680, vRes: 1050 },
];

// Frame rate presets
const frameRatePresets = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60, 120];

export function SourceFormModal({ 
  isOpen, 
  onClose, 
  onSave,
  onSaveAndDuplicate,
  existingSources,
  editingSource,
  typeFieldLabel = 'Type' // Default to 'Type', can be overridden (e.g., 'Computer Type')
}: SourceFormModalProps) {
  const connectorTypes = useProductionStore(state => state.connectorTypes) || [];
  const sends = useProductionStore(state => state.sends);
  const equipmentSpecs = useProductionStore(state => state.equipmentSpecs) || [];
  
  // Filter equipment that can be used as secondary devices
  const secondaryDeviceOptions = equipmentSpecs.filter(spec => spec.isSecondaryDevice);
  
  // Computer type options come from equipment library (COMPUTER category)
  const computerEquipment = equipmentSpecs.filter(spec => spec.category === 'COMPUTER');
  
  // Get default type — first computer equipment model, with fallback
  const defaultType = computerEquipment.length > 0 ? computerEquipment[0].model : 'Laptop - PC MISC';
  
  const [formData, setFormData] = useState<Partial<Source>>({
    id: '',
    type: defaultType, // Settings-defined type (e.g., "Laptop - PC GFX")
    name: '',
    formatAssignmentMode: 'per-io', // Always per-io for computers
    hRes: undefined,
    vRes: undefined,
    rate: 59.94,
    standard: '',
    note: '',
    secondaryDevice: '',
    outputs: [{ id: 'out-1', connector: 'HDMI' }],
    blanking: 'none',
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [isCustomResolution, setIsCustomResolution] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [selectedFrameRate, setSelectedFrameRate] = useState<string>('59.94');
  const [isDuplicateId, setIsDuplicateId] = useState(false);
  
  // Per-I/O format states (for when formatAssignmentMode is 'per-io')
  const [perIoPresets, setPerIoPresets] = useState<Record<string, string>>({});
  const [perIoFrameRates, setPerIoFrameRates] = useState<Record<string, string>>({});
  const [perIoCustomResolution, setPerIoCustomResolution] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Reset form when modal opens/closes or when editing source changes
    if (!isOpen) return; // Don't run when modal is closed
    
    if (editingSource) {
      // Ensure outputs array exists for backwards compatibility
      const sourceWithOutputs = {
        ...editingSource,
        type: editingSource.type || defaultType,
        outputs: editingSource.outputs || [{ id: 'out-1', connector: 'HDMI' as ConnectorType }]
      };
      setFormData(sourceWithOutputs);
      // Check if it matches a preset
      const matchingPreset = resolutionPresets.find(
        p => p.hRes === editingSource.hRes && p.vRes === editingSource.vRes
      );
      if (matchingPreset) {
        setSelectedPreset(`${matchingPreset.hRes}x${matchingPreset.vRes}`);
        setIsCustomResolution(false);
      } else if (editingSource.hRes && editingSource.vRes) {
        setSelectedPreset('custom');
        setIsCustomResolution(true);
      } else {
        setSelectedPreset('');
        setIsCustomResolution(false);
      }
      setSelectedFrameRate(editingSource.rate?.toString() || '59.94');
    } else {
      // Auto-generate ID for new source (FRESH on each open)
      console.log('🔧 SourceFormModal: Auto-generating ID for new source');
      console.log('🔧 existingSources COUNT:', existingSources.length);
      console.log('🔧 existingSources FULL DATA:', existingSources.map(s => ({ id: s.id, category: s.category, uuid: s.uuid })));
      const newId = SourceService.generateId(existingSources);
      console.log('🔧 Generated newId:', newId);
      setFormData({
        id: newId,
        type: defaultType,
        name: '',
        rate: 59.94,
        outputs: [{ id: 'out-1', connector: 'HDMI' }],
      });
      console.log('🔧 formData.id set to:', newId);
      setSelectedPreset('');
      setIsCustomResolution(false);
      setSelectedFrameRate('59.94');
    }
  }, [isOpen, editingSource, existingSources, sourceTypes, defaultType]);

  const handleResolutionPresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);
    
    if (presetKey === 'custom') {
      setIsCustomResolution(true);
      // Keep existing values or clear them
    } else if (presetKey) {
      setIsCustomResolution(false);
      const preset = resolutionPresets.find(p => `${p.hRes}x${p.vRes}` === presetKey);
      if (preset) {
        setFormData(prev => ({
          ...prev,
          hRes: preset.hRes,
          vRes: preset.vRes,
        }));
      }
    } else {
      setIsCustomResolution(false);
      setFormData(prev => ({
        ...prev,
        hRes: undefined,
        vRes: undefined,
      }));
    }
    setErrors([]);
  };

  const handleFrameRatePresetChange = (rate: string) => {
    setSelectedFrameRate(rate);
    if (rate) {
      const rateValue = parseFloat(rate);
      setFormData(prev => ({ ...prev, rate: rateValue }));
    } else {
      setFormData(prev => ({ ...prev, rate: undefined }));
    }
    setErrors([]);
  };
  
  // Per-I/O format handlers
  const handlePerIoResolutionPresetChange = (outputId: string, presetKey: string) => {
    setPerIoPresets(prev => ({ ...prev, [outputId]: presetKey }));
    
    if (presetKey === 'custom') {
      setPerIoCustomResolution(prev => ({ ...prev, [outputId]: true }));
    } else if (presetKey) {
      setPerIoCustomResolution(prev => ({ ...prev, [outputId]: false }));
      const preset = resolutionPresets.find(p => `${p.hRes}x${p.vRes}` === presetKey);
      if (preset) {
        const newOutputs = (formData.outputs || []).map(output =>
          output.id === outputId ? { ...output, hRes: preset.hRes, vRes: preset.vRes } : output
        );
        setFormData(prev => ({ ...prev, outputs: newOutputs }));
      }
    } else {
      setPerIoCustomResolution(prev => ({ ...prev, [outputId]: false }));
      const newOutputs = (formData.outputs || []).map(output =>
        output.id === outputId ? { ...output, hRes: undefined, vRes: undefined } : output
      );
      setFormData(prev => ({ ...prev, outputs: newOutputs }));
    }
    setErrors([]);
  };

  const handlePerIoFrameRateChange = (outputId: string, rate: string) => {
    setPerIoFrameRates(prev => ({ ...prev, [outputId]: rate }));
    if (rate) {
      const rateValue = parseFloat(rate);
      const newOutputs = (formData.outputs || []).map(output =>
        output.id === outputId ? { ...output, rate: rateValue } : output
      );
      setFormData(prev => ({ ...prev, outputs: newOutputs }));
    } else {
      const newOutputs = (formData.outputs || []).map(output =>
        output.id === outputId ? { ...output, rate: undefined } : output
      );
      setFormData(prev => ({ ...prev, outputs: newOutputs }));
    }
    setErrors([]);
  };

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
      // Call onSaveAndDuplicate which handles save + keeping modal open
      onSaveAndDuplicate(sourceData);
    } else {
      // Normal save - calls onSave and closes modal
      onSave(sourceData);
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      id: '',
      type: 'LAPTOP',
      name: '',
      rate: 59.94,
      outputs: [{ id: 'out-1', connector: 'HDMI' }],
    });
    setErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-av-surface border border-av-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-av-border">
          <h2 className="text-2xl font-bold text-av-text">
            {editingSource ? 'Edit Source' : 'Add New Source'}
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



          {/* Outputs Section */}
          <div>
            <label className="block text-sm font-medium text-av-text mb-2">
              Outputs <span className="text-av-danger">*</span>
              {(formData.outputs?.length || 0) < 2 && formData.type !== 'SERVER' && (
                <button
                  type="button"
                  onClick={() => {
                    const nextId = `out-${(formData.outputs?.length || 0) + 1}`;
                    setFormData({
                      ...formData,
                      outputs: [...(formData.outputs || []), { id: nextId, connector: 'HDMI' }]
                    });
                  }}
                  className="ml-2 text-xs px-2 py-1 bg-av-accent/20 text-av-accent rounded hover:bg-av-accent/30 inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Output
                </button>
              )}
              {formData.type === 'SERVER' && (formData.outputs?.length || 0) < 8 && (
                <button
                  type="button"
                  onClick={() => {
                    const nextId = `out-${(formData.outputs?.length || 0) + 1}`;
                    setFormData({
                      ...formData,
                      outputs: [...(formData.outputs || []), { id: nextId, connector: 'HDMI' }]
                    });
                  }}
                  className="ml-2 text-xs px-2 py-1 bg-av-accent/20 text-av-accent rounded hover:bg-av-accent/30 inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Output
                </button>
              )}
            </label>
            <div className="space-y-4">
              {(formData.outputs || []).map((output, idx) => (
                <div key={output.id} className="border border-av-border rounded-lg p-4">
                  {/* Connector row */}
                  <div className="flex gap-2 items-center mb-3">
                    <span className="text-sm font-medium text-av-text w-16">Out {idx + 1}:</span>
                    <select
                      value={output.connector}
                      onChange={(e) => {
                        const newOutputs = [...(formData.outputs || [])];
                        newOutputs[idx] = { ...output, connector: e.target.value as ConnectorType };
                        setFormData({ ...formData, outputs: newOutputs });
                      }}
                      className="input-field flex-1"
                      required
                    >
                      {connectorTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const nextId = `out-${(formData.outputs || []).length + 1}`;
                        const duplicatedOutput = { 
                          ...output, 
                          id: nextId,
                          // Preserve the format properties from the output being duplicated
                        };
                        const newOutputs = [...(formData.outputs || []), duplicatedOutput];
                        setFormData({ ...formData, outputs: newOutputs });
                      }}
                      className="p-2 text-av-accent hover:bg-av-accent/10 rounded"
                      title="Duplicate this output"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {(formData.outputs || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newOutputs = (formData.outputs || []).filter((_, i) => i !== idx);
                          setFormData({ ...formData, outputs: newOutputs });
                        }}
                        className="p-2 text-av-danger hover:bg-av-danger/10 rounded"
                        title="Remove this output"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Per-I/O format fields */}
                  {
                    <>
                      {/* Resolution and Frame Rate Presets for this output */}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-xs font-medium text-av-text-muted mb-1">
                            Resolution Preset
                          </label>
                          <select
                            value={perIoPresets[output.id] || ''}
                            onChange={(e) => handlePerIoResolutionPresetChange(output.id, e.target.value)}
                            className="input-field w-full text-sm"
                          >
                            <option value="">Select...</option>
                            {resolutionPresets.map(preset => (
                              <option key={`${output.id}-${preset.hRes}x${preset.vRes}`} value={`${preset.hRes}x${preset.vRes}`}>
                                {preset.label}
                              </option>
                            ))}
                            <option value="custom">Custom...</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-av-text-muted mb-1">
                            Frame Rate
                          </label>
                          <select
                            value={perIoFrameRates[output.id] || ''}
                            onChange={(e) => handlePerIoFrameRateChange(output.id, e.target.value)}
                            className="input-field w-full text-sm"
                          >
                            <option value="">Select...</option>
                            {frameRatePresets.map(rate => (
                              <option key={`${output.id}-${rate}`} value={rate}>
                                {rate} fps
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Resolution fields for this output */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-av-text-muted mb-1">
                            H Res
                          </label>
                          <input
                            type="number"
                            value={output.hRes || ''}
                            onChange={(e) => {
                              const newOutputs = [...(formData.outputs || [])];
                              newOutputs[idx] = { ...output, hRes: e.target.value ? parseInt(e.target.value) : undefined };
                              setFormData({ ...formData, outputs: newOutputs });
                            }}
                            className="input-field w-full text-sm"
                            placeholder="1920"
                            min="0"
                            disabled={!perIoCustomResolution[output.id] && perIoPresets[output.id] !== '' && perIoPresets[output.id] !== undefined}
                            readOnly={!perIoCustomResolution[output.id] && perIoPresets[output.id] !== '' && perIoPresets[output.id] !== undefined}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-av-text-muted mb-1">
                            V Res
                          </label>
                          <input
                            type="number"
                            value={output.vRes || ''}
                            onChange={(e) => {
                              const newOutputs = [...(formData.outputs || [])];
                              newOutputs[idx] = { ...output, vRes: e.target.value ? parseInt(e.target.value) : undefined };
                              setFormData({ ...formData, outputs: newOutputs });
                            }}
                            className="input-field w-full text-sm"
                            placeholder="1080"
                            min="0"
                            disabled={!perIoCustomResolution[output.id] && perIoPresets[output.id] !== '' && perIoPresets[output.id] !== undefined}
                            readOnly={!perIoCustomResolution[output.id] && perIoPresets[output.id] !== '' && perIoPresets[output.id] !== undefined}
                          />
                        </div>
                      </div>
                    </>
                  }
                </div>
              ))}
            </div>
          </div>



          {/* Blanking */}
          <div>
            <label className="block text-sm font-medium text-av-text mb-2">
              Blanking
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="blanking"
                  value="none"
                  checked={formData.blanking === 'none' || !formData.blanking}
                  onChange={(e) => handleChange('blanking', e.target.value)}
                  className="w-4 h-4 text-av-accent"
                />
                <span className="text-sm text-av-text">None</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="blanking"
                  value="RBv1"
                  checked={formData.blanking === 'RBv1'}
                  onChange={(e) => handleChange('blanking', e.target.value)}
                  className="w-4 h-4 text-av-accent"
                />
                <span className="text-sm text-av-text">RBv1</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="blanking"
                  value="RBv2"
                  checked={formData.blanking === 'RBv2'}
                  onChange={(e) => handleChange('blanking', e.target.value)}
                  className="w-4 h-4 text-av-accent"
                />
                <span className="text-sm text-av-text">RBv2</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="blanking"
                  value="RBv3"
                  checked={formData.blanking === 'RBv3'}
                  onChange={(e) => handleChange('blanking', e.target.value)}
                  className="w-4 h-4 text-av-accent"
                />
                <span className="text-sm text-av-text">RBv3</span>
              </label>
            </div>
            <p className="text-xs text-av-text-muted mt-1">
              Reduced blanking affects bandwidth requirements for link type calculation
            </p>
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
  );
}
