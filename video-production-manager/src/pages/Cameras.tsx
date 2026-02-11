import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Video, Link as LinkIcon, Copy } from 'lucide-react';
import { Card, Badge, EmptyState } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import type { Camera } from '@/types';

export default function Cameras() {
  const { activeProject } = useProjectStore();
  const projectStore = useProjectStore();
  const oldStore = useProductionStore();
  const equipmentLib = useEquipmentLibrary();
  
  // Fetch equipment data on mount
  useEffect(() => {
    if (equipmentLib.equipmentSpecs.length === 0) {
      equipmentLib.fetchFromAPI();
    }
  }, []);
  
  const cameras = activeProject?.cameras || oldStore.cameras;
  const ccus = activeProject?.ccus || oldStore.ccus;
  const equipmentSpecs = equipmentLib.equipmentSpecs.length > 0 ? equipmentLib.equipmentSpecs : oldStore.equipmentSpecs;
  
  // Get camera equipment specs from store
  const cameraSpecs = equipmentSpecs.filter(spec => spec.category === 'CAMERA');
  
  // Get unique manufacturers from equipment specs
  const CAMERA_MANUFACTURERS = Array.from(new Set(cameraSpecs.map(spec => spec.manufacturer))).sort();
  
  // Get models by manufacturer from equipment specs
  const CAMERA_MODELS_BY_MANUFACTURER: Record<string, string[]> = {};
  CAMERA_MANUFACTURERS.forEach(mfr => {
    CAMERA_MODELS_BY_MANUFACTURER[mfr] = cameraSpecs
      .filter(spec => spec.manufacturer === mfr)
      .map(spec => spec.model)
      .sort();
  });
  
  // Use project store CRUD if activeProject exists, otherwise use old store
  const addCamera = activeProject ? projectStore.addCamera : oldStore.addCamera;
  const updateCamera = activeProject ? projectStore.updateCamera : oldStore.updateCamera;
  const deleteCamera = activeProject ? projectStore.deleteCamera : oldStore.deleteCamera;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [formData, setFormData] = useState<Partial<Camera>>({
    id: '',
    name: '',
    manufacturer: '',
    model: '',
    formatMode: '',
    maxZoom: undefined,
    shootingDistance: undefined,
    calculatedZoom: undefined,
    hasTripod: false,
    hasShortTripod: false,
    hasDolly: false,
    hasJib: false,
    ccuId: '',
    smpteCableLength: undefined,
    note: '',
  });
  const [errors, setErrors] = useState<string[]>([]);

  const camerasWithCCU = cameras.filter(c => c.ccuId).length;
  const camerasWithSupport = cameras.filter(c => c.hasTripod || c.hasShortTripod || c.hasDolly || c.hasJib).length;

  const handleAddNew = () => {
    const newId = generateId();
    setFormData({
      id: newId,
      name: '',
      manufacturer: '',
      model: '',
      formatMode: '',
      maxZoom: undefined,
      shootingDistance: undefined,
      calculatedZoom: undefined,
      hasTripod: false,
      hasShortTripod: false,
      hasDolly: false,
      hasJib: false,
      ccuId: '',
      smpteCableLength: undefined,
      note: '',
    });
    setEditingCamera(null);
    setErrors([]);
    setIsModalOpen(true);
  };

  const handleEdit = (camera: Camera) => {
    setFormData(camera);
    setEditingCamera(camera);
    setErrors([]);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const newErrors: string[] = [];
    if (!formData.id?.trim()) newErrors.push('ID is required');
    if (!formData.name?.trim()) newErrors.push('Name is required');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    // Inherit format mode from CCU if connected
    let finalFormData = { ...formData };
    if (formData.ccuId) {
      const connectedCCU = ccus.find(c => c.id === formData.ccuId);
      if (connectedCCU && connectedCCU.formatMode) {
        finalFormData.formatMode = connectedCCU.formatMode;
      }
    }

    try {
      if (editingCamera) {
        await updateCamera(editingCamera.id, finalFormData);
      } else {
        await addCamera(finalFormData as Camera);
      }
      setIsModalOpen(false);
      setFormData({
        id: '',
        name: '',
        manufacturer: '',
        model: '',
        formatMode: '',
        hasTripod: false,
        hasShortTripod: false,
        hasDolly: false,
        hasJib: false,
        ccuId: '',
        note: '',
      });
    } catch (error: any) {
      console.error('Failed to save camera:', error);
      
      // Handle duplicate ID error
      if (error?.response?.status === 409 || error?.response?.data?.code === 'DUPLICATE_ID') {
        const suggestedId = generateId();
        setErrors([
          `Camera ID "${formData.id}" is already in use. Please choose a different ID.`,
          `Suggestion: Use "${suggestedId}" instead.`
        ]);
        return;
      }
      
      // Generic error
      setErrors(['Failed to save camera. Please try again.']);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this camera?')) {
      try {
        await deleteCamera(id);
      } catch (error) {
        console.error('Failed to delete camera:', error);
        alert('Failed to delete camera. Please try again.');
      }
    }
  };

  const generateId = (): string => {
    const camNumbers = cameras
      .map(c => {
        const match = c.id.match(/^CAM\s*(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const maxNumber = camNumbers.length > 0 ? Math.max(...camNumbers) : 0;
    return `CAM ${maxNumber + 1}`;
  };

  const calculateZoom = (distance: number): number => {
    // Simple calculation: distance in feet / 10 = suggested zoom
    return Math.round(distance / 10);
  };

  const handleDistanceChange = (distance: number) => {
    setFormData({
      ...formData,
      shootingDistance: distance,
      calculatedZoom: calculateZoom(distance),
    });
  };

  const getSupportBadges = (camera: Camera) => {
    const badges: string[] = [];
    if (camera.hasTripod) badges.push('Tripod');
    if (camera.hasShortTripod) badges.push('Short Tripod');
    if (camera.hasDolly) badges.push('Dolly');
    if (camera.hasJib) badges.push('Jib');
    return badges;
  };

  const getCCUName = (ccuId?: string) => {
    if (!ccuId) return null;
    const ccu = ccus.find(c => c.id === ccuId);
    return ccu?.name;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-text">Cameras</h1>
        </div>
        <button onClick={handleAddNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Camera
        </button>
      </div>

      {/* Cameras List */}
      {cameras.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No Cameras Found"
          description="Add your first camera to get started"
          actionLabel="Add Camera"
          onAction={handleAddNew}
        />
      ) : (
        <div className="space-y-3">
          {cameras.map((camera) => {
            const supportBadges = getSupportBadges(camera);
            const ccuName = getCCUName(camera.ccuId);
            
            return (
              <Card key={camera.id} className="p-6 hover:border-av-accent/30 transition-colors">
                <div className="grid grid-cols-3 gap-6 items-center">
                  {/* Left 1/3: ID and Name */}
                  <div className="flex items-center gap-12">
                    <span className="text-sm text-av-text">{camera.id}</span>
                    <h3 className="text-lg font-semibold text-av-text">{camera.name}</h3>
                  </div>
                  
                  {/* Middle 1/3: Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {camera.manufacturer && <Badge>{camera.manufacturer}</Badge>}
                    {camera.model && <Badge>{camera.model}</Badge>}
                    {camera.maxZoom && (
                      <Badge>
                        {camera.maxZoom}x Zoom
                      </Badge>
                    )}
                    {supportBadges.map(badge => (
                      <Badge key={badge}>{badge}</Badge>
                    ))}
                  </div>
                  
                  {/* Right 1/3: Format Mode, CCU Connection, and Action Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="text-av-text">
                        {camera.formatMode || 'N/A'}
                      </div>
                      {ccuName && (
                        <div className="flex items-center gap-1 text-av-text-muted mt-1">
                          <LinkIcon className="w-3 h-3" />
                          <span>{ccuName}</span>
                          {camera.smpteCableLength && (
                            <span className="text-xs">({camera.smpteCableLength}ft)</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(camera)}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          // Duplicate camera by opening modal with duplicated data
                          const newId = generateId();
                          setFormData({
                            ...camera,
                            id: newId,
                            name: `${camera.name} (Copy)`,
                            ccuId: camera.ccuId // Preserve CCU connection
                          });
                          setEditingCamera(null);
                          setIsModalOpen(true);
                        }}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-info transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(camera.id)}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {camera.note && (
                  <div className="mt-3">
                    <p className="text-sm text-av-text-muted">
                      <span className="font-medium">Note:</span> {camera.note}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-av-surface border border-av-border rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-av-border">
              <h2 className="text-2xl font-bold text-av-text">
                {editingCamera ? 'Edit Camera' : 'Add New Camera'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-text transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="p-6 space-y-6">
              {errors.length > 0 && (
                <div className="bg-av-danger/10 border border-av-danger rounded-md p-3">
                  {errors.map((err, i) => (
                    <p key={i} className="text-sm text-av-danger">{err}</p>
                  ))}
                </div>
              )}
              
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-av-text mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-2">
                      ID <span className="text-av-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.id}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-2">
                      Name <span className="text-av-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-field w-full"
                      required
                    />
                  </div>
                </div>
              </div>
              
              {/* Camera Model */}
              <div>
                <h3 className="text-lg font-semibold text-av-text mb-3">Camera Model</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-2">
                      Manufacturer
                    </label>
                    <select
                      value={formData.manufacturer || ''}
                      onChange={(e) => {
                        const manufacturer = e.target.value;
                        setFormData({ ...formData, manufacturer, model: '' });
                      }}
                      className="input-field w-full"
                    >
                      <option value="">Select manufacturer...</option>
                      {CAMERA_MANUFACTURERS.map(mfr => (
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
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="input-field w-full"
                      disabled={!formData.manufacturer}
                    >
                      <option value="">Select model...</option>
                      {formData.manufacturer && CAMERA_MODELS_BY_MANUFACTURER[formData.manufacturer]?.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    {!formData.manufacturer && (
                      <p className="text-xs text-av-text-muted mt-1">
                        Select manufacturer first
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* CCU Connection */}
              <div>
                <h3 className="text-lg font-semibold text-av-text mb-3">CCU Connection</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-2">
                      Connected CCU
                    </label>
                    <select
                      value={formData.ccuId || ''}
                      onChange={(e) => {
                        const selectedCCUId = e.target.value;
                        const selectedCCU = ccus.find(c => c.id === selectedCCUId);
                        setFormData({
                          ...formData,
                          ccuId: selectedCCUId,
                          formatMode: selectedCCU?.formatMode || formData.formatMode,
                        });
                      }}
                      className="input-field w-full"
                    >
                      <option value="">No CCU connection</option>
                      {ccus.map(ccu => (
                        <option key={ccu.id} value={ccu.id}>
                          {ccu.name} ({ccu.id})
                        </option>
                      ))}
                    </select>
                    {ccus.length === 0 && (
                      <p className="text-xs text-av-text-muted mt-1">
                        No CCUs available. Add CCUs first.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Zoom Lens Configuration */}
              <div>
                <h3 className="text-lg font-semibold text-av-text mb-3">Zoom Lens Configuration</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-2">
                      Max Zoom (x)
                    </label>
                    <input
                      type="number"
                      value={formData.maxZoom || ''}
                      onChange={(e) => setFormData({ ...formData, maxZoom: parseFloat(e.target.value) })}
                      className="input-field w-full"
                      placeholder="e.g., 20"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-2">
                      Shooting Distance (ft)
                    </label>
                    <input
                      type="number"
                      value={formData.shootingDistance || ''}
                      onChange={(e) => handleDistanceChange(parseFloat(e.target.value) || 0)}
                      className="input-field w-full"
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-2">
                      Calculated Zoom
                    </label>
                    <input
                      type="text"
                      value={formData.calculatedZoom ? `${formData.calculatedZoom}x` : ''}
                      className="input-field w-full bg-av-surface-light"
                      disabled
                      placeholder="Auto-calculated"
                    />
                  </div>
                </div>
                <p className="text-xs text-av-text-muted mt-2">
                  Enter shooting distance to calculate required zoom, or specify max zoom directly
                </p>
              </div>
              
              {/* Support Equipment */}
              <div>
                <h3 className="text-lg font-semibold text-av-text mb-3">Support Equipment</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setFormData({ ...formData, hasTripod: !formData.hasTripod })}
                    className={`cursor-pointer p-3 rounded-md border-2 transition-all ${
                      formData.hasTripod 
                        ? 'border-av-accent bg-av-accent/10' 
                        : 'border-av-border hover:border-av-accent/30'
                    }`}
                  >
                    <span className="text-av-text">Tripod</span>
                  </div>
                  <div 
                    onClick={() => setFormData({ ...formData, hasShortTripod: !formData.hasShortTripod })}
                    className={`cursor-pointer p-3 rounded-md border-2 transition-all ${
                      formData.hasShortTripod 
                        ? 'border-av-accent bg-av-accent/10' 
                        : 'border-av-border hover:border-av-accent/30'
                    }`}
                  >
                    <span className="text-av-text">Short Tripod</span>
                  </div>
                  <div 
                    onClick={() => setFormData({ ...formData, hasDolly: !formData.hasDolly })}
                    className={`cursor-pointer p-3 rounded-md border-2 transition-all ${
                      formData.hasDolly 
                        ? 'border-av-accent bg-av-accent/10' 
                        : 'border-av-border hover:border-av-accent/30'
                    }`}
                  >
                    <span className="text-av-text">Dolly</span>
                  </div>
                  <div 
                    onClick={() => setFormData({ ...formData, hasJib: !formData.hasJib })}
                    className={`cursor-pointer p-3 rounded-md border-2 transition-all ${
                      formData.hasJib 
                        ? 'border-av-accent bg-av-accent/10' 
                        : 'border-av-border hover:border-av-accent/30'
                    }`}
                  >
                    <span className="text-av-text">Jib</span>
                  </div>
                </div>
              </div>
              
              {/* SMPTE Cable Length (only show if CCU is connected) */}
              {formData.ccuId && (
                <div>
                  <h3 className="text-lg font-semibold text-av-text mb-3">CCU Connection Details</h3>
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-2">
                      SMPTE Fiber Cable Length (ft)
                    </label>
                    <input
                      type="number"
                      value={formData.smpteCableLength || ''}
                      onChange={(e) => setFormData({ ...formData, smpteCableLength: parseFloat(e.target.value) })}
                      className="input-field w-full"
                      placeholder="e.g., 100"
                    />
                  </div>
                </div>
              )}
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">Notes</label>
                <textarea
                  value={formData.note || ''}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="input-field w-full"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingCamera ? 'Update' : 'Add'} Camera
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
