import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Copy } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { SourceFormModal } from '@/components/SourceFormModal';
import { SourceService } from '@/services';
import type { Source } from '@/types';

export const Computers: React.FC = () => {
  const { sources, addSource, updateSource, deleteSource, duplicateSource } = useProductionStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

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

  const handleSave = (source: Source) => {
    if (editingSource) {
      updateSource(editingSource.id, source);
    } else {
      addSource(source);
    }
  };

  const handleSaveAndDuplicate = (source: Source) => {
    // Save first
    if (editingSource) {
      updateSource(editingSource.id, source);
    } else {
      addSource(source);
    }
    
    // Then duplicate
    const newId = SourceService.generateId([...sources, source]);
    const duplicated = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
    };
    
    // Set as editing source for next modal open
    setEditingSource(duplicated);
    addSource(duplicated);
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
          <h1 className="text-3xl font-bold text-av-text mb-2">Computers</h1>
          <p className="text-av-text-muted">Manage computer sources and playback devices</p>
        </div>
        <button onClick={handleAddNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Computer
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search computers..."
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
            <button onClick={handleAddNew} className="btn-primary">Add Source</button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSources.map((source) => (
            <Card key={source.id} className="p-6 hover:border-av-accent/30 transition-colors">
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
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        onSaveAndDuplicate={handleSaveAndDuplicate}
        existingSources={sources}
        editingSource={editingSource}
      />
    </div>
  );
};
