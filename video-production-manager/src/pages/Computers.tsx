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
        .then(allSources => setSources(allSources.filter(s => s.type === 'Computer')))
        .catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);

  // Real-time event subscriptions
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback((event) => {
      if (event.entityType === 'source' && event.entity.type === 'Computer') {
        console.log('🔔 Computer created by', event.userName);
        setSources(prev => {
          if (prev.some(s => s.id === event.entity.id)) return prev;
          return [...prev, event.entity];
        });
      }
    }, []),
    onEntityUpdated: useCallback((event) => {
      if (event.entityType === 'source' && event.entity.type === 'Computer') {
        console.log('🔔 Computer updated by', event.userName);
        setSources(prev => prev.map(s => 
          s.id === event.entity.id ? event.entity : s
        ));
      }
    }, []),
    onEntityDeleted: useCallback((event) => {
      if (event.entityType === 'source') {
        console.log('🔔 Computer deleted by', event.userName);
        setSources(prev => prev.filter(s => s.id !== event.entityId));
      }
    }, [])
  });
  
  const duplicateSource = activeProject ? useProjectStore().duplicateSource : oldStore.duplicateSource;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');

  const sourceTypes = React.useMemo(() => {
    const types = new Set(sources.map(s => s.type));
    return ['all', ...Array.from(types)];
  }, [sources]);

  const filteredSources = React.useMemo(() => {
    return sources.filter(source => {
      return selectedType === 'all' || source.type === selectedType;
    });
  }, [sources, selectedType]);

  const handleAddNew = () => {
    setEditingSource(null);
    setIsModalOpen(true);
  };

  const handleEdit = (source: Source) => {
    setEditingSource(source);
    setIsModalOpen(true);
  };

  const handleSave = async (source: Source) => {
    console.log('Saving computer:', source);
    setConflictError(null);
    
    try {
      if (editingSource) {
        const result = await sourcesAPI.updateSource(editingSource.id, source);
        if ('error' in result && result.error === 'Conflict') {
          setConflictError(result);
          return;
        }
        setSources(prev => prev.map(s => s.id === editingSource.id ? source : s));
      } else {
        // Pass single object with all fields including productionId
        const created = await sourcesAPI.createSource({
          ...source,
          productionId: productionId!
        });
        setSources(prev => [...prev, created]);
      }
      setIsModalOpen(false);
      setEditingSource(null);
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

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this computer?')) {
      try {
        await sourcesAPI.deleteSource(id);
        setSources(prev => prev.filter(s => s.id !== id));
      } catch (error) {
        console.error('Failed to delete computer:', error);
        alert('Failed to delete computer');
      }
    }
  };

  const handleDuplicate = (id: string) => {
    duplicateSource(id);
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
          {filteredSources.map((source) => (
            <Card 
              key={source.id} 
              className="p-6 hover:border-av-accent/30 transition-colors cursor-pointer"
              onDoubleClick={() => handleEdit(source)}
            >
              <div className="grid grid-cols-3 gap-6 items-center">
                {/* Left 1/3: ID and Name */}
                <div className="flex items-center gap-12">
                  <span className="text-sm text-av-text">
                    {source.id}
                  </span>
                  <h3 className="text-lg font-semibold text-av-text">{source.name}</h3>
                </div>
                
                {/* Middle 1/3: Badges */}
                <div className="flex items-center gap-2">
                  <Badge>{source.type}</Badge>
                  {source.outputs.map((output, idx) => (
                    <Badge key={output.id}>{output.connector}{source.outputs.length > 1 ? ` ${idx + 1}` : ''}</Badge>
                  ))}
                  {source.secondaryDevice && (
                    <Badge variant="warning">{source.secondaryDevice}</Badge>
                  )}
                </div>
                
                {/* Right 1/3: Resolution and Action Buttons */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-av-text">
                    {SourceService.getFormattedDisplay(source)}
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(source.id);
                      }}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-info transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(source.id);
                      }}
                      className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-danger transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {source.note && (
                <div className="mt-3">
                  <p className="text-sm text-av-text-muted">
                    <span className="font-medium">Note:</span> {source.note}
                  </p>
                </div>
              )}
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
        onClose={() => {
          setIsModalOpen(false);
          setEditingSource(null);
        }}
        onSave={handleSave}
        onSaveAndDuplicate={(source) => {
          handleSave(source);
          // Generate new ID and open modal with duplicated data
          const newId = SourceService.generateId([...sources, source]);
          setEditingSource({
            ...source,
            id: newId,
            name: `${source.name} (Copy)`
          });
          setIsModalOpen(true);
        }}
        existingSources={sources}
        editingSource={editingSource}
      />
    </div>
  );
};
