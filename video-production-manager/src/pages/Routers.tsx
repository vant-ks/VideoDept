import { Card, EmptyState } from '@/components/ui';
import { Share2, Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useProductionStore } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useRouterAPI, type Router } from '@/hooks/useRouterAPI';
import { useProductionEvents } from '@/hooks/useProductionEvents';

export default function Routers() {
  const oldStore = useProductionStore();
  const { activeProject } = useProjectStore();
  const productionId = activeProject?.production?.id || oldStore.production?.id;
  const routersAPI = useRouterAPI();
  
  const [routers, setRouters] = useState<Router[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | undefined>(undefined);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    if (productionId && oldStore.isConnected) {
      routersAPI.fetchRouters(productionId)
        .then(setRouters)
        .catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);

  // Real-time WebSocket updates
  useProductionEvents({
    productionId,
    onEntityCreated: useCallback((event) => {
      if (event.entityType === 'router') {
        setRouters(prev => {
          if (prev.some(r => r.uuid === event.entity.uuid)) return prev;
          return [...prev, event.entity];
        });
      }
    }, []),
    onEntityUpdated: useCallback((event) => {
      if (event.entityType === 'router') {
        setRouters(prev => prev.map(r => r.uuid === event.entity.uuid ? event.entity : r));
      }
    }, []),
    onEntityDeleted: useCallback((event) => {
      if (event.entityType === 'router') {
        setRouters(prev => prev.filter(r => r.uuid !== event.entityId));
      }
    }, [])
  });

  const handleAdd = () => {
    setEditingUuid(null);
    setEditingVersion(undefined);
    setFormData({ name: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (router: Router) => {
    setEditingUuid(router.uuid);
    setEditingVersion(router.version);
    setFormData({ name: router.name });
    setIsModalOpen(true);
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm('Delete this router?')) return;
    
    try {
      await routersAPI.deleteRouter(uuid);
      // WebSocket will update state; optimistically remove as fallback
      setRouters(prev => prev.filter(r => r.uuid !== uuid));
    } catch (error) {
      console.error('Failed to delete router:', error);
      alert('Failed to delete router. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !productionId) return;
    
    try {
      if (editingUuid) {
        const updated = await routersAPI.updateRouter(editingUuid, { 
          productionId,
          name: formData.name,
          version: editingVersion
        });
        if ('error' in updated) {
          alert('Version conflict. Please refresh and try again.');
          return;
        }
        // WebSocket will sync; optimistically update as fallback
        setRouters(prev => prev.map(r => r.uuid === editingUuid ? updated : r));
      } else {
        const newRouter = await routersAPI.createRouter({
          productionId,
          name: formData.name
        });
        // WebSocket will sync; optimistically add as fallback
        setRouters(prev => {
          if (prev.some(r => r.uuid === newRouter.uuid)) return prev;
          return [...prev, newRouter];
        });
      }
      setIsModalOpen(false);
      setFormData({ name: '' });
    } catch (error) {
      console.error('Failed to save router:', error);
      alert('Failed to save router. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-av-text">Routers</h1>
        </div>
        <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Router
        </button>
      </div>

      {/* Router List */}
      {routers.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="No Routers Yet"
          description="Add your first router to start managing signal routing"
          actionLabel="Add Router"
          onAction={handleAdd}
        />
      ) : (
        <div className="grid gap-4">
          {routers.map((router) => {
            const isDuplicateId = routers.filter(r => r.id === router.id && r.uuid !== router.uuid).length > 0;
            return (
            <Card key={router.uuid} className={`p-6 ${isDuplicateId ? 'border-red-500/50 bg-red-900/5' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Share2 className="w-6 h-6 text-av-accent" />
                  <div>
                    <h3 className={`text-lg font-semibold ${isDuplicateId ? 'text-red-500' : 'text-av-text'}`}>{router.name}</h3>
                    <p className={`text-sm ${isDuplicateId ? 'text-red-500 font-bold' : 'text-av-text-muted'}`}>ID: {router.id}</p>
                    {isDuplicateId && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                        <AlertCircle className="w-3 h-3" />
                        <span>Duplicate ID — another router shares this ID.</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(router)} className="btn-secondary text-sm flex items-center gap-1">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button onClick={() => handleDelete(router.uuid)} className="btn-ghost text-sm text-av-danger">Delete</button>
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-av-cardBg rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-av-text mb-4">{editingUuid ? 'Edit' : 'Add'} Router</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-field w-full"
                  placeholder="e.g., Main Router"
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
