import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Copy } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { SourceFormModal } from '@/components/SourceFormModal';
import { SourceService } from '@/services';
import type { Source } from '@/types';

export const Computers: React.FC = () => {
  const { activeProject } = useProjectStore();
  const projectStore = useProjectStore();
  const oldStore = useProductionStore();
  
  const sources = Array.isArray(activeProject?.sources) 
    ? activeProject.sources 
    : Array.isArray(oldStore.sources) 
    ? oldStore.sources 
    : [];
  
  // Use project store CRUD if activeProject exists, otherwise use old store
  const addSource = activeProject ? projectStore.addSource : oldStore.addSource;
  const updateSource = activeProject ? projectStore.updateSource : oldStore.updateSource;
  const deleteSource = activeProject ? projectStore.deleteSource : oldStore.deleteSource;
  const duplicateSource = activeProject ? projectStore.duplicateSource : oldStore.duplicateSource;
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

  const handleSave = (source: Source) => {
    console.log('Saving computer:', source);
    if (editingSource) {
      updateSource(editingSource.id, source);
    } else {
      addSource(source);
    }
    setIsModalOpen(false);
    setEditingSource(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this source?')) {
      deleteSource(id);
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
