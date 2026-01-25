import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Copy } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { SourceFormModal } from '@/components/SourceFormModal';
import { SourceService } from '@/services';
import type { Source } from '@/types';

export const Sources: React.FC = () => {
  // Use new stores
  const { activeProject } = useProjectStore();
  
  // Fallback to old store for backward compatibility
  const oldStore = useProductionStore();
  
  const sources = activeProject?.sources || oldStore.sources;
  const addSource = oldStore.addSource;
  const updateSource = oldStore.updateSource;
  const deleteSource = oldStore.deleteSource;
  const duplicateSource = oldStore.duplicateSource;
  
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
