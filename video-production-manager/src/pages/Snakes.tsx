import { Card, EmptyState } from '@/components/ui';
import { Cable, Plus, Edit2, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useCableSnakeAPI, type CableSnake } from '@/hooks/useCableSnakeAPI';
import { useProductionEvents } from '@/hooks/useProductionEvents';

export default function Snakes() {
  const oldStore = useProductionStore();
  const { activeProject } = useProjectStore();
  const productionId = activeProject?.production?.id || oldStore.production?.id;
  const cableSnakeAPI = useCableSnakeAPI();

  const [snakes, setSnakes] = useState<CableSnake[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | undefined>(undefined);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    if (productionId && oldStore.isConnected) {
      cableSnakeAPI.fetchCableSnakes(productionId)
        .then(setSnakes)
        .catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);

  // Real-time WebSocket updates
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback((event) => {
      if (event.entityType === 'cableSnake') {
        setSnakes(prev => {
          if (prev.some(s => s.uuid === event.entity.uuid)) return prev;
          return [...prev, event.entity];
        });
      }
    }, []),
    onEntityUpdated: useCallback((event) => {
      if (event.entityType === 'cableSnake') {
        setSnakes(prev => prev.map(s => s.uuid === event.entity.uuid ? event.entity : s));
      }
    }, []),
    onEntityDeleted: useCallback((event) => {
      if (event.entityType === 'cableSnake') {
        setSnakes(prev => prev.filter(s => s.uuid !== event.entityId));
      }
    }, [])
  });

  const handleAdd = () => {
    setEditingUuid(null);
    setEditingVersion(undefined);
    setFormData({ name: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (snake: CableSnake) => {
    setEditingUuid(snake.uuid);
    setEditingVersion(snake.version);
    setFormData({ name: snake.name });
    setIsModalOpen(true);
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm('Delete this snake?')) return;
    try {
      await cableSnakeAPI.deleteCableSnake(uuid);
      // WebSocket will update state; optimistically remove as fallback
      setSnakes(prev => prev.filter(s => s.uuid !== uuid));
    } catch (error) {
      console.error('Failed to delete snake:', error);
      alert('Failed to delete snake. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !productionId) return;
    try {
      if (editingUuid) {
        const updated = await cableSnakeAPI.updateCableSnake(editingUuid, {
          productionId,
          name: formData.name,
          version: editingVersion
        });
        if ('error' in updated) {
          alert('Version conflict. Please refresh and try again.');
          return;
        }
        // WebSocket will sync; optimistically update as fallback
        setSnakes(prev => prev.map(s => s.uuid === editingUuid ? updated : s));
      } else {
        const newSnake = await cableSnakeAPI.createCableSnake({
          productionId,
          name: formData.name
        });
        // WebSocket will sync; optimistically add as fallback
        setSnakes(prev => {
          if (prev.some(s => s.uuid === newSnake.uuid)) return prev;
          return [...prev, newSnake];
        });
      }
      setIsModalOpen(false);
      setFormData({ name: '' });
    } catch (error) {
      console.error('Failed to save snake:', error);
      alert('Failed to save snake. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-text">Snakes</h1>
        </div>
        <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Snake
        </button>
      </div>

      {/* Snakes List */}
      {snakes.length === 0 ? (
        <EmptyState
          icon={Cable}
          title="No Snakes Yet"
          description="Add your first snake to start documenting signal routing"
          actionLabel="Add Snake"
          onAction={handleAdd}
        />
      ) : (
        <div className="grid gap-4">
          {snakes.map((snake) => (
            <Card key={snake.uuid} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Cable className="w-6 h-6 text-av-purple" />
                  <div>
                    <h3 className="text-lg font-semibold text-av-text">{snake.name}</h3>
                    <p className="text-sm text-av-text-muted">ID: {snake.id}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(snake)} className="btn-secondary text-sm flex items-center gap-1">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button onClick={() => handleDelete(snake.uuid)} className="btn-ghost text-sm text-av-danger">Delete</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-av-cardBg rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-av-text mb-4">{editingUuid ? 'Edit' : 'Add'} Snake</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-field w-full"
                  placeholder="e.g., ENG Snake"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSubmit} disabled={!formData.name} className="btn-primary">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
