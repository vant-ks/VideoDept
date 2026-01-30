import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Copy, AlertCircle } from 'lucide-react';
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
  const productionId = activeProject?.id || oldStore.production?.id;
  
  // Load sources from API on mount
  useEffect(() => {
    if (productionId && oldStore.isConnected) {
      sourcesAPI.fetchSources(productionId).then(setSources).catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);

  // Real-time event subscriptions
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback((event) => {
      if (event.entityType === 'source') {
        console.log('🔔 Source created by', event.userName);
        setSources(prev => {
          // Avoid duplicates
          if (prev.some(s => s.id === event.entity.id)) return prev;
          return [...prev, event.entity];
        });
      }
    }, []),
    onEntityUpdated: useCallback((event) => {
      if (event.entityType === 'source') {
        console.log('🔔 Source updated by', event.userName);
        setSources(prev => prev.map(s => 
          s.id === event.entity.id ? event.entity : s
        ));
      }
    }, []),
    onEntityDeleted: useCallback((event) => {
      if (event.entityType === 'source') {
        console.log('🔔 Source deleted by', event.userName);
        setSources(prev => prev.filter(s => s.id !== event.entityId));
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
    return SourceService.search(sources, searchQuery).filter(source => {
      return selectedType === 'all' || source.type === selectedType;
    });
  }, [sources, searchQuery, selectedType]);

  const handleAddNew = () => {
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
        const result = await sourcesAPI.updateSource(editingSource.id, {
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
        setSources(prev => prev.map(s => s.id === result.id ? result : s));
      } else {
        // Create new source
        const newSource = await sourcesAPI.createSource({
          ...source,
          productionId,
        });
        setSources(prev => [...prev, newSource]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save source:', error);
      alert('Failed to save source. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return;

    try {
      await sourcesAPI.deleteSource(id);
      setSources(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete source:', error);
      alert('Failed to delete source. Please try again.');
    }
  };

  const handleDuplicate = (id: string) => {
    duplicateSource(id);
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
          <input
            type="text"
            placeholder="Search sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field flex-1"
          />
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
          {filteredSources.map((source) => (
            <Card key={source.id} className="p-6 hover:border-av-accent/30 transition-colors">
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
                      <span className="text-av-text ml-2">{source.id}</span>
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
                    onClick={() => handleDelete(source.id)}
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
        existingSources={sources}
        editingSource={editingSource}
      />
    </div>
  );
};
