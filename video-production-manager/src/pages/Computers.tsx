import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Copy, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useSourcesAPI } from '@/hooks/useSourcesAPI';
import { useProductionEvents } from '@/hooks/useProductionEvents';
import { SourceFormModal } from '@/components/SourceFormModal';
import { SourceService, apiClient } from '@/services';
import type { Source, Format } from '@/types';
import type { DevicePortDraft } from '@/components/IOPortsPanel';

export const Computers: React.FC = () => {
  // Use new stores
  const { activeProject } = useProjectStore();
  const oldStore = useProductionStore();
  
  // API hook for event-enabled operations
  const sourcesAPI = useSourcesAPI();
  
  // Local state
  const [sources, setSources] = useState<Source[]>([]);
  const [conflictError, setConflictError] = useState<{
    currentVersion: number;
    clientVersion: number;
    serverData: Source;
  } | null>(null);
  
  // Get production ID from production object, NOT the IndexedDB project ID
  const productionId = activeProject?.production?.id || oldStore.production?.id;
  
  // Load sources from API on mount and filter for computers
  useEffect(() => {
    if (productionId && oldStore.isConnected) {
      sourcesAPI.fetchSources(productionId)
        .then(allSources => {
          // Filter for COMPUTER category only
          const computerSources = allSources.filter(s => s.category === 'COMPUTER');
          setSources(computerSources);
        })
        .catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);

  // Real-time event subscriptions
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback((event) => {
      if (event.entityType === 'source' && event.entity.category === 'COMPUTER') {
        console.log('🔔 Computer created by', event.userName);
        setSources(prev => {
          // Use uuid for duplicate detection (immutable PRIMARY KEY)
          if (prev.some(s => s.uuid === event.entity.uuid)) return prev;
          return [...prev, event.entity];
        });
      }
    }, []),
    onEntityUpdated: useCallback((event) => {
      if (event.entityType === 'source' && event.entity.category === 'COMPUTER') {
        console.log('🔔 Computer updated by', event.userName);
        setSources(prev => prev.map(s => 
          s.uuid === event.entity.uuid ? event.entity : s
        ));
      }
    }, []),
    onEntityDeleted: useCallback((event) => {
      if (event.entityType === 'source') {
        console.log('🔔 Computer deleted by', event.userName);
        setSources(prev => prev.filter(s => s.uuid !== event.entityId));
      }
    }, [])
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');

  // ── Reveal panel state ─────────────────────────────────────────────────
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [cardPorts, setCardPorts] = useState<Record<string, DevicePortDraft[]>>({});
  const [cardPortsLoading, setCardPortsLoading] = useState<Set<string>>(new Set());
  const [formats, setFormats] = useState<Format[]>([]);

  useEffect(() => {
    apiClient.get('/formats')
      .then((res: any) => { if (Array.isArray(res.data)) setFormats(res.data); })
      .catch(() => {});
  }, []);

  const toggleReveal = useCallback(async (uuid: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(uuid)) { next.delete(uuid); } else { next.add(uuid); }
      return next;
    });
    if (!cardPorts[uuid]) {
      setCardPortsLoading(prev => new Set(prev).add(uuid));
      try {
        const ports = await apiClient.get<any[]>(`/device-ports/device/${uuid}`);
        setCardPorts(prev => ({
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
      } catch {
        setCardPorts(prev => ({ ...prev, [uuid]: [] }));
      } finally {
        setCardPortsLoading(prev => { const s = new Set(prev); s.delete(uuid); return s; });
      }
    }
  }, [cardPorts]);

  const sourceTypes = React.useMemo(() => {
    const types = new Set(sources.map(s => s.type));
    return ['all', ...Array.from(types)];
  }, [sources]);

  const filteredSources = React.useMemo(() => {
    return sources.filter(source => {
      return selectedType === 'all' || source.type === selectedType;
    });
  }, [sources, selectedType]);

  // Helper: Check if a source has a duplicate ID (for visual warning)
  const hasDuplicateId = useCallback((source: Source) => {
    return sources.filter(s => 
      s.id === source.id && 
      s.uuid !== source.uuid && 
      s.production_id === source.production_id
    ).length > 0;
  }, [sources]);

  const handleAddNew = () => {
    setEditingSource(null);
    setIsModalOpen(true);
  };

  const handleEdit = (source: Source) => {
    setEditingSource(source);
    setIsModalOpen(true);
  };

  const handleSave = async (source: Source, devicePorts: DevicePortDraft[], shouldCloseModal = true) => {
    setConflictError(null);
    
    try {
      // Force category to 'COMPUTER' for all sources created/edited on Computers page
      const computerSource = { ...source, category: 'COMPUTER' as any };
      let savedUuid: string | undefined;

      // Check if we're editing an existing source (uuid must be present and not empty)
      if (editingSource && editingSource.uuid) {
        const result = await sourcesAPI.updateSource(editingSource.uuid, computerSource);
        if ('error' in result && result.error === 'Conflict') {
          setConflictError(result);
          return;
        }
        savedUuid = editingSource.uuid;
        // Don't manually update state - let WebSocket event handle it
      } else {
        // Create via API - WebSocket event will update state automatically
        const created = await sourcesAPI.createSource({
          ...computerSource,
          productionId: productionId!
        }) as any;
        savedUuid = created?.uuid;
        // Don't manually update state - let WebSocket event handle it
      }

      // Sync device_ports if we have a uuid and ports to save
      if (savedUuid && devicePorts.length > 0) {
        try {
          await apiClient.post(`/device-ports/device/${savedUuid}/sync`, {
            productionId,
            deviceDisplayId: source.id,
            ports: devicePorts,
          });
        } catch (portErr) {
          console.warn('device_ports sync failed (non-fatal):', portErr);
        }
      }
      
      if (shouldCloseModal) {
        setIsModalOpen(false);
        setEditingSource(null);
      }
    } catch (error: any) {
      console.error('Failed to save computer:', error);
      
      // Check for duplicate ID error
      if (error?.response?.data?.code === 'DUPLICATE_ID') {
        alert(
          'Duplicate Source ID\n\n' +
          error.response.data.message + '\n\n' +
          'Please use a unique ID like "SRC 2" or "SRC 3".'
        );
        return; // Don't close modal so user can fix it
      }
      
      // Check for production validation error
      if (error?.response?.data?.code === 'PRODUCTION_NOT_FOUND') {
        alert(
          'Production Not Synced to Database\n\n' +
          error.response.data.error + '\n\n' +
          'Please try:\n' +
          '1. Refresh the page\n' +
          '2. Create a new production\n' +
          '3. Or wait a moment and try again'
        );
      } else {
        alert(`Failed to save computer: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const handleDelete = async (uuid: string) => {
    if (confirm('Are you sure you want to delete this computer?')) {
      try {
        await sourcesAPI.deleteSource(uuid);
        // Don't manually update state - let WebSocket event handle it
      } catch (error) {
        console.error('Failed to delete computer:', error);
        alert('Failed to delete computer');
      }
    }
  };

  const handleDuplicate = (sourceId: string) => {
    console.log('🔄 Duplicating source:', sourceId);
    
    // Find the source to duplicate by its display ID
    const sourceToDuplicate = sources.find(s => s.id === sourceId);
    if (!sourceToDuplicate) {
      console.error('Source not found:', sourceId);
      return;
    }
    
    // Generate a new unique ID for the duplicate
    const newId = SourceService.generateId(sources);
    
    // Create a template object without UUID (so it's treated as new)
    const duplicateTemplate = {
      ...sourceToDuplicate,
      uuid: undefined, // Remove UUID so it's treated as new
      id: newId, // Assign new unique ID
      name: `${sourceToDuplicate.name} (Copy)`,
    } as Source;
    
    // Open modal with the duplicate data pre-populated
    // The existing save handler will create the new record
    setEditingSource(duplicateTemplate);
    setIsModalOpen(true);
  };
  const stats = SourceService.getStatistics(sources);

  return (
    <div className="space-y-6">
      {/* Conflict Alert */}
      {conflictError && (
        <Card className="p-4 border-av-warning bg-av-warning/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-av-warning mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-av-text mb-1">Conflict Detected</h3>
              <p className="text-sm text-av-text-muted mb-3">
                This computer was modified by another user. Your version: {conflictError.clientVersion}, Current version: {conflictError.currentVersion}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setConflictError(null);
                    setEditingSource(null);
                    setIsModalOpen(false);
                  }}
                  className="btn-secondary text-sm"
                >
                  Discard My Changes
                </button>
                <button
                  onClick={() => {
                    setEditingSource({ ...conflictError.serverData, version: conflictError.currentVersion });
                    setConflictError(null);
                    setIsModalOpen(true);
                  }}
                  className="btn-primary text-sm"
                >
                  Review & Retry
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-textPrimary">Computers</h1>
        </div>
        <button onClick={handleAddNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Computer
        </button>
      </div>

      {/* Sources List */}
      {filteredSources.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold text-av-text mb-2">No Sources Found</h3>
          <p className="text-av-text-muted mb-4">
            {sources.length === 0 
              ? 'Add your first source to get started'
              : 'No sources match your search criteria'
            }
          </p>
          {sources.length === 0 && (
            <button onClick={handleAddNew} className="btn-primary whitespace-nowrap">Add Source</button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSources.map((source) => {
            const isDuplicate = hasDuplicateId(source);
            const sourceUuid = source.uuid;
            const isExpanded = sourceUuid ? expandedSources.has(sourceUuid) : false;
            const isLoadingPorts = sourceUuid ? cardPortsLoading.has(sourceUuid) : false;
            const revealPorts = sourceUuid ? (cardPorts[sourceUuid] ?? []) : [];
            return (
              <Card 
                key={source.uuid} 
                className={`p-4 hover:border-av-accent/30 transition-colors cursor-pointer ${
                  isDuplicate ? 'border-red-500 bg-red-900/10' : ''
                }`}
                onDoubleClick={() => handleEdit(source)}
              >
                <div className="grid items-center" style={{ gridTemplateColumns: '10% 20% 30% 15% 15% 10%' }}>
                  {/* ID (10%) */}
                  <div className="pr-2">
                    <span className={`text-sm font-medium ${isDuplicate ? 'text-red-500 font-bold' : 'text-av-text'}`}>
                      {source.id}
                    </span>
                  </div>
                  
                  {/* NAME (20%) */}
                  <div className="pr-2">
                    <h3 className={`text-lg font-semibold ${isDuplicate ? 'text-red-500' : 'text-av-text'}`}>
                      {source.name}
                    </h3>
                  </div>
                  
                  {/* NOTE (30%) */}
                  <div className="pr-2">
                    {source.note ? (
                      <p className="text-sm text-av-text-muted line-clamp-2">
                        {source.note}
                      </p>
                    ) : (
                      <p className="text-xs text-av-text-muted/50 italic">No notes</p>
                    )}
                  </div>
                  
                  {/* TAGS (15%) */}
                  <div className="flex flex-wrap gap-2 pr-2">
                    <Badge>{source.type}</Badge>
                    {source.outputs.map((output, idx) => (
                      <Badge key={output.id}>{output.connector}{source.outputs.length > 1 ? ` ${idx + 1}` : ''}</Badge>
                    ))}
                    {source.secondaryDevice && (
                      <Badge variant="warning">{source.secondaryDevice}</Badge>
                    )}
                  </div>
                  
                  {/* RES + RATE (15%) */}
                  <div className="space-y-1 pr-2">
                    {source.outputs.map((output, idx) => {
                      const rate = output.rate || source.rate;
                      const hasResolution = output.hRes && output.vRes;
                      const hasRate = rate !== null && rate !== undefined;
                      
                      return (
                        <div key={output.id} className="text-sm text-av-text">
                          {hasResolution && hasRate && `${output.hRes}×${output.vRes} @ ${rate} fps`}
                          {hasResolution && !hasRate && `${output.hRes}×${output.vRes}`}
                          {!hasResolution && hasRate && `@ ${rate} fps`}
                          {!hasResolution && !hasRate && <span className="text-av-text-muted/50 italic">No format</span>}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* BUTTONS (10%) */}
                  <div className="flex gap-2 justify-end items-center">
                    {sourceUuid && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleReveal(sourceUuid); }}
                        className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors flex-shrink-0"
                        title={isExpanded ? 'Hide I/O ports' : 'Show I/O ports'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(source.id);
                      }}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-info transition-colors flex-shrink-0"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(source.uuid);
                      }}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors flex-shrink-0"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ── Reveal Panel ───────────────────────────────────────────────── */}
                {isExpanded && (
                  <div className="mt-4 border-t border-av-border pt-4">
                    {isLoadingPorts ? (
                      <p className="text-xs text-av-text-muted italic">Loading ports…</p>
                    ) : revealPorts.length === 0 ? (
                      <p className="text-xs text-av-text-muted italic">
                        No ports configured. Open Edit to assign ports.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-av-text-muted uppercase tracking-wide border-b border-av-border">
                              <th className="text-left pb-1.5 pr-3 font-semibold w-16">Dir</th>
                              <th className="text-left pb-1.5 pr-3 font-semibold">Type</th>
                              <th className="text-left pb-1.5 pr-3 font-semibold">Label</th>
                              <th className="text-left pb-1.5 pr-3 font-semibold">Format</th>
                              <th className="text-left pb-1.5 font-semibold">Route / Note</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-av-border/40">
                            {revealPorts
                              .filter(p => p.direction === 'INPUT')
                              .map((port, i) => (
                                <tr key={`in-${i}`} className="hover:bg-av-surface-hover/40">
                                  <td className="py-1.5 pr-3">
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-warning/15 text-av-warning">IN</span>
                                  </td>
                                  <td className="py-1.5 pr-3 font-mono text-av-text-muted">{port.ioType}</td>
                                  <td className="py-1.5 pr-3 text-av-text">{port.portLabel}</td>
                                  <td className="py-1.5 pr-3 text-av-text-muted">—</td>
                                  <td className="py-1.5 text-av-text-muted">{port.note || '—'}</td>
                                </tr>
                              ))}
                            {revealPorts
                              .filter(p => p.direction === 'OUTPUT')
                              .map((port, i) => {
                                const fmtName = port.formatUuid
                                  ? (formats.find(f => f.uuid === port.formatUuid)?.id ?? port.formatUuid)
                                  : '—';
                                return (
                                  <tr key={`out-${i}`} className="hover:bg-av-surface-hover/40">
                                    <td className="py-1.5 pr-3">
                                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-av-accent/15 text-av-accent">OUT</span>
                                    </td>
                                    <td className="py-1.5 pr-3 font-mono text-av-text-muted">{port.ioType}</td>
                                    <td className="py-1.5 pr-3 text-av-text">{port.portLabel}</td>
                                    <td className="py-1.5 pr-3 text-av-info">{fmtName}</td>
                                    <td className="py-1.5 text-av-text-muted">{port.note || '—'}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Results Count */}
      {filteredSources.length > 0 && (
        <div className="text-center text-sm text-av-text-muted">
          Showing {filteredSources.length} of {sources.length} sources
        </div>
      )}

      {/* Form Modal */}
      <SourceFormModal
        key={editingSource?.uuid || 'new'}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSource(null);
        }}
        onSave={(source, devicePorts) => handleSave(source, devicePorts)}
        onSaveAndDuplicate={async (source, devicePorts) => {
          // Save without closing the modal
          await handleSave(source, devicePorts, false);
          // Generate new ID and set editing source with duplicated data
          const newId = SourceService.generateId([...sources, source]);
          setEditingSource({
            ...source,
            uuid: '', // Clear uuid so it gets a new one from backend
            id: newId,
            name: `${source.name} (Copy)`
          });
          // Modal stays open with duplicated data
        }}
        existingSources={sources}
        editingSource={editingSource}
        typeFieldLabel="Computer Type"
        entityLabel="Computer"
      />
    </div>
  );
};

