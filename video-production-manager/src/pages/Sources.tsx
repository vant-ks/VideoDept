import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Copy, AlertCircle, X } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useSourcesAPI } from '@/hooks/useSourcesAPI';
import { useProductionEvents } from '@/hooks/useProductionEvents';
import { SourceFormModal } from '@/components/SourceFormModal';
import { SourceService } from '@/services';
import type { Source } from '@/types';

export const Sources: React.FC = () => {
  // Use new stores
  const { activeProject } = useProjectStore();
  const projectStore = useProjectStore();
  
  // Fallback to old store for backward compatibility
  const oldStore = useProductionStore();
  
  // API hook for event-enabled operations
  const sourcesAPI = useSourcesAPI();
  
  // Local state
  const [sources, setSources] = useState<Source[]>(activeProject?.sources || oldStore.sources);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [conflictData, setConflictData] = useState<{
    source: Source;
    currentVersion: number;
    clientVersion: number;
  } | null>(null);

  // Get production ID
  const productionId = activeProject?.production?.id || oldStore.production?.id;
  
  // Load sources from API on mount
  useEffect(() => {
    console.log('📡 Sources page mount/update');
    console.log('   productionId:', productionId);
    console.log('   isConnected:', oldStore.isConnected);
    console.log('   Current sources state:', sources.length, 'sources');
    console.log('   activeProject?.sources:', activeProject?.sources?.length || 0);
    
    // If we already have sources from the store, use them
    if (activeProject?.sources && activeProject.sources.length > 0) {
      console.log('   ✅ Using sources from activeProject store:', activeProject.sources.length);
      setSources(activeProject.sources);
      return;
    }
    
    if (productionId && oldStore.isConnected) {
      console.log('   Fetching sources for production:', productionId);
      sourcesAPI.fetchSources(productionId)
        .then(fetchedSources => {
          console.log('   ✅ Fetched sources:', fetchedSources.length, 'sources');
          console.log('   Sources:', fetchedSources.map(s => ({ id: s.id, name: s.name })));
          setSources(fetchedSources);
        })
        .catch(err => {
          console.error('   ❌ Failed to fetch sources:', err);
        });
    } else {
      console.log('   ⚠️ Skipping fetch - productionId or isConnected is missing');
    }
  }, [productionId, oldStore.isConnected, activeProject?.sources]);

  // Real-time event subscriptions
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback((event) => {
      if (event.entityType === 'source') {
        console.log('🔔 Source created by', event.userName, '| Source:', event.entity.id);
        setSources(prev => {
          // Avoid duplicates using uuid (immutable PRIMARY KEY)
          if (prev.some(s => s.uuid === event.entity.uuid)) {
            console.log('⚠️ Duplicate detected - skipping add');
            return prev;
          }
          console.log('✅ Adding source to state via WebSocket');
          return [...prev, event.entity];
        });
      }
    }, []),
    onEntityUpdated: useCallback((event) => {
      if (event.entityType === 'source') {
        console.log('🔔 Source updated by', event.userName);
        setSources(prev => prev.map(s => 
          s.uuid === event.entity.uuid ? event.entity : s
        ));
      }
    }, []),
    onEntityDeleted: useCallback((event) => {
      if (event.entityType === 'source') {
        console.log('🔔 Source deleted by', event.userName);
        setSources(prev => prev.filter(s => s.uuid !== event.entityId));
      }
    }, [])
  });
  
  // Use project store CRUD if activeProject exists, otherwise use old store
  const duplicateSource = activeProject ? projectStore.duplicateSource : oldStore.duplicateSource;

  const sourceTypes = React.useMemo(() => {
    const types = new Set(sources.map(s => s.type));
    return ['all', ...Array.from(types)];
  }, [sources]);

  const filteredSources = React.useMemo(() => {
    console.log('🔍 Filtering sources:');
    console.log('   Total sources:', sources.length);
    console.log('   Search query:', searchQuery);
    console.log('   Selected type:', selectedType);
    
    const searchResults = SourceService.search(sources, searchQuery);
    console.log('   After search:', searchResults.length);
    
    const filtered = searchResults.filter(source => {
      return selectedType === 'all' || source.type === selectedType;
    });
    console.log('   After type filter:', filtered.length);
    console.log('   Filtered sources:', filtered.map(s => ({ id: s.id, type: s.type, name: s.name })));
    
    return filtered;
  }, [sources, searchQuery, selectedType]);

  const handleAddNew = () => {
    console.log('📝 handleAddNew called - opening modal for new source');
    console.log('📝 Current sources state:', sources.map(s => ({ id: s.id, name: s.name })));
    setEditingSource(null);
    setIsModalOpen(true);
  };

  const handleEdit = (source: Source) => {
    setEditingSource(source);
    setIsModalOpen(true);
  };

  const handleSave = async (source: Source) => {
    if (!productionId) {
      alert('No production selected');
      return;
    }

    try {
      if (editingSource) {
        // Update existing source
        const result = await sourcesAPI.updateSource(editingSource.uuid, {
          ...source,
          version: editingSource.version,
        });
        
        // Check for conflict
        if ('error' in result) {
          setConflictData({
            source: editingSource,
            currentVersion: result.currentVersion,
            clientVersion: result.clientVersion,
          });
          return;
        }
        
        // Success - update local state (match by uuid)
        setSources(prev => prev.map(s => s.uuid === result.uuid ? result : s));
      } else {
        // Create new source - explicitly pass fields to prevent string iteration
        console.log('💾 Creating new source with id:', source.id);
        const newSource = await sourcesAPI.createSource({
          id: source.id,
          type: source.type,
          name: source.name,
          hRes: source.hRes,
          vRes: source.vRes,
          rate: source.rate,
          outputs: source.outputs,
          note: source.note,
          productionId,
        });
        console.log('✅ Source created successfully:', { id: newSource.id, name: newSource.name });
        console.log('💡 Optimistically adding to state - WebSocket will deduplicate if needed');
        
        // Optimistic update - add immediately so UI is responsive
        // WebSocket handler will detect duplicate via uuid check and skip if already present
        setSources(prev => [...prev, newSource]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save source:', error);
      alert('Failed to save source. Please try again.');
    }
  };

  const handleSaveAndDuplicate = async (source: Source) => {
    if (!productionId) {
      alert('No production selected');
      return;
    }

    try {
      // First, save the current source
      if (editingSource) {
        // Update existing source
        const result = await sourcesAPI.updateSource(editingSource.uuid, {
          ...source,
          version: editingSource.version,
        });
        
        // Check for conflict
        if ('error' in result) {
          setConflictData({
            source: editingSource,
            currentVersion: result.currentVersion,
            clientVersion: result.clientVersion,
          });
          return;
        }
        
        // Success - update local state
        setSources(prev => prev.map(s => s.uuid === result.uuid ? result : s));
      } else {
        // Create new source
        console.log('💾 Creating new source via Save & Duplicate with id:', source.id);
        const newSource = await sourcesAPI.createSource({
          id: source.id,
          type: source.type,
          name: source.name,
          hRes: source.hRes,
          vRes: source.vRes,
          rate: source.rate,
          outputs: source.outputs,
          note: source.note,
          productionId,
        });
        console.log('✅ Source created successfully:', { id: newSource.id, name: newSource.name });
        
        // Optimistic update
        setSources(prev => [...prev, newSource]);
      }
      
      // Now prepare a duplicate for the next entry
      const newId = SourceService.generateId([...sources, source]); // Include just-saved source
      
      // Create duplicate template without UUID (so it's treated as new)
      const duplicateTemplate = {
        ...source,
        uuid: undefined,
        id: newId,
        name: `${source.name} (Copy)`,
      } as Source;
      
      // Set the duplicate as the editing source, keeping modal open
      setEditingSource(duplicateTemplate);
      // Modal stays open with the duplicate pre-populated
      
    } catch (error) {
      console.error('Failed to save and duplicate source:', error);
      alert('Failed to save source. Please try again.');
    }
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return;

    try {
      await sourcesAPI.deleteSource(uuid);
      setSources(prev => prev.filter(s => s.uuid !== uuid));
    } catch (error) {
      console.error('Failed to delete source:', error);
      alert('Failed to delete source. Please try again.');
    }
  };

  const handleDuplicate = (id: string) => {
    console.log('🔄 Duplicating source:', id);
    
    // Find the source to duplicate by its display ID
    const sourceToDuplicate = sources.find(s => s.id === id);
    if (!sourceToDuplicate) {
      console.error('Source not found:', id);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-text">Sources</h1>
        </div>
        <button onClick={handleAddNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Source
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <p className="text-sm text-av-text-muted mb-1">Total Sources</p>
          <p className="text-3xl font-bold text-av-text">{stats.total}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-av-text-muted mb-1">HD Sources</p>
          <p className="text-3xl font-bold text-av-accent">{stats.hdCount}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-av-text-muted mb-1">4K/UHD Sources</p>
          <p className="text-3xl font-bold text-av-info">{stats.uhd4kCount}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-av-text-muted mb-1">Source Types</p>
          <p className="text-3xl font-bold text-av-text">{Object.keys(stats.byType).length}</p>
        </Card>
      </div>

      {/* Conflict Alert */}
      {conflictData && (
        <Card className="p-4 bg-av-danger/10 border-av-danger">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-av-danger flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-av-text mb-1">Conflict Detected</h3>
              <p className="text-sm text-av-text-muted mb-3">
                This source was modified by another user. Your version is {conflictData.clientVersion}, 
                but the current version is {conflictData.currentVersion}.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    // Reload and discard local changes
                    if (productionId) {
                      const updated = await sourcesAPI.fetchSources(productionId);
                      setSources(updated);
                      setConflictData(null);
                      setIsModalOpen(false);
                    }
                  }}
                  className="btn-secondary text-sm"
                >
                  Discard My Changes
                </button>
                <button
                  onClick={() => {
                    // Force update with current version
                    setEditingSource(prev => prev ? { ...prev, version: conflictData.currentVersion } : null);
                    setConflictData(null);
                  }}
                  className="btn-primary text-sm"
                >
                  Retry with Latest Version
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-av-surface rounded transition-colors text-av-text-muted hover:text-av-text"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {sourceTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-av-accent/20 text-av-accent border border-av-accent/30'
                    : 'bg-av-surface-light text-av-text-muted hover:text-av-text'
                }`}
              >
                {type === 'all' ? 'All Types' : type}
              </button>
            ))}
          </div>
        </div>
      </Card>

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
            // Check if this ID is duplicated
            const isDuplicateId = filteredSources.filter(s => s.id === source.id).length > 1;
            
            return (
            <Card key={source.uuid} className="p-6 hover:border-av-accent/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-av-text">{source.name}</h3>
                    <Badge>{source.type}</Badge>
                    {source.outputs.map((output, idx) => (
                      <Badge key={output.id}>{output.connector}{source.outputs.length > 1 ? ` ${idx + 1}` : ''}</Badge>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-av-text-muted">ID:</span>
                      <span className={isDuplicateId ? 'text-red-500 ml-2' : 'text-av-text ml-2'}>{source.id}</span>
                    </div>
                    {source.hRes && source.vRes && (
                      <div>
                        <span className="text-av-text-muted">Resolution:</span>
                        <span className="text-av-text ml-2">{source.hRes}x{source.vRes}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-av-text-muted">Frame Rate:</span>
                      <span className="text-av-text ml-2">{source.rate}</span>
                    </div>
                    {source.standard && (
                      <div>
                        <span className="text-av-text-muted">Standard:</span>
                        <span className="text-av-text ml-2">{source.standard}</span>
                      </div>
                    )}
                    {source.secondaryDevice && (
                      <div>
                        <span className="text-av-text-muted">Device:</span>
                        <span className="text-av-text ml-2">{source.secondaryDevice}</span>
                      </div>
                    )}
                  </div>
                  
                  {source.note && (
                    <p className="text-sm text-av-text-muted mt-3">
                      <span className="font-medium">Note:</span> {source.note}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(source)}
                    className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-accent transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(source.id)}
                    className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-info transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(source.uuid)}
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

      {/* Results Count */}
      {filteredSources.length > 0 && (
        <div className="text-center text-sm text-av-text-muted">
          Showing {filteredSources.length} of {sources.length} sources
        </div>
      )}

      {/* Form Modal */}
      <SourceFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        onSaveAndDuplicate={handleSaveAndDuplicate}
        existingSources={sources}
        editingSource={editingSource}
      />
    </div>
  );
};
