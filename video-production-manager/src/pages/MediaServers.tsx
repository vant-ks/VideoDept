// @ts-nocheck
import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Edit2, Trash2, Monitor, Server, Layers, Copy, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useProductionEvents } from '@/hooks/useProductionEvents';
import { apiClient } from '@/services';
import { getCurrentUserId } from '@/utils/userUtils';
import type { MediaServer, MediaServerOutput, MediaServerLayer, Format } from '@/types';
import { MEDIA_SERVER_PLATFORMS } from '@/types/mediaServer';
import { IOPortsPanel, formatLabel } from '@/components/IOPortsPanel';
import type { DevicePortDraft } from '@/components/IOPortsPanel';
import { FormatFormModal } from '@/components/FormatFormModal';

export default function MediaServers() {
  const { activeProject } = useProjectStore();
  const projectStore = useProjectStore();
  const oldStore = useProductionStore();
  
  const mediaServers = activeProject?.mediaServers || oldStore.mediaServers;
  const mediaServerLayers = activeProject?.mediaServerLayers || oldStore.mediaServerLayers;
  
  // Get production ID for WebSocket events
  const productionId = activeProject?.production?.id || oldStore.production?.id;

  // Equipment specs — used in reveal panel to split direct vs expansion I/O
  const _oldEquipmentSpecs = useProductionStore(state => state.equipmentSpecs) || [];
  const _libEquipmentSpecs = useEquipmentLibrary(state => state.equipmentSpecs);
  const computerEquipment = (_libEquipmentSpecs.length > 0 ? _libEquipmentSpecs : _oldEquipmentSpecs)
    .filter((spec: any) => spec.category === 'computer');
  
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

  // ── Layer panel state ──────────────────────────────────────────────────
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [draggedLayerIndex, setDraggedLayerIndex] = useState<number | null>(null);
  const [dragOverLayerIndex, setDragOverLayerIndex] = useState<number | null>(null);

  // ── Reveal panel state ─────────────────────────────────────────────────
  const [expandedPairs, setExpandedPairs] = useState<Set<string>>(new Set());
  const [pairCardPorts, setPairCardPorts] = useState<Record<string, DevicePortDraft[]>>({});
  const [pairCardPortsLoading, setPairCardPortsLoading] = useState<Set<string>>(new Set());
  const [formats, setFormats] = useState<Format[]>([]);

  useEffect(() => {
    apiClient.get('/formats')
      .then((res: any) => { if (Array.isArray(res)) setFormats(res); })
      .catch(() => {});
  }, []);

  // Track which UUIDs we've already requested so the eager-load effect doesn't double-fetch
  const requestedPortUuids = React.useRef<Set<string>>(new Set());

  // Helper: fetch and cache device_ports for one server UUID
  const fetchPortsForUuid = useCallback((uuid: string) => {
    if (requestedPortUuids.current.has(uuid)) return;
    requestedPortUuids.current.add(uuid);
    setPairCardPortsLoading(prev => new Set(prev).add(uuid));
    apiClient.get<any[]>(`/device-ports/device/${uuid}`)
      .then((ports: any) => {
        setPairCardPorts(prev => ({
          ...prev,
          [uuid]: Array.isArray(ports)
            ? ports.map((p: any) => ({
                uuid:         p.uuid,
                specPortUuid: p.specPortUuid,
                portLabel:    p.portLabel,
                ioType:       p.ioType,
                direction:    p.direction as 'INPUT' | 'OUTPUT',
                formatUuid:   p.formatUuid ?? null,
                note:         p.note ?? null,
              }))
            : [],
        }));
      })
      .catch(() => { setPairCardPorts(prev => ({ ...prev, [uuid]: [] })); })
      .finally(() => { setPairCardPortsLoading(prev => { const s = new Set(prev); s.delete(uuid); return s; }); });
  }, []);

  const togglePairReveal = useCallback(async (mainUuid: string, backupUuid?: string) => {
    setExpandedPairs(prev => {
      const next = new Set(prev);
      if (next.has(mainUuid)) { next.delete(mainUuid); } else { next.add(mainUuid); }
      return next;
    });
    // fetchPortsForUuid is idempotent — skips if already requested
    fetchPortsForUuid(mainUuid);
    if (backupUuid) fetchPortsForUuid(backupUuid);
  }, [fetchPortsForUuid]);
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
  const reorderMediaServerLayers = activeProject ? projectStore.reorderMediaServerLayers : null;
  
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

  // Layer-eligible ports — expansion-only outputs when the server has expansion cards, otherwise all outputs
  const layerEligiblePorts = React.useMemo(() => {
    const result: Record<string, DevicePortDraft[]> = {};
    serverPairs.forEach(pair => {
      [pair.main, pair.backup].forEach(server => {
        const uuid = (server as any).uuid as string | undefined;
        if (!uuid) return;
        const allPorts = pairCardPorts[uuid] ?? [];
        const spec = computerEquipment.find((s: any) => s.model === (server as any).computerType);
        const specCards: any[] = spec?.cards ?? [];
        if (specCards.length > 0) {
          const directCount = (spec?.inputs?.length ?? 0) + (spec?.outputs?.length ?? 0);
          result[uuid] = allPorts.slice(directCount).filter(p => p.direction === 'OUTPUT');
        } else {
          result[uuid] = allPorts.filter(p => p.direction === 'OUTPUT');
        }
      });
    });
    return result;
  }, [serverPairs, pairCardPorts, computerEquipment]);

  // Eager-load ports for all pairs on mount / when pair list changes (needed for card count display)
  useEffect(() => {
    serverPairs.forEach(pair => {
      const mainUuid   = (pair.main   as any).uuid as string | undefined;
      const backupUuid = (pair.backup as any).uuid as string | undefined;
      if (mainUuid)   fetchPortsForUuid(mainUuid);
      if (backupUuid) fetchPortsForUuid(backupUuid);
    });
  }, [serverPairs, fetchPortsForUuid]);

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
              {serverPairs.map((pair, index) => {
                const mainUuid   = (pair.main   as any).uuid as string | undefined;
                const backupUuid = (pair.backup as any).uuid as string | undefined;
                const isExpanded = mainUuid ? expandedPairs.has(mainUuid) : false;
                const isLoadingPorts = mainUuid ? pairCardPortsLoading.has(mainUuid) : false;
                const revealPorts     = mainUuid  ? (pairCardPorts[mainUuid]  ?? []) : [];
                const revealPortsBack = backupUuid ? (pairCardPorts[backupUuid] ?? []) : [];
                return (
                <Card 
                  key={pair.main.pairNumber} 
                  className={`p-6 transition-all select-none cursor-pointer ${
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
                  onClick={() => { if (draggedIndex === null && mainUuid) togglePairReveal(mainUuid, backupUuid); }}
                  onDoubleClick={(e) => { e.stopPropagation(); handleEditServer(pair.main); }}
                >
                  {/* ── 30/30/30/10 collapsed card ─────────────────────────────── */}
                  <div
                    className="grid gap-4 items-center"
                    style={{ gridTemplateColumns: '30fr 30fr 30fr 10fr' }}
                  >
                    {/* Col 1 (30%): grip + chevron + pair name + platform (output count) */}
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        className="cursor-grab active:cursor-grabbing text-av-text-muted hover:text-av-accent transition-colors flex-shrink-0"
                        title="Drag to reorder"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="w-5 h-5" />
                      </button>
                      {mainUuid ? (
                        isExpanded
                          ? <ChevronUp className="w-4 h-4 text-av-accent flex-shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-av-text-muted flex-shrink-0" />
                      ) : null}
                      <h3 className="text-lg font-semibold text-av-text truncate">
                        Server {index + 1}
                      </h3>
                      <span className="text-sm text-av-text-muted flex-shrink-0">
                        {(() => {
                          // Count named+format-assigned OUTPUT ports; fall back to outputs_data length for legacy records
                          const ports = mainUuid ? pairCardPorts[mainUuid] : undefined;
                          const count = ports !== undefined
                            ? ports.filter(p => p.direction === 'OUTPUT' && p.portLabel?.trim() && p.formatUuid).length
                            : pair.main.outputs.length;
                          return pair.main.platform + (count > 0 ? ` (${count} output${count !== 1 ? 's' : ''})` : '');
                        })()}
                      </span>
                    </div>

                    {/* Col 2 (30%): note */}
                    <div className="min-w-0">
                      {pair.main.note ? (
                        <span className="text-sm text-av-text-muted truncate block">{pair.main.note}</span>
                      ) : (
                        <span className="text-sm text-av-text-muted/40 italic">—</span>
                      )}
                    </div>

                    {/* Col 3 (30%): layer count */}
                    <div className="min-w-0">
                      {(() => {
                        const layerCount = mediaServerLayers.filter(l =>
                          l.outputAssignments.some(a => a.serverId === pair.main.id || a.serverId === pair.backup.id)
                        ).length;
                        return layerCount > 0 ? (
                          <span className="text-sm text-av-text-muted">{layerCount} layer{layerCount !== 1 ? 's' : ''}</span>
                        ) : (
                          <span className="text-sm text-av-text-muted/40 italic">—</span>
                        );
                      })()}
                    </div>

                    {/* Col 4 (10%): action buttons */}
                    <div className="flex items-center justify-end gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditServer(pair.main)}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
                        title="Edit servers"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
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

                  {/* ── Reveal Panel ───────────────────────────────────────────────── */}
                  {isExpanded && (() => {
                    // Look up the equipment spec by the server's computerType field
                    const specEntry = computerEquipment.find((s: any) => s.model === (pair.main as any).computerType);
                    const specCards = specEntry?.cards ?? [];
                    const sortedSpecCards = [...specCards].sort((a: any, b: any) => a.slotNumber - b.slotNumber);
                    const directCount = (specEntry?.inputs?.length ?? 0) + (specEntry?.outputs?.length ?? 0);

                    // Split a flat port array into direct + per-slot card sections (positional)
                    const splitPorts = (ports: DevicePortDraft[]) => {
                      const direct = specCards.length > 0 ? ports.slice(0, directCount) : ports;
                      const bySlot = new Map<number, DevicePortDraft[]>();
                      if (specCards.length > 0) {
                        let offset = directCount;
                        for (const card of sortedSpecCards) {
                          const count = (card.inputs?.length ?? 0) + (card.outputs?.length ?? 0);
                          bySlot.set(card.slotNumber, ports.slice(offset, offset + count));
                          offset += count;
                        }
                      }
                      return { direct, bySlot };
                    };

                    // Render a port table (inputs first, then outputs)
                    const renderPortTable = (ports: DevicePortDraft[], loading: boolean, emptyMsg: string) => {
                      if (loading) return <p className="text-xs text-av-text-muted italic">Loading ports…</p>;
                      if (ports.length === 0) return <p className="text-xs text-av-text-muted italic">{emptyMsg}</p>;
                      const inputs  = ports.filter(p => p.direction === 'INPUT');
                      const outputs = ports.filter(p => p.direction === 'OUTPUT');
                      return (
                        <table className="w-full text-xs table-fixed">
                          <thead>
                            <tr className="text-av-text-muted uppercase tracking-wide border-b border-av-border">
                              <th className="text-left pb-1.5 pr-2 font-semibold w-[10%]">Dir</th>
                              <th className="text-left pb-1.5 pr-2 font-semibold w-[15%]">Type</th>
                              <th className="text-left pb-1.5 pr-2 font-semibold w-[25%]">Label</th>
                              <th className="text-left pb-1.5 pr-2 font-semibold w-[25%]">Format</th>
                              <th className="text-left pb-1.5 font-semibold w-[25%]">Route</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-av-border/40">
                            {[...inputs, ...outputs].map((port, i) => {
                              const isOut = port.direction === 'OUTPUT';
                              const fmt = port.formatUuid ? formats.find(f => f.uuid === port.formatUuid) : null;
                              const fmtName = fmt ? fmt.id : '—';
                              return (
                                <tr key={i} className="hover:bg-av-surface-hover/40">
                                  <td className="py-1.5 pr-2">
                                    {isOut
                                      ? <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-accent/15 text-av-accent">OUT</span>
                                      : <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-warning/15 text-av-warning">IN</span>
                                    }
                                  </td>
                                  <td className="py-1.5 pr-2 font-mono text-av-text-muted truncate">{port.ioType}</td>
                                  <td className="py-1.5 pr-2 text-av-text truncate">{port.portLabel || <span className="text-av-text-muted/50 italic">unlabelled</span>}</td>
                                  <td className="py-1.5 pr-2 text-av-info truncate">{isOut ? fmtName : <span className="text-av-text-muted">—</span>}</td>
                                  <td className="py-1.5 text-av-text-muted truncate">{port.note || '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    };

                    // Render Direct I/O + per-slot Expansion I/O for one server subcard
                    const renderServerPorts = (ports: DevicePortDraft[], loading: boolean, emptyMsg: string) => {
                      if (loading) return <p className="text-xs text-av-text-muted italic">Loading ports…</p>;
                      if (ports.length === 0 && specCards.length === 0)
                        return <p className="text-xs text-av-text-muted italic">{emptyMsg}</p>;

                      const { direct, bySlot } = splitPorts(ports);
                      return (
                        <div className="space-y-3">
                          {/* Direct I/O */}
                          <div>
                            {specCards.length > 0 && (
                              <p className="text-xs font-semibold text-av-text-muted uppercase tracking-wide mb-1.5">Direct I/O</p>
                            )}
                            {direct.length === 0 && ports.length === 0
                              ? <p className="text-xs text-av-text-muted italic">{emptyMsg}</p>
                              : <div className="px-2">{renderPortTable(direct, false, emptyMsg)}</div>
                            }
                          </div>

                          {/* Expansion I/O — per slot */}
                          {sortedSpecCards.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-av-text-muted uppercase tracking-wide mb-1.5">
                                Expansion I/O — {sortedSpecCards.length} card{sortedSpecCards.length !== 1 ? 's' : ''}
                              </p>
                              <div className="space-y-2">
                                {sortedSpecCards.map((card: any, ci: number) => {
                                  const savedPorts = bySlot.get(card.slotNumber) ?? [];
                                  const specInputs: any[] = card.inputs ?? [];
                                  const specOutputs: any[] = card.outputs ?? [];
                                  return (
                                    <div key={card.id ?? card.slotNumber} className="border border-av-border rounded-md p-2">
                                      <p className="text-xs font-medium text-av-text mb-1.5">Card {card.slotNumber}</p>
                                      {savedPorts.length > 0
                                        ? renderPortTable(savedPorts, false, '')
                                        : (
                                          <table className="w-full text-xs table-fixed">
                                            <thead>
                                              <tr className="text-av-text-muted uppercase tracking-wide border-b border-av-border">
                                                <th className="text-left pb-1.5 pr-2 font-semibold w-[10%]">Dir</th>
                                                <th className="text-left pb-1.5 pr-2 font-semibold w-[15%]">Type</th>
                                                <th className="text-left pb-1.5 pr-2 font-semibold w-[25%]">Label</th>
                                                <th className="text-left pb-1.5 pr-2 font-semibold w-[25%]">Format</th>
                                                <th className="text-left pb-1.5 font-semibold w-[25%]">Route</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-av-border/40">
                                              {specInputs.map((p: any, pi: number) => (
                                                <tr key={`c${ci}-in-${pi}`} className="hover:bg-av-surface-hover/40">
                                                  <td className="py-1 pr-2"><span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-warning/15 text-av-warning">IN</span></td>
                                                  <td className="py-1 pr-2 font-mono text-av-text-muted truncate">{p.type}</td>
                                                  <td className="py-1 pr-2 text-av-text truncate">{p.label || p.id}</td>
                                                  <td className="py-1 pr-2 text-av-text-muted">—</td>
                                                  <td className="py-1 text-av-text-muted">—</td>
                                                </tr>
                                              ))}
                                              {specOutputs.map((p: any, pi: number) => (
                                                <tr key={`c${ci}-out-${pi}`} className="hover:bg-av-surface-hover/40">
                                                  <td className="py-1 pr-2"><span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-accent/15 text-av-accent">OUT</span></td>
                                                  <td className="py-1 pr-2 font-mono text-av-text-muted truncate">{p.type}</td>
                                                  <td className="py-1 pr-2 text-av-text truncate">{p.label || p.id}</td>
                                                  <td className="py-1 pr-2 text-av-text-muted">—</td>
                                                  <td className="py-1 text-av-text-muted">—</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        )
                                      }
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    };

                    const isLoadingA = mainUuid   ? pairCardPortsLoading.has(mainUuid)   : false;
                    const isLoadingB = backupUuid ? pairCardPortsLoading.has(backupUuid) : false;

                    return (
                      <div className="mt-4 border-t border-av-border pt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Server A */}
                          <div className="bg-av-surface-light p-4 rounded-md border border-av-border">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-av-text">Server {index + 1} A</h4>
                              <Badge variant="success">Main</Badge>
                            </div>
                            <div className="overflow-x-auto">
                              {renderServerPorts(revealPorts, isLoadingA, 'No ports configured. Open Edit to assign ports.')}
                            </div>
                          </div>

                          {/* Server B */}
                          <div className="bg-av-surface-light p-4 rounded-md border border-av-border">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-av-text">Server {index + 1} B</h4>
                              <Badge variant="warning">Backup</Badge>
                            </div>
                            <div className="overflow-x-auto">
                              {renderServerPorts(revealPortsBack, isLoadingB, 'No ports configured.')}
                            </div>
                          </div>
                        </div>

                        {pair.main.note && (
                          <div className="border-t border-av-border pt-3">
                            <p className="text-sm text-av-text-muted">
                              <span className="font-medium">Note:</span> {pair.main.note}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </Card>
                );
              })}
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
              {mediaServerLayers.map((layer, layerIndex) => {
                const isExpanded = expandedLayers.has(layer.id);

                // Group assignments by server pair; A side = label lookup, B side = mirror of A
                const groupedAssignments = (() => {
                  const map: Record<number, { pairNumber: number; mainPorts: string[]; hasMirror: boolean }> = {};
                  layer.outputAssignments.forEach((assignment: any) => {
                    const server = mediaServers.find((s: any) => s.id === assignment.serverId);
                    if (!server) return;
                    const pairNum = (server as any).pairNumber;
                    if (!map[pairNum]) map[pairNum] = { pairNumber: pairNum, mainPorts: [], hasMirror: false };
                    if (!(server as any).isBackup) {
                      const uuid = (server as any).uuid as string | undefined;
                      const port = uuid ? pairCardPorts[uuid]?.find((p: any) => p.uuid === assignment.outputId) : null;
                      map[pairNum].mainPorts.push(port?.portLabel || port?.ioType || assignment.outputId);
                    } else {
                      map[pairNum].hasMirror = true;
                    }
                  });
                  return Object.values(map).sort((a, b) => a.pairNumber - b.pairNumber);
                })();

                const totalOutputCount = groupedAssignments.reduce((n, g) => n + g.mainPorts.length, 0);

                return (
                  <Card
                    key={layer.id}
                    className={`p-4 select-none cursor-pointer transition-all ${
                      draggedLayerIndex === layerIndex
                        ? 'opacity-50 scale-95'
                        : dragOverLayerIndex === layerIndex
                        ? 'border-av-accent border-2'
                        : 'hover:border-av-accent/30'
                    }`}
                    draggable
                    onDragStart={() => setDraggedLayerIndex(layerIndex)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverLayerIndex(layerIndex); }}
                    onDragEnd={() => {
                      if (draggedLayerIndex !== null && dragOverLayerIndex !== null && draggedLayerIndex !== dragOverLayerIndex) {
                        const next = [...mediaServerLayers];
                        const [moved] = next.splice(draggedLayerIndex, 1);
                        next.splice(dragOverLayerIndex, 0, moved);
                        reorderMediaServerLayers?.(next);
                      }
                      setDraggedLayerIndex(null);
                      setDragOverLayerIndex(null);
                    }}
                    onDragLeave={() => setDragOverLayerIndex(null)}
                    onClick={() => setExpandedLayers(prev => {
                      const next = new Set(prev);
                      next.has(layer.id) ? next.delete(layer.id) : next.add(layer.id);
                      return next;
                    })}
                  >
                    {/* ── Collapsed row ─────────────────────────────────────── */}
                    <div className="grid gap-4 items-center" style={{ gridTemplateColumns: '30fr 30fr 30fr 10fr' }}>
                      {/* Col 1: grip + chevron + name */}
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          className="cursor-grab active:cursor-grabbing text-av-text-muted hover:text-av-accent flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GripVertical className="w-5 h-5" />
                        </button>
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-av-accent flex-shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-av-text-muted flex-shrink-0" />
                        }
                        <div className="flex items-center gap-2 min-w-0">
                          <Layers className="w-4 h-4 text-av-accent flex-shrink-0" />
                          <span className="font-semibold text-av-text truncate">{layer.name}</span>
                        </div>
                      </div>

                      {/* Col 2: content description */}
                      <div className="min-w-0">
                        {layer.content
                          ? <span className="text-sm text-av-text-muted truncate block">{layer.content}</span>
                          : <span className="text-sm text-av-text-muted/40 italic">—</span>
                        }
                      </div>

                      {/* Col 3: output / pair summary */}
                      <div className="min-w-0">
                        {groupedAssignments.length > 0 ? (
                          <span className="text-sm text-av-text-muted">
                            {totalOutputCount} output{totalOutputCount !== 1 ? 's' : ''}
                            {groupedAssignments.length > 1 ? ` (${groupedAssignments.length} pairs)` : ''}
                          </span>
                        ) : (
                          <span className="text-sm text-av-text-muted/40 italic">—</span>
                        )}
                      </div>

                      {/* Col 4: actions */}
                      <div className="flex items-center justify-end gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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

                    {/* ── Expanded panel: A/B split per server pair ─────────── */}
                    {isExpanded && groupedAssignments.length > 0 && (
                      <div className="mt-4 border-t border-av-border pt-4 space-y-4">
                        {groupedAssignments.map(group => (
                          <div key={group.pairNumber}>
                            <p className="text-xs font-semibold text-av-text-muted uppercase tracking-wide mb-2">
                              Server {group.pairNumber}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* A — Main */}
                              <div className="bg-av-surface-light p-3 rounded-md border border-av-border">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-semibold text-av-text">Server {group.pairNumber} A</p>
                                  <Badge variant="success">Main</Badge>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {group.mainPorts.map((label, i) => (
                                    <span key={i} className="text-xs bg-av-surface px-2 py-1 rounded border border-av-border">
                                      {label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              {/* B — Backup (mirrored) */}
                              {group.hasMirror && (
                                <div className="bg-av-surface-light p-3 rounded-md border border-av-border">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold text-av-text">Server {group.pairNumber} B</p>
                                    <Badge variant="warning">Backup</Badge>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {group.mainPorts.map((label, i) => (
                                      <span key={i} className="text-xs bg-av-surface px-2 py-1 rounded border border-av-border text-av-text-muted">
                                        {label}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
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
                    {/* Header Row - Only Main Servers (use device_ports OUTPUTs as columns) */}
                    <div className="flex gap-2 mb-4">
                      <div className="w-48 flex-shrink-0" />
                      {serverPairs.map((pair) => {
                        const mainUuid = (pair.main as any).uuid as string | undefined;
                        const outputPorts = (mainUuid ? (pairCardPorts[mainUuid] ?? []) : [])
                          .filter((p: DevicePortDraft) => p.direction === 'OUTPUT');
                        return (
                          <React.Fragment key={pair.main.pairNumber}>
                            {outputPorts.length === 0 ? (
                              <div className="w-32 flex-shrink-0">
                                <div className="bg-av-surface-light border border-av-border rounded-md p-2 text-center">
                                  <div className="text-xs font-semibold text-av-text truncate">Server {pair.main.pairNumber}</div>
                                  <div className="text-xs text-av-text-muted italic mt-1">no outputs</div>
                                </div>
                              </div>
                            ) : outputPorts.map((port: DevicePortDraft) => (
                              <div key={port.uuid || port.portLabel} className="w-32 flex-shrink-0">
                                <div className="bg-av-surface-light border border-av-border rounded-md p-2 text-center">
                                  <div className="text-xs font-semibold text-av-text truncate">Server {pair.main.pairNumber}</div>
                                  <div className="text-xs text-av-text-muted truncate mt-1">{port.portLabel || port.ioType}</div>
                                  <Badge className="mt-1 text-xs">{port.ioType}</Badge>
                                </div>
                              </div>
                            ))}
                          </React.Fragment>
                        );
                      })}
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

                            {/* Output Assignment Cells - Only Main Servers (device_ports OUTPUTs) */}
                            {serverPairs.map((pair) => {
                              const mainUuid = (pair.main as any).uuid as string | undefined;
                              const outputPorts = (mainUuid ? (pairCardPorts[mainUuid] ?? []) : [])
                                .filter((p: DevicePortDraft) => p.direction === 'OUTPUT');
                              return (
                                <React.Fragment key={pair.main.pairNumber}>
                                  {outputPorts.map((port: DevicePortDraft) => {
                                    const isAssigned = layer.outputAssignments.some(
                                      a => a.serverId === pair.main.id && a.outputId === port.uuid
                                    );
                                    return (
                                      <div
                                        key={port.uuid || port.portLabel}
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
                              );
                            })}
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
          nextPairNumber={serverPairs.length + 1}
          productionId={productionId}
          onClose={() => {
            setIsServerModalOpen(false);
            setEditingServer(null);
            setIsDuplicating(false);
          }}
          onSave={(platform, note, computerType, ports) => {
            if (editingServer && !isDuplicating) {
              const pair = serverPairs.find(p => p.main.pairNumber === editingServer.pairNumber);
              if (pair) {
                const serverName = `Server ${pair.main.pairNumber}`;
                // Immediately update pairCardPorts so reveal panel reflects changes without a refresh
                if (ports && ports.length > 0) {
                  const mainUuid   = (pair.main   as any).uuid as string | undefined;
                  const backupUuid = (pair.backup as any).uuid as string | undefined;
                  setPairCardPorts(prev => ({
                    ...prev,
                    ...(mainUuid   ? { [mainUuid]:   ports } : {}),
                    ...(backupUuid ? { [backupUuid]: ports } : {}),
                  }));
                }
                Promise.all([
                  updateMediaServer(pair.main.id, { name: `${serverName} A`, platform, outputs: [], note, computerType }),
                  updateMediaServer(pair.backup.id, { name: `${serverName} B`, platform, outputs: [], note, computerType }),
                ]).then(() => {
                  if (activeProject) projectStore.loadProject(activeProject.id);
                }).catch(() => {});
              }
            } else {
              addMediaServerPair(platform, [], note, computerType);
            }
            setIsServerModalOpen(false);
            setEditingServer(null);
            setIsDuplicating(false);
          }}
          onSaveAndDuplicate={(platform, note, computerType, ports) => {
            if (editingServer && !isDuplicating) {
              const pair = serverPairs.find(p => p.main.pairNumber === editingServer.pairNumber);
              if (pair) {
                const serverName = `Server ${pair.main.pairNumber}`;
                if (ports && ports.length > 0) {
                  const mainUuid   = (pair.main   as any).uuid as string | undefined;
                  const backupUuid = (pair.backup as any).uuid as string | undefined;
                  setPairCardPorts(prev => ({
                    ...prev,
                    ...(mainUuid   ? { [mainUuid]:   ports } : {}),
                    ...(backupUuid ? { [backupUuid]: ports } : {}),
                  }));
                }
                Promise.all([
                  updateMediaServer(pair.main.id, { name: `${serverName} A`, platform, outputs: [], note, computerType }),
                  updateMediaServer(pair.backup.id, { name: `${serverName} B`, platform, outputs: [], note, computerType }),
                ]).then(() => {
                  if (activeProject) projectStore.loadProject(activeProject.id);
                }).catch(() => {});
              }
            } else {
              addMediaServerPair(platform, [], note, computerType);
            }
            const nextPairNum = serverPairs.length + 1;
            setEditingServer({
              id: `Server${nextPairNum}A`,
              name: `Server ${nextPairNum} A`,
              pairNumber: nextPairNum,
              platform,
              outputs: [],
              note: note || '',
              type: 'SERVER',
              category: 'SOURCE'
            } as MediaServer);
            setIsDuplicating(true);
          }}
          editingServer={editingServer}
          backupServer={serverPairs.find(p => p.main.pairNumber === editingServer?.pairNumber)?.backup ?? null}
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
          serverPorts={layerEligiblePorts}
        />
      )}
    </div>
  );
}

// Server Pair Modal Component
interface ServerPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (platform: string, note?: string, computerType?: string, ports?: DevicePortDraft[]) => void;
  onSaveAndDuplicate?: (platform: string, note?: string, computerType?: string, ports?: DevicePortDraft[]) => void;
  editingServer: MediaServer | null;
  backupServer?: MediaServer | null;
  isDuplicating?: boolean;
  nextPairNumber?: number;
  productionId?: string;
}

function ServerPairModal({ isOpen, onClose, onSave, onSaveAndDuplicate, editingServer, backupServer, isDuplicating, nextPairNumber, productionId }: ServerPairModalProps) {
  // Use the pairNumber passed from parent (which uses the same logic as main page display)
  // or fall back to the editingServer's pairNumber
  const pairNumber = editingServer?.pairNumber || nextPairNumber || 1;
  
  const oldStoreEquipmentSpecs = useProductionStore(state => state.equipmentSpecs) || [];
  const equipmentLibSpecs = useEquipmentLibrary(state => state.equipmentSpecs);
  const equipmentSpecs = equipmentLibSpecs.length > 0 ? equipmentLibSpecs : oldStoreEquipmentSpecs;
  const computerEquipment = equipmentSpecs.filter(spec => spec.category === 'computer');
  
  const [platform, setPlatform] = useState(editingServer?.platform || MEDIA_SERVER_PLATFORMS[0]);
  const [computerType, setComputerType] = useState(editingServer?.computerType || '');
  const [note, setNote] = useState(editingServer?.note || '');

  // device_ports state — tracks signal routing per port
  const [devicePorts, setDevicePorts] = useState<DevicePortDraft[]>([]);
  const [portsLoading, setPortsLoading] = useState(false);
  const [formats, setFormats] = useState<any[]>([]);
  const [isCreateFormatOpen, setIsCreateFormatOpen] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    apiClient.get('/formats')
      .then((res: any) => { if (Array.isArray(res)) setFormats(res); })
      .catch(() => {});
  }, [isOpen]);

  // Load device_ports for the main (A) server when editing
  useEffect(() => {
    if (!isOpen) return;
    const mainServer = editingServer && !editingServer.isBackup ? editingServer : null;
    if (mainServer?.uuid) {
      setPortsLoading(true);
      apiClient.get(`/device-ports/device/${mainServer.uuid}`)
        .then((res: any) => {
          const ports: any[] = Array.isArray(res) ? res : [];
          if (ports.length > 0) {
            const spec = computerEquipment.find(s => s.model === computerType);
            const directCount = (spec?.inputs?.length || 0) + (spec?.outputs?.length || 0);
            const sortedCards = [...(spec?.cards || [])].sort((a: any, b: any) => a.slotNumber - b.slotNumber);
            let offset = directCount;
            const cardRanges: Array<{ slotNumber: number; start: number; end: number }> = [];
            for (const card of sortedCards) {
              const count = (card.inputs?.length || 0) + (card.outputs?.length || 0);
              cardRanges.push({ slotNumber: card.slotNumber, start: offset, end: offset + count });
              offset += count;
            }
            setDevicePorts(ports.map((p: any, i: number) => {
              const range = cardRanges.find(r => i >= r.start && i < r.end);
              return {
                uuid: p.uuid,
                specPortUuid: p.specPortUuid,
                portLabel: p.portLabel,
                ioType: p.ioType,
                direction: p.direction,
                formatUuid: p.formatUuid,
                note: p.note,
                ...(range ? { cardSlot: range.slotNumber } : {}),
              };
            }));
          }
          // If DB returned empty, leave devicePorts alone — spec auto-populate handles it
        })
        .catch(() => {})
        .finally(() => setPortsLoading(false));
    } else {
      setDevicePorts([]);
    }
  }, [isOpen, editingServer?.uuid]);
  
  // ── Auto-populate device_ports from equipment spec ─────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (!computerType) return;
    const spec = computerEquipment.find(s => s.model === computerType);
    if (!spec) return;
    const specPortLabel = (p: any): string => {
      const label = p.label || '';
      const isGeneric = label === 'Input' || label === 'Output';
      return (!isGeneric && label) ? label : (p.type || p.id || '');
    };
    const mapDirect = (p: any, dir: 'INPUT' | 'OUTPUT'): DevicePortDraft =>
      ({ portLabel: specPortLabel(p), ioType: p.type, direction: dir, formatUuid: null, note: null });
    const mapCard = (p: any, dir: 'INPUT' | 'OUTPUT', slotNumber: number): DevicePortDraft =>
      ({ portLabel: specPortLabel(p), ioType: p.type, direction: dir, formatUuid: null, note: null, cardSlot: slotNumber });
    const specPorts: DevicePortDraft[] = [
      ...(spec.inputs  ?? []).map(p => mapDirect(p, 'INPUT')),
      ...(spec.outputs ?? []).map(p => mapDirect(p, 'OUTPUT')),
      ...[...(spec.cards ?? [])].sort((a, b) => a.slotNumber - b.slotNumber).flatMap(card => [
        ...(card.inputs  ?? []).map(p => mapCard(p, 'INPUT',  card.slotNumber)),
        ...(card.outputs ?? []).map(p => mapCard(p, 'OUTPUT', card.slotNumber)),
      ]),
    ];
    if (specPorts.length === 0) return;
    setDevicePorts(prev => prev.length > 0 ? prev : specPorts);
  }, [isOpen, computerType, computerEquipment]);

  // ── Output handlers removed ────────────────────────────────────────────
  // Outputs section replaced by IOPortsPanel / device_ports (see below).

  // ── Common resolutions / frame rates removed ───────────────────────────
  // Format selection is now handled by IOPortsPanel via the formats table.

  const handleSubmit = (e: React.FormEvent, action: 'close' | 'duplicate' = 'close') => {
    e.preventDefault();

    // Sync device_ports for main (A) server
    const mainUuid = editingServer && !editingServer.isBackup ? editingServer.uuid : undefined;
    if (mainUuid && devicePorts.length > 0 && productionId) {
      apiClient.post(`/device-ports/device/${mainUuid}/sync`, {
        productionId,
        deviceDisplayId: editingServer?.id,
        ports: devicePorts,
      }).catch((err: any) => console.warn('device_ports sync (A) failed (non-fatal):', err));
    }

    // Sync device_ports for backup (B) server — same ports as A
    const backupUuid = backupServer?.uuid;
    if (backupUuid && devicePorts.length > 0 && productionId) {
      apiClient.post(`/device-ports/device/${backupUuid}/sync`, {
        productionId,
        deviceDisplayId: backupServer?.id,
        ports: devicePorts.map(p => ({ ...p, uuid: undefined })), // new rows for B (no existing uuids)
      }).catch((err: any) => console.warn('device_ports sync (B) failed (non-fatal):', err));
    }

    if (action === 'duplicate' && onSaveAndDuplicate) {
      onSaveAndDuplicate(platform, note, computerType, devicePorts);
    } else {
      onSave(platform, note, computerType, devicePorts);
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-av-surface rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-av-border sticky top-0 bg-av-surface z-10">
            <h2 className="text-2xl font-bold text-av-text">
              {editingServer ? `Edit Server ${pairNumber} Pair` : `Add Server ${pairNumber} Pair`}
            </h2>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium text-av-text mb-2">
                  Computer Type
                </label>
                <select
                  value={computerType}
                  onChange={(e) => setComputerType(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">Select computer type...</option>
                  {computerEquipment.map(spec => (
                    <option key={spec.id} value={spec.model}>{spec.manufacturer} {spec.model}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* I/O Ports — Direct + Expansion sections */}
            {(() => {
              const spec = computerEquipment.find(s => s.model === computerType);
              const sortedCards = [...(spec?.cards || [])].sort((a, b) => a.slotNumber - b.slotNumber);

              const directPorts = devicePorts.filter(p => p.cardSlot == null);
              const setDirectPorts = (updated: DevicePortDraft[]) =>
                setDevicePorts([...updated, ...devicePorts.filter(p => p.cardSlot != null)]);

              const getSlotPorts = (slotNumber: number) =>
                devicePorts.filter(p => p.cardSlot === slotNumber);
              const setSlotPorts = (slotNumber: number, updated: DevicePortDraft[]) =>
                setDevicePorts(prev => {
                  const allSlots = [...new Set(prev.filter(p => p.cardSlot != null).map(p => p.cardSlot!))].sort((a, b) => a - b);
                  const newCards = allSlots.flatMap(slot =>
                    slot === slotNumber ? updated : prev.filter(p => p.cardSlot === slot)
                  );
                  return [...prev.filter(p => p.cardSlot == null), ...newCards];
                });

              return (
                <div className="space-y-4">
                  {/* ── Direct I/O ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm font-medium text-av-text">
                        Direct I/O
                        <span className="text-xs text-av-text-muted ml-2">assign label &amp; format per port</span>
                      </label>
                      {directPorts.length > 0 && (
                        <span className="text-xs text-av-text-muted ml-auto">
                          {directPorts.filter(p => p.direction === 'INPUT').length} in / {directPorts.filter(p => p.direction === 'OUTPUT').length} out
                        </span>
                      )}
                    </div>
                    <IOPortsPanel
                      ports={directPorts}
                      onChange={setDirectPorts}
                      formats={formats}
                      isLoading={portsLoading}
                      emptyText={
                        !computerType
                          ? 'Select a Computer Type above to auto-populate ports from the equipment spec.'
                          : 'No direct I/O defined for this equipment type.'
                      }
                      onCreateCustomFormat={() => setIsCreateFormatOpen(true)}
                    />
                  </div>

                  {/* ── Expansion I/O (one section per card slot) ── */}
                  {sortedCards.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-av-text">Expansion I/O</span>
                        <span className="text-xs text-av-text-muted">({sortedCards.length} slot{sortedCards.length !== 1 ? 's' : ''})</span>
                      </div>
                      <div className="space-y-3">
                        {sortedCards.map(card => {
                          const slotPorts = getSlotPorts(card.slotNumber);
                          return (
                            <div key={card.id || card.slotNumber} className="border border-av-border rounded-md">
                              <div className="flex items-center gap-2 px-3 py-2 bg-av-surface-light border-b border-av-border">
                                <span className="text-xs font-semibold text-av-text">Slot {card.slotNumber}</span>
                                <span className="text-xs text-av-text-muted">
                                  {slotPorts.filter(p => p.direction === 'INPUT').length} in / {slotPorts.filter(p => p.direction === 'OUTPUT').length} out
                                </span>
                              </div>
                              <div className="p-2">
                                <IOPortsPanel
                                  ports={slotPorts}
                                  onChange={(u) => setSlotPorts(card.slotNumber, u)}
                                  formats={formats}
                                  isLoading={false}
                                  emptyText="No ports defined for this card slot."
                                  onCreateCustomFormat={() => setIsCreateFormatOpen(true)}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

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
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
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
      onSaved={(fmt) => { setFormats((prev: any[]) => [...prev, fmt]); setIsCreateFormatOpen(false); }}
    />
    </>
  );
}

// Layer Modal Component
interface LayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (layer: Omit<MediaServerLayer, 'id'>) => void;
  editingLayer: MediaServerLayer | null;
  availableServers: MediaServer[];
  serverPorts: Record<string, DevicePortDraft[]>;
}

function LayerModal({ isOpen, onClose, onSave, editingLayer, availableServers, serverPorts }: LayerModalProps) {
  const [name, setName] = useState(editingLayer?.name || '');
  const [content, setContent] = useState(editingLayer?.content || '');
  const [outputAssignments, setOutputAssignments] = useState(editingLayer?.outputAssignments || []);

  // Only show main servers (not backups) since layer config will be mirrored to backups
  const mainServers = availableServers.filter(s => !s.isBackup);

  // Get OUTPUT device_ports for a server by UUID
  const getServerOutputPorts = (server: MediaServer): DevicePortDraft[] => {
    const uuid = (server as any).uuid as string | undefined;
    return uuid ? (serverPorts[uuid] ?? []).filter(p => p.direction === 'OUTPUT') : [];
  };

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
    
    // Mirror assignments from A servers to B servers by positional index
    const mirroredAssignments = [...outputAssignments];
    outputAssignments.forEach(assignment => {
      const mainServer = availableServers.find(s => s.id === assignment.serverId && !s.isBackup);
      if (mainServer) {
        const backupServer = availableServers.find(s => s.pairNumber === mainServer.pairNumber && s.isBackup);
        if (backupServer) {
          const mainOutputPorts = getServerOutputPorts(mainServer);
          const mainOutputIndex = mainOutputPorts.findIndex(p => p.uuid === assignment.outputId);
          const backupOutputPorts = getServerOutputPorts(backupServer);
          if (mainOutputIndex >= 0 && backupOutputPorts[mainOutputIndex]) {
            mirroredAssignments.push({
              serverId: backupServer.id,
              outputId: backupOutputPorts[mainOutputIndex].uuid as string,
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
                  {mainServers.map(server => {
                    const outputPorts = getServerOutputPorts(server);
                    return (
                      <Card key={server.id} className="p-4">
                        <h4 className="font-semibold text-av-text mb-3 flex items-center gap-2">
                          <Server className="w-4 h-4" />
                          {server.name}
                        </h4>
                        {outputPorts.length === 0 ? (
                          <p className="text-sm text-av-text-muted italic">No output ports found. Save server ports in the Edit modal first.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {outputPorts.map(port => (
                              <label key={port.uuid || port.portLabel} className="flex items-center gap-2 bg-av-surface-light px-3 py-2 rounded cursor-pointer hover:bg-av-surface">
                                <input
                                  type="checkbox"
                                  checked={outputAssignments.some(a => a.serverId === server.id && a.outputId === port.uuid)}
                                  onChange={() => toggleOutputAssignment(server.id, port.uuid as string)}
                                  className="rounded"
                                />
                                <span className="text-sm text-av-text flex-1">{port.portLabel || port.ioType}</span>
                                <Badge>{port.ioType}</Badge>
                              </label>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
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
