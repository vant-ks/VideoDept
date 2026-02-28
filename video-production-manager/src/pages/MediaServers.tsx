// @ts-nocheck
import React, { useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, Monitor, Server, Layers, Copy, GripVertical } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useProductionEvents } from '@/hooks/useProductionEvents';
import { apiClient } from '@/services';
import { getCurrentUserId } from '@/utils/userUtils';
import type { MediaServer, MediaServerOutput, MediaServerLayer } from '@/types';
import { MEDIA_SERVER_PLATFORMS, OUTPUT_TYPES } from '@/types/mediaServer';

export default function MediaServers() {
  const { activeProject } = useProjectStore();
  const projectStore = useProjectStore();
  const oldStore = useProductionStore();
  
  const mediaServers = activeProject?.mediaServers || oldStore.mediaServers;
  const mediaServerLayers = activeProject?.mediaServerLayers || oldStore.mediaServerLayers;
  
  // Get production ID for WebSocket events
  const productionId = activeProject?.production?.id || oldStore.production?.id;
  
  // State declarations - MUST be before useProductionEvents to avoid initialization errors
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isLayerModalOpen, setIsLayerModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<MediaServer | null>(null);
  const [editingLayer, setEditingLayer] = useState<MediaServerLayer | null>(null);
  const [activeTab, setActiveTab] = useState<'servers' | 'layers' | 'layermap'>('servers');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragInProgress, setIsDragInProgress] = useState(false);
  
  // Real-time event subscriptions
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback((event) => {
      if (event.entityType === 'mediaServer') {
        console.log('🔔 Media server created by', event.userName);
        // Refresh from Zustand - it will be updated by the store's WebSocket handler
        // Or directly update if using local state
        if (activeProject) {
          // The store should already have it via its own WebSocket listener
          // Force a re-render by touching the state
          projectStore.updateActiveProject({ 
            mediaServers: [...(activeProject.mediaServers || []), event.entity]
          });
        }
      }
    }, [activeProject, projectStore]),
    onEntityUpdated: useCallback((event) => {
      if (event.entityType === 'mediaServer') {
        console.log('🔔 Media server updated by', event.userName);
        
        // Ignore WebSocket updates during active drag to prevent intermediate state issues
        if (isDragInProgress) {
          console.log('🚀 Ignoring WebSocket update during drag');
          return;
        }
        
        if (activeProject) {
          projectStore.updateActiveProject({
            mediaServers: (activeProject.mediaServers || []).map(s => {
              // Only apply update if it's for this server and has a newer or equal version
              if (s.uuid === event.entity.uuid) {
                // If no version info or incoming version is newer, apply the update
                if (!s.version || !event.entity.version || event.entity.version >= s.version) {
                  return event.entity;
                }
                // Otherwise keep existing (newer) data
                return s;
              }
              return s;
            })
          });
        }
      }
    }, [activeProject, projectStore, isDragInProgress]),
    onEntityDeleted: useCallback((event) => {
      if (event.entityType === 'mediaServer') {
        console.log('🔔 Media server deleted by', event.userName);
        if (activeProject) {
          projectStore.updateActiveProject({
            mediaServers: (activeProject.mediaServers || []).filter(s => s.uuid !== event.entityId)
          });
        }
      }
    }, [activeProject, projectStore])
  });
  
  // Use project store CRUD if activeProject exists, otherwise use old store
  const addMediaServerPair = activeProject ? projectStore.addMediaServerPair : oldStore.addMediaServerPair;
  const updateMediaServer = activeProject ? projectStore.updateMediaServer : oldStore.updateMediaServer;
  const deleteMediaServerPair = activeProject ? projectStore.deleteMediaServerPair : oldStore.deleteMediaServerPair;
  const addMediaServerLayer = activeProject ? projectStore.addMediaServerLayer : oldStore.addMediaServerLayer;
  const updateMediaServerLayer = activeProject ? projectStore.updateMediaServerLayer : oldStore.updateMediaServerLayer;
  const deleteMediaServerLayer = activeProject ? projectStore.deleteMediaServerLayer : oldStore.deleteMediaServerLayer;
  
  // Group servers by pair
  const serverPairs = React.useMemo(() => {
    const pairs: { [key: number]: { main: MediaServer; backup: MediaServer } } = {};
    mediaServers.forEach(server => {
      if (!pairs[server.pairNumber]) {
        pairs[server.pairNumber] = {} as any;
      }
      if (server.isBackup) {
        pairs[server.pairNumber].backup = server;
      } else {
        pairs[server.pairNumber].main = server;
      }
    });
    // Sort by pairNumber to ensure consistent ordering
    return Object.entries(pairs)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([_, pair]) => pair)
      .filter(pair => pair.main && pair.backup);
  }, [mediaServers]);

  const handleAddServerPair = () => {
    setEditingServer(null);
    setIsServerModalOpen(true);
  };

  const handleAddLayer = () => {
    setEditingLayer(null);
    setIsLayerModalOpen(true);
  };

  const handleEditServer = (server: MediaServer) => {
    setEditingServer(server);
    setIsServerModalOpen(true);
  };

  const handleEditLayer = (layer: MediaServerLayer) => {
    setEditingLayer(layer);
    setIsLayerModalOpen(true);
  };

  const handleDeletePair = (pairNumber: number) => {
    if (confirm(`Delete Media Server ${pairNumber}A and ${pairNumber}B?`)) {
      deleteMediaServerPair(pairNumber);
    }
  };

  const handleDragStart = (index: number) => {
    console.log(`🎬 Drag started: Pair at index ${index} (pairNumber: ${serverPairs[index]?.main.pairNumber})`);
    setDraggedIndex(index);
    setIsDragInProgress(true);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = async () => {
    const draggedIdx = draggedIndex;
    const dragOverIdx = dragOverIndex;
    
    // Clear visual state immediately
    setDraggedIndex(null);
    setDragOverIndex(null);
    
    if (draggedIdx !== null && dragOverIdx !== null && draggedIdx !== dragOverIdx) {
      console.log(`🎯 Drag: Moving pair from index ${draggedIdx} to ${dragOverIdx}`);
      console.log('🔒 Drag locked - no optimistic updates, waiting for API');
      
      // Capture immutable snapshot of current order BEFORE any changes
      const originalPairs = serverPairs.map((pair, idx) => ({
        displayIndex: idx + 1,
        pairNumber: pair.main.pairNumber,
        mainUuid: pair.main.uuid,
        mainVersion: pair.main.version,
        backupUuid: pair.backup.uuid,
        backupVersion: pair.backup.version,
        mainId: pair.main.id,
        backupId: pair.backup.id
      }));
      
      // Calculate new order from the snapshot
      const reorderedPairs = [...originalPairs];
      const [draggedPair] = reorderedPairs.splice(draggedIdx, 1);
      reorderedPairs.splice(dragOverIdx, 0, draggedPair);
      
      console.log('📊 Desired final order:', reorderedPairs.map((p, i) => 
        `[${i + 1}] ${p.mainId}/${p.backupId} (was pair ${p.pairNumber})`
      ));
      
      // Build list of updates based on difference from original
      const updates: Array<{uuid: string, id: string, oldPairNumber: number, newPairNumber: number, version: number}> = [];
      reorderedPairs.forEach((pair, newIndex) => {
        const newPairNumber = newIndex + 1;
        if (pair.pairNumber !== newPairNumber) {
          updates.push({
            uuid: pair.mainUuid,
            id: pair.mainId,
            oldPairNumber: pair.pairNumber,
            newPairNumber: newPairNumber,
            version: pair.mainVersion
          });
          updates.push({
            uuid: pair.backupUuid,
            id: pair.backupId,
            oldPairNumber: pair.pairNumber,
            newPairNumber: newPairNumber,
            version: pair.backupVersion
          });
        }
      });
      
      if (updates.length === 0) {
        console.log('🚫 No updates needed');
        setIsDragInProgress(false);
        return;
      }
      
      console.log(`📝 Sending ${updates.length} update(s) to API:`);
      updates.forEach(u => console.log(`  ${u.id}: pair ${u.oldPairNumber} → ${u.newPairNumber}`));
      
      // NO OPTIMISTIC UPDATES - Send directly to API
      const { userId, userName } = getCurrentUserId();
      
      try {
        const apiCalls = updates.map(({ uuid, id, newPairNumber, version }) => 
          apiClient.put(`/media-servers/${uuid}`, {
            pairNumber: newPairNumber,
            version: version,
            userId,
            userName
          }).then(() => {
            console.log(`✅ API success: ${id} → pair ${newPairNumber}`);
            return { success: true, serverId: id };
          }).catch((error) => {
            const status = error.response?.status;
            console.error(`❌ API failed: ${id} (${status || 'network error'})`);
            return { success: false, serverId: id, error, status };
          })
        );
        
        const results = await Promise.all(apiCalls);
        const successes = results.filter(r => r.success).length;
        const failures = results.filter(r => !r.success).length;
        
        if (failures > 0) {
          console.warn(`⚠️ ${failures}/${updates.length} API call(s) failed`);
        } else {
          console.log(`✅ All ${successes} API call(s) succeeded`);
        }
        
        // Refetch fresh data from database as single source of truth
        if (activeProject) {
          console.log('🔄 Fetching fresh data from API...');
          await projectStore.loadProject(activeProject.id);
          console.log('✅ Fresh data loaded from database');
        }
        
      } catch (error) {
        console.error('❌ Unexpected error during drag update:', error);
      } finally {
        // Always unlock drag after operation completes
        console.log('🔓 Unlocking drag');
        setIsDragInProgress(false);
      }
    } else {
      console.log('🚫 Drag cancelled');
      setIsDragInProgress(false);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDeleteLayer = (id: string) => {
    if (confirm('Delete this layer?')) {
      deleteMediaServerLayer(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-textPrimary">Media Servers</h1>
        </div>
        {activeTab !== 'layermap' && (
          <button 
            onClick={activeTab === 'servers' ? handleAddServerPair : handleAddLayer} 
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'servers' ? 'Add Server Pair' : 'Add Layer'}
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-av-border">
        <button
          onClick={() => setActiveTab('servers')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'servers'
              ? 'text-av-accent border-b-2 border-av-accent'
              : 'text-av-text-muted hover:text-av-text'
          }`}
        >
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Servers ({serverPairs.length} pairs)
          </div>
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'layers'
              ? 'text-av-accent border-b-2 border-av-accent'
              : 'text-av-text-muted hover:text-av-text'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Layers ({mediaServerLayers.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('layermap')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'layermap'
              ? 'text-av-accent border-b-2 border-av-accent'
              : 'text-av-text-muted hover:text-av-text'
          }`}
        >
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Layer Map
          </div>
        </button>
      </div>

      {/* Servers Tab */}
      {activeTab === 'servers' && (
        <>
          {serverPairs.length === 0 ? (
            <Card className="p-12 text-center">
              <Server className="w-16 h-16 mx-auto text-av-text-muted mb-4" />
              <h3 className="text-lg font-semibold text-av-text mb-2">No Media Servers Found</h3>
              <p className="text-av-text-muted mb-4">
                Add your first media server pair to get started
              </p>
              <button onClick={handleAddServerPair} className="btn-primary">Add Server Pair</button>
            </Card>
          ) : (
            <div className="space-y-4">
              {serverPairs.map((pair, index) => (
                <Card 
                  key={pair.main.pairNumber} 
                  className={`p-6 transition-all ${
                    draggedIndex === index 
                      ? 'opacity-50 scale-95' 
                      : dragOverIndex === index 
                      ? 'border-av-accent border-2' 
                      : 'hover:border-av-accent/30'
                  }`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragLeave={handleDragLeave}
                >
                  {/* Pair Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <button 
                        className="cursor-grab active:cursor-grabbing text-av-text-muted hover:text-av-accent transition-colors"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-5 h-5" />
                      </button>
                      <Server className="w-6 h-6 text-av-accent" />
                      <div>
                        <h3 className="text-xl font-semibold text-av-text">
                          Server {index + 1} (A/B Pair)
                        </h3>
                        <p className="text-sm text-av-text-muted">{pair.main.platform}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditServer(pair.main)}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
                        title="Edit servers"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          // Duplicate the server pair by opening modal with duplicated data
                          const nextPairNum = Math.max(...mediaServers.map(s => s.pairNumber)) + 1;
                          setEditingServer({
                            ...pair.main,
                            pairNumber: nextPairNum,
                            id: `${nextPairNum}A`
                          });
                          setIsDuplicating(true);
                          setIsServerModalOpen(true);
                        }}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-info transition-colors"
                        title="Duplicate pair"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePair(pair.main.pairNumber)}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
                        title="Delete pair"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Main and Backup Servers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Main Server */}
                    <div className="bg-av-surface-light p-4 rounded-md border border-av-border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-av-text">
                          Server {index + 1} A{pair.main.role ? ` (${pair.main.role})` : ''}
                        </h4>
                        <Badge variant="success">Main</Badge>
                      </div>
                      {pair.main.outputs.length > 0 && (
                        <div>
                          <p className="text-xs text-av-text-muted mb-2">
                            <Monitor className="w-3 h-3 inline mr-1" />
                            {pair.main.outputs.length} Output{pair.main.outputs.length !== 1 ? 's' : ''}
                          </p>
                          <div className="space-y-1">
                            {pair.main.outputs.map((output, idx) => (
                              <div key={`${pair.main.id}-${output.id}-${idx}`} className="text-xs bg-av-surface px-2 py-1 rounded flex items-center justify-between">
                                <span className="text-av-text">{output.name}</span>
                                <Badge>{output.type}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Backup Server */}
                    <div className="bg-av-surface-light p-4 rounded-md border border-av-border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-av-text">
                          Server {index + 1} B{pair.backup.role ? ` (${pair.backup.role})` : ''}
                        </h4>
                        <Badge variant="warning">Backup</Badge>
                      </div>
                      {pair.backup.outputs.length > 0 && (
                        <div>
                          <p className="text-xs text-av-text-muted mb-2">
                            <Monitor className="w-3 h-3 inline mr-1" />
                            {pair.backup.outputs.length} Output{pair.backup.outputs.length !== 1 ? 's' : ''}
                          </p>
                          <div className="space-y-1">
                            {pair.backup.outputs.map((output, idx) => (
                              <div key={`${pair.backup.id}-${output.id}-${idx}`} className="text-xs bg-av-surface px-2 py-1 rounded flex items-center justify-between">
                                <span className="text-av-text">{output.name}</span>
                                <Badge>{output.type}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {pair.main.note && (
                    <div className="pt-4 border-t border-av-border">
                      <p className="text-sm text-av-text-muted">
                        <span className="font-medium">Note:</span> {pair.main.note}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Layers Tab */}
      {activeTab === 'layers' && (
        <>
          {mediaServerLayers.length === 0 ? (
            <Card className="p-12 text-center">
              <Layers className="w-16 h-16 mx-auto text-av-text-muted mb-4" />
              <h3 className="text-lg font-semibold text-av-text mb-2">No Layers Found</h3>
              <p className="text-av-text-muted mb-4">
                Add your first content layer to get started
              </p>
              <button onClick={handleAddLayer} className="btn-primary">Add Layer</button>
            </Card>
          ) : (
            <div className="space-y-3">
              {mediaServerLayers.map((layer) => (
                <Card key={layer.id} className="p-6 hover:border-av-accent/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Layers className="w-5 h-5 text-av-accent" />
                        <h3 className="text-lg font-semibold text-av-text">{layer.name}</h3>
                      </div>
                      <p className="text-sm text-av-text-muted mb-3">{layer.content}</p>
                      
                      {layer.outputAssignments.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-av-text-muted mb-2">
                            Assigned to {layer.outputAssignments.length} output{layer.outputAssignments.length !== 1 ? 's' : ''}
                            {layer.outputAssignments.length > 1 && ' (spanning)'}:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {layer.outputAssignments.map((assignment: any) => {
                              const server = mediaServers.find((s: any) => s.id === assignment.serverId);
                              const output = server?.outputs.find((o: any) => o.id === assignment.outputId);
                              return (
                                <span key={`${assignment.serverId}-${assignment.outputId}`} className="text-xs bg-av-surface-light px-3 py-1.5 rounded border border-av-border">
                                  {server?.name} → {output?.name || assignment.outputId}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditLayer(layer)}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLayer(layer.id)}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Layer Map Tab - Visual Representation */}
      {activeTab === 'layermap' && (
        <>
          {mediaServers.length === 0 ? (
            <Card className="p-12 text-center">
              <Monitor className="w-16 h-16 mx-auto text-av-text-muted mb-4" />
              <h3 className="text-lg font-semibold text-av-text mb-2">No Media Servers</h3>
              <p className="text-av-text-muted mb-4">Add media servers to visualize layer mapping</p>
              <button onClick={() => setActiveTab('servers')} className="btn-primary">Go to Servers</button>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Visual Grid: Each row is a layer, columns are outputs */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-av-text mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-av-accent" />
                  Layer Spanning Visualization
                </h2>
                <p className="text-sm text-av-text-muted mb-6">
                  Visual representation of how content layers span across media server outputs
                </p>

                {/* Output Headers - Server Columns */}
                <div className="overflow-x-auto">
                  <div className="min-w-max">
                    {/* Header Row - Only Main Servers */}
                    <div className="flex gap-2 mb-4">
                      <div className="w-48 flex-shrink-0" />
                      {serverPairs.map((pair) => (
                        <React.Fragment key={pair.main.pairNumber}>
                          {/* Main Server Outputs Only */}
                          {pair.main.outputs.map((output) => (
                            <div key={output.id} className="w-32 flex-shrink-0">
                              <div className="bg-av-surface-light border border-av-border rounded-md p-2 text-center">
                                <div className="text-xs font-semibold text-av-text truncate">
                                  Server {pair.main.pairNumber}
                                </div>
                                <div className="text-xs text-av-text-muted truncate mt-1">{output.name}</div>
                                <Badge className="mt-1 text-xs">{output.type}</Badge>
                              </div>
                            </div>
                          ))}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Layer Rows */}
                    {mediaServerLayers.length === 0 ? (
                      <div className="text-center py-8 text-av-text-muted">
                        <p>No layers created yet</p>
                        <button onClick={() => setActiveTab('layers')} className="btn-primary mt-4">
                          Create Layer
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mediaServerLayers.map((layer, layerIndex) => (
                          <div key={layer.id} className="flex gap-2">
                            {/* Layer Name Column */}
                            <div className="w-48 flex-shrink-0 bg-av-surface-light border border-av-border rounded-md p-3 flex flex-col justify-center">
                              <div className="font-semibold text-sm text-av-text truncate">{layer.name}</div>
                              <div className="text-xs text-av-text-muted truncate mt-1">{layer.content}</div>
                            </div>

                            {/* Output Assignment Cells - Only Main Servers */}
                            {serverPairs.map((pair) => (
                              <React.Fragment key={pair.main.pairNumber}>
                                {/* Main Server Output Cells Only */}
                                {pair.main.outputs.map((output) => {
                                  const isAssigned = layer.outputAssignments.some(
                                    a => a.serverId === pair.main.id && a.outputId === output.id
                                  );
                                  return (
                                    <div 
                                      key={output.id} 
                                      className="w-32 flex-shrink-0 flex items-center justify-center"
                                    >
                                      {isAssigned ? (
                                        <div 
                                          className="w-full h-16 bg-gradient-to-br from-av-accent/20 to-av-accent/40 border-2 border-av-accent rounded-md flex items-center justify-center"
                                          style={{
                                            backgroundColor: `hsl(${(layerIndex * 137.5) % 360}, 70%, 50%, 0.2)`,
                                            borderColor: `hsl(${(layerIndex * 137.5) % 360}, 70%, 50%)`
                                          }}
                                        >
                                          <Layers className="w-6 h-6" style={{ color: `hsl(${(layerIndex * 137.5) % 360}, 70%, 40%)` }} />
                                        </div>
                                      ) : (
                                        <div className="w-full h-16 bg-av-surface border border-av-border/30 rounded-md" />
                                      )}
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-6 pt-4 border-t border-av-border">
                  <p className="text-sm font-semibold text-av-text mb-2">Legend:</p>
                  <div className="flex flex-wrap gap-4 text-xs text-av-text-muted">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-av-accent/30 border-2 border-av-accent rounded" />
                      <span>Assigned Output</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-av-surface border border-av-border/30 rounded" />
                      <span>Unassigned Output</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Results Count */}
      {activeTab !== 'layermap' && (activeTab === 'servers' ? serverPairs.length : mediaServerLayers.length) > 0 && (
        <div className="text-center text-sm text-av-text-muted">
          Showing {activeTab === 'servers' ? serverPairs.length : mediaServerLayers.length}{' '}
          {activeTab === 'servers' ? 'server pair' : 'layer'}
          {(activeTab === 'servers' ? serverPairs.length : mediaServerLayers.length) !== 1 ? 's' : ''}
        </div>
      )}

      {/* Server Modal */}
      {isServerModalOpen && (
        <ServerPairModal
          isOpen={isServerModalOpen}
          onClose={() => {
            setIsServerModalOpen(false);
            setEditingServer(null);
            setIsDuplicating(false);
          }}
          onSave={(platform, outputs, note) => {
            if (editingServer && !isDuplicating) {
              // Update both main and backup
              const pair = serverPairs.find(p => p.main.pairNumber === editingServer.pairNumber);
              if (pair) {
                // The outputs array from modal already has " A (Role)" format
                // We need to create a " B (Role)" version for the backup server
                const outputsWithB = outputs.map((o, i) => ({
                  ...o,
                  id: `${pair.backup.id}-OUT${i + 1}`, // Generate unique ID for backup outputs
                  name: o.name.replace(/\sA\s*(\([^)]*\))?$/, (match, role) => role ? ` B ${role}` : ' B') // Replace " A" with " B", keep role with space
                }));
                const serverName = `Server ${pair.main.pairNumber}`;
                updateMediaServer(pair.main.id, { name: `${serverName} A`, platform, outputs, note });
                updateMediaServer(pair.backup.id, { name: `${serverName} B`, platform, outputs: outputsWithB, note });
              }
            } else {
              addMediaServerPair(platform, outputs, note);
            }
            setIsServerModalOpen(false);
            setEditingServer(null);
            setIsDuplicating(false);
          }}
          editingServer={editingServer}
          isDuplicating={isDuplicating}
        />
      )}

      {/* Layer Modal */}
      {isLayerModalOpen && (
        <LayerModal
          isOpen={isLayerModalOpen}
          onClose={() => {
            setIsLayerModalOpen(false);
            setEditingLayer(null);
          }}
          onSave={(layer) => {
            if (editingLayer) {
              updateMediaServerLayer(editingLayer.id, layer);
            } else {
              const newLayer: MediaServerLayer = {
                ...layer,
                id: `L${mediaServerLayers.length + 1}`
              };
              addMediaServerLayer(newLayer);
            }
            setIsLayerModalOpen(false);
            setEditingLayer(null);
          }}
          editingLayer={editingLayer}
          availableServers={mediaServers}
        />
      )}
    </div>
  );
}

// Server Pair Modal Component
interface ServerPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (platform: string, outputs: MediaServerOutput[], note?: string) => void;
  editingServer: MediaServer | null;
  isDuplicating?: boolean;
}

function ServerPairModal({ isOpen, onClose, onSave, editingServer, isDuplicating }: ServerPairModalProps) {
  // Get the next server number for displaying Server ID
  const { activeProject } = useProjectStore();
  const oldStore = useProductionStore();
  const mediaServers = activeProject?.mediaServers || oldStore.mediaServers;
  const pairNumber = editingServer?.pairNumber || 
    (mediaServers.length > 0 ? Math.max(...mediaServers.map(s => s.pairNumber)) + 1 : 1);
  
  const [platform, setPlatform] = useState(editingServer?.platform || MEDIA_SERVER_PLATFORMS[0]);
  const [outputs, setOutputs] = useState<Omit<MediaServerOutput, 'id'>[]>(() => {
    if (editingServer?.outputs) {
      // Strip A/B suffix and (Role) from output names when loading for editing
      return editingServer.outputs.map(o => {
        const nameWithoutSuffix = o.name.replace(/\s+[AB]\s*\([^)]*\)$/, '') || o.name.replace(/\s+[AB]$/, '');
        return {
          name: nameWithoutSuffix,
          role: o.role,
          type: o.type, 
          resolution: o.resolution, 
          frameRate: o.frameRate 
        };
      });
    }
    // Default: 1 DP output for new server pairs
    return [{
      name: 'MEDIA 1',
      role: '',
      type: 'DP',
      resolution: { width: 1920, height: 1080 },
      frameRate: 59.94
    }];
  });
  const [note, setNote] = useState(editingServer?.note || '');
  
  // Track which outputs have custom resolution
  const [customResolutions, setCustomResolutions] = useState<{[key: number]: boolean}>({});
  
  // Helper functions for A/B suffix handling
  const stripABSuffix = (name: string): string => {
    return name.replace(/\s+[AB]$/, '');
  };
  
  const appendASuffix = (name: string): string => {
    // If name already has A or B, strip it first
    const stripped = stripABSuffix(name);
    return `${stripped} A`;
  };

  // Common resolutions
  const COMMON_RESOLUTIONS = [
    { label: '1920x1080 (HD)', width: 1920, height: 1080 },
    { label: '1920x1200 (WUXGA)', width: 1920, height: 1200 },
    { label: '2560x1440 (QHD)', width: 2560, height: 1440 },
    { label: '3840x2160 (4K UHD)', width: 3840, height: 2160 },
    { label: '4096x2160 (DCI 4K)', width: 4096, height: 2160 },
    { label: '7680x4320 (8K)', width: 7680, height: 4320 },
    { label: 'Custom', width: 0, height: 0 }
  ];
  
  // Common frame rates
  const COMMON_FRAME_RATES = [
    { label: '23.976', value: 23.976 },
    { label: '24', value: 24 },
    { label: '25', value: 25 },
    { label: '29.97', value: 29.97 },
    { label: '30', value: 30 },
    { label: '50', value: 50 },
    { label: '59.94', value: 59.94 },
    { label: '60', value: 60 },
    { label: '120', value: 120 }
  ];

  const handleAddOutput = () => {
    if (outputs.length >= 8) {
      alert('Maximum 8 outputs per server');
      return;
    }
    const outputNum = outputs.length + 1;
    setOutputs([...outputs, { 
      name: `MEDIA ${outputNum}`,
      role: '',
      type: 'DP',
      resolution: { width: 1920, height: 1080 },
      frameRate: 59.94
    }]);
  };

  const handleRemoveOutput = (index: number) => {
    setOutputs(outputs.filter((_, i) => i !== index));
  };
  
  const handleDuplicateOutput = (index: number) => {
    if (outputs.length >= 8) {
      alert('Maximum 8 outputs per server');
      return;
    }
    const outputToDuplicate = outputs[index];
    const outputNum = outputs.length + 1;
    setOutputs([...outputs, { 
      ...outputToDuplicate,
      name: `MEDIA ${outputNum}`
    }]);
  };

  const handleUpdateOutput = (index: number, updates: Partial<Omit<MediaServerOutput, 'id'>>) => {
    setOutputs(outputs.map((o, i) => i === index ? { ...o, ...updates } : o));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Format outputs with A/B suffix and role in parentheses
    const outputsWithFormatting = outputs.map((o) => ({
      ...o,
      name: o.role ? `${o.name} A (${o.role})` : `${o.name} A`
    }));
    onSave(platform, outputsWithFormatting as any, note);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-av-surface rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-av-border sticky top-0 bg-av-surface z-10">
            <h2 className="text-2xl font-bold text-av-text">
              {editingServer ? `Edit Server ${pairNumber} Pair` : `Add Server ${pairNumber} Pair`}
            </h2>
            <p className="text-sm text-av-text-muted mt-1">
              Server ID: {pairNumber} (Drag to reorder servers)
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                Platform *
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="input-field w-full"
              >
                {MEDIA_SERVER_PLATFORMS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-av-text">Outputs</h3>
                  <p className="text-xs text-av-text-muted mt-1">
                    Output names will be formatted as: OutputName A (Role) / OutputName B (Role)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddOutput}
                  className="btn-primary btn-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Output
                </button>
              </div>
              <div className="space-y-3">
                {outputs.map((output, index) => {
                  const isCustomRes = customResolutions[index] || 
                    !COMMON_RESOLUTIONS.find(r => r.width === output.resolution?.width && r.height === output.resolution?.height);
                  
                  return (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        {/* Row 1: Name, Role, Type, Duplicate, Delete */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-av-text-muted mb-1">
                              Output Name *
                            </label>
                            <input
                              type="text"
                              value={output.name}
                              onChange={(e) => handleUpdateOutput(index, { name: e.target.value })}
                              placeholder="MEDIA 1"
                              className="input-field w-full"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-av-text-muted mb-1">Role</label>
                            <input
                              type="text"
                              value={output.role || ''}
                              onChange={(e) => handleUpdateOutput(index, { role: e.target.value })}
                              placeholder="LED L, LED R, etc."
                              className="input-field w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-av-text-muted mb-1">Type</label>
                            <select
                              value={output.type}
                              onChange={(e) => handleUpdateOutput(index, { type: e.target.value as any })}
                              className="input-field w-full"
                            >
                              {OUTPUT_TYPES.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => handleDuplicateOutput(index)}
                              className="w-full p-2 rounded hover:bg-av-info/20 text-av-info transition-colors"
                              title="Duplicate this output"
                              disabled={outputs.length >= 8}
                            >
                              <Copy className="w-4 h-4 mx-auto" />
                            </button>
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveOutput(index)}
                              className="w-full p-2 rounded hover:bg-av-danger/20 text-av-danger transition-colors"
                              title="Delete this output"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Row 2: Resolution Dropdown */}
                        <div>
                          <label className="block text-xs font-medium text-av-text-muted mb-1">Resolution</label>
                          <select
                            value={isCustomRes ? 'custom' : `${output.resolution?.width}x${output.resolution?.height}`}
                            onChange={(e) => {
                              if (e.target.value === 'custom') {
                                setCustomResolutions({ ...customResolutions, [index]: true });
                              } else {
                                const selected = COMMON_RESOLUTIONS.find(r => `${r.width}x${r.height}` === e.target.value);
                                if (selected) {
                                  handleUpdateOutput(index, {
                                    resolution: { width: selected.width, height: selected.height }
                                  });
                                  setCustomResolutions({ ...customResolutions, [index]: false });
                                }
                              }
                            }}
                            className="input-field w-full"
                          >
                            {COMMON_RESOLUTIONS.map(res => (
                              <option key={res.label} value={res.width === 0 ? 'custom' : `${res.width}x${res.height}`}>
                                {res.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Row 3: Custom Resolution Inputs (if custom selected) */}
                        {isCustomRes && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-av-text-muted mb-1">Width</label>
                              <input
                                type="number"
                                value={output.resolution?.width || ''}
                                onChange={(e) => handleUpdateOutput(index, {
                                  resolution: { width: parseInt(e.target.value) || 0, height: output.resolution?.height || 0 }
                                })}
                                placeholder="Width"
                                className="input-field w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-av-text-muted mb-1">Height</label>
                              <input
                                type="number"
                                value={output.resolution?.height || ''}
                                onChange={(e) => handleUpdateOutput(index, {
                                  resolution: { width: output.resolution?.width || 0, height: parseInt(e.target.value) || 0 }
                                })}
                                placeholder="Height"
                                className="input-field w-full"
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Row 4: Frame Rate */}
                        <div>
                          <label className="block text-xs font-medium text-av-text-muted mb-1">Frame Rate</label>
                          <select
                            value={output.frameRate || ''}
                            onChange={(e) => handleUpdateOutput(index, { frameRate: parseFloat(e.target.value) || undefined })}
                            className="input-field w-full"
                          >
                            <option value="">Select frame rate...</option>
                            {COMMON_FRAME_RATES.map(fr => (
                              <option key={fr.value} value={fr.value}>
                                {fr.label} fps
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                Notes
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="input-field w-full h-24"
                placeholder="Additional notes (applied to both servers)..."
              />
            </div>
          </div>

          <div className="p-6 border-t border-av-border flex justify-end gap-3 sticky bottom-0 bg-av-surface">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingServer ? 'Update Pair' : 'Create Pair'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Layer Modal Component
interface LayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (layer: Omit<MediaServerLayer, 'id'>) => void;
  editingLayer: MediaServerLayer | null;
  availableServers: MediaServer[];
}

function LayerModal({ isOpen, onClose, onSave, editingLayer, availableServers }: LayerModalProps) {
  const [name, setName] = useState(editingLayer?.name || '');
  const [content, setContent] = useState(editingLayer?.content || '');
  const [outputAssignments, setOutputAssignments] = useState(editingLayer?.outputAssignments || []);

  // Only show main servers (not backups) since layer config will be mirrored to backups
  const mainServers = availableServers.filter(s => !s.isBackup);

  const toggleOutputAssignment = (serverId: string, outputId: string) => {
    const exists = outputAssignments.find(a => a.serverId === serverId && a.outputId === outputId);
    if (exists) {
      setOutputAssignments(outputAssignments.filter(a => !(a.serverId === serverId && a.outputId === outputId)));
    } else {
      setOutputAssignments([...outputAssignments, { serverId, outputId }]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mirror assignments from A servers to B servers
    const mirroredAssignments = [...outputAssignments];
    outputAssignments.forEach(assignment => {
      // Find the corresponding B server
      const mainServer = availableServers.find(s => s.id === assignment.serverId && !s.isBackup);
      if (mainServer) {
        const backupServer = availableServers.find(s => s.pairNumber === mainServer.pairNumber && s.isBackup);
        if (backupServer) {
          // Find the corresponding output on the backup server
          const mainOutputIndex = mainServer.outputs.findIndex(o => o.id === assignment.outputId);
          if (mainOutputIndex >= 0 && backupServer.outputs[mainOutputIndex]) {
            mirroredAssignments.push({
              serverId: backupServer.id,
              outputId: backupServer.outputs[mainOutputIndex].id
            });
          }
        }
      }
    });
    
    onSave({ name, content, outputAssignments: mirroredAssignments });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-av-surface rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-av-border sticky top-0 bg-av-surface z-10">
            <h2 className="text-2xl font-bold text-av-text">
              {editingLayer ? 'Edit Layer' : 'Add Layer'}
            </h2>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                Layer Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-av-text mb-2">
                Content Description
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="input-field w-full h-24"
                placeholder="Describe the content for this layer..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-av-text mb-3">
                Output Assignments
              </label>
              <p className="text-sm text-av-text-muted mb-4">
                Select outputs from main servers. Layer config will automatically mirror to backup servers.
              </p>
              
              {mainServers.length === 0 ? (
                <p className="text-sm text-av-text-muted text-center py-8">
                  No servers available. Create a server pair first.
                </p>
              ) : (
                <div className="space-y-4">
                  {mainServers.map(server => (
                    <Card key={server.id} className="p-4">
                      <h4 className="font-semibold text-av-text mb-3 flex items-center gap-2">
                        <Server className="w-4 h-4" />
                        {server.name}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {server.outputs.map(output => (
                          <label key={output.id} className="flex items-center gap-2 bg-av-surface-light px-3 py-2 rounded cursor-pointer hover:bg-av-surface">
                            <input
                              type="checkbox"
                              checked={outputAssignments.some(a => a.serverId === server.id && a.outputId === output.id)}
                              onChange={() => toggleOutputAssignment(server.id, output.id)}
                              className="rounded"
                            />
                            <span className="text-sm text-av-text flex-1">{output.name}</span>
                            <Badge>{output.type}</Badge>
                          </label>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-av-border flex justify-end gap-3 sticky bottom-0 bg-av-surface">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingLayer ? 'Update' : 'Create'} Layer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
