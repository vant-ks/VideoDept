import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Edit2, Trash2, Video, Link as LinkIcon, Copy, GripVertical } from 'lucide-react';
import { Card, Badge, EmptyState } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { useCamerasAPI } from '@/hooks/useCamerasAPI';
import { useCCUsAPI } from '@/hooks/useCCUsAPI';
import { useProductionEvents } from '@/hooks/useProductionEvents';
import { apiClient } from '@/services';
import { getCurrentUserId } from '@/utils/userUtils';
import type { Camera } from '@/types';

export default function Cameras() {
  const { activeProject } = useProjectStore();
  const projectStore = useProjectStore();
  const oldStore = useProductionStore();
  const equipmentLib = useEquipmentLibrary();
  const camerasAPI = useCamerasAPI();
  const ccusAPI = useCCUsAPI();
  
  // Extract store values FIRST (before using them)
  const cameras = activeProject?.cameras || oldStore.cameras;
  const ccus = activeProject?.ccus || oldStore.ccus;
  const equipmentSpecs = equipmentLib.equipmentSpecs.length > 0 ? equipmentLib.equipmentSpecs : oldStore.equipmentSpecs;
  
  // Use project store CRUD if activeProject exists, otherwise use old store
  const addCamera = activeProject ? projectStore.addCamera : oldStore.addCamera;
  const updateCamera = activeProject ? projectStore.updateCamera : oldStore.updateCamera;
  const deleteCamera = activeProject ? projectStore.deleteCamera : oldStore.deleteCamera;
  
  // Local state for cameras
  const [localCameras, setLocalCameras] = useState<Camera[]>(cameras);
  // Local CCU list for the form dropdown — fetched from API on mount
  const [localCCUs, setLocalCCUs] = useState<any[]>(ccus);

  // Drag-to-reorder state
  const isDragInProgress = useRef(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // NOTE: Do NOT sync localCameras from store on every change — the store
  // sync overwrites WebSocket and optimistic updates. API fetch on mount is
  // the single source of truth for localCameras.

  // Get production ID for WebSocket subscription
  const productionId = activeProject?.production?.id || oldStore.production?.id;
  
  // Handle real-time WebSocket updates
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback((event) => {
      if (event.entityType === 'camera') {
        if (isDragInProgress.current) return;
        console.log('🔔 Camera created by', event.userName, '| Camera:', event.entity.id);
        setLocalCameras(prev => {
          // Avoid duplicates using uuid (immutable PK)
          if (prev.some(c => (c as any).uuid === event.entity.uuid)) {
            console.log('⚠️ Duplicate detected - skipping add');
            return prev;
          }
          console.log('✅ Adding camera to state via WebSocket');
          return [...prev, event.entity];
        });
        // Also update project store
        if (activeProject && !cameras.some(c => (c as any).uuid === event.entity.uuid)) {
          addCamera(event.entity);
        }
      }
    }, [activeProject, cameras, addCamera]),
    onEntityUpdated: useCallback((event) => {
      if (event.entityType === 'camera') {
        if (isDragInProgress.current) return;
        console.log('🔔 Camera updated by', event.userName);
        setLocalCameras(prev => prev.map(c => 
          (c as any).uuid === event.entity.uuid ? event.entity : c
        ));
        // Also update project store
        if (activeProject) {
          updateCamera(event.entity.id, event.entity);
        }
      }
    }, [activeProject, updateCamera]),
    onEntityDeleted: useCallback((event) => {
      if (event.entityType === 'camera') {
        console.log('🔔 Camera deleted by', event.userName, '| uuid:', event.entityId);
        // entityId from server is the UUID — filter by uuid not display id
        setLocalCameras(prev => {
          const deletedCamera = prev.find(c => (c as any).uuid === event.entityId);
          if (deletedCamera && activeProject) {
            deleteCamera(deletedCamera.id); // store uses display id
          }
          return prev.filter(c => (c as any).uuid !== event.entityId);
        });
      }
    }, [activeProject, deleteCamera])
  });
  
  // Fetch equipment data on mount
  useEffect(() => {
    if (equipmentLib.equipmentSpecs.length === 0) {
      equipmentLib.fetchFromAPI();
    }
  }, []);

  // Fetch cameras from API on mount
  useEffect(() => {
    if (productionId && oldStore.isConnected) {
      camerasAPI.fetchCameras(productionId)
        .then(data => setLocalCameras(data))
        .catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);

  // Fetch CCUs from API on mount so dropdown is always fresh from DB
  useEffect(() => {
    if (productionId && oldStore.isConnected) {
      ccusAPI.fetchCCUs(productionId)
        .then(data => setLocalCCUs(data))
        .catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);

  // Cameras sorted by CAM number for display (non-CAM IDs sort after)
  const sortedCameras = useMemo(() => {
    return [...localCameras].sort((a, b) => {
      const aMatch = a.id.match(/^CAM\s*(\d+)$/i);
      const bMatch = b.id.match(/^CAM\s*(\d+)$/i);
      const aNum = aMatch ? parseInt(aMatch[1], 10) : Infinity;
      const bNum = bMatch ? parseInt(bMatch[1], 10) : Infinity;
      if (aNum !== bNum) return aNum - bNum;
      return a.id.localeCompare(b.id);
    });
  }, [localCameras]);

  // Get camera equipment specs - recompute when equipmentSpecs changes
  const cameraSpecs = useMemo(() => 
    equipmentSpecs.filter(spec => spec.category === 'camera' || spec.category === 'ptz'),
    [equipmentSpecs]
  );
  
  // Get unique manufacturers - recompute when cameraSpecs changes
  const CAMERA_MANUFACTURERS = useMemo(() => 
    Array.from(new Set(cameraSpecs.map(spec => spec.manufacturer))).sort(),
    [cameraSpecs]
  );
  
  // Get models by manufacturer - recompute when cameraSpecs changes
  const CAMERA_MODELS_BY_MANUFACTURER = useMemo(() => {
    const result: Record<string, string[]> = {};
    CAMERA_MANUFACTURERS.forEach(mfr => {
      result[mfr] = cameraSpecs
        .filter(spec => spec.manufacturer === mfr)
        .map(spec => spec.model)
        .sort();
    });
    return result;
  }, [CAMERA_MANUFACTURERS, cameraSpecs]);
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
    focalLength: undefined,
    hasHeavyTripod: false,
    hasMediumTripod: false,
    hasTripod: false,
    hasShortTripod: false,
    hasDolly: false,
    hasJib: false,
    hasSteadicam: false,
    hasMagicArm: false,
    ccuId: '',
    smpteCableLength: undefined,
    note: '',
  });
  const [errors, setErrors] = useState<string[]>([]);

  // Migration: if modal is open editing an old camera whose manufacturer is still blank
  // (combined model string in DB), retry the parse-back now that cameraSpecs may have loaded.
  useEffect(() => {
    if (!isModalOpen || !editingCamera || formData.manufacturer || !formData.model || cameraSpecs.length === 0) return;
    const matchingSpec = cameraSpecs.find(spec =>
      formData.model === `${spec.manufacturer} ${spec.model}`
    );
    if (matchingSpec) {
      setFormData(prev => ({
        ...prev,
        manufacturer: matchingSpec.manufacturer,
        model: matchingSpec.model,
        equipmentUuid: (matchingSpec as any).uuid,
      }));
    }
  }, [cameraSpecs, isModalOpen]);

  const camerasWithCCU = cameras.filter(c => c.ccuId).length;
  const camerasWithSupport = cameras.filter(c => c.hasHeavyTripod || c.hasMediumTripod || c.hasTripod || c.hasShortTripod || c.hasDolly || c.hasJib).length;

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
      focalLength: undefined,
      hasHeavyTripod: false,
      hasMediumTripod: false,
      hasTripod: false,
      hasShortTripod: false,
      hasDolly: false,
      hasJib: false,
      hasSteadicam: false,
      hasMagicArm: false,
      ccuId: '',
      smpteCableLength: undefined,
      note: '',
    });
    setEditingCamera(null);
    setErrors([]);
    setIsModalOpen(true);
  };

  const handleEdit = (camera: Camera) => {
    let editFormData: Partial<Camera> = { ...camera };

    // Migration: old records stored model as a combined "Manufacturer Model" string.
    // If manufacturer is missing from DB, try to parse it back from equipment specs.
    // New records will have manufacturer stored separately and this block is skipped.
    if (!camera.manufacturer && camera.model && cameraSpecs.length > 0) {
      const matchingSpec = cameraSpecs.find(spec =>
        camera.model === `${spec.manufacturer} ${spec.model}`
      );
      if (matchingSpec) {
        editFormData = {
          ...editFormData,
          manufacturer: matchingSpec.manufacturer,
          model: matchingSpec.model,
          equipmentUuid: (matchingSpec as any).uuid,
        };
      }
    }

    setFormData(editFormData);
    setEditingCamera(camera);
    setErrors([]);
    setIsModalOpen(true);
  };

  const handleSave = async (action: 'close' | 'duplicate' = 'close') => {
    const newErrors: string[] = [];
    if (!formData.id?.trim()) newErrors.push('ID is required');
    if (!formData.name?.trim()) newErrors.push('Name is required');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const productionId = activeProject?.production?.id || oldStore.production?.id;
    if (!productionId) {
      alert('No production selected');
      return;
    }

    // Inherit format mode from CCU if connected
    let finalFormData = { ...formData };
    if (formData.ccuId) {
      const connectedCCU = localCCUs.find((c: any) => c.id === formData.ccuId);
      if (connectedCCU && (connectedCCU as any).formatMode) {
        finalFormData.formatMode = (connectedCCU as any).formatMode;
      }
    }

    try {
      let newCamera: Camera | undefined = undefined;

      if (editingCamera) {
        // Update existing camera via API — pass uuid (PK) not display id
        const result = await camerasAPI.updateCamera((editingCamera as any).uuid || editingCamera.id, {
          ...finalFormData,
          productionId,
          version: editingCamera.version,
        });
        
        // Check for conflict
        if ('error' in result) {
          alert(`Version conflict: ${result.message}\nPlease refresh and try again.`);
          return;
        }
        // Optimistic local state update (WebSocket will also fire and dedup)
        setLocalCameras(prev => prev.map(c =>
          (c as any).uuid === (editingCamera as any).uuid ? result : c
        ));
        // Also update project store
        if (activeProject) {
          updateCamera(result.id, result);
        }
      } else {
        // Create new camera via API
        console.log('💾 Creating new camera with id:', finalFormData.id);
        
        const newCamera_result = await camerasAPI.createCamera({
          id: finalFormData.id as string,
          name: finalFormData.name as string,
          manufacturer: finalFormData.manufacturer,
          model: finalFormData.model,
          formatMode: finalFormData.formatMode,
          maxZoom: finalFormData.maxZoom,
          shootingDistance: finalFormData.shootingDistance,
          hasHeavyTripod: finalFormData.hasHeavyTripod,
          hasMediumTripod: finalFormData.hasMediumTripod,
          hasTripod: finalFormData.hasTripod,
          hasShortTripod: finalFormData.hasShortTripod,
          hasDolly: finalFormData.hasDolly,
          hasJib: finalFormData.hasJib,
          hasSteadicam: finalFormData.hasSteadicam,
          hasMagicArm: finalFormData.hasMagicArm,
          ccuId: finalFormData.ccuId,
          smpteCableLength: finalFormData.smpteCableLength,
          equipmentUuid: finalFormData.equipmentUuid,
          note: finalFormData.note,
          productionId,
        });
        newCamera = newCamera_result;
        console.log('✅ Camera created successfully:', { id: newCamera.id });
        
        // Optimistic local state update
        // WebSocket handler will dedup by uuid if it fires before this resolves
        setLocalCameras(prev => {
          if (newCamera && prev.some(c => (c as any).uuid === (newCamera as any).uuid)) return prev;
          return newCamera ? [...prev, newCamera] : prev;
        });
      }
      
      if (action === 'duplicate') {
        // Generate new ID for duplicate
        // newCamera.id was just added to state (when creating); when editing, current id is in formData
        // localCameras state hasn't updated yet (React batches), so include the new camera id explicitly
        const justCreatedId = newCamera?.id;
        const existingIds = justCreatedId
          ? [...localCameras.map(c => c.id), justCreatedId]
          : localCameras.map(c => c.id);
        const baseId = formData.id?.replace(/\s*\d+$/, '') || 'CAM';
        let counter = 1;
        let newId = `${baseId} ${counter}`;
        while (existingIds.includes(newId)) {
          counter++;
          newId = `${baseId} ${counter}`;
        }
        
        // Keep modal open with duplicated data
        setFormData({
          ...formData,
          id: newId,
          name: `${formData.name} (Copy)` as string,
        });
        setEditingCamera(null);
        setErrors([]);
        // Don't close modal
      } else {
        setIsModalOpen(false);
      setFormData({
        id: '',
        name: '',
        manufacturer: '',
        model: '',
        formatMode: '',
        hasHeavyTripod: false,
        hasMediumTripod: false,
        hasTripod: false,
        hasShortTripod: false,
        hasDolly: false,
        hasJib: false,
        hasSteadicam: false,
        hasMagicArm: false,
        ccuId: '',
        note: '',
      });
        setEditingCamera(null);
        setErrors([]);
      }
    } catch (error: any) {
      console.error('❌ Failed to save camera:', error);
      alert(error.message || 'Failed to save camera. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this camera?')) {
      try {
        await camerasAPI.deleteCamera(id);
        // Optimistic: remove immediately (WS entity:deleted will also fire)
        setLocalCameras(prev => prev.filter(c => (c as any).uuid !== id));
      } catch (error: any) {
        console.error('❌ Failed to delete camera:', error);
        alert(error.message || 'Failed to delete camera. Please try again.');
      }
    }
  };

  const generateId = (): string => {
    const camNumbers = localCameras
      .map(c => {
        const match = c.id.match(/^CAM\s*(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const maxNumber = camNumbers.length > 0 ? Math.max(...camNumbers) : 0;
    return `CAM ${maxNumber + 1}`;
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
    isDragInProgress.current = true;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDragEnd = async () => {
    const draggedIdx = draggedIndex;
    const dragOverIdx = dragOverIndex;
    setDraggedIndex(null);
    setDragOverIndex(null);

    if (draggedIdx === null || dragOverIdx === null || draggedIdx === dragOverIdx) {
      isDragInProgress.current = false;
      return;
    }

    // Snapshot current sorted order before changes
    const snapshot = sortedCameras.map(cam => ({
      uuid: (cam as any).uuid as string,
      oldId: cam.id,
      version: ((cam as any).version ?? 1) as number,
    }));

    // Compute new order after drag
    const reordered = [...snapshot];
    const [dragged] = reordered.splice(draggedIdx, 1);
    reordered.splice(dragOverIdx, 0, dragged);

    // Renumber all as CAM 1, CAM 2, ... — only send updates for cameras that changed
    const updates = reordered
      .map((cam, i) => ({ ...cam, newId: `CAM ${i + 1}` }))
      .filter(u => u.oldId !== u.newId);

    if (updates.length === 0) {
      isDragInProgress.current = false;
      return;
    }

    const { userId, userName } = getCurrentUserId();
    try {
      await Promise.all(
        updates.map(u =>
          apiClient.put(`/cameras/${u.uuid}`, {
            id: u.newId,
            version: u.version,
            userId,
            userName,
          })
        )
      );
      // Refetch fresh state from DB as single source of truth
      if (productionId) {
        const fresh = await camerasAPI.fetchCameras(productionId);
        setLocalCameras(fresh);
      }
    } catch (err) {
      console.error('❌ Drag renumber failed:', err);
      alert('Failed to renumber cameras. Please refresh the page.');
    } finally {
      isDragInProgress.current = false;
    }
  };

  const getSupportBadges = (camera: Camera) => {
    const badges: string[] = [];
    if (camera.hasHeavyTripod) badges.push('Heavy Duty Tripod');
    if (camera.hasMediumTripod) badges.push('Medium Duty Tripod');
    if (camera.hasTripod) badges.push('Light Duty Tripod');
    if (camera.hasShortTripod) badges.push('Short Tripod');
    if (camera.hasDolly) badges.push('Dolly');
    if (camera.hasJib) badges.push('Jib');
    if (camera.hasSteadicam) badges.push('Steadicam');
    if (camera.hasMagicArm) badges.push('Magic Arm');
    return badges;
  };

  const getCCUName = (ccuId?: string) => {
    if (!ccuId) return null;
    const ccu = localCCUs.find((c: any) => c.id === ccuId);
    return (ccu as any)?.name;
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
      {localCameras.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No Cameras Found"
          description="Add your first camera to get started"
          actionLabel="Add Camera"
          onAction={handleAddNew}
        />
      ) : (
        <div className="space-y-3">
          {sortedCameras.map((camera, index) => {
            const supportBadges = getSupportBadges(camera);
            const ccuName = getCCUName(camera.ccuId);
            
            return (
              <Card
                key={(camera as any).uuid || camera.id}
                className={`p-6 transition-colors select-none cursor-pointer
                  ${dragOverIndex === index ? 'border-av-accent bg-av-accent/5' : 'hover:border-av-accent/30'}
                  ${draggedIndex === index ? 'opacity-40' : ''}
                `}
                draggable
                onDoubleClick={() => handleEdit(camera)}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
              >
                <div className="grid gap-3 items-center" style={{ gridTemplateColumns: '10fr 10fr 10fr 35fr 15fr 10fr' }}>
                  {/* Col 1: Drag handle + CAM ID */}
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical className="w-4 h-4 text-av-text-muted cursor-grab flex-shrink-0" />
                    <span className="text-sm font-medium text-av-text truncate">{camera.id}</span>
                  </div>

                  {/* Col 2: CAM Name */}
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-av-text truncate">{camera.name}</h3>
                  </div>

                  {/* Col 3: CCU ID */}
                  <div className="min-w-0">
                    {ccuName ? (
                      <div className="flex items-center gap-1 text-av-text-muted text-sm">
                        <LinkIcon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{ccuName}</span>
                        {camera.smpteCableLength && (
                          <span className="text-xs flex-shrink-0">({camera.smpteCableLength}ft)</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-av-text-muted">—</span>
                    )}
                  </div>

                  {/* Col 4: Note */}
                  <div className="min-w-0">
                    {camera.note ? (
                      <p className="text-sm text-av-text-muted truncate" title={camera.note}>{camera.note}</p>
                    ) : (
                      <span className="text-xs text-av-text-muted">—</span>
                    )}
                  </div>

                  {/* Col 5: Tags */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {camera.manufacturer && <Badge>{camera.manufacturer}</Badge>}
                    {camera.model && <Badge>{camera.model}</Badge>}
                    {camera.maxZoom && <Badge>{camera.maxZoom}x</Badge>}
                    {supportBadges.map(badge => (
                      <Badge key={badge}>{badge}</Badge>
                    ))}
                  </div>

                  {/* Col 6: Action Buttons */}
                  <div className="flex gap-1 justify-end">
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
                      onClick={() => handleDelete((camera as any).uuid || camera.id)}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
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
            
            <form onSubmit={(e) => { e.preventDefault(); handleSave('close'); }} className="p-6 space-y-6">
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
                        setFormData({ ...formData, manufacturer, model: '', equipmentUuid: undefined });
                      }}
                      className="input-field w-full"
                    >
                      <option value="">Select manufacturer...</option>
                      {CAMERA_MANUFACTURERS.map(mfr => (
                        <option key={mfr} value={mfr}>{mfr}</option>
                      ))}
                      {/* Fallback: show stored value if specs haven't loaded yet */}
                      {formData.manufacturer && !CAMERA_MANUFACTURERS.includes(formData.manufacturer) && (
                        <option key="__stored__" value={formData.manufacturer}>{formData.manufacturer}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-2">
                      Model
                    </label>
                    <select
                      value={formData.model || ''}
                      onChange={(e) => {
                        const selectedModel = e.target.value;
                        const spec = cameraSpecs.find(
                          s => s.manufacturer === formData.manufacturer && s.model === selectedModel
                        );
                        setFormData({ ...formData, model: selectedModel, equipmentUuid: spec?.uuid });
                      }}
                      className="input-field w-full"
                      disabled={!formData.manufacturer}
                    >
                      <option value="">Select model...</option>
                      {formData.manufacturer && CAMERA_MODELS_BY_MANUFACTURER[formData.manufacturer]?.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                      {/* Fallback: show stored value if specs haven't loaded yet */}
                      {formData.model && formData.manufacturer &&
                        !CAMERA_MODELS_BY_MANUFACTURER[formData.manufacturer]?.includes(formData.model) && (
                        <option key="__stored__" value={formData.model}>{formData.model}</option>
                      )}
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
                        const selectedCCU = localCCUs.find((c: any) => c.id === selectedCCUId);
                        setFormData({
                          ...formData,
                          ccuId: selectedCCUId,
                          formatMode: (selectedCCU as any)?.formatMode || formData.formatMode,
                        });
                      }}
                      className="input-field w-full"
                    >
                      <option value="">No CCU connection</option>
                      {localCCUs.map((ccu: any) => {
                        const linkedCams = localCameras.filter(
                          c => c.ccuId === ccu.id && (c as any).uuid !== (editingCamera as any)?.uuid
                        );
                        const isTaken = linkedCams.length > 0;
                        const camLabel = linkedCams.map(c => c.id).join(', ');
                        return (
                          <option key={ccu.id} value={ccu.id}>
                            {isTaken ? `⚠ ` : `✓ `}{ccu.name} ({ccu.id}){isTaken ? ` — ${camLabel}` : ''}
                          </option>
                        );
                      })}
                    </select>
                    {localCCUs.length === 0 && (
                      <p className="text-xs text-av-text-muted mt-1">
                        No CCUs available. Add CCUs first.
                      </p>
                    )}
                  </div>
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
              </div>
              
              {/* Zoom Lens Configuration */}
              <div>
                <h3 className="text-lg font-semibold text-av-text mb-3">Zoom Lens Configuration</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-2">
                      Focal Length (mm)
                    </label>
                    <input
                      type="number"
                      value={formData.focalLength || ''}
                      onChange={(e) => setFormData({ ...formData, focalLength: parseFloat(e.target.value) || undefined })}
                      className="input-field w-full"
                      placeholder="e.g., 14"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-av-text mb-2">
                      Max Zoom
                    </label>
                    <input
                      type="number"
                      value={formData.maxZoom || ''}
                      onChange={(e) => setFormData({ ...formData, maxZoom: parseFloat(e.target.value) || undefined })}
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
                      onChange={(e) => setFormData({ ...formData, shootingDistance: parseFloat(e.target.value) || undefined })}
                      className="input-field w-full"
                      placeholder="e.g., 100"
                    />
                  </div>
                </div>
                {formData.focalLength && formData.maxZoom && formData.shootingDistance && (() => {
                  const effFl = formData.focalLength * formData.maxZoom;
                  const frameHeightIn = (6.6 * formData.shootingDistance * 304.8) / (effFl * 25.4);
                  const canFrame = frameHeightIn <= 8;
                  return (
                    <div className="mt-3 p-3 rounded-md bg-av-surface-light border border-av-border text-sm text-av-text-muted">
                      <span className="font-medium text-av-text">{effFl}mm</span> effective focal length
                      {' · '}frame height at {formData.shootingDistance}ft ≈ <span className="font-medium text-av-text">{Math.round(frameHeightIn * 10) / 10}"</span>
                      {' · '}8" target: <span className={canFrame ? 'text-av-success font-medium' : 'text-av-warning font-medium'}>{canFrame ? '✓ frameable' : '⚠ too small'}</span>
                    </div>
                  );
                })()}
              </div>
              
              {/* Support Equipment */}
              <div>
                <h3 className="text-lg font-semibold text-av-text mb-3">Support Equipment</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setFormData({ ...formData, hasHeavyTripod: !formData.hasHeavyTripod })}
                    className={`cursor-pointer p-3 rounded-md border-2 transition-all ${
                      formData.hasHeavyTripod 
                        ? 'border-av-accent bg-av-accent/10' 
                        : 'border-av-border hover:border-av-accent/30'
                    }`}
                  >
                    <span className="text-av-text">Heavy Duty Tripod</span>
                  </div>
                  <div 
                    onClick={() => setFormData({ ...formData, hasMediumTripod: !formData.hasMediumTripod })}
                    className={`cursor-pointer p-3 rounded-md border-2 transition-all ${
                      formData.hasMediumTripod 
                        ? 'border-av-accent bg-av-accent/10' 
                        : 'border-av-border hover:border-av-accent/30'
                    }`}
                  >
                    <span className="text-av-text">Medium Duty Tripod</span>
                  </div>
                  <div 
                    onClick={() => setFormData({ ...formData, hasTripod: !formData.hasTripod })}
                    className={`cursor-pointer p-3 rounded-md border-2 transition-all ${
                      formData.hasTripod 
                        ? 'border-av-accent bg-av-accent/10' 
                        : 'border-av-border hover:border-av-accent/30'
                    }`}
                  >
                    <span className="text-av-text">Light Duty Tripod</span>
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
                  <div 
                    onClick={() => setFormData({ ...formData, hasSteadicam: !formData.hasSteadicam })}
                    className={`cursor-pointer p-3 rounded-md border-2 transition-all ${
                      formData.hasSteadicam 
                        ? 'border-av-accent bg-av-accent/10' 
                        : 'border-av-border hover:border-av-accent/30'
                    }`}
                  >
                    <span className="text-av-text">Steadicam</span>
                  </div>
                  <div 
                    onClick={() => setFormData({ ...formData, hasMagicArm: !formData.hasMagicArm })}
                    className={`cursor-pointer p-3 rounded-md border-2 transition-all ${
                      formData.hasMagicArm 
                        ? 'border-av-accent bg-av-accent/10' 
                        : 'border-av-border hover:border-av-accent/30'
                    }`}
                  >
                    <span className="text-av-text">Manfrotto Magic Arm + SuperClamp</span>
                  </div>
                </div>
              </div>
              
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
