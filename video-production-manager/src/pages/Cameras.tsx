import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Video, Link as LinkIcon, Copy } from 'lucide-react';
import { Card, Badge, EmptyState } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import type { Camera } from '@/types';

export default function Cameras() {
  const { activeProject } = useProjectStore();
  const projectStore = useProjectStore();
  const oldStore = useProductionStore();
  
  const cameras = activeProject?.cameras || oldStore.cameras;
  const ccus = activeProject?.ccus || oldStore.ccus;
  
  // Use project store CRUD if activeProject exists, otherwise use old store
  const addCamera = activeProject ? projectStore.addCamera : oldStore.addCamera;
  const updateCamera = activeProject ? projectStore.updateCamera : oldStore.updateCamera;
  const deleteCamera = activeProject ? projectStore.deleteCamera : oldStore.deleteCamera;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [formData, setFormData] = useState<Partial<Camera>>({
    id: '',
    name: '',
    model: '',
    formatMode: '',
    lensType: 'zoom',
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
      model: '',
      formatMode: '',
      lensType: 'zoom',
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

  const handleSave = () => {
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

    if (editingCamera) {
      updateCamera(editingCamera.id, finalFormData);
    } else {
      addCamera(finalFormData as Camera);
    }
    setIsModalOpen(false);
    setFormData({
      id: '',
      name: '',
      model: '',
      formatMode: '',
      lensType: 'zoom',
      hasTripod: false,
      hasShortTripod: false,
      hasDolly: false,
      hasJib: false,
      ccuId: '',
      note: '',
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this camera?')) {
      deleteCamera(id);
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
                    {camera.model && <Badge>{camera.model}</Badge>}
                    {camera.lensType && (
                      <Badge>
                        {camera.lensType === 'zoom' ? `${camera.maxZoom || 0}x Zoom` : 'Prime Lens'}
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
                      Model
                    </label>
                    <select
                      value={formData.model || ''}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="input-field w-full"
                    >
                      <option value="">Select model...</option>
                      <optgroup label="Sony">
                        <option value="Sony HDC-5500">Sony HDC-5500 (2024)</option>
                        <option value="Sony HDC-3500">Sony HDC-3500 (2021)</option>
                        <option value="Sony HDC-3200">Sony HDC-3200 (2023)</option>
                        <option value="Sony HDC-2500">Sony HDC-2500 (2021)</option>
                        <option value="Sony HDC-P50">Sony HDC-P50 (2021)</option>
                        <option value="Sony HXC-FZ90">Sony HXC-FZ90 (2022)</option>
                        <option value="Sony HXC-FB80">Sony HXC-FB80 (2023)</option>
                        <option value="Sony HDC-F5500">Sony HDC-F5500 (2023)</option>
                      </optgroup>
                      <optgroup label="Panasonic">
                        <option value="Panasonic AK-UC4000">Panasonic AK-UC4000 (2019)</option>
                        <option value="Panasonic AK-UC3300">Panasonic AK-UC3300 (2023)</option>
                        <option value="Panasonic AK-UCU600">Panasonic AK-UCU600 (2022)</option>
                        <option value="Panasonic AW-UE160">Panasonic AW-UE160 (2023)</option>
                        <option value="Panasonic AW-UE100">Panasonic AW-UE100 (2021)</option>
                        <option value="Panasonic AK-HC5000">Panasonic AK-HC5000 (2020)</option>
                      </optgroup>
                      <optgroup label="Grass Valley">
                        <option value="GV LDX 150">Grass Valley LDX 150 (2023)</option>
                        <option value="GV LDX 100">Grass Valley LDX 100 (2021)</option>
                        <option value="GV LDX 86N">Grass Valley LDX 86N (2019)</option>
                        <option value="GV LDX C86N">Grass Valley LDX C86N (2020)</option>
                        <option value="GV LDX C82">Grass Valley LDX C82 (2022)</option>
                        <option value="GV LDX XtremeSpeed">Grass Valley LDX XtremeSpeed (2021)</option>
                      </optgroup>
                      <optgroup label="Ikegami">
                        <option value="Ikegami UHK-X700">Ikegami UHK-X700 (2023)</option>
                        <option value="Ikegami UHK-X600">Ikegami UHK-X600 (2022)</option>
                        <option value="Ikegami UHL-F4000">Ikegami UHL-F4000 (2021)</option>
                        <option value="Ikegami HDK-99">Ikegami HDK-99 (2020)</option>
                        <option value="Ikegami HDK-97A">Ikegami HDK-97A (2019)</option>
                      </optgroup>
                      <optgroup label="Blackmagic Design">
                        <option value="Blackmagic URSA Broadcast G2">Blackmagic URSA Broadcast G2 (2021)</option>
                        <option value="Blackmagic Studio Camera 6K Pro">Blackmagic Studio Camera 6K Pro (2023)</option>
                        <option value="Blackmagic Studio Camera 4K Plus G2">Blackmagic Studio Camera 4K Plus G2 (2022)</option>
                        <option value="Blackmagic Studio Camera 4K Pro G2">Blackmagic Studio Camera 4K Pro G2 (2024)</option>
                        <option value="Blackmagic URSA Mini Pro 12K">Blackmagic URSA Mini Pro 12K (2020)</option>
                      </optgroup>
                      <optgroup label="Other">
                        <option value="Canon XF705">Canon XF705</option>
                        <option value="Other">Other</option>
                      </optgroup>
                    </select>
                  </div>
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
              
              {/* Lens Configuration */}
              <div>
                <h3 className="text-lg font-semibold text-av-text mb-3">Lens Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-2">
                      Lens Type
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="lensType"
                          value="zoom"
                          checked={formData.lensType === 'zoom'}
                          onChange={(e) => setFormData({ ...formData, lensType: e.target.value as 'zoom' | 'prime' })}
                          className="w-4 h-4"
                        />
                        <span className="text-av-text">Zoom Lens</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="lensType"
                          value="prime"
                          checked={formData.lensType === 'prime'}
                          onChange={(e) => setFormData({ ...formData, lensType: e.target.value as 'zoom' | 'prime' })}
                          className="w-4 h-4"
                        />
                        <span className="text-av-text">Prime Lens</span>
                      </label>
                    </div>
                  </div>
                  
                  {formData.lensType === 'zoom' && (
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
                  )}
                  <p className="text-xs text-av-text-muted">
                    {formData.lensType === 'zoom' 
                      ? 'Enter shooting distance to calculate required zoom, or specify max zoom directly' 
                      : 'Prime lens configuration'}
                  </p>
                </div>
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
