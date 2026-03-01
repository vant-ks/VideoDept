import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, Copy } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { useCCUsAPI } from '@/hooks/useCCUsAPI';
import { useCamerasAPI } from '@/hooks/useCamerasAPI';
import { useProductionEvents } from '@/hooks/useProductionEvents';
import type { CCU } from '@/types';

// Local form state type — tracks all fields the CCU modal collects
interface CCUFormFields {
  id?: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  formatMode?: string;
  fiberInput?: string;
  referenceInput?: string;
  outputs?: any[];
  equipmentUuid?: string;
  note?: string;
  version?: number;
}

export default function CCUs() {
  const { activeProject } = useProjectStore();
  const projectStore = useProjectStore();
  const equipmentLib = useEquipmentLibrary();
  const oldStore = useProductionStore();
  const ccusAPI = useCCUsAPI();
  const camerasAPI = useCamerasAPI();
  
  // Extract store values
  const storeCCUs = activeProject?.ccus || oldStore.ccus;
  const equipmentSpecs = equipmentLib.equipmentSpecs.length > 0 ? equipmentLib.equipmentSpecs : oldStore.equipmentSpecs;
  
  // Local state for CCUs with real-time updates
  const [localCCUs, setLocalCCUs] = useState<CCU[]>(storeCCUs);
  // Cameras fetched to show count badges on CCU cards
  const [allCameras, setAllCameras] = useState<any[]>([]);
  
  // Sync local state when store CCUs change (on initial load)
  useEffect(() => {
    setLocalCCUs(storeCCUs);
  }, [storeCCUs]);
  
  // Get production ID for WebSocket subscription
  const productionId = activeProject?.production?.id || oldStore.production?.id;
  
  // Fetch equipment data on mount
  useEffect(() => {
    if (equipmentLib.equipmentSpecs.length === 0) {
      equipmentLib.fetchFromAPI();
    }
  }, []);

  // Fetch CCUs from API on mount
  useEffect(() => {
    if (productionId && oldStore.isConnected) {
      ccusAPI.fetchCCUs(productionId)
        .then(data => setLocalCCUs(data))
        .catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);

  // Fetch cameras to populate linked count per CCU
  useEffect(() => {
    if (productionId && oldStore.isConnected) {
      camerasAPI.fetchCameras(productionId)
        .then(data => setAllCameras(data))
        .catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);
  
  // Handle real-time WebSocket updates
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback((event) => {
      if (event.entityType === 'ccu') {
        console.log('🔔 CCU created by', event.userName, '| CCU:', event.entity.id);
        setLocalCCUs(prev => {
          // Avoid duplicates using ID
          if (prev.some(c => c.id === event.entity.id)) {
            console.log('⚠️ Duplicate detected - skipping add');
            return prev;
          }
          return [...prev, event.entity];
        });
      }
    }, []),
    onEntityUpdated: useCallback((event) => {
      if (event.entityType === 'ccu') {
        console.log('🔔 CCU updated by', event.userName, '| CCU:', event.entity.id);
        setLocalCCUs(prev => 
          prev.map(c => c.id === event.entity.id ? event.entity : c)
        );
      }
    }, []),
    onEntityDeleted: useCallback((event) => {
      if (event.entityType === 'ccu') {
        console.log('🔔 CCU deleted by', event.userName, '| CCU:', event.entityId);
        setLocalCCUs(prev => prev.filter(c => c.id !== event.entityId));
      }
    }, [])
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCCU, setEditingCCU] = useState<CCU | null>(null);
  const [formData, setFormData] = useState<CCUFormFields>({
    manufacturer: '',
    model: '',
    formatMode: '',
    outputs: [],
  });
  const [errors, setErrors] = useState<string[]>([]);

  // Use localCCUs for rendering
  const ccus = localCCUs;
  
  // Get CCU equipment specs from store — memoized to avoid recompute
  const ccuSpecs = useMemo(
    () => equipmentSpecs.filter(spec => spec.category === 'CCU'),
    [equipmentSpecs]
  );
  
  // Get unique manufacturers from equipment specs
  const CCU_MANUFACTURERS = useMemo(
    () => Array.from(new Set(ccuSpecs.map(spec => spec.manufacturer))).sort(),
    [ccuSpecs]
  );
  
  // Get models by manufacturer from equipment specs
  const CCU_MODELS_BY_MANUFACTURER = useMemo(() => {
    const result: Record<string, string[]> = {};
    CCU_MANUFACTURERS.forEach(mfr => {
      result[mfr] = ccuSpecs
        .filter(spec => spec.manufacturer === mfr)
        .map(spec => spec.model)
        .sort();
    });
    return result;
  }, [CCU_MANUFACTURERS, ccuSpecs]);

  // Format options
  const FORMAT_OPTIONS = [
    '1080i59.94',
    '1080i60',
    '1080p59.94',
    '1080p60',
    '1080p50',
    '1080p30',
    '1080p25',
    '1080p24',
    '720p59.94',
    '720p60',
    '4K 59.94',
    '4K 60',
    '4K 50',
    '4K 30',
    '4K 25',
    '4K 24'
  ];

  const handleAddNew = () => {
    setFormData({ manufacturer: '', model: '', formatMode: '', outputs: [], equipmentUuid: undefined });
    setEditingCCU(null);
    setErrors([]);
    setIsModalOpen(true);
  };

  // Auto-populate outputs, formatMode, and equipmentUuid when model is selected
  const handleModelChange = (model: string) => {
    const spec = ccuSpecs.find(
      s => s.manufacturer === formData.manufacturer && s.model === model
    );
    const ioOutputs = spec?.outputs || [];
    const ccuNumber = ccus.length + 1;
    const outputs = ioOutputs.map((output, index) => ({
      id: `CCU${ccuNumber}-OUT${index + 1}`,
      type: output.type,
      label: output.label || output.type,
      format: output.format || '1080i59.94'
    }));
    const formatMode = spec?.deviceFormats?.[0] || formData.formatMode || '';
    setFormData({ ...formData, model, outputs, equipmentUuid: spec?.id, formatMode });
  };

  const handleEdit = (ccu: CCU) => {
    // Populate form fields from the CCU record (casting to access API-returned fields)
    const record = ccu as any;
    setFormData({
      id: record.id,
      name: record.name,
      manufacturer: record.manufacturer || '',
      model: record.model || '',
      formatMode: record.formatMode || '',
      fiberInput: record.fiberInput || '',
      referenceInput: record.referenceInput || '',
      outputs: record.outputs || [],
      equipmentUuid: record.equipmentUuid,
      note: record.note || '',
      version: record.version,
    });
    setEditingCCU(ccu);
    setErrors([]);
    setIsModalOpen(true);
  };

  const handleSave = async (action: 'close' | 'duplicate' = 'close') => {
    const newErrors: string[] = [];
    if (!formData.manufacturer?.trim()) newErrors.push('Manufacturer is required');
    if (!formData.model?.trim()) newErrors.push('Model is required');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (editingCCU) {
        // Update existing CCU — pass uuid (PK) not display id
        const uuid = (editingCCU as any).uuid;
        await ccusAPI.updateCCU(uuid, {
          productionId,
          name: formData.name,
          manufacturer: formData.manufacturer,
          model: formData.model,
          formatMode: formData.formatMode,
          fiberInput: formData.fiberInput,
          referenceInput: formData.referenceInput,
          outputs: formData.outputs,
          equipmentUuid: formData.equipmentUuid,
          note: formData.note,
          version: formData.version,
        });
      } else {
        // Auto-generate ID and name
        const newId = generateId();
        // Create new CCU — explicit fields, no spreads (Rule #6)
        await ccusAPI.createCCU({
          id: newId,
          productionId: productionId!,
          name: newId,
          manufacturer: formData.manufacturer,
          model: formData.model,
          formatMode: formData.formatMode,
          fiberInput: formData.fiberInput,
          referenceInput: formData.referenceInput,
          outputs: formData.outputs,
          equipmentUuid: formData.equipmentUuid,
          note: formData.note,
        });
      }
      
      if (action === 'duplicate') {
        // Generate new ID for duplicate
        const newId = generateId();
        setFormData({
          ...formData,
          id: newId,
          name: newId,
        });
        setEditingCCU(null);
        setErrors([]);
        // Don't close modal
      } else {
        setIsModalOpen(false);
        setFormData({ manufacturer: '', model: '', formatMode: '', outputs: [], equipmentUuid: undefined });
        setEditingCCU(null);
        setErrors([]);
      }
    } catch (error) {
      console.error('Failed to save CCU:', error);
      setErrors(['Failed to save CCU. Please try again.']);
    }
  };

  const handleDelete = async (uuid: string) => {
    if (confirm('Are you sure you want to delete this CCU?')) {
      try {
        await ccusAPI.deleteCCU(uuid);
        // State update handled by WebSocket entity:deleted event
      } catch (error) {
        console.error('Failed to delete CCU:', error);
        alert('Failed to delete CCU. Please try again.');
      }
    }
  };

  const generateId = (): string => {
    const ccuNumbers = ccus
      .map(c => {
        const match = c.id.match(/^CCU\s*(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const maxNumber = ccuNumbers.length > 0 ? Math.max(...ccuNumbers) : 0;
    return `CCU ${maxNumber + 1}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-textPrimary">CCUs</h1>
        </div>
        <button onClick={handleAddNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add CCU
        </button>
      </div>

      {/* CCUs List */}
      {ccus.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold text-av-text mb-2">No CCUs Found</h3>
          <p className="text-av-text-muted mb-4">
            Add your first CCU to get started
          </p>
          <button onClick={handleAddNew} className="btn-primary whitespace-nowrap">Add CCU</button>
        </Card>
      ) : (
        <div className="space-y-3">
          {ccus.map((ccu) => (
            <Card key={ccu.id} className="p-6 hover:border-av-accent/30 transition-colors">
              <div className="grid grid-cols-3 gap-6 items-center">
                {/* Left 1/3: ID and Name */}
                <div className="flex items-center gap-12">
                  <span className="text-sm text-av-text">{ccu.id}</span>
                  <h3 className="text-lg font-semibold text-av-text">{ccu.name}</h3>
                </div>
                
                {/* Middle 1/3: Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(ccu as any).manufacturer && <Badge>{(ccu as any).manufacturer}</Badge>}
                  {(ccu as any).model && <Badge>{(ccu as any).model}</Badge>}
                  {(() => {
                    const count = allCameras.filter(c => c.ccuId === ccu.id).length;
                    return count > 0 ? (
                      <Badge variant="info">{count} camera{count !== 1 ? 's' : ''}</Badge>
                    ) : null;
                  })()}
                </div>
                
                {/* Right 1/3: Format Mode and Action Buttons */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-av-text">
                    {(ccu as any).formatMode || 'N/A'}
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(ccu)}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        // Duplicate CCU by opening modal with duplicated data
                        const ccuNumbers = ccus
                          .map(c => {
                            const match = c.id.match(/^CCU\s*(\d+)$/i);
                            return match ? parseInt(match[1], 10) : 0;
                          })
                          .filter(n => !isNaN(n));
                        const maxNumber = ccuNumbers.length > 0 ? Math.max(...ccuNumbers) : 0;
                        const newId = `CCU ${maxNumber + 1}`;
                        const r = ccu as any;
                        setFormData({
                          id: newId,
                          name: `${r.name || r.id} (Copy)`,
                          manufacturer: r.manufacturer || '',
                          model: r.model || '',
                          formatMode: r.formatMode || '',
                          fiberInput: r.fiberInput || '',
                          referenceInput: r.referenceInput || '',
                          outputs: r.outputs || [],
                          equipmentUuid: undefined, // don't carry equipmentUuid to dupe
                          note: r.note || '',
                        });
                        setEditingCCU(null);
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-info transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete((ccu as any).uuid || ccu.id)}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {(ccu as any).note && (
                <div className="mt-3">
                  <p className="text-sm text-av-text-muted">
                    <span className="font-medium">Note:</span> {(ccu as any).note}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-av-surface border border-av-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-av-border">
              <h2 className="text-2xl font-bold text-av-text">
                {editingCCU ? 'Edit CCU' : 'Add New CCU'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-text transition-colors"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSave('close'); }} className="p-6 space-y-4">
              {errors.length > 0 && (
                <div className="bg-av-danger/10 border border-av-danger rounded-md p-3">
                  {errors.map((err, i) => (
                    <p key={i} className="text-sm text-av-danger">{err}</p>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Manufacturer
                  </label>
                  <select
                    value={formData.manufacturer || ''}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value, model: '', formatMode: '', outputs: [], equipmentUuid: undefined })}
                    className="input-field w-full"
                  >
                    <option value="">Select manufacturer...</option>
                    {CCU_MANUFACTURERS.map(mfr => (
                      <option key={mfr} value={mfr}>{mfr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Model
                  </label>
                  <select
                    value={formData.model || ''}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="input-field w-full"
                    disabled={!formData.manufacturer}
                  >
                    <option value="">Select model...</option>
                    {formData.manufacturer && CCU_MODELS_BY_MANUFACTURER[formData.manufacturer]?.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Format Mode: auto-filled from spec, but editable */}
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Format Mode
                  {formData.equipmentUuid && (
                    <span className="text-xs text-av-text-muted ml-2">(auto-filled from spec)</span>
                  )}
                </label>
                <select
                  value={formData.formatMode || ''}
                  onChange={(e) => setFormData({ ...formData, formatMode: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="">Select format mode...</option>
                  {FORMAT_OPTIONS.map(format => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
              </div>

              {formData.outputs && formData.outputs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Outputs (Auto-configured from model specs)
                  </label>
                  <div className="space-y-2">
                    {formData.outputs.map((output, index) => (
                      <div key={output.id} className="flex items-center gap-2 p-3 bg-av-surface-hover rounded-lg">
                        <Badge variant="default" className="text-xs">
                          {index + 1}
                        </Badge>
                        <span className="text-sm text-av-text w-32">{output.type}</span>
                        <div className="flex-1">
                          <select
                            value={output.format || ''}
                            onChange={(e) => {
                              const newOutputs = [...(formData.outputs || [])];
                              newOutputs[index] = { ...output, format: e.target.value };
                              setFormData({ ...formData, outputs: newOutputs });
                            }}
                            className="input-field text-sm w-full"
                          >
                            {FORMAT_OPTIONS.map(format => (
                              <option key={format} value={format}>{format}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
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
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
